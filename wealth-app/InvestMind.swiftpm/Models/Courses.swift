import Foundation

enum CourseArea: String, CaseIterable, Identifiable {
    case basics = "Grundlagen"
    case sustainability = "Nachhaltigkeit"
    case crypto = "Krypto & Code"
    case realEstate = "Immobilien"
    case commodities = "Rohstoffe"
    case derivatives = "Derivate & Strategie"
    case behavior = "Psychologie"
    var id: String { rawValue }
}

struct QuizQuestion: Hashable {
    let question: String
    let options: [String]
    let correctIndex: Int
    let explanation: String
}

struct Lesson: Identifiable, Hashable {
    let id: String
    let title: String
    let minutes: Int
    let paragraphs: [String]
    /// Optionaler Code, der Schritt für Schritt erklärt wird
    var code: String? = nil
    var quiz: QuizQuestion? = nil
    /// Wo kann man das Gelernte sofort ausprobieren?
    var tryIt: AppSection? = nil
}

struct Course: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let area: CourseArea
    let icon: String
    let lessons: [Lesson]
    var relatedValues: [InvestValue] = []
    var relatedLab: LabArea? = nil
}

enum CourseLibrary {
    static func course(_ id: String) -> Course? { all.first { $0.id == id } }

    static let all: [Course] = [basics, sustainability, cryptoCode, realEstate, commodities, derivatives, behavior]

    // MARK: Grundlagen

    static let basics = Course(
        id: "basics", title: "Geld anlegen – die Grundlagen",
        subtitle: "Zinseszins, Risiko, Streuung, Kosten", area: .basics, icon: "graduationcap.fill",
        lessons: [
            Lesson(id: "basics-1", title: "Der Zinseszins", minutes: 3, paragraphs: [
                "Wenn dein Geld Ertrag bringt und du den Ertrag wieder anlegst, bekommst du beim nächsten Mal Ertrag auf den Ertrag. Das nennt man Zinseszins.",
                "Beispiel: 10.000 € mit 6 % pro Jahr sind nach 10 Jahren rund 17.900 €, nach 30 Jahren rund 57.400 €. Die Zeit ist der wichtigste Faktor – nicht der Betrag.",
                "Formel: Endwert = Startbetrag × (1 + Rendite) ^ Jahre",
            ], quiz: QuizQuestion(
                question: "Was hat beim Zinseszins meist die größte Wirkung?",
                options: ["Die Anlagedauer", "Die Uhrzeit des Kaufs", "Die Farbe der App"],
                correctIndex: 0,
                explanation: "Je länger das Geld arbeitet, desto stärker wächst es – der Effekt ist exponentiell."),
                   tryIt: .simulator),
            Lesson(id: "basics-2", title: "Risiko und Rendite", minutes: 3, paragraphs: [
                "Höhere mögliche Rendite bedeutet fast immer höheres Risiko. Wer 10 % pro Jahr erwartet, muss auch mit Jahren von −30 % leben können.",
                "Die Volatilität beschreibt, wie stark eine Anlage schwankt. Aktien: etwa 15 % pro Jahr, Bitcoin: 60 % und mehr, Tagesgeld: fast 0 %.",
                "Frage dich immer: Würde ich ruhig schlafen, wenn mein Depot morgen ein Drittel weniger wert ist?",
            ], quiz: QuizQuestion(
                question: "Eine Anlage verspricht hohe Rendite ohne Risiko. Was ist die beste Reaktion?",
                options: ["Sofort alles investieren", "Skeptisch sein – das gibt es nicht", "Freunde überzeugen"],
                correctIndex: 1,
                explanation: "Rendite ist immer die Belohnung für ein Risiko. Versprechen ohne Risiko sind ein Warnsignal für Betrug."),
                   tryIt: .simulator),
            Lesson(id: "basics-3", title: "Streuung (Diversifikation)", minutes: 2, paragraphs: [
                "Lege nicht alle Eier in einen Korb. Wenn du viele verschiedene Anlagen besitzt, gleichen sich Verluste einzelner Anlagen teilweise aus.",
                "Ein Welt-ETF streut bereits über rund 1.500 Unternehmen. Zusätzlich können Immobilien, Anleihen oder Rohstoffe das Depot stabilisieren.",
            ], quiz: QuizQuestion(
                question: "Warum senkt Streuung das Risiko?",
                options: ["Weil alle Anlagen immer gleichzeitig steigen", "Weil sich Schwankungen unterschiedlicher Anlagen teilweise ausgleichen", "Weil der Staat es garantiert"],
                correctIndex: 1,
                explanation: "Anlagen bewegen sich nicht perfekt gleich. Dadurch schwankt die Summe weniger als die Einzelteile."),
                   tryIt: .portfolio),
        ])

