import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var app: AppState
    @EnvironmentObject private var market: MarketStore
    @State private var confirmReset = false

    var body: some View {
        Form {
            Section("Bedienung") {
                Toggle(isOn: $app.profile.simpleMode) {
                    VStack(alignment: .leading) {
                        Text("Einfacher Modus")
                        Text("Größere Schrift, weniger Reiter, Erklärungen immer sichtbar")
                            .font(.caption).foregroundStyle(Theme.textSecondary)
                    }
                }
                Toggle("Live-Kurse (Demo) aktualisieren", isOn: Binding(get: { market.isLive }, set: { market.isLive = $0 }))
            }

            Section("Profil") {
                TextField("Vorname", text: $app.profile.name)
                Picker("Alter", selection: $app.profile.ageGroup) {
                    ForEach(AgeGroup.allCases) { Text($0.rawValue).tag($0) }
                }
                Picker("Erfahrung", selection: $app.profile.experience) {
                    ForEach(Experience.allCases) { Text($0.rawValue).tag($0) }
                }
                Stepper("Risikobereitschaft: \(app.profile.riskTolerance)/7 (\(app.profile.riskLabel))",
                        value: $app.profile.riskTolerance, in: 1...7)
            }

            Section("Meine Werte") {
                ForEach(InvestValue.allCases) { v in
                    Toggle(isOn: valueBinding(v)) {
                        Label(v.rawValue, systemImage: v.icon)
                    }
                }
            }

            Section("Meine Interessen (Labore)") {
                ForEach(LabArea.allCases) { lab in
                    Toggle(isOn: labBinding(lab)) {
                        Label(lab.rawValue, systemImage: lab.icon)
                    }
                }
            }

            Section("Rechtliches & Transparenz") {
                Text("Diese App dient der Bildung. Sie ist keine Anlageberatung. Alle Kurse, Nachrichten und Bewertungen sind Demodaten. Echte Geldanlage erfolgt künftig ausschließlich über lizenzierte Partner.")
                    .font(.caption)
                Text("Datenschutz: Profil, Lernfortschritt und Demo-Depot werden nur lokal auf diesem Gerät gespeichert.")
                    .font(.caption)
            }

            Section {
                Button("Onboarding erneut starten") { app.profile.onboardingDone = false }
                Button("Alles zurücksetzen", role: .destructive) { confirmReset = true }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Einstellungen")
        .confirmationDialog("Profil, Lernfortschritt und Demo-Depot löschen?", isPresented: $confirmReset, titleVisibility: .visible) {
            Button("Zurücksetzen", role: .destructive) {
                app.completedLessons = []
                app.portfolio.resetDemo()
                app.profile = UserProfile()
            }
        }
    }

    private func valueBinding(_ v: InvestValue) -> Binding<Bool> {
        Binding(
            get: { app.profile.values.contains(v) },
            set: { on in
                if on { app.profile.values.insert(v) } else { app.profile.values.remove(v) }
            })
    }

    private func labBinding(_ lab: LabArea) -> Binding<Bool> {
        Binding(
            get: { app.profile.interests.contains(lab) },
            set: { on in
                if on { app.profile.interests.insert(lab) } else { app.profile.interests.remove(lab) }
            })
    }
}
