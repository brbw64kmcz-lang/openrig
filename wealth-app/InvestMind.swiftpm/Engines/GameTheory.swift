import Foundation

// Spieltheorie für Märkte: 2×2-Spiele, Nash-Gleichgewichte und wiederholte Spiele.

struct Payoff: Hashable {
    let row: Double
    let col: Double
}

struct Cell2: Hashable {
    let r: Int
    let c: Int
}

struct MatrixGame: Identifiable {
    let id: String
    let title: String
    let story: String
    let rowPlayer: String
    let colPlayer: String
    /// Aktion 0 = "kooperativ", Aktion 1 = "eigennützig"
    let actions: [String]
    /// payoffs[zeile][spalte]
    let payoffs: [[Payoff]]
    let lesson: String
    let unit: String

    /// Reine Nash-Gleichgewichte: Kein Spieler kann sich allein verbessern.
    func nashEquilibria() -> [Cell2] {
        var result: [Cell2] = []
        for r in 0..<2 {
            for c in 0..<2 {
                let rowBest = payoffs[r][c].row >= payoffs[1 - r][c].row
                let colBest = payoffs[r][c].col >= payoffs[r][1 - c].col
                if rowBest && colBest { result.append(Cell2(r: r, c: c)) }
            }
        }
        return result
    }

    /// Pareto-optimal: Niemand kann besser gestellt werden, ohne jemand anderen schlechter zu stellen.
    func paretoOptimal() -> [Cell2] {
        var all: [Cell2] = []
        for r in 0..<2 { for c in 0..<2 { all.append(Cell2(r: r, c: c)) } }
        return all.filter { cell in
            let p = payoffs[cell.r][cell.c]
            return !all.contains { other in
                let q = payoffs[other.r][other.c]
                return q.row >= p.row && q.col >= p.col && (q.row > p.row || q.col > p.col)
            }
        }
    }

    func payoff(_ r: Int, _ c: Int) -> Payoff { payoffs[r][c] }
}

enum GameLibrary {
    static let oil = MatrixGame(
        id: "oil", title: "Ölförder-Dilemma",
        story: "Zwei Förderländer entscheiden, ob sie ihre Ölproduktion drosseln (hoher Preis) oder mehr fördern (mehr Menge, aber niedrigerer Preis).",
        rowPlayer: "Du (Land A)", colPlayer: "Land B",
        actions: ["Drosseln", "Mehr fördern"],
        payoffs: [[Payoff(row: 6, col: 6), Payoff(row: 1, col: 8)],
                  [Payoff(row: 8, col: 1), Payoff(row: 3, col: 3)]],
        lesson: "Das ist ein Gefangenendilemma: Mehr fördern ist für jeden einzeln immer besser – doch wenn beide so handeln, verdienen beide weniger (3 statt 6). Kartelle sind deshalb instabil, und der Ölpreis reagiert stark auf Vertrauensbrüche.",
        unit: "Mrd. €")

    static let developers = MatrixGame(
        id: "developers", title: "Bauen oder Warten?",
        story: "Zwei Projektentwickler besitzen Grundstücke im selben Viertel. Bauen beide gleichzeitig, entsteht ein Überangebot und die Mieten fallen.",
        rowPlayer: "Du (Entwickler A)", colPlayer: "Entwickler B",
        actions: ["Warten", "Jetzt bauen"],
        payoffs: [[Payoff(row: 3, col: 3), Payoff(row: 2, col: 6)],
                  [Payoff(row: 6, col: 2), Payoff(row: -2, col: -2)]],
        lesson: "Es gibt zwei Gleichgewichte: Einer baut, der andere wartet. Wer zuerst glaubhaft baut (First Mover), gewinnt. Genau deshalb kündigen Entwickler Projekte früh und laut an – eine Brücke zum Immobilien-Labor.",
        unit: "Mio. €")

