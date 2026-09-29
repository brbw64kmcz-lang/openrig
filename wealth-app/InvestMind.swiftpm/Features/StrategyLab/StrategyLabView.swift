import SwiftUI
import Charts

/// Strategie-Labor: Rohstoffe, Derivate und Spieltheorie.
struct StrategyLabView: View {
    enum Tab: String, CaseIterable {
        case derivatives = "Derivate-Rechner"
        case hedging = "Hedging-Spiel"
        case games = "Spieltheorie"
        case tournament = "Turnier"
    }

    @State private var tab: Tab = .derivatives

    var body: some View {
        Screen(title: "Strategie-Labor", subtitle: "Futures, Optionen und Spieltheorie – am Beispiel von Rohstoffen.", badge: .simulation) {
            PillPicker(options: Tab.allCases, selection: $tab) { $0.rawValue }
            switch tab {
            case .derivatives: DerivativesPanel()
            case .hedging: HedgingPanel()
            case .games: GamesPanel()
            case .tournament: TournamentPanel()
            }
        }
    }
}

// MARK: - Derivate-Rechner

private struct DerivativesPanel: View {
    @EnvironmentObject private var market: MarketStore
    @State private var underlyingID = "gold"
    @State private var kind: DerivativeKind = .callLong
    @State private var strikeFactor: Double = 1.0
    @State private var months: Double = 3
    @State private var contracts: Double = 1

    private let underlyings = ["gold", "oil", "wheat", "copper", "reit-res"]

    private var asset: Asset? { market.asset(underlyingID) }

    private var contractSize: Double {
        switch underlyingID {
        case "gold": return 10
        case "oil": return 100
        case "wheat": return 50
        case "copper": return 5
        default: return 100
        }
    }

    private var position: DerivativePosition {
        let spot = asset?.price ?? 100
        let strike = spot * strikeFactor
        let isCall = kind == .callLong || kind == .callShort
        let premium = kind.isOption
            ? OptionPricing.blackScholes(call: isCall, s: spot, k: strike, t: months / 12, r: 0.03, sigma: asset?.volatility ?? 0.2)
            : 0
        return DerivativePosition(kind: kind, strike: kind.isOption ? strike : spot, premium: premium,
                                  contracts: contracts, contractSize: contractSize)
    }

    private func strikeLabel(spot: Double, factor: Double) -> String {
        let price: String = Fmt.num(spot * factor)
        let change: String = Fmt.pct(factor - 1, digits: 0, sign: true)
        return "\(price) € (\(change))"
    }

    private struct PayoffPoint: Identifiable {
        var id: Double { price }
        let price: Double
        let profit: Double
    }

