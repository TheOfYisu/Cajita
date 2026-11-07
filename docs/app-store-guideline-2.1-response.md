# 🍎 Respuesta Oficial para Apple App Review — Guideline 2.1 (Information Needed)

Apple envía este cuestionario de 6 puntos (`Guideline 2.1 - Information Needed - New App Submission`) de forma estándar cuando una cuenta de desarrollador es nueva (primeras entregas). **No significa que haya un fallo técnico en la app**, sino que el equipo de revisión solicita verificar que la app es legítima, funciona en un dispositivo físico y no es una app bancaria regulada encubierta.

---

## 📹 Paso 1: Qué debe mostrar el video de pantalla (Screen Recording) que debes grabar en tu iPhone

Apple exige que grabes la pantalla **desde un iPhone físico** (usando el botón de *Grabación de pantalla* del Centro de Control de iOS):

1. **Empieza en la pantalla de inicio de iOS (Home Screen)** donde se vea el ícono de **Cajita**.
2. **Toca el ícono de Cajita** para abrir la app desde cero.
3. **Muestra el flujo principal (toma unos 45–60 segundos):**
   - Ve a la pestaña **Cartera** → crea una cuenta rápida (p. ej. «Mi Banco» con saldo inicial).
   - Registra un **Gasto** o **Ingreso** con el botón **`+`**.
   - Pasa por la pestaña **Movimientos** y la pestaña **Análisis** (para que vean las gráficas).
   - Ve a **Ajustes** → entra en **Seguridad** y luego en **Privacidad y datos** (donde se ve la Política de Privacidad integrada y el botón *Borrar todos los datos locales*).
4. Detén la grabación, pasa el video `.mp4` / `.mov` a tu Mac por AirDrop y **adjúntalo en la respuesta al mensaje de App Review en App Store Connect** (sección *Comunicaciones con App Review* / *Resolution Center*).

---

## 📋 Paso 2: Texto exacto para responder en App Store Connect y pegar en «Notes» (Puntos 1 al 6)

Este texto responde punto por punto a los 6 requisitos de Apple (en inglés, listo para copiar y pegar tanto en el hilo de respuesta a App Review como en el campo **Notes** de **App Review Information**):

```text
APP REVIEW INFORMATION (GUIDELINE 2.1 RESPONSE):

1. SCREEN RECORDING & ACCOUNT FLOWS:
- A screen recording captured on a physical iPhone running the latest iOS is attached in the App Review message thread, starting from the iOS Home Screen launch and showing the typical user flow.
- No Account Registration / Login: Cajita is a 100% local-first offline app. There is no user registration, no login screen, and no server-side accounts. Users can delete all local data at any time from "Ajustes (Settings) -> Privacidad y datos -> Borrar todos los datos locales".
- No User-Generated Public Content: All records are strictly local and private to the user's device.
- No Paid Content / IAP: Cajita is 100% free with all features unlocked and no In-App Purchases or external payment links.

2. PURPOSE & TARGET AUDIENCE:
- Purpose: Cajita is a personal finance, bookkeeping, and budgeting utility designed for individuals who want to manually track their personal income, expenses, budgets, recurring bills, and informal loans/debts with complete privacy.
- Problem Solved & Value: Many finance trackers require linking bank credentials or uploading sensitive financial data to third-party servers. Cajita solves this by storing all records locally on the device in an AES-256 encrypted SQLite database (SQLCipher) with automatic backup to the user's private iCloud Drive container.
- Target Audience: General consumers (ages 16+) managing personal or household budgets.

3. INSTRUCTIONS FOR SETTING UP & ACCESSING MAIN FEATURES:
- No login credentials are required. Upon launching the app:
  a) Go to "Cartera" (Wallet) -> tap "+ Nueva cuenta" to create an account (Bank, Cash, Savings, or Credit Card).
  b) Go to "Inicio" (Home) or "Movimientos" -> tap "+" to log an Expense, Income, or Transfer between accounts.
  c) Go to "Cartera -> Deudas / Préstamos" to track money borrowed ("Debo") or lent ("Presté") and record payments.
  d) Go to "Ajustes -> Suscripciones y gastos fijos" to add monthly recurring bills and use the monthly checklist on Home.
  e) Go to "Análisis" (Stats) to view net worth, monthly cash flow, and category budgets.
  f) Sample CSV file: Go to "Ajustes -> Importar CSV -> Descargar plantilla" to generate a sample CSV template directly inside the app and test CSV importing.

4. EXTERNAL SERVICES, TOOLS & PLATFORMS USED:
- Cajita does NOT use any third-party backend servers, external financial APIs, payment processors, authentication providers, analytics SDKs, or AI services.
- It uses only native Apple OS frameworks and local libraries:
  * Local Database: SQLite encrypted at rest with SQLCipher (AES-256-CBC + HMAC-SHA256).
  * Key Storage: Apple iOS Keychain (expo-secure-store) and iCloud Keychain.
  * Cloud Backup: Apple iCloud Drive Ubiquity Container (iCloud.com.cajita.app) via NSFileCoordinator to back up the encrypted database directly to the user's personal Apple ID.
  * Biometrics: Apple LocalAuthentication (Face ID / Touch ID) for optional local app lock.
  * Notifications: Apple UserNotifications for local on-device bill reminders.

5. REGIONAL DIFFERENCES:
- Cajita functions consistently across all regions worldwide with no regional restrictions. Users can choose their display currency (COP, USD, EUR, MXN, ARS, CLP, PEN, BRL) in "Ajustes -> Perfil".

6. REGULATED INDUSTRY / THIRD-PARTY MATERIAL:
- Cajita is strictly a manual, offline personal ledger and calculation tool (like a digital notebook). It does NOT connect to banks, does NOT move or hold real money, does NOT process payments, and does NOT issue, broker, or facilitate real loans, credit, or investments. Financial institution licensing does not apply. All assets are original or open-source (Ionicons / Expo).
```