    // MARK: Nachhaltigkeit

    static let sustainability = Course(
        id: "sustainability", title: "Nachhaltig investieren",
        subtitle: "ESG verstehen und Greenwashing erkennen", area: .sustainability, icon: "leaf.fill",
        lessons: [
            Lesson(id: "sus-1", title: "Was bedeutet ESG?", minutes: 3, paragraphs: [
                "E steht für Environment (Umwelt), S für Social (Soziales), G für Governance (gute Unternehmensführung).",
                "Ein ESG-Rating bewertet, wie ein Unternehmen oder eine Anlage mit diesen Themen umgeht. Verschiedene Anbieter kommen dabei oft zu unterschiedlichen Ergebnissen.",
            ], quiz: QuizQuestion(
                question: "Wofür steht das „G“ in ESG?",
                options: ["Gewinn", "Governance – gute Unternehmensführung", "Gold"],
                correctIndex: 1,
                explanation: "Governance meint z. B. unabhängige Kontrolle, faire Vergütung und keine Korruption.")),
            Lesson(id: "sus-2", title: "So berechnen wir deine Passung", minutes: 2, paragraphs: [
                "Jedes Asset bekommt pro Wert eine Punktzahl von 0 bis 100 %. Beispiel: Ethereum erhält bei Nachhaltigkeit 62 %, weil es seit 2022 kaum noch Strom verbraucht; Bitcoin 28 %, weil Mining viel Energie braucht.",
                "Deine Passung = 80 % Durchschnitt deiner gewählten Werte + 20 % Passung zu deiner Risikobereitschaft.",
                "Wichtig: Die Punktzahlen sind in dieser Version Beispielwerte. Später kommen sie von unabhängigen Datenanbietern – mit Quelle.",
            ], tryIt: .dashboard),
            Lesson(id: "sus-3", title: "Greenwashing erkennen", minutes: 3, paragraphs: [
                "Greenwashing heißt: Etwas wird grüner dargestellt, als es ist. Ein Fonds mit „Klima“ im Namen kann trotzdem Ölkonzerne enthalten.",
                "Prüfe: Welche Ausschlüsse gibt es? Wird die Wirkung gemessen? Gibt es unabhängige Prüfungen? In der EU hilft die Einordnung nach Artikel 8 oder 9 der Offenlegungsverordnung (SFDR).",
            ], quiz: QuizQuestion(
                question: "Ein Fonds heißt „Green Future“. Was folgt daraus sicher?",
                options: ["Er ist garantiert nachhaltig", "Nichts – der Name allein sagt wenig", "Er hat keine Kosten"],
                correctIndex: 1,
                explanation: "Entscheidend ist der Inhalt des Fonds, nicht sein Name.")),
        ],
        relatedValues: [.sustainability, .social])

    // MARK: Krypto & Code (Pflicht vor dem Krypto-Handel)

