import SwiftUI

/// Gebäudetypen im Immobilien-Labor und ihre Wirkung auf die Umgebung.
enum Building: String, CaseIterable, Identifiable {
    case empty = "Leer"
    case residential = "Wohnhaus"
    case tower = "Wohnturm"
    case office = "Büro"
    case retail = "Handel"
    case park = "Park"
    case school = "Schule"
    case transit = "U-Bahn"
    case industry = "Industrie"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .empty: return "square.dashed"
        case .residential: return "house.fill"
        case .tower: return "building.fill"
        case .office: return "building.2.fill"
        case .retail: return "cart.fill"
        case .park: return "tree.fill"
        case .school: return "graduationcap.fill"
        case .transit: return "tram.fill"
        case .industry: return "smoke.fill"
        }
    }

    var color: Color {
        switch self {
        case .empty: return Color.white.opacity(0.06)
        case .residential: return Theme.blue
        case .tower: return Color(red: 0.25, green: 0.35, blue: 0.95)
        case .office: return Theme.purple
        case .retail: return Theme.lavender
        case .park: return Color(red: 0.30, green: 0.70, blue: 0.55)
        case .school: return Theme.sky
        case .transit: return Color(red: 0.95, green: 0.80, blue: 0.40)
        case .industry: return Theme.gray
        }
    }

    /// Baukosten in Mio. €
    var cost: Double {
        switch self {
        case .empty: return 0
        case .residential: return 4
        case .tower: return 14
        case .office: return 10
        case .retail: return 5
        case .park: return 2
        case .school: return 6
        case .transit: return 12
        case .industry: return 7
        }
    }

    /// Einfluss auf den Wert benachbarter Wohnungen (positiv = steigert Preise)
    var neighborEffect: Double {
        switch self {
        case .empty: return 0
        case .residential: return -0.004
        case .tower: return -0.012
        case .office: return 0.03
        case .retail: return 0.04
        case .park: return 0.08
        case .school: return 0.06
        case .transit: return 0.12
        case .industry: return -0.10
        }
    }

    var isRentable: Bool { self == .residential || self == .tower || self == .office || self == .retail }

    /// Grundhöhe für die 3D-Ansicht
    var baseHeight: Double {
        switch self {
        case .empty: return 0.02
        case .residential: return 0.8
        case .tower: return 2.6
        case .office: return 1.8
        case .retail: return 0.6
        case .park: return 0.08
        case .school: return 0.7
        case .transit: return 0.35
        case .industry: return 1.0
        }
    }

    var explanation: String {
        switch self {
        case .empty: return "Freie Fläche."
        case .residential: return "Wohnraum für ca. 400 Menschen. Viele Wohnungen nebeneinander dämpfen die Preise leicht (mehr Angebot)."
        case .tower: return "Hohe Dichte: 1.200 Bewohner. Mehr Angebot senkt Mieten in der Umgebung."
        case .office: return "600 Arbeitsplätze. Jobs erhöhen die Nachfrage nach Wohnraum."
        case .retail: return "Läden und Cafés machen ein Viertel attraktiver."
        case .park: return "Grünfläche: steigert Lebensqualität und Preise in der Nähe deutlich."
        case .school: return "Wichtig für Familien – erhöht die Nachfrage im Umfeld."
        case .transit: return "Stärkster Preistreiber: gute Anbindung. Senkt außerdem CO₂."
        case .industry: return "Viele Jobs, aber Lärm und Emissionen senken die Preise in der Nähe."
        }
    }
}

struct CityCell: Identifiable {
    let id: Int
    var building: Building
    /// Preis pro m² in €
    var pricePerSqm: Double
}

struct CityStats: Identifiable {
    var id: Int { year }
    let year: Int
    let avgPrice: Double
    let avgRent: Double
    let population: Int
    let jobs: Int
    let vacancy: Double
    let quality: Double
    let co2: Double
}

/// Eigene Investition in eine Wohnung der Stadt
struct CityInvestment {
    let cellID: Int
    let purchasePrice: Double
    let sqm: Double
    let yearBought: Int
    var rentCollected: Double = 0
}

struct CityModel {
    static let size = 8
    static let basePrice = 3_500.0

    private(set) var cells: [CityCell]
    private(set) var year = 0
    private(set) var budget = 60.0
    private(set) var history: [CityStats] = []
    private(set) var investment: CityInvestment?
    /// Bauzins – beeinflusst Preise (höherer Zins = niedrigere Preise)
    var interestRate = 0.035

    init() {
        let n = CityModel.size
        cells = (0..<(n * n)).map { CityCell(id: $0, building: .empty, pricePerSqm: CityModel.basePrice) }
        // Startstadt: kleiner Kern mit Wohnen, Büros, Park und etwas Industrie
        let start: [(Int, Int, Building)] = [
            (2, 2, .residential), (2, 3, .residential), (3, 2, .residential), (3, 3, .office),
            (4, 3, .retail), (4, 2, .residential), (2, 4, .park), (5, 5, .residential),
            (6, 6, .industry), (7, 6, .industry), (1, 1, .residential), (3, 5, .residential),
        ]
        for (x, y, b) in start { cells[y * n + x].building = b }
        recomputePrices(smoothing: 1)
        history = [stats()]
    }

    // MARK: Bauen

    enum PlaceResult { case ok, noBudget, same }

    mutating func place(_ building: Building, at id: Int) -> PlaceResult {
        guard cells.indices.contains(id) else { return .same }
        if cells[id].building == building { return .same }
        let cost = building.cost
        guard cost <= budget else { return .noBudget }
        budget -= cost
        if building == .empty { budget += cells[id].building.cost * 0.3 } // Abriss bringt Restwert
        cells[id].building = building
        if investment?.cellID == id && !building.isRentable { investment = nil }
        recomputePrices(smoothing: 0.35)
        if !history.isEmpty { history[history.count - 1] = stats() }
        return .ok
    }

