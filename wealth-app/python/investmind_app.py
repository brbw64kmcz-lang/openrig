"""
InvestMind – Desktop-Version in Python (Arbeitstitel)
=====================================================

Starten in Visual Studio Code:
  1. Python 3.10 oder neuer installieren (python.org). Unter Windows beim
     Installieren "Add Python to PATH" anhaken.
  2. In VS Code die Erweiterung "Python" (von Microsoft) installieren.
  3. Diese Datei öffnen und oben rechts auf ▶ ("Run Python File") klicken.

Es werden KEINE zusätzlichen Pakete benötigt – nur Python mit tkinter
(ist bei Python von python.org automatisch dabei).

Alle Kurse, Nachrichten und Kennzahlen sind Demodaten. Keine Anlageberatung.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import random
import time
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timedelta

import tkinter as tk
from tkinter import ttk, messagebox

APP_NAME = "InvestMind"
APP_CLAIM = "Lernen · Simulieren · Investieren"
SAVE_FILE = os.path.join(os.path.expanduser("~"), ".investmind_daten.json")

# ============================================================================
# Farben & Formatierung (Blau, Lila, Grau, Weiß)
# ============================================================================

BG = "#090e24"
BG2 = "#121536"
CARD = "#161d42"
CARD2 = "#1f2654"
BORDER = "#2a3266"
BLUE = "#4d7dff"
PURPLE = "#8c5ef5"
LAVENDER = "#b8adff"
SKY = "#73bfff"
GRAY = "#8c96b3"
TEXT = "#ffffff"
TEXT2 = "#a8b3d4"
TEXT3 = "#7a85a8"
GREEN = "#5cdba8"
RED = "#ff7380"
YELLOW = "#ffc759"

CLASS_COLORS = {
    "Aktien & ETFs": BLUE, "Immobilien": PURPLE, "Krypto": SKY, "Rohstoffe": LAVENDER,
    "Alternative": "#5966d9", "Anleihen": "#9e85e6", "Cash": GRAY,
}


def fmt_num(v: float, digits: int = 2) -> str:
    s = f"{v:,.{digits}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def fmt_eur(v: float, digits: int = 0) -> str:
    return fmt_num(v, digits) + " €"


def fmt_pct(v: float, digits: int = 1, sign: bool = False) -> str:
    body = fmt_num(v * 100, digits) + " %"
    return ("+" + body) if (sign and v > 0) else body


def fmt_compact(v: float) -> str:
    if abs(v) >= 1_000_000:
        return fmt_num(v / 1_000_000, 1) + " Mio."
    if abs(v) >= 1_000:
        return fmt_num(v / 1_000, 0) + " Tsd."
    return fmt_num(v, 0)


# ============================================================================
# Daten: Werte, Assets, Nachrichten
# ============================================================================

VALUES = ["Nachhaltigkeit", "Soziale Verantwortung", "Technologie & Innovation",
          "Sicherheit", "Regelmäßiges Einkommen", "Schnell verfügbar"]

VALUE_EXPLAIN = {
    "Nachhaltigkeit": "Wie umwelt- und klimafreundlich ist das Asset?",
    "Soziale Verantwortung": "Wie fair sind Arbeitsbedingungen und Unternehmensführung?",
    "Technologie & Innovation": "Wie stark profitiert das Asset von neuen Technologien?",
    "Sicherheit": "Wie gering sind Schwankungen und Verlustrisiko?",
    "Regelmäßiges Einkommen": "Wie viel laufender Ertrag (Miete, Dividende, Zins) fließt?",
    "Schnell verfügbar": "Wie schnell kann ich es ohne Abschlag verkaufen?",
}


@dataclass
class Asset:
    id: str
    name: str
    symbol: str
    cls: str
    summary: str
    price: float
    er: float          # erwartete Rendite p. a.
    vol: float         # Schwankung p. a.
    income: float      # laufender Ertrag p. a.
    risk: int          # Risikoklasse 1–7
    scores: list       # 0..1 je Wert in Reihenfolge VALUES
    reasons: dict
    course: str | None = None
    history: list = field(default_factory=list)
    day_change: float = 0.0

    def score(self, value: str) -> float:
        return self.scores[VALUES.index(value)]


ASSET_SPECS = [
    ("world-etf", "Welt-Aktien-ETF", "WELT", "Aktien & ETFs", "Rund 1.500 große Unternehmen aus 23 Industrieländern.",
     98.40, 0.07, 0.15, 0.018, 4, [0.45, 0.55, 0.60, 0.55, 0.35, 0.95],
     {"Nachhaltigkeit": "Enthält auch Öl-, Gas- und Rüstungsunternehmen. ESG-Varianten schließen diese aus."}, None),
    ("usa500", "USA-500-ETF", "U500", "Aktien & ETFs", "Die 500 größten börsennotierten US-Unternehmen.",
     512.30, 0.075, 0.16, 0.013, 4, [0.35, 0.50, 0.75, 0.50, 0.30, 0.95],
     {"Technologie & Innovation": "Hoher Anteil großer Technologiekonzerne."}, None),
    ("clean", "Clean-Energy-ETF", "CLEN", "Aktien & ETFs", "Unternehmen aus Solar, Wind, Speicher und Netzen.",
     8.12, 0.06, 0.30, 0.012, 5, [0.92, 0.65, 0.80, 0.30, 0.25, 0.90],
     {"Nachhaltigkeit": "Direkter Beitrag zur Energiewende.", "Sicherheit": "Stark schwankend, abhängig von Zinsen."}, None),
    ("green-bond", "Green-Bond-ETF", "GRBD", "Anleihen", "Anleihen, deren Erlöse in Klimaprojekte fließen.",
     46.20, 0.03, 0.06, 0.028, 2, [0.85, 0.65, 0.30, 0.85, 0.60, 0.85],
     {"Nachhaltigkeit": "Mittelverwendung ist zweckgebunden und wird berichtet."}, None),
    ("gov-bond", "Euro-Staatsanleihen", "EGOV", "Anleihen", "Anleihen von Euro-Staaten mit guter Bonität.",
     101.30, 0.025, 0.05, 0.027, 2, [0.50, 0.60, 0.15, 0.90, 0.60, 0.90],
     {"Sicherheit": "Staaten mit hoher Bonität fallen selten aus."}, None),
    ("btc", "Bitcoin", "BTC", "Krypto", "Erste und größte Kryptowährung. Begrenzt auf 21 Mio. Einheiten.",
     58240, 0.10, 0.65, 0.0, 7, [0.28, 0.45, 0.90, 0.05, 0.00, 0.85],
     {"Nachhaltigkeit": "Proof-of-Work braucht sehr viel Strom.", "Sicherheit": "Rückgänge über 70 % gab es mehrfach."},
     "crypto-code"),
    ("eth", "Ethereum", "ETH", "Krypto", "Programmierbare Blockchain für Smart Contracts.",
     2410, 0.10, 0.75, 0.03, 7, [0.62, 0.45, 0.95, 0.05, 0.20, 0.85],
     {"Nachhaltigkeit": "Seit 2022 Proof-of-Stake – Energieverbrauch um über 99 % gesunken."}, "crypto-code"),
    ("gold", "Gold", "XAU", "Rohstoffe", "Klassischer Wertspeicher, Preis je Feinunze.",
     2180, 0.04, 0.15, 0.0, 4, [0.25, 0.35, 0.10, 0.70, 0.00, 0.85],
     {"Nachhaltigkeit": "Goldabbau belastet die Umwelt stark."}, None),
    ("oil", "Öl (Brent)", "BRENT", "Rohstoffe", "Rohöl-Referenzsorte, Preis je Barrel.",
     78.50, 0.03, 0.35, 0.0, 6, [0.05, 0.30, 0.10, 0.25, 0.00, 0.80],
     {"Nachhaltigkeit": "Fossiler Energieträger – widerspricht Klimazielen direkt."}, None),
    ("wheat", "Weizen", "WHEAT", "Rohstoffe", "Agrarrohstoff, Preis je Tonne.",
     218, 0.03, 0.28, 0.0, 6, [0.45, 0.40, 0.10, 0.30, 0.00, 0.70],
     {"Soziale Verantwortung": "Spekulation auf Nahrungsmittel ist ethisch umstritten."}, None),
    ("copper", "Kupfer", "COPPER", "Rohstoffe", "Industriemetall für Kabel, E-Autos und Netze.",
     8900, 0.045, 0.25, 0.0, 5, [0.60, 0.35, 0.60, 0.35, 0.00, 0.75],
     {"Nachhaltigkeit": "Unverzichtbar für die Energiewende, der Abbau ist aber belastend."}, None),
    ("reit-res", "Wohnimmobilien-REIT", "WREIT", "Immobilien", "Gesellschaft mit rund 20.000 Mietwohnungen.",
     27.60, 0.055, 0.20, 0.038, 4, [0.55, 0.50, 0.30, 0.55, 0.80, 0.85],
     {"Regelmäßiges Einkommen": "Mieteinnahmen werden größtenteils ausgeschüttet."}, None),
    ("reit-office", "Büroimmobilien-REIT", "BREIT", "Immobilien", "Bürogebäude in europäischen Großstädten.",
     18.90, 0.045, 0.24, 0.052, 5, [0.40, 0.45, 0.25, 0.45, 0.85, 0.80],
     {"Sicherheit": "Homeoffice-Trend erhöht das Leerstandsrisiko."}, None),
    ("re-crowd", "Immobilien-Crowdfunding", "CROWD", "Immobilien", "Nachrangdarlehen für einzelne Bauprojekte.",
     100, 0.06, 0.12, 0.055, 6, [0.50, 0.55, 0.35, 0.35, 0.85, 0.10],
     {"Sicherheit": "Nachrangig: Bei Pleite des Projekts droht Totalverlust."}, None),
    ("pe", "Private-Equity-Fonds", "PEQ", "Alternative", "Beteiligungen an nicht-börsennotierten Firmen.",
     112, 0.08, 0.25, 0.0, 6, [0.40, 0.45, 0.70, 0.30, 0.10, 0.05],
     {"Schnell verfügbar": "Kapital ist oft 7–10 Jahre gebunden."}, None),
    ("infra", "Infrastruktur (Windparks)", "WIND", "Alternative", "Beteiligung an Windparks mit Stromabnahmeverträgen.",
     54, 0.05, 0.12, 0.04, 4, [0.90, 0.70, 0.60, 0.60, 0.70, 0.50],
     {"Nachhaltigkeit": "Direkte Erzeugung erneuerbarer Energie."}, None),
    ("cash", "Tagesgeld", "CASH", "Cash", "Täglich verfügbar, bis 100.000 € gesetzlich gesichert.",
     1.0, 0.02, 0.0, 0.02, 1, [0.50, 0.50, 0.00, 1.00, 0.50, 1.00],
     {"Sicherheit": "Einlagensicherung bis 100.000 € je Bank und Person."}, None),
]

NEWS = [
    ("EZB signalisiert vorsichtige Zinssenkung", 2, "+",
     "Sinkende Zinsen machen Kredite billiger. Das stützt oft Immobilien und Anleihen, Tagesgeld bringt weniger."),
    ("Bitcoin erreicht neues Jahreshoch", 4, "+",
     "Hohe Kurse ziehen Käufer an – aber Krypto kann genauso schnell 30–50 % fallen."),
    ("Goldpreis steigt wegen geopolitischer Spannungen", 6, "+",
     "Gold gilt als Krisenschutz, zahlt aber keine Zinsen oder Mieten."),
    ("Dürre: Weizen-Futures ziehen an", 9, "=",
     "Bäckereien sichern sich mit Futures ab – genau das übst du im Strategie-Labor."),
    ("Büroimmobilien: Leerstand in Großstädten steigt", 12, "-",
     "Mehr Leerstand = weniger Mieteinnahmen. Streuung hilft."),
    ("Rekordzubau bei Windkraft in Europa", 20, "+",
     "Infrastruktur und Clean-Energy profitieren – relevant für nachhaltige Anleger."),
]


def make_assets(seed: int = 42) -> list[Asset]:
    """Erzeugt die Demo-Assets mit 365 Tageskursen, die beim heutigen Preis enden."""
    rng = random.Random(seed)
    assets = []
    for spec in ASSET_SPECS:
        a = Asset(*spec)
        values = [a.price] * 365
        p = a.price
        dt = 1 / 365
        for i in range(363, -1, -1):
            growth = math.exp((a.er - 0.5 * a.vol ** 2) * dt + a.vol * math.sqrt(dt) * rng.gauss(0, 1))
            p /= growth
            values[i] = p
        a.history = values
        a.day_change = a.price / values[-2] - 1 if values[-2] else 0
        assets.append(a)
    return assets


# ============================================================================
# Lerninhalte
# ============================================================================

COURSES = [
    {"id": "basics", "title": "Geld anlegen – die Grundlagen", "area": "Grundlagen", "values": [], "lab": None,
     "lessons": [
         {"id": "basics-1", "title": "Der Zinseszins", "text":
          "Wenn dein Geld Ertrag bringt und du ihn wieder anlegst, bekommst du Ertrag auf den Ertrag.\n\n"
          "Beispiel: 10.000 € mit 6 % pro Jahr sind nach 10 Jahren rund 17.900 €, nach 30 Jahren rund 57.400 €.\n\n"
          "Formel: Endwert = Startbetrag × (1 + Rendite) ^ Jahre",
          "quiz": ("Was hat beim Zinseszins die größte Wirkung?", ["Die Anlagedauer", "Die Uhrzeit des Kaufs", "Die Farbe der App"], 0)},
         {"id": "basics-2", "title": "Risiko und Rendite", "text":
          "Höhere mögliche Rendite bedeutet fast immer höheres Risiko.\n\n"
          "Volatilität: Aktien etwa 15 % pro Jahr, Bitcoin 60 % und mehr, Tagesgeld fast 0 %.",
          "quiz": ("Hohe Rendite ohne Risiko wird versprochen. Beste Reaktion?", ["Sofort investieren", "Skeptisch sein – das gibt es nicht", "Freunde überzeugen"], 1)},
         {"id": "basics-3", "title": "Streuung", "text":
          "Lege nicht alle Eier in einen Korb. Verschiedene Anlagen gleichen Verluste teilweise aus.",
          "quiz": ("Warum senkt Streuung das Risiko?", ["Alle Anlagen steigen gleichzeitig", "Schwankungen gleichen sich teilweise aus", "Der Staat garantiert es"], 1)},
     ]},
    {"id": "sustainability", "title": "Nachhaltig investieren", "area": "Nachhaltigkeit",
     "values": ["Nachhaltigkeit", "Soziale Verantwortung"], "lab": None,
     "lessons": [
         {"id": "sus-1", "title": "Was bedeutet ESG?", "text":
          "E = Environment (Umwelt), S = Social (Soziales), G = Governance (gute Unternehmensführung).",
          "quiz": ("Wofür steht das „G“ in ESG?", ["Gewinn", "Governance", "Gold"], 1)},
         {"id": "sus-2", "title": "So berechnen wir deine Passung", "text":
          "Jedes Asset bekommt pro Wert 0–100 %. Deine Passung = 80 % Durchschnitt deiner Werte + 20 % Risikopassung.\n\n"
          "Die Punktzahlen sind in dieser Version Beispielwerte.", "quiz": None},
         {"id": "sus-3", "title": "Greenwashing erkennen", "text":
          "Ein Fonds mit „Klima“ im Namen kann trotzdem Ölkonzerne enthalten. Prüfe Ausschlüsse und unabhängige Prüfungen.",
          "quiz": ("Ein Fonds heißt „Green Future“. Was folgt sicher daraus?", ["Er ist nachhaltig", "Nichts – der Name sagt wenig", "Er ist kostenlos"], 1)},
     ]},
    {"id": "crypto-code", "title": "Code verstehen: So funktioniert Bitcoin", "area": "Krypto & Code",
     "values": ["Technologie & Innovation"], "lab": "Krypto",
     "lessons": [
         {"id": "cc-1", "title": "Was ist ein Hash?", "text":
          "Ein Hash ist ein digitaler Fingerabdruck: Aus jedem Text werden 64 Zeichen.\n"
          "Ändert man ein Zeichen, ändert sich der ganze Hash.\n\n"
          "import hashlib\nprint(hashlib.sha256(b'Hallo').hexdigest())",
          "quiz": ("Was passiert, wenn ein Zeichen geändert wird?", ["Nur das letzte Zeichen ändert sich", "Der Hash ändert sich komplett", "Nichts"], 1)},
         {"id": "cc-2", "title": "Blöcke und die Kette", "text":
          "Jeder Block enthält den Hash des vorherigen Blocks. Ändert jemand einen alten Block, passt die Kette nicht mehr.",
          "quiz": ("Warum enthält jeder Block den vorherigen Hash?", ["Speicher sparen", "Manipulationen fallen auf", "Tradition"], 1)},
         {"id": "cc-3", "title": "Mining und Proof of Work", "text":
          "Miner suchen eine Zahl (Nonce), sodass der Hash mit Nullen beginnt.\n\n"
          "while not hash.startswith('000'):\n    nonce += 1",
          "quiz": ("Von 3 auf 4 Nullen – wie viel mehr Versuche?", ["Doppelt", "16-mal so viele", "Gleich viele"], 1)},
         {"id": "cc-4", "title": "Sicherheit und 51-%-Angriff", "text":
          "Wer mehr als die Hälfte der Rechenleistung hat, könnte die Kette überholen. Im Labor: attack 30 6",
          "quiz": ("Was schützt deine Coins am meisten?", ["Dein privater Schlüssel", "Ein Passwort-Foto", "Der Kurs"], 0)},
     ]},
    {"id": "real-estate", "title": "Immobilien verstehen", "area": "Immobilien",
     "values": ["Regelmäßiges Einkommen"], "lab": "Immobilien",
     "lessons": [
         {"id": "re-1", "title": "Mietrendite berechnen", "text":
          "Bruttomietrendite = Jahreskaltmiete ÷ Kaufpreis.\nBeispiel: 12.000 € ÷ 300.000 € = 4 %.",
          "quiz": ("Was zeigt die Mietrendite?", ["Gewinn nach Steuern", "Jährlichen Ertrag im Verhältnis zum Kaufpreis", "Immer mehr als die Preissteigerung"], 1)},
         {"id": "re-2", "title": "Lage, Lage, Lage", "text":
          "Parks, Schulen, Nahverkehr und Jobs erhöhen den Wert, Industrie senkt ihn. Probier es im Immobilien-Labor aus.",
          "quiz": None},
         {"id": "re-3", "title": "Hebel durch Kredit", "text":
          "60.000 € Eigenkapital + 240.000 € Kredit: Wert +10 % = +50 % auf dein Eigenkapital, −10 % = −50 %.",
          "quiz": ("Was macht ein Kredit mit dem Risiko?", ["Verringert es", "Verstärkt Gewinne und Verluste", "Nichts"], 1)},
     ]},
    {"id": "commodities", "title": "Rohstoffe, Optionen & Spieltheorie", "area": "Strategie",
     "values": ["Sicherheit"], "lab": "Strategie",
     "lessons": [
         {"id": "co-1", "title": "Futures", "text":
          "Ein Future ist ein Vertrag über Kauf/Verkauf zu einem heute festgelegten Preis in der Zukunft.",
          "quiz": ("Was ist ein Future?", ["Eine Aktie", "Ein Vertrag zu einem heute festgelegten Preis", "Eine Kryptowährung"], 1)},
         {"id": "co-2", "title": "Call und Put", "text":
          "Ein Call gibt das Recht zu kaufen, ein Put das Recht zu verkaufen. Käufer verlieren maximal die Prämie.",
          "quiz": ("Du kaufst einen Call. Maximaler Verlust?", ["Unbegrenzt", "Die Prämie", "Der Basispreis"], 1)},
         {"id": "co-3", "title": "Das Nash-Gleichgewicht", "text":
          "Kein Spieler kann sich verbessern, wenn er allein seine Strategie ändert – und trotzdem ist es oft nicht das beste Ergebnis für alle.",
          "quiz": ("Ist ein Nash-Gleichgewicht immer das Beste für alle?", ["Ja", "Nein", "Gibt es nicht"], 1)},
     ]},
    {"id": "behavior", "title": "Denkfehler beim Investieren", "area": "Psychologie", "values": ["Sicherheit"], "lab": None,
     "lessons": [
         {"id": "be-1", "title": "Selbstüberschätzung", "text":
          "Die meisten halten sich für überdurchschnittlich gute Anleger. Gegenmittel: Regeln vorher festlegen.",
          "quiz": ("Was hilft gegen Selbstüberschätzung?", ["Öfter handeln", "Feste Regeln und ehrliches Messen", "Bauchgefühl"], 1)},
         {"id": "be-2", "title": "Herdentrieb und FOMO", "text":
          "Würde ich das auch kaufen, wenn niemand darüber spricht?", "quiz": None},
     ]},
]


def course_by_id(cid: str):
    return next((c for c in COURSES if c["id"] == cid), None)


# ============================================================================
# Rechenkerne
# ============================================================================

def value_match(asset: Asset, profile: dict) -> tuple[float, float, list]:
    """Passung eines Assets zu den Werten (80 %) und zur Risikobereitschaft (20 %)."""
    chosen = profile["values"] or VALUES
    parts = [(v, asset.score(v), asset.reasons.get(v)) for v in VALUES if v in chosen]
    avg = sum(p[1] for p in parts) / len(parts) if parts else 0.5
    diff = asset.risk - profile["risk"]
    penalty = diff / 4 if diff > 0 else -diff / 8
    risk_fit = max(0.0, 1 - penalty)
    return 0.8 * avg + 0.2 * risk_fit, risk_fit, parts


def correlation(a: str, b: str) -> float:
    if a == b:
        return 0.85
    if "Cash" in (a, b):
        return 0.0
    pair = {a, b}
    if pair == {"Aktien & ETFs", "Immobilien"}:
        return 0.6
    if pair == {"Aktien & ETFs", "Krypto"}:
        return 0.4
    if pair == {"Aktien & ETFs", "Anleihen"}:
        return 0.1
    return 0.25


def portfolio_stats(weights: dict, assets: dict) -> tuple[float, float, float]:
    items = [(assets[k], w) for k, w in weights.items() if w > 0 and k in assets]
    total = sum(w for _, w in items)
    if total <= 0:
        return 0, 0, 0
    norm = [(a, w / total) for a, w in items]
    mu = sum(a.er * w for a, w in norm)
    inc = sum(a.income * w for a, w in norm)
    var = 0.0
    for a, wa in norm:
        for b, wb in norm:
            rho = 1.0 if a.id == b.id else correlation(a.cls, b.cls)
            var += wa * wb * a.vol * b.vol * rho
    return mu, math.sqrt(max(var, 0)), inc


def percentile(sorted_vals: list, p: float) -> float:
    if not sorted_vals:
        return 0
    return sorted_vals[min(len(sorted_vals) - 1, max(0, round((len(sorted_vals) - 1) * p)))]


def simulate(initial, monthly, years, mu, sigma, paths=500, inflation=0.0, crash_year=None, seed=2026):
    """Monte-Carlo: viele mögliche Zukünfte. Gibt Bandbreite je Jahr zurück."""
    rng = random.Random(seed)
    dt = 1 / 12
    drift = (mu - 0.5 * sigma ** 2) * dt
    shock = sigma * math.sqrt(dt)
    per_year = [[] for _ in range(years + 1)]
    drawdowns = []
    for _ in range(paths):
        v = initial
        peak = v
        max_dd = 0.0
        per_year[0].append(v)
        for m in range(1, years * 12 + 1):
            v = v * math.exp(drift + shock * rng.gauss(0, 1)) + monthly
            if crash_year and m == crash_year * 12:
                v *= 0.7
            peak = max(peak, v)
            max_dd = max(max_dd, 1 - v / peak if peak > 0 else 0)
            if m % 12 == 0:
                y = m // 12
                per_year[y].append(v / ((1 + inflation) ** y))
        drawdowns.append(max_dd)
    rows = []
    for y in range(years + 1):
        s = sorted(per_year[y])
        rows.append({"year": y, "invested": initial + monthly * 12 * y,
                     "p10": percentile(s, 0.1), "p50": percentile(s, 0.5), "p90": percentile(s, 0.9)})
    invested = initial + monthly * 12 * years
    finals = per_year[years]
    loss = sum(1 for f in finals if f < invested) / max(len(finals), 1)
    return {"rows": rows, "loss": loss, "dd": percentile(sorted(drawdowns), 0.5), "invested": invested}


def future_value(current, monthly, years, rate):
    n = max(years * 12, 0)
    r = rate / 12
    g = (1 + r) ** n
    return current + monthly * n if abs(r) < 1e-9 else current * g + monthly * (g - 1) / r


def required_monthly(target, current, years, rate):
    n = max(years * 12, 1)
    r = rate / 12
    g = (1 + r) ** n
    rest = target - current * g
    if rest <= 0:
        return 0.0
    return rest / n if abs(r) < 1e-9 else rest * r / (g - 1)


def norm_cdf(x: float) -> float:
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def black_scholes(call: bool, s: float, k: float, t: float, r: float, sigma: float) -> float:
    if t <= 0 or sigma <= 0:
        return max(0.0, s - k if call else k - s)
    d1 = (math.log(s / k) + (r + 0.5 * sigma ** 2) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)
    if call:
        return s * norm_cdf(d1) - k * math.exp(-r * t) * norm_cdf(d2)
    return k * math.exp(-r * t) * norm_cdf(-d2) - s * norm_cdf(-d1)


def derivative_profit(kind: str, price: float, strike: float, premium: float, units: float) -> float:
    per_unit = {
        "Future kaufen": price - strike,
        "Future verkaufen": strike - price,
        "Call kaufen": max(0, price - strike) - premium,
        "Put kaufen": max(0, strike - price) - premium,
        "Call verkaufen": premium - max(0, price - strike),
        "Put verkaufen": premium - max(0, strike - price),
    }[kind]
    return per_unit * units


def attacker_success(q: float, z: int) -> float:
    """Formel aus dem Bitcoin-Whitepaper (Abschnitt 11)."""
    p = 1 - q
    if q >= p:
        return 1.0
    lam = z * (q / p)
    total = 1.0
    for k in range(z + 1):
        poisson = math.exp(-lam)
        for i in range(1, k + 1):
            poisson *= lam / i
        total -= poisson * (1 - (q / p) ** (z - k))
    return max(0.0, total)


# --- Mini-Blockchain -------------------------------------------------------

def block_hash(index: int, data: str, prev: str, nonce: int) -> str:
    return hashlib.sha256(f"{index}|{data}|{prev}|{nonce}".encode()).hexdigest()


class MiniChain:
    GENESIS_PREV = "0" * 64

    def __init__(self, difficulty: int = 3):
        self.difficulty = difficulty
        self.reset()

    def reset(self):
        self.blocks = [{"index": 0, "data": "Genesis-Block", "prev": self.GENESIS_PREV, "nonce": 0}]
        self.mine(0)

    def hash(self, i: int) -> str:
        b = self.blocks[i]
        return block_hash(b["index"], b["data"], b["prev"], b["nonce"])

    def status(self, i: int) -> str:
        expected = self.GENESIS_PREV if i == 0 else self.hash(i - 1)
        if self.blocks[i]["prev"] != expected:
            return "Kette unterbrochen"
        if not self.hash(i).startswith("0" * self.difficulty):
            return "nicht gemint"
        return "gültig"

    def is_valid(self) -> bool:
        return all(self.status(i) == "gültig" for i in range(len(self.blocks)))

    def add(self, data: str) -> int:
        self.blocks.append({"index": len(self.blocks), "data": data, "prev": self.hash(len(self.blocks) - 1), "nonce": 0})
        return len(self.blocks) - 1

    def relink(self, start: int):
        for j in range(max(start, 1), len(self.blocks)):
            self.blocks[j]["prev"] = self.hash(j - 1)

    def set_data(self, i: int, data: str):
        self.blocks[i]["data"] = data
        self.relink(i + 1)

    def tamper(self, i: int, data: str):
        self.blocks[i]["data"] = data

    def mine(self, i: int, limit: int = 3_000_000) -> int | None:
        b = self.blocks[i]
        if i > 0:
            b["prev"] = self.hash(i - 1)
        prefix = "0" * self.difficulty
        for nonce in range(limit):
            if block_hash(b["index"], b["data"], b["prev"], nonce).startswith(prefix):
                b["nonce"] = nonce
                self.relink(i + 1)
                return nonce + 1
        return None


CHAINSCRIPT_EXAMPLE = """# Jede Zeile ist ein Befehl. Tippe "help" für alle Befehle.
difficulty 3
block "Alice zahlt Bob 5 Coins"
block "Bob zahlt Carol 2 Coins"
mine
verify

