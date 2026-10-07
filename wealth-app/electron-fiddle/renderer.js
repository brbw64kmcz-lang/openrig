/* =====================================================================
   ELECTRON FIDDLE – FENSTER 4 von 5:  renderer.js
   Teil A: Daten und Berechnungen. Teil B: die Oberfläche (alle Seiten).
   Alles in diesem Fenster löschen und diesen Code komplett einfügen.
   ===================================================================== */
"use strict";

// #####################################################################
// TEIL A – Daten und Rechenkerne
// #####################################################################

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


// #####################################################################
// TEIL B – Oberfläche
// #####################################################################

// ---------------------------------------------------------------------
// Speicher: in Electron über preload.js, sonst (im Browser) localStorage
// ---------------------------------------------------------------------
const Speicher = window.investmindSpeicher || {
  laden: async () => { try { return JSON.parse(localStorage.getItem("investmind") || "null"); } catch { return null; } },
  speichern: async (d) => { try { localStorage.setItem("investmind", JSON.stringify(d)); } catch { /* ignorieren */ } return true; },
  pfad: async () => "Browser-Speicher (localStorage)",
};

let st;          // AppState: Profil, Depot, Lernfortschritt
let chain;       // Mini-Blockchain im Krypto-Labor
let city;        // Stadtmodell im Immobilien-Labor
let savePath = "";

// ---------------------------------------------------------------------
// Bereiche der App (wie AppSection in Swift)
// ---------------------------------------------------------------------
const ICONS = {
  dashboard: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  portfolio: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>',
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  simulator: '<path d="M4 20h16M5 16l4-5 4 3 6-8"/><path d="M15 6h4v4"/>',
  learn: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
  crypto: '<path d="M8 6h6a3 3 0 0 1 0 6H8zM8 12h7a3 3 0 0 1 0 6H8zM8 6v12M10 3.5V6M13 3.5V6M10 18v2.5M13 18v2.5"/>',
  city: '<path d="M3 21h18M5 21V10l5-3v14M10 21V4l9 4v13M13 10h3M13 14h3M13 18h3"/>',
  strategy: '<path d="M12 3v9h9A9 9 0 1 1 12 3z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  assistant: '<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
};
function icon(name, cls = "") {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

const SECTIONS = {
  dashboard: { title: "Übersicht", plain: "Dein Vermögen auf einen Blick" },
  portfolio: { title: "Mein Depot", plain: "Ein- und auszahlen, kaufen, verkaufen" },
  goals: { title: "Ziele & Strategie", plain: "Bin ich auf Kurs?" },
  simulator: { title: "Simulator", plain: "Zukunft durchspielen – ohne Risiko" },
  learn: { title: "Lernen", plain: "Kurze Lektionen mit Quiz" },
  crypto: { title: "Krypto-Labor", plain: "Mining, Code und Sicherheit" },
  city: { title: "Immobilien-Labor", plain: "Baue eine Stadt in 3D" },
  strategy: { title: "Strategie-Labor", plain: "Rohstoffe, Optionen, Spieltheorie" },
  assistant: { title: "KI-Assistent", plain: "Fragen stellen, Antworten verstehen" },
  settings: { title: "Einstellungen", plain: "Profil, Schrift, Datenschutz" },
};
const GROUPS = [
  ["Start", ["dashboard", "portfolio", "goals"]],
  ["Ausprobieren", ["simulator", "learn"]],
  ["Labore", ["crypto", "city", "strategy"]],
  ["Hilfe", ["assistant", "settings"]],
];
const TABS = ["dashboard", "portfolio", "simulator", "learn"];

// ---------------------------------------------------------------------
// Ansichts-Zustand (bleibt beim Neuzeichnen erhalten)
// ---------------------------------------------------------------------
const SIM_PRESETS = {
  "Vorsichtig": { "gov-bond": 0.4, "world-etf": 0.3, "cash": 0.2, "gold": 0.1 },
  "Ausgewogen": { "world-etf": 0.6, "green-bond": 0.2, "reit-res": 0.1, "gold": 0.1 },
  "Chancenorientiert": { "world-etf": 0.5, "usa500": 0.2, "btc": 0.1, "clean": 0.1, "pe": 0.1 },
  "Nachhaltig": { "clean": 0.25, "green-bond": 0.3, "infra": 0.25, "world-etf": 0.2 },
};

const view = {
  section: "dashboard",
  stack: [],              // Navigation wie NavigationStack: [{type:"asset", id}, {type:"lesson", course, idx}]
  menuOpen: false,
  sim: { weights: { ...SIM_PRESETS["Ausgewogen"] }, initial: 10000, monthly: 200, years: 20, inflation: false, crash: false },
  der: { u: "Gold", k: "Call kaufen", strike: 100, m: 3 },
  hedge: null,
  gt: null,
  tourRounds: 20,
  city: { tool: "Wohnhaus", heat: false, sel: null, rot: 0 },
  chat: [],
  script: null,
  console: [],
  lastMine: "",
  hashText: "Hallo",
  attackQ: 25,
  answer: null,
};

// ---------------------------------------------------------------------
// Ereignisse: Knöpfe bekommen data-click="…" statt onclick (sicherer)
// ---------------------------------------------------------------------
const ACT = { s: new Map(), m: new Map() };
let actScope = "s";
let actSeq = 0;
function on(fn) {
  const id = actScope + (++actSeq);
  ACT[actScope].set(id, fn);
  return id;
}
function runAction(attr, el, ev) {
  const id = el.getAttribute(attr);
  const fn = ACT[id[0]] && ACT[id[0]].get(id);
  if (!fn) return;
  try {
    fn(el, ev);
  } catch (err) {
    toast(err.message || "Etwas ist schiefgelaufen.", "warn");
    if (!(err instanceof Error) || !/Guthaben|Betrag|Krypto|besitzt|Zahl/.test(err.message)) console.error(err.stack || err);
  }
}
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-click]");
  if (el && !el.disabled) runAction("data-click", el, ev);
});
document.addEventListener("input", (ev) => {
  const el = ev.target.closest("[data-input]");
  if (el) runAction("data-input", el, ev);
});
document.addEventListener("change", (ev) => {
  const el = ev.target.closest("[data-change]");
  if (el) runAction("data-change", el, ev);
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" && !ev.shiftKey) {
    const el = ev.target.closest("[data-enter]");
    if (el) { ev.preventDefault(); runAction("data-enter", el, ev); }
  }
  if (ev.key === "Escape" && document.querySelector(".sheet-backdrop:not(.fullscreen)")) closeSheet();
});

// ---------------------------------------------------------------------
// Kleine Bausteine (wie Components.swift)
// ---------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function num(v, fallback = 0) {
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return isFinite(n) ? n : fallback;
}
function parseAmount(v) {
  const s = String(v).trim();
  // "1.500,50" oder "1500.50" oder "1500"
  const n = s.includes(",") ? parseFloat(s.replace(/\./g, "").replace(",", ".")) : parseFloat(s);
  if (!isFinite(n)) throw new Error("Bitte eine Zahl eingeben.");
  return n;
}

function btn(text, fn, { secondary = false, small = false, disabled = false, cls = "" } = {}) {
  return `<button class="btn ${secondary ? "secondary" : "primary"} ${small ? "small" : ""} ${cls}" ${disabled ? "disabled" : ""} data-click="${on(fn)}">${text}</button>`;
}
function card(title, body, { iconName = null, trailing = "", cls = "" } = {}) {
  const head = title
    ? `<div class="card-head">${iconName ? icon(iconName, "lav") : ""}<h3>${title}</h3><span class="spacer"></span>${trailing ? `<span class="trailing">${trailing}</span>` : ""}</div>`
    : "";
  return `<section class="card ${cls}">${head}${body}</section>`;
}
function tile(label, value, sub = "", color = "") {
  return `<div class="tile"><div class="tile-label">${label}</div><div class="tile-value" ${color ? `style="color:${color}"` : ""}>${value}</div>${sub ? `<div class="tile-sub" ${color ? `style="color:${color}"` : ""}>${sub}</div>` : ""}</div>`;
}
function progress(v, cls = "") {
  const p = Math.max(0, Math.min(1, v || 0)) * 100;
  return `<div class="progress ${cls}"><div style="width:${p.toFixed(1)}%"></div></div>`;
}
function badge(kind) {
  const colors = { "ECHTGELD": C.green, "SIMULATION": C.lavender, "LERNEN": C.sky, "DEMODATEN": C.yellow };
  return `<span class="badge" style="color:${colors[kind]};border-color:${colors[kind]}55;background:${colors[kind]}1f">${kind}</span>`;
}
function change(v) {
  if (v > 0.0005) return `<span class="pos">▲ ${fmtPct(v, 2, true)}</span>`;
  if (v < -0.0005) return `<span class="neg">▼ ${fmtPct(v, 2)}</span>`;
  return `<span class="muted">● ${fmtPct(v, 2)}</span>`;
}
function hint(text, title = "So rechnen wir") {
  const open = st.profile.simple ? "open" : "";
  return `<details class="hint" ${open}><summary>${icon("info")} ${title}</summary><p>${text}</p></details>`;
}
function segmented(options, selected, fn) {
  return `<div class="segmented">${options.map((o, i) =>
    `<button class="${o === selected ? "on" : ""}" data-click="${on(() => fn(o, i))}">${esc(o)}</button>`).join("")}</div>`;
}
function toggle(label, checked, fn) {
  return `<label class="toggle-row"><span>${label}</span><input type="checkbox" class="switch" ${checked ? "checked" : ""} data-change="${on((el) => fn(el.checked))}"></label>`;
}
function slider(label, value, min, max, step, fn, fmt = (v) => fmtNum(v, 0), id = "") {
  const sid = id || "sl" + (++actSeq);
  return `<div class="slider"><div class="slider-head"><span>${label}</span><b id="${sid}-v">${fmt(value)}</b></div>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}"
      data-input="${on((el) => { const v = parseFloat(el.value); $(sid + "-v").textContent = fmt(v); fn(v); })}"></div>`;
}
function row(left, right, cls = "") {
  return `<div class="row ${cls}"><div>${left}</div><div class="right">${right}</div></div>`;
}

function toast(text, kind = "ok") {
  const t = $("toast");
  t.textContent = text;
  t.className = "show " + kind;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.className = ""; }, 3200);
}

// ---------------------------------------------------------------------
// Dialoge (wie .sheet in SwiftUI)
// ---------------------------------------------------------------------
function openSheet(buildHtml, { fullscreen = false, after = null } = {}) {
  ACT.m.clear();
  actScope = "m";
  const html = buildHtml();
  actScope = "s";
  $("sheet-layer").innerHTML =
    `<div class="sheet-backdrop ${fullscreen ? "fullscreen" : ""}"><div class="sheet">${html}</div></div>`;
  if (after) after();
}
function closeSheet() {
  $("sheet-layer").innerHTML = "";
  ACT.m.clear();
}
function confirmSheet(title, text, okText = "Ja") {
  return new Promise((resolve) => {
    openSheet(() => `<h2>${esc(title)}</h2><p class="sheet-text">${esc(text)}</p>
      <div class="btn-row end">${btn("Abbrechen", () => { closeSheet(); resolve(false); }, { secondary: true })}
      ${btn(esc(okText), () => { closeSheet(); resolve(true); })}</div>`);
  });
}

