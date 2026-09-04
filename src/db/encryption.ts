import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';

/**
 * Clave de SQLCipher para `cajita.db`.
 *
 * · Se genera una vez (32 bytes aleatorios) y vive en el llavero seguro del dispositivo
 *   (Keychain en iOS, Keystore/EncryptedSharedPreferences en Android).
 * · `WHEN_UNLOCKED` (no THIS_DEVICE_ONLY): en iOS el item es elegible para iCloud
 *   Keychain, así la clave viaja al celular nuevo junto con el backup cifrado de la BD.
 *   Si el usuario no tiene activado iCloud Keychain, la clave queda solo en el dispositivo
 *   (igual que antes) y la restauración no podrá descifrar el archivo.
 * · `requireAuthentication: false` a propósito: en Android la clave se invalidaría al
 *   cambiar/añadir una huella y perderíamos la BD. El bloqueo biométrico lo hace
 *   `AppLockGate` a nivel de UI, no la clave.
 */
const KEY_ID = 'cajita_sqlcipher_key_v1';
const INIT_FLAG = 'cajita_db_encrypted_v1';

const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

/** Devuelve la clave hex (64 chars). En web devuelve '' (web = solo desarrollo, sin SQLCipher). */
export async function ensureDbKey(): Promise<string> {
  if (Platform.OS === 'web') return '';
  const existing = await SecureStore.getItemAsync(KEY_ID, SECURE_OPTS);
  if (existing && existing.length === 64) {
    // Reescribe para migrar el atributo de accesibilidad a WHEN_UNLOCKED (iCloud Keychain).
    await SecureStore.setItemAsync(KEY_ID, existing, SECURE_OPTS);
    return existing;
  }
  const hex = toHex(Crypto.getRandomBytes(32));
  await SecureStore.setItemAsync(KEY_ID, hex, SECURE_OPTS);
  return hex;
}

/**
 * Primer arranque con cifrado: borra cualquier `cajita.db` en claro que quedara de antes
 * (se decidió empezar de cero, no migrar). Idempotente gracias al flag en el llavero.
 */
export async function ensureFreshEncryptedDb(): Promise<void> {
  if (Platform.OS === 'web') return;
  const done = await SecureStore.getItemAsync(INIT_FLAG, SECURE_OPTS);
  if (done === '1') return;
  for (const name of ['cajita.db', 'cajita.db-wal', 'cajita.db-shm', 'cajita.db-journal']) {
    try {
      const f = new File(Paths.document, `SQLite/${name}`);
      if (f.exists) f.delete();
    } catch {
      /* noop */
    }
  }
  await SecureStore.setItemAsync(INIT_FLAG, '1', SECURE_OPTS);
}
