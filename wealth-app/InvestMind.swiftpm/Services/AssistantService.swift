import Foundation

/// Schnittstelle für den KI-Assistenten.
/// Heute: regelbasiert und offline (keine Daten verlassen das Gerät).
/// Später: ein Sprachmodell über einen eigenen Server – mit Leitplanken
/// (keine individuelle Anlageberatung, Quellen nennen, Risiken erklären).
protocol AssistantProvider {
    func answer(_ question: String, context: AssistantContext) -> AssistantReply
}

struct AssistantContext {
    let profile: UserProfile
    let totalValue: Double
    let allocation: [PortfolioStore.Slice]
    let learningProgress: Double
}

struct AssistantReply {
    let text: String
    /// Vorschlag, wo man weitermachen kann
    let suggestion: AppSection?
}

struct RuleBasedAssistant: AssistantProvider {
    func answer(_ question: String, context: AssistantContext) -> AssistantReply {
        let q = question.lowercased()
        let name = context.profile.name.isEmpty ? "" : ", \(context.profile.name)"

        if q.contains("zins") {
            return AssistantReply(
                text: "Gute Frage\(name)! Sinkende Zinsen machen Kredite günstiger. Das stützt oft Immobilien und bestehende Anleihen, während Tagesgeld weniger bringt. Steigende Zinsen wirken umgekehrt. Im Immobilien-Labor kannst du den Bauzins verändern und die Wirkung auf Preise direkt sehen.",
                suggestion: .realEstateLab)
        }
        if q.contains("immobil") || q.contains("miete") || q.contains("wohnung") {
            let share = context.allocation.first { $0.assetClass == .realEstate }?.share ?? 0
            return AssistantReply(
                text: "Immobilien machen aktuell \(Fmt.pct(share, digits: 0)) deines Depots aus. Chancen: laufende Mieteinnahmen und Inflationsschutz. Risiken: Zinsanstieg, Leerstand, bei Direktkauf geringe Streuung und hoher Kapitalbedarf. Die wichtigste Kennzahl zum Einstieg ist die Mietrendite = Jahresmiete ÷ Kaufpreis.",
                suggestion: .realEstateLab)
        }
        if q.contains("krypto") || q.contains("bitcoin") || q.contains("ethereum") {
            return AssistantReply(
                text: "Krypto ist die schwankungsreichste Assetklasse – Rückgänge von über 70 % gab es mehrfach. Bevor du handelst, empfehle ich den Kurs „Code verstehen“: Dort programmierst du selbst eine Mini-Blockchain und verstehst, was Mining und Sicherheit bedeuten.",
                suggestion: .cryptoLab)
        }
        if q.contains("nachhalt") || q.contains("esg") || q.contains("grün") || q.contains("klima") {
            return AssistantReply(
                text: "Bei jedem Asset zeigen wir dir, zu wie viel Prozent es zu deinen Werten passt – inklusive Begründung. Beispiele: Windpark-Infrastruktur 90 %, Green Bonds 85 %, Bitcoin 28 % (hoher Energieverbrauch). Achte auf Greenwashing: Der Name eines Fonds allein sagt wenig.",
                suggestion: .learn)
        }
        if q.contains("rohstoff") || q.contains("gold") || q.contains("öl") || q.contains("weizen") || q.contains("future") || q.contains("option") {
            return AssistantReply(
                text: "Rohstoffe zahlen keine Zinsen oder Mieten – ihr Ertrag kommt aus Preisänderungen. Mit Futures kann man Preise absichern (Hedging), mit Optionen Chancen nutzen und das Risiko begrenzen. Im Strategie-Labor kannst du beides gefahrlos ausprobieren.",
                suggestion: .strategyLab)
        }
        if q.contains("risiko") || q.contains("verlust") || q.contains("crash") {
            return AssistantReply(
                text: "Dein Profil: \(context.profile.riskLabel) (\(context.profile.riskTolerance)/7). Teste im Simulator den Crash-Test mit −30 %: Wenn dich das Ergebnis nervös macht, ist deine Strategie vermutlich zu riskant.",
                suggestion: .simulator)
        }
        if q.contains("ziel") || q.contains("sparen") || q.contains("sparrate") {
            return AssistantReply(
                text: "Unter „Ziele & Strategie“ siehst du für jedes Ziel, ob du auf Kurs bist und welche Sparrate nötig wäre. Faustregel: Zeit schlägt Betrag – früh anfangen wirkt stärker als später viel einzahlen.",
                suggestion: .goals)
        }
        if q.contains("portfolio") || q.contains("depot") || q.contains("markt") {
            let top = context.allocation.first.map { "\($0.assetClass.rawValue) (\(Fmt.pct($0.share, digits: 0)))" } ?? "–"
            return AssistantReply(
                text: "Dein Depot ist aktuell \(Fmt.eur(context.totalValue)) wert. Größte Position: \(top). Eine breite Streuung über mehrere Assetklassen senkt das Risiko, dass eine einzelne Entwicklung dein Vermögen stark trifft.",
                suggestion: .portfolio)
        }
        return AssistantReply(
            text: "Das kann ich in dieser Version noch nicht genau beantworten. Frag mich zum Beispiel nach Zinsen, Immobilien, Krypto, Nachhaltigkeit, Rohstoffen, Risiko oder deinen Zielen. Wichtig: Ich gebe Erklärungen, keine persönliche Anlageberatung.",
            suggestion: .learn)
    }
}
