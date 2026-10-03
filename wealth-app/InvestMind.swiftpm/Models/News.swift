import Foundation

struct NewsItem: Identifiable {
    enum Sentiment { case positive, neutral, negative }

    let id = UUID()
    let title: String
    let summary: String
    /// Was bedeutet das für mich? – in einfacher Sprache
    let whatItMeans: String
    let source: String
    let hoursAgo: Int
    let relatedAssetIDs: [String]
    let sentiment: Sentiment
}

enum SampleNews {
    static let items: [NewsItem] = [
        NewsItem(
            title: "EZB signalisiert vorsichtige Zinssenkung",
            summary: "Die Europäische Zentralbank deutet an, die Leitzinsen in den kommenden Monaten leicht zu senken.",
            whatItMeans: "Sinkende Zinsen machen Kredite billiger. Das stützt oft Immobilien- und Anleihenkurse, Tagesgeld bringt dagegen weniger.",
            source: "Demo-Feed", hoursAgo: 2,
            relatedAssetIDs: ["reit-res", "reit-office", "gov-bond", "green-bond", "cash"], sentiment: .positive),
        NewsItem(
            title: "Bitcoin erreicht neues Jahreshoch",
            summary: "Starke Zuflüsse in börsengehandelte Krypto-Produkte treiben den Kurs.",
            whatItMeans: "Hohe Kurse ziehen neue Käufer an – aber Krypto kann genauso schnell 30–50 % fallen. Nur Geld einsetzen, dessen Verlust du verkraftest.",
            source: "Demo-Feed", hoursAgo: 4,
            relatedAssetIDs: ["btc", "eth"], sentiment: .positive),
        NewsItem(
            title: "Goldpreis steigt wegen geopolitischer Spannungen",
            summary: "Anleger suchen sichere Häfen, Gold legt zu.",
            whatItMeans: "Gold gilt als Krisenschutz. Es zahlt aber keine Zinsen oder Mieten – der Ertrag kommt nur aus Preisänderungen.",
            source: "Demo-Feed", hoursAgo: 6,
            relatedAssetIDs: ["gold"], sentiment: .positive),
        NewsItem(
            title: "Dürre in Anbaugebieten: Weizen-Futures ziehen an",
            summary: "Ernteprognosen wurden gesenkt, Terminkontrakte auf Weizen steigen deutlich.",
            whatItMeans: "Bäckereien und Lebensmittelhersteller sichern sich mit Futures gegen steigende Preise ab – genau das kannst du im Strategie-Labor üben.",
            source: "Demo-Feed", hoursAgo: 9,
            relatedAssetIDs: ["wheat"], sentiment: .neutral),
        NewsItem(
            title: "Büroimmobilien: Leerstand in Großstädten steigt",
            summary: "Homeoffice verringert die Nachfrage nach Büroflächen.",
            whatItMeans: "Mehr Leerstand = weniger Mieteinnahmen. Wohnimmobilien entwickeln sich derzeit anders als Büros – Streuung hilft.",
            source: "Demo-Feed", hoursAgo: 12,
            relatedAssetIDs: ["reit-office"], sentiment: .negative),
        NewsItem(
            title: "Rekordzubau bei Windkraft in Europa",
            summary: "Neue Ausschreibungen und sinkende Kosten beschleunigen den Ausbau.",
            whatItMeans: "Infrastruktur und Clean-Energy-Anlagen profitieren. Für nachhaltig orientierte Anleger ein relevantes Signal.",
            source: "Demo-Feed", hoursAgo: 20,
            relatedAssetIDs: ["infra", "clean", "copper"], sentiment: .positive),
        NewsItem(
            title: "Ölpreis fällt nach Förderentscheidung",
            summary: "Mehrere Förderländer erhöhen ihre Produktion stärker als erwartet.",
            whatItMeans: "Ein klassisches Spieltheorie-Problem: Jeder Förderer profitiert, wenn nur er mehr fördert – tun es alle, fällt der Preis für alle. Probier es im Strategie-Labor aus.",
            source: "Demo-Feed", hoursAgo: 26,
            relatedAssetIDs: ["oil"], sentiment: .negative),
    ]
}
