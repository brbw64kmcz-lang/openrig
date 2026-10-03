import SwiftUI

// Wiederverwendbare Bausteine. Jede Ansicht der App baut darauf auf,
// damit alles einheitlich aussieht und leicht zu bedienen ist.

// MARK: - Bildschirm-Rahmen

/// Scrollbarer Bildschirm mit Hintergrund, Titel und optionalem Untertitel.
struct Screen<Content: View>: View {
    let title: String
    var subtitle: String? = nil
    var badge: ModeBadge.Kind? = nil
    @ViewBuilder var content: () -> Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.spacing) {
                header
                content()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(maxWidth: 1100, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.bgTop, for: .navigationBar)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .center, spacing: 10) {
                Text(title)
                    .font(.largeTitle.weight(.bold))
                    .foregroundStyle(Theme.textPrimary)
                if let badge { ModeBadge(kind: badge) }
            }
            if let subtitle {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .padding(.top, 4)
    }
}

// MARK: - Karte

struct Card<Content: View>: View {
    var title: String? = nil
    var icon: String? = nil
    var trailing: String? = nil
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if title != nil || icon != nil {
                HStack(spacing: 8) {
                    if let icon {
                        Image(systemName: icon)
                            .foregroundStyle(Theme.lavender)
                    }
                    if let title {
                        Text(title)
                            .font(.headline)
                            .foregroundStyle(Theme.textPrimary)
                    }
                    Spacer()
                    if let trailing {
                        Text(trailing)
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }
                }
            }
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.corner, style: .continuous)
                .fill(Theme.card.opacity(0.92))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.corner, style: .continuous)
                .stroke(Theme.cardBorder, lineWidth: 1)
        )
    }
}

// MARK: - Kennzahl-Kachel

struct StatTile: View {
    let title: String
    let value: String
    var change: Double? = nil
    var caption: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(Theme.textSecondary)
            Text(value)
                .font(.title2.weight(.semibold))
                .foregroundStyle(Theme.textPrimary)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            if let change {
                ChangeLabel(value: change)
            } else if let caption {
                Text(caption)
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Theme.cardRaised.opacity(0.7))
        )
    }
}

/// "▲ +2,3 %" in Grün oder "▼ −1,1 %" in Rot – mit Pfeil, nicht nur Farbe.
struct ChangeLabel: View {
    let value: Double
    var suffix: String? = nil

    var body: some View {
        let up = value >= 0
        HStack(spacing: 3) {
            Image(systemName: up ? "arrowtriangle.up.fill" : "arrowtriangle.down.fill")
                .font(.system(size: 8))
            Text(labelText)
                .font(.caption.weight(.medium))
        }
        .foregroundStyle(up ? Theme.positive : Theme.negative)
        .accessibilityLabel(up ? "gestiegen um \(Fmt.pct(value))" : "gefallen um \(Fmt.pct(abs(value)))")
    }

    private var labelText: String {
        let base: String = Fmt.pct(value, sign: true)
        guard let suffix else { return base }
        return base + " " + suffix
    }
}

// MARK: - Modus-Abzeichen (Echtgeld / Simulation / Lernen)

struct ModeBadge: View {
    enum Kind {
        case real, simulation, learning, demoData

        var label: String {
            switch self {
            case .real: return "ECHTGELD"
            case .simulation: return "SIMULATION"
            case .learning: return "LERNEN"
            case .demoData: return "DEMODATEN"
            }
        }
        var icon: String {
            switch self {
            case .real: return "eurosign.circle.fill"
            case .simulation: return "flask.fill"
            case .learning: return "book.fill"
            case .demoData: return "exclamationmark.circle"
            }
        }
        var color: Color {
            switch self {
            case .real: return Theme.realMoney
            case .simulation: return Theme.simulation
            case .learning: return Theme.sky
            case .demoData: return Theme.warning
            }
        }
    }

    let kind: Kind

