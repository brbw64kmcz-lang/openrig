/* =====================================================================
   DATEI 5 von 7:  engines.js
   Inhalt: Daten (Assets, Kurse, Nachrichten, Lerninhalte) und alle
   Rechenkerne (Simulation, Black-Scholes, Blockchain, Stadtmodell,
   Spieltheorie). Hier gibt es KEINE Oberfläche – nur Logik.
   ===================================================================== */
"use strict";

const APP_NAME = "InvestMind";
const APP_CLAIM = "Lernen · Simulieren · Investieren";

// ---------------------------------------------------------------------
// Farben (Blau, Lila, Grau, Weiß) – identisch zu Theme.swift
// ---------------------------------------------------------------------
const C = {
  blue: "#4d7dff", purple: "#8c5ef5", lavender: "#b8adff", sky: "#73bfff",
  gray: "#8c96b3", text: "#ffffff", text2: "#a8b3d4", text3: "#7a85a8",
  green: "#5cdba8", red: "#ff7380", yellow: "#ffc759", card: "#161d42", card2: "#1f2654",
};

const CLASS_COLORS = {
  "Aktien & ETFs": C.blue, "Immobilien": C.purple, "Krypto": C.sky, "Rohstoffe": C.lavender,
  "Alternative": "#5966d9", "Anleihen": "#9e85e6", "Cash": C.gray,
};

