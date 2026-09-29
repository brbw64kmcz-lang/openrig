import Foundation

/// Demo-Assets. Namen sind bewusst generisch (keine echten Produkte),
/// alle Zahlen sind Beispielwerte. Echte Daten kommen später über einen
/// lizenzierten Datenanbieter (siehe MarketDataProvider).
enum SampleAssets {

    private struct Spec {
        let id, name, symbol: String
        let cls: AssetClass
        let summary: String
        let price, er, vol, income: Double
        let risk: Int
        /// Reihenfolge: Nachhaltigkeit, Sozial, Innovation, Sicherheit, Einkommen, Liquidität
        let scores: [Double]
        let reasons: [InvestValue: String]
        var course: String? = nil
    }

    private static let specs: [Spec] = [
        Spec(id: "world-etf", name: "Welt-Aktien-ETF", symbol: "WELT", cls: .stocks,
             summary: "Rund 1.500 große Unternehmen aus 23 Industrieländern in einem Produkt.",
             price: 98.40, er: 0.07, vol: 0.15, income: 0.018, risk: 4,
             scores: [0.45, 0.55, 0.60, 0.55, 0.35, 0.95],
             reasons: [.sustainability: "Enthält auch Öl-, Gas- und Rüstungsunternehmen. ESG-Varianten schließen diese aus.",
                       .liquidity: "Börsentäglich handelbar, sehr enge Spannen."]),
        Spec(id: "usa500", name: "USA-500-ETF", symbol: "U500", cls: .stocks,
             summary: "Die 500 größten börsennotierten US-Unternehmen.",
             price: 512.30, er: 0.075, vol: 0.16, income: 0.013, risk: 4,
             scores: [0.35, 0.50, 0.75, 0.50, 0.30, 0.95],
             reasons: [.innovation: "Hoher Anteil großer Technologiekonzerne.",
                       .safety: "Konzentriert auf ein Land und wenige sehr große Firmen."]),
        Spec(id: "clean", name: "Clean-Energy-ETF", symbol: "CLEN", cls: .stocks,
             summary: "Unternehmen aus Solar, Wind, Speicher und Netzen.",
             price: 8.12, er: 0.06, vol: 0.30, income: 0.012, risk: 5,
             scores: [0.92, 0.65, 0.80, 0.30, 0.25, 0.90],
             reasons: [.sustainability: "Direkter Beitrag zur Energiewende; Lieferketten (z. B. Rohstoffabbau) bleiben ein Thema.",
                       .safety: "Stark schwankend, abhängig von Zinsen und Förderpolitik."]),
        Spec(id: "green-bond", name: "Green-Bond-ETF", symbol: "GRBD", cls: .bonds,
             summary: "Anleihen, deren Erlöse in Klima- und Umweltprojekte fließen.",
             price: 46.20, er: 0.03, vol: 0.06, income: 0.028, risk: 2,
             scores: [0.85, 0.65, 0.30, 0.85, 0.60, 0.85],
             reasons: [.sustainability: "Mittelverwendung ist zweckgebunden und wird berichtet.",
                       .safety: "Geringe Schwankung, aber zinsabhängig."]),
        Spec(id: "gov-bond", name: "Euro-Staatsanleihen", symbol: "EGOV", cls: .bonds,
             summary: "Anleihen von Euro-Staaten mit guter Bonität.",
             price: 101.30, er: 0.025, vol: 0.05, income: 0.027, risk: 2,
             scores: [0.50, 0.60, 0.15, 0.90, 0.60, 0.90],
             reasons: [.safety: "Staaten mit hoher Bonität fallen selten aus."]),
        Spec(id: "btc", name: "Bitcoin", symbol: "BTC", cls: .crypto,
             summary: "Erste und größte Kryptowährung. Begrenzte Menge von 21 Mio. Einheiten.",
             price: 58_240, er: 0.10, vol: 0.65, income: 0.0, risk: 7,
             scores: [0.28, 0.45, 0.90, 0.05, 0.00, 0.85],
             reasons: [.sustainability: "Proof-of-Work braucht sehr viel Strom. Der Anteil erneuerbarer Energie beim Mining ist umstritten.",
                       .safety: "Kursrückgänge von über 70 % gab es mehrfach.",
                       .income: "Kein laufender Ertrag – Rendite nur über Kursänderung."],
             course: "crypto-code"),
        Spec(id: "eth", name: "Ethereum", symbol: "ETH", cls: .crypto,
             summary: "Programmierbare Blockchain für Smart Contracts.",
             price: 2_410, er: 0.10, vol: 0.75, income: 0.03, risk: 7,
             scores: [0.62, 0.45, 0.95, 0.05, 0.20, 0.85],
             reasons: [.sustainability: "Seit 2022 Proof-of-Stake – Energieverbrauch um über 99 % gesunken.",
                       .income: "Staking bringt einen variablen Ertrag, mit technischen Risiken."],
             course: "crypto-code"),
        Spec(id: "gold", name: "Gold", symbol: "XAU", cls: .commodities,
             summary: "Klassischer Wertspeicher, Preis je Feinunze.",
             price: 2_180, er: 0.04, vol: 0.15, income: 0.0, risk: 4,
             scores: [0.25, 0.35, 0.10, 0.70, 0.00, 0.85],
             reasons: [.sustainability: "Goldabbau belastet Umwelt stark; Recycling-Gold ist besser.",
                       .safety: "Gilt als Krisenschutz, schwankt aber auch deutlich."]),
        Spec(id: "oil", name: "Öl (Brent)", symbol: "BRENT", cls: .commodities,
             summary: "Rohöl-Referenzsorte aus der Nordsee, Preis je Barrel.",
             price: 78.50, er: 0.03, vol: 0.35, income: 0.0, risk: 6,
             scores: [0.05, 0.30, 0.10, 0.25, 0.00, 0.80],
             reasons: [.sustainability: "Fossiler Energieträger – widerspricht Klimazielen direkt."]),
        Spec(id: "wheat", name: "Weizen", symbol: "WHEAT", cls: .commodities,
             summary: "Agrarrohstoff, Preis je Tonne.",
             price: 218, er: 0.03, vol: 0.28, income: 0.0, risk: 6,
             scores: [0.45, 0.40, 0.10, 0.30, 0.00, 0.70],
             reasons: [.social: "Spekulation auf Nahrungsmittel ist ethisch umstritten."]),
        Spec(id: "copper", name: "Kupfer", symbol: "COPPER", cls: .commodities,
             summary: "Industriemetall, wichtig für Kabel, E-Autos und Netze. Preis je Tonne.",
             price: 8_900, er: 0.045, vol: 0.25, income: 0.0, risk: 5,
             scores: [0.60, 0.35, 0.60, 0.35, 0.00, 0.75],
             reasons: [.sustainability: "Unverzichtbar für die Energiewende, der Abbau selbst ist aber belastend."]),
        Spec(id: "reit-res", name: "Wohnimmobilien-REIT", symbol: "WREIT", cls: .realEstate,
             summary: "Börsennotierte Gesellschaft mit rund 20.000 Mietwohnungen.",
             price: 27.60, er: 0.055, vol: 0.20, income: 0.038, risk: 4,
             scores: [0.55, 0.50, 0.30, 0.55, 0.80, 0.85],
             reasons: [.income: "Mieteinnahmen werden größtenteils ausgeschüttet.",
                       .sustainability: "Hängt stark von der energetischen Sanierung des Bestands ab."]),
        Spec(id: "reit-office", name: "Büroimmobilien-REIT", symbol: "BREIT", cls: .realEstate,
             summary: "Bürogebäude in europäischen Großstädten.",
             price: 18.90, er: 0.045, vol: 0.24, income: 0.052, risk: 5,
             scores: [0.40, 0.45, 0.25, 0.45, 0.85, 0.80],
             reasons: [.safety: "Homeoffice-Trend erhöht Leerstandsrisiko."]),
        Spec(id: "re-crowd", name: "Immobilien-Crowdfunding", symbol: "CROWD", cls: .realEstate,
             summary: "Nachrangdarlehen für einzelne Bauprojekte, feste Laufzeit.",
             price: 100, er: 0.06, vol: 0.12, income: 0.055, risk: 6,
             scores: [0.50, 0.55, 0.35, 0.35, 0.85, 0.10],
             reasons: [.safety: "Nachrangig: Bei Pleite des Projekts droht Totalverlust.",
                       .liquidity: "Meist bis Laufzeitende gebunden."]),
        Spec(id: "pe", name: "Private-Equity-Fonds", symbol: "PEQ", cls: .alternatives,
             summary: "Beteiligungen an nicht-börsennotierten Unternehmen.",
             price: 112, er: 0.08, vol: 0.25, income: 0.0, risk: 6,
             scores: [0.40, 0.45, 0.70, 0.30, 0.10, 0.05],
             reasons: [.liquidity: "Kapital ist oft 7–10 Jahre gebunden."]),
        Spec(id: "infra", name: "Infrastruktur (Windparks)", symbol: "WIND", cls: .alternatives,
             summary: "Beteiligung an Windparks mit langfristigen Stromabnahmeverträgen.",
             price: 54, er: 0.05, vol: 0.12, income: 0.04, risk: 4,
             scores: [0.90, 0.70, 0.60, 0.60, 0.70, 0.50],
             reasons: [.sustainability: "Direkte Erzeugung erneuerbarer Energie.",
                       .income: "Planbare Einnahmen aus Stromverkauf."]),
        Spec(id: "cash", name: "Tagesgeld", symbol: "CASH", cls: .cash,
             summary: "Täglich verfügbares Guthaben, in der EU bis 100.000 € gesetzlich gesichert.",
             price: 1.0, er: 0.02, vol: 0.0, income: 0.02, risk: 1,
             scores: [0.50, 0.50, 0.00, 1.00, 0.50, 1.00],
             reasons: [.safety: "Einlagensicherung bis 100.000 € je Bank und Person.",
                       .sustainability: "Abhängig davon, was die Bank mit dem Geld finanziert."]),
    ]