    var body: some View {
        let spot = asset?.price ?? 100
        let pos = position
        let points = stride(from: spot * 0.5, through: spot * 1.5, by: spot / 50).map {
            PayoffPoint(price: $0, profit: pos.profit(at: $0))
        }
        VStack(alignment: .leading, spacing: Theme.spacing) {
            Card(title: "Position", icon: "slider.horizontal.3") {
                Picker("Basiswert", selection: $underlyingID) {
                    ForEach(underlyings, id: \.self) { id in
                        Text(market.asset(id)?.name ?? id).tag(id)
                    }
                }
                .pickerStyle(.menu)
                KeyValueRow(label: "Aktueller Preis", value: Fmt.num(spot) + " €")
                Picker("Instrument", selection: $kind) {
                    ForEach(DerivativeKind.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.menu)
                Text(kind.plain).font(.caption).foregroundStyle(kind == .callShort || kind == .putShort ? Theme.warning : Theme.textSecondary)
                if kind.isOption {
                    LabeledSlider(title: "Basispreis", value: $strikeFactor, range: 0.7...1.3, step: 0.01) { factor in
                        strikeLabel(spot: spot, factor: factor)
                    }
                    LabeledSlider(title: "Laufzeit", value: $months, range: 1...24, step: 1) { "\(Int($0)) Monate" }
                }
                LabeledSlider(title: "Kontrakte (à \(Fmt.num(contractSize, digits: 0)) Einheiten)", value: $contracts, range: 1...10, step: 1) {
                    "\(Int($0))"
                }
            }

            Card(title: "Gewinn / Verlust bei Fälligkeit", icon: "chart.xyaxis.line") {
                Chart {
                    ForEach(points) { p in
                        AreaMark(x: .value("Preis", p.price), y: .value("G/V", p.profit))
                            .foregroundStyle(Theme.lavender.opacity(0.15))
                        LineMark(x: .value("Preis", p.price), y: .value("G/V", p.profit))
                            .foregroundStyle(Theme.lavender)
                    }
                    RuleMark(y: .value("Null", 0)).foregroundStyle(Color.white.opacity(0.3))
                    RuleMark(x: .value("Heute", spot))
                        .foregroundStyle(Theme.sky)
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 3]))
                        .annotation(position: .top, alignment: .leading) {
                            Text("heute").font(.caption2).foregroundStyle(Theme.sky)
                        }
                }
                .frame(height: 230)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 10)], spacing: 10) {
                    if kind.isOption {
                        StatTile(title: "Faire Prämie (Black-Scholes)", value: Fmt.num(pos.premium) + " €", caption: "pro Einheit")
                    }
                    StatTile(title: "Break-even", value: pos.breakEven.map { Fmt.num($0) + " €" } ?? "–")
                    StatTile(title: "Max. Verlust", value: pos.maxLoss.map { Fmt.eur($0) } ?? "unbegrenzt")
                    StatTile(title: "Max. Gewinn", value: pos.maxGain.map { Fmt.eur($0) } ?? "unbegrenzt")
                    StatTile(title: "Kapitalbedarf / Margin", value: Fmt.eur(pos.initialMargin))
                    StatTile(title: "Kontraktwert", value: Fmt.eur(spot * pos.units))
                }
            }

            InfoHint(text: "Die Prämie wird mit der Black-Scholes-Formel berechnet (Zins 3 %, Volatilität des Basiswerts). Beachte den Hebel: Mit einer kleinen Margin bewegst du einen großen Kontraktwert. Verkaufte Optionen (Stillhalter) können Verluste weit über den Einsatz hinaus erzeugen.")
        }
    }
}

// MARK: - Hedging-Spiel

private struct HedgingPanel: View {
    @State private var game = HedgingGame()
    @State private var hedge: Double = 0.5

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing) {
            Card(title: "Deine Rolle: Bäckerei", icon: "birthday.cake.fill") {
                Text("Du brauchst in 6 Monaten 100 t Weizen. Der Preis schwankt stark. Sicherst du dir heute per Future einen festen Preis – ganz, teilweise oder gar nicht?")
                    .font(.callout).foregroundStyle(Theme.textSecondary)
                KeyValueRow(label: "Weizen heute", value: Fmt.eur(game.spot, digits: 2) + " / t")
                KeyValueRow(label: "6-Monats-Future", value: Fmt.eur(game.futurePrice, digits: 2) + " / t")
                LabeledSlider(title: "Absicherungsquote", value: $hedge, range: 0...1, step: 0.1) { Fmt.pct($0, digits: 0) }
                Button(game.isFinished ? "Spiel beendet" : "Runde \(game.rounds.count + 1) von \(game.totalRounds) spielen") {
                    withAnimation { game.play(hedgeRatio: hedge) }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(game.isFinished)
            }

            if !game.rounds.isEmpty {
                Card(title: "Einkaufskosten je Runde", icon: "chart.bar.fill") {
                    Chart {
                        ForEach(game.rounds) { r in
                            BarMark(x: .value("Runde", "R\(r.id)"), y: .value("Kosten", r.costHedged))
                                .foregroundStyle(by: .value("Strategie", "Deine Strategie"))
                                .position(by: .value("Strategie", "Deine Strategie"))
                            BarMark(x: .value("Runde", "R\(r.id)"), y: .value("Kosten", r.costUnhedged))
                                .foregroundStyle(by: .value("Strategie", "Ohne Absicherung"))
                                .position(by: .value("Strategie", "Ohne Absicherung"))
                        }
                    }
                    .chartForegroundStyleScale(["Deine Strategie": Theme.blue, "Ohne Absicherung": Theme.gray])
                    .frame(height: 200)
                    KeyValueRow(label: "Kosten gesamt (deine Strategie)", value: Fmt.eur(game.totalHedged))
                    KeyValueRow(label: "Kosten gesamt (ohne Absicherung)", value: Fmt.eur(game.totalUnhedged))
                    KeyValueRow(label: "Schwankung deiner Kosten", value: Fmt.eur(game.hedgedSpread))
                    KeyValueRow(label: "Schwankung ohne Absicherung", value: Fmt.eur(game.unhedgedSpread))
                }
            }

            if game.isFinished {
                Card(title: "Auswertung", icon: "flag.checkered") {
                    Text(verdict).foregroundStyle(Theme.textPrimary)
                    Button("Neues Spiel") {
                        game = HedgingGame()
                    }
                    .buttonStyle(SecondaryButtonStyle())
                }
            }
            InfoHint(text: "Beim Hedging geht es nicht darum, am meisten zu sparen, sondern Kosten planbar zu machen. Eine Bäckerei kann ihre Brotpreise nur kalkulieren, wenn sie ihre Einkaufskosten kennt.")
        }
    }

    private var verdict: String {
        if game.hedgedSpread < game.unhedgedSpread * 0.6 {
            return "Sehr gut: Deine Kosten waren deutlich planbarer als ohne Absicherung. Genau das ist der Zweck von Hedging."
        } else if game.hedgedSpread < game.unhedgedSpread {
            return "Deine Kosten waren etwas stabiler. Eine höhere Absicherungsquote hätte das Risiko weiter gesenkt."
        }
        return "Du hast kaum abgesichert – deine Kosten schwankten voll mit dem Markt. Das kann gut gehen, ist aber Spekulation."
    }
}