    // MARK: Nachbarschaft

    func coords(_ id: Int) -> (x: Int, y: Int) { (id % CityModel.size, id / CityModel.size) }

    /// Standortqualität: Summe der Nachbarschaftseffekte, gewichtet nach Entfernung
    func locationScore(_ id: Int) -> Double {
        let (x, y) = coords(id)
        var score = 0.0
        for dy in -2...2 {
            for dx in -2...2 where !(dx == 0 && dy == 0) {
                let nx = x + dx, ny = y + dy
                guard nx >= 0, ny >= 0, nx < CityModel.size, ny < CityModel.size else { continue }
                let d = Double(max(abs(dx), abs(dy)))
                score += cells[ny * CityModel.size + nx].building.neighborEffect / d
            }
        }
        return score
    }

    var population: Int {
        cells.reduce(0) { sum, c in
            switch c.building {
            case .residential: return sum + 400
            case .tower: return sum + 1_200
            default: return sum
            }
        }
    }

    var jobs: Int {
        cells.reduce(0) { sum, c in
            switch c.building {
            case .office: return sum + 600
            case .retail: return sum + 200
            case .industry: return sum + 500
            case .school: return sum + 80
            case .transit: return sum + 40
            default: return sum
            }
        }
    }

    /// Nachfrage nach Wohnraum im Verhältnis zum Angebot (1 = ausgeglichen)
    var demandRatio: Double {
        let workersWanted = Double(jobs) / 0.55
        return max(0.5, min(1.8, workersWanted / Double(max(population, 1))))
    }

    private mutating func recomputePrices(smoothing: Double) {
        let demand = demandRatio
        let rateFactor = 1 + (0.035 - interestRate) * 6
        for i in cells.indices {
            let target = CityModel.basePrice * (1 + locationScore(i)) * (0.7 + 0.3 * demand) * rateFactor
            cells[i].pricePerSqm += (target - cells[i].pricePerSqm) * smoothing
        }
    }

    // MARK: Zeit vergeht

    mutating func advance(years: Int = 1) {
        for _ in 0..<max(years, 1) {
            year += 1
            // Allgemeiner Preistrend (Inflation) + Anpassung an neue Lage
            for i in cells.indices { cells[i].pricePerSqm *= 1.015 }
            recomputePrices(smoothing: 0.3)
            // Steuereinnahmen füllen das Baubudget
            budget += Double(population) / 1_000 * 0.8 + Double(jobs) / 1_000 * 1.2
            if var inv = investment {
                inv.rentCollected += rentPerSqmMonth(inv.cellID) * inv.sqm * 12 * (1 - vacancy)
                investment = inv
            }
            history.append(stats())
        }
    }

    // MARK: Kennzahlen

    func rentPerSqmMonth(_ id: Int) -> Double {
        let yield: Double
        switch cells[id].building {
        case .office: yield = 0.05
        case .retail: yield = 0.055
        default: yield = 0.038
        }
        return cells[id].pricePerSqm * yield / 12
    }

    var vacancy: Double {
        max(0.01, min(0.3, 0.06 - (demandRatio - 1) * 0.1))
    }

    private var rentableIDs: [Int] { cells.indices.filter { cells[$0].building.isRentable } }

    func stats() -> CityStats {
        let ids = rentableIDs
        let avgPrice = ids.isEmpty ? CityModel.basePrice : ids.map { cells[$0].pricePerSqm }.reduce(0, +) / Double(ids.count)
        let avgRent = ids.isEmpty ? 0 : ids.map { rentPerSqmMonth($0) }.reduce(0, +) / Double(ids.count)
        let parks = Double(cells.filter { $0.building == .park }.count)
        let schools = Double(cells.filter { $0.building == .school }.count)
        let transit = Double(cells.filter { $0.building == .transit }.count)
        let industry = Double(cells.filter { $0.building == .industry }.count)
        let plus: Double = parks * 7.0 + schools * 5.0 + transit * 6.0
        let rawQuality: Double = 45.0 + plus - industry * 6.0
        let quality: Double = max(0.0, min(100.0, rawQuality))
        let popLoad: Double = Double(population) / 1_000.0 * 3.0
        let rawCO2: Double = industry * 12.0 + popLoad - transit * 4.0 - parks * 1.5
        let co2: Double = max(0.0, rawCO2)
        return CityStats(year: year, avgPrice: avgPrice, avgRent: avgRent, population: population, jobs: jobs,
                         vacancy: vacancy, quality: quality, co2: co2)
    }

    // MARK: Eigene Investition

    mutating func buy(cellID: Int, sqm: Double = 80) {
        guard cells.indices.contains(cellID), cells[cellID].building.isRentable else { return }
        investment = CityInvestment(cellID: cellID, purchasePrice: cells[cellID].pricePerSqm * sqm,
                                    sqm: sqm, yearBought: year)
    }

    mutating func sellInvestment() { investment = nil }

    func investmentValue() -> Double? {
        guard let inv = investment else { return nil }
        return cells[inv.cellID].pricePerSqm * inv.sqm
    }

    /// Gesamtrendite: Wertänderung + eingenommene Miete (nach 25 % Kosten)
    func investmentReturn() -> Double? {
        guard let inv = investment, let value = investmentValue(), inv.purchasePrice > 0 else { return nil }
        return (value - inv.purchasePrice + inv.rentCollected * 0.75) / inv.purchasePrice
    }
}
