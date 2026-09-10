# Export Compliance Statement — Encryption

**App:** Cajita
**Bundle ID:** `com.cajita.app`
**Developer:** Cajita (desarrollador de la app)
**Apple ID:** `6808463218`
**SKU:** `254TTZ2VC5`
**Fecha:** 2026-09-09

---

## 1. Resumen

Cajita es una app de finanzas personales **local-first** para iOS y Android. Usa
encriptación para proteger los datos financieros del usuario **en reposo** y durante su
transferencia al iCloud personal del usuario.

No implementa algoritmos propietarios ni no estándar. Solo se usan **algoritmos estándar
reconocidos internacionalmente** (AES-256, HMAC-SHA256) y las APIs de encriptación del
propio sistema operativo (Keychain / Keystore, TLS de Apple, iCloud).

---

## 2. Uso de encriptación

### 2.1 Base de datos local (en reposo)

- La base SQLite (`cajita.db`) está cifrada con **SQLCipher**:
  - **AES-256** en modo CBC con verificación de integridad **HMAC-SHA256**.
  - SQLCipher es una librería open source basada en SQLite (estándar NIST / FIPS-197).
- La clave (256 bits) se genera con un generador criptográficamente seguro y se guarda en
  el llavero del sistema:
  - iOS: **Keychain** (elegible para **iCloud Keychain** con el mismo Apple ID).
  - Android: **Android Keystore** (EncryptedSharedPreferences).

### 2.2 Copia de seguridad en iCloud (tránsito / reposo)

- El archivo de base cifrado (SQLCipher) se guarda en el **contenedor de ubiquity iCloud
  Drive** de la cuenta personal del usuario.
- El transporte hacia/desde iCloud usa el servicio iCloud de Apple, con **TLS en tránsito**
  y la encriptación en reposo del lado de Apple. No hay servidores propios ni datos
  enviados a terceros.

### 2.3 APIs de encriptación del sistema operativo de Apple

- **Keychain** (iOS) para secretos: clave de cifrado, preferencias de bloqueo.
- **TLS** proporcionado por el sistema para toda la comunicación de red.
- iCloud / iCloud Keychain como infraestructura de encriptación de Apple.

---

## 3. Algoritmos utilizados

| Algoritmo                  | Tipo              | Estándar                      |
| -------------------------- | ----------------- | ----------------------------- |
| AES-256 (CBC)              | Cifrado simétrico | NIST FIPS-197                 |
| HMAC-SHA256                | Integridad        | NIST FIPS-198 / IETF RFC 2104 |
| Generador aleatorio seguro | Claves            | NIST SP 800-90A / APIs del SO |

- **Solo algoritmos estándar.** No se implementa criptografía propia ni algoritmos
  propietarios ni no aceptados por organismos de normalización (IEEE, IETF, ITU, NIST).

---

## 4. Propósito

Proteger la confidencialidad de la información financiera personal del usuario almacenada
en el dispositivo y en la cuenta iCloud privada del usuario. La encriptación es
transparente para el usuario y no impide la interoperabilidad.

---

## 5. Clasificación / Exención de mercado masivo

- Producto de **software de mercado masivo**, distribuido públicamente sin restricción a
  través del App Store.
- EE. UU.: software de encriptación de **mercado masivo** bajo la **EAR Categoría 5 Parte 2**
  (15 CFR 774), ítem **5A992 / 5D992 (mass market ENC)**. No requiere licencia de exportación.
- UE: Reglamento de doble uso (UE) 2021/821, Anexo I, **5A002** (software de mercado masivo).
- La app no contiene algoritmos propietarios ni diseños criptográficos originales.

---

## 6. Datos de contacto del declarante

- **Nombre / empresa:** Jesús Daniel Garizao Mejía (TheOfYisu)
- **Correo:** jesudgm.11@proton.me
- **Apple Developer Team ID:** 254TTZ2VC5

## 7. Configuración en App Store Connect

El proyecto declara `ITSAppUsesNonExemptEncryption: false` porque la distribución
se acoge a la exención aplicable al uso de cifrado. Esta bandera no activa ni
desactiva SQLCipher ni el cifrado de la base de datos.

Al subir el build, completar el cuestionario de **Export Compliance** y adjuntar
este documento cuando Apple lo solicite. La app usa algoritmos estándar para
proteger datos financieros en reposo y no contiene criptografía propietaria.
La clasificación final y cualquier requisito de ERN/BIS deben confirmarse según
la distribución y el territorio aplicables.

La declaración del `Info.plist` no sustituye el cuestionario de App Store Connect.

---

_Documento preparado para la revisión de export compliance de App Store Connect
(App Store). Puede adjuntarse en el apartado "Export Compliance" de la ficha del build o
enviarse por las herramientas de soporte de App Store Connect cuando Apple lo solicite._
