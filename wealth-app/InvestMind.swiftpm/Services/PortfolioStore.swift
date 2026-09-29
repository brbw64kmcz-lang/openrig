import Foundation

// Echtgeld-Bereich.
// WICHTIG: Diese Version bucht nur im Demo-Modus. Echte Ein- und Auszahlungen
// dürfen erst über einen lizenzierten Partner laufen (Bank / Broker mit
// BaFin-Erlaubnis, KYC/Geldwäscheprüfung, Angemessenheitsprüfung nach MiFID II).
// Die App ist dann "Frontend", das Geld liegt beim Partner – nie bei uns.

enum BrokerConnection: Equatable {
    case demo
    case partner(name: String)

    var label: String {
        switch self {
        case .demo: return "Demo-Depot (kein echtes Geld)"
        case .partner(let name): return "Verbunden mit \(name)"
        }
    }
}

struct Holding: Codable, Identifiable, Hashable {
    var id: String { assetID }
    let assetID: String
    var quantity: Double
    var averagePrice: Double
}

struct Transaction: Codable, Identifiable, Hashable {
    enum Kind: String, Codable {
        case deposit = "Einzahlung"
        case withdrawal = "Auszahlung"
        case buy = "Kauf"
        case sell = "Verkauf"

        var icon: String {
            switch self {
            case .deposit: return "arrow.down.circle.fill"
            case .withdrawal: return "arrow.up.circle.fill"
            case .buy: return "cart.fill"
            case .sell: return "arrow.uturn.left.circle.fill"
            }
        }
    }

    var id = UUID()
    var date = Date()
    let kind: Kind
    var assetID: String? = nil
    let amount: Double
    var quantity: Double? = nil
}

enum BrokerError: LocalizedError {
    case invalidAmount
    case insufficientCash
    case insufficientHoldings
    case courseRequired(courseID: String)
    case riskWarning(String)

    var errorDescription: String? {
        switch self {
        case .invalidAmount: return "Bitte gib einen Betrag größer als 0 ein."
        case .insufficientCash: return "Nicht genug Guthaben. Zahle zuerst Geld ein."
        case .insufficientHoldings: return "Du besitzt nicht genug Anteile."
        case .courseRequired: return "Bevor du Krypto handelst, schließe bitte das Lernmodul „Code verstehen“ ab. So weißt du, was du kaufst."
        case .riskWarning(let text): return text
        }
    }
}

/// Schnittstelle für einen späteren echten Broker-/Bankpartner.
protocol BrokerService {
    func deposit(_ amount: Double) throws
    func withdraw(_ amount: Double) throws
    func buy(assetID: String, amount: Double, price: Double) throws
    func sell(assetID: String, quantity: Double, price: Double) throws
}

final class PortfolioStore: ObservableObject, BrokerService {
    @Published private(set) var cash: Double
    @Published private(set) var holdings: [Holding]
    @Published private(set) var transactions: [Transaction]
    @Published var connection: BrokerConnection = .demo

    private let storageKey = "portfolio.v1"

    private struct Snapshot: Codable {
        var cash: Double
        var holdings: [Holding]
        var transactions: [Transaction]
    }

    init() {
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let snap = try? JSONDecoder().decode(Snapshot.self, from: data) {
            cash = snap.cash
            holdings = snap.holdings
            transactions = snap.transactions
        } else {
            // Beispielportfolio, damit die Übersicht beim ersten Start nicht leer ist
            cash = 3_150
            holdings = [
                Holding(assetID: "world-etf", quantity: 132, averagePrice: 84.10),
                Holding(assetID: "reit-res", quantity: 568, averagePrice: 25.20),
                Holding(assetID: "btc", quantity: 0.1, averagePrice: 41_000),
                Holding(assetID: "eth", quantity: 1.24, averagePrice: 1_950),
                Holding(assetID: "gold", quantity: 2.15, averagePrice: 1_820),
                Holding(assetID: "infra", quantity: 56.5, averagePrice: 50.00),
            ]
            transactions = [
                Transaction(date: Date().addingTimeInterval(-86_400 * 200), kind: .deposit, amount: 40_000),
                Transaction(date: Date().addingTimeInterval(-86_400 * 30), kind: .deposit, amount: 1_250),
            ]
        }
    }

