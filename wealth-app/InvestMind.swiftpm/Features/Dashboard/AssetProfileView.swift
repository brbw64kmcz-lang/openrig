import SwiftUI

/// Suche über alle Assets, gefiltert nach Klasse
struct SearchView: View {
    @EnvironmentObject private var market: MarketStore
    @State private var query = ""
    @State private var filter: AssetClass? = nil

    var body: some View {
        List {
            Section {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        chip(nil, "Alle")
                        ForEach(AssetClass.allCases) { chip($0, $0.rawValue) }
                    }
                }
                .listRowBackground(Color.clear)
            }
            ForEach(results) { a in
                NavigationLink(value: AssetRoute(id: a.id)) {
                    AssetRow(asset: a)
                }
                .listRowBackground(Theme.card)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.background.ignoresSafeArea())
        .searchable(text: $query, prompt: "Asset, Symbol oder Thema")
        .navigationTitle("Suche")
    }

    private var results: [Asset] {
        market.search(query).filter { filter == nil || $0.assetClass == filter }
    }

    private func chip(_ cls: AssetClass?, _ label: String) -> some View {
        let on = filter == cls
        return Button { filter = cls } label: {
            Text(label)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 12).padding(.vertical, 6)
                .foregroundStyle(on ? Color.white : Theme.textSecondary)
                .background(Capsule().fill(on ? Theme.purple : Theme.cardRaised))
        }
        .buttonStyle(.plain)
    }
}

/// Profil eines Assets: alle Daten, Rechenwege, Werte-Passung und Nachrichten an einem Ort.
struct AssetProfileView: View {
    @EnvironmentObject private var app: AppState
    @EnvironmentObject private var market: MarketStore
    @EnvironmentObject private var portfolio: PortfolioStore
    let assetID: String
    @State private var range: ChartRange = .year
    @State private var showTrade = false

    var body: some View {
        if let asset = market.asset(assetID) {
            content(asset)
        } else {
            Text("Asset nicht gefunden").foregroundStyle(Theme.textSecondary)
        }
    }

    private func content(_ asset: Asset) -> some View {
        Screen(title: asset.name, subtitle: "\(asset.symbol) · \(asset.assetClass.rawValue)", badge: .demoData) {
            priceCard(asset)
            matchCard(asset)
            Card(title: "Worum geht es?", icon: "text.book.closed.fill") {
                Text(asset.summary).foregroundStyle(Theme.textPrimary)
                Text(asset.assetClass.plainExplanation).font(.callout).foregroundStyle(Theme.textSecondary)
            }
            figuresCard(asset)
            calculationCard(asset)
            let related = market.news(for: asset.id)
            if !related.isEmpty {
                Card(title: "Nachrichten dazu", icon: "newspaper.fill") {
                    ForEach(related) { NewsRow(item: $0) }
                }
            }
            actions(asset)
            DisclaimerFooter()
        }
        .sheet(isPresented: $showTrade) {
            TradeSheet(asset: asset)
                .environmentObject(app)
                .environmentObject(market)
                .environmentObject(portfolio)
        }
    }

    private func priceCard(_ asset: Asset) -> some View {
        let points = range.slice(asset.history)
        let first: Double = points.first?.value ?? asset.price
        let rangeChange: Double = first > 0 ? asset.price / first - 1.0 : 0.0
        return Card {
            HStack(alignment: .firstTextBaseline) {
                Text(Fmt.num(asset.price, digits: 2) + " €")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(Theme.textPrimary)
                ChangeLabel(value: asset.dayChange, suffix: "heute")
                Spacer()
            }
            LineAreaChart(points: points, color: asset.assetClass.color, height: 200)
            HStack {
                PillPicker(options: ChartRange.allCases, selection: $range) { $0.rawValue }
                Spacer()
                ChangeLabel(value: rangeChange, suffix: range.rawValue)
            }
            if let h = portfolio.holding(asset.id) {
                Divider().overlay(Theme.cardBorder)
                KeyValueRow(label: "Du besitzt", value: "\(Fmt.num(h.quantity, digits: 4)) · \(Fmt.eur(h.quantity * asset.price))")
                KeyValueRow(label: "Gewinn/Verlust",
                            value: Fmt.pct(asset.price / h.averagePrice - 1.0, sign: true),
                            valueColor: asset.price >= h.averagePrice ? Theme.positive : Theme.negative)
            }
        }
    }

