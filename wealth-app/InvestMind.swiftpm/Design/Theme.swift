import SwiftUI

/// Zentrale Farben und Stile. Palette: Blau, Lila, Grau, Weiß.
/// Wer das Aussehen der ganzen App ändern will, ändert nur diese Datei.
enum Theme {
    // Hintergrund (sehr dunkles Nachtblau)
    static let bgTop = Color(red: 0.035, green: 0.055, blue: 0.14)
    static let bgBottom = Color(red: 0.07, green: 0.08, blue: 0.21)

    // Karten
    static let card = Color(red: 0.085, green: 0.115, blue: 0.26)
    static let cardRaised = Color(red: 0.12, green: 0.15, blue: 0.33)
    static let cardBorder = Color.white.opacity(0.08)

    // Akzente
    static let blue = Color(red: 0.30, green: 0.49, blue: 1.00)
    static let purple = Color(red: 0.55, green: 0.37, blue: 0.96)
    static let lavender = Color(red: 0.72, green: 0.68, blue: 1.00)
    static let sky = Color(red: 0.45, green: 0.75, blue: 1.00)
    static let gray = Color(red: 0.55, green: 0.59, blue: 0.70)

    // Text
    static let textPrimary = Color.white
    static let textSecondary = Color(red: 0.66, green: 0.70, blue: 0.83)
    static let textTertiary = Color(red: 0.48, green: 0.52, blue: 0.66)

    // Signalfarben (gedämpft; zusätzlich immer mit Pfeil/Vorzeichen, damit farbenblinde Menschen es lesen können)
    static let positive = Color(red: 0.36, green: 0.86, blue: 0.66)
    static let negative = Color(red: 1.00, green: 0.45, blue: 0.50)
    static let warning = Color(red: 1.00, green: 0.78, blue: 0.35)

    // Modus-Farben: Echtgeld vs. Simulation müssen sofort unterscheidbar sein
    static let realMoney = Color(red: 0.36, green: 0.86, blue: 0.66)
    static let simulation = lavender

    static let accentGradient = LinearGradient(
        colors: [blue, purple], startPoint: .leading, endPoint: .trailing)
    static let background = LinearGradient(
        colors: [bgTop, bgBottom], startPoint: .top, endPoint: .bottom)

    static let corner: CGFloat = 18
    static let spacing: CGFloat = 16

    /// Palette für Diagramme (Reihenfolge bleibt überall gleich)
    static let chartPalette: [Color] = [blue, purple, sky, lavender, gray, Color(red: 0.35, green: 0.40, blue: 0.85)]
}

// MARK: - Formatierung (deutsches Format: 1.234,56 €)

enum Fmt {
    private static let de = Locale(identifier: "de_DE")

    static func eur(_ value: Double, digits: Int = 0) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "EUR"
        f.locale = de
        f.minimumFractionDigits = digits
        f.maximumFractionDigits = digits
        return f.string(from: NSNumber(value: value)) ?? "\(value) €"
    }

    static func num(_ value: Double, digits: Int = 2) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = de
        f.minimumFractionDigits = digits
        f.maximumFractionDigits = digits
        return f.string(from: NSNumber(value: value)) ?? "\(value)"
    }

    /// `value` ist ein Anteil: 0.123 -> "+12,3 %"
    static func pct(_ value: Double, digits: Int = 1, sign: Bool = false) -> String {
        let body = num(value * 100, digits: digits) + " %"
        if sign && value > 0 { return "+" + body }
        return body
    }

    static func compact(_ value: Double) -> String {
        let a = abs(value)
        if a >= 1_000_000 { return num(value / 1_000_000, digits: 1) + " Mio." }
        if a >= 1_000 { return num(value / 1_000, digits: 0) + " Tsd." }
        return num(value, digits: 0)
    }
}