// ---------------------------------------------------------------------
// Diagramme (SVG, im Stil von Swift Charts)
// ---------------------------------------------------------------------
let chartSeq = 0;
function lineChart({ series, band = null, labels = [], h = 220, fmtY = fmtCompact, zero = false, W = 800 }) {
  const padR = 18, padT = 14, padB = 28;
  const all = [];
  series.forEach((s) => all.push(...s.values));
  if (band) { all.push(...band[0], ...band[1]); }
  if (zero) all.push(0);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const span = hi - lo;
  lo -= span * 0.05; hi += span * 0.05;
  const yLabels = [0, 1, 2, 3, 4].map((k) => fmtY(lo + (hi - lo) * k / 4));
  const padL = 18 + 7.6 * Math.max(...yLabels.map((t) => t.length));
  const n = Math.max(...series.map((s) => s.values.length));
  const X = (i) => padL + (W - padL - padR) * (n <= 1 ? 0 : i / (n - 1));
  const Y = (v) => padT + (h - padT - padB) * (1 - (v - lo) / (hi - lo));
  const id = "g" + (++chartSeq);
  let out = `<svg class="chart" viewBox="0 0 ${W} ${h}" preserveAspectRatio="xMidYMid meet">`;
  for (let k = 0; k <= 4; k++) {
    const y = Y(lo + (hi - lo) * k / 4);
    out += `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" class="grid"/><text x="${padL - 8}" y="${y + 4}" text-anchor="end" class="axis">${esc(yLabels[k])}</text>`;
  }
  if (zero && lo < 0 && hi > 0) out += `<line x1="${padL}" x2="${W - padR}" y1="${Y(0)}" y2="${Y(0)}" class="zero"/>`;
  if (band) {
    const top = band[1].map((v, i) => `${X(i)},${Y(v)}`).join(" ");
    const bottom = band[0].map((v, i) => `${X(i)},${Y(v)}`).reverse().join(" ");
    out += `<polygon points="${top} ${bottom}" fill="${C.purple}" fill-opacity="0.28"/>`;
  }
  series.forEach((s, si) => {
    const pts = s.values.map((v, i) => `${X(i)},${Y(v)}`);
    if (s.area) {
      out += `<defs><linearGradient id="${id}-${si}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity="0.35"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs>`;
      out += `<polygon points="${X(0)},${h - padB} ${pts.join(" ")} ${X(s.values.length - 1)},${h - padB}" fill="url(#${id}-${si})"/>`;
    }
    out += `<polyline points="${pts.join(" ")}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.4}" ${s.dashed ? 'stroke-dasharray="6 5"' : ""} stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  labels.forEach(([i, text]) => {
    const anchor = i === 0 ? "start" : i >= n - 1 ? "end" : "middle";
    out += `<text x="${X(i)}" y="${h - 8}" text-anchor="${anchor}" class="axis">${esc(text)}</text>`;
  });
  return out + "</svg>";
}

function donut(slices, centerText, size = 180) {
  const r = 70, cx = 90, cy = 90, circ = 2 * Math.PI * r;
  let offset = 0;
  let out = `<svg class="donut" viewBox="0 0 180 180" width="${size}" height="${size}">`;
  out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="22"/>`;
  for (const [name, , share] of slices) {
    const len = Math.max(0, share * circ - 2);
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CLASS_COLORS[name] || C.gray}" stroke-width="22"
      stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += share * circ;
  }
  out += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" class="donut-small">Gesamt</text>`;
  out += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" class="donut-big">${esc(centerText)}</text>`;
  return out + "</svg>";
}

function bars(values, labels, { colors = null, fmt = fmtCompact, h = 210, W = 800 } = {}) {
  const padL = 14, padR = 14, padT = 22, padB = 30;
  const hi = Math.max(0, ...values), lo = Math.min(0, ...values);
  const span = hi - lo || 1;
  const n = values.length;
  const slot = (W - padL - padR) / n;
  const bw = Math.min(56, slot * 0.68);
  const Y = (v) => padT + (h - padT - padB) * (1 - (v - lo) / span);
  let out = `<svg class="chart" viewBox="0 0 ${W} ${h}" preserveAspectRatio="xMidYMid meet">`;
  out += `<line x1="${padL}" x2="${W - padR}" y1="${Y(0)}" y2="${Y(0)}" class="grid"/>`;
  values.forEach((v, i) => {
    const x = padL + slot * i + (slot - bw) / 2;
    const y1 = Y(Math.max(v, 0)), y2 = Y(Math.min(v, 0));
    const color = colors ? colors[i % colors.length] : C.blue;
    out += `<rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(1, y2 - y1)}" rx="6" fill="${color}"/>`;
    out += `<text x="${x + bw / 2}" y="${v >= 0 ? y1 - 6 : y2 + 14}" text-anchor="middle" class="bar-val">${esc(fmt(v))}</text>`;
    out += `<text x="${x + bw / 2}" y="${h - 9}" text-anchor="middle" class="axis">${esc(labels[i])}</text>`;
  });
  return out + "</svg>";
}

function sparkline(values, color) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const pts = values.map((v, i) => `${(i * 110 / (values.length - 1)).toFixed(1)},${(28 - 24 * (v - lo) / ((hi - lo) || 1)).toFixed(1)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 110 32"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}

// ---------------------------------------------------------------------
// Navigation und Neuzeichnen
// ---------------------------------------------------------------------
const afterRender = [];

function navigate(section) {
  view.section = section;
  view.stack = [];
  view.menuOpen = false;
  console.log("Seite geöffnet: " + SECTIONS[section].title);
  render({ top: true });
}
function push(route) {
  view.stack.push(route);
  render({ top: true });
}
function pop() {
  view.stack.pop();
  render({ top: true });
}

function render({ top = false } = {}) {
  const detail = $("detail");
  const scroll = detail.scrollTop;
  ACT.s.clear();
  actScope = "s";
  afterRender.length = 0;

  const route = view.stack[view.stack.length - 1];
  let body, navTitle;
  if (route && route.type === "asset") { body = pageAsset(route.id); navTitle = st.assets[route.id].name; }
  else if (route && route.type === "lesson") { body = pageLesson(route.course, route.idx); navTitle = "Lektion"; }
  else { body = PAGES[view.section](); navTitle = SECTIONS[view.section].title; }

  $("sidebar").innerHTML = sidebarHtml();
  $("tabbar").innerHTML = tabbarHtml();
  $("navbar").innerHTML = `
    <div class="nav-left">${view.stack.length
      ? `<button class="nav-back" data-click="${on(pop)}">${icon("back")} ${esc(SECTIONS[view.section].title)}</button>`
      : `<button class="nav-menu" data-click="${on(() => { view.menuOpen = !view.menuOpen; render(); })}">${icon("more")}</button>`}</div>
    <div class="nav-title">${esc(navTitle)}</div>
    <div class="nav-right"><span class="live-dot">●</span> Live</div>`;
  $("screen").innerHTML = body +
    `<p class="footnote">Hinweis: Alle Kurse, Nachrichten und Kennzahlen sind Demodaten. Keine Anlageberatung. Simulationen sind keine Prognosen.</p>`;
  document.body.classList.toggle("menu-open", view.menuOpen);
  detail.scrollTop = top ? 0 : scroll;
  afterRender.forEach((fn) => fn());
}

function sidebarHtml() {
  const simple = st.profile.simple;
  let out = `<div class="brand"><div class="brand-icon">${icon("simulator")}</div><div><div class="brand-name">${APP_NAME}</div><div class="brand-claim">${APP_CLAIM}</div></div></div>`;
  for (const [group, ids] of GROUPS) {
    out += `<div class="side-group">${group}</div>`;
    for (const id of ids) {
      const s = SECTIONS[id];
      out += `<button class="side-item ${view.section === id ? "on" : ""}" data-click="${on(() => navigate(id))}">
        <span class="side-icon">${icon(id)}</span><span class="side-text">${s.title}${simple ? `<small>${s.plain}</small>` : ""}</span></button>`;
    }
  }
  out += `<div class="side-footer"><div class="caption">Dein Lernfortschritt</div>${progress(st.learningProgress())}
    <div class="quote">„Nicht was du kaufst, ist entscheidend, sondern was du verstehst.“</div></div>`;
  return out;
}

function tabbarHtml() {
  let out = TABS.map((id) => `<button class="${view.section === id && !view.menuOpen ? "on" : ""}" data-click="${on(() => navigate(id))}">${icon(id)}<span>${SECTIONS[id].title.replace("Mein ", "")}</span></button>`).join("");
  out += `<button class="${view.menuOpen || !TABS.includes(view.section) ? "on" : ""}" data-click="${on(() => { view.menuOpen = !view.menuOpen; render(); })}">${icon("more")}<span>Mehr</span></button>`;
  return out;
}

function screen(title, subtitle, badgeKind, body) {
  return `<div class="screen-head"><div class="title-row"><h1>${title}</h1>${badgeKind ? badge(badgeKind) : ""}</div>
    ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}</div>${body}`;
}

// ---------------------------------------------------------------------
// Live-Kurse (alle 3 Sekunden)
// ---------------------------------------------------------------------
function liveTick() {
  if (!st) return;
  st.tick();
  document.querySelectorAll("[data-live='total']").forEach((el) => { el.textContent = fmtEur(st.total()); });
  document.querySelectorAll("[data-live-price]").forEach((el) => {
    const a = st.assets[el.getAttribute("data-live-price")];
    el.textContent = fmtNum(a.price, a.price < 10 ? 3 : 2) + " €";
  });
  document.querySelectorAll("[data-live-change]").forEach((el) => {
    el.innerHTML = change(st.assets[el.getAttribute("data-live-change")].dayChange);
  });
}

// =====================================================================
// SEITEN
// =====================================================================
const PAGES = {};

// ---------------------------------------------------------------------
// Übersicht
// ---------------------------------------------------------------------
PAGES.dashboard = () => {
  const name = st.profile.name;
  const hist = st.history();
  const total = st.total();
  const r = st.riskScore();
  const diff = r - st.profile.risk;

  const monthsShort = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const now = new Date();
  const labels = [];
  for (let i = 0; i < 12; i++) labels.push([Math.round(i * 364 / 11), monthsShort[(now.getMonth() + 1 + i) % 12]]);

  const tiles = `<div class="tiles">
    ${tile("Gesamtvermögen", `<span data-live="total">${fmtEur(total)}</span>`, change(total / hist[hist.length - 31] - 1) + " (30 Tage)")}
    ${tile("Monatlicher Cashflow", fmtEur(st.monthlyIncome()), "Mieten, Dividenden, Zinsen")}
    ${tile("Rendite (12 Monate)", change(total / hist[0] - 1), "ohne Einzahlungen")}
    ${tile("Risiko (Portfolio)", fmtNum(r, 1) + " / 7", diff > 1 ? "höher als dein Profil" : "passt zu deinem Profil", diff > 1 ? C.yellow : "")}
  </div>`;

  const slices = st.allocation();
  const legend = slices.map(([n, v, s]) => `<div class="legend"><i style="background:${CLASS_COLORS[n] || C.gray}"></i><span>${n}</span><b>${fmtPct(s)}</b><em>${fmtEur(v)}</em></div>`).join("");

  const goals = st.data.goals.slice(0, 3).map((g) => {
    const cur = total * g.share;
    const p = g.target ? cur / g.target : 0;
    return `<div class="goal"><div class="row"><b>${esc(g.kind)}</b><span class="right">${fmtPct(Math.min(p, 1), 0)}</span></div>
      ${progress(p)}<div class="caption">${fmtEur(cur)} von ${fmtEur(g.target)} · bis ${g.year}</div></div>`;
  }).join("") || `<p class="muted">Noch keine Ziele.</p>`;

  const values = (st.profile.values.length ? st.profile.values : ["Nachhaltigkeit"]).map((v) => {
    const s = st.valueScore(v);
    return `<div class="goal"><div class="row"><span>${v}</span><b class="right">${fmtPct(s, 0)}</b></div>${progress(s)}</div>`;
  }).join("");

  const markets = ["world-etf", "btc", "gold", "reit-res", "oil", "clean", "infra", "green-bond"].map((id) => assetRow(st.assets[id])).join("");

  const news = NEWS.map(([title, hours, sent, meaning]) => {
    const col = { "+": C.green, "-": C.red, "=": C.lavender }[sent];
    return `<div class="news"><i style="background:${col}"></i><div><b>${title}</b> <span class="caption">· vor ${hours} Std.</span>
      <p><span class="lav">Was bedeutet das für mich?</span> ${meaning}</p></div></div>`;
  }).join("");

  const cycle = ["Verstehen", "Ausprobieren", "Simulieren", "Analysieren", "Strategie", "Umsetzen"]
    .map((s, i) => `<div class="cycle-step"><span>${i + 1}</span>${s}</div>`).join(`<div class="cycle-arrow">→</div>`);

  return screen(name ? `Hallo ${esc(name)}!` : "Hallo!", "Dein Vermögen. Deine Ziele. Deine Möglichkeiten.", null, `
    ${tiles}
    <div class="grid2 wide-left">
      ${card("Deine Performance (12 Monate)", lineChart({ series: [{ values: hist, color: C.blue, area: true }], labels, h: 300, W: 560 }), { iconName: "simulator" })}
      ${card("Portfolio-Verteilung", `<div class="donut-wrap">${donut(slices, fmtCompact(total) + " €")}<div class="legends">${legend}</div></div>`, { iconName: "portfolio" })}
    </div>
    <div class="grid2">
      ${card("Deine Ziele", goals + btn("Ziele bearbeiten", () => navigate("goals"), { secondary: true, small: true }), { iconName: "goals" })}
      ${card("Passt dein Depot zu dir?", values + hint("Jede Anlage wird mit ihrem Anteil am Depot und ihrer Punktzahl für den Wert gewichtet. Tippe unten auf ein Asset, um die Begründung zu sehen."), { iconName: "learn" })}
    </div>
    ${card("Charts & Daten", `<div class="list">${markets}</div>`, { iconName: "simulator", trailing: "Tippen für Profil" })}
    ${card("Top News", news, { iconName: "info" })}
    ${card("Lernkreislauf", `<div class="cycle">${cycle}</div>`, { iconName: "learn" })}
  `);
};

function assetRow(a) {
  return `<button class="list-row" data-click="${on(() => push({ type: "asset", id: a.id }))}">
    <i class="dot" style="background:${CLASS_COLORS[a.cls]}"></i>
    <span class="grow"><b>${a.name}</b><small>${a.symbol} · ${a.cls}</small></span>
    ${sparkline(a.history.slice(-30), a.dayChange >= 0 ? C.green : C.red)}
    <span class="num" data-live-price="${a.id}">${fmtNum(a.price, a.price < 10 ? 3 : 2)} €</span>
    <span class="num chg" data-live-change="${a.id}">${change(a.dayChange)}</span>
    <span class="chev">›</span></button>`;
}

// ---------------------------------------------------------------------
// Asset-Profil (eigene Seite mit Zurück-Knopf)
// ---------------------------------------------------------------------
function pageAsset(id) {
  const a = st.assets[id];
  const p = st.profile;
  const holding = st.data.holdings[id];
  const { total, riskFit, parts } = valueMatch(a, p);
  const verdict = total >= 0.75 ? "Passt sehr gut zu dir" : total >= 0.55 ? "Passt teilweise" : total >= 0.35 ? "Passt eher nicht" : "Widerspricht deinen Zielen";
  const locked = a.course && !st.courseDone(a.course);

  const priceCard = card(null, `
    <div class="price-big"><span data-live-price="${id}">${fmtNum(a.price, 2)} €</span> <small data-live-change="${id}">${change(a.dayChange)}</small> <small class="muted">heute</small></div>
    ${lineChart({ series: [{ values: a.history, color: CLASS_COLORS[a.cls], area: true }], h: 230, fmtY: (v) => fmtNum(v, v < 10 ? 2 : 0) })}
    ${holding ? `<p>Du besitzt <b>${fmtNum(holding[0], 4)}</b> Stück = <b>${fmtEur(holding[0] * a.price)}</b> · ${change(a.price / holding[1] - 1)} seit Kauf</p>` : ""}`);

  const match = card(`Passt das zu dir? <span class="lav">${fmtPct(total, 0)}</span>`, `
    <p><b>${verdict}</b> · Risikoklasse ${a.risk} (dein Profil ${p.risk}) · Risikopassung ${fmtPct(riskFit, 0)}</p>
    ${parts.map(([v, s, reason]) => `<div class="goal"><div class="row"><span>${v}</span><b class="right">${fmtPct(s, 0)}</b></div>${progress(s)}${reason ? `<div class="caption">${reason}</div>` : ""}</div>`).join("")}
    ${hint("Passung = 80 % Durchschnitt deiner gewählten Werte + 20 % Passung zur Risikobereitschaft.")}`, { iconName: "goals" });

  const facts = card("Kennzahlen & Rechenweg", `
    ${row("Risikoklasse", `<b>${a.risk} von 7</b>`)}
    ${row("Schwankung (Volatilität)", `<b>${fmtPct(a.vol, 0)}</b>`)}
    ${row("Laufender Ertrag p. a.", `<b>${fmtPct(a.income)}</b>`)}
    ${row("Erwartete Rendite (Annahme)", `<b>${fmtPct(a.er)}</b>`)}
    <div class="calc"><b>Rechenweg mit 10.000 € Beispielbetrag</b>
      Ertrag p. a. = 10.000 × ${fmtPct(a.income)} = ${fmtEur(10000 * a.income)}
      Erwarteter Wert in 10 J. = 10.000 × (1 + ${fmtPct(a.er)})^10 = ${fmtEur(10000 * Math.pow(1 + a.er, 10))}
      Schlechtes Jahr (−2σ) = 10.000 × (1 − 2 × ${fmtPct(a.vol, 0)}) = ${fmtEur(10000 * Math.max(0, 1 - 2 * a.vol))}</div>`, { iconName: "simulator" });

  const doTrade = async (kind) => {
    const amount = parseAmount($("trade-amount").value);
    if (kind === "buy" && a.risk > p.risk + 1) {
      const ok = await confirmSheet("Höheres Risiko", `Dieses Asset hat Risikoklasse ${a.risk}, dein Profil ${p.risk}. Starke Verluste sind möglich. Trotzdem kaufen?`, "Trotzdem kaufen");
      if (!ok) return;
    }
    try {
      if (kind === "buy") st.buy(id, amount); else st.sell(id, amount);
      console.log(`${kind === "buy" ? "Kauf" : "Verkauf"}: ${a.name} für ${fmtEur(amount, 2)} (Demo)`);
      toast("Buchung ausgeführt (Demo).");
      render();
    } catch (err) { toast(err.message, "warn"); }
  };

  const trade = card("Kaufen / Verkaufen (Demo-Depot)", `
    <p class="muted">Verfügbares Guthaben: <b>${fmtEur(st.data.cash, 2)}</b></p>
    <div class="input-row"><input id="trade-amount" class="input" value="500" inputmode="decimal"><span class="unit">€</span></div>
    <div class="btn-row">
      ${btn("Kaufen", () => doTrade("buy"), { disabled: locked })}
      ${btn("Verkaufen", () => doTrade("sell"), { secondary: true, disabled: !holding })}
      ${btn("Im Simulator testen", () => { view.sim.weights = { [id]: 1 }; navigate("simulator"); }, { secondary: true })}
    </div>
    ${locked ? `<div class="lock">🔒 Erst verstehen, dann handeln: Schließe vorher den Kurs „Code verstehen“ ab.
      ${btn("Zum Kurs", () => { navigate("learn"); }, { secondary: true, small: true })}</div>` : ""}`, { iconName: "portfolio" });

  return screen(a.name, `${a.symbol} · ${a.cls} · ${a.summary}`, "DEMODATEN", priceCard + `<div class="grid2">${match}${facts}</div>` + trade);
}

// ---------------------------------------------------------------------
// Mein Depot
// ---------------------------------------------------------------------
PAGES.portfolio = () => {
  const total = st.total(), inv = st.invested();
  const pl = total - st.data.cash - inv;
  const move = (kind) => {
    const v = parseAmount($("cash-amount").value);
    if (kind === "in") st.deposit(v); else st.withdraw(v);
    console.log(`${kind === "in" ? "Einzahlung" : "Auszahlung"}: ${fmtEur(v, 2)} (Demo)`);
    toast(kind === "in" ? "Eingezahlt (Demo)." : "Ausgezahlt (Demo).");
    render();
  };
  const holdings = Object.entries(st.data.holdings).map(([id, [q, p]]) => {
    const a = st.assets[id];
    return `<button class="list-row" data-click="${on(() => push({ type: "asset", id }))}">
      <i class="dot" style="background:${CLASS_COLORS[a.cls]}"></i>
      <span class="grow"><b>${a.name}</b><small>${fmtNum(q, q < 10 ? 4 : 2)} Stück · Ø ${fmtNum(p)} €</small></span>
      <span class="num">${fmtEur(q * a.price)}</span><span class="num chg">${change(a.price / p - 1)}</span><span class="chev">›</span></button>`;
  }).join("") || `<p class="muted">Noch keine Positionen. Tippe in der Übersicht auf ein Asset, um es zu kaufen.</p>`;

  const tx = st.data.transactions.slice(0, 10).map((t) => {
    const plus = t.kind === "Einzahlung" || t.kind === "Verkauf";
    return row(`<span class="caption">${t.date}</span> &nbsp; ${t.kind}${t.asset ? " · " + esc(t.asset) : ""}`,
      `<b class="${plus ? "pos" : ""}">${plus ? "+" : "−"}${fmtEur(t.amount, 2)}</b>`);
  }).join("");

  const reset = async () => {
    if (await confirmSheet("Zurücksetzen", "Demo-Depot auf den Anfangszustand zurücksetzen?", "Zurücksetzen")) {
      const fresh = defaultState();
      for (const k of ["cash", "holdings", "transactions"]) st.data[k] = fresh[k];
      st.save();
      render();
    }
  };

  const steps = [["Partnerbank anbinden", "Depot und Konto bei einer Bank mit BaFin-Erlaubnis."],
    ["Identität prüfen (KYC)", "Gesetzlich vorgeschrieben: Ausweis- und Geldwäscheprüfung."],
    ["Angemessenheit prüfen", "Kenntnisse abfragen (MiFID II) – die Lernmodule helfen."],
    ["Kosten offenlegen", "Alle Gebühren vor jedem Kauf anzeigen."]]
    .map(([t, d], i) => `<div class="step"><span>${i + 1}</span><div><b>${t}</b><div class="caption">${d}</div></div></div>`).join("");

  return screen("Mein Depot", "Demo-Depot (kein echtes Geld)", "ECHTGELD", `
    <div class="banner warn">⚠ <div><b>Demo-Depot.</b> In dieser Version wird kein echtes Geld bewegt. Echte Einzahlungen laufen später ausschließlich über eine lizenzierte Partnerbank mit BaFin-Erlaubnis – dein Geld liegt dann dort, nicht bei uns.</div></div>
    <div class="tiles">
      ${tile("Gesamtwert", `<span data-live="total">${fmtEur(total)}</span>`)}
      ${tile("Verfügbares Guthaben", fmtEur(st.data.cash), "sofort investierbar")}
      ${tile("Investiert (Kaufwert)", fmtEur(inv))}
      ${tile("Gewinn / Verlust", fmtEur(pl), change(inv ? pl / inv : 0))}
    </div>
    ${card("Ein- und Auszahlen", `<div class="input-row"><input id="cash-amount" class="input" value="250" inputmode="decimal"><span class="unit">€</span>
      ${btn("Einzahlen", () => move("in"))}${btn("Auszahlen", () => move("out"), { secondary: true })}</div>`, { iconName: "portfolio" })}
    ${card(`Positionen (${Object.keys(st.data.holdings).length} Anlagen)`, `<div class="list">${holdings}</div>`, { iconName: "simulator", trailing: "Tippen für Details" })}
    <div class="grid2">
      ${card("Umsätze", tx, { iconName: "learn" })}
      ${card("So wird aus dem Demo-Depot ein echtes Depot", steps + btn("Demo-Depot zurücksetzen", reset, { secondary: true, small: true }), { iconName: "goals" })}
    </div>`);
};

// ---------------------------------------------------------------------
// Ziele & Strategie
// ---------------------------------------------------------------------
const GOAL_KINDS = ["Vermögen aufbauen", "Finanzielle Freiheit", "Regelmäßiger Cashflow", "Eigenkapital für Unternehmen", "Eigene Immobilie", "Altersvorsorge"];

PAGES.goals = () => {
  const weights = {};
  for (const k of Object.keys(st.data.holdings)) weights[k] = st.holdingValue(k);
  weights.cash = st.data.cash;
  const mu = portfolioStats(weights, st.assets).mu || 0.04;
  const year = new Date().getFullYear();

  const goalCards = st.data.goals.map((g, idx) => {
    const years = Math.max(g.year - year, 1);
    const cur = st.total() * g.share;
    const proj = futureValue(cur, g.monthly, years, mu);
    const need = requiredMonthly(g.target, cur, years, mu);
    const ok = proj >= g.target;
    return card(`${esc(g.kind)} <span class="muted">· bis ${g.year}</span>`, `
      ${progress(g.target ? cur / g.target : 0)}
      <div class="caption">${fmtEur(cur)} von ${fmtEur(g.target)}</div>
      <p class="${ok ? "pos" : "warn-text"}"><b>${ok ? "✔ Du bist auf Kurs." : "⚠ Du liegst hinter deinem Plan."}</b>
        Mit ${fmtEur(g.monthly)}/Monat und ca. ${fmtPct(mu)} p. a. erreichst du voraussichtlich ${fmtEur(proj)}.</p>
      ${ok ? "" : `<p class="warn-text">Nötige Sparrate: <b>${fmtEur(need)}</b> pro Monat.</p>`}
      <div class="btn-row">${btn("Bearbeiten", () => editGoal(idx), { secondary: true, small: true })}
      ${btn("Löschen", async () => { if (await confirmSheet("Ziel löschen", `„${g.kind}“ wirklich löschen?`, "Löschen")) { st.data.goals.splice(idx, 1); st.save(); render(); } }, { secondary: true, small: true })}</div>`,
    { iconName: "goals" });
  }).join("");

  const add = () => {
    st.data.goals.push({ kind: "Vermögen aufbauen", target: 25000, year: year + 5, monthly: 150, share: 0.1 });
    st.save();
    render();
    editGoal(st.data.goals.length - 1);
  };

  const risk = st.profile.risk;
  const mix = risk <= 2 ? [["Anleihen", 50], ["Aktien & ETFs", 25], ["Cash", 15], ["Rohstoffe", 10]]
    : risk <= 5 ? [["Aktien & ETFs", 50], ["Anleihen", 20], ["Immobilien", 15], ["Rohstoffe", 10], ["Cash", 5]]
      : [["Aktien & ETFs", 60], ["Immobilien", 15], ["Krypto", 10], ["Alternative", 10], ["Cash", 5]];
  const mixHtml = mix.map(([n, pct]) => `<div class="legend"><i style="background:${CLASS_COLORS[n]}"></i><span>${n}</span><b>${pct} %</b></div>`).join("");
  const rules = ["Ich investiere nur Geld, das ich mindestens 5 Jahre nicht brauche.",
    "Ich halte 3 Monatsausgaben als Notgroschen auf dem Tagesgeld.",
    "Ich prüfe einmal im Jahr die Aufteilung – nicht täglich.",
    "Ich kaufe nichts, was ich nicht in zwei Sätzen erklären kann.",
    `Bei Krypto: maximal ${risk >= 6 ? 10 : 5} % meines Vermögens.`].map((r) => `<div class="check">☑ ${r}</div>`).join("");

  return screen("Ziele & Strategie", "Dein Plan – verständlich und überprüfbar.", null, `
    ${goalCards || card(null, `<p class="muted">Noch keine Ziele.</p>`)}
    ${btn("+ Ziel hinzufügen", add)}
    <div class="grid2" style="margin-top:16px">
      ${card("Mein persönliches System", mixHtml + `<div class="caption">Lernbeispiel für Risikobereitschaft ${risk}/7 – keine Anlageberatung.</div>`, { iconName: "portfolio" })}
      ${card("Meine Regeln", rules, { iconName: "learn" })}
    </div>`);
};

function editGoal(i) {
  const g = st.data.goals[i];
  const draft = { ...g };
  openSheet(() => `<h2>Ziel bearbeiten</h2>
    <label class="field"><span>Art des Ziels</span>
      <select class="input" data-change="${on((el) => { draft.kind = el.value; })}">${GOAL_KINDS.map((k) => `<option ${k === g.kind ? "selected" : ""}>${k}</option>`).join("")}</select></label>
    <label class="field"><span>Zielbetrag (€)</span><input class="input" id="g-target" value="${g.target}" inputmode="decimal"></label>
    <label class="field"><span>Zieljahr</span><input class="input" id="g-year" value="${g.year}" inputmode="numeric"></label>
    <label class="field"><span>Sparrate pro Monat (€)</span><input class="input" id="g-monthly" value="${g.monthly}" inputmode="decimal"></label>
    ${slider("Anteil des Depots für dieses Ziel", Math.round(g.share * 100), 0, 100, 5, (v) => { draft.share = v / 100; }, (v) => v + " %")}
    <div class="btn-row end">${btn("Abbrechen", closeSheet, { secondary: true })}${btn("Sichern", () => {
      const target = parseAmount($("g-target").value), yr = parseInt($("g-year").value, 10), monthly = parseAmount($("g-monthly").value);
      if (!(target > 0) || !(yr > 1900) || !(monthly >= 0)) throw new Error("Bitte gültige Zahlen eingeben.");
      Object.assign(g, draft, { target, year: yr, monthly });
      st.save();
      closeSheet();
      render();
    })}</div>`);
}

// ---------------------------------------------------------------------
// Simulator
// ---------------------------------------------------------------------
PAGES.simulator = () => {
  const s = view.sim;
  const tot = Object.values(s.weights).reduce((a, b) => a + b, 0) || 1;
  const allocRows = Object.entries(s.weights).map(([id, w]) => {
    const a = st.assets[id];
    const adj = (d) => {
      const v = (s.weights[id] || 0) + d;
      if (v <= 0.001) delete s.weights[id]; else s.weights[id] = Math.min(v, 1);
      render();
    };
    return `<div class="row alloc"><span><i class="dot" style="background:${CLASS_COLORS[a.cls]}"></i> ${a.name}</span>
      <span class="right"><b>${fmtPct(w / tot, 0)}</b> ${btn("−", () => adj(-0.05), { secondary: true, small: true, cls: "round" })}${btn("+", () => adj(0.05), { secondary: true, small: true, cls: "round" })}</span></div>`;
  }).join("") || `<p class="muted">Füge mindestens eine Anlage hinzu.</p>`;
  const choices = Object.values(st.assets).filter((a) => !(a.id in s.weights));
  const presetName = Object.keys(SIM_PRESETS).find((k) => JSON.stringify(SIM_PRESETS[k]) === JSON.stringify(s.weights)) || "";

  afterRender.push(runSimulation);

  return screen("Simulator", "Probiere Strategien aus. Verstehe Risiken. Entscheide besser.", "SIMULATION", `
    ${card("Schnellstart", segmented(Object.keys(SIM_PRESETS), presetName, (name) => { s.weights = { ...SIM_PRESETS[name] }; render(); }), { iconName: "simulator" })}
    <div class="grid2">
      ${card("Deine Annahmen", `
        ${slider("Startkapital", s.initial, 0, 200000, 500, (v) => { s.initial = v; runSimulation(); }, (v) => fmtEur(v))}
        ${slider("Monatliche Sparrate", s.monthly, 0, 3000, 25, (v) => { s.monthly = v; runSimulation(); }, (v) => fmtEur(v))}
        ${slider("Laufzeit", s.years, 1, 40, 1, (v) => { s.years = v; runSimulation(); }, (v) => v + " Jahre")}
        ${toggle("Inflation berücksichtigen (2 % p. a.)", s.inflation, (v) => { s.inflation = v; runSimulation(); })}
        ${toggle("Crash-Test: −30 % in der Mitte der Laufzeit", s.crash, (v) => { s.crash = v; runSimulation(); })}`, { iconName: "settings" })}
      ${card("Aufteilung", `${allocRows}
        <div class="input-row" style="margin-top:10px"><select class="input" id="sim-add">${choices.map((a) => `<option value="${a.id}">${a.name}</option>`).join("")}</select>
        ${btn("Hinzufügen", () => { const id = $("sim-add").value; if (id) { s.weights[id] = 0.1; render(); } }, { secondary: true })}</div>
        <div class="caption">Die Anteile werden automatisch auf 100 % umgerechnet.</div>`, { iconName: "portfolio" })}
    </div>
    ${card("Mögliche Entwicklung", `<div id="sim-chart"></div><div class="caption legend-line"><i style="background:${C.blue}"></i> mittleres Szenario <i style="background:${C.purple}"></i> Bandbreite (80 %) <i style="background:${C.gray}"></i> eingezahlt</div><div id="sim-tiles"></div>
      ${hint("Wir spielen 500 mögliche Zukünfte durch (Monte-Carlo). Jeden Monat wächst das Vermögen um die erwartete Rendite plus einen Zufallsschock in Höhe der typischen Schwankung, dann kommt die Sparrate dazu.")}`, { iconName: "simulator" })}`);
};

function runSimulation() {
  const s = view.sim;
  const chartEl = $("sim-chart");
  if (!chartEl) return;
  if (!Object.keys(s.weights).length) { chartEl.innerHTML = ""; $("sim-tiles").innerHTML = ""; return; }
  const { mu, sigma } = portfolioStats(s.weights, st.assets);
  const years = Math.round(s.years);
  const res = simulate(s.initial, s.monthly, years, mu, sigma, {
    inflation: s.inflation ? 0.02 : 0, crashYear: s.crash ? Math.max(1, Math.floor(years / 2)) : null,
  });
  const rows = res.rows;
  const step = Math.max(1, Math.round(rows.length / 8));
  const thisYear = new Date().getFullYear();
  chartEl.innerHTML = lineChart({
    series: [{ values: rows.map((r) => r.p50), color: C.blue, width: 3 }, { values: rows.map((r) => r.invested), color: C.gray, dashed: true }],
    band: [rows.map((r) => r.p10), rows.map((r) => r.p90)], W: 900,
    labels: rows.filter((_, i) => i % step === 0).map((r) => [r.year, String(thisYear + r.year)]),
    h: 280,
  });
  const last = rows[rows.length - 1];
  const cagr = res.invested ? Math.pow(Math.max(last.p50, 1) / res.invested, 1 / years) - 1 : 0;
  $("sim-tiles").innerHTML = `<div class="tiles">
    ${tile("Endwert (mittel)", fmtEur(last.p50), `nach ${years} Jahren`)}
    ${tile("Schlechtes Szenario", fmtEur(last.p10), "9 von 10 Fällen besser")}
    ${tile("Gutes Szenario", fmtEur(last.p90), "nur 1 von 10 Fällen besser")}
    ${tile("Eingezahlt", fmtEur(res.invested))}
    ${tile("Rendite p. a. (mittel)", fmtPct(cagr, 1, true))}
    ${tile("Schwankung", fmtPct(sigma, 0), "pro Jahr")}
    ${tile("Größter Rückgang", "−" + fmtPct(res.dd, 0), "typisch unterwegs", C.yellow)}
    ${tile("Verlustrisiko", fmtPct(res.loss, 0), "Ende < Einzahlungen", res.loss > 0.2 ? C.red : "")}</div>`;
}

// ---------------------------------------------------------------------
// Lernen
// ---------------------------------------------------------------------
PAGES.learn = () => {
  const courses = st.recommended().map((c) => {
    const p = st.courseProgress(c);
    const lessons = c.lessons.map((l, idx) => {
      const done = st.data.lessons.includes(l.id);
      return `<button class="list-row" data-click="${on(() => { view.answer = null; push({ type: "lesson", course: c.id, idx }); })}">
        <span class="lesson-num ${done ? "done" : ""}">${done ? "✓" : idx + 1}</span><span class="grow"><b>${l.title}</b><small>${l.quiz ? "mit Quiz" : "Lesen"}</small></span><span class="chev">›</span></button>`;
    }).join("");
    return card(`${c.title}`, `
      ${c.id === "crypto-code" && p < 1 ? `<div class="lock">🔒 Pflicht vor dem Krypto-Handel</div>` : ""}
      <div class="row"><span class="caption">${c.area}${c.values.some((v) => st.profile.values.includes(v)) ? " · passt zu deinen Werten" : ""}</span><span class="right caption">${fmtPct(p, 0)}</span></div>
      ${progress(p)}<div class="list">${lessons}</div>`, { iconName: "learn" });
  }).join("");
  return screen("Lernen", "Schritt für Schritt – passend zu deinen Zielen.", "LERNEN", `
    ${card("Dein Fortschritt", `${progress(st.learningProgress(), "big")}<div class="caption">${st.data.lessons.length} Lektionen abgeschlossen (${fmtPct(st.learningProgress(), 0)})</div>`, { iconName: "goals" })}
    <div class="grid2">${courses}</div>`);
};

function pageLesson(courseId, idx) {
  const course = courseById(courseId);
  const lesson = course.lessons[idx];
  const done = st.data.lessons.includes(lesson.id);
  const quiz = lesson.quiz;
  let quizHtml = "";
  if (quiz) {
    const [q, options, correct] = quiz;
    const chosen = view.answer;
    quizHtml = card("Quiz: " + q, `<div class="list">${options.map((o, i) => {
      const cls = chosen === i ? (i === correct ? "right-answer" : "wrong-answer") : "";
      return `<button class="list-row option ${cls}" data-click="${on(() => { view.answer = i; render(); })}"><span class="radio">${chosen === i ? "●" : "○"}</span><span class="grow">${o}</span></button>`;
    }).join("")}</div>
    ${chosen === null ? "" : chosen === correct ? `<p class="pos"><b>Richtig!</b></p>` : `<p class="warn-text"><b>Noch nicht ganz – versuch es nochmal.</b></p>`}`, { iconName: "goals" });
  }
  const finish = () => {
    if (quiz && view.answer !== quiz[2] && !done) { toast("Beantworte zuerst das Quiz richtig.", "warn"); return; }
    if (!done) { st.data.lessons.push(lesson.id); st.save(); console.log("Lektion abgeschlossen: " + lesson.title); }
    view.answer = null;
    if (idx + 1 < course.lessons.length) { view.stack[view.stack.length - 1] = { type: "lesson", course: courseId, idx: idx + 1 }; render({ top: true }); }
    else { toast(st.courseProgress(course) >= 1 ? `Kurs „${course.title}“ abgeschlossen! 🎉` : "Gespeichert."); pop(); }
  };
  return screen(lesson.title, `${course.title} · Lektion ${idx + 1} von ${course.lessons.length}`, "LERNEN", `
    ${card(null, `<div class="lesson-text">${esc(lesson.text)}</div>`)}
    ${quizHtml}
    <div class="btn-row">${btn(idx + 1 < course.lessons.length ? "Abschließen & weiter →" : "Lektion abschließen ✔", finish)}
    ${done ? `<span class="pos">✓ bereits abgeschlossen</span>` : ""}</div>`);
}

// ---------------------------------------------------------------------
// Krypto-Labor
// ---------------------------------------------------------------------
PAGES.crypto = () => {
  if (view.script === null) view.script = CHAINSCRIPT_EXAMPLE;
  const valid = chain.isValid();
  const blocks = chain.blocks.map((b, i) => {
    const status = chain.status(i);
    const ok = status === "gültig";
    const h = chain.hash(i);
    const n = chain.difficulty;
    const mine = () => {
      toast("⛏ Mining läuft …", "info");
      setTimeout(() => {
        const t0 = performance.now();
        const tries = chain.mine(i);
        const secs = (performance.now() - t0) / 1000;
        view.lastMine = `Block ${i}: ${fmtNum(tries || 0, 0)} Versuche in ${fmtNum(secs, 2)} s`;
        console.log("Gemint – " + view.lastMine);
        render();
        toast(tries ? "Block gemint ✓" : "Kein Treffer – versuche eine niedrigere Schwierigkeit.", tries ? "ok" : "warn");
      }, 40);
    };
    return `<div class="block ${ok ? "ok" : "bad"}">
      <div class="row"><b>Block #${i}</b><span class="right ${ok ? "pos" : "neg"}"><b>${status}</b></span></div>
      <input class="input" id="blk-${i}" value="${esc(b.data)}" ${i === 0 ? "disabled" : ""} spellcheck="false">
      <div class="mono caption">Nonce ${b.nonce} · Vorheriger Hash ${b.prev.slice(0, 16)}…</div>
      <div class="mono"><span class="${h.startsWith("0".repeat(n)) ? "pos" : "neg"}">${h.slice(0, n)}</span><span class="muted">${h.slice(n, 40)}…</span></div>
      <div class="btn-row">${i > 0 ? btn("Text übernehmen", () => { chain.setData(i, $("blk-" + i).value); render(); }, { secondary: true, small: true }) : ""}
      ${ok ? "" : btn("⛏ Minen", mine, { small: true })}</div></div>`;
  }).join("");

  const runScript = () => {
    view.script = $("script").value;
    view.console = runChainScript(view.script, chain);
    console.log(`ChainScript ausgeführt (${view.console.filter((x) => x[0] === "echo").length} Befehle)`);
    render();
  };

  afterRender.push(() => { updateHash(); updateAttack(); });

  return screen("Krypto-Labor", "Verstehe den Code hinter Bitcoin – indem du ihn selbst ausführst.", "SIMULATION", `
    ${card("Block-Miner", `
      <div class="row"><span>Schwierigkeit (führende Nullen)</span><span class="right">${segmented(["1", "2", "3", "4", "5"], String(chain.difficulty), (v) => { chain.difficulty = parseInt(v, 10); render(); })}</span></div>
      <p class="${valid ? "pos" : "neg"}"><b>${valid ? "✓ Kette gültig" : "✗ Kette ungültig – mine die roten Blöcke neu"}</b></p>
      <div class="blocks">${blocks}</div>
      ${view.lastMine ? `<p class="lav">${view.lastMine}</p>` : ""}
      <div class="input-row"><input class="input" id="new-block" value="Carol zahlt Dave 1 Coin">${btn("Block anhängen", () => { chain.add($("new-block").value); render(); }, { secondary: true })}</div>
      ${hint("Ändere den Text in einem alten Block: Sein Hash ändert sich, und alle folgenden Blöcke werden rot. Um die Fälschung zu verstecken, müsste man alle Blöcke neu minen – schneller als das ganze Netzwerk.", "Was passiert hier?")}`, { iconName: "crypto" })}
    ${card("Code-Editor: ChainScript", `
      <textarea id="script" class="code" spellcheck="false" rows="14">${esc(view.script)}</textarea>
      <div class="btn-row">${btn("▶ Ausführen", runScript)}${btn("Beispiel laden", () => { view.script = CHAINSCRIPT_EXAMPLE; render(); }, { secondary: true })}${btn("help", () => { view.console = runChainScript("help", chain); render(); }, { secondary: true })}</div>
      <div class="console-label">Konsole</div>
      <pre class="console">${view.console.length ? view.console.map(([k, t]) => `<span class="c-${k}">${esc(t)}</span>`).join("\n") : `<span class="c-echo">Hier erscheint die Ausgabe. Drücke ▶ Ausführen.</span>`}</pre>`, { iconName: "settings", trailing: "eine Lernsprache" })}
    <div class="grid2">
      ${card("Hash-Spielplatz", `<input class="input" id="hash-in" value="${esc(view.hashText)}" data-input="${on((el) => { view.hashText = el.value; updateHash(); })}" spellcheck="false">
        <div class="mono hash-out" id="hash-out"></div>
        ${hint("Ändere nur einen Buchstaben – etwa die Hälfte aller Zeichen ändert sich (Lawineneffekt).", "Probier es aus")}`, { iconName: "crypto" })}
      ${card("Sicherheit: Wie wahrscheinlich ist ein Angriff?", `
        ${slider("Rechenleistung des Angreifers", view.attackQ, 1, 49, 1, (v) => { view.attackQ = v; updateAttack(); }, (v) => v + " %")}
        <div id="attack-chart"></div><div class="caption">x-Achse: Bestätigungen (Blöcke nach deiner Zahlung). Formel aus dem Bitcoin-Whitepaper.</div>`, { iconName: "info" })}
    </div>`);
};

function updateHash() {
  const el = $("hash-out");
  if (el) el.textContent = sha256(view.hashText);
}
function updateAttack() {
  const el = $("attack-chart");
  if (!el) return;
  const vals = [];
  for (let z = 0; z <= 12; z++) vals.push(attackerSuccess(view.attackQ / 100, z));
  el.innerHTML = bars(vals, vals.map((_, z) => String(z)), { fmt: (v) => fmtPct(v, 0), colors: [C.purple], h: 260, W: 520 });
}

// ---------------------------------------------------------------------
// Immobilien-Labor (isometrische 3D-Stadt)
// ---------------------------------------------------------------------
const ISO = { W: 640, H: 470, tw: 74, th: 37, ox: 320, oy: 150, scale: 40 };

PAGES.city = () => {
  const v = view.city;
  const s = city.stats();
  const palette = Object.entries(BUILDINGS).map(([name, info]) =>
    `<button class="tool ${v.tool === name ? "on" : ""}" data-click="${on(() => { v.tool = name; render(); })}">
      <i style="background:${info.color}"></i><span>${name === "Leer" ? "Abreißen" : name}</span><small>${info.cost} Mio.</small></button>`).join("");
  const n = CityModel.SIZE;
  const grid = city.cells.map((c, i) =>
    `<button class="cell ${i === v.sel ? "sel" : ""}" style="background:${BUILDINGS[c.b].color}" title="${c.b}" data-click="${on(() => cityClick(i))}">${city.investment && city.investment.cell === i ? "★" : ""}</button>`).join("");

  let selected = "";
  if (v.sel !== null) {
    const i = v.sel, c = city.cells[i];
    const rentable = BUILDINGS[c.b].rentable;
    selected = card(`Feld ${i + 1}: ${c.b}`, `
      ${row("Preis pro m²", `<b>${fmtEur(c.price)}</b>`)}
      ${row("Lage-Effekt der Nachbarschaft", `<b>${fmtPct(city.locationScore(i), 1, true)}</b>`)}
      ${rentable ? row("Kaltmiete pro m² und Monat", `<b>${fmtEur(city.rent(i), 2)}</b>`) + row("80-m²-Wohnung kostet", `<b>${fmtEur(c.price * 80)}</b>`) : ""}
      ${rentable && !city.investment ? btn("Hier eine 80-m²-Wohnung kaufen (simuliert)", () => {
        city.investment = { cell: i, buy: city.cells[i].price * 80, sqm: 80, year: city.year, rent: 0 };
        console.log(`Immobilie gekauft: Feld ${i + 1} für ${fmtEur(city.investment.buy)}`);
        render();
      }, { secondary: true }) : ""}`, { iconName: "city" });
  }

  const inv = city.investment;
  let invHtml;
  if (inv) {
    const value = city.cells[inv.cell].price * inv.sqm;
    const ret = (value - inv.buy + inv.rent * 0.75) / inv.buy;
    invHtml = row("Gekauft in Jahr", `<b>${inv.year}</b>`) + row("Kaufpreis", `<b>${fmtEur(inv.buy)}</b>`) +
      row("Heutiger Wert", `<b>${fmtEur(value)}</b>`) + row("Eingenommene Miete", `<b>${fmtEur(inv.rent)}</b>`) +
      row("Gesamtrendite (nach 25 % Kosten)", `<b>${change(ret)}</b>`) +
      btn("Verkaufen", () => { city.investment = null; render(); }, { secondary: true, small: true });
  } else {
    invHtml = `<p class="muted">Tippe auf ein Wohn-, Büro- oder Handelsgebäude (mit demselben Werkzeug), um Details zu sehen und dort eine Wohnung zu kaufen.</p>`;
  }

  afterRender.push(drawCity);

  return screen("Immobilien-Labor", "Baue eine Stadt und sieh, wie Preise und Mieten reagieren.", "SIMULATION", `
    <div class="grid2 wide-left top">
      ${card(`Deine Stadt – Jahr ${city.year}`, `
        <canvas id="city-canvas" class="city-canvas" width="${ISO.W}" height="${ISO.H}"></canvas>
        <div class="btn-row">
          ${btn("⟲ Drehen", () => { v.rot = (v.rot + 3) % 4; render(); }, { secondary: true, small: true })}
          ${btn("Drehen ⟳", () => { v.rot = (v.rot + 1) % 4; render(); }, { secondary: true, small: true })}
          <span class="spacer"></span>${toggle("Heatmap: Preise pro m²", v.heat, (x) => { v.heat = x; render(); })}
        </div>`, { iconName: "city", trailing: "Höhe = Gebäudetyp × Preisniveau" })}
      ${card(`Bauen · Budget ${fmtNum(city.budget, 1)} Mio. €`, `
        <div class="tools">${palette}</div>
        <p class="caption">${BUILDINGS[v.tool].info}</p>
        <div class="caption"><b>Stadtplan</b> – tippe ein Feld (oder direkt in die 3D-Stadt):</div>
        <div class="city-grid" style="grid-template-columns:repeat(${n},1fr)">${grid}</div>`, { iconName: "settings" })}
    </div>
    ${selected}
    ${card("Zeit & Zinsen", `
      <div class="btn-row">${btn("+1 Jahr", () => { city.advance(1); render(); })}${btn("+5 Jahre", () => { city.advance(5); render(); }, { secondary: true })}</div>
      ${slider("Bauzins", city.rate * 100, 1, 7, 0.25, (x) => { city.rate = x / 100; }, (x) => fmtNum(x, 2) + " %")}
      <div class="caption">Höhere Zinsen machen Kredite teurer – Preise sinken (wirkt ab dem nächsten Jahr).</div>`, { iconName: "simulator" })}
    <div class="tiles">
      ${tile("Ø Preis pro m²", fmtEur(s.price))}${tile("Ø Miete pro m²", fmtEur(s.rent, 2))}
      ${tile("Mietrendite (brutto)", fmtPct(s.price ? s.rent * 12 / s.price : 0))}${tile("Einwohner", fmtNum(s.pop, 0))}
      ${tile("Arbeitsplätze", fmtNum(s.jobs, 0))}${tile("Leerstand", fmtPct(s.vacancy))}
      ${tile("Lebensqualität", `${Math.round(s.quality)} / 100`)}${tile("CO₂-Index", fmtNum(s.co2, 0), "niedriger ist besser")}
    </div>
    ${city.history.length > 1 ? card("Preisentwicklung (Ø Preis pro m²)", lineChart({ series: [{ values: city.history.map((x) => x.price), color: C.purple, area: true }], labels: city.history.map((x, i) => [i, "J" + x.year]).filter((_, i, arr) => arr.length < 14 || i % Math.ceil(arr.length / 12) === 0), h: 200, fmtY: (x) => fmtNum(x, 0) }), { iconName: "simulator" }) : ""}
    ${card("Dein Immobilien-Investment", invHtml + hint("Jedes Gebäude wirkt auf die Nachbarschaft (Radius 2): U-Bahn +12 %, Park +8 %, Schule +6 %, Industrie −10 % – schwächer mit Entfernung. Dazu kommen Nachfrage (Jobs zu Wohnraum) und Zinsen."), { iconName: "portfolio" })}`);
};

function cityClick(i) {
  const v = view.city;
  v.sel = i;
  if (city.cells[i].b !== v.tool) {
    const res = city.place(v.tool, i);
    if (res === "budget") toast("Nicht genug Budget. Spule Zeit vor – Steuereinnahmen füllen das Budget.", "warn");
    else if (res === "ok") console.log(`Gebaut: ${v.tool} auf Feld ${i + 1}`);
  }
  render();
}

function isoView(x, y) {
  const n = CityModel.SIZE, r = view.city.rot;
  if (r === 1) return [n - 1 - y, x];
  if (r === 2) return [n - 1 - x, n - 1 - y];
  if (r === 3) return [y, n - 1 - x];
  return [x, y];
}

function cityShapes() {
  const n = CityModel.SIZE;
  const prices = city.cells.filter((c) => BUILDINGS[c.b].rentable).map((c) => c.price);
  const lo = prices.length ? Math.min(...prices) : CityModel.BASE;
  const hi = prices.length ? Math.max(...prices) : CityModel.BASE + 1;
  const shapes = [];
  for (let i = 0; i < n * n; i++) {
    const x = i % n, y = Math.floor(i / n);
    const [vx, vy] = isoView(x, y);
    const cell = city.cells[i];
    const info = BUILDINGS[cell.b];
    let color = info.color;
    if (view.city.heat && info.rentable) {
      const t = (cell.price - lo) / ((hi - lo) || 1);
      color = `rgb(${Math.round(77 + 178 * t)},${Math.round(89 + 140 * t * t)},255)`;
    }
    const factor = info.rentable ? Math.min(Math.max(cell.price / CityModel.BASE, 0.5), 2.5) : 1;
    const h = info.height * factor * ISO.scale;
    const cx = ISO.ox + (vx - vy) * ISO.tw / 2;
    const cy = ISO.oy + (vx + vy) * ISO.th / 2;
    shapes.push({ i, vx, vy, color, h, cx, cy, b: cell.b });
  }
  shapes.sort((a, b) => (a.vx + a.vy) - (b.vx + b.vy) || a.vx - b.vx);
  return shapes;
}

function shade(color, f) {
  let r, g, b;
  if (color.startsWith("#")) { r = parseInt(color.slice(1, 3), 16); g = parseInt(color.slice(3, 5), 16); b = parseInt(color.slice(5, 7), 16); }
  else [r, g, b] = color.match(/\d+/g).map(Number);
  return `rgb(${Math.min(255, Math.round(r * f))},${Math.min(255, Math.round(g * f))},${Math.min(255, Math.round(b * f))})`;
}

function drawCity() {
  const cv = $("city-canvas");
  if (!cv) return;
  const dpr = window.devicePixelRatio || 1;
  cv.width = ISO.W * dpr;
  cv.height = ISO.H * dpr;
  const g = cv.getContext("2d");
  g.scale(dpr, dpr);
  const sky = g.createLinearGradient(0, 0, 0, ISO.H);
  sky.addColorStop(0, "#0b1030");
  sky.addColorStop(1, "#141a44");
  g.fillStyle = sky;
  g.fillRect(0, 0, ISO.W, ISO.H);
  const { tw, th } = ISO;
  const poly = (pts, fill, stroke, lw = 1) => {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  };
  // Bodenplatte
  const n = CityModel.SIZE;
  const c0 = [ISO.ox, ISO.oy - 6, ISO.ox + n * tw / 2 + 8, ISO.oy + n * th / 2, ISO.ox, ISO.oy + n * th + 6, ISO.ox - n * tw / 2 - 8, ISO.oy + n * th / 2];
  poly(c0, "#10163a", "#262d5c");
  for (const s of cityShapes()) {
    const { cx, cy, h, color } = s;
    const top = [cx, cy - h, cx + tw / 2, cy + th / 2 - h, cx, cy + th - h, cx - tw / 2, cy + th / 2 - h];
    if (h > 1) {
      poly([cx - tw / 2, cy + th / 2 - h, cx, cy + th - h, cx, cy + th, cx - tw / 2, cy + th / 2], shade(color, 0.55), "#0b1030");
      poly([cx + tw / 2, cy + th / 2 - h, cx, cy + th - h, cx, cy + th, cx + tw / 2, cy + th / 2], shade(color, 0.78), "#0b1030");
      // Fenster als feine Linien
      if (h > 14 && s.b !== "Park") {
        g.strokeStyle = "rgba(255,255,255,0.18)";
        g.lineWidth = 1;
        for (let yy = 8; yy < h - 4; yy += 8) {
          g.beginPath(); g.moveTo(cx + 4, cy + th - yy - 1); g.lineTo(cx + tw / 2 - 4, cy + th / 2 - yy + 1); g.stroke();
          g.beginPath(); g.moveTo(cx - 4, cy + th - yy - 1); g.lineTo(cx - tw / 2 + 4, cy + th / 2 - yy + 1); g.stroke();
        }
      }
    }
    poly(top, color, s.b === "Leer" ? "#262d5c" : "#0b1030");
    if (s.b === "Park") {
      for (const [dx, dy] of [[-8, 2], [9, 6]]) {
        g.fillStyle = "#3fa57a";
        g.beginPath(); g.moveTo(cx + dx, cy + th / 2 + dy - 18); g.lineTo(cx + dx + 6, cy + th / 2 + dy); g.lineTo(cx + dx - 6, cy + th / 2 + dy); g.closePath(); g.fill();
      }
    }
    if (s.i === view.city.sel) poly(top, null, "#ffffff", 2);
    if (city.investment && city.investment.cell === s.i) {
      g.fillStyle = C.green;
      g.beginPath(); g.arc(cx, cy - h - 10, 5, 0, Math.PI * 2); g.fill();
    }
  }
  cv.onclick = (ev) => {
    const rect = cv.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * ISO.W / rect.width;
    const py = (ev.clientY - rect.top) * ISO.H / rect.height;
    const shapes = cityShapes().reverse(); // vorne zuerst prüfen
    for (const s of shapes) {
      const { cx, cy, h } = s;
      const hex = [[cx, cy - h], [cx + tw / 2, cy + th / 2 - h], [cx + tw / 2, cy + th / 2], [cx, cy + th], [cx - tw / 2, cy + th / 2], [cx - tw / 2, cy + th / 2 - h]];
      if (pointInPolygon(px, py, hex)) { cityClick(s.i); return; }
    }
  };
}

function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------
// Strategie-Labor
// ---------------------------------------------------------------------
const UNDERLYINGS = { "Gold": ["gold", 10], "Öl (Brent)": ["oil", 100], "Weizen": ["wheat", 50], "Kupfer": ["copper", 5] };

PAGES.strategy = () => {
  const d = view.der;
  if (!view.hedge) view.hedge = { spot: 218, rounds: [], rng: makeRng(Date.now() % 1e9), ratio: 50 };
  if (!view.gt) view.gt = { game: 0, opp: "Wie du mir, so ich dir", mine: [], theirs: [], rng: makeRng(99) };
  const hg = view.hedge, gt = view.gt;
  const game = GAMES[gt.game];

  // Hedging
  const play = () => {
    if (hg.rounds.length >= 6) return;
    const hr = hg.ratio / 100;
    const later = hg.spot * Math.exp(0.28 * Math.sqrt(0.5) * hg.rng.gauss());
    const fut = hg.spot * 1.02;
    hg.rounds.push([hr * 100 * fut + (1 - hr) * 100 * later, 100 * later]);
    hg.spot = later;
    render();
  };
  let hedgeResult = "";
  if (hg.rounds.length) {
    const vals = [], labels = [];
    hg.rounds.forEach(([a, b], k) => { vals.push(a, b); labels.push(`R${k + 1} du`, `R${k + 1} ohne`); });
    const sd = (xs) => { if (xs.length < 2) return 0; const m = xs.reduce((s, x) => s + x, 0) / xs.length; return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
    const sh = sd(hg.rounds.map((r) => r[0])), su = sd(hg.rounds.map((r) => r[1]));
    hedgeResult = bars(vals, labels, { colors: [C.blue, C.gray], h: 200 }) +
      `<p><b>Schwankung deiner Kosten: ${fmtEur(sh)}</b> · ohne Absicherung: ${fmtEur(su)}</p>` +
      (hg.rounds.length >= 6 ? `<p class="lav">${sh < su * 0.6 ? "Sehr gut: Deine Kosten waren deutlich planbarer." : sh < su ? "Etwas stabiler – mehr Absicherung hätte das Risiko weiter gesenkt." : "Du hast kaum abgesichert – das ist Spekulation."}</p>` : "");
  }

  // Spieltheorie
  const eq = nash(game);
  const isEq = (r, c) => eq.some(([a, b]) => a === r && b === c);
  let matrix = `<div class="matrix"><div></div>${[0, 1].map((c) => `<div class="m-head">${game.col}<br><b>${game.actions[c]}</b></div>`).join("")}`;
  for (let r = 0; r < 2; r++) {
    matrix += `<div class="m-head">${game.row}<br><b>${game.actions[r]}</b></div>`;
    for (let c = 0; c < 2; c++) {
      const [a, b] = game.pay[r][c];
      matrix += `<div class="m-cell ${isEq(r, c) ? "nash" : ""}"><b>${a} | ${b}</b>${isEq(r, c) ? "<small>Nash</small>" : ""}</div>`;
    }
  }
  matrix += "</div>";
  const move = (m) => {
    if (gt.mine.length >= 10) return;
    const reply = strategyMove(gt.opp, gt.theirs, gt.mine, gt.rng);
    gt.mine.push(m);
    gt.theirs.push(reply);
    render();
  };
  let gtResult = "";
  if (gt.mine.length) {
    const me = gt.mine.reduce((s, a, k) => s + game.pay[a][gt.theirs[k]][0], 0);
    const them = gt.mine.reduce((s, a, k) => s + game.pay[a][gt.theirs[k]][1], 0);
    const hist = gt.mine.map((a, k) => `<span class="chip ${a === 0 ? "coop" : ""}">${a === 0 ? "●" : "○"}</span><span class="chip ${gt.theirs[k] === 0 ? "coop" : ""}">${gt.theirs[k] === 0 ? "●" : "○"}</span>`).join(`<span class="sep"></span>`);
    gtResult = `<div class="caption">Verlauf (du / Gegner, ● = ${game.actions[0]})</div><div class="history">${hist}</div>
      <p><b>Dein Ergebnis: ${me}</b> · Gegner: ${them} (${gt.mine.length}/10 Runden)</p>
      ${gt.mine.length >= 10 ? `<p class="lav">Gegner-Strategie war: <b>${gt.opp}</b> – ${STRATEGIES[gt.opp]}</p>` : ""}`;
  }

  afterRender.push(updateDerivative, updateTournament);

  return screen("Strategie-Labor", "Futures, Optionen und Spieltheorie – am Beispiel von Rohstoffen.", "SIMULATION", `
    ${card("Derivate-Rechner", `
      <div class="form-grid">
        <label class="field"><span>Basiswert</span><select class="input" data-change="${on((el) => { d.u = el.value; updateDerivative(); })}">${Object.keys(UNDERLYINGS).map((k) => `<option ${k === d.u ? "selected" : ""}>${k}</option>`).join("")}</select></label>
        <label class="field"><span>Instrument</span><select class="input" data-change="${on((el) => { d.k = el.value; updateDerivative(); })}">${DERIVATIVE_KINDS.map((k) => `<option ${k === d.k ? "selected" : ""}>${k}</option>`).join("")}</select></label>
        ${slider("Basispreis (% vom Kurs)", d.strike, 70, 130, 1, (x) => { d.strike = x; updateDerivative(); }, (x) => x + " %")}
        ${slider("Laufzeit", d.m, 1, 24, 1, (x) => { d.m = x; updateDerivative(); }, (x) => x + " Monate")}
      </div>
      <div id="der-chart"></div><p class="lav" id="der-info"></p>
      ${hint("Die Grafik zeigt Gewinn/Verlust bei Fälligkeit je nach Rohstoffpreis (x-Achse). Gekaufte Optionen verlieren maximal die Prämie, verkaufte können unbegrenzt verlieren. Die faire Prämie berechnen wir mit der Black-Scholes-Formel.")}`, { iconName: "strategy" })}
    ${card("Hedging-Spiel: Du bist eine Bäckerei und brauchst in 6 Monaten 100 t Weizen", `
      <p>Weizen heute <b>${fmtEur(hg.spot, 2)}/t</b> · 6-Monats-Future <b>${fmtEur(hg.spot * 1.02, 2)}/t</b> · Runde ${Math.min(hg.rounds.length + 1, 6)} von 6</p>
      ${slider("Absicherungsquote", hg.ratio, 0, 100, 10, (x) => { hg.ratio = x; }, (x) => x + " %")}
      <div class="btn-row">${btn("Runde spielen", play, { disabled: hg.rounds.length >= 6 })}${btn("Neues Spiel", () => { view.hedge = null; render(); }, { secondary: true })}</div>
      ${hedgeResult}`, { iconName: "goals" })}
    ${card("Spieltheorie: Spiel 10 Runden gegen den Computer", `
      ${segmented(GAMES.map((x) => x.title), game.title, (_, i) => { Object.assign(gt, { game: i, mine: [], theirs: [] }); render(); })}
      ${matrix}
      <div class="caption">Zahlen: dein Gewinn | Gewinn des Gegners (in ${game.unit}). Nash = kein Spieler verbessert sich, wenn er allein wechselt.</div>
      <p class="lav">${game.lesson}</p>
      <label class="field"><span>Gegner-Strategie (im Spiel geheim – erkennst du sie?)</span>
        <select class="input" data-change="${on((el) => { Object.assign(gt, { opp: el.value, mine: [], theirs: [] }); render(); })}">${Object.keys(STRATEGIES).map((k) => `<option ${k === gt.opp ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      <div class="btn-row">${btn(game.actions[0], () => move(0), { disabled: gt.mine.length >= 10 })}${btn(game.actions[1], () => move(1), { secondary: true, disabled: gt.mine.length >= 10 })}${btn("Nochmal", () => { gt.mine = []; gt.theirs = []; render(); }, { secondary: true })}</div>
      ${gtResult}`, { iconName: "strategy" })}
    ${card("Turnier: Jeder gegen jeden (wie bei Robert Axelrod, 1980)", `
      ${slider("Runden pro Begegnung", view.tourRounds, 1, 50, 1, (x) => { view.tourRounds = x; updateTournament(); })}
      <div id="tour-chart"></div>
      ${hint("Bei nur einer Runde gewinnt Eigennutz. Je mehr Runden, desto besser schneiden freundliche, aber nicht ausnutzbare Strategien wie „Wie du mir, so ich dir“ ab.", "Was lernt man daraus?")}`, { iconName: "simulator" })}`);
};

function updateDerivative() {
  const el = $("der-chart");
  if (!el) return;
  const d = view.der;
  const [id, size] = UNDERLYINGS[d.u];
  const a = st.assets[id];
  const spot = a.price;
  const isOption = !d.k.includes("Future");
  const strike = isOption ? spot * d.strike / 100 : spot;
  const premium = isOption ? blackScholes(d.k.includes("Call"), spot, strike, d.m / 12, 0.03, a.vol) : 0;
  const prices = [];
  for (let i = 0; i <= 50; i++) prices.push(spot * (0.5 + i / 50));
  const profits = prices.map((p) => derivativeProfit(d.k, p, strike, premium, size));
  el.innerHTML = lineChart({
    series: [{ values: profits, color: C.lavender, width: 3 }],
    labels: [0, 10, 20, 30, 40, 50].map((i) => [i, fmtNum(prices[i], 0)]), h: 240, zero: true, fmtY: (v) => fmtCompact(v) + " €",
  });
  const be = d.k.includes("Call") ? strike + premium : d.k.includes("Put") ? strike - premium : strike;
  const warn = d.k.includes("verkaufen") ? " ⚠ Verkaufte Optionen/Futures können sehr hohe Verluste erzeugen." : "";
  $("der-info").textContent = `Kurs heute ${fmtNum(spot)} € · Basispreis ${fmtNum(strike)} € · faire Prämie (Black-Scholes) ${fmtNum(premium)} € je Einheit · Kontrakt ${size} Einheiten · Break-even ${fmtNum(be)} € · Kontraktwert ${fmtEur(spot * size)}.${warn}`;
}

function updateTournament() {
  const el = $("tour-chart");
  if (!el) return;
  const res = tournament(GAMES[view.gt.game], Math.round(view.tourRounds));
  el.innerHTML = bars(res.map((x) => x[1]), res.map((x) => x[0].length > 16 ? x[0].split(" ")[0] + "…" : x[0]),
    { colors: [C.blue, C.purple, C.sky, C.lavender, C.gray], fmt: (v) => fmtNum(v, 0), h: 210 });
}

// ---------------------------------------------------------------------
// KI-Assistent (regelbasiert, offline)
// ---------------------------------------------------------------------
function assistantAnswer(q) {
  q = q.toLowerCase();
  const has = (...w) => w.some((x) => q.includes(x));
  if (has("zins")) return "Sinkende Zinsen machen Kredite günstiger – das stützt oft Immobilien und Anleihen. Probier den Bauzins im Immobilien-Labor aus.";
  if (has("immobil", "miete", "wohnung")) {
    const share = (st.allocation().find(([n]) => n === "Immobilien") || [0, 0, 0])[2];
    return `Immobilien machen ${fmtPct(share, 0)} deines Depots aus. Chancen: Miete, Inflationsschutz. Risiken: Zinsen, Leerstand.`;
  }
  if (has("krypto", "bitcoin", "ethereum")) return "Krypto schwankt extrem – Rückgänge über 70 % gab es mehrfach. Mach zuerst den Kurs „Code verstehen“.";
  if (has("nachhalt", "esg", "grün", "klima")) return `Dein Depot passt zu ${fmtPct(st.valueScore("Nachhaltigkeit"), 0)} zu Nachhaltigkeit. Windparks 90 %, Green Bonds 85 %, Bitcoin 28 %.`;
  if (has("rohstoff", "gold", "öl", "future", "option")) return "Rohstoffe zahlen keine Zinsen. Mit Futures sichert man Preise ab, mit Optionen begrenzt man das Risiko – siehe Strategie-Labor.";
  if (has("risiko", "verlust", "crash")) return `Dein Profil: ${st.profile.risk}/7. Teste im Simulator den Crash-Test – macht dich das Ergebnis nervös, ist es zu riskant.`;
  if (has("ziel", "spar")) return "Unter „Ziele & Strategie“ siehst du, ob du auf Kurs bist und welche Sparrate nötig wäre.";
  if (has("depot", "portfolio", "markt")) {
    const top = st.allocation()[0];
    return `Dein Depot ist ${fmtEur(st.total())} wert. Größte Position: ${top[0]} (${fmtPct(top[2], 0)}).`;
  }
  return "Das kann ich noch nicht genau beantworten. Frag nach Zinsen, Immobilien, Krypto, Nachhaltigkeit, Rohstoffen, Risiko oder Zielen.";
}

PAGES.assistant = () => {
  if (!view.chat.length) {
    view.chat.push(["bot", `Hallo${st.profile.name ? " " + st.profile.name : ""}! Frag mich z. B. nach Zinsen, Immobilien, Krypto, Nachhaltigkeit, Rohstoffen, Risiko oder deinen Zielen.`]);
  }
  const send = (text) => {
    const q = (text ?? $("chat-in").value).trim();
    if (!q) return;
    view.chat.push(["me", q], ["bot", assistantAnswer(q)]);
    render();
    const log = $("chat-log");
    if (log) log.scrollTop = log.scrollHeight;
    const input = $("chat-in");
    if (input) input.focus();
  };
  afterRender.push(() => { const log = $("chat-log"); if (log) log.scrollTop = log.scrollHeight; });
  const suggestions = ["Was bedeutet die Marktentwicklung für mein Portfolio?", "Chancen und Risiken bei Immobilien?",
    "Kannst du mir eine Zinssenkung erklären?", "Wie nachhaltig ist mein Depot?"];
  return screen("KI-Assistent", "Ich erkläre – ich berate nicht. (Regelbasiert, offline)", null, card(null, `
    <div class="chat" id="chat-log">${view.chat.map(([who, t]) => `<div class="bubble ${who}">${esc(t)}</div>`).join("")}</div>
    <div class="chips">${suggestions.map((s) => `<button class="chip-btn" data-click="${on(() => send(s))}">${s}</button>`).join("")}</div>
    <div class="input-row"><input class="input" id="chat-in" placeholder="Frag etwas …" data-enter="${on(() => send())}">${btn("Senden", () => send())}</div>`));
};

// ---------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------
PAGES.settings = () => {
  const p = st.profile;
  const resetAll = async () => {
    if (await confirmSheet("Alles zurücksetzen", "Profil, Lernfortschritt und Demo-Depot löschen?", "Alles löschen")) {
      st.data = defaultState();
      st.save();
      applySimple();
      navigate("dashboard");
      openOnboarding();
    }
  };
  return screen("Einstellungen", "Profil, Schrift, Hinweise", null, `
    ${card("Bedienung", toggle("Einfacher Modus (größere Schrift, Erklärungen immer sichtbar)", p.simple, (v) => { p.simple = v; st.save(); applySimple(); render(); }), { iconName: "settings" })}
    ${card("Profil", `
      ${row("Name", `<b>${esc(p.name) || "–"}</b>`)}${row("Alter", `<b>${p.age}</b>`)}${row("Risikobereitschaft", `<b>${p.risk} / 7</b>`)}
      ${row("Werte", `<b>${p.values.join(", ") || "–"}</b>`)}
      ${btn("Profil bearbeiten", openOnboarding, { secondary: true, small: true })}`, { iconName: "goals" })}
    ${card("Rechtliches & Transparenz", `
      <p>Diese App dient der Bildung. Sie ist keine Anlageberatung. Alle Daten sind Demodaten.</p>
      <p class="caption">Datenschutz: Alles wird nur lokal auf diesem Computer gespeichert:<br><span class="mono">${esc(savePath)}</span></p>
      ${btn("Alles zurücksetzen", resetAll, { secondary: true, small: true })}`, { iconName: "info" })}`);
};

function applySimple() {
  document.documentElement.classList.toggle("simple", !!st.profile.simple);
}

// ---------------------------------------------------------------------
// Onboarding (beim ersten Start, wie OnboardingView in Swift)
// ---------------------------------------------------------------------
function openOnboarding() {
  const p = st.profile;
  const draft = { name: p.name, age: p.age, risk: p.risk, values: [...p.values], simple: p.simple };
  const riskText = (r) => ["", "sehr vorsichtig", "vorsichtig", "eher vorsichtig", "ausgewogen", "eher mutig", "chancenorientiert", "sehr chancenorientiert"][r];
  const build = () => `
    <div class="onb">
      <div class="brand-icon big">${icon("simulator")}</div>
      <h1>Willkommen bei ${APP_NAME}</h1>
      <p class="subtitle">Mehr als nur Investieren. Verstehe, probiere aus, entscheide.</p>
      <label class="field"><span>Dein Vorname (optional)</span><input class="input" id="onb-name" value="${esc(draft.name)}" placeholder="z. B. Alex"></label>
      <div class="field"><span>Alter</span>${segmented(["unter 25", "25–39", "40–59", "60+"], draft.age, (v) => { draft.age = v; if (v === "60+") draft.simple = true; rebuild(); })}</div>
      ${slider("Risikobereitschaft", draft.risk, 1, 7, 1, (v) => { draft.risk = v; }, (v) => `${v} – ${riskText(v)}`)}
      <div class="field"><span>Was ist dir wichtig?</span><div class="chips">${VALUES.map((v) =>
        `<button class="chip-btn ${draft.values.includes(v) ? "on" : ""}" title="${esc(VALUE_EXPLAIN[v])}" data-click="${on(() => {
          draft.values = draft.values.includes(v) ? draft.values.filter((x) => x !== v) : [...draft.values, v];
          rebuild();
        })}">${draft.values.includes(v) ? "✓ " : ""}${v}</button>`).join("")}</div></div>
      ${toggle("Einfacher Modus (größere Schrift, Erklärungen immer sichtbar)", draft.simple, (v) => { draft.simple = v; })}
      <div class="btn-row center">${btn("Los geht’s →", () => {
        Object.assign(p, draft, { name: $("onb-name").value.trim(), onboarded: true });
        st.save();
        applySimple();
        closeSheet();
        console.log(`Profil gespeichert (Risiko ${p.risk}/7, Werte: ${p.values.join(", ") || "–"})`);
        render();
      }, { cls: "wide" })}</div>
    </div>`;
  const rebuild = () => {
    const nameEl = $("onb-name");
    if (nameEl) draft.name = nameEl.value;
    openSheet(build, { fullscreen: true });
  };
  openSheet(build, { fullscreen: true });
}

// ---------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------
async function start() {
  const saved = await Speicher.laden();
  savePath = await Speicher.pfad();
  st = new AppState(saved, (data) => { Speicher.speichern(data); });
  chain = new MiniChain(3);
  city = new CityModel();
  applySimple();
  render({ top: true });
  if (!st.profile.onboarded) openOnboarding();
  setInterval(liveTick, 3000);
  window.addEventListener("resize", () => { if (view.section === "city") drawCity(); });
  console.log(`InvestMind bereit – ${Object.keys(st.assets).length} Assets, ${COURSES.length} Kurse geladen.`);
}

window.addEventListener("error", (e) => console.error(`${e.message} (${(e.filename || "").split("/").pop()}:${e.lineno})`));
window.addEventListener("unhandledrejection", (e) => console.error("Fehler: " + (e.reason && e.reason.message ? e.reason.message : e.reason)));

start().catch((err) => {
  console.error("Startfehler: " + err.message);
  $("screen").innerHTML = `<section class="card"><h3>Startfehler</h3><p>${esc(err.message)}</p></section>`;
});
