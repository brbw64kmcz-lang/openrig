import SwiftUI
import Charts

/// Simulator: "Was passiert in X Jahren, wenn ich Y € in Z anlege?"
/// Komplett getrennt vom Depot – hier wird nie echtes Geld bewegt.
struct SimulatorView: View {
    @EnvironmentObject private var app: AppState
    @EnvironmentObject private var market: MarketStore
    @State private var input = SimulationEngine.Input()
    @State private var result: SimulationEngine.Result?
    @State private var crashTest = false
    @State private var showMethod = false

    private enum Preset: String, CaseIterable, Identifiable {
        case careful = "Vorsichtig", balanced = "Ausgewogen", growth = "Chancenorientiert", green = "Nachhaltig"
        var id: String { rawValue }
        var weights: [String: Double] {
            switch self {
            case .careful: return ["gov-bond": 0.4, "world-etf": 0.3, "cash": 0.2, "gold": 0.1]
            case .balanced: return ["world-etf": 0.6, "green-bond": 0.2, "reit-res": 0.1, "gold": 0.1]
            case .growth: return ["world-etf": 0.5, "usa500": 0.2, "btc": 0.1, "clean": 0.1, "pe": 0.1]
            case .green: return ["clean": 0.25, "green-bond": 0.3, "infra": 0.25, "world-etf": 0.2]
            }
        }
    }

    var body: some View {
        Screen(title: "Simulator", subtitle: "Probiere Strategien aus. Verstehe Risiken. Entscheide besser.", badge: .simulation) {
            presets
            parameters
            allocationEditor
            scenario
            Button {
                runSimulation()
            } label: {
                Label("Simulation starten", systemImage: "play.fill")
            }
            .buttonStyle(PrimaryButtonStyle())
            if let result {
                resultChart(result)
                resultTiles(result)
                valueFit
            }
            methodCard
            DisclaimerFooter()
        }
        .onAppear {
            if let id = app.simulatorPresetAssetID {
                input.weights = [id: 1.0]
                app.simulatorPresetAssetID = nil
            }
            runSimulation()
        }
    }

    // MARK: Eingaben