# Was passiert bei einer Fälschung?
tamper 1 "Alice zahlt Bob 500 Coins"
verify

# Wie sicher sind 6 Bestätigungen gegen 30 % Angreifer?
attack 30 6
"""

CHAINSCRIPT_HELP = """Befehle:
  difficulty N      Schwierigkeit 1–5
  block "Text"      neuen Block anhängen
  mine              alle ungültigen Blöcke minen
  verify            Kette prüfen
  tamper N "Text"   Block N heimlich ändern
  edit N "Text"     Block N ändern und neu verketten
  hash "Text"       SHA-256 eines Textes
  print             Kette ausgeben
  attack Q Z        Angreifer mit Q % bei Z Bestätigungen
  reset             neue Kette"""


def run_chainscript(source: str, chain: MiniChain) -> list[tuple[str, str]]:
    out = []

    def quoted(line):
        a, b = line.find('"'), line.rfind('"')
        return line[a + 1:b] if 0 <= a < b else None

    for n, raw in enumerate(source.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        out.append(("echo", "› " + line))
        parts = line.split()
        cmd, args = parts[0].lower(), parts[1:]
        try:
            if cmd == "help":
                out.append(("info", CHAINSCRIPT_HELP))
            elif cmd == "difficulty":
                d = int(args[0])
                if not 1 <= d <= 5:
                    raise ValueError
                chain.difficulty = d
                out.append(("info", f"Hash muss mit {'0' * d} beginnen (ca. {fmt_num(16 ** d, 0)} Versuche)."))
            elif cmd == "block":
                i = chain.add(quoted(line) or "")
                out.append(("info", f"Block {i} angehängt (noch nicht gemint)."))
            elif cmd == "mine":
                for i in range(len(chain.blocks)):
                    if chain.status(i) != "gültig":
                        tries = chain.mine(i)
                        out.append(("ok", f"Block {i} gemint: {fmt_num(tries or 0, 0)} Versuche, Hash {chain.hash(i)[:20]}…"))
            elif cmd == "verify":
                if chain.is_valid():
                    out.append(("ok", f"✓ Kette gültig ({len(chain.blocks)} Blöcke)."))
                for i in range(len(chain.blocks)):
                    if chain.status(i) != "gültig":
                        out.append(("err", f"✗ Block {i}: {chain.status(i)}"))
            elif cmd in ("tamper", "edit"):
                i = int(args[0])
                text = quoted(line) or ""
                if cmd == "tamper":
                    chain.tamper(i, text)
                    out.append(("info", f"Block {i} heimlich geändert – prüfe mit verify."))
                else:
                    chain.set_data(i, text)
                    out.append(("info", f"Block {i} geändert, folgende Blöcke neu verkettet."))
            elif cmd == "hash":
                text = quoted(line) or ""
                out.append(("info", f'SHA-256("{text}") =\n  {hashlib.sha256(text.encode()).hexdigest()}'))
            elif cmd == "print":
                for i, b in enumerate(chain.blocks):
                    out.append(("info", f"[{i}] {b['data']} · nonce {b['nonce']} · {chain.hash(i)[:14]}… · {chain.status(i)}"))
            elif cmd == "attack":
                q, z = float(args[0].replace("%", "")), int(args[1])
                p = attacker_success(q / 100, z)
                out.append(("info", f"Angreifer {fmt_num(q, 0)} %, {z} Bestätigungen: Erfolgschance ≈ {fmt_pct(p, 4)}"))
            elif cmd == "reset":
                chain.reset()
                out.append(("info", "Neue Kette erstellt."))
            else:
                out.append(("err", f"Zeile {n}: Unbekannter Befehl „{cmd}“. Tippe help."))
        except (ValueError, IndexError):
            out.append(("err", f"Zeile {n}: Befehl unvollständig. Tippe help."))
    return out


# --- Stadtmodell (Immobilien-Labor) ---------------------------------------

BUILDINGS = {
    # Name: (Farbe, Kosten Mio €, Nachbarschaftseffekt, Höhe, vermietbar, Einwohner, Jobs, Beschreibung)
    "Leer": ("#1b2147", 0, 0.0, 0.0, False, 0, 0, "Freie Fläche."),
    "Wohnhaus": (BLUE, 4, -0.004, 0.8, True, 400, 0, "Wohnraum für ca. 400 Menschen."),
    "Wohnturm": ("#4059f2", 14, -0.012, 2.6, True, 1200, 0, "Hohe Dichte: mehr Angebot senkt Mieten."),
    "Büro": (PURPLE, 10, 0.03, 1.8, True, 0, 600, "600 Arbeitsplätze erhöhen die Nachfrage nach Wohnraum."),
    "Handel": (LAVENDER, 5, 0.04, 0.6, True, 0, 200, "Läden machen ein Viertel attraktiver."),
    "Park": ("#4db38c", 2, 0.08, 0.08, False, 0, 0, "Grünfläche: steigert Preise in der Nähe."),
    "Schule": (SKY, 6, 0.06, 0.7, False, 0, 80, "Wichtig für Familien."),
    "U-Bahn": ("#f2cc66", 12, 0.12, 0.35, False, 0, 40, "Stärkster Preistreiber: gute Anbindung."),
    "Industrie": (GRAY, 7, -0.10, 1.0, False, 0, 500, "Viele Jobs, aber Lärm senkt Preise in der Nähe."),
}


class CityModel:
    SIZE = 8
    BASE = 3500.0

    def __init__(self):
        n = self.SIZE
        self.cells = [{"b": "Leer", "price": self.BASE} for _ in range(n * n)]
        for x, y, b in [(2, 2, "Wohnhaus"), (2, 3, "Wohnhaus"), (3, 2, "Wohnhaus"), (3, 3, "Büro"),
                        (4, 3, "Handel"), (4, 2, "Wohnhaus"), (2, 4, "Park"), (5, 5, "Wohnhaus"),
                        (6, 6, "Industrie"), (7, 6, "Industrie"), (1, 1, "Wohnhaus"), (3, 5, "Wohnhaus")]:
            self.cells[y * n + x]["b"] = b
        self.year = 0
        self.budget = 60.0
        self.rate = 0.035
        self.investment = None
        self.recompute(1.0)
        self.history = [self.stats()]

    def location_score(self, i: int) -> float:
        n = self.SIZE
        x, y = i % n, i // n
        score = 0.0
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if 0 <= nx < n and 0 <= ny < n:
                    score += BUILDINGS[self.cells[ny * n + nx]["b"]][2] / max(abs(dx), abs(dy))
        return score

    def population(self):
        return sum(BUILDINGS[c["b"]][5] for c in self.cells)

    def jobs(self):
        return sum(BUILDINGS[c["b"]][6] for c in self.cells)

    def demand(self):
        return max(0.5, min(1.8, (self.jobs() / 0.55) / max(self.population(), 1)))

    def vacancy(self):
        return max(0.01, min(0.3, 0.06 - (self.demand() - 1) * 0.1))

    def recompute(self, smoothing: float):
        demand_factor = 0.7 + 0.3 * self.demand()
        rate_factor = 1 + (0.035 - self.rate) * 6
        for i, c in enumerate(self.cells):
            target = self.BASE * (1 + self.location_score(i)) * demand_factor * rate_factor
            c["price"] += (target - c["price"]) * smoothing

    def rent(self, i: int) -> float:
        b = self.cells[i]["b"]
        y = 0.05 if b == "Büro" else 0.055 if b == "Handel" else 0.038
        return self.cells[i]["price"] * y / 12

    def place(self, b: str, i: int) -> str:
        cost = BUILDINGS[b][1]
        if self.cells[i]["b"] == b:
            return "same"
        if cost > self.budget:
            return "budget"
        self.budget -= cost
        self.cells[i]["b"] = b
        if self.investment and self.investment["cell"] == i and not BUILDINGS[b][4]:
            self.investment = None
        self.recompute(0.35)
        self.history[-1] = self.stats()
        return "ok"

    def advance(self, years: int = 1):
        for _ in range(years):
            self.year += 1
            for c in self.cells:
                c["price"] *= 1.015
            self.recompute(0.3)
            self.budget += self.population() / 1000 * 0.8 + self.jobs() / 1000 * 1.2
            if self.investment:
                inv = self.investment
                inv["rent"] += self.rent(inv["cell"]) * inv["sqm"] * 12 * (1 - self.vacancy())
            self.history.append(self.stats())

    def stats(self) -> dict:
        ids = [i for i, c in enumerate(self.cells) if BUILDINGS[c["b"]][4]]
        avg_price = sum(self.cells[i]["price"] for i in ids) / len(ids) if ids else self.BASE
        avg_rent = sum(self.rent(i) for i in ids) / len(ids) if ids else 0
        count = lambda name: sum(1 for c in self.cells if c["b"] == name)
        quality = max(0, min(100, 45 + count("Park") * 7 + count("Schule") * 5 + count("U-Bahn") * 6 - count("Industrie") * 6))
        co2 = max(0, count("Industrie") * 12 + self.population() / 1000 * 3 - count("U-Bahn") * 4 - count("Park") * 1.5)
        return {"year": self.year, "price": avg_price, "rent": avg_rent, "pop": self.population(),
                "jobs": self.jobs(), "vacancy": self.vacancy(), "quality": quality, "co2": co2}


# --- Spieltheorie ----------------------------------------------------------

GAMES = [
    {"title": "Ölförder-Dilemma", "row": "Du (Land A)", "col": "Land B", "actions": ["Drosseln", "Mehr fördern"],
     "pay": [[(6, 6), (1, 8)], [(8, 1), (3, 3)]], "unit": "Mrd. €",
     "lesson": "Gefangenendilemma: Mehr fördern ist einzeln immer besser – tun es beide, verdienen beide weniger (3 statt 6)."},
    {"title": "Bauen oder Warten?", "row": "Du (Entwickler A)", "col": "Entwickler B", "actions": ["Warten", "Jetzt bauen"],
     "pay": [[(3, 3), (2, 6)], [(6, 2), (-2, -2)]], "unit": "Mio. €",
     "lesson": "Zwei Gleichgewichte: Einer baut, der andere wartet. Wer zuerst glaubhaft baut, gewinnt."},
    {"title": "Bauer & Mühle", "row": "Du (Bauer)", "col": "Mühle", "actions": ["Vertrag", "Freier Markt"],
     "pay": [[(5, 5), (0, 3)], [(3, 0), (3, 3)]], "unit": "Punkte",
     "lesson": "Koordinationsspiel: Beide profitieren vom Vertrag, aber nur mit Vertrauen."},
]

STRATEGIES = {
    "Wie du mir, so ich dir": "Beginnt freundlich, kopiert dann den letzten Zug des Gegners.",
    "Immer kooperieren": "Kooperiert immer – leicht auszunutzen.",
    "Immer eigennützig": "Handelt immer eigennützig.",
    "Nachtragend": "Kooperiert, bis der Gegner einmal betrügt – dann nie wieder.",
    "Zufall": "Entscheidet zufällig.",
}


def nash(game) -> list:
    res = []
    p = game["pay"]
    for r in range(2):
        for c in range(2):
            if p[r][c][0] >= p[1 - r][c][0] and p[r][c][1] >= p[r][1 - c][1]:
                res.append((r, c))
    return res


def strategy_move(name: str, mine: list, theirs: list, rng: random.Random) -> int:
    if name == "Wie du mir, so ich dir":
        return theirs[-1] if theirs else 0
    if name == "Immer kooperieren":
        return 0
    if name == "Immer eigennützig":
        return 1
    if name == "Nachtragend":
        return 1 if 1 in theirs else 0
    return 0 if rng.random() < 0.5 else 1


def tournament(game, rounds: int) -> list:
    rng = random.Random(1)
    names = list(STRATEGIES)
    scores = {n: 0.0 for n in names}
    for i, a in enumerate(names):
        for b in names[i:]:
            ha, hb, sa, sb = [], [], 0, 0
            for _ in range(rounds):
                ma, mb = strategy_move(a, ha, hb, rng), strategy_move(b, hb, ha, rng)
                sa += game["pay"][ma][mb][0]
                sb += game["pay"][ma][mb][1]
                ha.append(ma)
                hb.append(mb)
            scores[a] += sa
            if a != b:
                scores[b] += sb
    return sorted(scores.items(), key=lambda kv: -kv[1])


# ============================================================================
# Zustand: Profil, Depot, Lernfortschritt (wird lokal gespeichert)
# ============================================================================

def default_state() -> dict:
    year = date.today().year
    return {
        "profile": {"name": "", "age": "25–39", "risk": 4, "values": ["Nachhaltigkeit"],
                    "simple": False, "onboarded": False},
        "goals": [{"kind": "Vermögen aufbauen", "target": 50000, "year": year + 10, "monthly": 250, "share": 0.7}],
        "cash": 3150.0,
        "holdings": {"world-etf": [132, 84.10], "reit-res": [568, 25.20], "btc": [0.1, 41000],
                     "eth": [1.24, 1950], "gold": [2.15, 1820], "infra": [56.5, 50.0]},
        "transactions": [{"date": str(date.today() - timedelta(days=200)), "kind": "Einzahlung", "asset": "", "amount": 40000}],
        "lessons": [],
    }


class AppState:
    def __init__(self):
        self.data = default_state()
        try:
            with open(SAVE_FILE, encoding="utf-8") as f:
                self.data.update(json.load(f))
        except (OSError, ValueError):
            pass
        self.assets = {a.id: a for a in make_assets()}
        self.rng = random.Random(int(time.time()))

    def save(self):
        try:
            with open(SAVE_FILE, "w", encoding="utf-8") as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
        except OSError:
            pass

    @property
    def profile(self):
        return self.data["profile"]

    def tick(self):
        dt = 1 / (365 * 24 * 60)
        for a in self.assets.values():
            if a.vol <= 0:
                continue
            a.price *= math.exp(a.vol * math.sqrt(dt) * self.rng.gauss(0, 1) * 3)
            a.history[-1] = a.price
            a.day_change = a.price / a.history[-2] - 1

    # --- Depot ---
    def holding_value(self, aid):
        q, _ = self.data["holdings"][aid]
        return q * self.assets[aid].price

    def total(self) -> float:
        return self.data["cash"] + sum(self.holding_value(k) for k in self.data["holdings"])

    def invested(self) -> float:
        return sum(q * p for q, p in self.data["holdings"].values())

    def allocation(self) -> list:
        by = {"Cash": self.data["cash"]}
        for k in self.data["holdings"]:
            c = self.assets[k].cls
            by[c] = by.get(c, 0) + self.holding_value(k)
        tot = max(sum(by.values()), 1)
        return sorted([(c, v, v / tot) for c, v in by.items() if v > 0], key=lambda t: -t[1])

    def history(self) -> list:
        out = []
        for i in range(365):
            v = self.data["cash"]
            for k, (q, _) in self.data["holdings"].items():
                v += q * self.assets[k].history[i]
            out.append(v)
        return out

    def monthly_income(self) -> float:
        inc = sum(self.holding_value(k) * self.assets[k].income for k in self.data["holdings"])
        return (inc + self.data["cash"] * 0.02) / 12

    def risk_score(self) -> float:
        tot = self.total()
        if tot <= 0:
            return 1
        r = self.data["cash"] / tot
        for k in self.data["holdings"]:
            r += self.holding_value(k) / tot * self.assets[k].risk
        return r

    def value_score(self, value: str) -> float:
        tot = self.total()
        s = self.data["cash"] / tot * self.assets["cash"].score(value)
        for k in self.data["holdings"]:
            s += self.holding_value(k) / tot * self.assets[k].score(value)
        return s

    def add_tx(self, kind, amount, asset=""):
        self.data["transactions"].insert(0, {"date": str(date.today()), "kind": kind, "asset": asset, "amount": amount})
        self.save()

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("Bitte einen Betrag größer als 0 eingeben.")
        self.data["cash"] += amount
        self.add_tx("Einzahlung", amount)

    def withdraw(self, amount):
        if amount <= 0 or amount > self.data["cash"]:
            raise ValueError("Nicht genug Guthaben.")
        self.data["cash"] -= amount
        self.add_tx("Auszahlung", amount)

    def buy(self, aid, amount):
        a = self.assets[aid]
        if amount <= 0 or amount > self.data["cash"]:
            raise ValueError("Nicht genug Guthaben. Zahle zuerst Geld ein.")
        if a.course and not self.course_done(a.course):
            raise ValueError("Bevor du Krypto handelst, schließe bitte den Kurs „Code verstehen“ ab.")
        qty = amount / a.price
        q, p = self.data["holdings"].get(aid, [0, a.price])
        self.data["holdings"][aid] = [q + qty, (q * p + amount) / (q + qty)]
        self.data["cash"] -= amount
        self.add_tx("Kauf", amount, a.name)

    def sell(self, aid, amount):
        a = self.assets[aid]
        if aid not in self.data["holdings"]:
            raise ValueError("Du besitzt dieses Asset nicht.")
        q, p = self.data["holdings"][aid]
        qty = min(amount / a.price, q)
        if qty <= 0:
            raise ValueError("Bitte einen Betrag größer als 0 eingeben.")
        if q - qty < 1e-9:
            del self.data["holdings"][aid]
        else:
            self.data["holdings"][aid] = [q - qty, p]
        self.data["cash"] += qty * a.price
        self.add_tx("Verkauf", qty * a.price, a.name)

    # --- Lernen ---
    def course_progress(self, course) -> float:
        done = sum(1 for l in course["lessons"] if l["id"] in self.data["lessons"])
        return done / len(course["lessons"])

    def course_done(self, cid) -> bool:
        c = course_by_id(cid)
        return c is None or self.course_progress(c) >= 1

    def learning_progress(self) -> float:
        all_l = [l for c in COURSES for l in c["lessons"]]
        return sum(1 for l in all_l if l["id"] in self.data["lessons"]) / len(all_l)

    def recommended(self) -> list:
        def rel(c):
            s = len([v for v in c["values"] if v in self.profile["values"]]) * 1.5
            if c["id"] == "basics":
                s += 2
            if c["id"] == "crypto-code":
                s += 2
            if self.course_progress(c) >= 1:
                s -= 5
            return s
        return sorted(COURSES, key=lambda c: -rel(c))


# ============================================================================
# Oberfläche: Bausteine
# ============================================================================

class ScrollFrame(tk.Frame):
    """Scrollbarer Bereich (Mausrad funktioniert)."""

    def __init__(self, parent):
        super().__init__(parent, bg=BG)
        self.canvas = tk.Canvas(self, bg=BG, highlightthickness=0)
        bar = ttk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.inner = tk.Frame(self.canvas, bg=BG)
        self.inner.bind("<Configure>", lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.win = self.canvas.create_window((0, 0), window=self.inner, anchor="nw")
        self.canvas.bind("<Configure>", lambda e: self.canvas.itemconfigure(self.win, width=e.width))
        self.canvas.configure(yscrollcommand=bar.set)
        self.canvas.pack(side="left", fill="both", expand=True)
        bar.pack(side="right", fill="y")
        self.bind_all("<MouseWheel>", self._wheel)
        self.bind_all("<Button-4>", lambda e: self.canvas.yview_scroll(-3, "units"))
        self.bind_all("<Button-5>", lambda e: self.canvas.yview_scroll(3, "units"))

    def _wheel(self, e):
        try:
            self.canvas.yview_scroll(int(-e.delta / (120 if abs(e.delta) >= 120 else 1)), "units")
        except tk.TclError:
            pass


class UI:
    """Kleine Helfer für einheitliche Optik."""

    def __init__(self, app):
        self.app = app

    def font(self, size=11, bold=False):
        size = size + 3 if self.app.state.profile["simple"] else size
        return ("Segoe UI", size, "bold" if bold else "normal")

    def label(self, parent, text, size=11, bold=False, color=TEXT, bg=CARD, wrap=0, **kw):
        return tk.Label(parent, text=text, font=self.font(size, bold), fg=color, bg=bg,
                        anchor="w", justify="left", wraplength=wrap, **kw)

    def card(self, parent, title=None, side=None):
        outer = tk.Frame(parent, bg=CARD, highlightbackground=BORDER, highlightthickness=1)
        if side:
            outer.pack(side=side, fill="both", expand=True, padx=6, pady=6)
        else:
            outer.pack(fill="x", padx=6, pady=6)
        if title:
            self.label(outer, title, 13, True).pack(fill="x", padx=14, pady=(12, 4))
        body = tk.Frame(outer, bg=CARD)
        body.pack(fill="both", expand=True, padx=14, pady=(4, 12))
        return body

    def button(self, parent, text, cmd, primary=True, width=None):
        b = tk.Button(parent, text=text, command=cmd, font=self.font(11, True),
                      bg=BLUE if primary else CARD2, fg=TEXT, activebackground=PURPLE, activeforeground=TEXT,
                      relief="flat", bd=0, padx=14, pady=7, cursor="hand2")
        if width:
            b.configure(width=width)
        return b

    def tile(self, parent, title, value, sub=None, sub_color=TEXT3):
        f = tk.Frame(parent, bg=CARD2, padx=14, pady=10)
        f.pack(side="left", fill="both", expand=True, padx=5, pady=5)
        self.label(f, title, 9, color=TEXT2, bg=CARD2).pack(anchor="w")
        self.label(f, value, 17, True, bg=CARD2).pack(anchor="w")
        if sub:
            self.label(f, sub, 9, color=sub_color, bg=CARD2).pack(anchor="w")
        return f

    def change(self, v: float) -> tuple[str, str]:
        return ("▲ " if v >= 0 else "▼ ") + fmt_pct(v, sign=True), GREEN if v >= 0 else RED

    def badge(self, parent, text, color, bg=BG):
        tk.Label(parent, text=" " + text + " ", font=("Segoe UI", 8, "bold"), fg=color, bg=bg,
                 highlightbackground=color, highlightthickness=1).pack(side="left", padx=4)

    def progress(self, parent, value, width=220, height=8, bg=CARD):
        c = tk.Canvas(parent, width=width, height=height, bg=bg, highlightthickness=0)
        c.create_rectangle(0, 0, width, height, fill="#2a3060", outline="")
        c.create_rectangle(0, 0, max(height, width * min(max(value, 0), 1)), height, fill=PURPLE, outline="")
        return c

    def hint(self, parent, text, bg=CARD):
        """Erklärung – im einfachen Modus immer offen."""
        box = tk.Frame(parent, bg=bg)
        box.pack(fill="x", pady=(6, 0))
        body = self.label(box, text, 10, color=TEXT2, bg=bg, wrap=760)
        shown = {"v": self.app.state.profile["simple"]}

        def toggle():
            shown["v"] = not shown["v"]
            render()

        btn = tk.Button(box, text="", command=toggle, font=self.font(9), fg=SKY, bg=bg, relief="flat",
                        bd=0, activebackground=bg, activeforeground=LAVENDER, cursor="hand2")

        def render():
            btn.configure(text="ⓘ Erklärung ausblenden" if shown["v"] else "ⓘ Was bedeutet das?")
            if shown["v"]:
                body.pack(fill="x", after=btn)
            else:
                body.pack_forget()

        btn.pack(anchor="w")
        render()


# --- Diagramme direkt auf dem Canvas (ohne Zusatzpakete) --------------------

def draw_line_chart(canvas: tk.Canvas, series: list[tuple[list, str]], w: int, h: int,
                    band: tuple[list, list] | None = None, fill_first=True, labels=None, dashed_idx=()):
    canvas.delete("all")
    allv = [v for s, _ in series for v in s] + ([v for v in band[0] + band[1]] if band else [])
    if not allv:
        return
    lo, hi = min(allv), max(allv)
    pad = (hi - lo) * 0.08 or hi * 0.01 or 1
    lo, hi = lo - pad, hi + pad
    left, right, top, bottom = 58, w - 12, 10, h - 24
    n = max(len(series[0][0]), 2)

    def px(i):
        return left + (right - left) * i / (n - 1)

    def py(v):
        return bottom - (bottom - top) * (v - lo) / (hi - lo)

    for k in range(5):
        v = lo + (hi - lo) * k / 4
        y = py(v)
        canvas.create_line(left, y, right, y, fill="#232a57")
        canvas.create_text(left - 6, y, text=fmt_compact(v), fill=TEXT3, anchor="e", font=("Segoe UI", 8))
    if labels:
        for i, t in labels:
            canvas.create_text(px(i), bottom + 12, text=t, fill=TEXT3, font=("Segoe UI", 8))
    if band:
        pts = [(px(i), py(v)) for i, v in enumerate(band[1])] + [(px(i), py(v)) for i, v in reversed(list(enumerate(band[0])))]
        canvas.create_polygon(*[c for p in pts for c in p], fill="#3a2f7a", outline="")
    for idx, (s, color) in enumerate(series):
        pts = [(px(i), py(v)) for i, v in enumerate(s)]
        if idx == 0 and fill_first and not band:
            poly = pts + [(pts[-1][0], bottom), (pts[0][0], bottom)]
            canvas.create_polygon(*[c for p in poly for c in p], fill="#1c2a66", outline="")
        canvas.create_line(*[c for p in pts for c in p], fill=color, width=2,
                           dash=(5, 4) if idx in dashed_idx else None, smooth=True)


def draw_donut(canvas: tk.Canvas, slices: list, size: int, center_text: str):
    canvas.delete("all")
    start = 90.0
    pad = 8
    for name, _, share in slices:
        extent = -360 * share
        canvas.create_arc(pad, pad, size - pad, size - pad, start=start, extent=extent,
                          fill=CLASS_COLORS.get(name, GRAY), outline=CARD, width=2)
        start += extent
    r = size * 0.3
    canvas.create_oval(size / 2 - r, size / 2 - r, size / 2 + r, size / 2 + r, fill=CARD, outline=CARD)
    canvas.create_text(size / 2, size / 2 - 9, text="Portfolio", fill=TEXT2, font=("Segoe UI", 9))
    canvas.create_text(size / 2, size / 2 + 9, text=center_text, fill=TEXT, font=("Segoe UI", 11, "bold"))


def draw_bars(canvas: tk.Canvas, values: list, labels: list, w: int, h: int, colors=None, fmt=fmt_compact):
    canvas.delete("all")
    if not values:
        return
    hi = max(max(values), 0) or 1
    lo = min(min(values), 0)
    left, bottom, top = 10, h - 28, 12
    bw = (w - 20) / len(values)

    def py(v):
        return bottom - (bottom - top) * (v - lo) / (hi - lo or 1)

    canvas.create_line(left, py(0), w - 10, py(0), fill=TEXT3)
    for i, v in enumerate(values):
        x0 = left + i * bw + bw * 0.15
        x1 = left + (i + 1) * bw - bw * 0.15
        canvas.create_rectangle(x0, py(max(v, 0)), x1, py(min(v, 0)),
                                fill=(colors[i] if colors else PURPLE), outline="")
        canvas.create_text((x0 + x1) / 2, bottom + 10, text=labels[i], fill=TEXT2, font=("Segoe UI", 8))
        canvas.create_text((x0 + x1) / 2, py(max(v, 0)) - 7, text=fmt(v), fill=TEXT2, font=("Segoe UI", 8))


# ============================================================================
# Hauptfenster
# ============================================================================

SECTIONS = [
    ("Start", [("Übersicht", "⌂"), ("Mein Depot", "€"), ("Ziele & Strategie", "◎")]),
    ("Ausprobieren", [("Simulator", "↗"), ("Lernen", "✎")]),
    ("Labore", [("Krypto-Labor", "⟨⟩"), ("Immobilien-Labor", "▦"), ("Strategie-Labor", "♟")]),
    ("Hilfe", [("KI-Assistent", "✦"), ("Einstellungen", "⚙")]),
]


class InvestMindApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.state = AppState()
        self.ui = UI(self)
        self.chain = MiniChain(3)
        self.city = CityModel()
        self.current = "Übersicht"
        root.title(f"{APP_NAME} – {APP_CLAIM}")
        root.geometry("1280x820")
        root.minsize(1000, 650)
        root.configure(bg=BG)
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("Vertical.TScrollbar", background=CARD2, troughcolor=BG, bordercolor=BG, arrowcolor=TEXT2)
        style.configure("TCombobox", fieldbackground=CARD2, background=CARD2, foreground=TEXT)

        self.sidebar = tk.Frame(root, bg=BG2, width=230)
        self.sidebar.pack(side="left", fill="y")
        self.sidebar.pack_propagate(False)
        self.main = tk.Frame(root, bg=BG)
        self.main.pack(side="left", fill="both", expand=True)
        self.build_sidebar()
        self.show("Übersicht")
        self.root.after(3000, self.live_tick)
        if not self.state.profile["onboarded"]:
            self.root.after(300, self.onboarding)

    # --- Navigation ---
    def build_sidebar(self):
        for w in self.sidebar.winfo_children():
            w.destroy()
        ui = self.ui
        tk.Label(self.sidebar, text="◆ " + APP_NAME, font=ui.font(16, True), fg=TEXT, bg=BG2).pack(anchor="w", padx=18, pady=(18, 0))
        tk.Label(self.sidebar, text=APP_CLAIM, font=ui.font(8), fg=TEXT2, bg=BG2).pack(anchor="w", padx=18, pady=(0, 12))
        self.nav_buttons = {}
        for group, items in SECTIONS:
            tk.Label(self.sidebar, text=group.upper(), font=ui.font(8, True), fg=TEXT3, bg=BG2).pack(anchor="w", padx=18, pady=(10, 2))
            for name, icon in items:
                b = tk.Button(self.sidebar, text=f"  {icon}   {name}", anchor="w", font=ui.font(11),
                              fg=TEXT, bg=BG2, activebackground=CARD2, activeforeground=TEXT,
                              relief="flat", bd=0, padx=10, pady=6, cursor="hand2",
                              command=lambda n=name: self.show(n))
                b.pack(fill="x", padx=10, pady=1)
                self.nav_buttons[name] = b
        bottom = tk.Frame(self.sidebar, bg=BG2)
        bottom.pack(side="bottom", fill="x", padx=18, pady=18)
        tk.Label(bottom, text="Dein Lernfortschritt", font=ui.font(9), fg=TEXT2, bg=BG2).pack(anchor="w")
        ui.progress(bottom, self.state.learning_progress(), 190, 8, bg=BG2).pack(anchor="w", pady=4)
        tk.Label(bottom, text="„Nicht was du kaufst, ist entscheidend,\nsondern was du verstehst.“",
                 font=("Segoe UI", 8, "italic"), fg=TEXT3, bg=BG2, justify="left").pack(anchor="w")

    def show(self, name: str):
        self.current = name
        for n, b in self.nav_buttons.items():
            b.configure(bg=BLUE if n == name else BG2)
        for w in self.main.winfo_children():
            w.destroy()
        self.scroll = ScrollFrame(self.main)
        self.scroll.pack(fill="both", expand=True)
        page = self.scroll.inner
        pages = {
            "Übersicht": self.page_dashboard, "Mein Depot": self.page_portfolio,
            "Ziele & Strategie": self.page_goals, "Simulator": self.page_simulator,
            "Lernen": self.page_learn, "Krypto-Labor": self.page_crypto,
            "Immobilien-Labor": self.page_city, "Strategie-Labor": self.page_strategy,
            "KI-Assistent": self.page_assistant, "Einstellungen": self.page_settings,
        }
        pages[name](page)
        tk.Label(page, text="Hinweis: Alle Kurse, Nachrichten und Kennzahlen sind Demodaten. Keine Anlageberatung. "
                            "Simulationen sind keine Prognosen.", font=("Segoe UI", 8), fg=TEXT3, bg=BG,
                 wraplength=900, justify="left").pack(anchor="w", padx=16, pady=(4, 16))

    def header(self, page, title, subtitle, badge=None):
        f = tk.Frame(page, bg=BG)
        f.pack(fill="x", padx=12, pady=(16, 6))
        row = tk.Frame(f, bg=BG)
        row.pack(anchor="w")
        tk.Label(row, text=title, font=self.ui.font(24, True), fg=TEXT, bg=BG).pack(side="left")
        if badge:
            color = {"ECHTGELD": GREEN, "SIMULATION": LAVENDER, "LERNEN": SKY, "DEMODATEN": YELLOW}[badge]
            self.ui.badge(row, badge, color)
        tk.Label(f, text=subtitle, font=self.ui.font(11), fg=TEXT2, bg=BG).pack(anchor="w")

    def live_tick(self):
        self.state.tick()
        if self.current == "Übersicht" and hasattr(self, "live_label"):
            try:
                self.live_label.configure(text=f"● Live · Gesamtvermögen {fmt_eur(self.state.total())}")
            except tk.TclError:
                pass
        self.root.after(3000, self.live_tick)

    def row(self, parent, bg=BG):
        r = tk.Frame(parent, bg=bg)
        r.pack(fill="x")
        return r

    # ========================================================================
    # Onboarding
    # ========================================================================
    def onboarding(self):
        ui = self.ui
        win = tk.Toplevel(self.root, bg=BG)
        win.title("Willkommen bei " + APP_NAME)
        win.geometry("560x640")
        win.transient(self.root)
        win.grab_set()
        p = self.state.profile
        tk.Label(win, text="◆ " + APP_NAME, font=ui.font(22, True), fg=TEXT, bg=BG).pack(pady=(20, 0))
        tk.Label(win, text="Mehr als nur Investieren. Verstehe, probiere aus, entscheide.", font=ui.font(11), fg=TEXT2, bg=BG).pack()
        form = tk.Frame(win, bg=BG)
        form.pack(fill="both", expand=True, padx=30, pady=16)
        tk.Label(form, text="Dein Vorname (optional)", font=ui.font(10), fg=TEXT2, bg=BG).pack(anchor="w")
        name = tk.Entry(form, font=ui.font(12), bg=CARD2, fg=TEXT, insertbackground=TEXT, relief="flat")
        name.insert(0, p["name"])
        name.pack(fill="x", pady=(0, 10), ipady=4)
        tk.Label(form, text="Alter", font=ui.font(10), fg=TEXT2, bg=BG).pack(anchor="w")
        age = ttk.Combobox(form, values=["unter 25", "25–39", "40–59", "60+"], state="readonly")
        age.set(p["age"])
        age.pack(fill="x", pady=(0, 10))
        tk.Label(form, text="Risikobereitschaft (1 = vorsichtig … 7 = chancenorientiert)", font=ui.font(10), fg=TEXT2, bg=BG).pack(anchor="w")
        risk = tk.Scale(form, from_=1, to=7, orient="horizontal", bg=BG, fg=TEXT, troughcolor=CARD2,
                        highlightthickness=0, activebackground=PURPLE)
        risk.set(p["risk"])
        risk.pack(fill="x")
        tk.Label(form, text="Was ist dir wichtig?", font=ui.font(10), fg=TEXT2, bg=BG).pack(anchor="w", pady=(8, 0))
        vars_ = {}
        for v in VALUES:
            var = tk.BooleanVar(value=v in p["values"])
            tk.Checkbutton(form, text=v, variable=var, font=ui.font(10), fg=TEXT, bg=BG, selectcolor=CARD2,
                           activebackground=BG, activeforeground=TEXT).pack(anchor="w")
            vars_[v] = var
        simple = tk.BooleanVar(value=p["simple"])
        tk.Checkbutton(form, text="Einfacher Modus (größere Schrift, Erklärungen immer sichtbar)", variable=simple,
                       font=ui.font(10, True), fg=LAVENDER, bg=BG, selectcolor=CARD2, activebackground=BG).pack(anchor="w", pady=(10, 0))

        def done():
            p.update({"name": name.get().strip(), "age": age.get(), "risk": int(risk.get()),
                      "values": [v for v, var in vars_.items() if var.get()],
                      "simple": simple.get() or age.get() == "60+", "onboarded": True})
            self.state.save()
            win.destroy()
            self.build_sidebar()
            self.show("Übersicht")

        ui.button(win, "Los geht’s →", done).pack(pady=(0, 20))

    # ========================================================================
    # Übersicht
    # ========================================================================
    def page_dashboard(self, page):
        ui, st = self.ui, self.state
        name = st.profile["name"]
        self.header(page, f"Hallo {name}!" if name else "Hallo!", "Dein Vermögen. Deine Ziele. Deine Möglichkeiten.")
        self.live_label = tk.Label(page, text=f"● Live · Gesamtvermögen {fmt_eur(st.total())}", font=ui.font(9, True), fg=GREEN, bg=BG)
        self.live_label.pack(anchor="w", padx=16)

        hist = st.history()
        total = st.total()
        tiles = self.row(page)
        txt, col = ui.change(total / hist[-31] - 1)
        ui.tile(tiles, "Gesamtvermögen", fmt_eur(total), txt + " (30 Tage)", col)
        ui.tile(tiles, "Monatlicher Cashflow", fmt_eur(st.monthly_income()), "Mieten, Dividenden, Zinsen")
        txt, col = ui.change(total / hist[0] - 1)
        ui.tile(tiles, "Rendite (12 Monate)", txt, "ohne Einzahlungen", col)
        r = st.risk_score()
        diff = r - st.profile["risk"]
        ui.tile(tiles, "Risiko (Portfolio)", fmt_num(r, 1) + " / 7",
                "höher als dein Profil" if diff > 1 else "passt zu deinem Profil", YELLOW if diff > 1 else TEXT3)

        two = self.row(page)
        perf = ui.card(two, "Deine Performance (12 Monate)", side="left")
        c = tk.Canvas(perf, width=560, height=220, bg=CARD, highlightthickness=0)
        c.pack(fill="x")
        months = ["Okt", "Nov", "Dez", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep"]
        draw_line_chart(c, [(hist, BLUE)], 560, 220, labels=[(int(i * 364 / 11), m) for i, m in enumerate(months)])

        alloc = ui.card(two, "Portfolio-Verteilung", side="left")
        arow = tk.Frame(alloc, bg=CARD)
        arow.pack(fill="x")
        dc = tk.Canvas(arow, width=180, height=180, bg=CARD, highlightthickness=0)
        dc.pack(side="left")
        slices = st.allocation()
        draw_donut(dc, slices, 180, fmt_eur(total))
        leg = tk.Frame(arow, bg=CARD)
        leg.pack(side="left", padx=10)
        for n, v, s in slices:
            lr = tk.Frame(leg, bg=CARD)
            lr.pack(anchor="w", pady=2)
            tk.Label(lr, text="●", fg=CLASS_COLORS.get(n, GRAY), bg=CARD).pack(side="left")
            ui.label(lr, f"{n}  {fmt_pct(s)}  {fmt_eur(v)}", 10).pack(side="left")

        three = self.row(page)
        goals = ui.card(three, "Deine Ziele", side="left")
        for g in st.data["goals"][:3]:
            cur = total * g["share"]
            prog = cur / g["target"] if g["target"] else 0
            ui.label(goals, f"{g['kind']}  –  {fmt_pct(min(prog, 1), 0)}", 11, True).pack(anchor="w")
            ui.progress(goals, prog, 300).pack(anchor="w", pady=3)
            ui.label(goals, f"{fmt_eur(cur)} von {fmt_eur(g['target'])} · bis {g['year']}", 9, color=TEXT3).pack(anchor="w", pady=(0, 8))
        ui.button(goals, "Ziele bearbeiten", lambda: self.show("Ziele & Strategie"), primary=False).pack(anchor="w")

        values = ui.card(three, "Passt dein Depot zu dir?", side="left")
        for v in (st.profile["values"] or ["Nachhaltigkeit"]):
            s = st.value_score(v)
            ui.label(values, f"{v}: {fmt_pct(s, 0)}", 11).pack(anchor="w")
            ui.progress(values, s, 300).pack(anchor="w", pady=(2, 8))
        ui.hint(values, "Jede Anlage wird mit ihrem Anteil am Depot und ihrer Punktzahl für den Wert gewichtet. "
                        "Klicke unten auf ein Asset, um die Begründung zu sehen.")

        markets = ui.card(page, "Charts & Daten (klicken für Profil)")
        for aid in ["world-etf", "btc", "gold", "reit-res", "oil", "clean", "infra", "green-bond"]:
            self.asset_row(markets, st.assets[aid])

        news = ui.card(page, "Top News")
        for title, hours, sent, meaning in NEWS:
            nr = tk.Frame(news, bg=CARD)
            nr.pack(fill="x", pady=3)
            tk.Label(nr, text="●", fg={"+": GREEN, "-": RED, "=": LAVENDER}[sent], bg=CARD).pack(side="left", anchor="n")
            col = tk.Frame(nr, bg=CARD)
            col.pack(side="left", fill="x", expand=True)
            ui.label(col, f"{title}   ·   vor {hours} Std.", 11, True).pack(anchor="w")
            ui.label(col, "Was bedeutet das für mich? " + meaning, 10, color=TEXT2, wrap=900).pack(anchor="w")

        cycle = ui.card(page, "Lernkreislauf")
        ui.label(cycle, "①  Verstehen  →  ②  Ausprobieren  →  ③  Simulieren  →  ④  Analysieren  →  ⑤  Strategie  →  ⑥  Umsetzen", 11).pack(anchor="w")

    def asset_row(self, parent, a: Asset):
        ui = self.ui
        r = tk.Frame(parent, bg=CARD, cursor="hand2")
        r.pack(fill="x", pady=2)
        tk.Label(r, text="●", fg=CLASS_COLORS[a.cls], bg=CARD, font=ui.font(14)).pack(side="left")
        ui.label(r, f"{a.name}  ({a.symbol})", 11, True).pack(side="left", padx=6)
        spark = tk.Canvas(r, width=120, height=30, bg=CARD, highlightthickness=0)
        spark.pack(side="right", padx=6)
        pts = a.history[-30:]
        lo, hi = min(pts), max(pts)
        coords = []
        for i, v in enumerate(pts):
            coords += [i * 120 / 29, 28 - 26 * (v - lo) / ((hi - lo) or 1)]
        spark.create_line(*coords, fill=GREEN if a.day_change >= 0 else RED, width=1.5)
        txt, col = ui.change(a.day_change)
        ui.label(r, txt, 10, color=col).pack(side="right", padx=8)
        ui.label(r, fmt_num(a.price, 3 if a.price < 10 else 2) + " €", 11).pack(side="right", padx=8)
        for w in [r] + list(r.winfo_children()):
            w.bind("<Button-1>", lambda e, aid=a.id: self.asset_profile(aid))

    # ========================================================================
    # Asset-Profil (eigenes Fenster)
    # ========================================================================
    def asset_profile(self, aid: str):
        ui, st = self.ui, self.state
        a = st.assets[aid]
        win = tk.Toplevel(self.root, bg=BG)
        win.title(a.name)
        win.geometry("760x780")
        sf = ScrollFrame(win)
        sf.pack(fill="both", expand=True)
        page = sf.inner
        self.header(page, a.name, f"{a.symbol} · {a.cls} · {a.summary}", "DEMODATEN")

        price = ui.card(page, None)
        txt, col = ui.change(a.day_change)
        ui.label(price, f"{fmt_num(a.price, 2)} €   {txt} heute", 18, True).pack(anchor="w")
        c = tk.Canvas(price, width=680, height=200, bg=CARD, highlightthickness=0)
        c.pack()
        draw_line_chart(c, [(a.history, CLASS_COLORS[a.cls])], 680, 200)
        if aid in st.data["holdings"]:
            q, p = st.data["holdings"][aid]
            t2, c2 = ui.change(a.price / p - 1)
            ui.label(price, f"Du besitzt {fmt_num(q, 4)} Stück = {fmt_eur(q * a.price)}   ({t2} seit Kauf)", 11, color=c2).pack(anchor="w")

        total, risk_fit, parts = value_match(a, st.profile)
        m = ui.card(page, f"Passt das zu dir?  →  {fmt_pct(total, 0)}")
        verdict = ("Passt sehr gut zu dir" if total >= 0.75 else "Passt teilweise" if total >= 0.55
                   else "Passt eher nicht" if total >= 0.35 else "Widerspricht deinen Zielen")
        ui.label(m, f"{verdict} · Risikoklasse {a.risk} (dein Profil {st.profile['risk']}) · Risikopassung {fmt_pct(risk_fit, 0)}", 11).pack(anchor="w")
        for v, s, reason in parts:
            ui.label(m, f"{v}: {fmt_pct(s, 0)}", 10, True).pack(anchor="w", pady=(6, 0))
            ui.progress(m, s, 400, 6).pack(anchor="w")
            if reason:
                ui.label(m, reason, 9, color=TEXT2, wrap=640).pack(anchor="w")
        ui.hint(m, "Passung = 80 % Durchschnitt deiner gewählten Werte + 20 % Passung zur Risikobereitschaft.")

        k = ui.card(page, "Kennzahlen & Rechenweg")
        rows = [("Risikoklasse", f"{a.risk} von 7"), ("Schwankung (Volatilität)", fmt_pct(a.vol, 0)),
                ("Laufender Ertrag p. a.", fmt_pct(a.income)), ("Erwartete Rendite (Annahme)", fmt_pct(a.er))]
        for label, value in rows:
            rr = tk.Frame(k, bg=CARD)
            rr.pack(fill="x")
            ui.label(rr, label, 10, color=TEXT2).pack(side="left")
            ui.label(rr, value, 10, True).pack(side="right")
        ui.label(k, "\nRechenweg mit 10.000 € Beispielbetrag:", 10, True).pack(anchor="w")
        ui.label(k, f"Ertrag p. a. = 10.000 × {fmt_pct(a.income)} = {fmt_eur(10000 * a.income)}\n"
                    f"Erwarteter Wert in 10 J. = 10.000 × (1 + {fmt_pct(a.er)})^10 = {fmt_eur(10000 * (1 + a.er) ** 10)}\n"
                    f"Schlechtes Jahr (−2σ) = 10.000 × (1 − 2 × {fmt_pct(a.vol, 0)}) = {fmt_eur(10000 * max(0, 1 - 2 * a.vol))}",
                 10, color=LAVENDER).pack(anchor="w")

        trade = ui.card(page, "Kaufen / Verkaufen (Demo-Depot)")
        ui.label(trade, f"Verfügbares Guthaben: {fmt_eur(st.data['cash'], 2)}", 10, color=TEXT2).pack(anchor="w")
        amt = tk.Entry(trade, font=ui.font(12), bg=CARD2, fg=TEXT, insertbackground=TEXT, relief="flat", width=14)
        amt.insert(0, "500")
        amt.pack(anchor="w", pady=6, ipady=4)

        def do(kind):
            try:
                value = float(amt.get().replace(",", "."))
                if kind == "buy" and a.risk > st.profile["risk"] + 1:
                    if not messagebox.askyesno("Höheres Risiko", f"Dieses Asset hat Risikoklasse {a.risk}, dein Profil {st.profile['risk']}.\n"
                                                                  "Starke Verluste sind möglich. Trotzdem kaufen?", parent=win):
                        return
                (st.buy if kind == "buy" else st.sell)(aid, value)
                messagebox.showinfo("Erledigt", "Buchung ausgeführt (Demo).", parent=win)
                win.destroy()
                self.show(self.current)
            except ValueError as e:
                messagebox.showwarning("Hinweis", str(e) or "Bitte eine Zahl eingeben.", parent=win)

        br = tk.Frame(trade, bg=CARD)
        br.pack(anchor="w")
        ui.button(br, "Kaufen", lambda: do("buy")).pack(side="left", padx=(0, 8))
        ui.button(br, "Verkaufen", lambda: do("sell"), primary=False).pack(side="left", padx=(0, 8))

        def to_sim():
            self.sim_preset = {aid: 1.0}
            win.destroy()
            self.show("Simulator")

        ui.button(br, "Im Simulator testen", to_sim, primary=False).pack(side="left")
        if a.course and not st.course_done(a.course):
            ui.label(trade, "🔒 Erst verstehen, dann handeln: Schließe vorher den Kurs „Code verstehen“ ab.", 10, color=YELLOW).pack(anchor="w", pady=6)

    # ========================================================================
    # Depot
    # ========================================================================
    def page_portfolio(self, page):
        ui, st = self.ui, self.state
        self.header(page, "Mein Depot", "Demo-Depot (kein echtes Geld)", "ECHTGELD")
        warn = ui.card(page, "⚠ Demo-Depot")
        ui.label(warn, "In dieser Version wird kein echtes Geld bewegt. Echte Einzahlungen laufen später ausschließlich "
                       "über eine lizenzierte Partnerbank mit BaFin-Erlaubnis – dein Geld liegt dann dort, nicht bei uns.",
                 10, color=TEXT2, wrap=900).pack(anchor="w")
        tiles = self.row(page)
        total, inv = st.total(), st.invested()
        pl = total - st.data["cash"] - inv
        ui.tile(tiles, "Gesamtwert", fmt_eur(total))
        ui.tile(tiles, "Verfügbares Guthaben", fmt_eur(st.data["cash"]), "sofort investierbar")
        ui.tile(tiles, "Investiert (Kaufwert)", fmt_eur(inv))
        txt, col = ui.change(pl / inv if inv else 0)
        ui.tile(tiles, "Gewinn / Verlust", fmt_eur(pl), txt, col)

        cash = ui.card(page, "Ein- und Auszahlen")
        e = tk.Entry(cash, font=ui.font(12), bg=CARD2, fg=TEXT, insertbackground=TEXT, relief="flat", width=14)
        e.insert(0, "250")
        e.pack(side="left", ipady=4, padx=(0, 10))

        def move(kind):
            try:
                v = float(e.get().replace(",", "."))
                st.deposit(v) if kind == "in" else st.withdraw(v)
                self.show("Mein Depot")
            except ValueError as err:
                messagebox.showwarning("Hinweis", str(err) or "Bitte eine Zahl eingeben.")

        ui.button(cash, "Einzahlen", lambda: move("in")).pack(side="left", padx=4)
        ui.button(cash, "Auszahlen", lambda: move("out"), primary=False).pack(side="left", padx=4)

        hold = ui.card(page, f"Positionen ({len(st.data['holdings'])} Anlagen) – klicken für Details")
        for aid, (q, p) in st.data["holdings"].items():
            a = st.assets[aid]
            r = tk.Frame(hold, bg=CARD, cursor="hand2")
            r.pack(fill="x", pady=3)
            ui.label(r, f"● {a.name}", 11, True, color=CLASS_COLORS[a.cls]).pack(side="left")
            ui.label(r, f"   {fmt_num(q, 4 if q < 10 else 2)} Stück · Ø {fmt_num(p)} €", 10, color=TEXT3).pack(side="left")
            txt, col = ui.change(a.price / p - 1)
            ui.label(r, txt, 10, color=col).pack(side="right", padx=8)
            ui.label(r, fmt_eur(q * a.price), 11).pack(side="right")
            for w in [r] + list(r.winfo_children()):
                w.bind("<Button-1>", lambda ev, x=aid: self.asset_profile(x))

        tx = ui.card(page, "Umsätze")
        for t in st.data["transactions"][:10]:
            r = tk.Frame(tx, bg=CARD)
            r.pack(fill="x", pady=1)
            ui.label(r, f"{t['date']}   {t['kind']}{' · ' + t['asset'] if t['asset'] else ''}", 10).pack(side="left")
            plus = t["kind"] in ("Einzahlung", "Verkauf")
            ui.label(r, ("+" if plus else "−") + fmt_eur(t["amount"], 2), 10, color=GREEN if plus else TEXT).pack(side="right")

        road = ui.card(page, "So wird aus dem Demo-Depot ein echtes Depot")
        for i, (t, d) in enumerate([("Partnerbank anbinden", "Depot und Konto bei einer Bank mit BaFin-Erlaubnis."),
                                    ("Identität prüfen (KYC)", "Gesetzlich vorgeschrieben: Ausweis- und Geldwäscheprüfung."),
                                    ("Angemessenheit prüfen", "Kenntnisse abfragen (MiFID II) – die Lernmodule helfen."),
                                    ("Kosten offenlegen", "Alle Gebühren vor jedem Kauf anzeigen.")], 1):
            ui.label(road, f"{i}. {t} – {d}", 10).pack(anchor="w", pady=1)

        def reset():
            if messagebox.askyesno("Zurücksetzen", "Demo-Depot auf den Anfangszustand zurücksetzen?"):
                fresh = default_state()
                for key in ("cash", "holdings", "transactions"):
                    st.data[key] = fresh[key]
                st.save()
                self.show("Mein Depot")

        ui.button(road, "Demo-Depot zurücksetzen", reset, primary=False).pack(anchor="w", pady=(8, 0))

    # ========================================================================
    # Ziele
    # ========================================================================
    def page_goals(self, page):
        ui, st = self.ui, self.state
        self.header(page, "Ziele & Strategie", "Dein Plan – verständlich und überprüfbar.")
        weights = {k: st.holding_value(k) for k in st.data["holdings"]}
        weights["cash"] = st.data["cash"]
        mu = portfolio_stats(weights, st.assets)[0] or 0.04
        year = date.today().year
        for idx, g in enumerate(st.data["goals"]):
            card = ui.card(page, f"{g['kind']}  ·  bis {g['year']}")
            years = max(g["year"] - year, 1)
            cur = st.total() * g["share"]
            proj = future_value(cur, g["monthly"], years, mu)
            need = required_monthly(g["target"], cur, years, mu)
            ok = proj >= g["target"]
            ui.progress(card, cur / g["target"] if g["target"] else 0, 400).pack(anchor="w")
            ui.label(card, f"{fmt_eur(cur)} von {fmt_eur(g['target'])}", 10, color=TEXT2).pack(anchor="w")
            ui.label(card, ("✔ Du bist auf Kurs." if ok else "⚠ Du liegst hinter deinem Plan.") +
                     f"  Mit {fmt_eur(g['monthly'])}/Monat und ca. {fmt_pct(mu)} p. a. erreichst du voraussichtlich {fmt_eur(proj)}.",
                     10, True, color=GREEN if ok else YELLOW, wrap=900).pack(anchor="w", pady=4)
            if not ok:
                ui.label(card, f"Nötige Sparrate: {fmt_eur(need)} pro Monat.", 10, color=YELLOW).pack(anchor="w")
            br = tk.Frame(card, bg=CARD)
            br.pack(anchor="w", pady=4)
            ui.button(br, "Bearbeiten", lambda i=idx: self.edit_goal(i), primary=False).pack(side="left", padx=(0, 6))
            ui.button(br, "Löschen", lambda i=idx: (st.data["goals"].pop(i), st.save(), self.show("Ziele & Strategie")),
                      primary=False).pack(side="left")

        def add():
            st.data["goals"].append({"kind": "Vermögen aufbauen", "target": 25000, "year": year + 5, "monthly": 150, "share": 0.1})
            st.save()
            self.edit_goal(len(st.data["goals"]) - 1)

        ui.button(page, "+ Ziel hinzufügen", add).pack(anchor="w", padx=12, pady=6)

        risk = st.profile["risk"]
        mix = ([("Anleihen", 50), ("Aktien & ETFs", 25), ("Cash", 15), ("Rohstoffe", 10)] if risk <= 2 else
               [("Aktien & ETFs", 50), ("Anleihen", 20), ("Immobilien", 15), ("Rohstoffe", 10), ("Cash", 5)] if risk <= 5 else
               [("Aktien & ETFs", 60), ("Immobilien", 15), ("Krypto", 10), ("Alternative", 10), ("Cash", 5)])
        sys_card = ui.card(page, "Mein persönliches System (Lernbeispiel, keine Anlageberatung)")
        for n, pct in mix:
            ui.label(sys_card, f"✔ {pct} % {n}", 11, color=TEXT).pack(anchor="w")
        rules = ui.card(page, "Meine Regeln")
        for r in ["Ich investiere nur Geld, das ich mindestens 5 Jahre nicht brauche.",
                  "Ich halte 3 Monatsausgaben als Notgroschen auf dem Tagesgeld.",
                  "Ich prüfe einmal im Jahr die Aufteilung – nicht täglich.",
                  "Ich kaufe nichts, was ich nicht in zwei Sätzen erklären kann.",
                  f"Bei Krypto: maximal {10 if risk >= 6 else 5} % meines Vermögens."]:
            ui.label(rules, "☑ " + r, 10).pack(anchor="w", pady=1)

    def edit_goal(self, i):
        ui, st = self.ui, self.state
        g = st.data["goals"][i]
        win = tk.Toplevel(self.root, bg=BG)
        win.title("Ziel bearbeiten")
        win.geometry("420x420")
        win.transient(self.root)
        kind = ttk.Combobox(win, state="readonly", values=["Vermögen aufbauen", "Finanzielle Freiheit", "Regelmäßiger Cashflow",
                                                            "Eigenkapital für Unternehmen", "Eigene Immobilie", "Altersvorsorge"])
        kind.set(g["kind"])
        kind.pack(fill="x", padx=20, pady=(20, 10))
        entries = {}
        for key, label in [("target", "Zielbetrag (€)"), ("year", "Zieljahr"), ("monthly", "Sparrate pro Monat (€)"),
                           ("share", "Anteil des Depots für dieses Ziel (0–1)")]:
            tk.Label(win, text=label, fg=TEXT2, bg=BG, font=ui.font(10)).pack(anchor="w", padx=20)
            e = tk.Entry(win, font=ui.font(12), bg=CARD2, fg=TEXT, insertbackground=TEXT, relief="flat")
            e.insert(0, str(g[key]))
            e.pack(fill="x", padx=20, pady=(0, 8), ipady=3)
            entries[key] = e

        def save():
            try:
                g.update({"kind": kind.get(), "target": float(entries["target"].get()), "year": int(entries["year"].get()),
                          "monthly": float(entries["monthly"].get()), "share": min(1.0, max(0.0, float(entries["share"].get())))})
            except ValueError:
                messagebox.showwarning("Hinweis", "Bitte nur Zahlen eingeben.", parent=win)
                return
            st.save()
            win.destroy()
            self.show("Ziele & Strategie")

        ui.button(win, "Sichern", save).pack(pady=10)

    # ========================================================================
    # Simulator
    # ========================================================================
    PRESETS = {
        "Vorsichtig": {"gov-bond": 0.4, "world-etf": 0.3, "cash": 0.2, "gold": 0.1},
        "Ausgewogen": {"world-etf": 0.6, "green-bond": 0.2, "reit-res": 0.1, "gold": 0.1},
        "Chancenorientiert": {"world-etf": 0.5, "usa500": 0.2, "btc": 0.1, "clean": 0.1, "pe": 0.1},
        "Nachhaltig": {"clean": 0.25, "green-bond": 0.3, "infra": 0.25, "world-etf": 0.2},
    }

    def page_simulator(self, page):
        ui, st = self.ui, self.state
        self.header(page, "Simulator", "Probiere Strategien aus. Verstehe Risiken. Entscheide besser.", "SIMULATION")
        if not hasattr(self, "sim_weights"):
            self.sim_weights = dict(self.PRESETS["Ausgewogen"])
        if getattr(self, "sim_preset", None):
            self.sim_weights = self.sim_preset
            self.sim_preset = None

        pre = ui.card(page, "Schnellstart")
        for name, w in self.PRESETS.items():
            ui.button(pre, name, lambda w=w: (setattr(self, "sim_weights", dict(w)), self.show("Simulator")),
                      primary=False).pack(side="left", padx=4)

        params = ui.card(page, "Deine Annahmen")
        self.sim_vars = getattr(self, "sim_vars_saved", {"initial": 10000, "monthly": 200, "years": 20, "inflation": False, "crash": False})
        scales = {}
        for key, label, lo, hi, res in [("initial", "Startkapital (€)", 0, 200000, 500), ("monthly", "Monatliche Sparrate (€)", 0, 3000, 25),
                                        ("years", "Laufzeit (Jahre)", 1, 40, 1)]:
            ui.label(params, label, 10, color=TEXT2).pack(anchor="w")
            s = tk.Scale(params, from_=lo, to=hi, resolution=res, orient="horizontal", length=600, bg=CARD, fg=TEXT,
                         troughcolor=CARD2, highlightthickness=0, activebackground=PURPLE, font=ui.font(9))
            s.set(self.sim_vars[key])
            s.pack(anchor="w")
            scales[key] = s
        infl = tk.BooleanVar(value=self.sim_vars["inflation"])
        crash = tk.BooleanVar(value=self.sim_vars["crash"])
        for text, var in [("Inflation berücksichtigen (2 % p. a.)", infl), ("Crash-Test: Einbruch um 30 % in der Mitte der Laufzeit", crash)]:
            tk.Checkbutton(params, text=text, variable=var, font=ui.font(10), fg=TEXT, bg=CARD, selectcolor=CARD2,
                           activebackground=CARD, activeforeground=TEXT).pack(anchor="w")

        alloc = ui.card(page, "Aufteilung (wird auf 100 % normiert)")
        tot = sum(self.sim_weights.values()) or 1
        for aid, w in list(self.sim_weights.items()):
            r = tk.Frame(alloc, bg=CARD)
            r.pack(fill="x", pady=1)
            ui.label(r, f"● {st.assets[aid].name}", 10, color=CLASS_COLORS[st.assets[aid].cls]).pack(side="left")

            def adj(aid=aid, d=0.05):
                v = self.sim_weights.get(aid, 0) + d
                if v <= 0.001:
                    self.sim_weights.pop(aid, None)
                else:
                    self.sim_weights[aid] = min(v, 1)
                remember()
                self.show("Simulator")

            ui.button(r, "+", lambda a=aid: adj(a, 0.05), primary=False).pack(side="right", padx=2)
            ui.button(r, "−", lambda a=aid: adj(a, -0.05), primary=False).pack(side="right", padx=2)
            ui.label(r, fmt_pct(w / tot, 0), 10, True).pack(side="right", padx=8)
        add_row = tk.Frame(alloc, bg=CARD)
        add_row.pack(anchor="w", pady=6)
        choices = [a.name for a in st.assets.values() if a.id not in self.sim_weights]
        combo = ttk.Combobox(add_row, values=choices, state="readonly", width=30)
        combo.pack(side="left")

        def add_asset():
            name = combo.get()
            for a in st.assets.values():
                if a.name == name:
                    self.sim_weights[a.id] = 0.1
            remember()
            self.show("Simulator")

        ui.button(add_row, "Asset hinzufügen", add_asset, primary=False).pack(side="left", padx=6)

        def remember():
            self.sim_vars_saved = {"initial": scales["initial"].get(), "monthly": scales["monthly"].get(),
                                   "years": int(scales["years"].get()), "inflation": infl.get(), "crash": crash.get()}

        result = ui.card(page, "Mögliche Entwicklung")
        chart = tk.Canvas(result, width=900, height=280, bg=CARD, highlightthickness=0)
        chart.pack(fill="x")
        tiles_box = tk.Frame(result, bg=CARD)
        tiles_box.pack(fill="x")

        def run():
            remember()
            v = self.sim_vars_saved
            if not self.sim_weights:
                return
            mu, sigma, _ = portfolio_stats(self.sim_weights, st.assets)
            years = int(v["years"])
            res = simulate(v["initial"], v["monthly"], years, mu, sigma,
                           inflation=0.02 if v["inflation"] else 0.0, crash_year=max(1, years // 2) if v["crash"] else None)
            rows = res["rows"]
            draw_line_chart(chart, [([r["p50"] for r in rows], BLUE), ([r["invested"] for r in rows], GRAY)], 900, 280,
                            band=([r["p10"] for r in rows], [r["p90"] for r in rows]),
                            labels=[(i, str(rows[i]["year"])) for i in range(0, len(rows), max(1, len(rows) // 8))],
                            dashed_idx=(1,))
            for w in tiles_box.winfo_children():
                w.destroy()
            last = rows[-1]
            cagr = (max(last["p50"], 1) / res["invested"]) ** (1 / years) - 1 if res["invested"] else 0
            r1 = tk.Frame(tiles_box, bg=CARD)
            r1.pack(fill="x")
            ui.tile(r1, "Endwert (mittel)", fmt_eur(last["p50"]), f"nach {years} Jahren")
            ui.tile(r1, "Schlechtes Szenario", fmt_eur(last["p10"]), "9 von 10 Fällen besser")
            ui.tile(r1, "Gutes Szenario", fmt_eur(last["p90"]), "nur 1 von 10 Fällen besser")
            ui.tile(r1, "Eingezahlt", fmt_eur(res["invested"]))
            r2 = tk.Frame(tiles_box, bg=CARD)
            r2.pack(fill="x")
            ui.tile(r2, "Rendite p. a. (mittel)", fmt_pct(cagr, sign=True))
            ui.tile(r2, "Schwankung", fmt_pct(sigma, 0), "pro Jahr")
            ui.tile(r2, "Größter Rückgang", "−" + fmt_pct(res["dd"], 0), "typisch unterwegs")
            ui.tile(r2, "Verlustrisiko", fmt_pct(res["loss"], 0), "Ende < Einzahlungen")
            ui.label(tiles_box, "Blau = mittleres Szenario · Lila Fläche = Bandbreite (80 %) · Grau gestrichelt = eingezahlt",
                     9, color=TEXT3).pack(anchor="w")

        ui.button(params, "▶ Simulation starten", run).pack(anchor="w", pady=(10, 0))
        ui.hint(result, "Wir spielen 500 mögliche Zukünfte durch (Monte-Carlo). Jeden Monat wächst das Vermögen um die erwartete "
                        "Rendite plus einen Zufallsschock in Höhe der typischen Schwankung, dann kommt die Sparrate dazu.")
        self.root.after(50, run)

    # ========================================================================
    # Lernen
    # ========================================================================
    def page_learn(self, page):
        ui, st = self.ui, self.state
        self.header(page, "Lernen", "Schritt für Schritt – passend zu deinen Zielen.", "LERNEN")
        prog = ui.card(page, "Dein Fortschritt")
        ui.progress(prog, st.learning_progress(), 500, 10).pack(anchor="w")
        ui.label(prog, f"{len(st.data['lessons'])} Lektionen abgeschlossen ({fmt_pct(st.learning_progress(), 0)})", 10, color=TEXT2).pack(anchor="w")
        for c in st.recommended():
            card = ui.card(page, f"{c['title']}   ·   {c['area']}")
            p = st.course_progress(c)
            if c["id"] == "crypto-code" and p < 1:
                ui.label(card, "🔒 Pflicht vor dem Krypto-Handel", 10, True, color=YELLOW).pack(anchor="w")
            ui.progress(card, p, 300, 6).pack(anchor="w", pady=4)
            row = tk.Frame(card, bg=CARD)
            row.pack(anchor="w")
            for idx, lesson in enumerate(c["lessons"]):
                done = lesson["id"] in st.data["lessons"]
                ui.button(row, ("✔ " if done else f"{idx + 1}. ") + lesson["title"],
                          lambda c=c, i=idx: self.open_lesson(c, i), primary=not done).pack(side="left", padx=3, pady=3)

    def open_lesson(self, course, idx):
        ui, st = self.ui, self.state
        lesson = course["lessons"][idx]
        win = tk.Toplevel(self.root, bg=BG)
        win.title(lesson["title"])
        win.geometry("700x620")
        tk.Label(win, text=lesson["title"], font=ui.font(20, True), fg=TEXT, bg=BG).pack(anchor="w", padx=20, pady=(16, 0))
        tk.Label(win, text=f"{course['title']} · Lektion {idx + 1}/{len(course['lessons'])}", font=ui.font(10), fg=TEXT2, bg=BG).pack(anchor="w", padx=20)
        body = tk.Frame(win, bg=CARD, highlightbackground=BORDER, highlightthickness=1)
        body.pack(fill="x", padx=20, pady=12)
        tk.Label(body, text=lesson["text"], font=ui.font(11), fg=TEXT, bg=CARD, justify="left", wraplength=620).pack(anchor="w", padx=14, pady=14)
        answer = tk.IntVar(value=-1)
        feedback = tk.Label(win, text="", font=ui.font(10, True), bg=BG, wraplength=640, justify="left")
        quiz = lesson.get("quiz")
        if quiz:
            q, options, correct = quiz
            tk.Label(win, text="Quiz: " + q, font=ui.font(12, True), fg=TEXT, bg=BG, wraplength=640, justify="left").pack(anchor="w", padx=20)
            for i, opt in enumerate(options):
                tk.Radiobutton(win, text=opt, variable=answer, value=i, font=ui.font(11), fg=TEXT, bg=BG, selectcolor=CARD2,
                               activebackground=BG, activeforeground=TEXT,
                               command=lambda: feedback.configure(
                                   text="Richtig!" if answer.get() == correct else "Noch nicht ganz – versuch es nochmal.",
                                   fg=GREEN if answer.get() == correct else YELLOW)).pack(anchor="w", padx=30)
        feedback.pack(anchor="w", padx=20, pady=6)

        def finish():
            if quiz and answer.get() != quiz[2] and lesson["id"] not in st.data["lessons"]:
                messagebox.showinfo("Quiz", "Beantworte zuerst das Quiz richtig.", parent=win)
                return
            if lesson["id"] not in st.data["lessons"]:
                st.data["lessons"].append(lesson["id"])
                st.save()
            win.destroy()
            self.build_sidebar()
            self.show(self.current)

        ui.button(win, "Lektion abschließen ✔", finish).pack(anchor="w", padx=20, pady=10)

    # ========================================================================
    # Krypto-Labor
    # ========================================================================
    def page_crypto(self, page):
        ui = self.ui
        self.header(page, "Krypto-Labor", "Verstehe den Code hinter Bitcoin – indem du ihn selbst ausführst.", "SIMULATION")
        chain = self.chain

        top = ui.card(page, "Block-Miner")
        ctrl = tk.Frame(top, bg=CARD)
        ctrl.pack(anchor="w")
        ui.label(ctrl, "Schwierigkeit (führende Nullen):", 10).pack(side="left")
        diff = tk.Spinbox(ctrl, from_=1, to=5, width=4, font=ui.font(11), bg=CARD2, fg=TEXT, buttonbackground=CARD2)
        diff.delete(0, "end")
        diff.insert(0, str(chain.difficulty))
        diff.pack(side="left", padx=6)

        def set_diff():
            chain.difficulty = int(diff.get())
            self.show("Krypto-Labor")

        ui.button(ctrl, "Übernehmen", set_diff, primary=False).pack(side="left")
        state_text = "✓ Kette gültig" if chain.is_valid() else "✗ Kette ungültig – mine die roten Blöcke neu"
        ui.label(top, state_text, 11, True, color=GREEN if chain.is_valid() else RED).pack(anchor="w", pady=6)

        for i, b in enumerate(chain.blocks):
            status = chain.status(i)
            color = GREEN if status == "gültig" else RED
            f = tk.Frame(top, bg=CARD2, highlightbackground=color, highlightthickness=2)
            f.pack(fill="x", pady=4)
            hr = tk.Frame(f, bg=CARD2)
            hr.pack(fill="x", padx=10, pady=(6, 0))
            ui.label(hr, f"Block #{i}", 12, True, bg=CARD2).pack(side="left")
            ui.label(hr, status, 10, True, color=color, bg=CARD2).pack(side="right")
            e = tk.Entry(f, font=ui.font(11), bg=CARD, fg=TEXT, insertbackground=TEXT, relief="flat")
            e.insert(0, b["data"])
            e.pack(fill="x", padx=10, pady=4, ipady=3)
            if i == 0:
                e.configure(state="disabled")
            h = chain.hash(i)
            n = chain.difficulty
            ui.label(f, f"Nonce {b['nonce']} · Vorheriger Hash {b['prev'][:16]}…", 9, color=TEXT2, bg=CARD2).pack(anchor="w", padx=10)
            ui.label(f, f"Hash {h[:n]}|{h[n:40]}…", 9, color=GREEN if h.startswith('0' * n) else RED, bg=CARD2).pack(anchor="w", padx=10)
            br = tk.Frame(f, bg=CARD2)
            br.pack(anchor="w", padx=10, pady=6)

            def save_data(i=i, e=e):
                chain.set_data(i, e.get())
                self.show("Krypto-Labor")

            def mine(i=i):
                t0 = time.time()
                tries = chain.mine(i)
                self.last_mine = f"Block {i}: {fmt_num(tries or 0, 0)} Versuche in {fmt_num(time.time() - t0, 2)} s"
                self.show("Krypto-Labor")

            if i > 0:
                ui.button(br, "Text übernehmen", save_data, primary=False).pack(side="left", padx=(0, 6))
            if status != "gültig":
                ui.button(br, "⛏ Minen", mine).pack(side="left")
        if getattr(self, "last_mine", None):
            ui.label(top, self.last_mine, 10, color=LAVENDER).pack(anchor="w")
        add = tk.Frame(top, bg=CARD)
        add.pack(anchor="w", pady=6)
        ne = tk.Entry(add, font=ui.font(11), bg=CARD2, fg=TEXT, insertbackground=TEXT, relief="flat", width=40)
        ne.insert(0, "Carol zahlt Dave 1 Coin")
        ne.pack(side="left", ipady=3)
        ui.button(add, "Block anhängen", lambda: (chain.add(ne.get()), self.show("Krypto-Labor")), primary=False).pack(side="left", padx=6)
        ui.hint(top, "Ändere den Text in einem alten Block: Sein Hash ändert sich, und alle folgenden Blöcke werden rot. "
                     "Um die Fälschung zu verstecken, müsste man alle Blöcke neu minen – schneller als das Netzwerk.")

        code = ui.card(page, "Code-Editor: ChainScript (eine Lernsprache)")
        editor = tk.Text(code, height=14, font=("Consolas", 11), bg="#0b0f26", fg=LAVENDER, insertbackground=TEXT, relief="flat")
        editor.insert("1.0", getattr(self, "script_text", CHAINSCRIPT_EXAMPLE))
        editor.pack(fill="x")
        console = tk.Text(code, height=12, font=("Consolas", 10), bg="#0b0f26", fg=TEXT, relief="flat")
        for tag, color in [("echo", TEXT3), ("info", TEXT), ("ok", GREEN), ("err", RED)]:
            console.tag_configure(tag, foreground=color)

        def run_script():
            self.script_text = editor.get("1.0", "end")
            console.delete("1.0", "end")
            for kind, text in run_chainscript(self.script_text, chain):
                console.insert("end", text + "\n", kind)

        br = tk.Frame(code, bg=CARD)
        br.pack(anchor="w", pady=6)
        ui.button(br, "▶ Ausführen", run_script).pack(side="left", padx=(0, 6))
        ui.button(br, "Blöcke oben aktualisieren", lambda: self.show("Krypto-Labor"), primary=False).pack(side="left")
        console.pack(fill="x")

        hashc = ui.card(page, "Hash-Spielplatz")
        he = tk.Entry(hashc, font=ui.font(12), bg=CARD2, fg=TEXT, insertbackground=TEXT, relief="flat")
        he.insert(0, "Hallo")
        he.pack(fill="x", ipady=3)
        hl = tk.Label(hashc, font=("Consolas", 11), fg=LAVENDER, bg=CARD, anchor="w")
        hl.pack(fill="x", pady=4)
        upd = lambda e=None: hl.configure(text=hashlib.sha256(he.get().encode()).hexdigest())
        he.bind("<KeyRelease>", upd)
        upd()
        ui.hint(hashc, "Ändere nur einen Buchstaben – etwa die Hälfte aller Zeichen ändert sich (Lawineneffekt).")

        sec = ui.card(page, "Sicherheit: Wie wahrscheinlich ist ein erfolgreicher Angriff?")
        att = tk.Scale(sec, from_=1, to=49, orient="horizontal", length=500, label="Rechenleistung des Angreifers (%)",
                       bg=CARD, fg=TEXT, troughcolor=CARD2, highlightthickness=0, activebackground=PURPLE)
        att.set(25)
        att.pack(anchor="w")
        sc = tk.Canvas(sec, width=700, height=200, bg=CARD, highlightthickness=0)
        sc.pack(anchor="w")

        def redraw(_=None):
            q = att.get() / 100
            vals = [attacker_success(q, z) for z in range(13)]
            draw_bars(sc, vals, [str(z) for z in range(13)], 700, 200, fmt=lambda v: fmt_pct(v, 0))

        att.configure(command=redraw)
        redraw()
        ui.label(sec, "x-Achse: Anzahl Bestätigungen (Blöcke nach deiner Zahlung). Formel aus dem Bitcoin-Whitepaper.", 9, color=TEXT3).pack(anchor="w")

    # ========================================================================
    # Immobilien-Labor (isometrische 3D-Stadt auf dem Canvas)
    # ========================================================================
    def page_city(self, page):
        ui, city = self.ui, self.city
        self.header(page, "Immobilien-Labor", "Baue eine Stadt und sieh, wie Preise und Mieten reagieren.", "SIMULATION")
        if not hasattr(self, "city_tool"):
            self.city_tool = "Wohnhaus"
            self.city_heat = tk.BooleanVar(value=False)
            self.city_selected = None

        top = self.row(page)
        view = ui.card(top, f"Deine Stadt – Jahr {city.year}", side="left")
        canvas = tk.Canvas(view, width=620, height=400, bg="#0b1030", highlightthickness=0)
        canvas.pack()
        self.draw_city(canvas)
        tk.Checkbutton(view, text="Heatmap: Preise pro m²", variable=self.city_heat, command=lambda: self.show("Immobilien-Labor"),
                       font=ui.font(10), fg=TEXT, bg=CARD, selectcolor=CARD2, activebackground=CARD).pack(anchor="w")

        tools = ui.card(top, f"Bauen · Budget {fmt_num(city.budget, 1)} Mio. €", side="left")
        for name, info in BUILDINGS.items():
            label = "Abreißen" if name == "Leer" else f"{name} ({info[1]} Mio.)"
            b = tk.Button(tools, text=label, command=lambda n=name: (setattr(self, "city_tool", n), self.show("Immobilien-Labor")),
                          font=ui.font(10, self.city_tool == name), fg=TEXT, bg=info[0] if self.city_tool == name else CARD2,
                          relief="flat", padx=8, pady=3, cursor="hand2", anchor="w")
            b.pack(fill="x", pady=1)
        ui.label(tools, BUILDINGS[self.city_tool][7], 9, color=TEXT2, wrap=260).pack(anchor="w", pady=6)
        ui.label(tools, "Stadtplan – klicke ein Feld zum Bauen:", 10, True).pack(anchor="w")
        grid = tk.Frame(tools, bg=CARD)
        grid.pack(anchor="w")
        n = city.SIZE
        for i, c in enumerate(city.cells):
            color = BUILDINGS[c["b"]][0]
            border = TEXT if i == self.city_selected else CARD
            btn = tk.Button(grid, text="★" if city.investment and city.investment["cell"] == i else "",
                            width=2, height=1, bg=color, activebackground=PURPLE, relief="flat",
                            highlightbackground=border, highlightthickness=1, fg=GREEN,
                            command=lambda i=i: self.city_click(i))
            btn.grid(row=i // n, column=i % n, padx=1, pady=1)

        if self.city_selected is not None:
            i = self.city_selected
            c = city.cells[i]
            info = ui.card(page, f"Feld {i + 1}: {c['b']}")
            ui.label(info, f"Preis pro m²: {fmt_eur(c['price'])} · Lage-Effekt: {fmt_pct(city.location_score(i), sign=True)}", 11).pack(anchor="w")
            if BUILDINGS[c["b"]][4]:
                ui.label(info, f"Kaltmiete pro m²/Monat: {fmt_eur(city.rent(i), 2)} · 80-m²-Wohnung kostet {fmt_eur(c['price'] * 80)}", 10, color=TEXT2).pack(anchor="w")
                if not city.investment:
                    ui.button(info, "Hier eine 80-m²-Wohnung kaufen (simuliert)",
                              lambda: (setattr(city, "investment", {"cell": i, "buy": city.cells[i]["price"] * 80, "sqm": 80,
                                                                    "year": city.year, "rent": 0.0}),
                                       self.show("Immobilien-Labor")), primary=False).pack(anchor="w", pady=4)

        time_card = ui.card(page, "Zeit & Zinsen")
        tr = tk.Frame(time_card, bg=CARD)
        tr.pack(anchor="w")
        ui.button(tr, "+1 Jahr", lambda: (city.advance(1), self.show("Immobilien-Labor"))).pack(side="left", padx=(0, 6))
        ui.button(tr, "+5 Jahre", lambda: (city.advance(5), self.show("Immobilien-Labor")), primary=False).pack(side="left")
        rate = tk.Scale(time_card, from_=1.0, to=7.0, resolution=0.25, orient="horizontal", length=400, label="Bauzins (%)",
                        bg=CARD, fg=TEXT, troughcolor=CARD2, highlightthickness=0, activebackground=PURPLE,
                        command=lambda v: setattr(city, "rate", float(v) / 100))
        rate.set(city.rate * 100)
        rate.pack(anchor="w")
        ui.label(time_card, "Höhere Zinsen machen Kredite teurer – Preise sinken (wirkt ab dem nächsten Jahr).", 9, color=TEXT3).pack(anchor="w")

        s = city.stats()
        r1 = self.row(page)
        ui.tile(r1, "Ø Preis pro m²", fmt_eur(s["price"]))
        ui.tile(r1, "Ø Miete pro m²", fmt_eur(s["rent"], 2))
        ui.tile(r1, "Mietrendite (brutto)", fmt_pct(s["rent"] * 12 / s["price"] if s["price"] else 0))
        ui.tile(r1, "Einwohner", fmt_num(s["pop"], 0))
        r2 = self.row(page)
        ui.tile(r2, "Arbeitsplätze", fmt_num(s["jobs"], 0))
        ui.tile(r2, "Leerstand", fmt_pct(s["vacancy"]))
        ui.tile(r2, "Lebensqualität", f"{int(s['quality'])} / 100")
        ui.tile(r2, "CO₂-Index", fmt_num(s["co2"], 0), "niedriger ist besser")

        if len(city.history) > 1:
            pc = ui.card(page, "Preisentwicklung (Ø Preis pro m²)")
            ch = tk.Canvas(pc, width=900, height=200, bg=CARD, highlightthickness=0)
            ch.pack(fill="x")
            draw_line_chart(ch, [([h["price"] for h in city.history], PURPLE)], 900, 200,
                            labels=[(i, str(h["year"])) for i, h in enumerate(city.history)])

        inv_card = ui.card(page, "Dein Immobilien-Investment")
        inv = city.investment
        if inv:
            value = city.cells[inv["cell"]]["price"] * inv["sqm"]
            ret = (value - inv["buy"] + inv["rent"] * 0.75) / inv["buy"]
            for label, v in [("Gekauft in Jahr", str(inv["year"])), ("Kaufpreis", fmt_eur(inv["buy"])), ("Heutiger Wert", fmt_eur(value)),
                             ("Eingenommene Miete", fmt_eur(inv["rent"])), ("Gesamtrendite (nach 25 % Kosten)", fmt_pct(ret, sign=True))]:
                ui.label(inv_card, f"{label}: {v}", 11).pack(anchor="w")
            ui.button(inv_card, "Verkaufen", lambda: (setattr(city, "investment", None), self.show("Immobilien-Labor")), primary=False).pack(anchor="w", pady=4)
        else:
            ui.label(inv_card, "Wähle das Werkzeug „Leer/Ansehen“ ist nicht nötig: Klicke ein Wohn-, Büro- oder Handelsfeld mit demselben "
                               "Gebäudetyp an, um Details zu sehen, und kaufe dort eine Wohnung.", 10, color=TEXT2, wrap=900).pack(anchor="w")
        ui.hint(inv_card, "So rechnet das Modell: Jedes Gebäude wirkt auf die Nachbarschaft (Radius 2): U-Bahn +12 %, Park +8 %, Schule +6 %, "
                          "Industrie −10 % – schwächer mit Entfernung. Dazu kommen Nachfrage (Jobs zu Wohnraum) und Zinsen.")

    def city_click(self, i):
        city = self.city
        self.city_selected = i
        if city.cells[i]["b"] != self.city_tool:
            if city.place(self.city_tool, i) == "budget":
                messagebox.showinfo("Budget", "Nicht genug Budget. Spule Zeit vor – Steuereinnahmen füllen das Budget.")
        self.show("Immobilien-Labor")

    def draw_city(self, c: tk.Canvas):
        city = self.city
        n = city.SIZE
        tw, th = 34, 17       # Kachelbreite/-höhe isometrisch
        ox, oy = 310, 110
        prices = [x["price"] for x in city.cells if BUILDINGS[x["b"]][4]]
        lo, hi = (min(prices), max(prices)) if prices else (city.BASE, city.BASE + 1)

        def shade(hex_color, f):
            r, g, b = (int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
            return "#%02x%02x%02x" % (min(255, int(r * f)), min(255, int(g * f)), min(255, int(b * f)))

        for s in range(2 * n - 1):          # von hinten nach vorne zeichnen
            for y in range(n):
                x = s - y
                if not 0 <= x < n:
                    continue
                i = y * n + x
                cell = city.cells[i]
                info = BUILDINGS[cell["b"]]
                color = info[0]
                if self.city_heat.get() and info[4]:
                    t = (cell["price"] - lo) / ((hi - lo) or 1)
                    color = "#%02x%02x%02x" % (int(77 + 178 * t), int(89 + 140 * t * t), 255)
                factor = min(max(cell["price"] / city.BASE, 0.5), 2.5) if info[4] else 1
                height = info[3] * factor * 34
                cx, cy = ox + (x - y) * tw / 2, oy + (x + y) * th / 2
                top = [cx, cy - height, cx + tw / 2, cy + th / 2 - height, cx, cy + th - height, cx - tw / 2, cy + th / 2 - height]
                if height > 1:
                    c.create_polygon(cx - tw / 2, cy + th / 2 - height, cx, cy + th - height, cx, cy + th, cx - tw / 2, cy + th / 2,
                                     fill=shade(color, 0.6), outline="#0b1030")
                    c.create_polygon(cx + tw / 2, cy + th / 2 - height, cx, cy + th - height, cx, cy + th, cx + tw / 2, cy + th / 2,
                                     fill=shade(color, 0.8), outline="#0b1030")
                c.create_polygon(*top, fill=color, outline="#0b1030" if cell["b"] != "Leer" else "#262d5c")
                if i == self.city_selected:
                    c.create_polygon(*top, fill="", outline=TEXT, width=2)
                if city.investment and city.investment["cell"] == i:
                    c.create_oval(cx - 5, cy - height - 14, cx + 5, cy - height - 4, fill=GREEN, outline="")
        c.create_text(10, 390, text="Höhe = Gebäudetyp × Preisniveau", fill=TEXT3, anchor="w", font=("Segoe UI", 8))

    # ========================================================================
    # Strategie-Labor
    # ========================================================================
    def page_strategy(self, page):
        ui, st = self.ui, self.state
        self.header(page, "Strategie-Labor", "Futures, Optionen und Spieltheorie – am Beispiel von Rohstoffen.", "SIMULATION")

        # --- Derivate-Rechner ---
        d = ui.card(page, "Derivate-Rechner")
        form = tk.Frame(d, bg=CARD)
        form.pack(anchor="w")
        under = {"Gold": ("gold", 10), "Öl (Brent)": ("oil", 100), "Weizen": ("wheat", 50), "Kupfer": ("copper", 5)}
        ui.label(form, "Basiswert", 10, color=TEXT2).grid(row=0, column=0, sticky="w")
        u = ttk.Combobox(form, values=list(under), state="readonly", width=14)
        u.set(getattr(self, "der_u", "Gold"))
        u.grid(row=1, column=0, padx=(0, 10))
        ui.label(form, "Instrument", 10, color=TEXT2).grid(row=0, column=1, sticky="w")
        kinds = ["Call kaufen", "Put kaufen", "Future kaufen", "Future verkaufen", "Call verkaufen", "Put verkaufen"]
        k = ttk.Combobox(form, values=kinds, state="readonly", width=16)
        k.set(getattr(self, "der_k", "Call kaufen"))
        k.grid(row=1, column=1, padx=(0, 10))
        strike_s = tk.Scale(form, from_=70, to=130, orient="horizontal", length=200, label="Basispreis (% vom Kurs)",
                            bg=CARD, fg=TEXT, troughcolor=CARD2, highlightthickness=0)
        strike_s.set(getattr(self, "der_strike", 100))
        strike_s.grid(row=0, column=2, rowspan=2, padx=6)
        months_s = tk.Scale(form, from_=1, to=24, orient="horizontal", length=160, label="Laufzeit (Monate)",
                            bg=CARD, fg=TEXT, troughcolor=CARD2, highlightthickness=0)
        months_s.set(getattr(self, "der_m", 3))
        months_s.grid(row=0, column=3, rowspan=2, padx=6)
        chart = tk.Canvas(d, width=900, height=240, bg=CARD, highlightthickness=0)
        chart.pack(fill="x", pady=6)
        info = ui.label(d, "", 10, color=LAVENDER, wrap=900)
        info.pack(anchor="w")

        def calc(*_):
            self.der_u, self.der_k, self.der_strike, self.der_m = u.get(), k.get(), strike_s.get(), months_s.get()
            aid, size = under[u.get()]
            a = st.assets[aid]
            spot = a.price
            kind = k.get()
            is_option = "Future" not in kind
            strike = spot * strike_s.get() / 100 if is_option else spot
            premium = black_scholes("Call" in kind, spot, strike, months_s.get() / 12, 0.03, a.vol) if is_option else 0
            prices = [spot * (0.5 + i / 50) for i in range(51)]
            profits = [derivative_profit(kind, p, strike, premium, size) for p in prices]
            draw_line_chart(chart, [(profits, LAVENDER), ([0] * len(prices), TEXT3)], 900, 240, fill_first=False,
                            labels=[(i, fmt_num(prices[i], 0)) for i in range(0, 51, 10)], dashed_idx=(1,))
            be = strike + premium if "Call" in kind else strike - premium if "Put" in kind else strike
            warn = "  ⚠ Verkaufte Optionen/Futures können sehr hohe Verluste erzeugen." if "verkaufen" in kind else ""
            info.configure(text=f"Kurs heute {fmt_num(spot)} € · Basispreis {fmt_num(strike)} € · faire Prämie (Black-Scholes) "
                                f"{fmt_num(premium)} € je Einheit · Kontrakt {size} Einheiten · Break-even {fmt_num(be)} €"
                                f" · Kontraktwert {fmt_eur(spot * size)}{warn}")

        for w in (u, k):
            w.bind("<<ComboboxSelected>>", calc)
        strike_s.configure(command=calc)
        months_s.configure(command=calc)
        calc()
        ui.hint(d, "Die Grafik zeigt Gewinn/Verlust bei Fälligkeit je nach Rohstoffpreis (x-Achse). Gekaufte Optionen verlieren "
                   "maximal die Prämie, verkaufte können unbegrenzt verlieren.")

        # --- Hedging-Spiel ---
        h = ui.card(page, "Hedging-Spiel: Du bist eine Bäckerei und brauchst in 6 Monaten 100 t Weizen")
        if not hasattr(self, "hedge"):
            self.hedge = {"spot": 218.0, "rounds": [], "rng": random.Random()}
        game = self.hedge
        ui.label(h, f"Weizen heute {fmt_eur(game['spot'], 2)}/t · 6-Monats-Future {fmt_eur(game['spot'] * 1.02, 2)}/t · "
                    f"Runde {len(game['rounds']) + 1 if len(game['rounds']) < 6 else 6} von 6", 11).pack(anchor="w")
        ratio = tk.Scale(h, from_=0, to=100, resolution=10, orient="horizontal", length=400, label="Absicherungsquote (%)",
                         bg=CARD, fg=TEXT, troughcolor=CARD2, highlightthickness=0)
        ratio.set(50)
        ratio.pack(anchor="w")

        def play():
            if len(game["rounds"]) >= 6:
                return
            hr = ratio.get() / 100
            later = game["spot"] * math.exp(0.28 * math.sqrt(0.5) * game["rng"].gauss(0, 1))
            fut = game["spot"] * 1.02
            game["rounds"].append((hr * 100 * fut + (1 - hr) * 100 * later, 100 * later))
            game["spot"] = later
            self.show("Strategie-Labor")

        hb = tk.Frame(h, bg=CARD)
        hb.pack(anchor="w", pady=4)
        ui.button(hb, "Runde spielen", play).pack(side="left", padx=(0, 6))
        ui.button(hb, "Neues Spiel", lambda: (delattr(self, "hedge"), self.show("Strategie-Labor")), primary=False).pack(side="left")
        if game["rounds"]:
            vals, labels, colors = [], [], []
            for n, (hedged, unhedged) in enumerate(game["rounds"], 1):
                vals += [hedged, unhedged]
                labels += [f"R{n} du", f"R{n} ohne"]
                colors += [BLUE, GRAY]
            bc = tk.Canvas(h, width=900, height=200, bg=CARD, highlightthickness=0)
            bc.pack(fill="x")
            draw_bars(bc, vals, labels, 900, 200, colors)

            def stdev(xs):
                if len(xs) < 2:
                    return 0
                m = sum(xs) / len(xs)
                return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))

            sh, su = stdev([r[0] for r in game["rounds"]]), stdev([r[1] for r in game["rounds"]])
            ui.label(h, f"Schwankung deiner Kosten: {fmt_eur(sh)} · ohne Absicherung: {fmt_eur(su)}", 11, True).pack(anchor="w")
            if len(game["rounds"]) >= 6:
                verdict = ("Sehr gut: Deine Kosten waren deutlich planbarer." if sh < su * 0.6 else
                           "Etwas stabiler – mehr Absicherung hätte das Risiko weiter gesenkt." if sh < su else
                           "Du hast kaum abgesichert – das ist Spekulation.")
                ui.label(h, verdict, 11, color=LAVENDER).pack(anchor="w")

        # --- Spieltheorie ---
        g = ui.card(page, "Spieltheorie: Spiel 10 Runden gegen den Computer")
        if not hasattr(self, "gt"):
            self.gt = {"game": 0, "opp": "Wie du mir, so ich dir", "mine": [], "theirs": [], "rng": random.Random(99)}
        gt = self.gt
        game_d = GAMES[gt["game"]]
        sel = tk.Frame(g, bg=CARD)
        sel.pack(anchor="w")
        for idx, gm in enumerate(GAMES):
            ui.button(sel, gm["title"], lambda i=idx: (gt.update(game=i, mine=[], theirs=[]), self.show("Strategie-Labor")),
                      primary=(idx == gt["game"])).pack(side="left", padx=3)
        mat = tk.Frame(g, bg=CARD)
        mat.pack(anchor="w", pady=8)
        eq = nash(game_d)
        ui.label(mat, "", 10).grid(row=0, column=0)
        for c in range(2):
            ui.label(mat, f"{game_d['col']}:\n{game_d['actions'][c]}", 10, True, color=TEXT2).grid(row=0, column=c + 1, padx=8)
        for r in range(2):
            ui.label(mat, f"{game_d['row']}:\n{game_d['actions'][r]}", 10, True, color=TEXT2).grid(row=r + 1, column=0, padx=8)
            for c in range(2):
                a_, b_ = game_d["pay"][r][c]
                tk.Label(mat, text=f"{a_} | {b_}" + ("\nNash" if (r, c) in eq else ""), width=12, height=3,
                         font=self.ui.font(12, True), fg=TEXT, bg=PURPLE if (r, c) in eq else CARD2).grid(row=r + 1, column=c + 1, padx=3, pady=3)
        ui.label(g, f"Zahlen: dein Gewinn | Gewinn des Gegners (in {game_d['unit']}). Nash = kein Spieler verbessert sich allein.", 9, color=TEXT3).pack(anchor="w")
        ui.label(g, game_d["lesson"], 10, color=LAVENDER, wrap=900).pack(anchor="w", pady=4)
        opp = ttk.Combobox(g, values=list(STRATEGIES), state="readonly", width=28)
        opp.set(gt["opp"])
        opp.pack(anchor="w")
        opp.bind("<<ComboboxSelected>>", lambda e: (gt.update(opp=opp.get(), mine=[], theirs=[]), self.show("Strategie-Labor")))
        ui.label(g, "Die Gegner-Strategie ist im Spiel geheim – versuche sie zu erkennen!", 9, color=TEXT3).pack(anchor="w")

        def move(m):
            if len(gt["mine"]) >= 10:
                return
            reply = strategy_move(gt["opp"], gt["theirs"], gt["mine"], gt["rng"])
            gt["mine"].append(m)
            gt["theirs"].append(reply)
            self.show("Strategie-Labor")

        mb = tk.Frame(g, bg=CARD)
        mb.pack(anchor="w", pady=4)
        for i in range(2):
            ui.button(mb, game_d["actions"][i], lambda i=i: move(i), primary=False).pack(side="left", padx=3)
        ui.button(mb, "Nochmal", lambda: (gt.update(mine=[], theirs=[]), self.show("Strategie-Labor")), primary=False).pack(side="left", padx=12)
        if gt["mine"]:
            me = sum(game_d["pay"][a][b][0] for a, b in zip(gt["mine"], gt["theirs"]))
            them = sum(game_d["pay"][a][b][1] for a, b in zip(gt["mine"], gt["theirs"]))
            hist = "  ".join(f"{'●' if a == 0 else '○'}/{'●' if b == 0 else '○'}" for a, b in zip(gt["mine"], gt["theirs"]))
            ui.label(g, f"Verlauf (du/Gegner, ● = {game_d['actions'][0]}): {hist}", 10).pack(anchor="w")
            ui.label(g, f"Dein Ergebnis: {me} · Gegner: {them}  ({len(gt['mine'])}/10 Runden)", 11, True).pack(anchor="w")
            if len(gt["mine"]) >= 10:
                ui.label(g, f"Gegner-Strategie war: {gt['opp']} – {STRATEGIES[gt['opp']]}", 10, color=LAVENDER).pack(anchor="w")

        # --- Turnier ---
        t = ui.card(page, "Turnier: Jeder gegen jeden (wie bei Robert Axelrod, 1980)")
        rounds = tk.Scale(t, from_=1, to=50, orient="horizontal", length=400, label="Runden pro Begegnung",
                          bg=CARD, fg=TEXT, troughcolor=CARD2, highlightthickness=0)
        rounds.set(getattr(self, "tour_rounds", 20))
        rounds.pack(anchor="w")
        tc = tk.Canvas(t, width=900, height=210, bg=CARD, highlightthickness=0)
        tc.pack(fill="x")

        def tour(_=None):
            self.tour_rounds = rounds.get()
            res = tournament(game_d, rounds.get())
            draw_bars(tc, [s for _, s in res], [n.split()[0] + "…" if len(n) > 14 else n for n, _ in res], 900, 210,
                      [BLUE, PURPLE, SKY, LAVENDER, GRAY], fmt=lambda v: fmt_num(v, 0))

        rounds.configure(command=tour)
        tour()
        ui.hint(t, "Bei nur einer Runde gewinnt Eigennutz. Je mehr Runden, desto besser schneiden freundliche, aber nicht "
                   "ausnutzbare Strategien wie „Wie du mir, so ich dir“ ab.")

    # ========================================================================
    # KI-Assistent
    # ========================================================================
    def page_assistant(self, page):
        ui, st = self.ui, self.state
        self.header(page, "KI-Assistent", "Ich erkläre – ich berate nicht. (Regelbasiert, offline)")
        chat = ui.card(page, None)
        log = tk.Text(chat, height=22, font=ui.font(11), bg="#0b0f26", fg=TEXT, wrap="word", relief="flat")
        log.tag_configure("me", foreground=SKY)
        log.tag_configure("bot", foreground=TEXT)
        log.pack(fill="x")
        log.insert("end", f"Assistent: Hallo {st.profile['name'] or ''}! Frag mich z. B. nach Zinsen, Immobilien, Krypto, "
                          "Nachhaltigkeit, Rohstoffen, Risiko oder deinen Zielen.\n\n", "bot")

        def answer(q: str) -> str:
            q = q.lower()
            if "zins" in q:
                return "Sinkende Zinsen machen Kredite günstiger – das stützt oft Immobilien und Anleihen. Probier den Bauzins im Immobilien-Labor aus."
            if any(w in q for w in ("immobil", "miete", "wohnung")):
                share = next((s for n, _, s in st.allocation() if n == "Immobilien"), 0)
                return f"Immobilien machen {fmt_pct(share, 0)} deines Depots aus. Chancen: Miete, Inflationsschutz. Risiken: Zinsen, Leerstand."
            if any(w in q for w in ("krypto", "bitcoin", "ethereum")):
                return "Krypto schwankt extrem – Rückgänge über 70 % gab es mehrfach. Mach zuerst den Kurs „Code verstehen“."
            if any(w in q for w in ("nachhalt", "esg", "grün", "klima")):
                return f"Dein Depot passt zu {fmt_pct(st.value_score('Nachhaltigkeit'), 0)} zu Nachhaltigkeit. Windparks 90 %, Green Bonds 85 %, Bitcoin 28 %."
            if any(w in q for w in ("rohstoff", "gold", "öl", "future", "option")):
                return "Rohstoffe zahlen keine Zinsen. Mit Futures sichert man Preise ab, mit Optionen begrenzt man das Risiko – siehe Strategie-Labor."
            if any(w in q for w in ("risiko", "verlust", "crash")):
                return f"Dein Profil: {st.profile['risk']}/7. Teste im Simulator den Crash-Test – macht dich das Ergebnis nervös, ist es zu riskant."
            if any(w in q for w in ("ziel", "spar")):
                return "Unter „Ziele & Strategie“ siehst du, ob du auf Kurs bist und welche Sparrate nötig wäre."
            if any(w in q for w in ("depot", "portfolio", "markt")):
                top = st.allocation()[0]
                return f"Dein Depot ist {fmt_eur(st.total())} wert. Größte Position: {top[0]} ({fmt_pct(top[2], 0)})."
            return "Das kann ich noch nicht genau beantworten. Frag nach Zinsen, Immobilien, Krypto, Nachhaltigkeit, Rohstoffen, Risiko oder Zielen."

        entry = tk.Entry(chat, font=ui.font(12), bg=CARD2, fg=TEXT, insertbackground=TEXT, relief="flat")
        entry.pack(fill="x", pady=8, ipady=5)

        def send(_=None):
            q = entry.get().strip()
            if not q:
                return
            log.insert("end", "Du: " + q + "\n", "me")
            log.insert("end", "Assistent: " + answer(q) + "\n\n", "bot")
            log.see("end")
            entry.delete(0, "end")

        entry.bind("<Return>", send)
        ui.button(chat, "Senden", send).pack(anchor="w")
        for s in ["Was bedeutet die Marktentwicklung für mein Portfolio?", "Chancen und Risiken bei Immobilien?",
                  "Kannst du mir eine Zinssenkung erklären?", "Wie nachhaltig ist mein Depot?"]:
            ui.button(chat, "» " + s, lambda s=s: (entry.delete(0, "end"), entry.insert(0, s), send()), primary=False).pack(anchor="w", pady=2)
        entry.focus_set()

    # ========================================================================
    # Einstellungen
    # ========================================================================
    def page_settings(self, page):
        ui, st = self.ui, self.state
        self.header(page, "Einstellungen", "Profil, Schrift, Hinweise")
        p = st.profile
        c = ui.card(page, "Bedienung")
        simple = tk.BooleanVar(value=p["simple"])

        def toggle_simple():
            p["simple"] = simple.get()
            st.save()
            self.build_sidebar()
            self.show("Einstellungen")

        tk.Checkbutton(c, text="Einfacher Modus (größere Schrift, Erklärungen immer sichtbar)", variable=simple, command=toggle_simple,
                       font=ui.font(11), fg=TEXT, bg=CARD, selectcolor=CARD2, activebackground=CARD).pack(anchor="w")
        prof = ui.card(page, "Profil")
        ui.label(prof, f"Name: {p['name'] or '–'} · Alter: {p['age']} · Risikobereitschaft: {p['risk']}/7", 11).pack(anchor="w")
        ui.label(prof, "Werte: " + (", ".join(p["values"]) or "–"), 11).pack(anchor="w")
        ui.button(prof, "Profil bearbeiten (Onboarding)", self.onboarding, primary=False).pack(anchor="w", pady=6)
        legal = ui.card(page, "Rechtliches & Transparenz")
        ui.label(legal, "Diese App dient der Bildung. Sie ist keine Anlageberatung. Alle Daten sind Demodaten.\n"
                        f"Datenschutz: Alles wird nur lokal gespeichert in:\n{SAVE_FILE}", 10, color=TEXT2, wrap=900).pack(anchor="w")

        def reset_all():
            if messagebox.askyesno("Alles zurücksetzen", "Profil, Lernfortschritt und Demo-Depot löschen?"):
                st.data = default_state()
                st.save()
                self.build_sidebar()
                self.show("Übersicht")
                self.root.after(200, self.onboarding)

        ui.button(legal, "Alles zurücksetzen", reset_all, primary=False).pack(anchor="w", pady=6)


def main():
    root = tk.Tk()
    InvestMindApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
