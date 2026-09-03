import { getDb } from '../db/database';

/**
 * Servicio de sincronización local-first.
 *
 * Arquitectura:
 *  - La base de datos SQLite local es la fuente de verdad (funciona 100% offline).
 *  - Cada registro tiene syncState: 'pending' | 'synced' | 'deleted'.
 *  - Un adaptador nativo (CloudKit en iOS / iCloud Drive) se encarga de subir/bajar
 *    los cambios pendientes.
 *
 * En una build nativa (expo prebuild) se conecta el módulo de CloudKit de iOS.
 * En Expo Go, la sincronización queda en cola (pending) y se sincroniza cuando
 * se corre con la build nativa.
 */

export interface SyncStatus {
  pendingUploads: number;
  lastSyncAt: number | null;
  isSyncing: boolean;
  cloudAvailable: boolean;
}

export function getPendingCounts(): { accounts: number; categories: number; transactions: number; loans: number } {
  const database = getDb();
  const count = (table: string, states: string[]): number => {
    const placeholders = states.map(() => '?').join(', ');
    const row = database.getFirstSync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${table} WHERE syncState IN (${placeholders})`,
      states,
    );
    return row?.n ?? 0;
  };
  return {
    accounts: count('accounts', ['pending', 'deleted']),
    categories: count('categories', ['pending', 'deleted']),
    transactions: count('transactions', ['pending', 'deleted']),
    loans: count('loans', ['pending', 'deleted']),
  };
}

export function getLastSyncAt(): number | null {
  const database = getDb();
  const row = database.getFirstSync<{ value: string }>(
    `SELECT value FROM sync_metadata WHERE key = 'last_sync_at'`,
  );
  return row ? parseInt(row.value, 10) : null;
}

export function markSynced(tables: string[] = ['accounts', 'categories', 'transactions', 'loans']): void {
  const database = getDb();
  const t = Date.now();
  for (const table of tables) {
    database.runSync(`UPDATE ${table} SET syncState = 'synced' WHERE syncState = 'pending'`);
    database.runSync(`DELETE FROM ${table} WHERE syncState = 'deleted'`);
  }
  database.runSync(
    `INSERT INTO sync_metadata (key, value) VALUES ('last_sync_at', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(t)],
  );
}

/**
 * Encuentra el proveedor de CloudKit disponible. En builds nativas de iOS se
 * instala el módulo nativo; aquí se abstrae para que la UI no dependa de él.
 */
export async function syncWithCloud(): Promise<SyncStatus> {
  const pending = getPendingCounts();
  // En Expo Go / sin módulo nativo, la sincronización queda pendiente.
  // En una build nativa, `cloudAvailable` sería true y se llamaría al módulo nativo.
  const nativeSync = (globalThis as Record<string, unknown>).__CajitaCloudSync as
    | { sync: () => Promise<void>; available: boolean }
    | undefined;

  if (nativeSync?.available) {
    try {
      await nativeSync.sync();
      markSynced();
    } catch {
      // dejar pendiente
    }
  }

  return {
    pendingUploads: pending.accounts + pending.categories + pending.transactions + pending.loans,
    lastSyncAt: getLastSyncAt(),
    isSyncing: false,
    cloudAvailable: Boolean(nativeSync?.available),
  };
}

export function exportBackup(): string {
  const database = getDb();
  const accounts = database.getAllSync('SELECT * FROM accounts WHERE deletedAt IS NULL');
  const categories = database.getAllSync('SELECT * FROM categories WHERE deletedAt IS NULL');
  const transactions = database.getAllSync('SELECT * FROM transactions WHERE deletedAt IS NULL');
  const loans = database.getAllSync('SELECT * FROM loans WHERE deletedAt IS NULL');
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), accounts, categories, transactions, loans });
}