// ---------------------------------------------------------------------
// Formatierung (deutsches Format: 1.234,56 €)
// ---------------------------------------------------------------------
function fmtNum(v, digits = 2) {
  if (!isFinite(v)) v = 0;
  return v.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtEur(v, digits = 0) { return fmtNum(v, digits) + " €"; }
function fmtPct(v, digits = 1, sign = false) {
  const body = fmtNum(v * 100, digits) + " %";
  return sign && v > 0 ? "+" + body : body;
}
function fmtCompact(v) {
  if (Math.abs(v) >= 1e6) return fmtNum(v / 1e6, 1) + " Mio.";
  if (Math.abs(v) >= 1e3) return fmtNum(v / 1e3, 0) + " Tsd.";
  return fmtNum(v, 0);
}

// ---------------------------------------------------------------------
// Zufall mit Startwert (gleiche Ergebnisse bei gleichem Startwert)
// ---------------------------------------------------------------------
function makeRng(seed) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rnd.gauss = () => {
    let u = 0;
    while (u === 0) u = rnd();
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return rnd;
}

// ---------------------------------------------------------------------
// Werte und Assets
// ---------------------------------------------------------------------
const VALUES = ["Nachhaltigkeit", "Soziale Verantwortung", "Technologie & Innovation",
  "Sicherheit", "Regelmäßiges Einkommen", "Schnell verfügbar"];

const VALUE_EXPLAIN = {
  "Nachhaltigkeit": "Wie umwelt- und klimafreundlich ist das Asset?",
  "Soziale Verantwortung": "Wie fair sind Arbeitsbedingungen und Unternehmensführung?",
  "Technologie & Innovation": "Wie stark profitiert das Asset von neuen Technologien?",
  "Sicherheit": "Wie gering sind Schwankungen und Verlustrisiko?",
  "Regelmäßiges Einkommen": "Wie viel laufender Ertrag (Miete, Dividende, Zins) fließt?",
  "Schnell verfügbar": "Wie schnell kann ich es ohne Abschlag verkaufen?",
};

// id, Name, Symbol, Klasse, Beschreibung, Preis, erw. Rendite, Schwankung, Ertrag, Risiko 1–7,
// Punktzahlen je Wert (Reihenfolge wie VALUES), Begründungen, Pflichtkurs
const ASSET_SPECS = [
  ["world-etf", "Welt-Aktien-ETF", "WELT", "Aktien & ETFs", "Rund 1.500 große Unternehmen aus 23 Industrieländern.",
    98.40, 0.07, 0.15, 0.018, 4, [0.45, 0.55, 0.60, 0.55, 0.35, 0.95],
    { "Nachhaltigkeit": "Enthält auch Öl-, Gas- und Rüstungsunternehmen. ESG-Varianten schließen diese aus." }, null],
  ["usa500", "USA-500-ETF", "U500", "Aktien & ETFs", "Die 500 größten börsennotierten US-Unternehmen.",
    512.30, 0.075, 0.16, 0.013, 4, [0.35, 0.50, 0.75, 0.50, 0.30, 0.95],
    { "Technologie & Innovation": "Hoher Anteil großer Technologiekonzerne." }, null],
  ["clean", "Clean-Energy-ETF", "CLEN", "Aktien & ETFs", "Unternehmen aus Solar, Wind, Speicher und Netzen.",
    8.12, 0.06, 0.30, 0.012, 5, [0.92, 0.65, 0.80, 0.30, 0.25, 0.90],
    { "Nachhaltigkeit": "Direkter Beitrag zur Energiewende.", "Sicherheit": "Stark schwankend, abhängig von Zinsen." }, null],
  ["green-bond", "Green-Bond-ETF", "GRBD", "Anleihen", "Anleihen, deren Erlöse in Klimaprojekte fließen.",
    46.20, 0.03, 0.06, 0.028, 2, [0.85, 0.65, 0.30, 0.85, 0.60, 0.85],
    { "Nachhaltigkeit": "Mittelverwendung ist zweckgebunden und wird berichtet." }, null],
  ["gov-bond", "Euro-Staatsanleihen", "EGOV", "Anleihen", "Anleihen von Euro-Staaten mit guter Bonität.",
    101.30, 0.025, 0.05, 0.027, 2, [0.50, 0.60, 0.15, 0.90, 0.60, 0.90],
    { "Sicherheit": "Staaten mit hoher Bonität fallen selten aus." }, null],
  ["btc", "Bitcoin", "BTC", "Krypto", "Erste und größte Kryptowährung. Begrenzt auf 21 Mio. Einheiten.",
    58240, 0.10, 0.65, 0.0, 7, [0.28, 0.45, 0.90, 0.05, 0.00, 0.85],
    { "Nachhaltigkeit": "Proof-of-Work braucht sehr viel Strom.", "Sicherheit": "Rückgänge über 70 % gab es mehrfach." }, "crypto-code"],
  ["eth", "Ethereum", "ETH", "Krypto", "Programmierbare Blockchain für Smart Contracts.",
    2410, 0.10, 0.75, 0.03, 7, [0.62, 0.45, 0.95, 0.05, 0.20, 0.85],
    { "Nachhaltigkeit": "Seit 2022 Proof-of-Stake – Energieverbrauch um über 99 % gesunken." }, "crypto-code"],
  ["gold", "Gold", "XAU", "Rohstoffe", "Klassischer Wertspeicher, Preis je Feinunze.",
    2180, 0.04, 0.15, 0.0, 4, [0.25, 0.35, 0.10, 0.70, 0.00, 0.85],
    { "Nachhaltigkeit": "Goldabbau belastet die Umwelt stark." }, null],
  ["oil", "Öl (Brent)", "BRENT", "Rohstoffe", "Rohöl-Referenzsorte, Preis je Barrel.",
    78.50, 0.03, 0.35, 0.0, 6, [0.05, 0.30, 0.10, 0.25, 0.00, 0.80],
    { "Nachhaltigkeit": "Fossiler Energieträger – widerspricht Klimazielen direkt." }, null],
  ["wheat", "Weizen", "WHEAT", "Rohstoffe", "Agrarrohstoff, Preis je Tonne.",
    218, 0.03, 0.28, 0.0, 6, [0.45, 0.40, 0.10, 0.30, 0.00, 0.70],
    { "Soziale Verantwortung": "Spekulation auf Nahrungsmittel ist ethisch umstritten." }, null],
  ["copper", "Kupfer", "COPPER", "Rohstoffe", "Industriemetall für Kabel, E-Autos und Netze.",
    8900, 0.045, 0.25, 0.0, 5, [0.60, 0.35, 0.60, 0.35, 0.00, 0.75],
    { "Nachhaltigkeit": "Unverzichtbar für die Energiewende, der Abbau ist aber belastend." }, null],
  ["reit-res", "Wohnimmobilien-REIT", "WREIT", "Immobilien", "Gesellschaft mit rund 20.000 Mietwohnungen.",
    27.60, 0.055, 0.20, 0.038, 4, [0.55, 0.50, 0.30, 0.55, 0.80, 0.85],
    { "Regelmäßiges Einkommen": "Mieteinnahmen werden größtenteils ausgeschüttet." }, null],
  ["reit-office", "Büroimmobilien-REIT", "BREIT", "Immobilien", "Bürogebäude in europäischen Großstädten.",
    18.90, 0.045, 0.24, 0.052, 5, [0.40, 0.45, 0.25, 0.45, 0.85, 0.80],
    { "Sicherheit": "Homeoffice-Trend erhöht das Leerstandsrisiko." }, null],
  ["re-crowd", "Immobilien-Crowdfunding", "CROWD", "Immobilien", "Nachrangdarlehen für einzelne Bauprojekte.",
    100, 0.06, 0.12, 0.055, 6, [0.50, 0.55, 0.35, 0.35, 0.85, 0.10],
    { "Sicherheit": "Nachrangig: Bei Pleite des Projekts droht Totalverlust." }, null],
  ["pe", "Private-Equity-Fonds", "PEQ", "Alternative", "Beteiligungen an nicht-börsennotierten Firmen.",
    112, 0.08, 0.25, 0.0, 6, [0.40, 0.45, 0.70, 0.30, 0.10, 0.05],
    { "Schnell verfügbar": "Kapital ist oft 7–10 Jahre gebunden." }, null],
  ["infra", "Infrastruktur (Windparks)", "WIND", "Alternative", "Beteiligung an Windparks mit Stromabnahmeverträgen.",
    54, 0.05, 0.12, 0.04, 4, [0.90, 0.70, 0.60, 0.60, 0.70, 0.50],
    { "Nachhaltigkeit": "Direkte Erzeugung erneuerbarer Energie." }, null],
  ["cash", "Tagesgeld", "CASH", "Cash", "Täglich verfügbar, bis 100.000 € gesetzlich gesichert.",
    1.0, 0.02, 0.0, 0.02, 1, [0.50, 0.50, 0.00, 1.00, 0.50, 1.00],
    { "Sicherheit": "Einlagensicherung bis 100.000 € je Bank und Person." }, null],
];

const NEWS = [
  ["EZB signalisiert vorsichtige Zinssenkung", 2, "+",
    "Sinkende Zinsen machen Kredite billiger. Das stützt oft Immobilien und Anleihen, Tagesgeld bringt weniger."],
  ["Bitcoin erreicht neues Jahreshoch", 4, "+",
    "Hohe Kurse ziehen Käufer an – aber Krypto kann genauso schnell 30–50 % fallen."],
  ["Goldpreis steigt wegen geopolitischer Spannungen", 6, "+",
    "Gold gilt als Krisenschutz, zahlt aber keine Zinsen oder Mieten."],
  ["Dürre: Weizen-Futures ziehen an", 9, "=",
    "Bäckereien sichern sich mit Futures ab – genau das übst du im Strategie-Labor."],
  ["Büroimmobilien: Leerstand in Großstädten steigt", 12, "-",
    "Mehr Leerstand = weniger Mieteinnahmen. Streuung hilft."],
  ["Rekordzubau bei Windkraft in Europa", 20, "+",
    "Infrastruktur und Clean-Energy profitieren – relevant für nachhaltige Anleger."],
];

/** Erzeugt die Demo-Assets mit 365 Tageskursen, die beim heutigen Preis enden. */
function makeAssets(seed = 42) {
  const rng = makeRng(seed);
  const assets = {};
  for (const s of ASSET_SPECS) {
    const a = {
      id: s[0], name: s[1], symbol: s[2], cls: s[3], summary: s[4], price: s[5], er: s[6], vol: s[7],
      income: s[8], risk: s[9], scores: s[10], reasons: s[11], course: s[12], history: [], dayChange: 0,
    };
    const values = new Array(365).fill(a.price);
    let p = a.price;
    const dt = 1 / 365;
    for (let i = 363; i >= 0; i--) {
      const growth = Math.exp((a.er - 0.5 * a.vol * a.vol) * dt + a.vol * Math.sqrt(dt) * rng.gauss());
      p /= growth;
      values[i] = p;
    }
    a.history = values;
    a.dayChange = values[363] ? a.price / values[363] - 1 : 0;
    assets[a.id] = a;
  }
  return assets;
}

function assetScore(a, value) { return a.scores[VALUES.indexOf(value)]; }

// ---------------------------------------------------------------------
// Lerninhalte
// ---------------------------------------------------------------------
const COURSES = [
  { id: "basics", title: "Geld anlegen – die Grundlagen", area: "Grundlagen", values: [], lessons: [
    { id: "basics-1", title: "Der Zinseszins", text:
      "Wenn dein Geld Ertrag bringt und du ihn wieder anlegst, bekommst du Ertrag auf den Ertrag.\n\n" +
      "Beispiel: 10.000 € mit 6 % pro Jahr sind nach 10 Jahren rund 17.900 €, nach 30 Jahren rund 57.400 €.\n\n" +
      "Formel: Endwert = Startbetrag × (1 + Rendite) ^ Jahre",
      quiz: ["Was hat beim Zinseszins die größte Wirkung?", ["Die Anlagedauer", "Die Uhrzeit des Kaufs", "Die Farbe der App"], 0] },
    { id: "basics-2", title: "Risiko und Rendite", text:
      "Höhere mögliche Rendite bedeutet fast immer höheres Risiko.\n\n" +
      "Volatilität: Aktien etwa 15 % pro Jahr, Bitcoin 60 % und mehr, Tagesgeld fast 0 %.",
      quiz: ["Hohe Rendite ohne Risiko wird versprochen. Beste Reaktion?", ["Sofort investieren", "Skeptisch sein – das gibt es nicht", "Freunde überzeugen"], 1] },
    { id: "basics-3", title: "Streuung", text:
      "Lege nicht alle Eier in einen Korb. Verschiedene Anlagen gleichen Verluste teilweise aus.",
      quiz: ["Warum senkt Streuung das Risiko?", ["Alle Anlagen steigen gleichzeitig", "Schwankungen gleichen sich teilweise aus", "Der Staat garantiert es"], 1] },
  ] },
  { id: "sustainability", title: "Nachhaltig investieren", area: "Nachhaltigkeit",
    values: ["Nachhaltigkeit", "Soziale Verantwortung"], lessons: [
    { id: "sus-1", title: "Was bedeutet ESG?", text:
      "E = Environment (Umwelt), S = Social (Soziales), G = Governance (gute Unternehmensführung).",
      quiz: ["Wofür steht das „G“ in ESG?", ["Gewinn", "Governance", "Gold"], 1] },
    { id: "sus-2", title: "So berechnen wir deine Passung", text:
      "Jedes Asset bekommt pro Wert 0–100 %. Deine Passung = 80 % Durchschnitt deiner Werte + 20 % Risikopassung.\n\n" +
      "Die Punktzahlen sind in dieser Version Beispielwerte.", quiz: null },
    { id: "sus-3", title: "Greenwashing erkennen", text:
      "Ein Fonds mit „Klima“ im Namen kann trotzdem Ölkonzerne enthalten. Prüfe Ausschlüsse und unabhängige Prüfungen.",
      quiz: ["Ein Fonds heißt „Green Future“. Was folgt sicher daraus?", ["Er ist nachhaltig", "Nichts – der Name sagt wenig", "Er ist kostenlos"], 1] },
  ] },
  { id: "crypto-code", title: "Code verstehen: So funktioniert Bitcoin", area: "Krypto & Code",
    values: ["Technologie & Innovation"], lessons: [
    { id: "cc-1", title: "Was ist ein Hash?", text:
      "Ein Hash ist ein digitaler Fingerabdruck: Aus jedem Text werden 64 Zeichen.\n" +
      "Ändert man ein Zeichen, ändert sich der ganze Hash.\n\n" +
      "const hash = sha256(\"Hallo\");\nconsole.log(hash);",
      quiz: ["Was passiert, wenn ein Zeichen geändert wird?", ["Nur das letzte Zeichen ändert sich", "Der Hash ändert sich komplett", "Nichts"], 1] },
    { id: "cc-2", title: "Blöcke und die Kette", text:
      "Jeder Block enthält den Hash des vorherigen Blocks. Ändert jemand einen alten Block, passt die Kette nicht mehr.",
      quiz: ["Warum enthält jeder Block den vorherigen Hash?", ["Speicher sparen", "Manipulationen fallen auf", "Tradition"], 1] },
    { id: "cc-3", title: "Mining und Proof of Work", text:
      "Miner suchen eine Zahl (Nonce), sodass der Hash mit Nullen beginnt.\n\n" +
      "while (!hash.startsWith(\"000\")) {\n  nonce += 1;\n}",
      quiz: ["Von 3 auf 4 Nullen – wie viel mehr Versuche?", ["Doppelt", "16-mal so viele", "Gleich viele"], 1] },
    { id: "cc-4", title: "Sicherheit und 51-%-Angriff", text:
      "Wer mehr als die Hälfte der Rechenleistung hat, könnte die Kette überholen. Im Labor: attack 30 6",
      quiz: ["Was schützt deine Coins am meisten?", ["Dein privater Schlüssel", "Ein Passwort-Foto", "Der Kurs"], 0] },
  ] },
  { id: "real-estate", title: "Immobilien verstehen", area: "Immobilien", values: ["Regelmäßiges Einkommen"], lessons: [
    { id: "re-1", title: "Mietrendite berechnen", text:
      "Bruttomietrendite = Jahreskaltmiete ÷ Kaufpreis.\nBeispiel: 12.000 € ÷ 300.000 € = 4 %.",
      quiz: ["Was zeigt die Mietrendite?", ["Gewinn nach Steuern", "Jährlichen Ertrag im Verhältnis zum Kaufpreis", "Immer mehr als die Preissteigerung"], 1] },
    { id: "re-2", title: "Lage, Lage, Lage", text:
      "Parks, Schulen, Nahverkehr und Jobs erhöhen den Wert, Industrie senkt ihn. Probier es im Immobilien-Labor aus.",
      quiz: null },
    { id: "re-3", title: "Hebel durch Kredit", text:
      "60.000 € Eigenkapital + 240.000 € Kredit: Wert +10 % = +50 % auf dein Eigenkapital, −10 % = −50 %.",
      quiz: ["Was macht ein Kredit mit dem Risiko?", ["Verringert es", "Verstärkt Gewinne und Verluste", "Nichts"], 1] },
  ] },
  { id: "commodities", title: "Rohstoffe, Optionen & Spieltheorie", area: "Strategie", values: ["Sicherheit"], lessons: [
    { id: "co-1", title: "Futures", text:
      "Ein Future ist ein Vertrag über Kauf/Verkauf zu einem heute festgelegten Preis in der Zukunft.",
      quiz: ["Was ist ein Future?", ["Eine Aktie", "Ein Vertrag zu einem heute festgelegten Preis", "Eine Kryptowährung"], 1] },
    { id: "co-2", title: "Call und Put", text:
      "Ein Call gibt das Recht zu kaufen, ein Put das Recht zu verkaufen. Käufer verlieren maximal die Prämie.",
      quiz: ["Du kaufst einen Call. Maximaler Verlust?", ["Unbegrenzt", "Die Prämie", "Der Basispreis"], 1] },
    { id: "co-3", title: "Das Nash-Gleichgewicht", text:
      "Kein Spieler kann sich verbessern, wenn er allein seine Strategie ändert – und trotzdem ist es oft nicht das beste Ergebnis für alle.",
      quiz: ["Ist ein Nash-Gleichgewicht immer das Beste für alle?", ["Ja", "Nein", "Gibt es nicht"], 1] },
  ] },
  { id: "behavior", title: "Denkfehler beim Investieren", area: "Psychologie", values: ["Sicherheit"], lessons: [
    { id: "be-1", title: "Selbstüberschätzung", text:
      "Die meisten halten sich für überdurchschnittlich gute Anleger. Gegenmittel: Regeln vorher festlegen.",
      quiz: ["Was hilft gegen Selbstüberschätzung?", ["Öfter handeln", "Feste Regeln und ehrliches Messen", "Bauchgefühl"], 1] },
    { id: "be-2", title: "Herdentrieb und FOMO", text:
      "Würde ich das auch kaufen, wenn niemand darüber spricht?", quiz: null },
  ] },
];

function courseById(id) { return COURSES.find(c => c.id === id) || null; }

// ---------------------------------------------------------------------
// Rechenkerne
// ---------------------------------------------------------------------

/** Passung eines Assets zu den Werten (80 %) und zur Risikobereitschaft (20 %). */
function valueMatch(asset, profile) {
  const chosen = profile.values.length ? profile.values : VALUES;
  const parts = VALUES.filter(v => chosen.includes(v)).map(v => [v, assetScore(asset, v), asset.reasons[v] || null]);
  const avg = parts.length ? parts.reduce((s, p) => s + p[1], 0) / parts.length : 0.5;
  const diff = asset.risk - profile.risk;
  const penalty = diff > 0 ? diff / 4 : -diff / 8;
  const riskFit = Math.max(0, 1 - penalty);
  return { total: 0.8 * avg + 0.2 * riskFit, riskFit, parts };
}

function correlation(a, b) {
  if (a === b) return 0.85;
  if (a === "Cash" || b === "Cash") return 0;
  const has = (x, y) => (a === x && b === y) || (a === y && b === x);
  if (has("Aktien & ETFs", "Immobilien")) return 0.6;
  if (has("Aktien & ETFs", "Krypto")) return 0.4;
  if (has("Aktien & ETFs", "Anleihen")) return 0.1;
  return 0.25;
}

/** Erwartete Rendite, Schwankung und Ertrag eines gemischten Portfolios. */
function portfolioStats(weights, assets) {
  const items = Object.entries(weights).filter(([k, w]) => w > 0 && assets[k]).map(([k, w]) => [assets[k], w]);
  const total = items.reduce((s, it) => s + it[1], 0);
  if (total <= 0) return { mu: 0, sigma: 0, income: 0 };
  const norm = items.map(([a, w]) => [a, w / total]);
  let mu = 0, income = 0, variance = 0;
  for (const [a, w] of norm) { mu += a.er * w; income += a.income * w; }
  for (const [a, wa] of norm) {
    for (const [b, wb] of norm) {
      const rho = a.id === b.id ? 1 : correlation(a.cls, b.cls);
      variance += wa * wb * a.vol * b.vol * rho;
    }
  }
  return { mu, sigma: Math.sqrt(Math.max(variance, 0)), income };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i];
}

