import ExpoModulesCore

/**
 * Transporte nativo de iCloud para la copia de seguridad de `cajita.db`.
 *
 * Usa el contenedor de ubiquity (iCloud Drive) declarado en `app.json`
 * (`NSUbiquitousContainers` → `iCloud.com.cajita.app`) para subir/bajar el
 * archivo cifrado con SQLCipher. Al ser un archivo en un contenedor de iCloud,
 * iOS lo sincroniza automáticamente con el resto de dispositivos del usuario.
 */
public class CajitaCloudSyncModule: Module {
  private let containerId = "iCloud.com.cajita.app"

  public func definition() -> ModuleDefinition {
    Name("CajitaCloudSync")

    // ¿Hay sesión de iCloud activa en este dispositivo?
    Function("isCloudAvailable") {
      return FileManager.default.ubiquityIdentityToken != nil
    }

    // ¿Existe ya un backup remoto?
    Function("cloudFileExists") { (remoteName: String) -> Bool in
      guard let base = FileManager.default.url(forUbiquityContainerIdentifier: self.containerId) else {
        return false
      }
      return FileManager.default.fileExists(atPath: base.appendingPathComponent(remoteName).path)
    }

    // Sube un archivo local (snapshot cifrado de la BD) al contenedor iCloud.
    AsyncFunction("upload") { (localPath: String, remoteName: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        self.upload(localPath: localPath, remoteName: remoteName, promise: promise)
      }
    }

    // Baja el backup desde iCloud a una ruta local.
    AsyncFunction("download") { (remoteName: String, localPath: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        self.download(remoteName: remoteName, localPath: localPath, promise: promise)
      }
    }
  }

  private func localURL(_ path: String) -> URL {
    return URL(string: path) ?? URL(fileURLWithPath: path)
  }

  private func upload(localPath: String, remoteName: String, promise: Promise) {
    guard let base = FileManager.default.url(forUbiquityContainerIdentifier: containerId) else {
      promise.reject("E_ICLOUD_UNAVAILABLE", "iCloud no disponible: inicia sesión en iCloud para poder hacer la copia.")
      return
    }
    do {
      try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true, attributes: nil)
    } catch {
      promise.reject("E_UPLOAD", error.localizedDescription)
      return
    }

    let source = localURL(localPath)
    let dest = base.appendingPathComponent(remoteName)
    var settled = false
    let finish: (() -> Void) = {
      guard !settled else { return }
      settled = true
      promise.resolve()
    }
    let fail: ((String, String) -> Void) = { code, message in
      guard !settled else { return }
      settled = true
      promise.reject(code, message)
    }

    var coordError: NSError?
    let coordinator = NSFileCoordinator(filePresenter: nil)
    coordinator.coordinate(writingItemAt: dest, options: .forReplacing, error: &coordError) { url in
      do {
        let fm = FileManager.default
        if fm.fileExists(atPath: url.path) {
          try fm.removeItem(at: url)
        }
        try fm.copyItem(at: source, to: url)
        finish()
      } catch {
        fail("E_UPLOAD", error.localizedDescription)
      }
    }
    if let coordError {
      fail("E_UPLOAD", coordError.localizedDescription)
    }
  }

  private func download(remoteName: String, localPath: String, promise: Promise) {
    guard let base = FileManager.default.url(forUbiquityContainerIdentifier: containerId) else {
      promise.reject("E_ICLOUD_UNAVAILABLE", "iCloud no disponible: inicia sesión en iCloud para poder restaurar.")
      return
    }

    let src = base.appendingPathComponent(remoteName)
    let destination = localURL(localPath)
    let fm = FileManager.default

    guard fm.fileExists(atPath: src.path) else {
      promise.reject("E_NOT_FOUND", "No hay una copia de seguridad en iCloud todavía.")
      return
    }

    // Si el archivo remoto es solo un placeholder (no descargado aún), pedimos la
    // descarga y esperamos un poco hasta que esté disponible localmente.
    try? fm.startDownloadingUbiquitousItem(at: src)
    var attempts = 0
    while attempts < 50 {
      let status = (try? src.resourceValues(forKeys: [.ubiquitousItemDownloadingStatusKey]).ubiquitousItemDownloadingStatus) ?? .current
      if status == .current { break }
      usleep(200_000)
      attempts += 1
    }

    var settled = false
    let finish: (() -> Void) = {
      guard !settled else { return }
      settled = true
      promise.resolve()
    }
    let fail: ((String, String) -> Void) = { code, message in
      guard !settled else { return }
      settled = true
      promise.reject(code, message)
    }

    var coordError: NSError?
    let coordinator = NSFileCoordinator(filePresenter: nil)
    coordinator.coordinate(readingItemAt: src, options: [], error: &coordError) { url in
      do {
        if fm.fileExists(atPath: destination.path) {
          try fm.removeItem(at: destination)
        }
        try fm.copyItem(at: url, to: destination)
        finish()
      } catch {
        fail("E_DOWNLOAD", error.localizedDescription)
      }
    }
    if let coordError {
      fail("E_DOWNLOAD", coordError.localizedDescription)
    }
  }
}