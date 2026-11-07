import AppIntents
import Foundation

@MainActor
func triggerCajitaShortcut(route: String) {
  UserDefaults.standard.set(route, forKey: "cajita.pendingShortcutRoute")
  NotificationCenter.default.post(
    name: Notification.Name("CajitaShortcutTriggered"),
    object: nil,
    userInfo: ["route": route]
  )
}

// MARK: - Catálogo sincronizado desde SQLCipher (Cajita)

struct ShortcutAccountItem: Codable {
  let id: Int
  let uuid: String
  let name: String
  let type: String
}

struct ShortcutCategoryItem: Codable {
  let id: Int
  let uuid: String
  let name: String
  let type: String
}

struct ShortcutCatalog: Codable {
  let accounts: [ShortcutAccountItem]
  let categories: [ShortcutCategoryItem]
}

func loadShortcutCatalog() -> ShortcutCatalog {
  guard let raw = UserDefaults.standard.string(forKey: "cajita.shortcutCatalog"),
        let data = raw.data(using: .utf8),
        let decoded = try? JSONDecoder().decode(ShortcutCatalog.self, from: data) else {
    return ShortcutCatalog(accounts: [], categories: [])
  }
  return decoded
}

struct PendingShortcutTransaction: Codable {
  let mode: String
  let amount: Double
  let title: String
  let accountId: Int
  let toAccountId: Int?
  let categoryId: Int?
  let timestamp: Int64
}

@MainActor
func enqueueShortcutTransaction(_ tx: PendingShortcutTransaction) {
  let key = "cajita.pendingTransactionsQueue"
  var list: [PendingShortcutTransaction] = []
  if let raw = UserDefaults.standard.string(forKey: key),
     let data = raw.data(using: .utf8),
     let existing = try? JSONDecoder().decode([PendingShortcutTransaction].self, from: data) {
    list = existing
  }
  list.append(tx)
  if let encoded = try? JSONEncoder().encode(list),
     let json = String(data: encoded, encoding: .utf8) {
    UserDefaults.standard.set(json, forKey: key)
  }
  NotificationCenter.default.post(
    name: Notification.Name("CajitaBackgroundTransaction"),
    object: nil
  )
}

// MARK: - AppEntities (Cuentas y Categorías dinámicas)

@available(iOS 16.0, *)
struct CajitaAccountEntity: AppEntity {
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Cuenta de Cajita"
  static var defaultQuery = CajitaAccountQuery()

  var id: Int
  var name: String
  var type: String

  var displayRepresentation: DisplayRepresentation {
    let icon: String
    switch type {
    case "credit_card":
      icon = "creditcard.fill"
    case "cash":
      icon = "banknote.fill"
    case "savings", "cajita", "cdt":
      icon = "building.columns.fill"
    default:
      icon = "wallet.pass.fill"
    }
    return DisplayRepresentation(
      title: "\(name)",
      image: .init(systemName: icon)
    )
  }
}

@available(iOS 16.0, *)
struct CajitaAccountQuery: EntityQuery {
  func entities(for identifiers: [Int]) async throws -> [CajitaAccountEntity] {
    let all = loadShortcutCatalog().accounts.map {
      CajitaAccountEntity(id: $0.id, name: $0.name, type: $0.type)
    }
    return all.filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [CajitaAccountEntity] {
    return loadShortcutCatalog().accounts.map {
      CajitaAccountEntity(id: $0.id, name: $0.name, type: $0.type)
    }
  }
}

@available(iOS 16.0, *)
struct CajitaCategoryEntity: AppEntity {
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Categoría de Cajita"
  static var defaultQuery = CajitaCategoryQuery()

  var id: Int
  var name: String
  var type: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: "\(name)",
      image: .init(systemName: "tag.fill")
    )
  }
}

@available(iOS 16.0, *)
struct CajitaCategoryQuery: EntityQuery {
  func entities(for identifiers: [Int]) async throws -> [CajitaCategoryEntity] {
    let all = loadShortcutCatalog().categories.map {
      CajitaCategoryEntity(id: $0.id, name: $0.name, type: $0.type)
    }
    return all.filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [CajitaCategoryEntity] {
    let items = loadShortcutCatalog().categories.map {
      CajitaCategoryEntity(id: $0.id, name: $0.name, type: $0.type)
    }
    return [CajitaCategoryEntity(id: -1, name: "Sin categoría", type: "system")] + items
  }
}

// MARK: - Opciones del menú centralizado

@available(iOS 16.0, *)
enum CajitaActionOption: String, AppEnum {
  case expense = "expense"
  case income = "income"
  case transfer = "transfer"
  case paycard = "paycard"

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Tipo de operación"

