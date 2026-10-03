import SwiftUI
import Charts

/// Krypto-Labor: Blockchain anfassen, minen, programmieren und Sicherheit verstehen.
struct CryptoLabView: View {
    enum Tab: String, CaseIterable {
        case miner = "Block-Miner"
        case code = "Code-Editor"
        case hash = "Hash-Spielplatz"
        case security = "Sicherheit"
    }

    @State private var tab: Tab = .miner
    @State private var chain = MiniChain(difficulty: 3)

    var body: some View {
        Screen(title: "Krypto-Labor", subtitle: "Verstehe den Code hinter Bitcoin – indem du ihn selbst ausführst.", badge: .simulation) {
            PillPicker(options: Tab.allCases, selection: $tab) { $0.rawValue }
            switch tab {
            case .miner: MinerPanel(chain: $chain)
            case .code: CodePanel(chain: $chain)
            case .hash: HashPanel()
            case .security: SecurityPanel()
            }
        }
    }
}

// MARK: - Block-Miner

private struct MinerPanel: View {
    @Binding var chain: MiniChain
    @State private var newData = "Carol zahlt Dave 1 Coin"
    @State private var miningIndex: Int?
    @State private var lastRun: String?

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing) {
            Card(title: "Schwierigkeit", icon: "gauge.with.dots.needle.67percent") {
                Stepper(value: difficultyBinding, in: 1...5) {
                    Text("Hash muss mit **\(chain.prefix)** beginnen")
                        .foregroundStyle(Theme.textPrimary)
                }
                Text("Im Schnitt \(Fmt.num(pow(16, Double(chain.difficulty)), digits: 0)) Versuche pro Block.")
                    .font(.caption).foregroundStyle(Theme.textSecondary)
                HStack {
                    Image(systemName: chain.isValid ? "checkmark.seal.fill" : "xmark.seal.fill")
                    Text(chain.isValid ? "Kette gültig" : "Kette ungültig – mine die roten Blöcke neu")
                }
                .font(.subheadline.bold())
                .foregroundStyle(chain.isValid ? Theme.positive : Theme.negative)
                if let lastRun {
                    Text(lastRun).font(.caption.monospaced()).foregroundStyle(Theme.lavender)
                }
            }

            ForEach(chain.blocks.indices, id: \.self) { i in
                BlockCard(chain: $chain, index: i, isMining: miningIndex == i) { mine(i) }
            }

            Card(title: "Neuer Block", icon: "plus.square.on.square") {
                TextField("Transaktion", text: $newData)
                    .textFieldStyle(.roundedBorder)
                Button("Block anhängen") {
                    chain.addBlock(newData)
                }
                .buttonStyle(SecondaryButtonStyle())
            }
            InfoHint(text: "Ändere den Text in einem alten Block: Sein Hash ändert sich, und alle folgenden Blöcke werden rot. Um die Fälschung zu verstecken, müsstest du alle Blöcke neu minen – schneller als das restliche Netzwerk. Genau das macht Bitcoin sicher.")
        }
    }

    private var difficultyBinding: Binding<Int> {
        Binding(get: { chain.difficulty }, set: { chain.difficulty = $0 })
    }

    /// Mining läuft im Hintergrund, damit die Oberfläche flüssig bleibt.
    private func mine(_ i: Int) {
        guard miningIndex == nil, let candidate = chain.miningCandidate(at: i) else { return }
        let difficulty = chain.difficulty
        miningIndex = i
        let start = Date()
        Task.detached(priority: .userInitiated) {
            let nonce = MiniChain.findNonce(for: candidate, difficulty: difficulty, limit: 50_000_000)
            let seconds = Date().timeIntervalSince(start)
            await MainActor.run {
                if let nonce {
                    chain.applyMined(nonce: nonce, at: i)
                    let rate = Double(nonce + 1) / max(seconds, 0.001)
                    lastRun = "Block \(i): \(Fmt.num(Double(nonce + 1), digits: 0)) Versuche in \(Fmt.num(seconds, digits: 2)) s (\(Fmt.num(rate, digits: 0)) Hashes/s)"
                } else {
                    lastRun = "Keine Nonce gefunden – Schwierigkeit senken."
                }
                miningIndex = nil
            }
        }
    }
}

