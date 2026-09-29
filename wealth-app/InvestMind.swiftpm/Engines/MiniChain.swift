import Foundation

// Eine kleine, echte Blockchain zum Anfassen: Blöcke, Hashes, Mining (Proof of Work),
// Manipulation und Prüfung. Dazu eine einfache Skriptsprache ("ChainScript"),
// mit der Nutzer ihre ersten Programmierschritte machen.

struct ChainBlock: Identifiable, Equatable {
    let id = UUID()
    var index: Int
    var data: String
    var previousHash: String
    var nonce: Int
    private(set) var hash: String = ""

    init(index: Int, data: String, previousHash: String, nonce: Int = 0) {
        self.index = index
        self.data = data
        self.previousHash = previousHash
        self.nonce = nonce
        rehash()
    }

    static func computeHash(index: Int, data: String, previousHash: String, nonce: Int) -> String {
        SHA256.hex("\(index)|\(data)|\(previousHash)|\(nonce)")
    }

    mutating func rehash() {
        hash = ChainBlock.computeHash(index: index, data: data, previousHash: previousHash, nonce: nonce)
    }
}

enum BlockStatus {
    case valid, notMined, brokenLink

    var label: String {
        switch self {
        case .valid: return "gültig"
        case .notMined: return "nicht gemint"
        case .brokenLink: return "Kette unterbrochen"
        }
    }
}

struct MiniChain {
    private(set) var blocks: [ChainBlock] = []
    var difficulty: Int {
        didSet { difficulty = min(max(difficulty, 1), 6) }
    }

    static let genesisPrevious = String(repeating: "0", count: 64)

    init(difficulty: Int = 3) {
        self.difficulty = min(max(difficulty, 1), 6)
        reset()
    }

    var prefix: String { String(repeating: "0", count: difficulty) }

    mutating func reset() {
        var genesis = ChainBlock(index: 0, data: "Genesis-Block", previousHash: MiniChain.genesisPrevious)
        if let nonce = MiniChain.findNonce(for: genesis, difficulty: difficulty, limit: 5_000_000) {
            genesis.nonce = nonce
            genesis.rehash()
        }
        blocks = [genesis]
    }

    func status(at i: Int) -> BlockStatus {
        guard blocks.indices.contains(i) else { return .brokenLink }
        let b = blocks[i]
        let expectedPrev = i == 0 ? MiniChain.genesisPrevious : blocks[i - 1].hash
        if b.previousHash != expectedPrev { return .brokenLink }
        if !b.hash.hasPrefix(prefix) { return .notMined }
        return .valid
    }

    var isValid: Bool {
        blocks.indices.allSatisfy { status(at: $0) == .valid }
    }

    @discardableResult
    mutating func addBlock(_ data: String) -> Int {
        let prev = blocks.last?.hash ?? MiniChain.genesisPrevious
        blocks.append(ChainBlock(index: blocks.count, data: data, previousHash: prev))
        return blocks.count - 1
    }

    /// Ändert Daten eines Blocks. Alle folgenden Blöcke werden neu verkettet
    /// und sind danach nicht mehr gemint – genau das macht Manipulation sichtbar.
    mutating func setData(_ data: String, at i: Int) {
        guard blocks.indices.contains(i) else { return }
        blocks[i].data = data
        blocks[i].rehash()
        relink(from: i + 1)
    }

    mutating func setNonce(_ nonce: Int, at i: Int) {
        guard blocks.indices.contains(i) else { return }
        blocks[i].nonce = nonce
        blocks[i].rehash()
        relink(from: i + 1)
    }

    /// Nur die Daten ändern, ohne neu zu verketten (so sieht ein "Angriff" aus).
    mutating func tamper(_ data: String, at i: Int) {
        guard blocks.indices.contains(i) else { return }
        blocks[i].data = data
        blocks[i].rehash()
    }

    private mutating func relink(from start: Int) {
        guard start < blocks.count, start > 0 else { return }
        for j in start..<blocks.count {
            blocks[j].previousHash = blocks[j - 1].hash
            blocks[j].rehash()
        }
    }

    /// Mint einen Block (Proof of Work). Gibt die Anzahl der Versuche zurück.
    @discardableResult
    mutating func mine(at i: Int, limit: Int = 5_000_000) -> Int? {
        guard blocks.indices.contains(i) else { return nil }
        if i > 0 { blocks[i].previousHash = blocks[i - 1].hash }
        var probe = blocks[i]
        probe.nonce = 0
        guard let nonce = MiniChain.findNonce(for: probe, difficulty: difficulty, limit: limit) else { return nil }
        applyMined(nonce: nonce, at: i)
        return nonce + 1
    }

    /// Übernimmt eine (z. B. im Hintergrund) gefundene Nonce.
    mutating func applyMined(nonce: Int, at i: Int) {
        guard blocks.indices.contains(i) else { return }
        if i > 0 { blocks[i].previousHash = blocks[i - 1].hash }
        blocks[i].nonce = nonce
        blocks[i].rehash()
        relink(from: i + 1)
    }

