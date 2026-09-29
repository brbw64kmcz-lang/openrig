import SwiftUI

/// Ziele & persönliche Strategie: Wo will ich hin, bin ich auf Kurs, was sind meine Regeln?
struct GoalsView: View {
    @EnvironmentObject private var app: AppState
    @EnvironmentObject private var market: MarketStore
    @EnvironmentObject private var portfolio: PortfolioStore
    @State private var editing: Goal?

    var body: some View {
        Screen(title: "Ziele & Strategie", subtitle: "Dein Plan – verständlich und überprüfbar.") {
            ForEach(app.profile.goals) { goal in
                goalCard(goal)
            }
            Button {
                let year = Calendar.current.component(.year, from: Date())
                let g = Goal(kind: .wealth, targetAmount: 25_000, targetYear: year + 5, monthlyContribution: 150, portfolioShare: 0.1)
                app.profile.goals.append(g)
                editing = g
            } label: {
                Label("Ziel hinzufügen", systemImage: "plus")
            }
            .buttonStyle(SecondaryButtonStyle())
            strategyCard
            rulesCard
            DisclaimerFooter()
        }
        .sheet(item: $editing) { goal in
            GoalEditor(goal: goal) { updated in
                if let i = app.profile.goals.firstIndex(where: { $0.id == updated.id }) {
                    app.profile.goals[i] = updated
                }
            } onDelete: {
                app.profile.goals.removeAll { $0.id == goal.id }
            }
        }
    }

    private var expectedReturn: Double {
        let total = portfolio.totalValue(market: market)
        guard total > 0 else { return 0.04 }
        var weights: [String: Double] = ["cash": portfolio.cash / total]
        for h in portfolio.holdings { weights[h.assetID] = portfolio.value(of: h, market: market) / total }
        return SimulationEngine.portfolioStats(weights: weights, market: market).mu
    }