    static let hedge = MatrixGame(
        id: "hedge", title: "Bauer & Mühle: Liefervertrag",
        story: "Ein Weizenbauer und eine Mühle können einen festen Liefervertrag (Forward) schließen oder am freien Markt handeln.",
        rowPlayer: "Du (Bauer)", colPlayer: "Mühle",
        actions: ["Vertrag", "Freier Markt"],
        payoffs: [[Payoff(row: 5, col: 5), Payoff(row: 0, col: 3)],
                  [Payoff(row: 3, col: 0), Payoff(row: 3, col: 3)]],
        lesson: "Ein Koordinationsspiel (Hirschjagd): Beide profitieren vom Vertrag, aber nur, wenn sie einander vertrauen. Terminbörsen lösen dieses Vertrauensproblem, indem sie als Mittelsmann auftreten.",
        unit: "Punkte")

    static let all: [MatrixGame] = [oil, developers, hedge]
}

// MARK: - Wiederholtes Spiel

enum RepeatedStrategy: String, CaseIterable, Identifiable {
    case titForTat = "Wie du mir, so ich dir"
    case alwaysCooperate = "Immer kooperieren"
    case alwaysDefect = "Immer eigennützig"
    case grim = "Nachtragend"
    case pavlov = "Gewinnen – bleiben"
    case random = "Zufall"

    var id: String { rawValue }

    var explanation: String {
        switch self {
        case .titForTat: return "Beginnt freundlich und macht dann immer das, was der Gegner zuletzt getan hat."
        case .alwaysCooperate: return "Kooperiert immer – leicht auszunutzen."
        case .alwaysDefect: return "Handelt immer eigennützig."
        case .grim: return "Kooperiert, bis der Gegner einmal betrügt – danach nie wieder."
        case .pavlov: return "Wiederholt den letzten Zug, wenn er gut lief, sonst wechselt er."
        case .random: return "Entscheidet zufällig."
        }
    }

    /// 0 = kooperieren, 1 = eigennützig
    func move(my: [Int], their: [Int], game: MatrixGame, rng: inout SeededGenerator) -> Int {
        switch self {
        case .titForTat:
            return their.last ?? 0
        case .alwaysCooperate:
            return 0
        case .alwaysDefect:
            return 1
        case .grim:
            return their.contains(1) ? 1 : 0
        case .pavlov:
            guard let m = my.last, let t = their.last else { return 0 }
            let gotGood = game.payoff(m, t).row >= game.payoff(0, 0).row
            return gotGood ? m : 1 - m
        case .random:
            return rng.unit() < 0.5 ? 0 : 1
        }
    }
}

enum Tournament {
    struct Entry: Identifiable {
        var id: String { strategy.rawValue }
        let strategy: RepeatedStrategy
        let score: Double
    }

    /// Jeder gegen jeden, je `rounds` Runden (wie Axelrods berühmtes Turnier).
    static func run(game: MatrixGame, rounds: Int = 20, seed: UInt64 = 1) -> [Entry] {
        var rng = SeededGenerator(seed: seed)
        var scores: [RepeatedStrategy: Double] = [:]
        let strategies = RepeatedStrategy.allCases
        for (i, a) in strategies.enumerated() {
            for b in strategies[i...] {
                var ha: [Int] = [], hb: [Int] = []
                var sa = 0.0, sb = 0.0
                for _ in 0..<rounds {
                    let ma = a.move(my: ha, their: hb, game: game, rng: &rng)
                    let mb = b.move(my: hb, their: ha, game: game, rng: &rng)
                    sa += game.payoff(ma, mb).row
                    sb += game.payoff(ma, mb).col
                    ha.append(ma)
                    hb.append(mb)
                }
                scores[a, default: 0] += sa
                if a != b { scores[b, default: 0] += sb }
            }
        }
        return strategies
            .map { Entry(strategy: $0, score: scores[$0] ?? 0) }
            .sorted { $0.score > $1.score }
    }
}