    /// Kopie eines Blocks, fertig zum Minen (richtiger Vorgänger-Hash, Nonce 0)
    func miningCandidate(at i: Int) -> ChainBlock? {
        guard blocks.indices.contains(i) else { return nil }
        let prev = i == 0 ? MiniChain.genesisPrevious : blocks[i - 1].hash
        return ChainBlock(index: i, data: blocks[i].data, previousHash: prev, nonce: 0)
    }

    /// Reine Funktion: sucht die kleinste Nonce ab `block.nonce`, deren Hash mit `difficulty` Nullen beginnt.
    static func findNonce(for block: ChainBlock, difficulty: Int, limit: Int) -> Int? {
        let prefix = String(repeating: "0", count: difficulty)
        var nonce = block.nonce
        let end = block.nonce + limit
        while nonce < end {
            let h = ChainBlock.computeHash(index: block.index, data: block.data, previousHash: block.previousHash, nonce: nonce)
            if h.hasPrefix(prefix) { return nonce }
            nonce += 1
        }
        return nil
    }

    /// Wahrscheinlichkeit, dass ein Angreifer mit Anteil q der Rechenleistung
    /// z Blöcke Rückstand aufholt (Formel aus dem Bitcoin-Whitepaper, Abschnitt 11).
    static func attackerSuccessProbability(q: Double, z: Int) -> Double {
        let p = 1 - q
        if q >= p { return 1 }
        let lambda = Double(z) * (q / p)
        var sum = 1.0
        for k in 0...max(z, 0) {
            var poisson = exp(-lambda)
            if k > 0 {
                for i in 1...k { poisson *= lambda / Double(i) }
            }
            sum -= poisson * (1 - pow(q / p, Double(z - k)))
        }
        return max(0, sum)
    }

    /// Bitcoin-Blockbelohnung bei Blockhöhe h (Halbierung alle 210.000 Blöcke)
    static func blockReward(height: Int) -> Double {
        let halvings = height / 210_000
        if halvings >= 64 { return 0 }
        return 50.0 / pow(2, Double(halvings))
    }
}

// MARK: - ChainScript: eine kleine Lern-Programmiersprache

enum ChainScript {

    struct Line: Identifiable {
        enum Kind { case info, success, error, echo }
        let id = UUID()
        let text: String
        let kind: Kind
    }

    static let example = """
    # Willkommen! Jede Zeile ist ein Befehl. Tippe "help" für alle Befehle.
    difficulty 3
    block "Alice zahlt Bob 5 Coins"
    block "Bob zahlt Carol 2 Coins"
    mine
    verify

    # Was passiert, wenn jemand die Vergangenheit fälscht?
    tamper 1 "Alice zahlt Bob 500 Coins"
    verify

    # Wie sicher sind 6 Bestätigungen gegen einen Angreifer mit 30 % Rechenleistung?
    attack 30 6
    """

    static let help = """
    Befehle:
      difficulty N        Schwierigkeit (Anzahl führender Nullen, 1–5)
      block "Text"        neuen Block anhängen
      mine                alle ungültigen Blöcke minen
      mine N              Block N minen
      verify              Kette prüfen
      tamper N "Text"     Block N heimlich ändern (Angriff)
      edit N "Text"       Block N ändern und neu verketten
      hash "Text"         SHA-256 eines Textes
      print               Kette ausgeben
      attack Q Z          Erfolgschance eines Angreifers mit Q % Rechenleistung bei Z Bestätigungen
      reward H            Blockbelohnung bei Blockhöhe H
      repeat N <Befehl>   Befehl N-mal ausführen, {i} wird durch die Zahl ersetzt
      reset               neue Kette
    """

    /// Führt ein Skript aus und verändert dabei die Kette.
    static func run(_ source: String, chain: inout MiniChain, hashBudget: Int = 3_000_000) -> [Line] {
        var out: [Line] = []
        var budget = hashBudget
        let lines = source.components(separatedBy: .newlines)
        for (n, raw) in lines.enumerated() {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.isEmpty || line.hasPrefix("#") || line.hasPrefix("//") { continue }
            out.append(Line(text: "› " + line, kind: .echo))
            execute(line, lineNumber: n + 1, chain: &chain, out: &out, budget: &budget, depth: 0)
            if budget <= 0 {
                out.append(Line(text: "Abbruch: Rechenbudget aufgebraucht. Tipp: Schwierigkeit senken.", kind: .error))
                break
            }
        }
        return out
    }

