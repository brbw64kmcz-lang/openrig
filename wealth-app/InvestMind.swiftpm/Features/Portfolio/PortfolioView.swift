import SwiftUI

/// Echtgeld-Bereich: Guthaben, Positionen, Ein-/Auszahlungen, Umsätze.
/// Grün markiert, damit er nie mit der Simulation verwechselt wird.
struct PortfolioView: View {
    @EnvironmentObject private var app: AppState
    @EnvironmentObject private var market: MarketStore
    @EnvironmentObject private var portfolio: PortfolioStore
    @State private var cashSheet: CashAction?

    enum CashAction: String, Identifiable {
        case deposit = "Einzahlen", withdraw = "Auszahlen"
        var id: String { rawValue }
    }

    var body: some View {
        Screen(title: "Mein Depot", subtitle: portfolio.connection.label, badge: .real) {
            connectionBanner
            summary
            cashButtons
            holdingsCard
            transactionsCard
            realMoneyRoadmap
            DisclaimerFooter()
        }
        .sheet(item: $cashSheet) { action in
            CashSheet(action: action)
                .environmentObject(portfolio)
        }
    }

    private var connectionBanner: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "exclamationmark.shield.fill").foregroundStyle(Theme.warning).font(.title2)
            VStack(alignment: .leading, spacing: 4) {
                Text("Demo-Depot").font(.headline).foregroundStyle(Theme.textPrimary)
                Text("In dieser Version wird kein echtes Geld bewegt. Echte Einzahlungen laufen später ausschließlich über eine lizenzierte Partnerbank – dein Geld liegt dann dort, nicht bei uns.")
                    .font(.callout).foregroundStyle(Theme.textSecondary)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.warning.opacity(0.1)))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.warning.opacity(0.4)))
    }

    private var summary: some View {
        let total = portfolio.totalValue(market: market)
        let invested = portfolio.invested(market: market)
        let current = total - portfolio.cash
        let pl = current - invested
        return LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
            StatTile(title: "Gesamtwert", value: Fmt.eur(total))
            StatTile(title: "Verfügbares Guthaben", value: Fmt.eur(portfolio.cash), caption: "sofort investierbar")
            StatTile(title: "Investiert (Kaufwert)", value: Fmt.eur(invested))
            StatTile(title: "Gewinn / Verlust", value: Fmt.eur(pl), change: invested > 0 ? pl / invested : 0)
        }
    }

    private var cashButtons: some View {
        HStack(spacing: 12) {
            Button { cashSheet = .deposit } label: { Label("Einzahlen", systemImage: "arrow.down.circle.fill") }
                .buttonStyle(PrimaryButtonStyle())
            Button { cashSheet = .withdraw } label: { Label("Auszahlen", systemImage: "arrow.up.circle.fill") }
                .buttonStyle(SecondaryButtonStyle())
        }
    }

    private var holdingsCard: some View {
        Card(title: "Positionen", icon: "square.stack.3d.up.fill", trailing: "\(portfolio.holdings.count) Anlagen") {
            if portfolio.holdings.isEmpty {
                Text("Noch keine Anlagen. Suche ein Asset in der Übersicht und kaufe es.")
                    .foregroundStyle(Theme.textSecondary)
            }
            ForEach(portfolio.holdings) { h in
                if let a = market.asset(h.assetID) {
                    NavigationLink(value: AssetRoute(id: a.id)) {
                        holdingRow(h, a)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func holdingRow(_ h: Holding, _ a: Asset) -> some View {
        let value = h.quantity * a.price
        let change = h.averagePrice > 0 ? a.price / h.averagePrice - 1 : 0
        return HStack(spacing: 12) {
            IconBubble(systemName: a.assetClass.icon, color: a.assetClass.color, size: 34)
            VStack(alignment: .leading, spacing: 2) {
                Text(a.name).font(.subheadline.weight(.medium)).foregroundStyle(Theme.textPrimary)
                Text("\(Fmt.num(h.quantity, digits: h.quantity < 10 ? 4 : 2)) Stück · Ø \(Fmt.num(h.averagePrice)) €")
                    .font(.caption).foregroundStyle(Theme.textTertiary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(Fmt.eur(value)).font(.subheadline.monospacedDigit()).foregroundStyle(Theme.textPrimary)
                ChangeLabel(value: change)
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    private var transactionsCard: some View {
        Card(title: "Umsätze", icon: "list.bullet.rectangle") {
            ForEach(portfolio.transactions.prefix(8)) { t in
                HStack {
                    Image(systemName: t.kind.icon).foregroundStyle(Theme.lavender)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title(for: t)).font(.subheadline).foregroundStyle(Theme.textPrimary)
                        Text(t.date.formatted(date: .abbreviated, time: .omitted))
                            .font(.caption).foregroundStyle(Theme.textTertiary)
                    }
                    Spacer()
                    Text((t.kind == .deposit || t.kind == .sell ? "+" : "−") + Fmt.eur(t.amount, digits: 2))
                        .font(.subheadline.monospacedDigit())
                        .foregroundStyle(t.kind == .deposit || t.kind == .sell ? Theme.positive : Theme.textPrimary)
                }
            }
        }
    }

    private func title(for t: Transaction) -> String {
        if let id = t.assetID, let a = market.asset(id) { return "\(t.kind.rawValue) · \(a.name)" }
        return t.kind.rawValue
    }

    /// Was nötig ist, bevor echtes Geld fließen darf – transparent für Nutzer und Partner.
    private var realMoneyRoadmap: some View {
        Card(title: "So wird aus dem Demo-Depot ein echtes Depot", icon: "checklist") {
            step(1, "Partnerbank anbinden", "Depot und Konto liegen bei einer Bank bzw. einem Broker mit BaFin-Erlaubnis.")
            step(2, "Identität prüfen (KYC)", "Gesetzlich vorgeschrieben: Ausweis- und Geldwäscheprüfung.")
            step(3, "Angemessenheit prüfen", "Kenntnisse und Erfahrung abfragen (MiFID II) – unsere Lernmodule helfen dabei.")
            step(4, "Kosten offenlegen", "Alle Gebühren vor jedem Kauf transparent anzeigen.")
            Button("Echtgeld-Depot – bald verfügbar") {}
                .buttonStyle(SecondaryButtonStyle())
                .disabled(true)
            Button("Demo-Depot zurücksetzen", role: .destructive) { portfolio.resetDemo() }
                .font(.caption)
        }
    }

    private func step(_ n: Int, _ title: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\(n)").font(.caption.bold()).frame(width: 22, height: 22)
                .background(Circle().fill(Theme.cardRaised))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.semibold))
                Text(text).font(.caption).foregroundStyle(Theme.textSecondary)
            }
        }
        .foregroundStyle(Theme.textPrimary)
    }
}

struct CashSheet: View {
    @EnvironmentObject private var portfolio: PortfolioStore
    @Environment(\.dismiss) private var dismiss
    let action: PortfolioView.CashAction
    @State private var amount: Double = 250
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    ModeBadge(kind: .demoData)
                    LabeledSlider(title: "Betrag", value: $amount, range: 50...10_000, step: 50) { Fmt.eur($0) }
                    TextField("Betrag", value: $amount, format: .number)
                        .keyboardType(.decimalPad)
                } footer: {
                    Text(footerText)
                }
                if let error { Section { Text(error).foregroundStyle(Theme.negative) } }
                Section {
                    Button("\(action.rawValue): \(Fmt.eur(amount, digits: 2))") { run() }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(action.rawValue)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }

    private var footerText: String {
        if action == .deposit {
            return "Tipp: Ein fester monatlicher Sparplan ist oft besser als der „perfekte Zeitpunkt“."
        }
        return "Verfügbar: " + Fmt.eur(portfolio.cash, digits: 2)
    }

    private func run() {
        do {
            if action == .deposit { try portfolio.deposit(amount) } else { try portfolio.withdraw(amount) }
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
