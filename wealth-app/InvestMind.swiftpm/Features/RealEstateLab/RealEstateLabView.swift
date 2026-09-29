import SwiftUI
import SceneKit
import Charts

/// Immobilien-Labor: Stadt bauen, Zeit vorspulen, Preise & Mieten beobachten, selbst investieren.
struct RealEstateLabView: View {
    @State private var city = CityModel()
    @State private var cityScene = CityScene()
    @State private var tool: Building? = .residential
    @State private var selected: Int?
    @State private var heatmap = false
    @State private var notice: String?
    @State private var version = 0

    var body: some View {
        Screen(title: "Immobilien-Labor", subtitle: "Baue eine Stadt und sieh, wie Preise und Mieten reagieren.", badge: .simulation) {
            scene3D
            toolbox
            grid
            if let selected { cellInfo(selected) }
            timeControls
            statsCard
            priceChart
            investmentCard
            InfoHint(text: "So rechnet das Modell: Jedes Gebäude wirkt auf die Nachbarschaft (Radius 2). U-Bahn +12 %, Park +8 %, Schule +6 %, Industrie −10 % – schwächer mit zunehmender Entfernung. Dazu kommen Nachfrage (Jobs im Verhältnis zu Wohnraum) und Zinsen. Das Modell ist bewusst einfach, damit du die Zusammenhänge nachvollziehen kannst.")
        }
        .onAppear { refresh() }
        .onChange(of: version) { _, _ in refresh() }
        .onChange(of: heatmap) { _, _ in refresh() }
    }

    private func refresh() {
        cityScene.update(model: city, heatmap: heatmap, selected: selected, owned: city.investment?.cellID)
    }

    private func changed() { version += 1 }

    // MARK: 3D

    private var scene3D: some View {
        Card(title: "Deine Stadt – Jahr \(city.year)", icon: "cube.transparent") {
            SceneView(scene: cityScene.scene, pointOfView: cityScene.cameraNode,
                      options: [.allowsCameraControl, .autoenablesDefaultLighting])
                .frame(height: 320)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            Toggle("Heatmap: Preise pro m²", isOn: $heatmap).tint(Theme.purple)
            Text("Mit zwei Fingern drehen und zoomen.").font(.caption).foregroundStyle(Theme.textTertiary)
        }
    }

    // MARK: Werkzeuge

