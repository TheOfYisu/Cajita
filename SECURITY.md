# Política de Seguridad — Cajita / Security Policy — Cajita

**Aplicación / Application:** Cajita (`com.cajita.app`)  
**Arquitectura:** 100 % Local-First & Zero-Knowledge  
**Contacto de seguridad:** [jesudgm.11@proton.me](mailto:jesudgm.11@proton.me)  
**Reporte privado en GitHub:** [GitHub Security Advisories](https://github.com/TheOfYisu/Cajita/security/advisories/new)

---

## 1. Versiones Compatibles / Supported Versions

Mantenemos activas las actualizaciones de seguridad para las siguientes versiones de Cajita:

| Versión / Version | Estado / Status | Notas / Notes |
| :--- | :---: | :--- |
| **1.1.x** (Actual) | :white_check_mark: | Versión en producción activa con soporte completo de parches. |
| **1.0.x** | :white_check_mark: | Soporte de parches críticos de seguridad y cifrado. |
| **< 1.0** (Alfas/Betas) | :x: | Versiones preliminares no soportadas. Se recomienda actualizar. |

---

## 2. Modelo de Seguridad de Cajita

Cajita opera bajo una filosofía **Local-First y Cero Conocimiento (*Zero-Knowledge*)**:
- **Cero servidores propios y cero APIs externas:** La app no envía datos financieros a la nube ni mantiene servidores de backend.
- **Sin conexión bancaria:** No se conecta a APIs de bancos, plataformas financieras ni buzones de correo; todos los datos son introducidos localmente por el usuario.
- **Cifrado en reposo con SQLCipher (AES-256-CBC + HMAC-SHA256):** La base de datos local `cajita.db` está completamente cifrada.
- **Almacenamiento de clave en hardware seguro:** La clave criptográfica de 256 bits se genera localmente y se resguarda en:
  - **iOS:** iOS Keychain (`WHEN_UNLOCKED`, sincronizado de forma segura vía iCloud Keychain).
  - **Android:** Android Keystore (`EncryptedSharedPreferences`).
- **Respaldo en iCloud (solo iOS):** El archivo respaldado en el contenedor ubiquity (`iCloud.com.cajita.app`) es la base de datos cifrada tal cual (`wal_checkpoint(TRUNCATE)` con `NSFileCoordinator`).
- **Biometría nativa:** El bloqueo con Face ID, Touch ID o huella dactilar es gestionado directamente por las APIs seguras del sistema operativo.

---

## 3. Alcance de Seguridad (Scope)

### ✅ Dentro del alcance (In-Scope)
Agradecemos reportes responsables sobre vulnerabilidades que comprometan la confidencialidad, integridad o disponibilidad de la app:
- Fallas criptográficas en la generación, derivación o almacenamiento de la clave de SQLCipher.
- Fugas o exposición de la clave en Keychain, Keystore o registros del sistema (*logs*).
- Vulnerabilidades que permitan eludir el bloqueo biométrico de la aplicación sin autenticación válida.
- Fugas de datos en almacenamiento temporal o exposición indebida de archivos durante la importación/exportación.
- Vulnerabilidades en el módulo nativo de sincronización con iCloud (`cajita-cloud-sync`), como condiciones de carrera (*race conditions*) o sobreescritura indebida.
- Inyección o manipulación no autenticada de parámetros en esquemas de URL, Deep Links o Atajos de iOS (`cajita://quick-action`).

### ❌ Fuera del alcance (Out-of-Scope)
- Dispositivos rooteados, con *jailbreak* o con el sistema operativo manipulado donde el sandbox de seguridad del SO ya esté roto.
- Ataques que requieran acceso físico previo con el dispositivo desbloqueado o conocimiento del código de desbloqueo del teléfono.
- El hecho de que las exportaciones manuales a CSV o JSON se generen en texto plano (es una funcionalidad explícita advertida al usuario).
- Ataques de denegación de servicio local por manipulación forzada de archivos en el sistema de archivos del teléfono.

---

## 4. Cómo Reportar una Vulnerabilidad / Reporting a Vulnerability

Por favor, **NO publiques reportes de seguridad en Issues, Pull Requests o foros públicos**.

Utiliza cualquiera de los siguientes canales privados:

1. **GitHub Private Vulnerability Reporting (Recomendado):**  
   Envía un reporte confidencial a través de la pestaña de seguridad de GitHub:  
   👉 [Reportar vulnerabilidad en Cajita](https://github.com/TheOfYisu/Cajita/security/advisories/new)

2. **Correo Electrónico Directo:**  
   Escribe a [jesudgm.11@proton.me](mailto:jesudgm.11@proton.me) con el asunto:  
   `[SECURITY] Vulnerabilidad en Cajita vX.X.X`

### ¿Qué incluir en tu reporte?
- **Descripción clara:** Explicación técnica de la vulnerabilidad.
- **Pasos para reproducir:** Prueba de concepto (PoC), capturas, scripts o instrucciones detalladas paso a paso.
- **Plataforma y versión afectada:** Sistema operativo (iOS o Android), versión del SO y versión exacta de Cajita.
- **Impacto potencial:** Qué datos o llaves criptográficas podrían verse afectados.

---

## 5. Tiempos de Respuesta y Compromiso

- **Acuse de recibo inicial:** Máximo **48 horas** hábiles.
- **Evaluación y seguimiento:** Actualización del estado de la investigación cada **3 a 5 días hábiles**.
- **Publicación y crédito:** Una vez probado y liberado el parche correctivo en App Store y Google Play, se coordinará la divulgación pública y se reconocerá tu colaboración en las notas de lanzamiento (salvo que prefieras el anonimato).

Agradecemos profundamente a la comunidad de investigadores por ayudarnos a mantener Cajita como un estándar de privacidad y seguridad local.
