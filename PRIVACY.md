# Política de Privacidad — Cajita / Privacy Policy — Cajita

**Última actualización / Last updated:** 8 de noviembre de 2026  
**Aplicación / Application:** Cajita (`com.cajita.app`)  
**Desarrollador / Developer:** Jesús Daniel Garizao Mejía (`TheOfYisu`)  
**Contacto / Contact:** [jesudgm.11@proton.me](mailto:jesudgm.11@proton.me)  
**Repositorio oficial / Official Repository:** [https://github.com/TheOfYisu/Cajita](https://github.com/TheOfYisu/Cajita)

---

> 🌍 **Idioma / Language:**  
> - [🇪🇸 Versión en Español](#-política-de-privacidad-español)  
> - [🇺🇸 English Version](#-privacy-policy-english)

---

# 🇪🇸 Política de Privacidad (Español)

## 1. Resumen Ejecutivo (Compromiso «Local-First»)

**Cajita** es una aplicación gratuita de finanzas personales diseñada bajo una arquitectura **100 % local (*local-first*)**.

- **No recopilamos datos personales ni financieros:** El desarrollador no posee servidores propios ni bases de datos en la nube donde se envíe tu información.
- **Cero conexión con bancos o correos electrónicos:** Cajita no se conecta a cuentas bancarias, APIs financieras ni buzones de correo electrónico, ni solicita contraseñas o credenciales bancarias. Todos los movimientos, cuentas y saldos son registrados exclusivamente por el usuario de forma manual o a través de sus atajos rápidos.
- **Sin cuentas ni registros obligatorios:** No necesitas crear una cuenta, ni proporcionar tu correo electrónico o número de teléfono para usar la aplicación.
- **Sin rastreadores, analíticas ni publicidad:** Cajita no incluye SDKs de publicidad (no usa `AD_ID` ni `IDFA`), ni herramientas de telemetría, seguimiento o analítica de terceros.
- **Gratuita y transparente:** La aplicación es completamente gratuita y todas sus funciones están desbloqueadas de fábrica. No existen compras integradas, modelos freemium, muros de pago ni cobros ocultos de ningún tipo. Toda la funcionalidad está disponible sin costo para cualquier usuario.

---

## 2. Información que el Usuario Registra (Almacenamiento Local)

Para funcionar como herramienta de registro contable personal, Cajita te permite ingresar manualmente:

- **Datos financieros personales:** Cuentas (bancos, efectivo, ahorros, tarjetas de crédito, CDT, deudas), saldos, presupuestos, gastos fijos, suscripciones, retiros de efectivo y movimientos (ingresos, gastos y transferencias).
- **Datos de terceros registrados por el usuario («Personas»):** Si utilizas el módulo de préstamos o deudas («Debo» / «Presté»), puedes guardar opcionalmente el nombre, teléfono, correo electrónico, documento de identificación y notas de las personas asociadas a dichos préstamos.
- **Preferencias de usuario:** Nombre o alias local, moneda predeterminada, día de corte mensual y tema visual.

### ¿Dónde y cómo se guardan estos datos?
Toda esta información se almacena **exclusivamente dentro de tu propio dispositivo** en una base de datos SQLite local (`cajita.db`) **cifrada en reposo mediante SQLCipher (AES-256-CBC con verificación de integridad HMAC-SHA256)**.

La clave criptográfica de 256 bits se genera de forma aleatoria y segura en tu dispositivo y se resguarda en el almacenamiento seguro por hardware del sistema operativo:
- **En iOS:** Keychain del sistema (`expo-secure-store`).
- **En Android:** Android Keystore (`EncryptedSharedPreferences` vía `expo-secure-store`).

El desarrollador **nunca** tiene acceso a tu base de datos ni a tu clave de cifrado.

---

## 3. Copia de Seguridad en iCloud (Solo iOS)

En dispositivos iOS, si tienes una sesión activa de **iCloud Drive** e **iCloud Keychain**:

1. **Copia de seguridad cifrada:** Cajita realiza copias de seguridad automáticas y manuales del archivo cifrado `cajita.db` directamente en el contenedor privado de iCloud Drive asociado a tu propio Apple ID (`iCloud.com.cajita.app`).
2. **Sincronización de clave:** La clave de cifrado viaja protegida a través de tu **iCloud Keychain** personal para que puedas restaurar tus datos si cambias de iPhone o reinstalas la aplicación.
3. **Privacidad de extremo a usuario:** Esta transferencia ocurre directamente entre tu dispositivo y los servidores de Apple mediante conexiones cifradas (TLS) bajo los términos y la [Política de Privacidad de Apple](https://www.apple.com/legal/privacy/). El desarrollador de Cajita no interviene en esta transmisión ni puede acceder a los archivos alojados en tu cuenta personal de iCloud.

En **Android**, los datos permanecen únicamente en el almacenamiento interno cifrado de la aplicación, pudiendo el usuario exportar copias de seguridad manuales en formato JSON o CSV cuando lo desee.

---

## 4. Permisos del Dispositivo y Uso de APIs del Sistema

Cajita solicita únicamente los permisos estrictamente necesarios para las funciones que tú actives:

| Permiso / API | Propósito en Cajita | ¿Sale del dispositivo? |
| :--- | :--- | :--- |
| **Biometría (`Face ID` / `Touch ID` / Huella)** (`expo-local-authentication`) | Desbloquear la aplicación cuando activas el bloqueo de seguridad en *Ajustes → Seguridad*. La verificación la realiza el sistema operativo; Cajita nunca lee ni almacena datos biométricos. | **No** |
| **Notificaciones locales** (`expo-notifications`) | Programar recordatorios en el propio teléfono antes del vencimiento de tus suscripciones y gastos fijos. No se utilizan servidores de notificaciones *push* externos. | **No** |
| **Archivos y Compartir** (`expo-document-picker`, `expo-file-system`, `expo-sharing`, `expo-clipboard`) | Permitirte importar movimientos desde un archivo CSV elegido por ti, o exportar tus movimientos (CSV) y copias de seguridad (JSON). | **Solo si tú decides compartir el archivo** |
| **APIs del sistema (iOS Privacy Manifest)** | Uso interno de `UserDefaults` (`CA92.1`), marcas de tiempo de archivos (`C617.1`), espacio en disco (`E174.1`) y tiempo de arranque del sistema (`35F9.1`) exclusivamente para el funcionamiento local de la app y su base de datos. | **No** |

> ⚠️ **Nota sobre archivos exportados (CSV / JSON):** Cuando exportas manualmente un archivo CSV o un backup JSON desde *Ajustes → Datos*, dicho archivo se genera **sin cifrar** (texto plano) para que puedas abrirlo en otras herramientas o migrarlo de dispositivo. Eres responsable de guardar esos archivos exportados en un lugar seguro.

---

## 5. Aclaración sobre Servicios Financieros (Aviso Legal)

**Cajita NO es un banco, entidad financiera, billetera digital, pasarela de pagos ni prestamista:**
- La aplicación funciona exclusivamente como una **libreta contable y calculadora personal offline**.
- **No se conecta a cuentas bancarias reales, plataformas de banca en línea ni buzones de correo electrónico**, ni solicita credenciales bancarias, contraseñas, tokens ni permisos de lectura de correos.
- **Registro manual y consciente:** Todos los movimientos, saldos y cuentas son creados e ingresados manualmente por el usuario o mediante atajos rápidos del sistema en su propio dispositivo.
- **No procesa pagos, transferencias de dinero real ni inversiones.**
- El módulo de «Préstamos y Deudas» es únicamente un registro informativo personal para llevar la cuenta de dinero prestado o adeudado; Cajita no otorga, intermedia ni gestiona créditos reales.
- Cajita no ofrece asesoría financiera, legal ni tributaria.

---

## 6. Retención, Control y Eliminación de Datos

Dado que todos los datos residen en tu dispositivo (y opcionalmente en tu iCloud personal en iOS), tienes control total sobre ellos en cualquier momento:

1. **Borrado total desde la aplicación:** Puedes eliminar absolutamente todos los registros locales en cualquier momento desde **Ajustes → Privacidad y datos → Borrar todos los datos locales**.
2. **Desinstalación:** Al desinstalar Cajita de tu dispositivo, el sistema operativo elimina la base de datos local cifrada.
3. **Eliminación de la copia en iCloud (iOS):** Puedes gestionar o eliminar el archivo de respaldo en tu dispositivo iOS entrando a *Ajustes del sistema → [Tu nombre / Apple ID] → iCloud → Gestionar almacenamiento de la cuenta → Cajita → Eliminar datos*.

---

## 7. Privacidad de Menores de Edad

Cajita no recopila información personal de ningún usuario, incluidos menores de 13 años (o la edad mínima equivalente según la jurisdicción aplicable, como COPPA en EE. UU. o RGPD en Europa).

---

## 8. Derechos del Usuario y Marco Legal (RGPD / CCPA / Ley 1581 de 2012)

En cumplimiento del Reglamento General de Protección de Datos (RGPD / GDPR - Unión Europea), la California Consumer Privacy Act (CCPA - EE. UU.) y la Ley Estatutaria 1581 de 2012 de Protección de Datos Personales (Colombia):

- Como usuario eres el único titular y controlador de los datos que introduces en tu dispositivo.
- Puedes ejercer directamente desde la aplicación tus derechos de acceso, rectificación, portabilidad (mediante la exportación a CSV/JSON) y supresión (mediante el botón de borrado total o desinstalación), sin necesidad de intermediación del desarrollador, ya que el desarrollador no posee copia alguna de tu información.

---

## 9. Cambios en esta Política de Privacidad

Cualquier actualización futura de esta Política de Privacidad se publicará en este mismo documento dentro del repositorio oficial y en las actualizaciones de la aplicación. Si en el futuro se añadiera alguna función opcional que requiera conexión con servicios externos, se informará previamente y se solicitará tu consentimiento expreso.

---

## 10. Contacto

Si tienes preguntas o inquietudes sobre esta Política de Privacidad o sobre las prácticas de seguridad de Cajita, puedes comunicarte con el desarrollador:

- **Desarrollador:** Jesús Daniel Garizao Mejía (`TheOfYisu`)
- **Correo electrónico:** [jesudgm.11@proton.me](mailto:jesudgm.11@proton.me)
- **GitHub:** [https://github.com/TheOfYisu/Cajita](https://github.com/TheOfYisu/Cajita)

---
---

# 🇺🇸 Privacy Policy (English)

## 1. Executive Summary ("Local-First" Commitment)

**Cajita** is a free personal finance application built on a **100% local-first architecture**.

- **Zero Data Collection:** The developer does not operate backend servers or cloud databases, and never collects, transmits, sells, or shares your personal or financial information.
- **No Connection to Banks or Email Accounts:** Cajita does not link to bank accounts, financial APIs, or email inboxes, nor does it ask for banking credentials or passwords. All transactions, accounts, and balances are entered manually and consciously by the user through the app or quick system shortcuts.
- **No User Accounts Required:** You do not need to sign up, create an account, or provide an email address or phone number to use the app.
- **No Ads, No Analytics, No Trackers:** Cajita contains zero third-party advertising SDKs (no `AD_ID` or `IDFA`), zero telemetry, and zero tracking scripts.
- **Free & Private:** All features are 100% free and unlocked out of the box. There are no in-app purchases, freemium tiers, paywalls, or hidden charges. The application remains fully functional offline and open for every user without fees.

---

## 2. Information Entered by the User (On-Device Storage)

To function as a personal bookkeeping and budgeting tool, Cajita allows you to manually enter:

- **Personal Financial Records:** Accounts (bank, cash, savings, credit cards, CDs/CDTs, debts), balances, budgets, recurring bills, subscriptions, cash withdrawals, and transactions (income, expenses, and transfers).
- **Third-Party Contact Records ("People"):** If you use the loans/debts tracking feature ("Borrowed" / "Lent"), you may optionally store the name, phone number, email, ID number, and notes of the people associated with those records.
- **App Preferences:** Local display name, default currency, monthly start day, and visual theme.

### Where and how is this data stored?
All data is stored **exclusively on your device** in a local SQLite database (`cajita.db`) **encrypted at rest using SQLCipher (AES-256-CBC with HMAC-SHA256 integrity verification)**.

The 256-bit encryption key is generated using a cryptographically secure random generator on your device and stored in the operating system's hardware-backed secure storage:
- **On iOS:** iOS Keychain (`expo-secure-store`).
- **On Android:** Android Keystore (`EncryptedSharedPreferences` via `expo-secure-store`).

The developer **never** has access to your database or your encryption key.

---

## 3. iCloud Backup (iOS Only)

On iOS devices, if you are signed into **iCloud Drive** and have **iCloud Keychain** enabled:

1. **Encrypted Cloud Backup:** Cajita automatically and manually backs up the encrypted `cajita.db` file directly to the private iCloud Drive ubiquity container tied to your personal Apple ID (`iCloud.com.cajita.app`).
2. **Key Synchronization:** The SQLCipher encryption key is synced via your personal **iCloud Keychain** so you can seamlessly restore your encrypted backup on a new iPhone or after reinstalling the app.
3. **Direct Device-to-Apple Transfer:** This synchronization happens strictly between your device and Apple's iCloud infrastructure over encrypted connections (TLS) governed by [Apple's Privacy Policy](https://www.apple.com/legal/privacy/). The developer of Cajita cannot access, read, or intercept your iCloud files or keys.

On **Android**, all data remains strictly inside the app's encrypted local storage, and users can manually export JSON or CSV backups whenever they choose.

---

## 4. Device Permissions & System APIs

Cajita requests only the permissions strictly necessary for features you explicitly enable:

| Permission / API | Purpose in Cajita | Leaves Device? |
| :--- | :--- | :--- |
| **Biometrics (`Face ID` / `Touch ID` / Fingerprint)** (`expo-local-authentication`) | Unlocks the app when App Lock is enabled in *Settings → Security*. Authentication is handled by the OS; Cajita never accesses or stores raw biometric data. | **No** |
| **Local Notifications** (`expo-notifications`) | Schedules on-device reminders ahead of upcoming subscription and recurring bill due dates. No external push notification servers are used. | **No** |
| **Files & Sharing** (`expo-document-picker`, `expo-file-system`, `expo-sharing`, `expo-clipboard`) | Allows you to import transactions from a CSV file you select, or export your transactions (CSV) and full backups (JSON). | **Only if you explicitly share the file** |
| **System APIs (iOS Privacy Manifest)** | Uses `UserDefaults` (`CA92.1`), file timestamps (`C617.1`), disk space (`E174.1`), and system boot time (`35F9.1`) strictly for local app state and database operations. | **No** |

> ⚠️ **Note on Exported Files (CSV / JSON):** When you manually export a CSV file or a JSON backup from *Settings → Data*, the exported file is **unencrypted** plain text so that you can inspect it or migrate it to another device. Please store exported files in a secure location.

---

## 5. Financial Services Disclaimer

**Cajita is NOT a bank, financial institution, digital wallet, payment processor, or loan provider:**
- The app is strictly a **manual, offline personal expense tracker and budgeting utility**.
- **It does NOT connect to real bank accounts, online banking platforms, or email inboxes**, nor does it request banking credentials, passwords, tokens, or email access permissions.
- **Manual User Entry:** All records, balances, and accounts are created and inputted directly and manually by the user within the app or via quick device shortcuts.
- **It does NOT process payments, money transfers, or investments.**
- The "Loans & Debts" feature is solely a personal record-keeping log to track money you owe or money owed to you; Cajita does not issue, broker, or facilitate real loans or credit.
- Cajita does not provide financial, legal, or tax advice.

---

## 6. Data Retention, Control, and Deletion

Because all data resides on your device (and optionally in your personal iCloud container on iOS), you have full control over it at all times:

1. **In-App Full Data Wipe:** You can permanently delete all local records at any time from **Settings → Privacy & Data → Delete All Local Data** (*Ajustes → Privacidad y datos → Borrar todos los datos locales*).
2. **Uninstalling the App:** Uninstalling Cajita removes the local encrypted database from your device.
3. **Deleting iCloud Backups (iOS):** You can delete the backup stored in your personal iCloud account by going to *iOS Settings → [Your Name / Apple ID] → iCloud → Manage Account Storage → Cajita → Delete Data*.

---

## 7. Children's Privacy

Cajita does not collect personal information from anyone, including children under the age of 13 (or the applicable age of consent under COPPA, GDPR, or local laws).

---

## 8. Contact Information

If you have any questions about this Privacy Policy or Cajita's security practices, please contact the developer:

- **Developer:** Jesús Daniel Garizao Mejía (`TheOfYisu`)
- **Email:** [jesudgm.11@proton.me](mailto:jesudgm.11@proton.me)
- **GitHub:** [https://github.com/TheOfYisu/Cajita](https://github.com/TheOfYisu/Cajita)