    static let cryptoCode = Course(
        id: "crypto-code", title: "Code verstehen: So funktioniert Bitcoin",
        subtitle: "Hashes, Blöcke, Mining, Sicherheit – mit echtem Code", area: .crypto, icon: "chevron.left.forwardslash.chevron.right",
        lessons: [
            Lesson(id: "cc-1", title: "Was ist ein Hash?", minutes: 4, paragraphs: [
                "Ein Hash ist ein digitaler Fingerabdruck. Aus beliebigem Text wird eine feste Zeichenkette aus 64 Zeichen.",
                "Ändert man nur ein Zeichen im Text, ändert sich der ganze Hash. Aus dem Hash kann man den Text nicht zurückrechnen.",
                "Bitcoin nutzt die Hash-Funktion SHA-256. Im Krypto-Labor läuft eine vollständige SHA-256-Implementierung, die du dir ansehen kannst.",
            ], code: """
            let text = "Hallo"
            let fingerprint = SHA256.hex(text)
            print(fingerprint)
            // 753692ec36adb4c794c973945eb2a99c1649703ea6f76bf259abb4fb838e013e
            """, quiz: QuizQuestion(
                question: "Was passiert mit dem Hash, wenn du ein Zeichen im Text änderst?",
                options: ["Nur das letzte Zeichen ändert sich", "Der Hash ändert sich komplett", "Nichts"],
                correctIndex: 1,
                explanation: "Das nennt man Lawineneffekt. Deshalb fallen Manipulationen sofort auf."),
                   tryIt: .cryptoLab),
            Lesson(id: "cc-2", title: "Blöcke und die Kette", minutes: 4, paragraphs: [
                "Ein Block enthält Transaktionen und den Hash des vorherigen Blocks. So entsteht eine Kette.",
                "Ändert jemand einen alten Block, ändert sich sein Hash – und der nächste Block zeigt plötzlich auf einen falschen Vorgänger. Die Kette ist ungültig.",
            ], code: """
            struct Block {
                let index: Int
                let data: String
                let previousHash: String
                var nonce: Int
                var hash: String {
                    SHA256.hex("\\(index)|\\(data)|\\(previousHash)|\\(nonce)")
                }
            }
            """, quiz: QuizQuestion(
                question: "Warum enthält jeder Block den Hash des vorherigen Blocks?",
                options: ["Um Speicher zu sparen", "Damit Manipulationen an alten Blöcken auffallen", "Aus Tradition"],
                correctIndex: 1,
                explanation: "Die Verkettung macht nachträgliche Änderungen sichtbar."),
                   tryIt: .cryptoLab),
            Lesson(id: "cc-3", title: "Mining und Proof of Work", minutes: 5, paragraphs: [
                "Miner suchen eine Zahl (Nonce), sodass der Hash des Blocks mit einer bestimmten Anzahl Nullen beginnt. Das geht nur durch Ausprobieren.",
                "Jede zusätzliche Null (im Hex-Format) macht die Suche im Schnitt 16-mal aufwendiger. Diese Arbeit schützt das Netzwerk – und kostet viel Strom.",
            ], code: """
            var block = Block(index: 1, data: "Alice → Bob: 5", previousHash: prev, nonce: 0)
            while !block.hash.hasPrefix("000") {
                block.nonce += 1
            }
            print("Gefunden! Nonce:", block.nonce)
            """, quiz: QuizQuestion(
                question: "Die Schwierigkeit steigt von 3 auf 4 führende Nullen. Wie viel mehr Versuche braucht man im Schnitt?",
                options: ["Doppelt so viele", "16-mal so viele", "Gleich viele"],
                correctIndex: 1,
                explanation: "Ein Hex-Zeichen hat 16 mögliche Werte. Jede weitere Null teilt die Chance durch 16."),
                   tryIt: .cryptoLab),
            Lesson(id: "cc-4", title: "Sicherheit und der 51-%-Angriff", minutes: 4, paragraphs: [
                "Wer mehr als die Hälfte der Rechenleistung besitzt, könnte eine alternative Kette schneller verlängern als alle anderen.",
                "Satoshi Nakamoto hat im Bitcoin-Whitepaper berechnet, wie unwahrscheinlich ein erfolgreicher Angriff wird, je mehr Bestätigungen (Blöcke) abgewartet werden. Im Labor kannst du diese Formel ausführen: attack 30 6",
                "Für dich als Anleger heißt das: Sicherheit hängt an Rechenleistung, Software und vor allem deinem privaten Schlüssel. Wer den Schlüssel verliert, verliert die Coins.",
            ], quiz: QuizQuestion(
                question: "Was schützt deine Coins am meisten?",
                options: ["Ein geheimer privater Schlüssel, den nur du kennst", "Ein schönes Passwort-Foto", "Der Kurs"],
                correctIndex: 0,
                explanation: "Wer den privaten Schlüssel hat, kontrolliert die Coins. Teile ihn nie."),
                   tryIt: .cryptoLab),
        ],
        relatedValues: [.innovation], relatedLab: .crypto)

    // MARK: Immobilien

