# 🚀 Guía de Despliegue y Revisión en Tiendas (App Store & Google Play)

**App:** Cajita (`com.cajita.app`)  
**Modelo:** Gratuita (Free) · 100 % Local-First · Sin anuncios ni compras integradas  
**Política de Privacidad en el repo:** [`/PRIVACY.md`](../PRIVACY.md) y [`/docs/privacy-policy.html`](./privacy-policy.html)

Esta guía resume todo lo necesario para publicar **Cajita** en **Apple App Store Connect** y **Google Play Console**, incluyendo las soluciones a los rechazos más frecuentes reportados por desarrolladores en foros (`r/expo`, `r/iOSProgramming`, `r/androiddev` y Apple/Google Developer Forums) para aplicaciones de finanzas personales *local-first*.

---

## 🔗 1. URL Pública de la Política de Privacidad

Tanto Apple como Google exigen una URL pública (HTTPS) que no requiera iniciar sesión. Tienes dos opciones listas en el repositorio:

1. **Opción recomendada (GitHub Pages — HTML limpio):**
   - En tu repositorio de GitHub (`TheOfYisu/Cajita`), ve a **Settings → Pages**.
   - En **Build and deployment**, selecciona Branch: `main` y carpeta: `/docs`.
   - Tu URL pública será:
     ```
     https://theofyisu.github.io/Cajita/privacy-policy.html
     ```
2. **Opción directa (Archivo Markdown en GitHub):**
   - Si el repositorio es público, puedes usar directamente:
     ```
     https://github.com/TheOfYisu/Cajita/blob/main/PRIVACY.md
     ```

Además, la aplicación ya incluye la pantalla nativa **Ajustes → Privacidad y datos** (`app/settings/privacy.tsx`) que muestra la política dentro de la app incluso sin conexión a internet y permite **borrar todos los datos locales** con un toque.

---

## 🍎 2. Apple App Store Connect (iOS)

### 2.1 Cuestionario de «Privacidad de la App» (App Privacy / Nutrition Labels)
- En **App Store Connect → Confianza y seguridad → Privacidad de la app**:
  - **URL de la política de privacidad:** pega la URL pública anterior.
  - **¿Recopilas datos de esta app? (`Do you or your third-party partners collect data from this app?`):**
    - Selecciona **«No, no recopilamos datos de esta app» (`No, we do not collect data from this app`)**.
  - **¿Por qué «No» aunque use SQLCipher e iCloud?**
    - Según la documentación oficial de Apple (*App Privacy Details*), los datos que permanecen en el dispositivo o que se sincronizan exclusivamente con el contenedor privado de iCloud / iCloud Keychain de la propia cuenta de Apple del usuario **no se consideran recopilación de datos** siempre que el desarrollador no tenga acceso a ellos.

### 2.2 Privacy Manifest (`PrivacyInfo.xcprivacy` — Prevención del error `ITMS-91053`)
En los foros de Expo y Apple Developer, el rechazo automático más común al subir a TestFlight/App Store es el correo **`ITMS-91053: Missing API declaration`** porque librerías nativas (`expo-file-system`, `expo-sqlite`, React Native) invocan APIs de sistema catalogadas como *Required Reason APIs*.

`app.json` y `ios/Cajita/PrivacyInfo.xcprivacy` ya están configurados con las 4 declaraciones exactas que exige Apple:
- `NSPrivacyAccessedAPICategoryUserDefaults` → **`CA92.1`** (preferencias internas de la app).
- `NSPrivacyAccessedAPICategoryFileTimestamp` → **`C617.1`** (marcas de tiempo de archivos dentro del contenedor de la app).
- `NSPrivacyAccessedAPICategoryDiskSpace` → **`E174.1`** (comprobación de espacio de almacenamiento para escribir archivos/backups de forma segura).
- `NSPrivacyAccessedAPICategorySystemBootTime` → **`35F9.1`** (medición de intervalos de tiempo internos del sistema).
- `NSPrivacyTracking`: `false`, `NSPrivacyCollectedDataTypes`: `[]`.

