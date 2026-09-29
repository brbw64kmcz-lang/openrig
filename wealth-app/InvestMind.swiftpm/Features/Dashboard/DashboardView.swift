import SwiftUI

/// Übersicht: Vermögen, Ziele, Aufteilung, Werte-Check, Märkte, Nachrichten, Lernpfad.
struct DashboardView: View {
    @EnvironmentObject private var app: AppState
    @EnvironmentObject private var market: MarketStore
    @EnvironmentObject private var portfolio: PortfolioStore
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var range: ChartRange = .year

    var body: some View {
        Screen(title: app.profile.name.isEmpty ? "Hallo!" : "Hallo \(app.profile.name)",
               subtitle: "Dein Vermögen. Deine Ziele. Deine Möglichkeiten.") {
            searchBar
            kpis
            if sizeClass == .regular {
                HStack(alignment: .top, spacing: Theme.spacing) {
                    VStack(spacing: Theme.spacing) { performance; allocation }
                    VStack(spacing: Theme.spacing) { goals; valueCheck; recommended }
                        .frame(maxWidth: 380)
                }
            } else {
                performance
                goals
                allocation
                valueCheck
                recommended
            }
            discover
            markets
            newsCard
            learningCycle
            DisclaimerFooter()
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button { app.open(.goals) } label: { Label("Ziele & Strategie", systemImage: "target") }
                    Button { app.open(.assistant) } label: { Label("KI-Assistent", systemImage: "sparkles") }
                    Button { app.open(.settings) } label: { Label("Einstellungen", systemImage: "gearshape") }
                } label: {
                    Image(systemName: "person.crop.circle.fill").font(.title2)
                }
            }
        }
    }

    // MARK: Suche

    private var searchBar: some View {
        NavigationLink {
            SearchView()
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                Text("Suche nach Assets, Themen, Fragen …")
                Spacer()
            }
            .font(.subheadline)
            .foregroundStyle(Theme.textSecondary)
            .padding(12)
            .background(RoundedRectangle(cornerRadius: 12).fill(Theme.card))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.cardBorder))
        }
        .buttonStyle(.plain)
    }

    // MARK: Kennzahlen

    private var kpis: some View {
        let total = portfolio.totalValue(market: market)
        let history = portfolio.history(market: market)
        let monthAgo: Double = history.count > 30 ? history[history.count - 31].value : total
        let yearStart: Double = history.first?.value ?? total
        let monthChange: Double = monthAgo > 0 ? total / monthAgo - 1.0 : 0.0
        let yearChange: Double = yearStart > 0 ? total / yearStart - 1.0 : 0.0
        let columns = [GridItem(.adaptive(minimum: 150), spacing: 12)]
        return LazyVGrid(columns: columns, spacing: 12) {
            StatTile(title: "Gesamtvermögen", value: Fmt.eur(total), change: monthChange)
            StatTile(title: "Monatlicher Cashflow", value: Fmt.eur(portfolio.monthlyIncome(market: market)),
                     caption: "Mieten, Dividenden, Zinsen")
            StatTile(title: "Rendite (12 Monate)", value: Fmt.pct(yearChange, sign: true),
                     caption: "ohne Einzahlungen")
            StatTile(title: "Risiko (Portfolio)", value: Fmt.num(portfolio.riskScore(market: market), digits: 1) + " / 7",
                     caption: riskCaption)
        }
    }

    private var riskCaption: String {
        let r = portfolio.riskScore(market: market)
        let diff = r - Double(app.profile.riskTolerance)
        if diff > 1 { return "höher als dein Profil" }
        if diff < -1.5 { return "vorsichtiger als dein Profil" }
        return "passt zu deinem Profil"
    }

    // MARK: Wertentwicklung

    private var performance: some View {
        let points = range.slice(portfolio.history(market: market))
        let firstValue: Double = points.first?.value ?? 0.0
        let lastValue: Double = points.last?.value ?? 0.0
        let change: Double = firstValue > 0 ? lastValue / firstValue - 1.0 : 0.0
        return Card(title: "Deine Performance", icon: "chart.bar.xaxis") {
            HStack {
                ChangeLabel(value: change, suffix: "(\(range.rawValue))")
                Spacer()
                if market.isLive {
                    Label("Live", systemImage: "dot.radiowaves.left.and.right")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Theme.positive)
                }
            }
            LineAreaChart(points: points)
            PillPicker(options: ChartRange.allCases, selection: $range) { $0.rawValue }
        }
    }

    // MARK: Aufteilung

    private var allocation: some View {
        Card(title: "Portfolio-Verteilung", icon: "chart.pie.fill") {
            AllocationDonut(slices: portfolio.allocation(market: market), total: portfolio.totalValue(market: market))
            InfoHint(text: "Die Verteilung zeigt, wie dein Geld auf Assetklassen aufgeteilt ist. Je breiter gestreut, desto weniger hängt dein Vermögen von einer einzelnen Entwicklung ab.")
        }
    }

    // MARK: Ziele

    private var goals: some View {
        Card(title: "Deine Ziele", icon: "target") {
            if app.profile.goals.isEmpty {
                Text("Noch keine Ziele festgelegt.").foregroundStyle(Theme.textSecondary)
            }
            ForEach(app.profile.goals.prefix(3)) { goal in
                GoalProgressRow(goal: goal)
            }
            Button("Ziele bearbeiten") { app.open(.goals) }
                .buttonStyle(SecondaryButtonStyle())
        }
    }

    // MARK: Werte-Check

    private var valueCheck: some View {
        Card(title: "Passt dein Depot zu dir?", icon: "leaf.fill") {
            let values = app.profile.values.isEmpty ? [InvestValue.sustainability] : InvestValue.allCases.filter { app.profile.values.contains($0) }
            ForEach(values) { v in
                let score = ValueMatchEngine.portfolioScore(for: v, portfolio: portfolio, market: market)
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Label(v.rawValue, systemImage: v.icon).font(.subheadline)
                        Spacer()
                        Text(Fmt.pct(score, digits: 0)).font(.subheadline.bold())
                    }
                    .foregroundStyle(Theme.textPrimary)
                    ProgressBar(value: score)
                }
            }
            InfoHint(text: "Wir gewichten jede Anlage mit ihrem Anteil am Depot und ihrer Punktzahl für den jeweiligen Wert. Tippe auf ein Asset, um die Begründung zu sehen.")
        }
    }

    // MARK: Empfehlung

    @ViewBuilder
    private var recommended: some View {
        if let course = app.recommendedCourses.first {
            Card(title: "Empfohlen für dich", icon: "sparkles") {
                NavigationLink(value: course) {
                    HStack(spacing: 12) {
                        IconBubble(systemName: course.icon, color: Theme.purple)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(course.title).font(.subheadline.bold()).foregroundStyle(Theme.textPrimary)
                            if let reason = app.recommendationReason(for: course) {
                                Text(reason).font(.caption).foregroundStyle(Theme.lavender)
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.right").foregroundStyle(Theme.textTertiary)
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: Bereiche entdecken

    private var discover: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Labore entdecken").font(.title3.bold()).foregroundStyle(Theme.textPrimary)
            Text("Lerne die Grundlagen, verstehe Zusammenhänge und probiere es selbst aus.")
                .font(.subheadline).foregroundStyle(Theme.textSecondary)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 12)], spacing: 12) {
                labCard(.crypto, section: .cryptoLab, color: Theme.sky)
                labCard(.realEstate, section: .realEstateLab, color: Theme.purple)
                labCard(.strategy, section: .strategyLab, color: Theme.blue)
            }
        }
    }

    private func labCard(_ lab: LabArea, section: AppSection, color: Color) -> some View {
        Button { app.open(section) } label: {
            VStack(alignment: .leading, spacing: 10) {
                IconBubble(systemName: lab.icon, color: color, size: 44)
                Text(lab.rawValue).font(.headline).foregroundStyle(Theme.textPrimary)
                Text(lab.tagline).font(.caption).foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                HStack {
                    Text("Zum Labor").font(.caption.bold())
                    Image(systemName: "arrow.right")
                }
                .foregroundStyle(color)
            }
            .padding(16)
            .frame(maxWidth: .infinity, minHeight: 170, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: Theme.corner)
                    .fill(LinearGradient(colors: [color.opacity(0.25), Theme.card], startPoint: .topLeading, endPoint: .bottomTrailing))
            )
            .overlay(RoundedRectangle(cornerRadius: Theme.corner).stroke(Theme.cardBorder))
        }
        .buttonStyle(.plain)
    }

    // MARK: Märkte

    private var markets: some View {
        Card(title: "Charts & Daten", icon: "chart.xyaxis.line", trailing: "Demodaten") {
            ForEach(["world-etf", "btc", "gold", "reit-res", "oil", "clean"], id: \.self) { id in
                if let a = market.asset(id) {
                    NavigationLink(value: AssetRoute(id: a.id)) {
                        AssetRow(asset: a)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: Nachrichten

    private var newsCard: some View {
        Card(title: "Top News", icon: "newspaper.fill") {
            ForEach(market.news.prefix(4)) { item in
                NewsRow(item: item)
                if item.id != market.news.prefix(4).last?.id {
                    Divider().overlay(Theme.cardBorder)
                }
            }
        }
    }

    // MARK: Lernkreislauf

    private var learningCycle: some View {
        let steps = ["Verstehen", "Ausprobieren", "Simulieren", "Analysieren", "Strategie", "Umsetzen"]
        return Card(title: "Lernkreislauf", icon: "arrow.triangle.2.circlepath") {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(steps.enumerated()), id: \.offset) { idx, step in
                        HStack(spacing: 6) {
                            Text("\(idx + 1)")
                                .font(.caption.bold())
                                .frame(width: 22, height: 22)
                                .background(Circle().fill(Theme.accentGradient))
                            Text(step).font(.subheadline)
                            if idx < steps.count - 1 {
                                Image(systemName: "arrow.right").font(.caption).foregroundStyle(Theme.textTertiary)
                            }
                        }
                        .foregroundStyle(Theme.textPrimary)
                    }
                }
            }
            Text("„Du musst nicht alles wissen. Nur den nächsten Schritt gehen.“")
                .font(.caption.italic()).foregroundStyle(Theme.textTertiary)
        }
    }
}

// MARK: - Bausteine

struct AssetRow: View {
    let asset: Asset

    var body: some View {
        HStack(spacing: 12) {
            IconBubble(systemName: asset.assetClass.icon, color: asset.assetClass.color, size: 34)
            VStack(alignment: .leading, spacing: 2) {
                Text(asset.name).font(.subheadline.weight(.medium)).foregroundStyle(Theme.textPrimary)
                Text(asset.symbol).font(.caption).foregroundStyle(Theme.textTertiary)
            }
            Spacer()
            Sparkline(points: ChartRange.month.slice(asset.history), color: asset.dayChange >= 0 ? Theme.positive : Theme.negative)
            VStack(alignment: .trailing, spacing: 2) {
                Text(Fmt.num(asset.price, digits: asset.price < 10 ? 3 : 2) + " €")
                    .font(.subheadline.monospacedDigit()).foregroundStyle(Theme.textPrimary)
                ChangeLabel(value: asset.dayChange)
            }
            .frame(minWidth: 90, alignment: .trailing)
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }
}

struct NewsRow: View {
    let item: NewsItem
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button {
                withAnimation { expanded.toggle() }
            } label: {
                HStack(alignment: .top) {
                    Circle()
                        .fill(color)
                        .frame(width: 8, height: 8)
                        .padding(.top, 6)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.title).font(.subheadline.weight(.medium)).foregroundStyle(Theme.textPrimary)
                            .multilineTextAlignment(.leading)
                        Text("\(item.source) · vor \(item.hoursAgo) Std.").font(.caption2).foregroundStyle(Theme.textTertiary)
                    }
                    Spacer()
                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .font(.caption).foregroundStyle(Theme.textTertiary)
                }
            }
            .buttonStyle(.plain)
            if expanded {
                Text(item.summary).font(.callout).foregroundStyle(Theme.textSecondary)
                VStack(alignment: .leading, spacing: 4) {
                    Label("Was bedeutet das für mich?", systemImage: "lightbulb.fill")
                        .font(.caption.bold()).foregroundStyle(Theme.lavender)
                    Text(item.whatItMeans).font(.callout).foregroundStyle(Theme.textPrimary)
                }
                .padding(10)
                .background(RoundedRectangle(cornerRadius: 10).fill(Theme.cardRaised.opacity(0.6)))
            }
        }
    }

    private var color: Color {
        switch item.sentiment {
        case .positive: return Theme.positive
        case .neutral: return Theme.lavender
        case .negative: return Theme.negative
        }
    }
}

struct GoalProgressRow: View {
    @EnvironmentObject private var market: MarketStore
    @EnvironmentObject private var portfolio: PortfolioStore
    let goal: Goal

    var body: some View {
        let current: Double = portfolio.totalValue(market: market) * goal.portfolioShare
        let progress: Double = goal.targetAmount > 0 ? current / goal.targetAmount : 0.0
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: progress >= 1 ? "checkmark.circle.fill" : goal.kind.icon)
                    .foregroundStyle(progress >= 1 ? Theme.positive : Theme.lavender)
                Text(goal.kind.rawValue).font(.subheadline).foregroundStyle(Theme.textPrimary)
                Spacer()
                Text(Fmt.pct(min(progress, 1), digits: 0)).font(.subheadline.bold()).foregroundStyle(Theme.textPrimary)
            }
            ProgressBar(value: progress)
            Text("\(Fmt.eur(current)) von \(Fmt.eur(goal.targetAmount)) · bis \(String(goal.targetYear))")
                .font(.caption).foregroundStyle(Theme.textTertiary)
        }
    }
}