    private func save() {
        let snap = Snapshot(cash: cash, holdings: holdings, transactions: transactions)
        if let data = try? JSONEncoder().encode(snap) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    // MARK: Buchungen

    func deposit(_ amount: Double) throws {
        guard amount > 0 else { throw BrokerError.invalidAmount }
        cash += amount
        transactions.insert(Transaction(kind: .deposit, amount: amount), at: 0)
        save()
    }

    func withdraw(_ amount: Double) throws {
        guard amount > 0 else { throw BrokerError.invalidAmount }
        guard amount <= cash else { throw BrokerError.insufficientCash }
        cash -= amount
        transactions.insert(Transaction(kind: .withdrawal, amount: amount), at: 0)
        save()
    }

    /// Kauft Anteile für einen Euro-Betrag.
    func buy(assetID: String, amount: Double, price: Double) throws {
        guard amount > 0, price > 0 else { throw BrokerError.invalidAmount }
        guard amount <= cash else { throw BrokerError.insufficientCash }
        let qty = amount / price
        if let i = holdings.firstIndex(where: { $0.assetID == assetID }) {
            let old = holdings[i]
            let newQty = old.quantity + qty
            holdings[i].averagePrice = (old.quantity * old.averagePrice + amount) / newQty
            holdings[i].quantity = newQty
        } else {
            holdings.append(Holding(assetID: assetID, quantity: qty, averagePrice: price))
        }
        cash -= amount
        transactions.insert(Transaction(kind: .buy, assetID: assetID, amount: amount, quantity: qty), at: 0)
        save()
    }

    func sell(assetID: String, quantity: Double, price: Double) throws {
        guard quantity > 0, price > 0 else { throw BrokerError.invalidAmount }
        guard let i = holdings.firstIndex(where: { $0.assetID == assetID }),
              holdings[i].quantity >= quantity - 1e-9 else { throw BrokerError.insufficientHoldings }
        holdings[i].quantity -= quantity
        if holdings[i].quantity < 1e-9 { holdings.remove(at: i) }
        let amount = quantity * price
        cash += amount
        transactions.insert(Transaction(kind: .sell, assetID: assetID, amount: amount, quantity: quantity), at: 0)
        save()
    }

    func resetDemo() {
        UserDefaults.standard.removeObject(forKey: storageKey)
        let fresh = PortfolioStore()
        cash = fresh.cash
        holdings = fresh.holdings
        transactions = fresh.transactions
    }

    // MARK: Auswertungen

    func holding(_ assetID: String) -> Holding? {
        holdings.first { $0.assetID == assetID }
    }

    func value(of h: Holding, market: MarketStore) -> Double {
        h.quantity * market.price(h.assetID)
    }

    func totalValue(market: MarketStore) -> Double {
        cash + holdings.reduce(0) { $0 + value(of: $1, market: market) }
    }

    func invested(market: MarketStore) -> Double {
        holdings.reduce(0) { $0 + $1.quantity * $1.averagePrice }
    }

    struct Slice: Identifiable {
        var id: String { assetClass.rawValue }
        let assetClass: AssetClass
        let value: Double
        let share: Double
    }

    func allocation(market: MarketStore) -> [Slice] {
        var byClass: [AssetClass: Double] = [.cash: cash]
        for h in holdings {
            guard let a = market.asset(h.assetID) else { continue }
            byClass[a.assetClass, default: 0] += h.quantity * a.price
        }
        let total = max(byClass.values.reduce(0, +), 1)
        return byClass
            .filter { $0.value > 0 }
            .map { Slice(assetClass: $0.key, value: $0.value, share: $0.value / total) }
            .sorted { $0.value > $1.value }
    }

    /// Laufender Ertrag pro Monat (Mieten, Dividenden, Zinsen) – geschätzt
    func monthlyIncome(market: MarketStore) -> Double {
        let fromHoldings = holdings.reduce(0.0) { sum, h in
            guard let a = market.asset(h.assetID) else { return sum }
            return sum + h.quantity * a.price * a.incomeYield
        }
        return (fromHoldings + cash * 0.02) / 12
    }

    /// Gewichtete Risikoklasse 1–7
    func riskScore(market: MarketStore) -> Double {
        let total = totalValue(market: market)
        guard total > 0 else { return 1 }
        var weighted = cash / total * 1
        for h in holdings {
            guard let a = market.asset(h.assetID) else { continue }
            weighted += value(of: h, market: market) / total * Double(a.riskClass)
        }
        return weighted
    }

    /// Wertentwicklung der letzten 12 Monate aus den heutigen Positionen
    func history(market: MarketStore) -> [PricePoint] {
        guard let reference = market.assets.first?.history, !reference.isEmpty else { return [] }
        var points: [PricePoint] = []
        points.reserveCapacity(reference.count)
        for idx in reference.indices {
            var v = cash
            for h in holdings {
                if let a = market.asset(h.assetID), idx < a.history.count {
                    v += h.quantity * a.history[idx].value
                }
            }
            points.append(PricePoint(date: reference[idx].date, value: v))
        }
        return points
    }
}