  static var caseDisplayRepresentations: [CajitaActionOption: DisplayRepresentation] = [
    .expense: DisplayRepresentation(
      title: "Gasto (Egreso)",
      subtitle: "Registrar una compra o salida de dinero",
      image: .init(systemName: "arrow.down.circle.fill")
    ),
    .income: DisplayRepresentation(
      title: "Ingreso",
      subtitle: "Registrar un salario, abono o entrada",
      image: .init(systemName: "arrow.up.circle.fill")
    ),
    .transfer: DisplayRepresentation(
      title: "Transferencia",
      subtitle: "Mover dinero entre tus cuentas",
      image: .init(systemName: "arrow.left.arrow.right.circle.fill")
    ),
    .paycard: DisplayRepresentation(
      title: "Pago de tarjeta",
      subtitle: "Abonar a la deuda de una tarjeta de crédito",
      image: .init(systemName: "creditcard.fill")
    )
  ]
}

// MARK: - 1 Único Atajo Centralizado (Sin abrir la app)

@available(iOS 16.0, *)
struct AccionRapidaCajitaIntent: AppIntent {
  static var title: LocalizedStringResource = "Acción rápida en Cajita"
  static var description = IntentDescription(
    "Registra un gasto, ingreso, transferencia o pago de tarjeta desde un menú flotante sin necesidad de abrir la app."
  )
  // No abre la app: todo se ejecuta en el menú flotante nativo de iOS
  static var openAppWhenRun: Bool = false

  @Parameter(
    title: "Operación",
    requestValueDialog: IntentDialog("¿Qué deseas registrar en Cajita?")
  )
  var accion: CajitaActionOption

  @Parameter(
    title: "Monto",
    requestValueDialog: IntentDialog("¿Cuál es el monto?")
  )
  var monto: Double

  @Parameter(
    title: "Concepto",
    requestValueDialog: IntentDialog("¿Cuál es el concepto o descripción?")
  )
  var concepto: String?

  @Parameter(
    title: "Cuenta",
    requestValueDialog: IntentDialog("¿Con qué cuenta?")
  )
  var cuentaOrigen: CajitaAccountEntity?

  @Parameter(
    title: "Cuenta o tarjeta destino",
    requestValueDialog: IntentDialog("¿Hacia qué cuenta o tarjeta?")
  )
  var cuentaDestino: CajitaAccountEntity?

  @Parameter(
    title: "Categoría",
    requestValueDialog: IntentDialog("¿En qué categoría?")
  )
  var categoria: CajitaCategoryEntity?

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let catalog = loadShortcutCatalog()
    let allAccounts = catalog.accounts.map {
      CajitaAccountEntity(id: $0.id, name: $0.name, type: $0.type)
    }

    guard !allAccounts.isEmpty else {
      return .result(
        dialog: IntentDialog("Abre Cajita al menos una vez para sincronizar tus cuentas.")
      )
    }

    guard monto > 0 else {
      throw $monto.needsValueError(IntentDialog("Ingresa un monto mayor a cero."))
    }

    // 1. Seleccionar cuenta origen
    let originPool: [CajitaAccountEntity]
    if accion == .paycard {
      let funds = allAccounts.filter { !["credit_card", "debt", "loan"].contains($0.type) }
      originPool = funds.isEmpty ? allAccounts : funds
    } else {
      let nonDebt = allAccounts.filter { !["debt", "loan"].contains($0.type) }
      originPool = nonDebt.isEmpty ? allAccounts : nonDebt
    }

    let selectedOrigin: CajitaAccountEntity
    if let provided = cuentaOrigen {
      selectedOrigin = provided
    } else if originPool.count == 1 {
      selectedOrigin = originPool[0]
    } else {
      selectedOrigin = try await $cuentaOrigen.requestDisambiguation(
        among: originPool,
        dialog: IntentDialog("¿De qué cuenta?")
      )
    }

    // 2. Según el tipo de operación, pedir destino o categoría y concepto
    var selectedDest: CajitaAccountEntity? = nil
    var selectedCategoryId: Int? = nil
    let finalTitle: String