    static func make() -> [Asset] {
        var rng = SeededGenerator(seed: 42)
        return specs.map { spec -> Asset in
            var scores: [InvestValue: Double] = [:]
            for (i, value) in InvestValue.allCases.enumerated() where i < spec.scores.count {
                scores[value] = spec.scores[i]
            }
            let history = makeHistory(endPrice: spec.price, drift: spec.er, vol: spec.vol, rng: &rng)
            let last = history.count >= 2 ? history[history.count - 2].value : spec.price
            return Asset(
                id: spec.id, name: spec.name, symbol: spec.symbol, assetClass: spec.cls,
                summary: spec.summary, price: spec.price,
                dayChange: last > 0 ? spec.price / last - 1 : 0,
                history: history, expectedReturn: spec.er, volatility: spec.vol,
                incomeYield: spec.income, riskClass: spec.risk,
                valueScores: scores, valueReasons: spec.reasons,
                keyFigures: keyFigures(spec), calculation: calculation(spec),
                requiredCourseID: spec.course)
        }
    }

    /// Erzeugt 12 Monate Tageskurse (rückwärts), die genau beim aktuellen Preis enden.
    private static func makeHistory(endPrice: Double, drift: Double, vol: Double, rng: inout SeededGenerator) -> [PricePoint] {
        let days = 365
        let dt = 1.0 / 365.0
        var values = [Double](repeating: endPrice, count: days)
        var p = endPrice
        for i in stride(from: days - 2, through: 0, by: -1) {
            let shock = rng.normal()
            // Rückwärts: vorheriger Preis = aktueller / Wachstumsfaktor
            let driftPart: Double = (drift - 0.5 * vol * vol) * dt
            let shockPart: Double = vol * sqrt(dt) * shock
            let growth: Double = exp(driftPart + shockPart)
            p = p / growth
            values[i] = p
        }
        let now = Date()
        var points: [PricePoint] = []
        points.reserveCapacity(days)
        for (idx, v) in values.enumerated() {
            let offset: Double = Double(idx - days + 1) * 86_400.0
            points.append(PricePoint(date: now.addingTimeInterval(offset), value: v))
        }
        return points
    }