private struct BlockCard: View {
    @Binding var chain: MiniChain
    let index: Int
    let isMining: Bool
    let onMine: () -> Void

    var body: some View {
        let status = chain.status(at: index)
        let block = chain.blocks[index]
        let color: Color = status == .valid ? Theme.positive : Theme.negative
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Block #\(index)").font(.headline).foregroundStyle(Theme.textPrimary)
                Spacer()
                Label(status.label, systemImage: status == .valid ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                    .font(.caption.bold()).foregroundStyle(color)
            }
            TextField("Daten", text: dataBinding)
                .textFieldStyle(.roundedBorder)
                .disabled(index == 0)
            field("Nonce", "\(block.nonce)")
            field("Vorheriger Hash", String(block.previousHash.prefix(20)) + "…")
            hashLine(block.hash)
            Button(action: onMine) {
                HStack {
                    if isMining { ProgressView().tint(.white) }
                    Text(isMining ? "Mining läuft …" : "Minen")
                }
            }
            .buttonStyle(SecondaryButtonStyle())
            .disabled(isMining || status == .valid)
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(color.opacity(0.6), lineWidth: 1.5))
    }

    private var dataBinding: Binding<String> {
        Binding(get: { chain.blocks[index].data }, set: { chain.setData($0, at: index) })
    }

    private func field(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.caption).foregroundStyle(Theme.textSecondary)
            Spacer()
            Text(value).font(.caption.monospaced()).foregroundStyle(Theme.textPrimary)
        }
    }

    /// Hash mit farbig hervorgehobenem Präfix
    private func hashLine(_ hash: String) -> some View {
        let n = chain.difficulty
        let head = String(hash.prefix(n))
        let tail = String(hash.dropFirst(n).prefix(28))
        let ok = head == chain.prefix
        return HStack(spacing: 0) {
            Text("Hash ").font(.caption).foregroundStyle(Theme.textSecondary)
            Spacer()
            Text(head).font(.caption.monospaced().bold()).foregroundStyle(ok ? Theme.positive : Theme.negative)
            Text(tail + "…").font(.caption.monospaced()).foregroundStyle(Theme.textPrimary)
        }
    }
}

// MARK: - Code-Editor

private struct CodePanel: View {
    @Binding var chain: MiniChain
    @State private var source = ChainScript.example
    @State private var output: [ChainScript.Line] = []
    @State private var running = false

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing) {
            Card(title: "ChainScript", icon: "chevron.left.forwardslash.chevron.right", trailing: "eine Lernsprache") {
                TextEditor(text: $source)
                    .font(.system(.callout, design: .monospaced))
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .scrollContentBackground(.hidden)
                    .foregroundStyle(Theme.lavender)
                    .frame(minHeight: 240)
                    .padding(8)
                    .background(RoundedRectangle(cornerRadius: 10).fill(Color.black.opacity(0.35)))
                HStack(spacing: 10) {
                    Button {
                        run()
                    } label: {
                        Label(running ? "Läuft …" : "Ausführen", systemImage: "play.fill")
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(running)
                    Menu {
                        Button("Beispiel laden") { source = ChainScript.example }
                        Button("Hilfe einfügen") { source = "help\n" + source }
                        Button("Leeren") { source = "" }
                        Button("Kette zurücksetzen") { chain.reset(); output = [] }
                    } label: {
                        Image(systemName: "ellipsis.circle").font(.title2)
                    }
                }
            }

            Card(title: "Konsole", icon: "terminal.fill") {
                if output.isEmpty {
                    Text("Noch keine Ausgabe. Tippe auf „Ausführen“.").font(.caption).foregroundStyle(Theme.textTertiary)
                }
                ForEach(output) { line in
                    Text(line.text)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(color(line.kind))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .textSelection(.enabled)
                }
            }

            Card(title: "Vom Lernskript zu echtem Code", icon: "arrow.right.circle") {
                Text("Jeder ChainScript-Befehl entspricht wenigen Zeilen Swift. Der Befehl „mine“ ist zum Beispiel genau diese Schleife aus MiniChain.swift:")
                    .font(.callout).foregroundStyle(Theme.textSecondary)
                Text("""
                while nonce < end {
                    let h = computeHash(index, data, previousHash, nonce)
                    if h.hasPrefix(prefix) { return nonce }
                    nonce += 1
                }
                """)
                .font(.caption.monospaced())
                .foregroundStyle(Theme.lavender)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 10).fill(Color.black.opacity(0.35)))
            }
        }
    }

    private func color(_ kind: ChainScript.Line.Kind) -> Color {
        switch kind {
        case .echo: return Theme.textTertiary
        case .info: return Theme.textPrimary
        case .success: return Theme.positive
        case .error: return Theme.negative
        }
    }

    private func run() {
        running = true
        let script = source
        let snapshot = chain
        Task.detached(priority: .userInitiated) {
            var working = snapshot
            let lines = ChainScript.run(script, chain: &working)
            let result = working
            await MainActor.run {
                chain = result
                output = lines
                running = false
            }
        }
    }
}

