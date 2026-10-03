import SwiftUI

/// Einstieg: zuerst Onboarding, danach die App.
/// iPhone: Reiterleiste unten. iPad & Mac: Seitenleiste wie im Desktop-Entwurf.
struct RootView: View {
    @EnvironmentObject private var app: AppState
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        Group {
            if !app.profile.onboardingDone {
                OnboardingView()
            } else if sizeClass == .regular {
                SidebarLayout()
            } else {
                TabLayout()
            }
        }
        .background(Theme.background.ignoresSafeArea())
    }
}

/// Liefert die Ansicht zu einem Bereich (eine Stelle für alle Layouts).
struct SectionDestination: View {
    let section: AppSection

    var body: some View {
        switch section {
        case .dashboard: DashboardView()
        case .portfolio: PortfolioView()
        case .simulator: SimulatorView()
        case .learn: LearnView()
        case .labs: LabsHubView()
        case .cryptoLab: CryptoLabView()
        case .realEstateLab: RealEstateLabView()
        case .strategyLab: StrategyLabView()
        case .goals: GoalsView()
        case .assistant: AssistantView()
        case .settings: SettingsView()
        }
    }
}

// MARK: - iPhone

struct TabLayout: View {
    @EnvironmentObject private var app: AppState

    var body: some View {
        TabView(selection: $app.selectedTab) {
            ForEach(visibleTabs) { section in
                NavigationStack(path: path(for: section)) {
                    SectionDestination(section: section)
                        .withAppDestinations()
                }
                .tabItem { Label(section.title, systemImage: section.icon) }
                .tag(section)
            }
        }
    }

    private func path(for section: AppSection) -> Binding<NavigationPath> {
        Binding(get: { app.paths[section] ?? NavigationPath() },
                set: { app.paths[section] = $0 })
    }

    /// Im einfachen Modus werden die Labore ausgeblendet (über Einstellungen wieder einblendbar).
    private var visibleTabs: [AppSection] {
        app.profile.simpleMode ? AppSection.tabs.filter { $0 != .labs } : AppSection.tabs
    }
}

// MARK: - iPad / Mac

struct SidebarLayout: View {
    @EnvironmentObject private var app: AppState

    private struct SidebarGroup: Identifiable {
        var id: String { title }
        let title: String
        let sections: [AppSection]
    }

    private let groups: [SidebarGroup] = [
        SidebarGroup(title: "Start", sections: [.dashboard, .portfolio, .goals]),
        SidebarGroup(title: "Ausprobieren", sections: [.simulator, .learn]),
        SidebarGroup(title: "Labore", sections: [.cryptoLab, .realEstateLab, .strategyLab]),
        SidebarGroup(title: "Hilfe", sections: [.assistant, .settings]),
    ]

    var body: some View {
        NavigationSplitView {
            List(selection: $app.selectedSection) {
                brandHeader
                ForEach(groups) { group in
                    Section(group.title) {
                        ForEach(group.sections) { section in
                            NavigationLink(value: section) {
                                sidebarRow(section)
                            }
                        }
                    }
                }
                learningFooter
            }
            .scrollContentBackground(.hidden)
            .background(Theme.bgTop)
            .navigationTitle(Brand.name)
        } detail: {
            NavigationStack {
                SectionDestination(section: app.selectedSection ?? .dashboard)
                    .withAppDestinations()
            }
            .id(app.selectedSection)
        }
    }

    private func sidebarRow(_ section: AppSection) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Label(section.title, systemImage: section.icon)
                .foregroundStyle(Theme.textPrimary)
            if app.profile.simpleMode {
                Text(section.plainDescription)
                    .font(.caption)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .padding(.vertical, 2)
    }

    private var brandHeader: some View {
        HStack(spacing: 10) {
            Image(systemName: "chart.line.uptrend.xyaxis.circle.fill")
                .font(.largeTitle)
                .foregroundStyle(Theme.accentGradient)
            VStack(alignment: .leading) {
                Text(Brand.name).font(.title3.bold()).foregroundStyle(Theme.textPrimary)
                Text(Brand.claim).font(.caption2).foregroundStyle(Theme.textSecondary)
            }
        }
        .listRowBackground(Color.clear)
        .padding(.vertical, 6)
    }

    private var learningFooter: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Dein Lernfortschritt").font(.caption).foregroundStyle(Theme.textSecondary)
            ProgressBar(value: app.totalLearningProgress)
            Text("„Nicht was du kaufst, ist entscheidend, sondern was du verstehst.“")
                .font(.caption.italic())
                .foregroundStyle(Theme.textTertiary)
        }
        .listRowBackground(Color.clear)
        .padding(.top, 12)
    }
}

// MARK: - Gemeinsame Navigationsziele

extension View {
    /// Registriert Ziele, die von überall erreichbar sind (Asset-Profil, Kurse, Bereiche).
    func withAppDestinations() -> some View {
        self
            .navigationDestination(for: AssetRoute.self) { route in
                AssetProfileView(assetID: route.id)
            }
            .navigationDestination(for: Course.self) { course in
                CourseView(course: course)
            }
            .navigationDestination(for: AppSection.self) { section in
                SectionDestination(section: section)
            }
    }
}