### 2.3 Cumplimiento de Exportación y Cifrado (Export Compliance)
- `app.json` incluye `"ITSAppUsesNonExemptEncryption": false` porque SQLCipher (AES-256) e iCloud usan criptografía estándar para proteger datos locales/personales y califican bajo la exención de software de mercado masivo.
- Si App Store Connect solicita documentación de respaldo sobre encriptación en la pestaña del build, adjunta el archivo [`docs/export-compliance-encryption.md`](./export-compliance-encryption.md).

### 2.4 Notas para el Revisor de Apple (App Review Information)
En la sección **Información para la revisión de la app** en App Store Connect:
- **Inicio de sesión obligatorio (`Sign-in required`):** **Desmarcado (No)**.
- **Notas (`Notes`):** Copia y pega este texto para evitar malentendidos con el revisor:
  > *Cajita is a 100% free, offline, local-first personal finance and bookkeeping utility. It does NOT require user registration or sign-in, does NOT connect to real bank accounts, and does NOT process real-money transactions or loans. All data is stored locally on the device (encrypted with SQLCipher) and optionally backed up to the user's private iCloud Drive container (`iCloud.com.cajita.app`). Users can view the Privacy Policy and wipe all local data at any time inside the app via Settings (Ajustes) → Privacidad y datos.*

---

## 🤖 3. Google Play Console (Android)

### 3.1 ⚠️ TRAMPA #1 EN FOROS: Declaración de Funciones Financieras (`Financial Features Declaration`)
En `r/androiddev` y los foros de Google Play, el bloqueo más frecuente para apps de gastos personales ocurre al llenar **Contenido de la aplicación → Funciones financieras**:

- Google pregunta qué funciones financieras ofrece tu app (banca móvil, billetera digital, préstamos personales, criptomonedas, etc.).
- **QUÉ MARCAR:** Desplázate hasta el final de la lista y selecciona **«Mi aplicación no ofrece ninguna función financiera» (`My app doesn't provide any financial features`)**.
- **POR QUÉ:** En la política de Google Play, «funciones financieras» se refiere a servicios financieros **regulados** que mueven dinero real, se conectan a bancos o conceden préstamos reales. Aunque Cajita tenga una sección llamada «Préstamos» o «Cuentas», es únicamente una **libreta de registro manual offline**. Si marcas por error «Préstamos personales» o «Banca», el bot de Google Play bloqueará tu app exigiéndote licencias bancarias estatales y certificados de entidad crediticia.
- **Consejo para la descripción de la tienda (Store Listing):** Incluye explícitamente en la descripción de Google Play:
  > *«Nota: Cajita es una herramienta de registro contable y presupuesto personal 100 % local y offline. No se conecta con bancos, no procesa pagos ni transferencias de dinero real, ni otorga préstamos o créditos financieros.»*

### 3.2 Formulario de Seguridad de los Datos (`Data Safety`)
En **Contenido de la aplicación → Seguridad de los datos**:
1. **¿Tu app recopila o comparte alguno de los tipos de datos de usuario requeridos?** → **No**.
   *(Según las guías de Google Play, los datos que solo se guardan localmente en el dispositivo del usuario y nunca se envían a un servidor no se consideran «recopilados»).*
2. **¿Tu app usa cifrado?** → Aunque respondas «No» en recopilación, el cuestionario se simplifica automáticamente y mostrará en la tienda la insignia **«No se recopilan datos» (`No data collected`)** y **«No se comparten datos con terceros»**.

### 3.3 Permiso de ID de Publicidad (`Advertising ID` / `AD_ID`)
- En **Contenido de la aplicación → ID de publicidad**:
  - **¿Tu app usa un ID de publicidad?** → **No**.
- Para evitar que alguna dependencia transitiva inyecte el permiso en el manifiesto de Android y provoque un error al subir el `.aab`, `app.json` ya bloquea explícitamente el permiso mediante:
  ```json
  "blockedPermissions": [
    "com.google.android.gms.permission.AD_ID"
  ]
  ```