    private func matchCard(_ asset: Asset) -> some View {
        let result = ValueMatchEngine.match(asset: asset, profile: app.profile)
        return Card(title: "Passt das zu dir?", icon: "person.crop.circle.badge.checkmark") {
            HStack(alignment: .center, spacing: 16) {
                ZStack {
                    Circle().stroke(Color.white.opacity(0.1), lineWidth: 10)
                    Circle()
                        .trim(from: 0, to: result.total)
                        .stroke(Theme.accentGradient, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text(Fmt.pct(result.total, digits: 0)).font(.title3.bold()).foregroundStyle(Theme.textPrimary)
                }
                .frame(width: 86, height: 86)
                VStack(alignment: .leading, spacing: 4) {
                    Text(result.verdict).font(.headline).foregroundStyle(Theme.textPrimary)
                    Text("Risiko: Klasse \(asset.riskClass) – dein Profil: \(app.profile.riskTolerance)")
                        .font(.caption).foregroundStyle(Theme.textSecondary)
                    Text("Risikopassung \(Fmt.pct(result.riskFit, digits: 0))")
                        .font(.caption).foregroundStyle(Theme.textTertiary)
                }
            }
            ForEach(result.parts) { part in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Label(part.value.rawValue, systemImage: part.value.icon).font(.subheadline)
                        Spacer()
                        Text(Fmt.pct(part.score, digits: 0)).font(.subheadline.bold())
                    }
                    .foregroundStyle(Theme.textPrimary)
                    ProgressBar(value: part.score, height: 6)
                    if let reason = part.reason {
                        Text(reason).font(.caption).foregroundStyle(Theme.textSecondary)
                    }
                }
            }
            InfoHint(text: "Passung = 80 % Durchschnitt deiner gewählten Werte + 20 % Passung zur Risikobereitschaft. Die Punktzahlen sind in dieser Version Beispielwerte.")
        }
    }

    private func figuresCard(_ asset: Asset) -> some View {
        Card(title: "Kennzahlen", icon: "list.number") {
            ForEach(asset.keyFigures) { f in
                VStack(alignment: .leading, spacing: 2) {
                    KeyValueRow(label: f.label, value: f.value)
                    if app.profile.simpleMode {
                        Text(f.explanation).font(.caption).foregroundStyle(Theme.textTertiary)
                    }
                }
            }
            if !app.profile.simpleMode {
                InfoHint(text: asset.keyFigures.map { "\($0.label): \($0.explanation)" }.joined(separator: "\n\n"))
            }
        }
    }

    private func calculationCard(_ asset: Asset) -> some View {
        Card(title: "Rechenweg", icon: "function") {
            ForEach(Array(asset.calculation.enumerated()), id: \.offset) { idx, step in
                HStack(alignment: .top, spacing: 10) {
                    Text("\(idx + 1)")
                        .font(.caption.bold())
                        .frame(width: 22, height: 22)
                        .background(Circle().fill(Theme.cardRaised))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.title).font(.subheadline).foregroundStyle(Theme.textPrimary)
                        Text(step.formula).font(.caption.monospaced()).foregroundStyle(Theme.textTertiary)
                    }
                    Spacer()
                    Text(step.result).font(.subheadline.bold()).foregroundStyle(Theme.lavender)
                }
                .foregroundStyle(Theme.textPrimary)
            }
        }
    }

    private func actions(_ asset: Asset) -> some View {
        VStack(spacing: 10) {
            Button {
                showTrade = true
            } label: {
                Label("Kaufen / Verkaufen (Depot)", systemImage: "eurosign.circle")
            }
            .buttonStyle(PrimaryButtonStyle())
            Button {
                app.simulatorPresetAssetID = asset.id
                app.open(.simulator)
            } label: {
                Label("Im Simulator testen – ohne Risiko", systemImage: "flask")
            }
            .buttonStyle(SecondaryButtonStyle())
        }
    }
}