    private func goalCard(_ goal: Goal) -> some View {
        let year = Calendar.current.component(.year, from: Date())
        let years: Double = Double(max(goal.targetYear - year, 1))
        let current: Double = portfolio.totalValue(market: market) * goal.portfolioShare
        let r = expectedReturn
        let projected = SimulationEngine.futureValue(current: current, monthly: goal.monthlyContribution, years: years, annualReturn: r)
        let needed = SimulationEngine.requiredMonthly(target: goal.targetAmount, current: current, years: years, annualReturn: r)
        let onTrack = projected >= goal.targetAmount
        return Card(title: goal.kind.rawValue, icon: goal.kind.icon, trailing: "bis \(String(goal.targetYear))") {
            GoalProgressRow(goal: goal)
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: onTrack ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
                    .foregroundStyle(onTrack ? Theme.positive : Theme.warning)
                VStack(alignment: .leading, spacing: 4) {
                    Text(onTrack ? "Du bist auf Kurs." : "Du liegst hinter deinem Plan.")
                        .font(.subheadline.bold()).foregroundStyle(Theme.textPrimary)
                    Text("Mit \(Fmt.eur(goal.monthlyContribution)) pro Monat und ca. \(Fmt.pct(r)) Rendite p. a. erreichst du voraussichtlich \(Fmt.eur(projected)).")
                        .font(.caption).foregroundStyle(Theme.textSecondary)
                    if !onTrack {
                        Text("Nötige Sparrate: \(Fmt.eur(needed)) pro Monat – oder mehr Zeit bzw. ein kleineres Ziel.")
                            .font(.caption).foregroundStyle(Theme.warning)
                    }
                }
            }
            Text(pathAdvice(goal)).font(.caption).foregroundStyle(Theme.lavender)
            Button("Bearbeiten") { editing = goal }
                .font(.subheadline.weight(.semibold))
        }
    }

    /// Allgemeine Bildungs-Hinweise – bewusst keine individuelle Anlageempfehlung.
    private func pathAdvice(_ goal: Goal) -> String {
        switch goal.kind {
        case .cashflow: return "Zielpfad: Für regelmäßigen Cashflow sind ertragsstarke Anlagen wie Immobilien-REITs oder Anleihen typisch. Lerne mehr im Kurs „Immobilien verstehen“."
        case .business: return "Zielpfad: Kapital für eine Gründung sollte zum Stichtag verfügbar sein – je näher der Termin, desto weniger Schwankung ist sinnvoll."
        case .home: return "Zielpfad: Für das Eigenkapital einer Immobilie zählt Sicherheit vor Rendite, besonders in den letzten Jahren vor dem Kauf."
        case .retirement: return "Zielpfad: Lange Zeiträume vertragen mehr Aktien – Zeit gleicht Schwankungen aus."
        case .freedom: return "Zielpfad: Faustregel: Mit dem 25-Fachen deiner Jahresausgaben bist du nahe an finanzieller Unabhängigkeit (4-%-Regel, keine Garantie)."
        case .wealth: return "Zielpfad: Breit streuen, regelmäßig sparen, Kosten niedrig halten – und durchhalten."
        }
    }

    // MARK: Strategie

    private struct Slot: Identifiable {
        var id: String { name }
        let name: String
        let share: Double
    }

    private var suggested: [Slot] {
        switch app.profile.riskTolerance {
        case 1...2:
            return [Slot(name: "Anleihen", share: 0.5), Slot(name: "Aktien & ETFs", share: 0.25),
                    Slot(name: "Cash", share: 0.15), Slot(name: "Rohstoffe", share: 0.1)]
        case 3...5:
            return [Slot(name: "Aktien & ETFs", share: 0.5), Slot(name: "Anleihen", share: 0.2),
                    Slot(name: "Immobilien", share: 0.15), Slot(name: "Rohstoffe", share: 0.1), Slot(name: "Cash", share: 0.05)]
        default:
            return [Slot(name: "Aktien & ETFs", share: 0.6), Slot(name: "Immobilien", share: 0.15),
                    Slot(name: "Krypto", share: 0.1), Slot(name: "Alternative", share: 0.1), Slot(name: "Cash", share: 0.05)]
        }
    }

    private var strategyCard: some View {
        Card(title: "Mein persönliches System", icon: "person.crop.circle.badge.checkmark") {
            Text("Aus deinem Profil (\(app.profile.riskLabel), Werte: \(app.profile.values.map(\.rawValue).sorted().joined(separator: ", "))) ergibt sich diese Beispiel-Aufteilung:")
                .font(.caption).foregroundStyle(Theme.textSecondary)
            ForEach(suggested) { item in
                HStack {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.positive)
                    Text("\(Fmt.pct(item.share, digits: 0)) \(item.name)").foregroundStyle(Theme.textPrimary)
                }
                .font(.subheadline)
            }
            if app.profile.values.contains(.sustainability) {
                Text("Nachhaltigkeitsfilter aktiv: Bevorzuge ESG-Varianten (z. B. Clean-Energy, Green Bonds, Infrastruktur).")
                    .font(.caption).foregroundStyle(Theme.lavender)
            }
            Button("Im Simulator testen") { app.open(.simulator) }
                .buttonStyle(PrimaryButtonStyle())
            Text("Dies ist ein Lernbeispiel, keine Anlageberatung.").font(.caption2).foregroundStyle(Theme.textTertiary)
        }
    }

    private var rulesCard: some View {
        Card(title: "Meine Regeln", icon: "list.bullet.clipboard") {
            rule("Ich investiere nur Geld, das ich mindestens 5 Jahre nicht brauche.")
            rule("Ich halte 3 Monatsausgaben als Notgroschen auf dem Tagesgeld.")
            rule("Ich prüfe einmal im Jahr die Aufteilung (Rebalancing) – nicht täglich.")
            rule("Ich kaufe nichts, was ich nicht in zwei Sätzen erklären kann.")
            rule("Bei Krypto: maximal \(app.profile.riskTolerance >= 6 ? 10 : 5) % meines Vermögens.")
        }
    }

    private func rule(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "checkmark.square.fill").foregroundStyle(Theme.blue)
            Text(text).font(.subheadline).foregroundStyle(Theme.textPrimary)
        }
    }
}

struct GoalEditor: View {
    @Environment(\.dismiss) private var dismiss
    @State var goal: Goal
    let onSave: (Goal) -> Void
    let onDelete: () -> Void

    init(goal: Goal, onSave: @escaping (Goal) -> Void, onDelete: @escaping () -> Void) {
        _goal = State(initialValue: goal)
        self.onSave = onSave
        self.onDelete = onDelete
    }

    private var yearBinding: Binding<Double> {
        Binding(get: { Double(goal.targetYear) }, set: { goal.targetYear = Int($0) })
    }

    var body: some View {
        let now = Double(Calendar.current.component(.year, from: Date()))
        NavigationStack {
            Form {
                Picker("Art", selection: $goal.kind) {
                    ForEach(GoalKind.allCases) { Label($0.rawValue, systemImage: $0.icon).tag($0) }
                }
                LabeledSlider(title: "Zielbetrag", value: $goal.targetAmount, range: 1_000...2_000_000, step: 1_000) { Fmt.eur($0) }
                LabeledSlider(title: "Zieljahr", value: yearBinding, range: (now + 1)...(now + 50), step: 1) { String(Int($0)) }
                LabeledSlider(title: "Sparrate pro Monat", value: $goal.monthlyContribution, range: 0...5_000, step: 25) { Fmt.eur($0) }
                LabeledSlider(title: "Anteil des Depots für dieses Ziel", value: $goal.portfolioShare, range: 0...1, step: 0.05) { Fmt.pct($0, digits: 0) }
                Section {
                    Button("Ziel löschen", role: .destructive) {
                        onDelete()
                        dismiss()
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Ziel bearbeiten")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Sichern") {
                        onSave(goal)
                        dismiss()
                    }
                }
            }
        }
    }
}
