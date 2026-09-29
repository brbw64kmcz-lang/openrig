import SwiftUI
import Charts

/// Linien-/Flächendiagramm für Kursverläufe
struct LineAreaChart: View {
    let points: [PricePoint]
    var color: Color = Theme.blue
    var height: CGFloat = 180
    var showAxes = true

    var body: some View {
        let minV = points.map(\.value).min() ?? 0
        let maxV = points.map(\.value).max() ?? 1
        let pad = max((maxV - minV) * 0.1, maxV * 0.001)
        Chart(points) { p in
            AreaMark(
                x: .value("Datum", p.date),
                yStart: .value("Basis", minV - pad),
                yEnd: .value("Wert", p.value)
            )
            .foregroundStyle(LinearGradient(colors: [color.opacity(0.35), color.opacity(0.0)],
                                            startPoint: .top, endPoint: .bottom))
            LineMark(x: .value("Datum", p.date), y: .value("Wert", p.value))
                .foregroundStyle(color)
                .lineStyle(StrokeStyle(lineWidth: 2))
        }
        .chartYScale(domain: (minV - pad)...(maxV + pad))
        .chartXAxis(showAxes ? .automatic : .hidden)
        .chartYAxis(showAxes ? .automatic : .hidden)
        .frame(height: height)
    }
}

/// Mini-Verlauf für Listen
struct Sparkline: View {
    let points: [PricePoint]
    var color: Color = Theme.blue

    var body: some View {
        LineAreaChart(points: points, color: color, height: 34, showAxes: false)
            .frame(width: 80)
            .allowsHitTesting(false)
    }
}

/// Ringdiagramm der Vermögensaufteilung mit Legende
struct AllocationDonut: View {
    let slices: [PortfolioStore.Slice]
    let total: Double

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 20) { donut.frame(width: 170, height: 170); legend }
            VStack(spacing: 16) { donut.frame(width: 190, height: 190); legend }
        }
    }

    private var donut: some View {
        Chart(slices) { s in
            SectorMark(angle: .value("Anteil", s.value), innerRadius: .ratio(0.65), angularInset: 1.5)
                .foregroundStyle(s.assetClass.color)
                .cornerRadius(3)
        }
        .chartLegend(.hidden)
        .overlay {
            VStack(spacing: 2) {
                Text("Portfolio").font(.caption).foregroundStyle(Theme.textSecondary)
                Text(Fmt.eur(total)).font(.headline).foregroundStyle(Theme.textPrimary)
                    .minimumScaleFactor(0.6)
            }
        }
    }

    private var legend: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(slices) { s in
                HStack(spacing: 8) {
                    Circle().fill(s.assetClass.color).frame(width: 10, height: 10)
                    Text(s.assetClass.rawValue).font(.subheadline).foregroundStyle(Theme.textPrimary)
                    Spacer(minLength: 8)
                    Text(Fmt.pct(s.share)).font(.subheadline.monospacedDigit()).foregroundStyle(Theme.textSecondary)
                    Text(Fmt.eur(s.value)).font(.caption.monospacedDigit()).foregroundStyle(Theme.textTertiary)
                        .frame(minWidth: 70, alignment: .trailing)
                }
            }
        }
    }
}

/// Zeitraum-Auswahl für Diagramme
enum ChartRange: String, CaseIterable, Identifiable {
    case month = "1M", quarter = "3M", half = "6M", year = "1J"
    var id: String { rawValue }
    var days: Int {
        switch self {
        case .month: return 30
        case .quarter: return 90
        case .half: return 180
        case .year: return 365
        }
    }

    func slice(_ points: [PricePoint]) -> [PricePoint] {
        Array(points.suffix(days))
    }
}
