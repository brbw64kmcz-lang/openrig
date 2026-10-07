# InvestMind – Python-Version für Visual Studio Code

Eine einzige Datei: `investmind_app.py`. Beim Start öffnet sich ein App-Fenster
mit allen Bereichen der Swift-App: Übersicht, Depot, Ziele, Simulator, Lernen,
Krypto-, Immobilien- und Strategie-Labor, KI-Assistent und Einstellungen.

**Keine zusätzlichen Pakete nötig.** Die App nutzt nur `tkinter`, das bei
Python von python.org schon dabei ist.

## Starten (Schritt für Schritt)

1. **Python installieren:** https://www.python.org/downloads/ (Version 3.10 oder neuer).
   Unter Windows beim Installieren unbedingt **„Add Python to PATH“** anhaken.
2. **Visual Studio Code öffnen** → links auf das Erweiterungen-Symbol (vier Quadrate)
   → nach **„Python“** (von Microsoft) suchen → *Installieren*.
3. In VS Code **Datei → Ordner öffnen…** und den Ordner mit `investmind_app.py` wählen.
4. `investmind_app.py` anklicken und oben rechts auf **▶ (Run Python File)** klicken.
   Das InvestMind-Fenster öffnet sich.

Alternativ im Terminal von VS Code:

```
python investmind_app.py      # Windows
python3 investmind_app.py     # macOS / Linux
```

## Gut zu wissen

- Deine Daten (Profil, Depot, Lernfortschritt) liegen in `~/.investmind_daten.json`.
  Löschst du diese Datei, startet die App wieder mit dem Onboarding.
- Unter *Einstellungen* gibt es den **Einfachen Modus**, der größere Schrift und
  immer sichtbare Erklärungen bietet.
- Krypto kannst du erst kaufen, wenn du den Kurs **„Code verstehen“** abgeschlossen hast.
- **Linux:** Falls `tkinter` fehlt, hilft `sudo apt install python3-tk`.
- Alle Kurse, Nachrichten und Kennzahlen sind **Demodaten**. Das ist keine Anlageberatung.