    switch accion {
    case .expense, .income:
      if let text = concepto?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty {
        finalTitle = text
      } else {
        finalTitle = try await $concepto.requestValue(
          IntentDialog(accion == .expense ? "¿En qué gastaste?" : "¿Concepto del ingreso?")
        )
      }

      let catType = accion == .income ? "income" : "expense"
      let matchingCats = catalog.categories
        .filter { $0.type == catType || $0.type == "system" }
        .map { CajitaCategoryEntity(id: $0.id, name: $0.name, type: $0.type) }
      let catOptions = [CajitaCategoryEntity(id: -1, name: "Sin categoría", type: "system")] + matchingCats

      if let providedCat = categoria {
        selectedCategoryId = providedCat.id == -1 ? nil : providedCat.id
      } else if catOptions.count > 1 {
        let chosenCat = try await $categoria.requestDisambiguation(
          among: catOptions,
          dialog: IntentDialog("¿En qué categoría?")
        )
        selectedCategoryId = chosenCat.id == -1 ? nil : chosenCat.id
      }

    case .transfer:
      let destPool = allAccounts.filter { $0.id != selectedOrigin.id && !["debt", "loan"].contains($0.type) }
      guard !destPool.isEmpty else {
        return .result(
          dialog: IntentDialog("Necesitas al menos dos cuentas en Cajita para hacer una transferencia.")
        )
      }
      if let providedDest = cuentaDestino, providedDest.id != selectedOrigin.id {
        selectedDest = providedDest
      } else if destPool.count == 1 {
        selectedDest = destPool[0]
      } else {
        selectedDest = try await $cuentaDestino.requestDisambiguation(
          among: destPool,
          dialog: IntentDialog("¿Hacia qué cuenta transferir?")
        )
      }
      let trimmed = concepto?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      finalTitle = trimmed.isEmpty ? "Transferencia" : trimmed

    case .paycard:
      let cards = allAccounts.filter { $0.type == "credit_card" && $0.id != selectedOrigin.id }
      let destPool = cards.isEmpty ? allAccounts.filter { $0.id != selectedOrigin.id } : cards
      guard !destPool.isEmpty else {
        return .result(
          dialog: IntentDialog("No tienes una tarjeta de crédito registrada en Cajita para pagar.")
        )
      }
      if let providedDest = cuentaDestino, providedDest.id != selectedOrigin.id {
        selectedDest = providedDest
      } else if destPool.count == 1 {
        selectedDest = destPool[0]
      } else {
        selectedDest = try await $cuentaDestino.requestDisambiguation(
          among: destPool,
          dialog: IntentDialog("¿Qué tarjeta deseas pagar?")
        )
      }
      finalTitle = "Pago Tarjeta de Crédito"
    }

    // 3. Encolar el movimiento para guardarlo en SQLCipher sin abrir la app
    let nowMs = Int64(Date().timeIntervalSince1970 * 1000)
    enqueueShortcutTransaction(
      PendingShortcutTransaction(
        mode: accion.rawValue,
        amount: monto,
        title: finalTitle,
        accountId: selectedOrigin.id,
        toAccountId: selectedDest?.id,
        categoryId: selectedCategoryId,
        timestamp: nowMs
      )
    )

    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.maximumFractionDigits = 2
    let amountStr = formatter.string(from: NSNumber(value: monto)) ?? "\(monto)"

    switch accion {
    case .expense:
      return .result(
        dialog: IntentDialog("Gasto registrado: $\(amountStr) en \(finalTitle) (\(selectedOrigin.name)).")
      )
    case .income:
      return .result(
        dialog: IntentDialog("Ingreso registrado: $\(amountStr) en \(finalTitle) (\(selectedOrigin.name)).")
      )
    case .transfer:
      let destName = selectedDest?.name ?? " destino"
      return .result(
        dialog: IntentDialog("Transferencia registrada: $\(amountStr) de \(selectedOrigin.name) a \(destName).")
      )
    case .paycard:
      let cardName = selectedDest?.name ?? "tarjeta"
      return .result(
        dialog: IntentDialog("Pago registrado: $\(amountStr) desde \(selectedOrigin.name) a \(cardName).")
      )
    }
  }
}

@available(iOS 16.0, *)
struct CajitaShortcutsProvider: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AccionRapidaCajitaIntent(),
      phrases: [
        "Acción rápida en \(.applicationName)",
        "Registrar movimiento en \(.applicationName)",
        "Anotar en \(.applicationName)"
      ],
      shortTitle: "Acción rápida",
      systemImageName: "bolt.circle.fill"
    )
  }
}