/** Monte-Carlo: viele mögliche Zukünfte. Gibt die Bandbreite je Jahr zurück. */
function simulate(initial, monthly, years, mu, sigma, { paths = 500, inflation = 0, crashYear = null, seed = 2026 } = {}) {
  const rng = makeRng(seed);
  const dt = 1 / 12;
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const shock = sigma * Math.sqrt(dt);
  const perYear = Array.from({ length: years + 1 }, () => []);
  const drawdowns = [];
  for (let p = 0; p < paths; p++) {
    let v = initial, peak = v, maxDd = 0;
    perYear[0].push(v);
    for (let m = 1; m <= years * 12; m++) {
      v = v * Math.exp(drift + shock * rng.gauss()) + monthly;
      if (crashYear && m === crashYear * 12) v *= 0.7;
      peak = Math.max(peak, v);
      maxDd = Math.max(maxDd, peak > 0 ? 1 - v / peak : 0);
      if (m % 12 === 0) {
        const y = m / 12;
        perYear[y].push(v / Math.pow(1 + inflation, y));
      }
    }
    drawdowns.push(maxDd);
  }
  const rows = perYear.map((vals, y) => {
    const s = vals.slice().sort((a, b) => a - b);
    return { year: y, invested: initial + monthly * 12 * y, p10: percentile(s, 0.1), p50: percentile(s, 0.5), p90: percentile(s, 0.9) };
  });
  const invested = initial + monthly * 12 * years;
  const finals = perYear[years];
  const loss = finals.filter(f => f < invested).length / Math.max(finals.length, 1);
  return { rows, loss, dd: percentile(drawdowns.sort((a, b) => a - b), 0.5), invested };
}