    static let realEstate = Course(
        id: "real-estate", title: "Immobilien verstehen",
        subtitle: "Mietrendite, Lage, Finanzierung, REITs", area: .realEstate, icon: "building.2.fill",
        lessons: [
            Lesson(id: "re-1", title: "Mietrendite berechnen", minutes: 3, paragraphs: [
                "Die Mietrendite zeigt, wie viel Ertrag eine Immobilie im Verhältnis zum Kaufpreis bringt.",
                "Bruttomietrendite = Jahreskaltmiete ÷ Kaufpreis. Beispiel: 12.000 € Miete ÷ 300.000 € = 4 %.",
                "Nach Kosten (Verwaltung, Instandhaltung, Leerstand) bleiben oft nur 70–80 % davon übrig.",
            ], quiz: QuizQuestion(
                question: "Welche Aussage ist korrekt?",
                options: ["Die Mietrendite ist der Gewinn nach Steuern", "Die Mietrendite zeigt den jährlichen Ertrag im Verhältnis zum Kaufpreis", "Die Mietrendite ist immer höher als die Preissteigerung"],
                correctIndex: 1,
                explanation: "Sie ist eine einfache Vergleichszahl – Kosten und Steuern sind noch nicht abgezogen."),
                   tryIt: .realEstateLab),
            Lesson(id: "re-2", title: "Lage, Lage, Lage", minutes: 3, paragraphs: [
                "Der Wert einer Immobilie hängt stark von ihrer Umgebung ab: Parks, Schulen, Nahverkehr und Arbeitsplätze erhöhen ihn; Industrie und Lärm senken ihn.",
                "Im Immobilien-Labor baust du eine Stadt und siehst, wie sich Preise über Jahre verändern, wenn z. B. eine neue U-Bahn-Station entsteht.",
            ], tryIt: .realEstateLab),
            Lesson(id: "re-3", title: "Hebel durch Kredit", minutes: 3, paragraphs: [
                "Mit einem Kredit kaufst du mehr Immobilie, als du Eigenkapital hast. Steigt der Wert, steigt deine Eigenkapitalrendite stark. Fällt er, verlierst du überproportional.",
                "Beispiel: 60.000 € Eigenkapital, 240.000 € Kredit. Wert +10 % = +30.000 € = +50 % auf dein Eigenkapital. Wert −10 % = −50 %.",
            ], quiz: QuizQuestion(
                question: "Was macht ein Kredit mit dem Risiko?",
                options: ["Er verringert es", "Er verstärkt Gewinne und Verluste", "Er hat keinen Einfluss"],
                correctIndex: 1,
                explanation: "Das nennt man Hebel oder Leverage.")),
        ],
        relatedValues: [.income, .social], relatedLab: .realEstate)

    // MARK: Rohstoffe

    static let commodities = Course(
        id: "commodities", title: "Rohstoffe & Futures",
        subtitle: "Spot, Terminmarkt, Absicherung", area: .commodities, icon: "cube.fill",
        lessons: [
            Lesson(id: "co-1", title: "Kassa- und Terminmarkt", minutes: 3, paragraphs: [
                "Am Kassamarkt (Spot) wird sofort geliefert und bezahlt. Am Terminmarkt vereinbart man heute einen Preis für eine Lieferung in der Zukunft – das ist ein Future.",
                "Ein Bauer kann so heute schon den Preis für seine Ernte festlegen. Eine Bäckerei kann sich gegen steigende Mehlpreise schützen.",
            ], quiz: QuizQuestion(
                question: "Was ist ein Future?",
                options: ["Eine Aktie eines Zukunftsunternehmens", "Ein Vertrag über Kauf/Verkauf zu einem heute festgelegten Preis in der Zukunft", "Eine Kryptowährung"],
                correctIndex: 1,
                explanation: "Beide Seiten sind verpflichtet, zu erfüllen – anders als bei einer Option."),
                   tryIt: .strategyLab),
            Lesson(id: "co-2", title: "Hedging – sich absichern", minutes: 4, paragraphs: [
                "Hedging heißt: Ein bestehendes Risiko durch eine Gegenposition verringern. Die Bäckerei kauft Weizen-Futures; steigt der Weizenpreis, gewinnt der Future und gleicht die höheren Einkaufskosten aus.",
                "Ziel ist nicht maximaler Gewinn, sondern planbare Kosten. Im Hedging-Spiel des Strategie-Labors probierst du verschiedene Absicherungsquoten aus.",
            ], tryIt: .strategyLab),
        ],
        relatedValues: [.safety], relatedLab: .strategy)

    // MARK: Derivate & Spieltheorie

