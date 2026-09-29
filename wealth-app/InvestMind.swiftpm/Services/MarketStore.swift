import Foundation
import Combine

/// Schnittstelle zu Marktdaten. Heute: Demo-Daten.
/// Später: ein lizenzierter Anbieter (Kurse, Nachrichten). Die Views ändern sich dabei nicht.
protocol MarketDataProvider {
    func loadAssets() -> [Asset]
    func loadNews() -> [NewsItem]
}

struct DemoMarketDataProvider: MarketDataProvider {
    func loadAssets() -> [Asset] { SampleAssets.make() }
    func loadNews() -> [NewsItem] { SampleNews.items }
}

/// Hält alle Kurse und Nachrichten und simuliert "Live"-Bewegungen.
final class MarketStore: ObservableObject {
    @Published private(set) var assets: [Asset]
    @Published private(set) var news: [NewsItem]
    @Published var isLive = true {
        didSet {
            if isLive { start() } else { stop() }
        }
    }

    private var timer: Timer?
    private var rng = SeededGenerator(seed: UInt64(Date().timeIntervalSince1970))

    init(provider: MarketDataProvider = DemoMarketDataProvider()) {
        assets = provider.loadAssets()
        news = provider.loadNews()
    }

    func start() {
        guard timer == nil else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    /// Ein kleiner Zufallsschritt pro Asset (entspricht grob einer Minute Handel).
    private func tick() {
        let dt: Double = 1.0 / 525_600.0
        let step: Double = sqrt(dt) * 3.0
        var updated = assets
        for i in updated.indices where updated[i].volatility > 0 {
            let a = updated[i]
            let shock = rng.normal()
            let factor: Double = exp(a.volatility * step * shock)
            let newPrice: Double = a.price * factor
            let yesterday: Double = a.history.count >= 2 ? a.history[a.history.count - 2].value : a.price
            updated[i].price = newPrice
            updated[i].dayChange = yesterday > 0 ? newPrice / yesterday - 1.0 : 0.0
            if let last = updated[i].history.last {
                updated[i].history[updated[i].history.count - 1] = PricePoint(date: last.date, value: newPrice)
            }
        }
        assets = updated
    }

    func asset(_ id: String) -> Asset? {
        assets.first { $0.id == id }
    }

    func price(_ id: String) -> Double {
        asset(id)?.price ?? 0
    }

    func search(_ query: String) -> [Asset] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return assets }
        return assets.filter {
            $0.name.lowercased().contains(q)
                || $0.symbol.lowercased().contains(q)
                || $0.assetClass.rawValue.lowercased().contains(q)
                || $0.summary.lowercased().contains(q)
        }
    }

    func news(for assetID: String) -> [NewsItem] {
        news.filter { $0.relatedAssetIDs.contains(assetID) }
    }

    func assets(in cls: AssetClass) -> [Asset] {
        assets.filter { $0.assetClass == cls }
    }
}
