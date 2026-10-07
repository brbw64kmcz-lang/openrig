# InvestMind in Electron Fiddle

Electron Fiddle hat links 5 Fenster (Editoren). Jede Datei hier gehört in **das Fenster mit dem gleichen Namen**:

| Fenster in Fiddle | Datei hier     | Inhalt                                        |
|-------------------|----------------|-----------------------------------------------|
| 1. `main.js`      | `main.js`      | öffnet das App-Fenster, speichert, Konsole    |
| 2. `preload.js`   | `preload.js`   | sichere Brücke (Laden/Speichern)              |
| 3. `index.html`   | `index.html`   | Grundgerüst                                   |
| 4. `renderer.js`  | `renderer.js`  | Daten, Berechnungen und alle Seiten           |
| 5. `styles.css`   | `styles.css`   | Aussehen                                      |

So geht's:
1. In Fiddle in jedes Fenster klicken, mit `Strg + A` alles markieren und löschen.
2. Den passenden Code einfügen.
3. Oben eine aktuelle Electron-Version wählen und auf **Run** klicken.

Die Meldungen der App erscheinen unten in der Fiddle-Konsole, wie in Swift Playgrounds.
Eine `package.json` brauchst du in Fiddle nicht.