    // MARK: Kennzahlen je Assetklasse

    private static func keyFigures(_ s: Spec) -> [KeyFigure] {
        var list: [KeyFigure] = [
            KeyFigure(label: "Risikoklasse", value: "\(s.risk) von 7",
                      explanation: "1 = sehr geringes Risiko, 7 = sehr hohes Risiko. Angelehnt an die EU-Skala im Basisinformationsblatt."),
            KeyFigure(label: "Schwankung (Volatilität)", value: Fmt.pct(s.vol, digits: 0),
                      explanation: "So stark schwankt der Wert typischerweise in einem Jahr nach oben oder unten."),
        ]
        switch s.cls {
        case .stocks:
            list.append(KeyFigure(label: "Dividendenrendite", value: Fmt.pct(s.income),
                                  explanation: "Ausschüttung pro Jahr geteilt durch den Kurs."))
            list.append(KeyFigure(label: "Laufende Kosten (TER)", value: "0,20 %",
                                  explanation: "Jährliche Fondskosten, die automatisch vom Wert abgezogen werden."))
        case .realEstate:
            list.append(KeyFigure(label: "Mietrendite", value: Fmt.pct(s.income),
                                  explanation: "Jährliche Mieteinnahmen im Verhältnis zum Kaufpreis."))
            list.append(KeyFigure(label: "Leerstand", value: s.id == "reit-office" ? "11,5 %" : "2,1 %",
                                  explanation: "Anteil der Flächen ohne Mieter."))
            list.append(KeyFigure(label: "Beleihungsquote (LTV)", value: "42 %",
                                  explanation: "Wie viel der Immobilien mit Krediten finanziert ist. Höher = riskanter bei Zinsanstieg."))
        case .crypto:
            list.append(KeyFigure(label: "Konsensverfahren", value: s.id == "btc" ? "Proof of Work" : "Proof of Stake",
                                  explanation: "Regel, nach der sich das Netzwerk auf gültige Blöcke einigt. Im Krypto-Labor kannst du es nachprogrammieren."))
            list.append(KeyFigure(label: "Maximale Menge", value: s.id == "btc" ? "21 Mio." : "unbegrenzt",
                                  explanation: "Begrenzte Menge kann Knappheit erzeugen, garantiert aber keinen Wert."))
        case .commodities:
            list.append(KeyFigure(label: "Terminkurve", value: s.id == "wheat" ? "Backwardation" : "Contango",
                                  explanation: "Contango: spätere Termine teurer als heute (Lagerkosten). Backwardation: umgekehrt, oft bei Knappheit."))
            list.append(KeyFigure(label: "Laufender Ertrag", value: "keiner",
                                  explanation: "Rohstoffe zahlen keine Zinsen oder Dividenden."))
        case .bonds:
            list.append(KeyFigure(label: "Rendite", value: Fmt.pct(s.income),
                                  explanation: "Zinsertrag pro Jahr bezogen auf den aktuellen Kurs."))
            list.append(KeyFigure(label: "Duration", value: "6,8 Jahre",
                                  explanation: "Steigt der Zins um 1 %-Punkt, fällt der Kurs um ungefähr diesen Prozentwert."))
        case .alternatives:
            list.append(KeyFigure(label: "Mindestanlage", value: Fmt.eur(10_000),
                                  explanation: "Viele alternative Anlagen haben hohe Einstiegsbeträge."))
            list.append(KeyFigure(label: "Haltedauer", value: "7–10 Jahre",
                                  explanation: "So lange ist das Geld typischerweise gebunden."))
        case .cash:
            list.append(KeyFigure(label: "Zins", value: Fmt.pct(s.income),
                                  explanation: "Aktueller Tagesgeldzins (variabel)."))
            list.append(KeyFigure(label: "Einlagensicherung", value: Fmt.eur(100_000),
                                  explanation: "Gesetzlich gesichert je Person und Bank in der EU."))
        }
        return list
    }

