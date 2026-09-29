import Foundation

/// Simuliert die Entwicklung eines Portfolios über viele Jahre.
/// Methode: Monte-Carlo – 500 mögliche Zukünfte werden zufällig durchgespielt.
/// Ergebnis ist kein Versprechen, sondern eine Bandbreite (schlecht / mittel / gut).
enum SimulationEngine {

    struct Input: Equatable {
        var initial: Double = 10_000
        var monthly: Double = 200
        var years: Int = 20
        /// Asset-ID -> Gewicht (wird automatisch auf 100 % normiert)
        var weights: [String: Double] = ["world-etf": 0.6, "green-bond": 0.2, "reit-res": 0.1, "gold": 0.1]
        var inflation: Double = 0.02
        var showReal: Bool = false
        /// Optionaler Crash-Test: Jahr und Einbruch (z. B. 0.3 = −30 %)
        var crashYear: Int? = nil
        var crashSize: Double = 0.3
        var paths: Int = 500
        var seed: UInt64 = 2026
    }

    struct YearPoint: Identifiable {
        var id: Int { year }
        let year: Int
        let invested: Double
        let p10: Double
        let p50: Double
        let p90: Double
    }

    struct Result {
        let points: [YearPoint]
        let expectedReturn: Double
        let volatility: Double
        let finalInvested: Double
        let finalP10: Double
        let finalP50: Double
        let finalP90: Double
        /// Anteil der Zukünfte, in denen am Ende weniger als eingezahlt übrig ist
        let probabilityOfLoss: Double
        /// Median des größten zwischenzeitlichen Rückgangs
        let medianMaxDrawdown: Double
        let annualIncome: Double

        var medianCAGR: Double {
            guard finalInvested > 0, let years = points.last?.year, years > 0 else { return 0 }
            return pow(max(finalP50, 1) / finalInvested, 1 / Double(years)) - 1
        }
    }

    /// Korrelation zwischen Assetklassen (vereinfachte Annahme, offen dokumentiert)
    static func correlation(_ a: AssetClass, _ b: AssetClass) -> Double {
        if a == b { return 0.85 }
        if a == .cash || b == .cash { return 0 }
        let pair = Set([a, b])
        if pair == Set<AssetClass>([.stocks, .realEstate]) { return 0.6 }
        if pair == Set<AssetClass>([.stocks, .crypto]) { return 0.4 }
        if pair == Set<AssetClass>([.stocks, .bonds]) { return 0.1 }
        if pair == Set<AssetClass>([.commodities, .bonds]) { return -0.1 }
        return 0.25
    }

    static func portfolioStats(weights: [String: Double], market: MarketStore) -> (mu: Double, sigma: Double, income: Double) {
        let items: [(Asset, Double)] = weights.compactMap { id, w in
            guard w > 0, let a = market.asset(id) else { return nil }
            return (a, w)
        }
        let total = items.reduce(0) { $0 + $1.1 }
        guard total > 0 else { return (0, 0, 0) }
        let norm = items.map { ($0.0, $0.1 / total) }
        let mu = norm.reduce(0) { $0 + $1.0.expectedReturn * $1.1 }
        let income = norm.reduce(0) { $0 + $1.0.incomeYield * $1.1 }
        var variance = 0.0
        for (a, wa) in norm {
            for (b, wb) in norm {
                let rho = a.id == b.id ? 1.0 : correlation(a.assetClass, b.assetClass)
                let weights: Double = wa * wb
                let vols: Double = a.volatility * b.volatility
                variance += weights * vols * rho
            }
        }
        return (mu, sqrt(max(variance, 0)), income)
    }

    static func run(_ input: Input, market: MarketStore) -> Result {
        let stats = portfolioStats(weights: input.weights, market: market)
        return run(input, mu: stats.mu, sigma: stats.sigma, income: stats.income)
    }

    /// Kernrechnung ohne Abhängigkeit von Marktdaten (testbar).
    static func run(_ input: Input, mu: Double, sigma: Double, income: Double) -> Result {
        let months = max(input.years, 1) * 12
        let dt = 1.0 / 12.0
        let drift = (mu - 0.5 * sigma * sigma) * dt
        let shockScale = sigma * sqrt(dt)
        var rng = SeededGenerator(seed: input.seed)

        // yearValues[y][path]
        var yearValues = [[Double]](repeating: [], count: input.years + 1)
        for y in 0...input.years { yearValues[y].reserveCapacity(input.paths) }
        var finals: [Double] = []
        var drawdowns: [Double] = []

        for _ in 0..<input.paths {
            var value = input.initial
            var peak = value
            var maxDD = 0.0
            yearValues[0].append(value)
            for m in 1...months {
                let shock: Double = shockScale * rng.normal()
                value *= exp(drift + shock)
                value += input.monthly
                if let crash = input.crashYear, m == crash * 12 {
                    value *= (1 - input.crashSize)
                }
                peak = max(peak, value)
                maxDD = max(maxDD, peak > 0 ? 1 - value / peak : 0)
                if m % 12 == 0 {
                    let year = m / 12
                    let deflator: Double = input.showReal ? pow(1.0 + input.inflation, Double(year)) : 1.0
                    yearValues[year].append(value / deflator)
                }
            }
            finals.append(yearValues[input.years].last ?? value)
            drawdowns.append(maxDD)
        }

        var points: [YearPoint] = []
        for y in 0...input.years {
            let sorted = yearValues[y].sorted()
            let invested = input.initial + input.monthly * 12 * Double(y)
            points.append(YearPoint(year: y, invested: invested,
                                    p10: percentile(sorted, 0.1), p50: percentile(sorted, 0.5), p90: percentile(sorted, 0.9)))
        }

        let finalInvested = input.initial + input.monthly * Double(months)
        let lossCount = finals.filter { $0 < finalInvested }.count
        let last = points.last ?? YearPoint(year: 0, invested: 0, p10: 0, p50: 0, p90: 0)

        return Result(
            points: points, expectedReturn: mu, volatility: sigma,
            finalInvested: finalInvested, finalP10: last.p10, finalP50: last.p50, finalP90: last.p90,
            probabilityOfLoss: Double(lossCount) / Double(max(finals.count, 1)),
            medianMaxDrawdown: percentile(drawdowns.sorted(), 0.5),
            annualIncome: last.p50 * income)
    }

    // MARK: Zielrechnung

    /// Welche monatliche Sparrate ist nötig, um `target` in `years` Jahren zu erreichen?
    static func requiredMonthly(target: Double, current: Double, years: Double, annualReturn: Double) -> Double {
        let n = max(years * 12, 1)
        let r = annualReturn / 12
        let growth = pow(1 + r, n)
        let remaining = target - current * growth
        if remaining <= 0 { return 0 }
        if abs(r) < 1e-9 { return remaining / n }
        return remaining * r / (growth - 1)
    }

    /// Erwarteter Endwert bei fester Rendite (ohne Zufall)
    static func futureValue(current: Double, monthly: Double, years: Double, annualReturn: Double) -> Double {
        let n = max(years * 12, 0)
        let r = annualReturn / 12
        let growth = pow(1 + r, n)
        if abs(r) < 1e-9 { return current + monthly * n }
        return current * growth + monthly * (growth - 1) / r
    }
}
