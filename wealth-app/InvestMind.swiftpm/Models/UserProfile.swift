import Foundation

enum AgeGroup: String, CaseIterable, Identifiable, Codable {
    case under25 = "unter 25"
    case from25to39 = "25–39"
    case from40to59 = "40–59"
    case over60 = "60+"
    var id: String { rawValue }
}

enum Experience: String, CaseIterable, Identifiable, Codable {
    case none = "Ich fange gerade an"
    case some = "Ich habe schon etwas angelegt"
    case advanced = "Ich kenne mich gut aus"
    var id: String { rawValue }
}

/// Die drei Labore (Vertiefungsbereiche)
enum LabArea: String, CaseIterable, Identifiable, Codable {
    case crypto = "Krypto & Code"
    case realEstate = "Immobilien & Stadt"
    case strategy = "Rohstoffe, Derivate & Strategie"
    var id: String { rawValue }

    var icon: String {
        switch self {
        case .crypto: return "chevron.left.forwardslash.chevron.right"
        case .realEstate: return "building.2.crop.circle"
        case .strategy: return "checkerboard.rectangle"
        }
    }

    var tagline: String {
        switch self {
        case .crypto: return "Programmiere eine eigene Mini-Blockchain, mine Blöcke und verstehe Sicherheit."
        case .realEstate: return "Baue eine Stadt in 3D und sieh, wie Mieten und Preise darauf reagieren."
        case .strategy: return "Handle Futures & Optionen auf Rohstoffe und lerne Strategie mit Spieltheorie."
        }
    }
}

enum GoalKind: String, CaseIterable, Identifiable, Codable {
    case wealth = "Vermögen aufbauen"
    case freedom = "Finanzielle Freiheit"
    case cashflow = "Regelmäßiger Cashflow"
    case business = "Eigenkapital für Unternehmen"
    case home = "Eigene Immobilie"
    case retirement = "Altersvorsorge"
    var id: String { rawValue }

    var icon: String {
        switch self {
        case .wealth: return "chart.line.uptrend.xyaxis"
        case .freedom: return "sun.max.fill"
        case .cashflow: return "arrow.triangle.2.circlepath"
        case .business: return "briefcase.fill"
        case .home: return "house.fill"
        case .retirement: return "figure.walk"
        }
    }
}

struct Goal: Identifiable, Codable, Hashable {
    var id = UUID()
    var kind: GoalKind
    var targetAmount: Double
    var targetYear: Int
    var monthlyContribution: Double
    /// Welcher Anteil des Depots diesem Ziel zugeordnet ist (0...1)
    var portfolioShare: Double
}

struct UserProfile: Codable {
    var name: String = ""
    var ageGroup: AgeGroup = .from25to39
    var experience: Experience = .none
    /// 1 = sehr vorsichtig ... 7 = sehr risikofreudig
    var riskTolerance: Int = 4
    var values: Set<InvestValue> = [.sustainability]
    var interests: Set<LabArea> = Set(LabArea.allCases)
    var goals: [Goal] = []
    /// Einfacher Modus: größere Schrift, weniger Fachbegriffe, Erklärungen immer sichtbar
    var simpleMode: Bool = false
    var onboardingDone: Bool = false

    var riskLabel: String {
        switch riskTolerance {
        case 1...2: return "Vorsichtig"
        case 3...5: return "Ausgewogen"
        default: return "Chancenorientiert"
        }
    }

    var displayName: String { name.isEmpty ? "du" : name }
}
