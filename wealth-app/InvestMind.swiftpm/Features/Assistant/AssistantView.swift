import SwiftUI

struct AssistantView: View {
    @EnvironmentObject private var app: AppState
    @EnvironmentObject private var market: MarketStore
    @EnvironmentObject private var portfolio: PortfolioStore
    @State private var input = ""
    @State private var messages: [Message] = []

    private let provider: AssistantProvider = RuleBasedAssistant()

    struct Message: Identifiable {
        let id = UUID()
        let fromUser: Bool
        let text: String
        var suggestion: AppSection? = nil
    }

    private let starters = [
        "Was bedeutet die aktuelle Marktentwicklung für mein Portfolio?",
        "Welche Chancen und Risiken gibt es bei Immobilien aktuell?",
        "Kannst du mir die Auswirkungen einer Zinssenkung erklären?",
        "Wie nachhaltig ist mein Depot?",
    ]

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        greeting
                        if messages.isEmpty {
                            ForEach(starters, id: \.self) { s in
                                Button { send(s) } label: {
                                    HStack(alignment: .top) {
                                        Image(systemName: "chevron.right.2").foregroundStyle(Theme.lavender)
                                        Text(s).multilineTextAlignment(.leading).foregroundStyle(Theme.textPrimary)
                                        Spacer()
                                    }
                                    .font(.subheadline)
                                    .padding(14)
                                    .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.blue.opacity(0.4)))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        ForEach(messages) { m in
                            bubble(m).id(m.id)
                        }
                    }
                    .padding(16)
                    .frame(maxWidth: 800)
                    .frame(maxWidth: .infinity)
                }
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                }
            }
            inputBar
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("KI-Assistent")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var greeting: some View {
        HStack(spacing: 12) {
            IconBubble(systemName: "sparkles", color: Theme.purple, size: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text("Hallo \(app.profile.name.isEmpty ? "" : app.profile.name)! 👋").font(.headline).foregroundStyle(Theme.textPrimary)
                Text("Wie kann ich dir heute helfen? Ich erkläre – ich berate nicht.")
                    .font(.caption).foregroundStyle(Theme.textSecondary)
            }
        }
        .padding(.bottom, 6)
    }

    private func bubble(_ m: Message) -> some View {
        HStack {
            if m.fromUser { Spacer(minLength: 40) }
            VStack(alignment: .leading, spacing: 8) {
                Text(m.text).foregroundStyle(Theme.textPrimary)
                if let s = m.suggestion {
                    Button { app.open(s) } label: {
                        Label("Weiter: \(s.title)", systemImage: s.icon).font(.caption.bold())
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.purple)
                }
            }
            .padding(12)
            .background(RoundedRectangle(cornerRadius: 16).fill(m.fromUser ? Theme.blue.opacity(0.35) : Theme.card))
            if !m.fromUser { Spacer(minLength: 40) }
        }
    }

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Stelle eine Frage …", text: $input)
                .textFieldStyle(.plain)
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))
                .onSubmit { send(input) }
            Button { send(input) } label: {
                Image(systemName: "paperplane.fill").font(.title3)
            }
            .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(12)
        .background(Theme.bgTop)
    }

    private func send(_ text: String) {
        let q = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return }
        messages.append(Message(fromUser: true, text: q))
        input = ""
        let context = AssistantContext(profile: app.profile,
                                       totalValue: portfolio.totalValue(market: market),
                                       allocation: portfolio.allocation(market: market),
                                       learningProgress: app.totalLearningProgress)
        let reply = provider.answer(q, context: context)
        messages.append(Message(fromUser: false, text: reply.text, suggestion: reply.suggestion))
    }
}