    private static func execute(_ line: String, lineNumber: Int, chain: inout MiniChain,
                                out: inout [Line], budget: inout Int, depth: Int) {
        let parts = line.split(separator: " ", omittingEmptySubsequences: true).map(String.init)
        guard let command = parts.first?.lowercased() else { return }
        let args = Array(parts.dropFirst())

        func error(_ text: String) { out.append(Line(text: "Zeile \(lineNumber): \(text)", kind: .error)) }
        func info(_ text: String) { out.append(Line(text: text, kind: .info)) }
        func ok(_ text: String) { out.append(Line(text: text, kind: .success)) }

        switch command {
        case "help":
            info(help)

        case "difficulty":
            guard let n = args.first.flatMap(Int.init), (1...5).contains(n) else {
                return error("Bitte eine Zahl von 1 bis 5 angeben, z. B. difficulty 3")
            }
            chain.difficulty = n
            info("Schwierigkeit = \(n) → Hash muss mit \"\(chain.prefix)\" beginnen (im Schnitt \(Fmt.num(pow(16, Double(n)), digits: 0)) Versuche).")

        case "block":
            guard let text = quoted(line) else { return error("Text in Anführungszeichen angeben: block \"...\"") }
            let i = chain.addBlock(text)
            info("Block \(i) angehängt (noch nicht gemint).")

        case "mine":
            let targets: [Int]
            if let n = args.first.flatMap(Int.init) {
                targets = [n]
            } else {
                targets = chain.blocks.indices.filter { chain.status(at: $0) != .valid }
            }
            if targets.isEmpty { return ok("Alle Blöcke sind bereits gültig.") }
            for i in targets {
                guard chain.blocks.indices.contains(i) else { error("Block \(i) existiert nicht."); continue }
                guard let tries = chain.mine(at: i, limit: max(budget, 1)) else {
                    budget = 0
                    return error("Keine Nonce innerhalb des Budgets gefunden.")
                }
                budget -= tries
                ok("Block \(i) gemint: Nonce \(chain.blocks[i].nonce), \(Fmt.num(Double(tries), digits: 0)) Versuche\n  Hash \(chain.blocks[i].hash.prefix(24))…")
            }

        case "verify":
            if chain.isValid {
                ok("✓ Kette gültig (\(chain.blocks.count) Blöcke).")
            } else {
                for i in chain.blocks.indices where chain.status(at: i) != .valid {
                    error("✗ Block \(i): \(chain.status(at: i).label)")
                }
            }

        case "tamper", "edit":
            guard let n = args.first.flatMap(Int.init), chain.blocks.indices.contains(n) else {
                return error("Blocknummer fehlt oder existiert nicht.")
            }
            guard let text = quoted(line) else { return error("Neuen Text in Anführungszeichen angeben.") }
            if command == "tamper" {
                chain.tamper(text, at: n)
                info("Block \(n) heimlich geändert. Sein Hash ist jetzt anders – prüfe mit verify.")
            } else {
                chain.setData(text, at: n)
                info("Block \(n) geändert und nachfolgende Blöcke neu verkettet (müssen neu gemint werden).")
            }

        case "hash":
            guard let text = quoted(line) else { return error("Text in Anführungszeichen angeben: hash \"...\"") }
            info("SHA-256(\"\(text)\") =\n  \(SHA256.hex(text))")

        case "print":
            for (i, b) in chain.blocks.enumerated() {
                info("[\(i)] \(b.data)\n    nonce \(b.nonce) · hash \(b.hash.prefix(16))… · \(chain.status(at: i).label)")
            }

        case "attack":
            guard args.count >= 2,
                  let q = Double(args[0].replacingOccurrences(of: "%", with: "").replacingOccurrences(of: ",", with: ".")),
                  let z = Int(args[1]), q > 0, q < 100, z >= 0 else {
                return error("Beispiel: attack 30 6  (30 % Rechenleistung, 6 Bestätigungen)")
            }
            let p = MiniChain.attackerSuccessProbability(q: q / 100, z: z)
            info("Angreifer mit \(Fmt.num(q, digits: 0)) % Rechenleistung, \(z) Bestätigungen:\n  Erfolgschance ≈ \(Fmt.pct(p, digits: 4))")
            if q >= 50 { error("Ab 50 % gewinnt der Angreifer immer – deshalb ist Dezentralität so wichtig.") }

        case "reward":
            guard let h = args.first.flatMap(Int.init), h >= 0 else { return error("Beispiel: reward 840000") }
            info("Blockbelohnung bei Höhe \(h): \(Fmt.num(MiniChain.blockReward(height: h), digits: 4)) BTC")

        case "repeat":
            guard depth == 0, args.count >= 2, let n = Int(args[0]), (1...20).contains(n) else {
                return error("Beispiel: repeat 3 block \"Zahlung {i}\"  (1–20 Wiederholungen, nicht verschachtelt)")
            }
            let rest = args.dropFirst().joined(separator: " ")
            for i in 1...n {
                execute(rest.replacingOccurrences(of: "{i}", with: "\(i)"), lineNumber: lineNumber,
                        chain: &chain, out: &out, budget: &budget, depth: depth + 1)
                if budget <= 0 { return }
            }

        case "reset":
            chain.reset()
            info("Neue Kette mit Genesis-Block erstellt.")

        default:
            error("Unbekannter Befehl „\(command)“. Tippe help.")
        }
    }

    /// Text zwischen dem ersten und letzten Anführungszeichen
    private static func quoted(_ line: String) -> String? {
        guard let first = line.firstIndex(of: "\""), let last = line.lastIndex(of: "\""), first < last else { return nil }
        return String(line[line.index(after: first)..<last])
    }
}
