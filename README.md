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

### Sincronización iCloud
- **Local-first**: la base SQLite local es la fuente de verdad, funciona 100% offline
- Cada registro tiene estado de sync (`pending` / `synced` / `deleted`)
- Backups en **tu iCloud** (CloudKit) — el desarrollador no tiene acceso a tus datos
- Exportación de backup en JSON

### Seguridad
- Bloqueo con **Face ID / Touch ID** (expo-secure-store)
- **Sin servidores**: no se conecta a bancos ni sube datos a terceros
- **Sin analytics ni trackers**

---

## 🛠️ Stack

| Tecnología | Detalle |
|---|---|
| **Expo** | SDK 54 (compatible con Expo Go) |
| **React Native** | 0.81.5 |
| **Navegación** | expo-router |
| **Base de datos** | expo-sqlite (SQLite local) |
| **Sincronización** | CloudKit / iCloud (NSUbiquitousContainers) |
| **Seguridad** | expo-secure-store |
| **Lenguaje** | TypeScript (estricto) |

---

## 🚀 Cómo ejecutar

```bash
cd E:\Nueva carpeta\cajita
npm install
npx expo start
```

- Escanea el QR con **Expo Go** (SDK 54) en tu iPhone
- O presiona `i` para abrir en simulador iOS
- `npx expo start --web` para probar en navegador

> Nota: la sincronización con **iCloud requiere build nativa** (EAS Build), no funciona en Expo Go.

---

## 📦 Build para iOS (desde Windows)

Como el desarrollo es en Windows y la app es para iOS, se usa **EAS Build** (compila en la nube, sin Mac):

```bash
npx eas-cli login
npx eas-cli build --platform ios
```

Esto genera el `.ipa` que puedes publicar en TestFlight / App Store. La configuración de iCloud (CloudKit) ya está en `app.json` (`NSUbiquitousContainers`).

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

*Hecho con 💚 para llevar las finanzas personales con control total de tus datos.*