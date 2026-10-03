import SwiftUI

/// Arbeitstitel "InvestMind" – der Name steht nur hier und in Package.swift
/// und kann jederzeit geändert werden.
enum Brand {
    static let name = "InvestMind"
    static let claim = "Lernen · Simulieren · Investieren"
}

@main
struct InvestMindApp: App {
    @StateObject private var app = AppState()

    private var typeSizes: ClosedRange<DynamicTypeSize> {
        app.profile.simpleMode
            ? DynamicTypeSize.xLarge ... DynamicTypeSize.accessibility3
            : DynamicTypeSize.xSmall ... DynamicTypeSize.accessibility3
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(app)
                .environmentObject(app.market)
                .environmentObject(app.portfolio)
                .preferredColorScheme(.dark)
                .tint(Theme.blue)
                // Einfacher Modus: größere Schrift in der ganzen App
                .dynamicTypeSize(typeSizes)
        }
    }
}