function futureValue(current, monthly, years, rate) {
  const n = Math.max(years * 12, 0);
  const r = rate / 12;
  const g = Math.pow(1 + r, n);
  return Math.abs(r) < 1e-9 ? current + monthly * n : current * g + monthly * (g - 1) / r;
}

function requiredMonthly(target, current, years, rate) {
  const n = Math.max(years * 12, 1);
  const r = rate / 12;
  const g = Math.pow(1 + r, n);
  const rest = target - current * g;
  if (rest <= 0) return 0;
  return Math.abs(r) < 1e-9 ? rest / n : rest * r / (g - 1);
}

/** Fehlerfunktion (Abramowitz/Stegun 7.1.26, Genauigkeit ~1e-7). */
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}
function normCdf(x) { return 0.5 * (1 + erf(x / Math.SQRT2)); }

/** Black-Scholes-Preis einer europäischen Option. */
function blackScholes(call, s, k, t, r, sigma) {
  if (t <= 0 || sigma <= 0) return Math.max(0, call ? s - k : k - s);
  const d1 = (Math.log(s / k) + (r + 0.5 * sigma * sigma) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);
  if (call) return s * normCdf(d1) - k * Math.exp(-r * t) * normCdf(d2);
  return k * Math.exp(-r * t) * normCdf(-d2) - s * normCdf(-d1);
}