// MARK: - Hash-Spielplatz

private struct HashPanel: View {
    @State private var text = "Hallo"
    @State private var previous = SHA256.hex("Hallo")

    var body: some View {
        let hash = SHA256.hex(text)
        let changed = zip(hash, previous).filter { $0 != $1 }.count
        VStack(alignment: .leading, spacing: Theme.spacing) {
            Card(title: "Tippe etwas", icon: "keyboard") {
                TextField("Text", text: $text)
                    .textFieldStyle(.roundedBorder)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                Text("SHA-256").font(.caption).foregroundStyle(Theme.textSecondary)
                Text(hash)
                    .font(.system(.callout, design: .monospaced))
                    .foregroundStyle(Theme.lavender)
                    .textSelection(.enabled)
                Text("\(changed) von 64 Zeichen haben sich gegenüber dem letzten Stand geändert.")
                    .font(.caption).foregroundStyle(Theme.textSecondary)
                Button("Aktuellen Stand merken") { previous = hash }
                    .buttonStyle(SecondaryButtonStyle())
            }
            InfoHint(text: "Ändere nur einen Buchstaben – etwa die Hälfte aller Zeichen ändert sich (Lawineneffekt). Deshalb kann niemand einen Block unbemerkt verändern.")
        }
    }
}

// MARK: - Sicherheit (Whitepaper-Formel)

private struct SecurityPanel: View {
    @State private var attacker: Double = 25

    private struct Point: Identifiable {
        var id: Int { z }
        let z: Int
        let p: Double
    }

    var body: some View {
        let q = attacker / 100
        let points = (0...12).map { Point(z: $0, p: MiniChain.attackerSuccessProbability(q: q, z: $0)) }
        VStack(alignment: .leading, spacing: Theme.spacing) {
            Card(title: "Wie sicher ist eine Zahlung?", icon: "lock.shield.fill") {
                LabeledSlider(title: "Rechenleistung des Angreifers", value: $attacker, range: 1...49, step: 1) { "\(Int($0)) %" }
                Chart(points) { pt in
                    BarMark(x: .value("Bestätigungen", pt.z), y: .value("Erfolgschance", pt.p))
                        .foregroundStyle(Theme.accentGradient)
                }
                .chartYScale(domain: 0...1)
                .chartYAxis {
                    AxisMarks(values: [0, 0.25, 0.5, 0.75, 1]) { v in
                        AxisGridLine().foregroundStyle(Color.white.opacity(0.08))
                        AxisValueLabel {
                            if let d = v.as(Double.self) { Text(Fmt.pct(d, digits: 0)) }
                        }
                    }
                }
                .frame(height: 200)
                KeyValueRow(label: "Nach 1 Bestätigung", value: Fmt.pct(points[1].p, digits: 2))
                KeyValueRow(label: "Nach 6 Bestätigungen", value: Fmt.pct(points[6].p, digits: 4))
            }
            InfoHint(text: "Die Formel stammt aus Abschnitt 11 des Bitcoin-Whitepapers. Je mehr Blöcke nach deiner Zahlung folgen (Bestätigungen), desto unwahrscheinlicher kann ein Angreifer sie rückgängig machen. Ab 50 % Rechenleistung gewinnt der Angreifer immer.")
        }
    }
}
