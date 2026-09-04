# 🏦 Cajita

> Finanzas personales **local-first** para iOS. Tus datos viven en tu dispositivo y se sincronizan con tu iCloud. Sin servidores, sin anuncios, sin trackers. Open source.

Cajita es una app de gestión financiera construida con **React Native / Expo SDK 54**, pensada para el caso real de manejar múltiples cuentas, tarjetas de crédito, deudas y préstamos con un flujo contable correcto.

---

## ✨ Características

### Cuentas
- Múltiples tipos: **Banco, Efectivo, Ahorro, Cajita, Tarjeta de crédito (con cupo), CDT, Deuda**
- Color e icono por cuenta, archivar/ocultar
- Saldo en tiempo real por cuenta

### Transacciones
- **Gasto** / **Ingreso** / **Transferencia** / **Balance Correction**
- **Transferencias entre cuentas**: crean un par (out/in) y **no cuentan como gasto ni ingreso**
- **Pago de tarjeta de crédito**: transferencia desde tu cuenta de fondos → **reduce la deuda** de la tarjeta
- **Balance Correction**: ajusta saldo inicial sin distorsionar reportes

### Deudas y préstamos
- Préstamos tipo **Debo (borrowed)** / **Presté (lent)**
- Cuotas que **reducen el saldo pendiente**
- Soporte de **intereses / costos** (TotalOffset) — ideal para créditos como el móvil de 10M
- Al pagar desde tu cuenta de fondos, el dinero sale de la cuenta y baja la deuda

### Estadísticas
- Patrimonio neto (activos − deudas)
- Ingresos y gastos del mes
- Resumen por cuenta

### Importación CSV
- Pega el contenido CSV (formato extendido de Cajita) o elige el archivo
- Columnas: `flow_title, flow_notes, flow_account_name, flow_account_type, flow_account_credit_limit, flow_transfer_to, flow_transfer_to_type, flow_amount, flow_date_of_transaction, flow_category_optional, flow_loan`
- **Cuentas** se crean con su tipo (bank, credit_card, savings, cajita, cdt, debt, loan) y cupo
- **Transferencias** (`flow_transfer_to`): pago de tarjeta → **reduce la deuda**
- **Préstamos** (`flow_loan`): asocia cuotas y reduce el saldo pendiente
- **«Balance inicial»** en el título se importa como Balance Correction
- Archivo de ejemplo listo para importar: **`import_cajita.csv`** (560 movimientos reales)

### Copia de seguridad iCloud (iOS)
- **Local-first**: la base SQLite local es la fuente de verdad, funciona 100% offline
- **Backup automático**: cada cambio que guardas sube `cajita.db` (cifrada) al contenedor
  de iCloud de tu cuenta — sin servidores propios, nadie más accede a tus datos
- Al abrir la app en un **iPhone nuevo** (o tras reinstalar) se restaura la copia sola si
  la BD local está vacía; también hay restauración manual en Ajustes
- Exportación de backup en JSON (portable, iOS y Android)

### Seguridad
- **Base de datos local cifrada con SQLCipher (AES-256)** — la clave vive en el llavero seguro del dispositivo (Keychain iOS / Keystore Android). El archivo `.db` es ilegible fuera de la app, incluso con el teléfono desbloqueado o en un backup
- La clave SQLCipher viaja por **iCloud Keychain** (misma Apple ID), así el backup cifrado
  se descifra en el iPhone nuevo. Requiere **iCloud Keychain activado**
- Bloqueo de la app con **Face ID / Touch ID / huella** (expo-local-authentication), con PIN/patrón del sistema como respaldo. Se re-bloquea al volver de segundo plano; se activa en **Ajustes → Seguridad**
- **Sin servidores**: no se conecta a bancos ni sube datos a terceros
- **Sin analytics ni trackers**
- ⚠️ El backup JSON exportable **no** está cifrado

### Gastos fijos y servicios mensuales
- Parametriza arriendo, administración, agua, luz, gas, internet, celular… con monto estimado y día de pago
- Cada mes aparecen como **pendiente** hasta que los marcas como pagados (ingresando el monto real)
- Recordatorio antes del vencimiento; checklist del mes en Inicio

### Retiros de efectivo
- Registra «retiré $X» (banco → efectivo) y la app descuenta automáticamente los gastos en efectivo
- Ves «de $X retirados quedan $Y» y cuánto sobró al cerrar el mes

---

## 🛠️ Stack

| Tecnología | Detalle |
|---|---|
| **Expo** | SDK 54 (compatible con Expo Go) |
| **React Native** | 0.81.5 |
| **Navegación** | expo-router |
| **Base de datos** | expo-sqlite + **SQLCipher** (SQLite local cifrado AES-256) |
| **Sincronización** | CloudKit / iCloud (NSUbiquitousContainers) |
| **Seguridad** | expo-local-authentication (Face ID / Touch ID / huella) |
| **CI/CD** | Codemagic (`codemagic.yaml`) — build iOS/Android con `expo prebuild` |
| **Lenguaje** | TypeScript (estricto) |

---

## 🚀 Cómo ejecutar

```bash
npm install
```

> ⚠️ **Expo Go ya no es compatible.** La app usa SQLCipher (módulo nativo), así que
> necesita un **dev build**.

