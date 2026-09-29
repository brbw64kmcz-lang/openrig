import Foundation

/// Berechnet, zu wie viel Prozent ein Asset zu den persönlichen Werten
/// und der Risikobereitschaft eines Nutzers passt.
/// Die Formel ist bewusst einfach und offen gelegt – Nutzer (und Banken)
/// sollen nachvollziehen können, wie das Ergebnis entsteht.
enum ValueMatchEngine {

    struct Part: Identifiable {
        var id: String { value.rawValue }
        let value: InvestValue
        let score: Double
        let reason: String?
    }

    struct Result {
        /// Gesamtpassung 0...1
        let total: Double
        /// Passung zur Risikobereitschaft 0...1
        let riskFit: Double
        let parts: [Part]

        var verdict: String {
            switch total {
            case 0.75...: return "Passt sehr gut zu dir"
            case 0.55..<0.75: return "Passt teilweise"
            case 0.35..<0.55: return "Passt eher nicht"
            default: return "Widerspricht deinen Zielen"
            }
        }
    }

    /// Gewichtung: 80 % persönliche Werte, 20 % Risikopassung
    static let valueWeight = 0.8

    static func match(asset: Asset, profile: UserProfile) -> Result {
        let chosen = profile.values.isEmpty ? Set(InvestValue.allCases) : profile.values
        let parts = InvestValue.allCases
            .filter { chosen.contains($0) }
            .map { Part(value: $0, score: asset.valueScores[$0] ?? 0.5, reason: asset.valueReasons[$0]) }
        let scoreSum: Double = parts.map(\.score).reduce(0.0, +)
        let valueAvg: Double = parts.isEmpty ? 0.5 : scoreSum / Double(parts.count)
        let riskFit = riskFit(assetRisk: asset.riskClass, tolerance: profile.riskTolerance)
        let valuePart: Double = valueWeight * valueAvg
        let riskPart: Double = (1.0 - valueWeight) * riskFit
        let total: Double = valuePart + riskPart
        return Result(total: total, riskFit: riskFit, parts: parts)
    }

    /// Ein Asset, das riskanter ist als die Toleranz, wird stärker bestraft als ein sichereres.
    static func riskFit(assetRisk: Int, tolerance: Int) -> Double {
        let diff = Double(assetRisk - tolerance)
        let penalty: Double = diff > 0 ? diff / 4.0 : -diff / 8.0
        return max(0.0, 1.0 - penalty)
    }

    /// Wie gut passt das gesamte Depot zu einem einzelnen Wert (z. B. Nachhaltigkeit)?
    static func portfolioScore(for value: InvestValue, portfolio: PortfolioStore, market: MarketStore) -> Double {
        let total = portfolio.totalValue(market: market)
        guard total > 0 else { return 0 }
        let cashScore = market.asset("cash")?.valueScores[value] ?? 0.5
        var score: Double = portfolio.cash / total * cashScore
        for h in portfolio.holdings {
            guard let a = market.asset(h.assetID) else { continue }
            let weight: Double = portfolio.value(of: h, market: market) / total
            let assetScore: Double = a.valueScores[value] ?? 0.5
            score += weight * assetScore
        }
        return score
    }
}
