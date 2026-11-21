# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Base de datos cifrada (SQLCipher)

`cajita.db` está cifrada con SQLCipher (`useSQLCipher` en `app.json`). Implica:

- **No funciona en Expo Go** — hace falta dev build (`npx expo run:android`, dev-client, Codemagic/EAS).
- La clave se carga al arranque en `src/components/DbGate.tsx` → `setDbKey()` (`src/db/database.ts`)
  antes de montar los providers. `getDb()` sigue siendo síncrono.
- Clave y flag de init en `src/db/encryption.ts` (llavero seguro).
  En iOS usa `WHEN_UNLOCKED` (NO `THIS_DEVICE_ONLY`) para que la clave viaje por
  **iCloud Keychain** y el backup cifrado pueda descifrarse en un iPhone nuevo.
- En web no se aplica cifrado (solo pruebas de UI).

# Backup automático en la nube (iCloud en iOS / Google Drive en Android)

Cada escritura a la BD dispara una copia de `cajita.db` (cifrada) a la nube:
- **iOS**: al contenedor de ubiquity `iCloud.com.cajita.app` (módulo nativo `CajitaCloudSync`).
- **Android**: a la carpeta privada `appDataFolder` de **Google Drive** vía `src/services/googleDriveService.ts`.
Al arrancar, si la BD local está vacía o no existe (celular nuevo / reinstalación), se restaura automáticamente desde la nube disponible.

Componentes:

- `modules/cajita-cloud-sync/` — módulo local de Expo (Swift): `upload`/`download`/
  `isCloudAvailable`/`cloudFileExists` con `NSFileCoordinator`. Solo iOS.
- `src/services/googleDriveService.ts` — cliente REST de Google Drive v3 con scope `drive.appdata`
  y tokens seguros en `SecureStore`. Soporte para Android.
- `plugins/withCajitaEntitlements.js` — añade los entitlements iCloud (CloudDocuments)
  y usa `$(TeamIdentifierPrefix)$(CFBundleIdentifier)` para Key-Value Storage.
- `src/services/cloudBackupService.ts` — fachada unificada de backup multiplataforma:
  debounce tras `getDb().runSync()`, snapshot consistente (`wal_checkpoint(TRUNCATE)`),
  protección anti-clobber (no pisa un backup remoto con una BD local vacía),
  restauración automática y manual para iOS (iCloud) y Android (Google Drive).
- `src/db/database.ts` — Proxy sobre `getDb()` que avisa de cada `runSync` (hook
  `onDbWrite`); `closeDbForRestore()` para reemplazar el archivo.
- `src/components/DbGate.tsx` — restaura antes del bootstrap + backup inicial.
- `app/(tabs)/settings.tsx` — UI de backup/restauración para iCloud (iOS) y Google Drive (Android).

## Setup obligatorio (una vez, fuera del código)

1. **Apple Developer (iOS)**: en el App ID `com.cajita.app` activar la capacidad **iCloud**
   y registrar el contenedor **`iCloud.com.cajita.app`**; regenerar el provisioning profile.
2. **Google Cloud Console (Android)**: crear credenciales OAuth 2.0 Web Client ID con el
   redirect URI `https://cajita.app/oauth/google` para conectar Google Drive.
3. **Proyecto iOS**: se genera en macOS (`npx expo prebuild -p ios`) o en CI
   (Codemagic/EAS ya corren `expo prebuild`). **Windows no genera `ios/`**.
4. **iCloud Keychain activado** en el dispositivo del usuario con el mismo Apple ID:
   sin eso, la clave SQLCipher no llega al iPhone nuevo y el backup no se descifra.

## Limitaciones

- En Expo Go el módulo nativo de iCloud no existe → en iOS devuelve null y el backup es no-op.
  En Android Google Drive funciona con la API REST v3.
- `ITSAppUsesNonExemptEncryption: false` declara que el uso de cifrado se acoge a una
  exención para el build iOS. SQLCipher sigue activo; esta bandera no desactiva la BD cifrada.
- El backup remoto es el archivo SQLCipher tal cual: cifrado en reposo, pero requiere
  la clave correcta para abrirlo en otro dispositivo.