// MARK: - Spieltheorie

private struct GamesPanel: View {
    @State private var gameID = GameLibrary.oil.id
    @State private var opponent: RepeatedStrategy = .titForTat
    @State private var myMoves: [Int] = []
    @State private var theirMoves: [Int] = []
    @State private var rng = SeededGenerator(seed: 99)

    private var game: MatrixGame { GameLibrary.all.first { $0.id == gameID } ?? GameLibrary.oil }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing) {
            Picker("Spiel", selection: $gameID) {
                ForEach(GameLibrary.all) { Text($0.title).tag($0.id) }
            }
            .pickerStyle(.segmented)
            .onChange(of: gameID) { _, _ in reset() }

            Card(title: game.title, icon: "person.2.fill") {
                Text(game.story).font(.callout).foregroundStyle(Theme.textSecondary)
                matrix
                legend
            }

            Card(title: "Spiel 10 Runden gegen den Computer", icon: "gamecontroller.fill") {
                Picker("Gegner-Strategie", selection: $opponent) {
                    ForEach(RepeatedStrategy.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.menu)
                .onChange(of: opponent) { _, _ in reset() }
                Text("Die Strategie des Gegners ist geheim – versuche sie zu erkennen!")
                    .font(.caption).foregroundStyle(Theme.textTertiary)
                HStack(spacing: 10) {
                    Button(game.actions[0]) { play(0) }.buttonStyle(SecondaryButtonStyle())
                    Button(game.actions[1]) { play(1) }.buttonStyle(SecondaryButtonStyle())
                }
                .disabled(myMoves.count >= 10)
                if !myMoves.isEmpty { history }
                if myMoves.count >= 10 {
                    Text("Gegner-Strategie war: \(opponent.rawValue). \(opponent.explanation)")
                        .font(.callout).foregroundStyle(Theme.lavender)
                    Button("Nochmal") { reset() }.buttonStyle(PrimaryButtonStyle())
                }
            }
            Card(title: "Was lernen wir daraus?", icon: "lightbulb.fill") {
                Text(game.lesson).font(.callout).foregroundStyle(Theme.textPrimary)
            }
        }
    }

    private var matrix: some View {
        let nash = Set(game.nashEquilibria())
        let pareto = Set(game.paretoOptimal())
        return Grid(horizontalSpacing: 6, verticalSpacing: 6) {
            GridRow {
                Text("")
                ForEach(0..<2, id: \.self) { c in
                    Text("\(game.colPlayer):\n\(game.actions[c])").font(.caption.bold()).multilineTextAlignment(.center)
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            ForEach(0..<2, id: \.self) { r in
                GridRow {
                    Text("\(game.rowPlayer):\n\(game.actions[r])").font(.caption.bold()).foregroundStyle(Theme.textSecondary)
                    ForEach(0..<2, id: \.self) { c in
                        let p = game.payoff(r, c)
                        let cell = Cell2(r: r, c: c)
                        VStack(spacing: 2) {
                            Text("\(Fmt.num(p.row, digits: 0)) | \(Fmt.num(p.col, digits: 0))")
                                .font(.headline.monospacedDigit()).foregroundStyle(Theme.textPrimary)
                            HStack(spacing: 4) {
                                if nash.contains(cell) { Text("Nash").font(.caption2.bold()).foregroundStyle(Theme.warning) }
                                if pareto.contains(cell) { Text("Pareto").font(.caption2.bold()).foregroundStyle(Theme.positive) }
                            }
                        }
                        .frame(maxWidth: .infinity, minHeight: 60)
                        .background(RoundedRectangle(cornerRadius: 10).fill(nash.contains(cell) ? Theme.purple.opacity(0.35) : Theme.cardRaised))
                    }
                }
            }
        }
    }

    private var legend: some View {
        Text("Zahlen: dein Gewinn | Gewinn des Gegners (in \(game.unit)). **Nash** = kein Spieler verbessert sich allein. **Pareto** = niemand kann besser gestellt werden, ohne dass ein anderer verliert.")
            .font(.caption).foregroundStyle(Theme.textTertiary)
    }

    private var history: some View {
        let mine = zip(myMoves, theirMoves).reduce(0.0) { $0 + game.payoff($1.0, $1.1).row }
        let theirs = zip(myMoves, theirMoves).reduce(0.0) { $0 + game.payoff($1.0, $1.1).col }
        return VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                ForEach(Array(zip(myMoves, theirMoves).enumerated()), id: \.offset) { _, pair in
                    VStack(spacing: 2) {
                        Circle().fill(pair.0 == 0 ? Theme.positive : Theme.negative).frame(width: 12, height: 12)
                        Circle().fill(pair.1 == 0 ? Theme.positive : Theme.negative).frame(width: 12, height: 12)
                    }
                }
            }
            Text("Oben: du · Unten: Gegner · Grün = \(game.actions[0]), Rot = \(game.actions[1])")
                .font(.caption2).foregroundStyle(Theme.textTertiary)
            KeyValueRow(label: "Dein Ergebnis", value: Fmt.num(mine, digits: 0) + " " + game.unit)
            KeyValueRow(label: "Gegner", value: Fmt.num(theirs, digits: 0) + " " + game.unit)
        }
    }

    private func play(_ move: Int) {
        let reply = opponent.move(my: theirMoves, their: myMoves, game: game, rng: &rng)
        myMoves.append(move)
        theirMoves.append(reply)
    }

    private func reset() {
        myMoves = []
        theirMoves = []
    }
}

