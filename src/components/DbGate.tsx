import React from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { getDb, setDbKey } from '../db/database';
import { ensureDbKey, ensureFreshEncryptedDb } from '../db/encryption';
import { bootstrap } from '../store/appStore';
import { initCloudBackup, restoreCloudBackupIfNeeded, backupNow } from '../services/cloudBackupService';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Carga la clave de SQLCipher en memoria ANTES de montar los providers (que tocan la BD
 * de forma síncrona en su primer render). Mientras tanto se mantiene el splash nativo.
 *
 * En iOS intenta además restaurar el backup de iCloud si la BD local está vacía
 * (celular nuevo / reinstalación) y conecta el backup automático tras cada escritura.
 */
export function DbGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        await ensureFreshEncryptedDb();
        setDbKey(await ensureDbKey());
        try {
          await restoreCloudBackupIfNeeded();
        } catch {
          /* restaurar no debe bloquear el arranque */
        }
        initCloudBackup();
        try {
          bootstrap();
        } catch {
          /* bootstrap no debe bloquear el arranque */
        }
        // Backup inicial: sube el estado actual la primera vez que se abre la app.
        try {
          void backupNow(getDb());
        } catch {
          /* noop */
        }
        setReady(true);
      } catch (e) {
        setError(String(e));
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, []);

  if (error) {
    // Pantalla mínima sin theme (aún no montado). Color del splash de app.json.
    return <View style={{ flex: 1, backgroundColor: '#2E9E6B' }} />;
  }
  if (!ready) return null; // splash nativo visible

  return <>{children}</>;
}
