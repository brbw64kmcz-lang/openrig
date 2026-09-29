import SwiftUI

/// Übersicht der drei Labore (Vertiefungsbereiche).
struct LabsHubView: View {
    @EnvironmentObject private var app: AppState

    var body: some View {
        Screen(title: "Labore", subtitle: "Selbst bauen, programmieren und entscheiden – ohne echtes Geld.", badge: .simulation) {
            lab(.cryptoLab, area: .crypto, color: Theme.sky,
                bullets: ["SHA-256 und Mining live", "Eigene Mini-Blockchain programmieren", "51-%-Angriff berechnen"])
            lab(.realEstateLab, area: .realEstate, color: Theme.purple,
                bullets: ["Stadt in 3D bauen", "Preise & Mieten über Jahre", "Eigene Wohnung als Investment"])
            lab(.strategyLab, area: .strategy, color: Theme.blue,
                bullets: ["Futures & Optionen auf Rohstoffe", "Hedging-Spiel", "Spieltheorie & Turniere"])
            Text("Die Labore hängen zusammen: Zinsen wirken auf Immobilien, Rohstoffpreise auf Strategien, Technologie auf Krypto. Was du hier lernst, zeigt dir die Übersicht auch bei echten Assets an.")
                .font(.footnote).foregroundStyle(Theme.textTertiary)
        }
    }

    private func lab(_ section: AppSection, area: LabArea, color: Color, bullets: [String]) -> some View {
        NavigationLink(value: section) {
            HStack(alignment: .top, spacing: 14) {
                IconBubble(systemName: area.icon, color: color, size: 52)
                VStack(alignment: .leading, spacing: 6) {
                    Text(section.title).font(.title3.bold()).foregroundStyle(Theme.textPrimary)
                    Text(area.tagline).font(.subheadline).foregroundStyle(Theme.textSecondary)
                        .multilineTextAlignment(.leading)
                    ForEach(bullets, id: \.self) { b in
                        Label(b, systemImage: "checkmark").font(.caption).foregroundStyle(Theme.textPrimary)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(Theme.textTertiary)
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: Theme.corner)
                    .fill(LinearGradient(colors: [color.opacity(0.25), Theme.card], startPoint: .topLeading, endPoint: .bottomTrailing))
            )
            .overlay(RoundedRectangle(cornerRadius: Theme.corner).stroke(Theme.cardBorder))
        }
        .buttonStyle(.plain)
    }
}