- **Android (Windows):** `npx expo run:android` con un emulador o dispositivo conectado.
- **iOS:** genera un dev build en Codemagic/EAS (`ios_signing.distribution_type: development`),
  instálalo en el dispositivo y luego `npx expo start --dev-client`.
- **Web (solo pruebas de UI):** `npx expo start --web` — en web no hay cifrado ni módulos nativos.

---

## 📦 Build para iOS / Android (desde Windows)

El desarrollo es en Windows, así que la compilación nativa corre en la nube.

### Codemagic (recomendado) — `codemagic.yaml`

El repo trae `codemagic.yaml` con dos workflows (`ios-release`, `android-release`) que
generan los proyectos nativos en CI con `npx expo prebuild` (por eso `ios/` y `android/`
están en `.gitignore`). Se disparan al crear un tag `v*`:

```bash
git tag v1.0.1 && git push origin v1.0.1
```

Antes del primer build hay que configurar en el panel de Codemagic la integración de
**App Store Connect** (firma automática) y rellenar `APP_STORE_APPLE_ID`. Para Android,
subir el keystore y descomentar el bloque `android_signing`. Ver comentarios en el YAML.
La configuración de iCloud ya está en `app.json` (`NSUbiquitousContainers` +
entitlements vía `plugins/withCajitaEntitlements.js`), pero el App ID `com.cajita.app`
debe tener la capacidad **iCloud** habilitada en Apple Developer con el contenedor
`iCloud.com.cajita.app`, y el usuario necesita **iCloud Keychain activado** para que la
clave SQLCipher llegue a un iPhone nuevo.

### EAS Build (alternativa)

```bash
npx eas-cli login
npx eas-cli build --platform ios
```

---

## 🔍 Comparativa con Flow / Cashew / Dime

| Función | **Cajita** | Flow | Cashew | Dime |
|---|---|---|---|---|
| 100% gratis | ✅ | ✅ | ❌ (Pro $19.99) | ✅ |
| Open source | ✅ | ✅ | ✅ | ✅ |
| Múltiples cuentas | ✅ | ✅ | ✅ | ❌ |
| Tarjetas de crédito con deuda | ✅ | ✅ | ✅ | ❌ |
| Préstamos / deudas | ✅ | Parcial | ✅ | ❌ |
| Transferencias reducen deuda | ✅ | ✅ | ✅ | ❌ |
| Import CSV | ✅ | ⚠️ (problemas) | ✅ | ⚠️ |
| Balance correction | ✅ | Parcial | ✅ | ❌ |
| Local-first + iCloud | ✅ | ✅ (iCloud) | Google Drive | iCloud |

---

## 🗺️ Roadmap

### Fase 1 — Esencial
- [x] Editar transacción (modal con todos los campos)
- [x] Búsqueda y filtros (cuenta, categoría, texto, tipo)
- [x] Exportar CSV
- [x] Gastos recurrentes / suscripciones

### Fase 2 — Análisis
- [x] Presupuestos mensuales por categoría
- [x] Gráficos (desglose por categoría, barras mensuales)
- [ ] Metas de ahorro

### Personalización
- [x] Nombre del usuario, saludo en Inicio
- [x] Color de acento (10 opciones) y tema claro/oscuro/automático
- [x] Color e ícono por cuenta y por categoría
- [x] Ocultar saldos, moneda, día de inicio de mes
- [x] Importar CSV desde archivo (además de pegar) con previsualización

### Suscripciones y notificaciones
- [x] Suscripciones parametrizables (streaming, gimnasio, servicios): monto, cuenta, categoría, frecuencia (semanal/quincenal/mensual/trimestral/anual)
- [x] Recordatorios locales: aviso con N días de antelación + el día anterior + el mismo día
- [x] Antelación configurable por suscripción y por defecto en Ajustes → Notificaciones
- [x] Suscripción compartida con una persona (muestra su correo en los recordatorios)
- [x] «Próximos cobros» en Inicio

### Personas y préstamos
- [x] Ficha de persona con teléfono, **correo**, identificación y notas
- [x] Préstamos bidireccionales: «le presté» (me deben) y «me prestó» (le debo)
- [x] Deudas, tarjetas y préstamos unificados en la pestaña **Cartera**

### Fase 3 — Avanzado
- [ ] Adjuntar recibos (foto)
- [ ] Multi-moneda / tipo de cambio
- [ ] Widgets de iOS

---

## 🧪 Datos de ejemplo

Al importar el CSV generado para la migración se crean automáticamente cuentas como:

- Davivienda Ahorros 9680
- Nu Ahorros / Nu Cajitas
- Bolsillo Ahorro Davivienda / Bolsillo Moto
- TC Davivienda (cupo 12,200,000) / TC Nu (cupo 5,000,000)
- CDT Davivienda / CDT Nu
- Crédito Móvil Davivienda (deuda)

---

## 📄 Licencia

GPL-3.0 — ver [LICENSE](LICENSE).

---

## 👤 Autor

Desarrollado por [**TheOfYisu**](https://github.com/TheOfYisu).

---

*Hecho con 💚 para llevar las finanzas personales con control total de tus datos.*