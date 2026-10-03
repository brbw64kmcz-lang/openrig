# InvestMind (Arbeitstitel)

Eine Lern-, Simulations- und Vermögensplattform in **Swift / SwiftUI** für iPhone, iPad und Mac.

> Wissen + Daten + Simulation + KI = deine Strategie

Der Name ist ein Platzhalter. Er steht nur in `InvestMind.swiftpm/App/InvestMindApp.swift` (`Brand.name`) und in `Package.swift` und lässt sich dort jederzeit ändern.

## Öffnen und starten

| Gerät | So geht's |
|---|---|
| **iPad** | Ordner `InvestMind.swiftpm` in die Dateien-App kopieren → in **Swift Playgrounds** antippen → ▶︎ |
| **Mac** | `InvestMind.swiftpm` in **Swift Playgrounds für Mac** oder **Xcode 15+** öffnen → Ziel „My Mac (Designed for iPad)“ oder einen iPhone-Simulator wählen → ▶︎ |
| **iPhone** | Über Xcode auf ein angeschlossenes Gerät oder später über TestFlight |

Voraussetzung: iOS/iPadOS 17 oder macOS 14 (Apple silicon). Es gibt keine externen Abhängigkeiten, nur Apple-Frameworks (SwiftUI, Charts, SceneKit).

> **Hinweis zum Stand:** Der Code wurde in einer Linux-Umgebung ohne Apple-Compiler geschrieben und sorgfältig von Hand geprüft, aber noch nicht in Xcode gebaut. Falls beim ersten Start ein Kompilierfehler erscheint: Fehlermeldung kopieren und mir schicken, dann beheben wir ihn gemeinsam.

## Was die App kann

| Bereich | Inhalt | Modus |
|---|---|---|
| **Übersicht** | Vermögen, Kennzahlen, Performance-Chart, Portfolio-Donut, Ziele, Werte-Check („Passt dein Depot zu dir?“), Live-Kurse, Nachrichten mit „Was bedeutet das für mich?“, Suche, Asset-Profile mit Rechenweg | Übersicht |
| **Mein Depot** | Guthaben, Positionen, Ein-/Auszahlungen, Kauf/Verkauf, Umsätze. Sperre für Krypto-Käufe, bis der Kurs „Code verstehen“ abgeschlossen ist, und Warnung bei zu hohem Risiko | **Echtgeld** (derzeit Demo) |
| **Simulator** | Monte-Carlo-Simulation mit 500 Zukünften, Bandbreite schlecht/mittel/gut, Inflation, Crash-Test, Presets (auch „Nachhaltig“), offengelegter Rechenweg | **Simulation** |
| **Lernen** | 7 Kurse mit Quiz und Code-Beispielen. Die Reihenfolge richtet sich nach Zielen, Werten und Interessen | **Lernen** |
| **Krypto-Labor** | Echte SHA-256-Implementierung, Blöcke minen, Manipulation sichtbar machen, eigene Lernsprache *ChainScript* mit Konsole, Hash-Spielplatz, 51-%-Angriffsformel aus dem Bitcoin-Whitepaper | Simulation |
| **Immobilien-Labor** | 3D-Stadt (SceneKit), Gebäude platzieren, Zeit vorspulen, Bauzins ändern, Preise, Mieten, Leerstand, Lebensqualität und CO₂ beobachten, eigene Wohnung als Investment | Simulation |
| **Strategie-Labor** | Futures- und Optionsrechner für Rohstoffe (Black-Scholes), Hedging-Spiel (Bäckerei kauft Weizen), Spieltheorie (Nash, Pareto), 10-Runden-Spiel gegen verdeckte Strategien, Axelrod-Turnier | Simulation |
| **Ziele & Strategie** | Ist der Nutzer auf Kurs? Nötige Sparrate, Zielpfad, persönliches System und Regeln | Übersicht |
| **KI-Assistent** | Regelbasiert und offline. Über die Schnittstelle `AssistantProvider` später durch ein Sprachmodell ersetzbar | – |
| **Einstellungen** | **Einfacher Modus** (große Schrift, weniger Reiter, Erklärungen immer sichtbar), Profil, Werte, Interessen | – |

Echtgeld, Simulation und Lernen tragen überall farbige Abzeichen, damit man die Bereiche nie verwechselt.

## Projektstruktur

```
InvestMind.swiftpm/
├─ Package.swift              App-Definition für Swift Playgrounds / Xcode
├─ App/                       Einstieg, AppState (zentraler Zustand), Bereiche
├─ Design/                    Farben (Theme), Bausteine (Card, StatTile …), Diagramme
├─ Models/                    Asset, Profil, Kurse (Lerninhalte), Nachrichten, Demodaten
├─ Services/                  Marktdaten, Depot (BrokerService), KI-Assistent
├─ Engines/                   reine Rechenlogik, ohne Oberfläche und testbar:
│    SHA256, MiniChain + ChainScript, SimulationEngine (Monte Carlo),
│    ValueMatchEngine (Werte-Passung), CityModel, GameTheory, Derivatives
└─ Features/                  ein Ordner pro Bildschirm/Bereich
```

**Prinzip:** Die Rechenlogik (`Engines/`) ist von der Oberfläche getrennt. Echte Datenquellen, eine echte Partnerbank oder ein echtes KI-Modell kommen über die Protokolle `MarketDataProvider`, `BrokerService` und `AssistantProvider` dazu. Die Bildschirme müssen dafür nicht geändert werden.

## Was bewusst noch Demo ist

- **Kurse, Nachrichten, ESG-Punktzahlen** sind Beispieldaten. Echte Daten brauchen einen lizenzierten Anbieter.
- **Echtgeld:** Es wird kein echtes Geld bewegt. Echte Einzahlungen sind nur über einen Partner mit BaFin-Erlaubnis möglich (siehe `docs/02-Markt-und-Geschaeftsmodell.md`).
- **Speicherung** erfolgt nur lokal (UserDefaults). Es gibt keine Konten und keine Cloud.

## Dokumente

- [`docs/01-Erklaerung-fuer-Dritte.md`](docs/01-Erklaerung-fuer-Dritte.md): Was ist das, wofür, für wen? Mit Texten für Freunde, ältere Menschen und Banken
- [`docs/02-Markt-und-Geschaeftsmodell.md`](docs/02-Markt-und-Geschaeftsmodell.md): ehrliche Marktprüfung, Bias-Check, Abbruch- und Pivot-Kriterien
- [`docs/03-Roadmap-bis-Jahresende.md`](docs/03-Roadmap-bis-Jahresende.md): Plan Oktober bis Dezember 2026
