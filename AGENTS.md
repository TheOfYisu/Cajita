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

# Backup automático en iCloud (iOS)

Cada escritura a la BD dispara una copia de `cajita.db` (cifrada) al contenedor de
ubiquity `iCloud.com.cajita.app`. Al arrancar, si la BD local está vacía o no existe
(celular nuevo / reinstalación), se restaura desde iCloud.

Componentes:
- `modules/cajita-cloud-sync/` — módulo local de Expo (Swift): `upload`/`download`/
  `isCloudAvailable`/`cloudFileExists` con `NSFileCoordinator`. Solo iOS.
- `plugins/withCajitaEntitlements.js` — añade los entitlements iCloud (CloudDocuments).
- `src/services/cloudBackupService.ts` — debounce tras `getDb().runSync()`, snapshot
  consistente (`wal_checkpoint(TRUNCATE)`), protección anti-clobber (no pisa un backup
  remoto con una BD local vacía), restauración automática y manual.
- `src/db/database.ts` — Proxy sobre `getDb()` que avisa de cada `runSync` (hook
  `onDbWrite`); `closeDbForRestore()` para reemplazar el archivo.
- `src/components/DbGate.tsx` — restaura antes del bootstrap + backup inicial.
- `app/(tabs)/settings.tsx` — UI de backup/restauración.

## Setup obligatorio (una vez, fuera del código)

1. **Apple Developer**: en el App ID `com.cajita.app` activar la capacidad **iCloud**
   y registrar el contenedor **`iCloud.com.cajita.app`**; regenerar el provisioning profile.
2. **Proyecto iOS**: se genera en macOS (`npx expo prebuild -p ios`) o en CI
   (Codemagic/EAS ya corren `expo prebuild`). **Windows no genera `ios/`**.
3. **iCloud Keychain activado** en el dispositivo del usuario con el mismo Apple ID:
   sin eso, la clave SQLCipher no llega al iPhone nuevo y el backup no se descifra.

## Limitaciones

- **Solo iOS**. Android no tiene iCloud: allí no hay backup automático (queda el JSON manual).
- En Expo Go el módulo no existe → `getNative()` devuelve null y el backup es no-op.
- `ITSAppUsesNonExemptEncryption: true` (SQLCipher = encriptación estándar no exenta).
  Documentación de export compliance en `docs/export-compliance-encryption.md`; al subir
  build responder el cuestionario de App Store Connect (mercado masivo, AES-256) y, si
  Apple lo pide, adjuntar el documento o tramitar un ERN (BIS).
- El backup remoto es el archivo SQLCipher tal cual: cifrado en reposo, pero requiere
  la clave correcta (iCloud Keychain) para abrirlo en otro dispositivo.
