import { Platform, AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import { requireNativeModule } from 'expo-modules-core';
import { getDb, setOnDbWrite, closeDbForRestore } from '../db/database';
import type { SQLiteDatabase } from 'expo-sqlite';
import { isPremium } from './premiumService';

/**
 * Copia de seguridad automática en iCloud.
 *
 * Estrategia:
 *  - La fuente de verdad es `cajita.db`, cifrada con SQLCipher en el dispositivo.
 *  - Cada escritura a la BD (vía `getDb().runSync`) dispara un backup con debounce.
 *  - El backup hace un `wal_checkpoint(TRUNCATE)` y copia el archivo cifrado tal cual
 *    al contenedor de ubiquity de iCloud (módulo nativo `CajitaCloudSync`).
 *  - Al arrancar, si la BD local está vacía o no existe y hay un backup en iCloud,
 *    se restaura automáticamente (caso: celular nuevo / reinstalación).
 *
 * Solo funciona en iOS con build nativa (expo prebuild / EAS). En Android y web no-op.
 */

const REMOTE_NAME = 'cajita.db';
const CACHE_NAME = 'cajita-backup.db';
const LAST_BACKUP_KEY = 'cajita_last_backup_v1';
const DEBOUNCE_MS = 1500;

interface CajitaCloudSyncNative {
  isCloudAvailable(): Promise<boolean>;
  cloudFileExists(remoteName: string): Promise<boolean>;
  upload(localPath: string, remoteName: string): Promise<void>;
  download(remoteName: string, localPath: string): Promise<void>;
}

let native: CajitaCloudSyncNative | null | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let initialized = false;

function getNative(): CajitaCloudSyncNative | null {
  if (native !== undefined) return native;
  native = null;
  if (Platform.OS === 'ios') {
    try {
      native = requireNativeModule('CajitaCloudSync') as CajitaCloudSyncNative;
    } catch {
      native = null;
    }
  }
  return native;
}

function dbFile(): File {
  return new File(Paths.document, 'SQLite/cajita.db');
}

/**
 * Conecta el hook de escrituras de la BD con el backup y flushea al pasar la app
 * a segundo plano. Llamar una vez al arranque, tras `setDbKey`.
 *
 * El backup AUTOMÁTICO es una función Premium: solo se conecta si el usuario es
 * Premium. La subida manual (botón en Ajustes → Copia de seguridad) queda gratis.
 */
export function initCloudBackup(): void {
  if (initialized) return;
  initialized = true;
  if (!isPremium()) return;
  setOnDbWrite(() => scheduleCloudBackup(getDb()));
  AppState.addEventListener('change', (state) => {
    if (state !== 'active' && debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
      void backupNow(getDb());
    }
  });
}

/** Agenda un backup tras cada escritura; coalesce ráfagas de cambios. */
export function scheduleCloudBackup(db: SQLiteDatabase): void {
  if (Platform.OS !== 'ios') return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void backupNow(db);
  }, DEBOUNCE_MS);
}

/** True si la BD local no tiene datos de usuario (cuentas/movimientos/préstamos). */
async function isLocalDbEmpty(): Promise<boolean> {
  try {
    const database = getDb();
    const row = database.getFirstSync<{ n: number }>(
      `SELECT
         (SELECT COUNT(*) FROM accounts) +
         (SELECT COUNT(*) FROM transactions) +
         (SELECT COUNT(*) FROM loans) AS n`,
    );
    return (row?.n ?? 0) === 0;
  } catch {
    return true;
  }
}

export interface BackupResult {
  ok: boolean;
  reason: string;
}

/**
 * Sube el snapshot cifrado de la BD al contenedor iCloud.
 * Protección: nunca pisa un backup remoto existente con una BD local vacía
 * (p. ej. una reinstalación sin restaurar todavía).
 */
export async function backupNow(db: SQLiteDatabase): Promise<BackupResult> {
  if (Platform.OS !== 'ios') return { ok: false, reason: 'not-ios' };
  if (running) return { ok: true, reason: 'in-progress' };
  const mod = getNative();
  if (!mod) return { ok: false, reason: 'no-native' };
  running = true;
  try {
    if (!(await mod.isCloudAvailable())) return { ok: false, reason: 'icloud-unavailable' };
    if ((await isLocalDbEmpty()) && (await mod.cloudFileExists(REMOTE_NAME))) {
      return { ok: false, reason: 'empty-local-with-backup' };
    }
    try {
      db.execSync('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch {
      /* ignora */
    }
    const src = dbFile();
    if (!src.exists) return { ok: false, reason: 'no-db' };
    const dst = new File(Paths.cache, CACHE_NAME);
    try {
      if (dst.exists) dst.delete();
    } catch {
      /* ignora */
    }
    src.copy(dst);
    await mod.upload(dst.uri, REMOTE_NAME);
    await SecureStore.setItemAsync(LAST_BACKUP_KEY, String(Date.now()));
    return { ok: true, reason: 'ok' };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  } finally {
    running = false;
  }
}

export async function getLastBackupAt(): Promise<number | null> {
  if (Platform.OS === 'web') return null;
  try {
    const v = await SecureStore.getItemAsync(LAST_BACKUP_KEY);
    return v ? parseInt(v, 10) : null;
  } catch {
    return null;
  }
}

export async function isCloudBackupAvailable(): Promise<boolean> {
  const mod = getNative();
  if (!mod) return false;
  try {
    return (await mod.isCloudAvailable()) && (await mod.cloudFileExists(REMOTE_NAME));
  } catch {
    return false;
  }
}

/**
 * Restauración automática al arranque. Solo actúa cuando la BD local está vacía o
 * no existe (celular nuevo / reinstalación) y existe un backup en iCloud.
 */
export async function restoreCloudBackupIfNeeded(): Promise<{ restored: boolean; reason: string }> {
  if (Platform.OS !== 'ios') return { restored: false, reason: 'not-ios' };
  const mod = getNative();
  if (!mod) return { restored: false, reason: 'no-native' };
  try {
    if (!(await mod.isCloudAvailable())) return { restored: false, reason: 'icloud-unavailable' };
    if (!(await mod.cloudFileExists(REMOTE_NAME))) return { restored: false, reason: 'no-cloud-backup' };
    const local = dbFile();
    if (local.exists && !(await isLocalDbEmpty())) return { restored: false, reason: 'local-has-data' };
    closeDbForRestore();
    await mod.download(REMOTE_NAME, dbFile().uri);
    return { restored: true, reason: 'ok' };
  } catch (e) {
    return { restored: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Restauración manual desde Ajustes. Reemplaza la BD local por la de iCloud
 * (cierra la conexión primero). El llamador debe refrescar la app tras esto.
 */
export async function restoreCloudBackupNow(): Promise<{ restored: boolean; reason: string }> {
  if (Platform.OS !== 'ios') return { restored: false, reason: 'not-ios' };
  const mod = getNative();
  if (!mod) return { restored: false, reason: 'no-native' };
  try {
    if (!(await mod.isCloudAvailable())) return { restored: false, reason: 'icloud-unavailable' };
    if (!(await mod.cloudFileExists(REMOTE_NAME))) return { restored: false, reason: 'no-cloud-backup' };
    closeDbForRestore();
    await mod.download(REMOTE_NAME, dbFile().uri);
    return { restored: true, reason: 'ok' };
  } catch (e) {
    return { restored: false, reason: e instanceof Error ? e.message : String(e) };
  }
}