    var body: some View {
        Label(kind.label, systemImage: kind.icon)
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .foregroundStyle(kind.color)
            .background(Capsule().fill(kind.color.opacity(0.15)))
            .overlay(Capsule().stroke(kind.color.opacity(0.5), lineWidth: 1))
    }
}

// MARK: - Erklär-Hinweis (im einfachen Modus immer aufgeklappt)

struct InfoHint: View {
    @EnvironmentObject private var app: AppState
    let text: String
    @State private var expanded = false

    var body: some View {
        let open = expanded || app.profile.simpleMode
        VStack(alignment: .leading, spacing: 6) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() }
            } label: {
                Label(open ? "Erklärung" : "Was bedeutet das?", systemImage: "info.circle")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Theme.sky)
            }
            .buttonStyle(.plain)
            if open {
                Text(text)
                    .font(.callout)
                    .foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

// MARK: - Buttons

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .padding(.vertical, 14)
            .padding(.horizontal, 20)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Theme.accentGradient)
            )
            .opacity(configuration.isPressed ? 0.8 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(Theme.textPrimary)
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Theme.cardRaised)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Theme.cardBorder, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}

// MARK: - Auswahl-Pillen (wie Tabs in den Entwürfen)

struct PillPicker<Option: Hashable>: View {
    let options: [Option]
    @Binding var selection: Option
    let label: (Option) -> String

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(options, id: \.self) { option in
                    let selected = option == selection
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) { selection = option }
                    } label: {
                        Text(label(option))
                            .font(.subheadline.weight(selected ? .semibold : .regular))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .foregroundStyle(selected ? Color.white : Theme.textSecondary)
                            .background(
                                Capsule().fill(selected ? AnyShapeStyle(Theme.accentGradient) : AnyShapeStyle(Theme.cardRaised.opacity(0.6)))
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(2)
        }
    }
}

// MARK: - Fortschrittsbalken

struct ProgressBar: View {
    let value: Double // 0...1
    var height: CGFloat = 8

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.1))
                Capsule()
                    .fill(Theme.accentGradient)
                    .frame(width: barWidth(total: geo.size.width))
            }
        }
        .frame(height: height)
        .accessibilityValue(Fmt.pct(value, digits: 0))
    }

    private func barWidth(total: CGFloat) -> CGFloat {
        let clamped: Double = min(max(value, 0.0), 1.0)
        let width: CGFloat = total * CGFloat(clamped)
        return max(height, width)
    }
}

// MARK: - Zeile mit Label und Wert

struct KeyValueRow: View {
    let label: String
    let value: String
    var valueColor: Color = Theme.textPrimary

    var body: some View {
        HStack {
            Text(label).foregroundStyle(Theme.textSecondary)
            Spacer()
            Text(value).foregroundStyle(valueColor).fontWeight(.medium)
        }
        .font(.subheadline)
    }
}

/// Schieberegler mit Titel und formatiertem Wert
struct LabeledSlider: View {
    let title: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    var step: Double = 1
    let format: (Double) -> String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title).font(.subheadline).foregroundStyle(Theme.textSecondary)
                Spacer()
                Text(format(value)).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.textPrimary)
            }
            Slider(value: $value, in: range, step: step)
                .tint(Theme.blue)
        }
    }
}

/// Runder Symbol-Kreis für Listen
struct IconBubble: View {
    let systemName: String
    var color: Color = Theme.blue
    var size: CGFloat = 36

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: size * 0.45, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Circle().fill(color.gradient))
    }
}

/// Rechtlicher Hinweis, der an allen relevanten Stellen erscheint.
struct DisclaimerFooter: View {
    var body: some View {
        Text("Hinweis: Alle Kurse, Nachrichten und Kennzahlen in dieser Version sind Demodaten. Keine Anlageberatung. Simulationen sind keine Prognosen – Vergangenheit und Modelle garantieren keine Zukunft.")
            .font(.caption2)
            .foregroundStyle(Theme.textTertiary)
            .padding(.top, 8)
    }
}