    // MARK: Rechenweg – macht Kennzahlen nachvollziehbar

    private static func calculation(_ s: Spec) -> [CalculationStep] {
        switch s.cls {
        case .realEstate:
            let price = 300_000.0
            let rent = price * s.income / 12
            return [
                CalculationStep(title: "Beispiel-Wohnung", formula: "Kaufpreis", result: Fmt.eur(price)),
                CalculationStep(title: "Kaltmiete pro Monat", formula: "Kaufpreis × Mietrendite ÷ 12", result: Fmt.eur(rent)),
                CalculationStep(title: "Bruttomietrendite", formula: "(Miete × 12) ÷ Kaufpreis", result: Fmt.pct(s.income)),
                CalculationStep(title: "Nach Kosten (ca. 25 %)", formula: "Bruttorendite × 0,75", result: Fmt.pct(s.income * 0.75)),
            ]
        case .crypto:
            let supply = s.id == "btc" ? 19_700_000.0 : 120_000_000.0
            return [
                CalculationStep(title: "Umlaufmenge", formula: "Anzahl Coins", result: Fmt.compact(supply)),
                CalculationStep(title: "Marktkapitalisierung", formula: "Preis × Umlaufmenge", result: Fmt.num(s.price * supply / 1e9, digits: 0) + " Mrd. €"),
                CalculationStep(title: "Szenario −60 %", formula: "Preis × 0,4", result: Fmt.eur(s.price * 0.4)),
            ]
        case .commodities:
            let r = 0.03, storage = 0.02, t = 0.5
            let fut = s.price * pow(1 + r + storage, t)
            return [
                CalculationStep(title: "Kassapreis heute", formula: "Spot", result: Fmt.num(s.price)),
                CalculationStep(title: "Fairer 6-Monats-Future", formula: "Spot × (1 + Zins + Lagerkosten)^0,5", result: Fmt.num(fut)),
                CalculationStep(title: "Aufschlag (Contango)", formula: "Future ÷ Spot − 1", result: Fmt.pct(fut / s.price - 1, digits: 2)),
            ]
        case .bonds:
            return [
                CalculationStep(title: "Zinsanstieg", formula: "Annahme", result: "+1,0 %-Pkt."),
                CalculationStep(title: "Kursänderung", formula: "− Duration × Zinsänderung", result: "≈ −6,8 %"),
                CalculationStep(title: "Zinsertrag p. a.", formula: "Rendite", result: Fmt.pct(s.income)),
            ]
        case .cash:
            return [
                CalculationStep(title: "Zins", formula: "nominal", result: Fmt.pct(s.income)),
                CalculationStep(title: "Inflation", formula: "Annahme", result: "2,2 %"),
                CalculationStep(title: "Realzins", formula: "Zins − Inflation", result: Fmt.pct(s.income - 0.022, digits: 1)),
            ]
        default:
            let invest = 10_000.0
            return [
                CalculationStep(title: "Anlage", formula: "Beispielbetrag", result: Fmt.eur(invest)),
                CalculationStep(title: "Laufender Ertrag p. a.", formula: "Anlage × Ertragsrendite", result: Fmt.eur(invest * s.income)),
                CalculationStep(title: "Erwarteter Wert in 10 J.", formula: "Anlage × (1 + erwartete Rendite)^10", result: Fmt.eur(invest * pow(1 + s.er, 10))),
                CalculationStep(title: "Schlechtes Jahr (−2σ)", formula: "Anlage × (1 − 2 × Volatilität)", result: Fmt.eur(invest * max(0, 1 - 2 * s.vol))),
            ]
        }
    }
}
