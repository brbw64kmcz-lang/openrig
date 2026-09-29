import Foundation

// Futures und Optionen: Auszahlungsprofile, faire Preise (Black-Scholes), Hedging-Spiel.

enum DerivativeKind: String, CaseIterable, Identifiable {
    case futureLong = "Future kaufen"
    case futureShort = "Future verkaufen"
    case callLong = "Call kaufen"
    case putLong = "Put kaufen"
    case callShort = "Call verkaufen"
    case putShort = "Put verkaufen"

    var id: String { rawValue }

    var isOption: Bool {
        switch self {
        case .futureLong, .futureShort: return false
        default: return true
        }
    }

    var plain: String {
        switch self {
        case .futureLong: return "Du verpflichtest dich, später zum heutigen Preis zu kaufen. Gewinn, wenn der Preis steigt."
        case .futureShort: return "Du verpflichtest dich, später zum heutigen Preis zu verkaufen. Gewinn, wenn der Preis fällt."
        case .callLong: return "Recht zu kaufen. Verlust max. die Prämie, Gewinn bei stark steigendem Preis."
        case .putLong: return "Recht zu verkaufen – wie eine Versicherung gegen fallende Preise."
        case .callShort: return "Du kassierst die Prämie, musst aber liefern, wenn der Preis steigt. Verlust theoretisch unbegrenzt!"
        case .putShort: return "Du kassierst die Prämie, musst aber kaufen, wenn der Preis fällt. Hohes Verlustrisiko."
        }
    }
}

enum OptionPricing {
    /// Black-Scholes-Preis einer europäischen Option.
    /// s: Kurs, k: Basispreis, t: Laufzeit in Jahren, r: Zins, sigma: Volatilität
    static func blackScholes(call: Bool, s: Double, k: Double, t: Double, r: Double, sigma: Double) -> Double {
        guard s > 0, k > 0 else { return 0 }
        guard t > 0, sigma > 0 else { return max(0, call ? s - k : k - s) }
        let d1: Double = d1Value(s: s, k: k, t: t, r: r, sigma: sigma)
        let d2: Double = d1 - sigma * sqrt(t)
        let discountedStrike: Double = k * exp(-r * t)
        if call {
            return s * normalCDF(d1) - discountedStrike * normalCDF(d2)
        } else {
            return discountedStrike * normalCDF(-d2) - s * normalCDF(-d1)
        }
    }

    static func d1Value(s: Double, k: Double, t: Double, r: Double, sigma: Double) -> Double {
        let drift: Double = (r + 0.5 * sigma * sigma) * t
        let numerator: Double = log(s / k) + drift
        let denominator: Double = sigma * sqrt(t)
        return numerator / denominator
    }

    /// Delta: Wie stark ändert sich der Optionspreis, wenn der Kurs um 1 steigt?
    static func delta(call: Bool, s: Double, k: Double, t: Double, r: Double, sigma: Double) -> Double {
        guard s > 0, k > 0, t > 0, sigma > 0 else { return call ? (s > k ? 1 : 0) : (s < k ? -1 : 0) }
        let d1: Double = d1Value(s: s, k: k, t: t, r: r, sigma: sigma)
        return call ? normalCDF(d1) : normalCDF(d1) - 1
    }
}

struct DerivativePosition {
    var kind: DerivativeKind
    /// Basispreis (Optionen) bzw. vereinbarter Preis (Future)
    var strike: Double
    /// Prämie pro Einheit (nur Optionen)
    var premium: Double
    var contracts: Double
    /// Einheiten je Kontrakt (z. B. 100 Unzen Gold)
    var contractSize: Double

    var units: Double { contracts * contractSize }

    /// Gewinn/Verlust bei Fälligkeit für einen gegebenen Preis
    func profit(at price: Double) -> Double {
        let perUnit: Double
        switch kind {
        case .futureLong: perUnit = price - strike
        case .futureShort: perUnit = strike - price
        case .callLong: perUnit = max(0, price - strike) - premium
        case .putLong: perUnit = max(0, strike - price) - premium
        case .callShort: perUnit = premium - max(0, price - strike)
        case .putShort: perUnit = premium - max(0, strike - price)
        }
        return perUnit * units
    }

    /// Sicherheitsleistung (Margin) – vereinfacht 10 % des Kontraktwerts
    var initialMargin: Double {
        switch kind {
        case .futureLong, .futureShort, .callShort, .putShort: return strike * units * 0.10
        case .callLong, .putLong: return premium * units
        }
    }

    var breakEven: Double? {
        switch kind {
        case .futureLong, .futureShort: return strike
        case .callLong, .callShort: return strike + premium
        case .putLong, .putShort: return strike - premium
        }
    }

    /// nil = unbegrenzt
    var maxLoss: Double? {
        switch kind {
        case .futureLong: return strike * units
        case .futureShort: return nil
        case .callLong, .putLong: return premium * units
        case .callShort: return nil
        case .putShort: return (strike - premium) * units
        }
    }

    /// nil = unbegrenzt
    var maxGain: Double? {
        switch kind {
        case .futureLong: return nil
        case .futureShort: return strike * units
        case .callLong: return nil
        case .putLong: return (strike - premium) * units
        case .callShort, .putShort: return premium * units
        }
    }
}

// MARK: - Hedging-Spiel

/// Du führst eine Bäckerei und brauchst in 6 Monaten 100 t Weizen.
/// Pro Runde wählst du, welchen Anteil du heute per Future absicherst.
struct HedgingGame {
    struct Round: Identifiable {
        let id: Int
        let hedgeRatio: Double
        let spotToday: Double
        let futurePrice: Double
        let spotLater: Double
        let costHedged: Double
        let costUnhedged: Double
    }

    let tons = 100.0
    let totalRounds = 6
    private(set) var rounds: [Round] = []
    private(set) var spot: Double
    private var rng: SeededGenerator

    init(seed: UInt64 = UInt64(Date().timeIntervalSince1970), spot: Double = 218) {
        self.spot = spot
        self.rng = SeededGenerator(seed: seed)
    }

    var isFinished: Bool { rounds.count >= totalRounds }

    var futurePrice: Double { spot * 1.02 }

    mutating func play(hedgeRatio: Double) {
        guard !isFinished else { return }
        let h = min(max(hedgeRatio, 0), 1)
        let later = spot * exp(0.28 * sqrt(0.5) * rng.normal())
        let fut = futurePrice
        let hedgedPart: Double = h * tons * fut
        let spotPart: Double = (1 - h) * tons * later
        let hedged: Double = hedgedPart + spotPart
        let unhedged = tons * later
        rounds.append(Round(id: rounds.count + 1, hedgeRatio: h, spotToday: spot, futurePrice: fut,
                            spotLater: later, costHedged: hedged, costUnhedged: unhedged))
        spot = later
    }

    private func stdev(_ xs: [Double]) -> Double {
        guard xs.count > 1 else { return 0 }
        let m = xs.reduce(0, +) / Double(xs.count)
        return sqrt(xs.map { ($0 - m) * ($0 - m) }.reduce(0, +) / Double(xs.count - 1))
    }

    var hedgedSpread: Double { stdev(rounds.map(\.costHedged)) }
    var unhedgedSpread: Double { stdev(rounds.map(\.costUnhedged)) }
    var totalHedged: Double { rounds.map(\.costHedged).reduce(0, +) }
    var totalUnhedged: Double { rounds.map(\.costUnhedged).reduce(0, +) }
}
