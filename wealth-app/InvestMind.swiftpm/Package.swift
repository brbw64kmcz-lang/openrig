// swift-tools-version: 5.9

// Dieses Paket ist ein "App-Playground" (.swiftpm).
// Öffnen mit: Swift Playgrounds (iPad / Mac) oder Xcode 15+ (Datei > Öffnen).
// Auf dem Mac startet die App als "Designed for iPad"-App.

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "InvestMind",
    platforms: [
        .iOS("17.0")
    ],
    products: [
        .iOSApplication(
            name: "InvestMind",
            targets: ["AppModule"],
            bundleIdentifier: "com.example.investmind",
            teamIdentifier: "",
            displayVersion: "0.1",
            bundleVersion: "1",
            appIcon: .placeholder(icon: .leaf),
            accentColor: .presetColor(.purple),
            supportedDeviceFamilies: [
                .pad,
                .phone
            ],
            supportedInterfaceOrientations: [
                .portrait,
                .landscapeRight,
                .landscapeLeft,
                .portraitUpsideDown(.when(deviceFamilies: [.pad]))
            ]
        )
    ],
    targets: [
        .executableTarget(
            name: "AppModule",
            path: "."
        )
    ]
)