    private var presets: some View {
        Card(title: "Schnellstart", icon: "wand.and.stars") {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Preset.allCases) { p in
                        Button(p.rawValue) {
                            input.weights = p.weights
                            runSimulation()
                        }
                        .buttonStyle(SecondaryButtonStyle())
                        .fixedSize()
                    }
                }
            }
        }
    }

    private var parameters: some View {
        Card(title: "Deine Annahmen", icon: "slider.horizontal.3") {
            LabeledSlider(title: "Startkapital", value: $input.initial, range: 0...200_000, step: 500) { Fmt.eur($0) }
            LabeledSlider(title: "Monatliche Sparrate", value: $input.monthly, range: 0...3_000, step: 25) { Fmt.eur($0) }
            LabeledSlider(title: "Laufzeit", value: yearsBinding, range: 1...40, step: 1) { "\(Int($0)) Jahre" }
        }
    }

    private var yearsBinding: Binding<Double> {
        Binding(get: { Double(input.years) }, set: { input.years = Int($0) })
    }

    private var totalWeight: Double { input.weights.values.reduce(0, +) }

    private var allocationEditor: some View {
        Card(title: "Aufteilung", icon: "chart.pie", trailing: "Summe \(Fmt.pct(totalWeight, digits: 0)) → wird auf 100 % normiert") {
            ForEach(input.weights.keys.sorted(), id: \.self) { id in
                if let a = market.asset(id) {
                    HStack {
                        Circle().fill(a.assetClass.color).frame(width: 10, height: 10)
                        Text(a.name).font(.subheadline).foregroundStyle(Theme.textPrimary)
                        Spacer()
                        Text(Fmt.pct(share(of: id), digits: 0))
                            .font(.subheadline.monospacedDigit()).foregroundStyle(Theme.textSecondary)
                            .frame(width: 50, alignment: .trailing)
                        Stepper("", onIncrement: { adjust(id, by: 0.05) }, onDecrement: { adjust(id, by: -0.05) })
                            .labelsHidden()
                    }
                }
            }
            Menu {
                ForEach(market.assets.filter { input.weights[$0.id] == nil }) { a in
                    Button(a.name) { input.weights[a.id] = 0.1 }
                }
            } label: {
                Label("Asset hinzufügen", systemImage: "plus.circle.fill").font(.subheadline.weight(.semibold))
            }
        }
    }

    private func share(of id: String) -> Double {
        let weight: Double = input.weights[id] ?? 0.0
        return weight / max(totalWeight, 0.0001)
    }

    private func adjust(_ id: String, by delta: Double) {
        let current: Double = input.weights[id] ?? 0.0
        let v: Double = current + delta
        if v <= 0.001 {
            input.weights[id] = nil
        } else {
            input.weights[id] = min(v, 1)
        }
    }

    private var scenario: some View {
        Card(title: "Szenarien", icon: "cloud.bolt.fill") {
            Toggle("Inflation berücksichtigen (2 % p. a.)", isOn: $input.showReal).tint(Theme.purple)
            Toggle("Crash-Test: Einbruch um 30 %", isOn: $crashTest)
                .tint(Theme.purple)
                .onChange(of: crashTest) { _, on in
                    input.crashYear = on ? max(1, input.years / 2) : nil
                }
            if crashTest {
                LabeledSlider(title: "Crash im Jahr", value: crashYearBinding, range: 1...Double(max(input.years, 2)), step: 1) { "Jahr \(Int($0))" }
            }
            InfoHint(text: "Mit „Inflation“ siehst du, was dein Geld in heutiger Kaufkraft wert wäre. Der Crash-Test zeigt, ob du einen großen Einbruch durchhalten würdest – der wichtigste Test für jede Strategie.")
        }
    }

    private var crashYearBinding: Binding<Double> {
        Binding(get: { Double(input.crashYear ?? 1) }, set: { input.crashYear = Int($0) })
    }

    private func runSimulation() {
        guard !input.weights.isEmpty else { result = nil; return }
        result = SimulationEngine.run(input, market: market)
    }

    // MARK: Ergebnis

    private func resultChart(_ r: SimulationEngine.Result) -> some View {
        Card(title: "Mögliche Entwicklung", icon: "chart.xyaxis.line") {
            Chart {
                ForEach(r.points) { p in
                    AreaMark(x: .value("Jahr", p.year),
                             yStart: .value("Schlecht", p.p10),
                             yEnd: .value("Gut", p.p90))
                        .foregroundStyle(Theme.purple.opacity(0.25))
                }
                ForEach(r.points) { p in
                    LineMark(x: .value("Jahr", p.year), y: .value("Wert", p.p50), series: .value("Reihe", "Mittel"))
                        .foregroundStyle(Theme.blue)
                        .lineStyle(StrokeStyle(lineWidth: 2.5))
                }
                ForEach(r.points) { p in
                    LineMark(x: .value("Jahr", p.year), y: .value("Wert", p.invested), series: .value("Reihe", "Eingezahlt"))
                        .foregroundStyle(Theme.gray)
                        .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [5, 4]))
                }
            }
            .chartYAxis {
                AxisMarks { value in
                    AxisGridLine().foregroundStyle(Color.white.opacity(0.08))
                    AxisValueLabel {
                        if let v = value.as(Double.self) { Text(Fmt.compact(v)) }
                    }
                }
            }
            .frame(height: 240)
            HStack(spacing: 14) {
                legendDot(Theme.blue, "Mittleres Szenario")
                legendDot(Theme.purple.opacity(0.5), "Bandbreite (80 %)")
                legendDot(Theme.gray, "Eingezahlt")
            }
            .font(.caption)
        }
    }

    private func legendDot(_ c: Color, _ t: String) -> some View {
        HStack(spacing: 4) {
            Circle().fill(c).frame(width: 8, height: 8)
            Text(t).foregroundStyle(Theme.textSecondary)
        }
    }

    private func resultTiles(_ r: SimulationEngine.Result) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
            StatTile(title: "Endwert (mittel)", value: Fmt.eur(r.finalP50), caption: "nach \(input.years) Jahren")
            StatTile(title: "Schlechtes Szenario", value: Fmt.eur(r.finalP10), caption: "9 von 10 Fällen besser")
            StatTile(title: "Gutes Szenario", value: Fmt.eur(r.finalP90), caption: "nur 1 von 10 Fällen besser")
            StatTile(title: "Eingezahlt", value: Fmt.eur(r.finalInvested))
            StatTile(title: "Rendite p. a. (mittel)", value: Fmt.pct(r.medianCAGR, sign: true))
            StatTile(title: "Schwankung", value: Fmt.pct(r.volatility, digits: 0), caption: "pro Jahr")
            StatTile(title: "Größter Rückgang", value: "−" + Fmt.pct(r.medianMaxDrawdown, digits: 0), caption: "typisch unterwegs")
            StatTile(title: "Verlustrisiko", value: Fmt.pct(r.probabilityOfLoss, digits: 0), caption: "Ende < Einzahlungen")
        }
    }

    private var valueFit: some View {
        let total = max(totalWeight, 0.0001)
        return Card(title: "Passt die Strategie zu deinen Werten?", icon: "leaf.fill") {
            ForEach(InvestValue.allCases.filter { app.profile.values.contains($0) }) { v in
                let score: Double = strategyScore(for: v, total: total)
                HStack {
                    Label(v.rawValue, systemImage: v.icon).font(.subheadline)
                    Spacer()
                    Text(Fmt.pct(score, digits: 0)).bold()
                }
                .foregroundStyle(Theme.textPrimary)
                ProgressBar(value: score, height: 6)
            }
        }
    }

    private func strategyScore(for value: InvestValue, total: Double) -> Double {
        var score: Double = 0.0
        for (id, weight) in input.weights {
            let assetScore: Double = market.asset(id)?.valueScores[value] ?? 0.5
            score += weight / total * assetScore
        }
        return score
    }

    private var methodCard: some View {
        Card(title: "So funktioniert die Berechnung", icon: "function") {
            Button(showMethod ? "Weniger anzeigen" : "Rechenweg & Code anzeigen") {
                withAnimation { showMethod.toggle() }
            }
            .font(.subheadline.weight(.semibold))
            if showMethod {
                Text("Wir spielen 500 mögliche Zukünfte durch (Monte-Carlo-Simulation). In jedem Monat wächst das Vermögen um die erwartete Rendite plus einen Zufallsschock, der so groß ist wie die typische Schwankung. Dann wird die Sparrate addiert. Am Ende sortieren wir alle Ergebnisse: Das mittlere ist der Median, das 10. und 90. Perzentil bilden die Bandbreite.")
                    .font(.callout).foregroundStyle(Theme.textSecondary)
                Text("""
                for monat in 1...monate {
                    wert *= exp((μ − σ²/2)·dt + σ·√dt·zufall())
                    wert += sparrate
                }
                """)
                .font(.caption.monospaced())
                .foregroundStyle(Theme.lavender)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 10).fill(Color.black.opacity(0.3)))
                Text("Annahmen je Asset (erwartete Rendite, Schwankung, Korrelation) sind bewusst vorsichtig und in SimulationEngine.swift offen dokumentiert.")
                    .font(.caption).foregroundStyle(Theme.textTertiary)
            }
        }
    }
}
