import SwiftUI

/// Alle Bereiche der App. Eine Stelle für Titel, Symbol und Beschreibung.
enum AppSection: String, CaseIterable, Identifiable, Hashable {
    case dashboard, portfolio, simulator, learn, labs
    case cryptoLab, realEstateLab, strategyLab
    case goals, assistant, settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .dashboard: return "Übersicht"
        case .portfolio: return "Mein Depot"
        case .simulator: return "Simulator"
        case .learn: return "Lernen"
        case .labs: return "Labore"
        case .cryptoLab: return "Krypto-Labor"
        case .realEstateLab: return "Immobilien-Labor"
        case .strategyLab: return "Strategie-Labor"
        case .goals: return "Ziele & Strategie"
        case .assistant: return "KI-Assistent"
        case .settings: return "Einstellungen"
        }
    }

    var icon: String {
        switch self {
        case .dashboard: return "house.fill"
        case .portfolio: return "briefcase.fill"
        case .simulator: return "chart.xyaxis.line"
        case .learn: return "book.fill"
        case .labs: return "gamecontroller.fill"
        case .cryptoLab: return "chevron.left.forwardslash.chevron.right"
        case .realEstateLab: return "building.2.fill"
        case .strategyLab: return "checkerboard.rectangle"
        case .goals: return "target"
        case .assistant: return "sparkles"
        case .settings: return "gearshape.fill"
        }
    }

    /// Kurzbeschreibung – wird im einfachen Modus unter dem Titel gezeigt
    var plainDescription: String {
        switch self {
        case .dashboard: return "Alles auf einen Blick"
        case .portfolio: return "Dein Geld und deine Anlagen"
        case .simulator: return "Ausprobieren ohne Risiko"
        case .learn: return "Schritt für Schritt verstehen"
        case .labs: return "Vertiefen und selbst bauen"
        case .cryptoLab: return "Blockchain selbst programmieren"
        case .realEstateLab: return "Stadt in 3D gestalten"
        case .strategyLab: return "Rohstoffe, Derivate, Spieltheorie"
        case .goals: return "Wohin willst du?"
        case .assistant: return "Fragen stellen"
        case .settings: return "Profil, Schrift, Hinweise"
        }
    }

    /// Reiter in der unteren Leiste auf dem iPhone
    static let tabs: [AppSection] = [.dashboard, .portfolio, .simulator, .learn, .labs]
    static let labSections: [AppSection] = [.cryptoLab, .realEstateLab, .strategyLab]
}

/// Zentraler Zustand der App.
final class AppState: ObservableObject {
    @Published var profile: UserProfile {
        didSet { save() }
    }
    @Published var completedLessons: Set<String> {
        didSet { save() }
    }
    @Published var selectedSection: AppSection? = .dashboard
    @Published var selectedTab: AppSection = .dashboard
    /// Navigationspfade je Reiter (iPhone), damit `open(_:)` auch Unterseiten öffnen kann
    @Published var paths: [AppSection: NavigationPath] = [:]
    /// Wird gesetzt, wenn ein Asset "im Simulator getestet" werden soll
    @Published var simulatorPresetAssetID: String?

    let market = MarketStore()
    let portfolio = PortfolioStore()

    private let profileKey = "profile.v1"
    private let lessonsKey = "lessons.v1"

    init() {
        let defaults = UserDefaults.standard
        if let data = defaults.data(forKey: profileKey),
           let p = try? JSONDecoder().decode(UserProfile.self, from: data) {
            profile = p
        } else {
            profile = UserProfile()
        }
        completedLessons = Set(defaults.stringArray(forKey: lessonsKey) ?? [])
        market.start()
    }

    private func save() {
        let defaults = UserDefaults.standard
        if let data = try? JSONEncoder().encode(profile) {
            defaults.set(data, forKey: profileKey)
        }
        defaults.set(Array(completedLessons), forKey: lessonsKey)
    }

    /// Springt zu einem Bereich – funktioniert auf iPhone (Tabs) und iPad/Mac (Seitenleiste).
    func open(_ section: AppSection) {
        selectedSection = section
        if AppSection.tabs.contains(section) {
            selectedTab = section
            paths[section] = NavigationPath()
        } else {
            let tab: AppSection = AppSection.labSections.contains(section) ? .labs : .dashboard
            var path = NavigationPath()
            path.append(section)
            paths[tab] = path
            selectedTab = tab
        }
    }

    // MARK: Lernen

    func isCompleted(_ lesson: Lesson) -> Bool {
        completedLessons.contains(lesson.id)
    }

    func complete(_ lesson: Lesson) {
        completedLessons.insert(lesson.id)
    }

    func progress(of course: Course) -> Double {
        guard !course.lessons.isEmpty else { return 0 }
        let done = course.lessons.filter { completedLessons.contains($0.id) }.count
        return Double(done) / Double(course.lessons.count)
    }

    func isCompleted(courseID: String) -> Bool {
        guard let course = CourseLibrary.course(courseID) else { return true }
        return progress(of: course) >= 1
    }

    var totalLearningProgress: Double {
        let all = CourseLibrary.all.flatMap(\.lessons)
        guard !all.isEmpty else { return 0 }
        return Double(all.filter { completedLessons.contains($0.id) }.count) / Double(all.count)
    }

    /// Kurse passend zu Zielen, Werten, Interessen und Erfahrung – sortiert nach Relevanz.
    var recommendedCourses: [Course] {
        CourseLibrary.all
            .map { ($0, relevance(of: $0)) }
            .sorted { $0.1 > $1.1 }
            .map { $0.0 }
    }

    func relevance(of course: Course) -> Double {
        var score = 0.0
        if course.area == .basics && profile.experience == .none { score += 3 }
        if course.area == .behavior { score += 1 }
        if let lab = course.relatedLab, profile.interests.contains(lab) { score += 2 }
        score += Double(course.relatedValues.filter { profile.values.contains($0) }.count) * 1.5
        // Krypto-Code-Kurs ist Pflicht, wenn der Nutzer Krypto besitzt oder handeln will
        if course.id == "crypto-code" && profile.interests.contains(.crypto) { score += 2 }
        if progress(of: course) >= 1 { score -= 5 }
        return score
    }

    /// Hinweis, warum ein Kurs empfohlen wird (Transparenz)
    func recommendationReason(for course: Course) -> String? {
        if course.id == "crypto-code" && profile.interests.contains(.crypto) {
            return "Pflicht vor dem Krypto-Handel"
        }
        if let v = course.relatedValues.first(where: { profile.values.contains($0) }) {
            return "Passt zu deinem Wert „\(v.rawValue)“"
        }
        if let lab = course.relatedLab, profile.interests.contains(lab) {
            return "Passt zu deinem Interesse „\(lab.rawValue)“"
        }
        if course.area == .basics { return "Guter Start" }
        return nil
    }
}
