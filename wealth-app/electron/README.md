# InvestMind – Electron-Version (Desktop-App für Windows und Mac)

Dieselbe App wie in Swift Playgrounds, als Desktop-Programm mit **Electron**. Startest du sie
im Terminal von VS Code mit `npm start`, öffnet sich ein App-Fenster, das wie die iPad-Vorschau
in Swift Playgrounds aussieht. Im Terminal erscheinen dabei die Meldungen der App, so wie in der
Konsole von Swift Playgrounds.

## Welcher Code gehört in welche Datei?

Lege einen Ordner `investmind-electron` an und darin **genau diese 7 Dateien** (Namen exakt so,
alles kleingeschrieben). Ganz oben in jeder Datei steht „DATEI x von 7“. So siehst du sofort,
ob der richtige Code im richtigen Fenster ist.

| Nr. | Datei          | Was sie macht                                             |
|-----|----------------|-----------------------------------------------------------|
| 1   | `package.json` | Projektbeschreibung: Name, Startbefehl, Electron-Version  |
| 2   | `main.js`      | Hauptprozess: öffnet das Fenster, speichert Daten, Konsole |
| 3   | `preload.js`   | Sichere Brücke zwischen Fenster und Hauptprozess          |
| 4   | `index.html`   | Grundgerüst des Fensters                                  |
| 5   | `engines.js`   | Daten und alle Berechnungen (keine Oberfläche)            |
| 6   | `app.js`       | Oberfläche: alle Seiten, Diagramme, Dialoge               |
| 7   | `styles.css`   | Aussehen (Farben wie in der Swift-App)                    |

```
investmind-electron/
├── package.json
├── main.js
├── preload.js
├── index.html
├── engines.js
├── app.js
└── styles.css
```

> `package.json` hat keine Kopfzeile, weil JSON-Dateien keine Kommentare erlauben.

## Starten (Schritt für Schritt)

1. **Node.js installieren:** https://nodejs.org → Version „LTS“ herunterladen und installieren.
   Danach VS Code einmal neu starten.
2. In VS Code **Datei → Ordner öffnen…** → den Ordner `investmind-electron` wählen.
3. **Terminal öffnen:** Menü **Terminal → Neues Terminal**.
4. Einmalig eingeben (lädt Electron herunter, dauert 1–2 Minuten):
   ```
   npm install
   ```
5. App starten:
   ```
   npm start
   ```
   Das InvestMind-Fenster öffnet sich. Im Terminal siehst du zum Beispiel:
   ```
     ◆ InvestMind  –  Lernen · Simulieren · Investieren
     ───────────────────────────────────────────────
   [20:01:12] Starte App …
   [20:01:13] App-Fenster ist offen (1194 × 834, wie die iPad-Vorschau).
   [20:01:13] App: InvestMind bereit – 17 Assets, 6 Kurse geladen.
   [20:01:20] App: Seite geöffnet: Simulator
   ```
6. **Beenden:** Fenster schließen oder im Terminal `Strg + C` drücken.

## Gut zu wissen

- Wenn etwas schiefgeht, steht im Terminal eine Zeile mit **FEHLER: …** samt Datei und Zeilennummer.
  Ein Screenshot davon genügt, um den Fehler zu finden.
- Ziehst du das Fenster schmal, wechselt die App zur iPhone-Ansicht mit Reiterleiste unten.
- Mit `Strg + Umschalt + I` (Mac: `Cmd + Alt + I`) öffnest du die Entwicklerwerkzeuge.
- Deine Daten liegen lokal in `investmind-daten.json` im App-Datenordner. Der genaue Pfad steht
  unter *Einstellungen* und beim Start im Terminal.
- Öffnest du `index.html` ohne Electron direkt im Browser, läuft die App auch, speichert dann aber
  im Browser.
- Alle Kurse, Nachrichten und Kennzahlen sind **Demodaten**. Das ist keine Anlageberatung.