/// Kauf-/Verkaufsmaske mit Schutzmechanismen:
/// Lernpflicht bei Krypto, Warnung bei zu hohem Risiko, klare Kennzeichnung Echtgeld/Demo.
struct TradeSheet: View {
    @EnvironmentObject private var app: AppState
    @EnvironmentObject private var market: MarketStore
    @EnvironmentObject private var portfolio: PortfolioStore
    @Environment(\.dismiss) private var dismiss
    let asset: Asset

    @State private var isBuy = true
    @State private var amount: Double = 500
    @State private var riskConfirmed = false
    @State private var message: String?

    private var courseMissing: Bool {
        guard isBuy, let course = asset.requiredCourseID else { return false }
        return !app.isCompleted(courseID: course)
    }

    private var riskTooHigh: Bool {
        isBuy && asset.riskClass > app.profile.riskTolerance + 1
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        ModeBadge(kind: portfolio.connection == .demo ? .demoData : .real)
                        Text(portfolio.connection.label).font(.caption).foregroundStyle(Theme.textSecondary)
                    }
                    Picker("Aktion", selection: $isBuy) {
                        Text("Kaufen").tag(true)
                        Text("Verkaufen").tag(false)
                    }
                    .pickerStyle(.segmented)
                }
                Section("Betrag") {
                    LabeledSlider(title: isBuy ? "Kaufen für" : "Verkaufen für", value: $amount,
                                  range: 50...max(maxAmount, 100), step: 50) { Fmt.eur($0) }
                    KeyValueRow(label: "Kurs", value: Fmt.num(asset.price, digits: 2) + " €")
                    KeyValueRow(label: "Stückzahl", value: Fmt.num(amount / asset.price, digits: 5))
                    KeyValueRow(label: "Verfügbar", value: Fmt.eur(maxAmount))
                }
                if courseMissing, let id = asset.requiredCourseID, let course = CourseLibrary.course(id) {
                    Section {
                        Label("Erst verstehen, dann handeln", systemImage: "lock.fill").font(.headline)
                        Text(BrokerError.courseRequired(courseID: id).errorDescription ?? "")
                            .font(.callout)
                        Button("Kurs „\(course.title)“ öffnen") {
                            dismiss()
                            app.open(.learn)
                        }
                    }
                }
                if riskTooHigh && !courseMissing {
                    Section {
                        Label("Höheres Risiko als dein Profil", systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(Theme.warning)
                        Text("Dieses Asset hat Risikoklasse \(asset.riskClass), dein Profil \(app.profile.riskTolerance). Starke Verluste sind möglich.")
                            .font(.callout)
                        Toggle("Ich habe das verstanden", isOn: $riskConfirmed)
                    }
                }
                if let message {
                    Section { Text(message).foregroundStyle(Theme.warning) }
                }
                Section {
                    Button(isBuy ? "Kauf ausführen" : "Verkauf ausführen") { execute() }
                        .disabled(courseMissing || (riskTooHigh && !riskConfirmed))
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(asset.name)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Schließen") { dismiss() } }
            }
        }
    }

    private var maxAmount: Double {
        if isBuy { return portfolio.cash }
        let owned: Double = portfolio.holding(asset.id)?.quantity ?? 0.0
        return owned * asset.price
    }

    private func execute() {
        do {
            if isBuy {
                try portfolio.buy(assetID: asset.id, amount: amount, price: asset.price)
            } else {
                let owned: Double = portfolio.holding(asset.id)?.quantity ?? 0.0
                let qty: Double = min(amount / asset.price, owned)
                try portfolio.sell(assetID: asset.id, quantity: qty, price: asset.price)
            }
            dismiss()
        } catch {
            message = error.localizedDescription
        }
    }
}