    private var toolbox: some View {
        Card(title: "Bauen", icon: "hammer.fill", trailing: "Budget \(Fmt.num(city.budget, digits: 1)) Mio. €") {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    toolButton(nil, label: "Ansehen", icon: "hand.point.up.left.fill", color: Theme.gray)
                    ForEach(Building.allCases.filter { $0 != .empty }) { b in
                        toolButton(b, label: "\(b.rawValue)\n\(Fmt.num(b.cost, digits: 0)) Mio.", icon: b.icon, color: b.color)
                    }
                    toolButton(.empty, label: "Abreißen", icon: "trash.fill", color: Theme.negative)
                }
            }
            if let tool, tool != .empty {
                Text(tool.explanation).font(.caption).foregroundStyle(Theme.textSecondary)
            }
            if let notice {
                Text(notice).font(.caption.bold()).foregroundStyle(Theme.warning)
            }
        }
    }

    private func toolButton(_ b: Building?, label: String, icon: String, color: Color) -> some View {
        let on = tool == b
        return Button {
            tool = b
            notice = nil
        } label: {
            VStack(spacing: 4) {
                Image(systemName: icon).font(.title3)
                Text(label).font(.caption2).multilineTextAlignment(.center)
            }
            .foregroundStyle(on ? Color.white : Theme.textSecondary)
            .frame(width: 76, height: 64)
            .background(RoundedRectangle(cornerRadius: 12).fill(on ? color.opacity(0.8) : Theme.cardRaised.opacity(0.6)))
        }
        .buttonStyle(.plain)
    }

    // MARK: Raster

    private var grid: some View {
        let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: CityModel.size)
        return Card(title: "Stadtplan", icon: "square.grid.3x3.fill") {
            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(city.cells) { cell in
                    Button { tap(cell.id) } label: {
                        ZStack {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(cell.building.color.opacity(cell.building == .empty ? 1 : 0.85))
                            Image(systemName: cell.building == .empty ? "plus" : cell.building.icon)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(cell.building == .empty ? Theme.textTertiary : Color.white)
                            if city.investment?.cellID == cell.id {
                                Circle().fill(Theme.positive).frame(width: 8, height: 8)
                                    .offset(x: 12, y: -12)
                            }
                        }
                        .aspectRatio(1, contentMode: .fit)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(selected == cell.id ? Color.white : Color.clear, lineWidth: 2)
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Feld \(cell.id + 1): \(cell.building.rawValue)")
                }
            }
            .frame(maxWidth: 520)
            Text(tool == nil ? "Tippe auf ein Feld, um Details zu sehen." : "Tippe auf ein Feld, um dort zu bauen.")
                .font(.caption).foregroundStyle(Theme.textTertiary)
        }
    }

    private func tap(_ id: Int) {
        selected = id
        if let tool {
            switch city.place(tool, at: id) {
            case .ok: notice = nil
            case .noBudget: notice = "Nicht genug Budget. Spule Zeit vor – Steuereinnahmen füllen das Budget."
            case .same: break
            }
        }
        changed()
    }

    // MARK: Feld-Details

    private func cellInfo(_ id: Int) -> some View {
        let cell = city.cells[id]
        let score = city.locationScore(id)
        return Card(title: "Feld \(id + 1): \(cell.building.rawValue)", icon: cell.building.icon) {
            KeyValueRow(label: "Preis pro m²", value: Fmt.eur(cell.pricePerSqm))
            if cell.building.isRentable {
                KeyValueRow(label: "Kaltmiete pro m²/Monat", value: Fmt.eur(city.rentPerSqmMonth(id), digits: 2))
                KeyValueRow(label: "80-m²-Wohnung kostet", value: Fmt.eur(cell.pricePerSqm * 80))
            }
            KeyValueRow(label: "Lage-Effekt", value: Fmt.pct(score, sign: true),
                        valueColor: score >= 0 ? Theme.positive : Theme.negative)
            Text(cell.building.explanation).font(.caption).foregroundStyle(Theme.textSecondary)
            if cell.building.isRentable && city.investment == nil {
                Button("Hier eine 80-m²-Wohnung kaufen (simuliert)") {
                    city.buy(cellID: id)
                    changed()
                }
                .buttonStyle(SecondaryButtonStyle())
            }
        }
    }

    // MARK: Zeit

    private var timeControls: some View {
        Card(title: "Zeit & Zinsen", icon: "clock.arrow.circlepath") {
            HStack(spacing: 10) {
                Button("+1 Jahr") { city.advance(years: 1); changed() }
                    .buttonStyle(PrimaryButtonStyle())
                Button("+5 Jahre") { city.advance(years: 5); changed() }
                    .buttonStyle(SecondaryButtonStyle())
            }
            LabeledSlider(title: "Bauzins", value: $city.interestRate, range: 0.01...0.07, step: 0.0025) { Fmt.pct($0, digits: 2) }
            Text("Höhere Zinsen machen Kredite teurer – Käufer können weniger zahlen, Preise sinken (wirkt ab dem nächsten Jahr).")
                .font(.caption).foregroundStyle(Theme.textTertiary)
        }
    }

    // MARK: Kennzahlen

    private var statsCard: some View {
        let s = city.stats()
        return LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
            StatTile(title: "Ø Preis pro m²", value: Fmt.eur(s.avgPrice))
            StatTile(title: "Ø Miete pro m²", value: Fmt.eur(s.avgRent, digits: 2))
            StatTile(title: "Mietrendite (brutto)", value: Fmt.pct(grossYield(s)))
            StatTile(title: "Einwohner", value: Fmt.num(Double(s.population), digits: 0))
            StatTile(title: "Arbeitsplätze", value: Fmt.num(Double(s.jobs), digits: 0))
            StatTile(title: "Leerstand", value: Fmt.pct(s.vacancy))
            StatTile(title: "Lebensqualität", value: "\(Int(s.quality)) / 100")
            StatTile(title: "CO₂-Index", value: Fmt.num(s.co2, digits: 0), caption: "niedriger ist besser")
        }
    }

    private func grossYield(_ s: CityStats) -> Double {
        guard s.avgPrice > 0 else { return 0.0 }
        return s.avgRent * 12.0 / s.avgPrice
    }

    private var priceChart: some View {
        Card(title: "Preisentwicklung", icon: "chart.line.uptrend.xyaxis") {
            if city.history.count < 2 {
                Text("Spule Zeit vor, um die Entwicklung zu sehen.").font(.caption).foregroundStyle(Theme.textTertiary)
            } else {
                Chart(city.history) { s in
                    LineMark(x: .value("Jahr", s.year), y: .value("Ø Preis/m²", s.avgPrice))
                        .foregroundStyle(Theme.purple)
                    PointMark(x: .value("Jahr", s.year), y: .value("Ø Preis/m²", s.avgPrice))
                        .foregroundStyle(Theme.lavender)
                }
                .frame(height: 180)
            }
        }
    }

    // MARK: Investment

    private var investmentCard: some View {
        Card(title: "Dein Immobilien-Investment", icon: "key.fill") {
            if let inv = city.investment, let value = city.investmentValue(), let ret = city.investmentReturn() {
                KeyValueRow(label: "Gekauft in Jahr", value: "\(inv.yearBought)")
                KeyValueRow(label: "Kaufpreis", value: Fmt.eur(inv.purchasePrice))
                KeyValueRow(label: "Heutiger Wert", value: Fmt.eur(value))
                KeyValueRow(label: "Eingenommene Miete", value: Fmt.eur(inv.rentCollected))
                KeyValueRow(label: "Gesamtrendite (nach 25 % Kosten)", value: Fmt.pct(ret, sign: true),
                            valueColor: ret >= 0 ? Theme.positive : Theme.negative)
                Button("Verkaufen", role: .destructive) {
                    city.sellInvestment()
                    changed()
                }
            } else {
                Text("Wähle ein Wohn-, Büro- oder Handelsfeld und kaufe dort eine Wohnung. Beobachte dann, wie Stadtentwicklung und Zinsen deine Rendite beeinflussen.")
                    .font(.callout).foregroundStyle(Theme.textSecondary)
            }
        }
    }
}