const DERIVATIVE_KINDS = ["Call kaufen", "Put kaufen", "Future kaufen", "Future verkaufen", "Call verkaufen", "Put verkaufen"];

function derivativeProfit(kind, price, strike, premium, units) {
  const perUnit = {
    "Future kaufen": price - strike,
    "Future verkaufen": strike - price,
    "Call kaufen": Math.max(0, price - strike) - premium,
    "Put kaufen": Math.max(0, strike - price) - premium,
    "Call verkaufen": premium - Math.max(0, price - strike),
    "Put verkaufen": premium - Math.max(0, strike - price),
  }[kind];
  return perUnit * units;
}

/** Erfolgschance eines Angreifers – Formel aus dem Bitcoin-Whitepaper (Abschnitt 11). */
function attackerSuccess(q, z) {
  const p = 1 - q;
  if (q >= p) return 1;
  const lam = z * (q / p);
  let total = 1;
  for (let k = 0; k <= z; k++) {
    let poisson = Math.exp(-lam);
    for (let i = 1; i <= k; i++) poisson *= lam / i;
    total -= poisson * (1 - Math.pow(q / p, z - k));
  }
  return Math.max(0, total);
}

// ---------------------------------------------------------------------
// SHA-256 (selbst geschrieben, damit man den Code nachlesen kann)
// ---------------------------------------------------------------------
const SHA_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const SHA_W = new Uint32Array(64);
const utf8 = new TextEncoder();