// MARK: - Turnier

private struct TournamentPanel: View {
    @State private var gameID = GameLibrary.oil.id
    @State private var rounds: Double = 20

    private var game: MatrixGame { GameLibrary.all.first { $0.id == gameID } ?? GameLibrary.oil }

    var body: some View {
        let results = Tournament.run(game: game, rounds: Int(rounds))
        VStack(alignment: .leading, spacing: Theme.spacing) {
            Card(title: "Jeder gegen jeden", icon: "trophy.fill") {
                Picker("Spiel", selection: $gameID) {
                    ForEach(GameLibrary.all) { Text($0.title).tag($0.id) }
                }
                .pickerStyle(.segmented)
                LabeledSlider(title: "Runden pro Begegnung", value: $rounds, range: 1...50, step: 1) { "\(Int($0))" }
                Chart(results) { e in
                    BarMark(x: .value("Punkte", e.score), y: .value("Strategie", e.strategy.rawValue))
                        .foregroundStyle(Theme.accentGradient)
                }
                .frame(height: 240)
                ForEach(results) { e in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(e.strategy.rawValue).font(.subheadline.bold()).foregroundStyle(Theme.textPrimary)
                        Text(e.strategy.explanation).font(.caption).foregroundStyle(Theme.textSecondary)
                    }
                }
            }
            InfoHint(text: "Wie im berühmten Turnier von Robert Axelrod (1980): Bei nur einer Runde gewinnt Eigennutz. Je mehr Runden, desto besser schneiden freundliche, aber nicht ausnutzbare Strategien wie „Wie du mir, so ich dir“ ab. Probier den Regler aus!")
        }
    }
}
