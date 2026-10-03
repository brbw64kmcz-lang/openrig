import SwiftUI

/// Erster Start: In wenigen Schritten lernen wir den Nutzer kennen.
/// Daraus entstehen persönliche Lernpfade, Ziele und die Werte-Passung.
struct OnboardingView: View {
    @EnvironmentObject private var app: AppState
    @State private var step = 0
    @State private var draft = UserProfile()
    @State private var selectedGoals: Set<GoalKind> = [.wealth]
    @State private var goalAmount: Double = 50_000
    @State private var goalYears: Double = 10

    private let stepCount = 6

    var body: some View {
        VStack(spacing: 0) {
            if step > 0 {
                HStack {
                    Button {
                        withAnimation { step -= 1 }
                    } label: {
                        Image(systemName: "chevron.left").font(.title3)
                    }
                    ProgressBar(value: Double(step) / Double(stepCount - 1), height: 6)
                    Text("\(step)/\(stepCount - 1)").font(.caption).foregroundStyle(Theme.textSecondary)
                }
                .padding()
            }
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    content
                }
                .padding(24)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            Button(step == stepCount - 1 ? "Los geht’s" : "Weiter") {
                next()
            }
            .buttonStyle(PrimaryButtonStyle())
            .padding(24)
            .frame(maxWidth: 640)
        }
        .foregroundStyle(Theme.textPrimary)
        .background(background.ignoresSafeArea())
    }

    @ViewBuilder
    private var content: some View {
        switch step {
        case 0: welcome
        case 1: aboutYou
        case 2: valuesStep
        case 3: goalsStep
        case 4: riskStep
        default: interestsStep
        }
    }

    private var background: some View {
        ZStack {
            Theme.background
            // Stilisierte Berge wie im Entwurf
            GeometryReader { geo in
                Path { p in
                    let w = geo.size.width, h = geo.size.height
                    p.move(to: CGPoint(x: 0, y: h * 0.55))
                    p.addLine(to: CGPoint(x: w * 0.25, y: h * 0.38))
                    p.addLine(to: CGPoint(x: w * 0.42, y: h * 0.48))
                    p.addLine(to: CGPoint(x: w * 0.62, y: h * 0.30))
                    p.addLine(to: CGPoint(x: w, y: h * 0.50))
                    p.addLine(to: CGPoint(x: w, y: h))
                    p.addLine(to: CGPoint(x: 0, y: h))
                    p.closeSubpath()
                }
                .fill(LinearGradient(colors: [Theme.purple.opacity(0.35), Theme.bgBottom.opacity(0.1)],
                                     startPoint: .top, endPoint: .bottom))
            }
            .opacity(step == 0 ? 1 : 0.35)
        }
    }

    // MARK: Schritte

    private var welcome: some View {
        VStack(spacing: 18) {
            Image(systemName: "chart.line.uptrend.xyaxis.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(Theme.accentGradient)
                .padding(.top, 40)
            Text(Brand.name).font(.largeTitle.bold())
            Text(Brand.claim).foregroundStyle(Theme.textSecondary)
            Spacer(minLength: 60)
            Text("Mehr als nur Investieren.").font(.title.bold())
            Text("Verstehe die Finanzwelt.\nProbiere Strategien ohne Risiko aus.\nBaue deine eigene Zukunft.")
                .multilineTextAlignment(.center)
                .foregroundStyle(Theme.textSecondary)
            HStack(spacing: 8) {
                ModeBadge(kind: .learning)
                ModeBadge(kind: .simulation)
                ModeBadge(kind: .real)
            }
            Text("Drei Bereiche, klar getrennt: Lernen, Simulieren und echtes Geld.")
                .font(.footnote)
                .foregroundStyle(Theme.textTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }

    private var aboutYou: some View {
        VStack(alignment: .leading, spacing: 18) {
            title("Wer bist du?", "Damit wir Inhalte passend erklären.")
            TextField("Dein Vorname (optional)", text: $draft.name)
                .textFieldStyle(.plain)
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 12).fill(Theme.card))
            Text("Alter").font(.headline)
            choiceGrid(AgeGroup.allCases, isSelected: { draft.ageGroup == $0 }, label: { $0.rawValue }) {
                draft.ageGroup = $0
                if $0 == .over60 { draft.simpleMode = true }
            }
            Text("Erfahrung").font(.headline)
            ForEach(Experience.allCases) { e in
                choiceRow(e.rawValue, selected: draft.experience == e) { draft.experience = e }
            }
            Toggle(isOn: $draft.simpleMode) {
                VStack(alignment: .leading) {
                    Text("Einfacher Modus").font(.headline)
                    Text("Größere Schrift, weniger Fachbegriffe, Erklärungen immer sichtbar.")
                        .font(.caption).foregroundStyle(Theme.textSecondary)
                }
            }
            .tint(Theme.purple)
        }
    }

    private var valuesStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            title("Was ist dir wichtig?", "Wir zeigen dir bei jeder Anlage, zu wie viel Prozent sie zu deinen Werten passt.")
            ForEach(InvestValue.allCases) { v in
                let on = draft.values.contains(v)
                Button {
                    if on { draft.values.remove(v) } else { draft.values.insert(v) }
                } label: {
                    HStack(spacing: 12) {
                        IconBubble(systemName: v.icon, color: on ? Theme.purple : Theme.cardRaised)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(v.rawValue).font(.headline)
                            Text(v.explanation).font(.caption).foregroundStyle(Theme.textSecondary)
                        }
                        Spacer()
                        Image(systemName: on ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(on ? Theme.positive : Theme.textTertiary)
                    }
                    .padding(12)
                    .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var goalsStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            title("Deine Ziele", "Mehrfachauswahl möglich. Du kannst alles später ändern.")
            ForEach(GoalKind.allCases) { g in
                choiceRow(g.rawValue, icon: g.icon, selected: selectedGoals.contains(g)) {
                    if selectedGoals.contains(g) { selectedGoals.remove(g) } else { selectedGoals.insert(g) }
                }
            }
            Card(title: "Hauptziel", icon: "target") {
                LabeledSlider(title: "Zielbetrag", value: $goalAmount, range: 5_000...1_000_000, step: 5_000) { Fmt.eur($0) }
                LabeledSlider(title: "In wie vielen Jahren?", value: $goalYears, range: 1...40, step: 1) { "\(Int($0)) Jahre" }
            }
        }
    }

    private var riskStep: some View {
        VStack(alignment: .leading, spacing: 18) {
            title("Wie viel Schwankung hältst du aus?", "Stell dir vor, du legst 10.000 € an.")
            let worst: Double = worstCase
            Card {
                Text("In einem schlechten Jahr könnten daraus werden:")
                    .foregroundStyle(Theme.textSecondary)
                Text(Fmt.eur(10_000.0 * (1.0 - worst)))
                    .font(.system(size: 40, weight: .bold))
                    .foregroundStyle(worst > 0.3 ? Theme.negative : Theme.textPrimary)
                Text("Das wäre ein Rückgang um \(Fmt.pct(worst, digits: 0)). Wäre das für dich in Ordnung?")
                    .font(.callout)
                    .foregroundStyle(Theme.textSecondary)
            }
            Stepper(value: $draft.riskTolerance, in: 1...7) {
                HStack {
                    Text("Risikobereitschaft")
                    Spacer()
                    Text("\(draft.riskTolerance) / 7 · \(draft.riskLabel)").fontWeight(.semibold)
                }
            }
            Text("Tipp: Wenn du unsicher bist, wähle lieber eine Stufe weniger. Viele überschätzen ihre Gelassenheit in echten Krisen.")
                .font(.footnote)
                .foregroundStyle(Theme.textTertiary)
        }
    }

    private var interestsStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            title("Was möchtest du vertiefen?", "Die Labore sind Spielwiesen zum Selbermachen – ohne echtes Geld.")
            ForEach(LabArea.allCases) { lab in
                let on = draft.interests.contains(lab)
                Button {
                    if on { draft.interests.remove(lab) } else { draft.interests.insert(lab) }
                } label: {
                    HStack(spacing: 12) {
                        IconBubble(systemName: lab.icon, color: on ? Theme.blue : Theme.cardRaised)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(lab.rawValue).font(.headline)
                            Text(lab.tagline).font(.caption).foregroundStyle(Theme.textSecondary)
                        }
                        Spacer()
                        Image(systemName: on ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(on ? Theme.positive : Theme.textTertiary)
                    }
                    .padding(12)
                    .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))
                }
                .buttonStyle(.plain)
            }
            Text("Hinweis: Wer Krypto handeln möchte, schließt vorher den kurzen Kurs „Code verstehen“ ab. So weißt du, was du kaufst.")
                .font(.footnote)
                .foregroundStyle(Theme.textTertiary)
        }
    }

    // MARK: Helfer

    private var worstCase: Double {
        let table: [Double] = [0.03, 0.08, 0.15, 0.22, 0.32, 0.45, 0.65]
        let index: Int = max(0, min(6, draft.riskTolerance - 1))
        return table[index]
    }

    private func title(_ t: String, _ sub: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(t).font(.title.bold())
            Text(sub).foregroundStyle(Theme.textSecondary)
        }
    }

    private func choiceRow(_ text: String, icon: String? = nil, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                if let icon { Image(systemName: icon).frame(width: 24).foregroundStyle(Theme.lavender) }
                Text(text)
                Spacer()
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(selected ? Theme.positive : Theme.textTertiary)
            }
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 12).fill(selected ? Theme.cardRaised : Theme.card))
        }
        .buttonStyle(.plain)
    }

    private func choiceGrid<T: Hashable>(_ items: [T], isSelected: @escaping (T) -> Bool,
                                         label: @escaping (T) -> String, onTap: @escaping (T) -> Void) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 10)], spacing: 10) {
            ForEach(items, id: \.self) { item in
                Button { onTap(item) } label: {
                    Text(label(item))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(RoundedRectangle(cornerRadius: 12).fill(isSelected(item) ? AnyShapeStyle(Theme.accentGradient) : AnyShapeStyle(Theme.card)))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func next() {
        if step < stepCount - 1 {
            withAnimation { step += 1 }
            return
        }
        let year = Calendar.current.component(.year, from: Date())
        let kinds = selectedGoals.isEmpty ? [GoalKind.wealth] : GoalKind.allCases.filter { selectedGoals.contains($0) }
        let otherShare: Double = 0.3 / Double(max(kinds.count - 1, 1))
        var goals: [Goal] = []
        for (idx, kind) in kinds.enumerated() {
            let amount: Double = idx == 0 ? goalAmount : goalAmount / 2.0
            let targetYear: Int = year + Int(goalYears) + idx * 2
            let share: Double = idx == 0 ? 0.7 : otherShare
            goals.append(Goal(kind: kind, targetAmount: amount, targetYear: targetYear,
                              monthlyContribution: 250, portfolioShare: share))
        }
        draft.goals = goals
        draft.onboardingDone = true
        app.profile = draft
    }
}