function sha256(text) {
  const bytes = utf8.encode(text);
  const len = bytes.length;
  const padded = ((len + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(padded);
  buf.set(bytes);
  buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(padded - 8, Math.floor(len / 0x20000000));
  view.setUint32(padded - 4, (len * 8) >>> 0);
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = SHA_W;
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA_K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(x => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

// ---------------------------------------------------------------------
// Mini-Blockchain
// ---------------------------------------------------------------------
function blockHash(index, data, prev, nonce) { return sha256(`${index}|${data}|${prev}|${nonce}`); }

class MiniChain {
  constructor(difficulty = 3) {
    this.difficulty = difficulty;
    this.reset();
  }
  reset() {
    this.blocks = [{ index: 0, data: "Genesis-Block", prev: MiniChain.GENESIS_PREV, nonce: 0 }];
    this.mine(0);
  }
  hash(i) { const b = this.blocks[i]; return blockHash(b.index, b.data, b.prev, b.nonce); }
  status(i) {
    const expected = i === 0 ? MiniChain.GENESIS_PREV : this.hash(i - 1);
    if (this.blocks[i].prev !== expected) return "Kette unterbrochen";
    if (!this.hash(i).startsWith("0".repeat(this.difficulty))) return "nicht gemint";
    return "gültig";
  }
  isValid() { return this.blocks.every((_, i) => this.status(i) === "gültig"); }
  add(data) {
    const i = this.blocks.length;
    this.blocks.push({ index: i, data, prev: this.hash(i - 1), nonce: 0 });
    return i;
  }
  relink(start) {
    for (let j = Math.max(start, 1); j < this.blocks.length; j++) this.blocks[j].prev = this.hash(j - 1);
  }
  setData(i, data) { this.blocks[i].data = data; this.relink(i + 1); }
  tamper(i, data) { this.blocks[i].data = data; }
  /** Sucht eine Nonce. Gibt die Anzahl der Versuche zurück (oder null). */
  mine(i, limit = 3000000) {
    const b = this.blocks[i];
    if (i > 0) b.prev = this.hash(i - 1);
    const prefix = "0".repeat(this.difficulty);
    for (let nonce = 0; nonce < limit; nonce++) {
      if (blockHash(b.index, b.data, b.prev, nonce).startsWith(prefix)) {
        b.nonce = nonce;
        this.relink(i + 1);
        return nonce + 1;
      }
    }
    return null;
  }
}
MiniChain.GENESIS_PREV = "0".repeat(64);

const CHAINSCRIPT_EXAMPLE = `# Jede Zeile ist ein Befehl. Tippe "help" für alle Befehle.
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
`;

const CHAINSCRIPT_HELP = `Befehle:
  difficulty N      Schwierigkeit 1–5
  block "Text"      neuen Block anhängen
  mine              alle ungültigen Blöcke minen
  verify            Kette prüfen
  tamper N "Text"   Block N heimlich ändern
  edit N "Text"     Block N ändern und neu verketten
  hash "Text"       SHA-256 eines Textes
  print             Kette ausgeben
  attack Q Z        Angreifer mit Q % bei Z Bestätigungen
  reset             neue Kette`;

/** Führt ein ChainScript aus. Ergebnis: Liste aus [Art, Text]; Art = echo | info | ok | err */
function runChainScript(source, chain) {
  const out = [];
  const quoted = line => {
    const a = line.indexOf('"'), b = line.lastIndexOf('"');
    return a >= 0 && a < b ? line.slice(a + 1, b) : null;
  };
  const toInt = s => {
    if (s === undefined || !/^-?\d+$/.test(s)) throw new Error("bad");
    return parseInt(s, 10);
  };
  source.split("\n").forEach((raw, idx) => {
    const n = idx + 1;
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    out.push(["echo", "› " + line]);
    const parts = line.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    try {
      if (cmd === "help") {
        out.push(["info", CHAINSCRIPT_HELP]);
      } else if (cmd === "difficulty") {
        const d = toInt(args[0]);
        if (d < 1 || d > 5) throw new Error("bad");
        chain.difficulty = d;
        out.push(["info", `Hash muss mit ${"0".repeat(d)} beginnen (ca. ${fmtNum(Math.pow(16, d), 0)} Versuche).`]);
      } else if (cmd === "block") {
        const i = chain.add(quoted(line) || "");
        out.push(["info", `Block ${i} angehängt (noch nicht gemint).`]);
      } else if (cmd === "mine") {
        for (let i = 0; i < chain.blocks.length; i++) {
          if (chain.status(i) !== "gültig") {
            const tries = chain.mine(i);
            out.push(["ok", `Block ${i} gemint: ${fmtNum(tries || 0, 0)} Versuche, Hash ${chain.hash(i).slice(0, 20)}…`]);
          }
        }
      } else if (cmd === "verify") {
        if (chain.isValid()) out.push(["ok", `✓ Kette gültig (${chain.blocks.length} Blöcke).`]);
        chain.blocks.forEach((_, i) => {
          if (chain.status(i) !== "gültig") out.push(["err", `✗ Block ${i}: ${chain.status(i)}`]);
        });
      } else if (cmd === "tamper" || cmd === "edit") {
        const i = toInt(args[0]);
        if (i < 0 || i >= chain.blocks.length) throw new Error("bad");
        const text = quoted(line) || "";
        if (cmd === "tamper") {
          chain.tamper(i, text);
          out.push(["info", `Block ${i} heimlich geändert – prüfe mit verify.`]);
        } else {
          chain.setData(i, text);
          out.push(["info", `Block ${i} geändert, folgende Blöcke neu verkettet.`]);
        }
      } else if (cmd === "hash") {
        const text = quoted(line) || "";
        out.push(["info", `SHA-256("${text}") =\n  ${sha256(text)}`]);
      } else if (cmd === "print") {
        chain.blocks.forEach((b, i) => {
          out.push(["info", `[${i}] ${b.data} · nonce ${b.nonce} · ${chain.hash(i).slice(0, 14)}… · ${chain.status(i)}`]);
        });
      } else if (cmd === "attack") {
        const q = parseFloat((args[0] || "").replace("%", ""));
        const z = toInt(args[1]);
        if (!isFinite(q)) throw new Error("bad");
        out.push(["info", `Angreifer ${fmtNum(q, 0)} %, ${z} Bestätigungen: Erfolgschance ≈ ${fmtPct(attackerSuccess(q / 100, z), 4)}`]);
      } else if (cmd === "reset") {
        chain.reset();
        out.push(["info", "Neue Kette erstellt."]);
      } else {
        out.push(["err", `Zeile ${n}: Unbekannter Befehl „${cmd}“. Tippe help.`]);
      }
    } catch (e) {
      out.push(["err", `Zeile ${n}: Befehl unvollständig. Tippe help.`]);
    }
  });
  return out;
}

// ---------------------------------------------------------------------
// Stadtmodell (Immobilien-Labor)
// ---------------------------------------------------------------------
// Name: Farbe, Kosten (Mio. €), Nachbarschaftseffekt, Höhe, vermietbar, Einwohner, Jobs, Beschreibung
const BUILDINGS = {
  "Leer":      { color: "#1b2147", cost: 0,  effect: 0.0,    height: 0.0,  rentable: false, pop: 0,    jobs: 0,   info: "Freie Fläche." },
  "Wohnhaus":  { color: C.blue,    cost: 4,  effect: -0.004, height: 0.8,  rentable: true,  pop: 400,  jobs: 0,   info: "Wohnraum für ca. 400 Menschen." },
  "Wohnturm":  { color: "#4059f2", cost: 14, effect: -0.012, height: 2.6,  rentable: true,  pop: 1200, jobs: 0,   info: "Hohe Dichte: mehr Angebot senkt Mieten." },
  "Büro":      { color: C.purple,  cost: 10, effect: 0.03,   height: 1.8,  rentable: true,  pop: 0,    jobs: 600, info: "600 Arbeitsplätze erhöhen die Nachfrage nach Wohnraum." },
  "Handel":    { color: C.lavender, cost: 5, effect: 0.04,   height: 0.6,  rentable: true,  pop: 0,    jobs: 200, info: "Läden machen ein Viertel attraktiver." },
  "Park":      { color: "#4db38c", cost: 2,  effect: 0.08,   height: 0.08, rentable: false, pop: 0,    jobs: 0,   info: "Grünfläche: steigert Preise in der Nähe." },
  "Schule":    { color: C.sky,     cost: 6,  effect: 0.06,   height: 0.7,  rentable: false, pop: 0,    jobs: 80,  info: "Wichtig für Familien." },
  "U-Bahn":    { color: "#f2cc66", cost: 12, effect: 0.12,   height: 0.35, rentable: false, pop: 0,    jobs: 40,  info: "Stärkster Preistreiber: gute Anbindung." },
  "Industrie": { color: C.gray,    cost: 7,  effect: -0.10,  height: 1.0,  rentable: false, pop: 0,    jobs: 500, info: "Viele Jobs, aber Lärm senkt Preise in der Nähe." },
};

class CityModel {
  constructor() {
    const n = CityModel.SIZE;
    this.cells = Array.from({ length: n * n }, () => ({ b: "Leer", price: CityModel.BASE }));
    const start = [[2, 2, "Wohnhaus"], [2, 3, "Wohnhaus"], [3, 2, "Wohnhaus"], [3, 3, "Büro"], [4, 3, "Handel"],
      [4, 2, "Wohnhaus"], [2, 4, "Park"], [5, 5, "Wohnhaus"], [6, 6, "Industrie"], [7, 6, "Industrie"],
      [1, 1, "Wohnhaus"], [3, 5, "Wohnhaus"]];
    for (const [x, y, b] of start) this.cells[y * n + x].b = b;
    this.year = 0;
    this.budget = 60;
    this.rate = 0.035;
    this.investment = null;
    this.recompute(1);
    this.history = [this.stats()];
  }
  locationScore(i) {
    const n = CityModel.SIZE;
    const x = i % n, y = Math.floor(i / n);
    let score = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < n && ny >= 0 && ny < n) {
          score += BUILDINGS[this.cells[ny * n + nx].b].effect / Math.max(Math.abs(dx), Math.abs(dy));
        }
      }
    }
    return score;
  }
  population() { return this.cells.reduce((s, c) => s + BUILDINGS[c.b].pop, 0); }
  jobs() { return this.cells.reduce((s, c) => s + BUILDINGS[c.b].jobs, 0); }
  demand() { return Math.max(0.5, Math.min(1.8, (this.jobs() / 0.55) / Math.max(this.population(), 1))); }
  vacancy() { return Math.max(0.01, Math.min(0.3, 0.06 - (this.demand() - 1) * 0.1)); }
  recompute(smoothing) {
    const demandFactor = 0.7 + 0.3 * this.demand();
    const rateFactor = 1 + (0.035 - this.rate) * 6;
    this.cells.forEach((c, i) => {
      const target = CityModel.BASE * (1 + this.locationScore(i)) * demandFactor * rateFactor;
      c.price += (target - c.price) * smoothing;
    });
  }
  rent(i) {
    const b = this.cells[i].b;
    const y = b === "Büro" ? 0.05 : b === "Handel" ? 0.055 : 0.038;
    return this.cells[i].price * y / 12;
  }
  place(b, i) {
    const cost = BUILDINGS[b].cost;
    if (this.cells[i].b === b) return "same";
    if (cost > this.budget) return "budget";
    this.budget -= cost;
    this.cells[i].b = b;
    if (this.investment && this.investment.cell === i && !BUILDINGS[b].rentable) this.investment = null;
    this.recompute(0.35);
    this.history[this.history.length - 1] = this.stats();
    return "ok";
  }
  advance(years = 1) {
    for (let k = 0; k < years; k++) {
      this.year += 1;
      for (const c of this.cells) c.price *= 1.015;
      this.recompute(0.3);
      this.budget += this.population() / 1000 * 0.8 + this.jobs() / 1000 * 1.2;
      if (this.investment) {
        const inv = this.investment;
        inv.rent += this.rent(inv.cell) * inv.sqm * 12 * (1 - this.vacancy());
      }
      this.history.push(this.stats());
    }
  }
  stats() {
    const ids = this.cells.map((c, i) => i).filter(i => BUILDINGS[this.cells[i].b].rentable);
    const avgPrice = ids.length ? ids.reduce((s, i) => s + this.cells[i].price, 0) / ids.length : CityModel.BASE;
    const avgRent = ids.length ? ids.reduce((s, i) => s + this.rent(i), 0) / ids.length : 0;
    const count = name => this.cells.filter(c => c.b === name).length;
    const quality = Math.max(0, Math.min(100, 45 + count("Park") * 7 + count("Schule") * 5 + count("U-Bahn") * 6 - count("Industrie") * 6));
    const co2 = Math.max(0, count("Industrie") * 12 + this.population() / 1000 * 3 - count("U-Bahn") * 4 - count("Park") * 1.5);
    return { year: this.year, price: avgPrice, rent: avgRent, pop: this.population(), jobs: this.jobs(),
      vacancy: this.vacancy(), quality, co2 };
  }
}
CityModel.SIZE = 8;
CityModel.BASE = 3500;

// ---------------------------------------------------------------------
// Spieltheorie
// ---------------------------------------------------------------------
const GAMES = [
  { title: "Ölförder-Dilemma", row: "Du (Land A)", col: "Land B", actions: ["Drosseln", "Mehr fördern"],
    pay: [[[6, 6], [1, 8]], [[8, 1], [3, 3]]], unit: "Mrd. €",
    lesson: "Gefangenendilemma: Mehr fördern ist einzeln immer besser – tun es beide, verdienen beide weniger (3 statt 6)." },
  { title: "Bauen oder Warten?", row: "Du (Entwickler A)", col: "Entwickler B", actions: ["Warten", "Jetzt bauen"],
    pay: [[[3, 3], [2, 6]], [[6, 2], [-2, -2]]], unit: "Mio. €",
    lesson: "Zwei Gleichgewichte: Einer baut, der andere wartet. Wer zuerst glaubhaft baut, gewinnt." },
  { title: "Bauer & Mühle", row: "Du (Bauer)", col: "Mühle", actions: ["Vertrag", "Freier Markt"],
    pay: [[[5, 5], [0, 3]], [[3, 0], [3, 3]]], unit: "Punkte",
    lesson: "Koordinationsspiel: Beide profitieren vom Vertrag, aber nur mit Vertrauen." },
];

const STRATEGIES = {
  "Wie du mir, so ich dir": "Beginnt freundlich, kopiert dann den letzten Zug des Gegners.",
  "Immer kooperieren": "Kooperiert immer – leicht auszunutzen.",
  "Immer eigennützig": "Handelt immer eigennützig.",
  "Nachtragend": "Kooperiert, bis der Gegner einmal betrügt – dann nie wieder.",
  "Zufall": "Entscheidet zufällig.",
};

function nash(game) {
  const res = [];
  const p = game.pay;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      if (p[r][c][0] >= p[1 - r][c][0] && p[r][c][1] >= p[r][1 - c][1]) res.push([r, c]);
    }
  }
  return res;
}

