import SwiftUI

// MARK: - Assetklassen

enum AssetClass: String, CaseIterable, Identifiable, Codable {
    case stocks = "Aktien & ETFs"
    case realEstate = "Immobilien"
    case crypto = "Krypto"
    case commodities = "Rohstoffe"
    case alternatives = "Alternative"
    case bonds = "Anleihen"
    case cash = "Cash"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .stocks: return "chart.line.uptrend.xyaxis"
        case .realEstate: return "building.2.fill"
        case .crypto: return "bitcoinsign.circle.fill"
        case .commodities: return "cube.fill"
        case .alternatives: return "wind"
        case .bonds: return "doc.text.fill"
        case .cash: return "banknote.fill"
        }
    }

    var color: Color {
        switch self {
        case .stocks: return Theme.blue
        case .realEstate: return Theme.purple
        case .crypto: return Theme.sky
        case .commodities: return Theme.lavender
        case .alternatives: return Color(red: 0.35, green: 0.40, blue: 0.85)
        case .bonds: return Color(red: 0.62, green: 0.52, blue: 0.90)
        case .cash: return Theme.gray
        }
    }

    /// Einfache Erklärung in einem Satz (für Einsteiger und ältere Nutzer)
    var plainExplanation: String {
        switch self {
        case .stocks: return "Du besitzt kleine Teile von Unternehmen. Ein ETF bündelt hunderte davon in einem Produkt."
        case .realEstate: return "Wohnungen, Büros oder Anteile daran. Bringen Miete und können im Wert steigen."
        case .crypto: return "Digitale Währungen wie Bitcoin. Sehr stark schwankend, technisch anspruchsvoll."
        case .commodities: return "Rohstoffe wie Gold, Öl oder Weizen. Oft ein Schutz gegen Inflation."
        case .alternatives: return "Z. B. Beteiligungen an nicht-börsennotierten Firmen oder Infrastruktur wie Windparks."
        case .bonds: return "Du leihst einem Staat oder Unternehmen Geld und bekommst dafür Zinsen."
        case .cash: return "Geld auf dem Konto oder Tagesgeld. Sicher, aber wächst kaum."
        }
    }
}

// MARK: - Werte / persönliche Ziele, an denen ein Asset gemessen wird

enum InvestValue: String, CaseIterable, Identifiable, Codable {
    case sustainability = "Nachhaltigkeit"
    case social = "Soziale Verantwortung"
    case innovation = "Technologie & Innovation"
    case safety = "Sicherheit"
    case income = "Regelmäßiges Einkommen"
    case liquidity = "Schnell verfügbar"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .sustainability: return "leaf.fill"
        case .social: return "person.3.fill"
        case .innovation: return "cpu"
        case .safety: return "shield.fill"
        case .income: return "arrow.triangle.2.circlepath"
        case .liquidity: return "drop.fill"
        }
    }

    var explanation: String {
        switch self {
        case .sustainability: return "Wie umwelt- und klimafreundlich ist das Asset (CO₂, Energie, Ressourcen)?"
        case .social: return "Wie fair sind Arbeitsbedingungen, Wohnraum-Versorgung, Unternehmensführung?"
        case .innovation: return "Wie stark profitiert das Asset von neuen Technologien?"
        case .safety: return "Wie gering sind Schwankungen und Verlustrisiko?"
        case .income: return "Wie viel laufender Ertrag (Miete, Dividende, Zins) fließt?"
        case .liquidity: return "Wie schnell kann ich es ohne Abschlag verkaufen?"
        }
    }
}

// MARK: - Kennzahl mit Erklärung

struct KeyFigure: Identifiable, Hashable {
    let id = UUID()
    let label: String
    let value: String
    let explanation: String
}

/// Eine Rechnung, die dem Nutzer Schritt für Schritt zeigt, wie eine Kennzahl entsteht.
struct CalculationStep: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let formula: String
    let result: String
}

struct PricePoint: Identifiable, Hashable {
    let id = UUID()
    let date: Date
    let value: Double
}

// MARK: - Asset

struct Asset: Identifiable {
    let id: String
    let name: String
    let symbol: String
    let assetClass: AssetClass
    let summary: String

    var price: Double
    var dayChange: Double           // Anteil, z. B. 0.012 = +1,2 %
    var history: [PricePoint]

    /// Annahmen für Simulationen (jährlich). Bewusst vorsichtig gewählt.
    let expectedReturn: Double
    let volatility: Double
    /// Laufender Ertrag p. a. (Miete, Dividende, Zins)
    let incomeYield: Double

    /// Risikoklasse 1–7 (angelehnt an die EU-Skala in Basisinformationsblättern)
    let riskClass: Int

    /// 0...1 je Wert-Dimension: wie gut passt das Asset zu diesem Ziel?
    let valueScores: [InvestValue: Double]
    /// Begründungen, warum ein Score so ist (Transparenz statt Blackbox)
    let valueReasons: [InvestValue: String]

    let keyFigures: [KeyFigure]
    let calculation: [CalculationStep]

    /// Für Krypto: Lernmodul, das vor dem Handel abgeschlossen sein muss
    var requiredCourseID: String? = nil

    var changeSinceStart: Double {
        guard let first = history.first?.value, first > 0 else { return 0 }
        return price / first - 1
    }
}

struct AssetRoute: Hashable {
    let id: String
}