### 3.4 Categoría, Precio y Audiencia Objetivo
- **Categoría:** Finanzas (`Finance`) o Productividad (`Productivity`).
- **Precio:** Gratuita (`Free`) — **Sin anuncios (`No ads`)** y **Sin compras dentro de la app (`No in-app purchases`)**.
- **Audiencia objetivo (`Target Audience`):** Selecciona **18 años o más** (o 16+).
  - *Consejo de foros:* Nunca marques edades menores de 13 años salvo que sea una app infantil; marcar menores de 13 activa la política de Familias de Google Play, que exige revisiones adicionales muy estrictas sin necesidad para una app de finanzas.

### 3.5 Requisito de 12 Testers durante 14 Días (Cuentas Personales de Google Play)
Si tu cuenta de desarrollador de Google Play es **personal** (creada después de noviembre de 2023), Google exige una prueba cerrada con **al menos 12 testers suscritos durante 14 días continuos** antes de habilitar el botón de **Solicitar acceso a Producción**:
- **Consejos clave de los foros para que aprueben a la primera:**
  1. Reúne entre 15 y 20 testers reales (por si alguno desinstala la app antes de los 14 días).
  2. Pídeles que abran la app al menos 3 o 4 veces durante esas dos semanas y creen cuentas/movimientos de prueba.
  3. Sube al menos **1 actualización de versión** (p. ej. `1.0.9`) a la pista de prueba cerrada durante los 14 días para demostrar a Google que iteraste sobre el feedback de los testers.
  4. Al responder el cuestionario final de acceso a producción, menciona cómo probaste el cifrado local SQLCipher, la importación/exportación CSV y el bloqueo biométrico.

### 3.6 Firma de Release para Android (`.aab`) en Codemagic
Para que Google Play acepte el archivo `.aab` generado por `codemagic.yaml`:
1. Genera un keystore de subida (si aún no lo tienes):
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore cajita-upload.keystore -alias cajita-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Sube `cajita-upload.keystore` en **Codemagic → Teams / Application settings → Code signing identities → Android keystores** con el nombre de referencia `keystore_reference`.
3. En `codemagic.yaml`, dentro de `android-release` → `environment`, añade `android_signing: [keystore_reference]` para que Gradle firme automáticamente el `.aab` de producción.

---

## ☕ 4. Enlace de Apoyo en Ko-fi (`https://ko-fi.com/theofyisus`) y Reglas de las Tiendas

La app incluye en **Ajustes → Acerca de** la fila **«Invítame un café (Ko-fi)»** configurada siguiendo las mejores prácticas de los foros de desarrolladores:

1. **Por qué dice «Invítame un café / Apoyo voluntario» y NO «Donación» dentro de la app:**
   - Tanto **Google Play** como **Apple App Store** (Guideline 3.2.1(vi)) reservan la palabra *«Donación» / «Donate»* dentro de la interfaz de las apps exclusivamente para organizaciones benéficas sin ánimo de lucro registradas (501(c)(3) o equivalentes).
   - En cambio, usar **«Invítame un café (Ko-fi)»** con el subtítulo *«Apoyo voluntario, la app es 100 % gratis»* se acoge a la excepción de **propinas voluntarias al creador (*Peer-to-Peer creator tip*)** de Google Play, ya que el 100 % va al autor y **no desbloquea contenido ni funciones digitales**.
2. **Por qué se abre con `Linking.openURL` (navegador externo) y no dentro de un WebView interno:**
   - Abrir `https://ko-fi.com/theofyisus` en el navegador externo del sistema (Safari / Chrome) evita que los analizadores automáticos de las tiendas lo confundan con una pasarela de pago integrada dentro del binario.
3. **Nota importante para Apple App Store (Guideline 3.1.1):**
   - Algunos revisores de iOS son estrictos con enlaces a Ko-fi o Buy Me a Coffee dentro de la app (Guideline 3.1.1). Si en algún envío de iOS el revisor de Apple te pide ocultar el enlace de Ko-fi en iOS, basta con envolver ese ítem en `app/(tabs)/settings.tsx` con `...(Platform.OS !== "ios" ? [ ... ] : [])`, manteniéndolo activo en Android y en GitHub (`.github/FUNDING.yml` y `README.md`).