function strategyMove(name, mine, theirs, rng) {
  if (name === "Wie du mir, so ich dir") return theirs.length ? theirs[theirs.length - 1] : 0;
  if (name === "Immer kooperieren") return 0;
  if (name === "Immer eigennützig") return 1;
  if (name === "Nachtragend") return theirs.includes(1) ? 1 : 0;
  return rng() < 0.5 ? 0 : 1;
}

function tournament(game, rounds) {
  const rng = makeRng(1);
  const names = Object.keys(STRATEGIES);
  const scores = Object.fromEntries(names.map(n => [n, 0]));
  names.forEach((a, i) => {
    for (const b of names.slice(i)) {
      const ha = [], hb = [];
      let sa = 0, sb = 0;
      for (let k = 0; k < rounds; k++) {
        const ma = strategyMove(a, ha, hb, rng), mb = strategyMove(b, hb, ha, rng);
        sa += game.pay[ma][mb][0];
        sb += game.pay[ma][mb][1];
        ha.push(ma);
        hb.push(mb);
      }
      scores[a] += sa;
      if (a !== b) scores[b] += sb;
    }
  });
  return Object.entries(scores).sort((x, y) => y[1] - x[1]);
}

// ---------------------------------------------------------------------
// Zustand: Profil, Depot, Lernfortschritt
// ---------------------------------------------------------------------
function todayIso(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

function defaultState() {
  const year = new Date().getFullYear();
  return {
    profile: { name: "", age: "25–39", risk: 4, values: ["Nachhaltigkeit"], simple: false, onboarded: false },
    goals: [{ kind: "Vermögen aufbauen", target: 50000, year: year + 10, monthly: 250, share: 0.7 }],
    cash: 3150,
    holdings: { "world-etf": [132, 84.10], "reit-res": [568, 25.20], "btc": [0.1, 41000],
      "eth": [1.24, 1950], "gold": [2.15, 1820], "infra": [56.5, 50.0] },
    transactions: [{ date: todayIso(-200), kind: "Einzahlung", asset: "", amount: 40000 }],
    lessons: [],
  };
}

class AppState {
  /** saved = gespeicherte Daten (oder null), onSave = Funktion zum Speichern */
  constructor(saved, onSave) {
    this.data = Object.assign(defaultState(), saved || {});
    this.data.profile = Object.assign(defaultState().profile, this.data.profile || {});
    this.assets = makeAssets();
    this.rng = makeRng(Date.now() % 100000);
    this.onSave = onSave || (() => {});
  }
  get profile() { return this.data.profile; }
  save() { this.onSave(this.data); }

  /** Live-Kurse: kleine zufällige Bewegung alle paar Sekunden */
  tick() {
    const dt = 1 / (365 * 24 * 60);
    for (const a of Object.values(this.assets)) {
      if (a.vol <= 0) continue;
      a.price *= Math.exp(a.vol * Math.sqrt(dt) * this.rng.gauss() * 3);
      a.history[364] = a.price;
      a.dayChange = a.price / a.history[363] - 1;
    }
  }

  // --- Depot ---
  holdingValue(id) { return this.data.holdings[id][0] * this.assets[id].price; }
  total() { return this.data.cash + Object.keys(this.data.holdings).reduce((s, k) => s + this.holdingValue(k), 0); }
  invested() { return Object.values(this.data.holdings).reduce((s, [q, p]) => s + q * p, 0); }
  allocation() {
    const by = { "Cash": this.data.cash };
    for (const k of Object.keys(this.data.holdings)) {
      const c = this.assets[k].cls;
      by[c] = (by[c] || 0) + this.holdingValue(k);
    }
    const tot = Math.max(Object.values(by).reduce((s, v) => s + v, 0), 1);
    return Object.entries(by).filter(([, v]) => v > 0).map(([c, v]) => [c, v, v / tot]).sort((a, b) => b[1] - a[1]);
  }
  history() {
    const out = [];
    for (let i = 0; i < 365; i++) {
      let v = this.data.cash;
      for (const [k, [q]] of Object.entries(this.data.holdings)) v += q * this.assets[k].history[i];
      out.push(v);
    }
    return out;
  }
  monthlyIncome() {
    const inc = Object.keys(this.data.holdings).reduce((s, k) => s + this.holdingValue(k) * this.assets[k].income, 0);
    return (inc + this.data.cash * 0.02) / 12;
  }
  riskScore() {
    const tot = this.total();
    if (tot <= 0) return 1;
    let r = this.data.cash / tot;
    for (const k of Object.keys(this.data.holdings)) r += this.holdingValue(k) / tot * this.assets[k].risk;
    return r;
  }
  valueScore(value) {
    const tot = this.total();
    if (tot <= 0) return 0;
    let s = this.data.cash / tot * assetScore(this.assets.cash, value);
    for (const k of Object.keys(this.data.holdings)) s += this.holdingValue(k) / tot * assetScore(this.assets[k], value);
    return s;
  }
  addTx(kind, amount, asset = "") {
    this.data.transactions.unshift({ date: todayIso(), kind, asset, amount });
    this.save();
  }
  deposit(amount) {
    if (!(amount > 0)) throw new Error("Bitte einen Betrag größer als 0 eingeben.");
    this.data.cash += amount;
    this.addTx("Einzahlung", amount);
  }
  withdraw(amount) {
    if (!(amount > 0) || amount > this.data.cash) throw new Error("Nicht genug Guthaben.");
    this.data.cash -= amount;
    this.addTx("Auszahlung", amount);
  }
  buy(id, amount) {
    const a = this.assets[id];
    if (!(amount > 0) || amount > this.data.cash) throw new Error("Nicht genug Guthaben. Zahle zuerst Geld ein.");
    if (a.course && !this.courseDone(a.course)) throw new Error("Bevor du Krypto handelst, schließe bitte den Kurs „Code verstehen“ ab.");
    const qty = amount / a.price;
    const [q, p] = this.data.holdings[id] || [0, a.price];
    this.data.holdings[id] = [q + qty, (q * p + amount) / (q + qty)];
    this.data.cash -= amount;
    this.addTx("Kauf", amount, a.name);
  }
  sell(id, amount) {
    const a = this.assets[id];
    if (!this.data.holdings[id]) throw new Error("Du besitzt dieses Asset nicht.");
    const [q, p] = this.data.holdings[id];
    const qty = Math.min(amount / a.price, q);
    if (!(qty > 0)) throw new Error("Bitte einen Betrag größer als 0 eingeben.");
    if (q - qty < 1e-9) delete this.data.holdings[id];
    else this.data.holdings[id] = [q - qty, p];
    this.data.cash += qty * a.price;
    this.addTx("Verkauf", qty * a.price, a.name);
  }

  // --- Lernen ---
  courseProgress(course) {
    return course.lessons.filter(l => this.data.lessons.includes(l.id)).length / course.lessons.length;
  }
  courseDone(id) { const c = courseById(id); return !c || this.courseProgress(c) >= 1; }
  learningProgress() {
    const all = COURSES.flatMap(c => c.lessons);
    return all.filter(l => this.data.lessons.includes(l.id)).length / all.length;
  }
  recommended() {
    const rel = c => {
      let s = c.values.filter(v => this.profile.values.includes(v)).length * 1.5;
      if (c.id === "basics") s += 2;
      if (c.id === "crypto-code") s += 2;
      if (this.courseProgress(c) >= 1) s -= 5;
      return s;
    };
    return COURSES.slice().sort((a, b) => rel(b) - rel(a));
  }
}

// Für Tests mit Node (wird in Electron ignoriert)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { fmtNum, fmtEur, fmtPct, makeAssets, valueMatch, portfolioStats, simulate, futureValue,
    requiredMonthly, blackScholes, derivativeProfit, attackerSuccess, sha256, MiniChain, runChainScript,
    CityModel, BUILDINGS, GAMES, nash, tournament, AppState, defaultState, COURSES };
}