    static let derivatives = Course(
        id: "derivatives", title: "Optionen & Spieltheorie",
        subtitle: "Call, Put, Hebel und strategisches Denken", area: .derivatives, icon: "checkerboard.rectangle",
        lessons: [
            Lesson(id: "de-1", title: "Call und Put", minutes: 4, paragraphs: [
                "Eine Call-Option gibt dir das Recht (nicht die Pflicht), etwas zu einem festen Preis (Basispreis) zu kaufen. Ein Put gibt das Recht zu verkaufen.",
                "Als Käufer einer Option ist dein Verlust auf die gezahlte Prämie begrenzt. Als Verkäufer (Stillhalter) kann der Verlust sehr groß werden.",
            ], quiz: QuizQuestion(
                question: "Du kaufst einen Call. Was ist dein maximaler Verlust?",
                options: ["Unbegrenzt", "Die gezahlte Prämie", "Der Basispreis"],
                correctIndex: 1,
                explanation: "Verfällt die Option wertlos, verlierst du nur die Prämie."),
                   tryIt: .strategyLab),
            Lesson(id: "de-2", title: "Das Nash-Gleichgewicht", minutes: 4, paragraphs: [
                "In der Spieltheorie ist ein Nash-Gleichgewicht eine Situation, in der kein Spieler sich verbessern kann, wenn er allein seine Strategie ändert.",
                "Beispiel Ölförderung: Fördern beide Länder weniger, ist der Preis hoch – gut für beide. Aber jedes Land hat den Anreiz, heimlich mehr zu fördern. Am Ende fördern beide mehr, und der Preis fällt. Das Gleichgewicht ist nicht das beste Ergebnis für alle.",
            ], quiz: QuizQuestion(
                question: "Ist ein Nash-Gleichgewicht immer das beste Ergebnis für alle?",
                options: ["Ja, immer", "Nein – oft gibt es ein besseres Ergebnis, das aber nicht stabil ist", "Es gibt keine Gleichgewichte"],
                correctIndex: 1,
                explanation: "Das Gefangenendilemma ist das bekannteste Beispiel dafür."),
                   tryIt: .strategyLab),
            Lesson(id: "de-3", title: "Wiederholte Spiele: Vertrauen lohnt sich", minutes: 3, paragraphs: [
                "Wird ein Spiel oft wiederholt, lohnt sich Kooperation. Die Strategie „Wie du mir, so ich dir“ (Tit for Tat) war in berühmten Computer-Turnieren sehr erfolgreich.",
                "Märkte sind wiederholte Spiele: Ruf, Vertrauen und Verlässlichkeit zahlen sich langfristig aus.",
            ], tryIt: .strategyLab),
        ],
        relatedValues: [.innovation], relatedLab: .strategy)

    // MARK: Psychologie

    static let behavior = Course(
        id: "behavior", title: "Denkfehler beim Investieren",
        subtitle: "Selbstüberschätzung, Herdentrieb, Verlustangst", area: .behavior, icon: "brain.head.profile",
        lessons: [
            Lesson(id: "be-1", title: "Selbstüberschätzung", minutes: 3, paragraphs: [
                "Die meisten Menschen halten sich für überdurchschnittlich gute Anleger – das kann rechnerisch nicht für alle stimmen.",
                "Folge: zu viel Handeln, zu wenig Streuung, höhere Kosten. Gegenmittel: Regeln vorher festlegen und Ergebnisse ehrlich messen.",
            ], quiz: QuizQuestion(
                question: "Was hilft gegen Selbstüberschätzung?",
                options: ["Öfter handeln", "Vorher festgelegte Regeln und ehrliches Messen", "Nur auf das Bauchgefühl hören"],
                correctIndex: 1,
                explanation: "Wer Entscheidungen dokumentiert, sieht später, was wirklich funktioniert hat.")),
            Lesson(id: "be-2", title: "Herdentrieb und FOMO", minutes: 2, paragraphs: [
                "FOMO (Fear of Missing Out) ist die Angst, etwas zu verpassen. Steigt ein Kurs stark, kaufen viele – oft kurz vor dem Rückgang.",
                "Frag dich: Würde ich das auch kaufen, wenn niemand darüber spricht?",
            ]),
            Lesson(id: "be-3", title: "Verlustaversion", minutes: 2, paragraphs: [
                "Verluste schmerzen etwa doppelt so stark, wie gleich große Gewinne freuen. Deshalb halten viele Verlierer zu lange und verkaufen Gewinner zu früh.",
                "Ein fester Plan (z. B. Sparplan und jährliches Rebalancing) nimmt Emotionen aus der Entscheidung.",
            ]),
        ],
        relatedValues: [.safety])
}
