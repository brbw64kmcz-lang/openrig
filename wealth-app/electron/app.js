/* =====================================================================
   DATEI 6 von 7:  app.js
   Die Oberfläche: Seitenleiste, alle Seiten (Übersicht, Depot, Ziele,
   Simulator, Lernen, drei Labore, Assistent, Einstellungen), Dialoge
   und Diagramme. Die Rechenlogik kommt aus engines.js.
   ===================================================================== */
"use strict";

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
// Falls index.html oder styles.css fehlen oder nicht geladen wurden (z. B. falscher
// Dateiname), baut die App Grundgerüst und Design selbst – damit sie immer wie die
// Swift-Vorschau aussieht.
function ensureLayout() {
  if ($("app") && $("screen")) return;
  document.body.innerHTML = `<div id="app"><aside id="sidebar"></aside><main id="detail"><header id="navbar"></header>
    <div id="screen"></div></main><nav id="tabbar"></nav></div><div id="sheet-layer"></div><div id="toast"></div>`;
  console.log("Hinweis: index.html ohne InvestMind-Gerüst – Gerüst wurde automatisch erstellt.");
}
function ensureStyles() {
  const loaded = getComputedStyle(document.documentElement).getPropertyValue("--bg-top").trim();
  if (loaded) return;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(INVESTMIND_CSS);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } catch {
    const el = document.createElement("style");
    el.textContent = INVESTMIND_CSS;
    document.head.appendChild(el);
  }
  console.log("Hinweis: styles.css wurde nicht geladen – das eingebaute Design wird verwendet.");
}

// Manche index.html-Vorlagen (z. B. die Standardvorlage von Electron Fiddle) verbieten
// style="…" im HTML. Dann setzen wir die Farben über JavaScript – das ist erlaubt.
function allowInlineStyles() {
  const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!meta) return;
  const rules = meta.getAttribute("content") || "";
  const directive = (name) => (rules.split(";").map((r) => r.trim()).find((r) => r.startsWith(name + " ")) || "");
  const styleRule = directive("style-src") || directive("default-src");
  if (!styleRule || styleRule.includes("'unsafe-inline'")) return;
  // style="…" wird vor dem Einfügen umbenannt und danach per JavaScript gesetzt (erlaubt)
  const desc = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  Object.defineProperty(Element.prototype, "innerHTML", {
    configurable: true,
    get() { return desc.get.call(this); },
    set(value) {
      desc.set.call(this, String(value).replace(/ style="/g, ' data-inline-style="'));
      const nodes = this.querySelectorAll("[data-inline-style]");
      for (const n of nodes) {
        for (const part of n.getAttribute("data-inline-style").split(";")) {
          const i = part.indexOf(":");
          if (i > 0) n.style.setProperty(part.slice(0, i).trim(), part.slice(i + 1).trim());
        }
        n.removeAttribute("data-inline-style");
      }
    },
  });
  console.log("Hinweis: index.html erlaubt keine Inline-Styles – Farben werden per JavaScript gesetzt.");
}

async function start() {
  ensureLayout();
  ensureStyles();
  allowInlineStyles();
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

// Erst starten, wenn die ganze Datei geladen ist (das Design steht ganz unten)
setTimeout(() => start().catch((err) => {
  console.error("Startfehler: " + err.message);
  const el = $("screen") || document.body;
  el.innerHTML = `<section class="card"><h3>Startfehler</h3><p>${esc(err.message)}</p></section>`;
}), 0);

// =====================================================================
// EINGEBAUTES DESIGN (automatisch aus styles.css erzeugt – nicht von Hand ändern)
// =====================================================================
// INVESTMIND_CSS_START
var INVESTMIND_CSS = ":root {\n  --bg-top: #090e24;\n  --bg-bottom: #121536;\n  --card: #161d42;\n  --card-raised: #1f2654;\n  --card-border: rgba(255, 255, 255, 0.08);\n  --blue: #4d7dff;\n  --purple: #8c5ef5;\n  --lavender: #b8adff;\n  --sky: #73bfff;\n  --gray: #8c96b3;\n  --text: #ffffff;\n  --text2: #a8b3d4;\n  --text3: #7a85a8;\n  --green: #5cdba8;\n  --red: #ff7380;\n  --yellow: #ffc759;\n  --accent: linear-gradient(90deg, var(--blue), var(--purple));\n  --radius: 18px;\n  --sidebar: 290px;\n  color-scheme: dark;\n  font-size: 15px;\n}\nhtml.simple { font-size: 18px; }\n\n* { box-sizing: border-box; }\nhtml, body { margin: 0; height: 100%; }\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", system-ui, Roboto, \"Helvetica Neue\", Arial, sans-serif;\n  color: var(--text);\n  background: linear-gradient(180deg, var(--bg-top), var(--bg-bottom));\n  -webkit-font-smoothing: antialiased;\n  overflow: hidden;\n}\nbutton { font: inherit; color: inherit; }\nh1, h2, h3, p { margin: 0; }\np { line-height: 1.45; margin: 6px 0; }\nb { font-weight: 650; }\n\n/* ---------- Grundaufbau ---------- */\n#app { display: grid; grid-template-columns: var(--sidebar) 1fr; height: 100vh; }\n#sidebar {\n  background: var(--bg-top);\n  border-right: 1px solid var(--card-border);\n  overflow-y: auto;\n  padding: 14px 12px 20px;\n  display: flex; flex-direction: column;\n}\n#detail { overflow-y: auto; position: relative; scroll-behavior: auto; }\n#screen { max-width: 1100px; margin: 0 auto; padding: 4px 22px 40px; }\n#tabbar { display: none; }\n\n/* ---------- Seitenleiste (wie iPadOS) ---------- */\n.brand { display: flex; align-items: center; gap: 10px; padding: 6px 8px 14px; }\n.brand-icon {\n  width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center;\n  background: var(--accent); box-shadow: 0 6px 18px rgba(140, 94, 245, 0.35);\n}\n.brand-icon .ic { width: 24px; height: 24px; color: #fff; }\n.brand-icon.big { width: 72px; height: 72px; border-radius: 20px; margin: 0 auto 14px; }\n.brand-icon.big .ic { width: 40px; height: 40px; }\n.brand-name { font-size: 1.25rem; font-weight: 700; }\n.brand-claim { font-size: 0.72rem; color: var(--text2); }\n.side-group { font-size: 0.8rem; font-weight: 650; color: var(--text3); padding: 14px 10px 4px; }\n.side-item {\n  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;\n  background: none; border: 0; padding: 8px 10px; border-radius: 10px; cursor: pointer;\n}\n.side-item:hover { background: rgba(255, 255, 255, 0.05); }\n.side-item.on { background: var(--blue); }\n.side-icon { width: 28px; height: 28px; display: grid; place-items: center; color: var(--lavender); flex: none; }\n.side-item.on .side-icon { color: #fff; }\n.side-icon .ic { width: 20px; height: 20px; }\n.side-text { display: flex; flex-direction: column; font-size: 0.97rem; }\n.side-text small { font-size: 0.75rem; color: var(--text2); margin-top: 1px; }\n.side-item.on .side-text small { color: rgba(255, 255, 255, 0.85); }\n.side-footer { margin-top: auto; padding: 22px 10px 0; }\n.quote { font-size: 0.75rem; font-style: italic; color: var(--text3); margin-top: 8px; line-height: 1.4; }\n\n/* ---------- Navigationsleiste oben ---------- */\n#navbar {\n  position: sticky; top: 0; z-index: 5; height: 50px;\n  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 14px;\n  background: rgba(9, 14, 36, 0.72); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);\n  border-bottom: 1px solid var(--card-border);\n}\n.nav-title { font-weight: 650; font-size: 1rem; }\n.nav-right { justify-self: end; font-size: 0.8rem; color: var(--text2); }\n.live-dot { color: var(--green); animation: pulse 2s infinite; }\n@keyframes pulse { 50% { opacity: 0.35; } }\n.nav-back, .nav-menu {\n  display: inline-flex; align-items: center; gap: 2px; background: none; border: 0; cursor: pointer;\n  color: var(--sky); font-size: 1rem; padding: 6px 4px;\n}\n.nav-back .ic { width: 20px; height: 20px; }\n.nav-menu { display: none; }\n.nav-menu .ic { width: 22px; height: 22px; }\n\n/* ---------- Bildschirm-Kopf ---------- */\n.screen-head { padding: 18px 0 14px; }\n.title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }\nh1 { font-size: 2.2rem; font-weight: 750; letter-spacing: -0.02em; }\nh2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 10px; }\n.subtitle { color: var(--text2); font-size: 1rem; margin-top: 4px; }\n.badge {\n  font-size: 0.68rem; font-weight: 750; letter-spacing: 0.06em; padding: 4px 10px;\n  border-radius: 999px; border: 1px solid;\n}\n.footnote { color: var(--text3); font-size: 0.75rem; margin-top: 18px; }\n\n/* ---------- Karten ---------- */\n.card {\n  background: var(--card); border: 1px solid var(--card-border); border-radius: var(--radius);\n  padding: 16px; margin-bottom: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);\n  min-width: 0;\n}\n.card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }\n.card-head h3 { font-size: 1.05rem; font-weight: 650; }\n.card-head .ic { width: 18px; height: 18px; flex: none; }\n.trailing { font-size: 0.78rem; color: var(--text2); }\n.spacer { flex: 1; }\n.ic.lav, .lav { color: var(--lavender); }\n\n.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }\n.grid2 > .card { margin-bottom: 0; }\n.grid2 { margin-bottom: 16px; }\n.grid2.wide-left { grid-template-columns: 1.6fr 1fr; }\n.grid2.top { align-items: start; }\n\n.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 16px; }\n.tile {\n  background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 14px 16px;\n}\n#sim-tiles .tiles { margin: 12px 0 0; }\n#sim-tiles .tile { background: var(--card-raised); }\n.tile-label { font-size: 0.8rem; color: var(--text2); }\n.tile-value { font-size: 1.45rem; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }\n.tile-sub { font-size: 0.78rem; color: var(--text3); margin-top: 3px; }\n\n/* ---------- Text & Farben ---------- */\n.caption { font-size: 0.8rem; color: var(--text2); line-height: 1.4; }\n.muted { color: var(--text3); }\n.pos { color: var(--green); }\n.neg { color: var(--red); }\n.warn-text { color: var(--yellow); }\n.mono, .code, .console { font-family: \"SF Mono\", ui-monospace, Menlo, Consolas, \"Liberation Mono\", monospace; }\n.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 5px 0; }\n.row .right { text-align: right; }\n.check { padding: 4px 0; }\n\n/* ---------- Knöpfe ---------- */\n.btn {\n  border: 0; border-radius: 12px; padding: 10px 16px; cursor: pointer; font-weight: 600; font-size: 0.95rem;\n  transition: transform 0.08s ease, filter 0.15s ease;\n}\n.btn:active { transform: scale(0.97); }\n.btn.primary { background: var(--accent); color: #fff; box-shadow: 0 6px 16px rgba(77, 125, 255, 0.28); }\n.btn.secondary { background: var(--card-raised); color: var(--text); border: 1px solid var(--card-border); }\n.btn:hover { filter: brightness(1.1); }\n.btn.small { padding: 7px 12px; font-size: 0.85rem; border-radius: 10px; }\n.btn.round { width: 32px; height: 32px; padding: 0; border-radius: 50%; }\n.btn.wide { min-width: 240px; padding: 14px 24px; font-size: 1.05rem; }\n.btn:disabled { opacity: 0.4; cursor: not-allowed; filter: none; transform: none; }\n.btn-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; }\n.btn-row.end { justify-content: flex-end; }\n.btn-row.center { justify-content: center; }\n\n.segmented {\n  display: inline-flex; flex-wrap: wrap; background: rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 3px; gap: 2px;\n}\n.segmented button {\n  border: 0; background: none; padding: 6px 14px; border-radius: 8px; cursor: pointer; color: var(--text2); font-size: 0.9rem;\n}\n.segmented button.on { background: var(--card-raised); color: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); font-weight: 600; }\n\n/* ---------- Eingaben ---------- */\n.input {\n  background: var(--card-raised); color: var(--text); border: 1px solid var(--card-border); border-radius: 10px;\n  padding: 10px 12px; font: inherit; width: 100%; outline: none;\n}\n.input:focus { border-color: var(--purple); box-shadow: 0 0 0 3px rgba(140, 94, 245, 0.25); }\n.input:disabled { opacity: 0.55; }\nselect.input { cursor: pointer; }\n.input-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }\n.input-row .input { flex: 1; min-width: 140px; width: auto; }\n.unit { color: var(--text2); margin-right: 6px; }\n.field { display: block; margin: 10px 0; }\n.field > span { display: block; font-size: 0.82rem; color: var(--text2); margin-bottom: 6px; }\n.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0 16px; align-items: end; }\n\n.slider { margin: 10px 0 12px; }\n.slider-head { display: flex; justify-content: space-between; font-size: 0.88rem; color: var(--text2); margin-bottom: 4px; }\n.slider-head b { color: var(--text); font-variant-numeric: tabular-nums; }\ninput[type=\"range\"] { width: 100%; accent-color: var(--purple); cursor: pointer; }\n\n.toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; cursor: pointer; }\n.switch {\n  appearance: none; -webkit-appearance: none; width: 50px; height: 30px; border-radius: 999px; flex: none;\n  background: rgba(255, 255, 255, 0.16); position: relative; cursor: pointer; transition: background 0.2s;\n}\n.switch::after {\n  content: \"\"; position: absolute; top: 2px; left: 2px; width: 26px; height: 26px; border-radius: 50%;\n  background: #fff; transition: transform 0.2s; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.35);\n}\n.switch:checked { background: var(--green); }\n.switch:checked::after { transform: translateX(20px); }\n\n/* ---------- Fortschritt ---------- */\n.progress { height: 8px; background: rgba(255, 255, 255, 0.08); border-radius: 999px; overflow: hidden; margin: 6px 0; }\n.progress > div { height: 100%; background: var(--accent); border-radius: 999px; }\n.progress.big { height: 12px; }\n\n/* ---------- Listen (wie List in SwiftUI) ---------- */\n.list { display: flex; flex-direction: column; }\n.list-row {\n  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;\n  background: none; border: 0; border-bottom: 1px solid var(--card-border); padding: 10px 4px; cursor: pointer;\n}\n.list-row:last-child { border-bottom: 0; }\n.list-row:hover { background: rgba(255, 255, 255, 0.03); }\n.list-row .grow { flex: 1; display: flex; flex-direction: column; min-width: 0; }\n.list-row small { color: var(--text3); font-size: 0.78rem; margin-top: 2px; }\n.list-row .num { font-variant-numeric: tabular-nums; min-width: 92px; text-align: right; }\n.list-row .chg { min-width: 96px; font-size: 0.88rem; }\n.chev { color: var(--text3); font-size: 1.3rem; }\n.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex: none; }\n.spark { width: 110px; height: 32px; flex: none; }\n\n/* ---------- Diagramme ---------- */\n.chart { width: 100%; height: auto; display: block; }\n.chart .grid { stroke: rgba(255, 255, 255, 0.07); stroke-width: 1; }\n.chart .zero { stroke: rgba(255, 255, 255, 0.4); stroke-width: 1.2; stroke-dasharray: 4 4; }\n.chart .axis { fill: var(--text3); font-size: 13px; }\n.chart .bar-val { fill: var(--text); font-size: 13px; font-weight: 600; }\n.donut-wrap { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }\n.donut-small { fill: var(--text2); font-size: 11px; }\n.donut-big { fill: var(--text); font-size: 17px; font-weight: 700; }\n.legends { flex: 1; min-width: 180px; }\n.legend { display: grid; grid-template-columns: 12px 1fr auto auto; gap: 8px; align-items: center; padding: 4px 0; font-size: 0.88rem; }\n.legend i { width: 10px; height: 10px; border-radius: 3px; }\n.legend em { font-style: normal; color: var(--text3); font-size: 0.8rem; min-width: 70px; text-align: right; }\n.legend-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px; }\n.legend-line i { width: 14px; height: 4px; border-radius: 2px; display: inline-block; margin-left: 8px; }\n\n/* ---------- Inhalte Übersicht ---------- */\n.goal { margin-bottom: 12px; }\n.news { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--card-border); }\n.news:last-child { border-bottom: 0; }\n.news > i { width: 8px; height: 8px; border-radius: 50%; margin-top: 7px; flex: none; }\n.news p { color: var(--text2); font-size: 0.9rem; margin: 3px 0 0; }\n.cycle { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }\n.cycle-step { background: var(--card-raised); border-radius: 999px; padding: 6px 12px 6px 6px; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }\n.cycle-step span { width: 24px; height: 24px; border-radius: 50%; background: var(--accent); display: grid; place-items: center; font-size: 0.78rem; font-weight: 700; }\n.cycle-arrow { color: var(--text3); }\n\n.banner { display: flex; gap: 10px; padding: 12px 14px; border-radius: 14px; margin-bottom: 16px; font-size: 0.9rem; line-height: 1.45; }\n.banner.warn { background: rgba(255, 199, 89, 0.1); border: 1px solid rgba(255, 199, 89, 0.3); color: #ffe2a8; }\n.lock { background: rgba(255, 199, 89, 0.1); color: var(--yellow); border-radius: 12px; padding: 10px 12px; margin: 10px 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-weight: 600; font-size: 0.9rem; }\n.price-big { font-size: 2rem; font-weight: 750; margin-bottom: 8px; }\n.price-big small { font-size: 1rem; font-weight: 500; }\n.calc {\n  background: rgba(184, 173, 255, 0.08); border-radius: 12px; padding: 12px; margin-top: 12px;\n  white-space: pre-line; color: var(--lavender); font-size: 0.88rem; line-height: 1.6;\n}\n.calc b { color: var(--text); }\n.step { display: flex; gap: 12px; padding: 6px 0; }\n.step > span { width: 26px; height: 26px; border-radius: 50%; background: var(--card-raised); display: grid; place-items: center; font-weight: 700; font-size: 0.8rem; flex: none; }\n.alloc { border-bottom: 1px solid var(--card-border); }\n.alloc .right { display: flex; align-items: center; gap: 6px; }\n.alloc .right b { min-width: 46px; text-align: right; margin-right: 6px; }\n\n/* ---------- Erklärungen (aufklappbar) ---------- */\n.hint { margin-top: 12px; background: rgba(115, 191, 255, 0.07); border-radius: 12px; padding: 10px 12px; }\n.hint summary { cursor: pointer; color: var(--sky); font-size: 0.88rem; font-weight: 600; display: flex; align-items: center; gap: 6px; list-style: none; }\n.hint summary::-webkit-details-marker { display: none; }\n.hint summary .ic { width: 16px; height: 16px; }\n.hint p { color: var(--text2); font-size: 0.88rem; margin: 8px 0 2px; }\n\n/* ---------- Lernen ---------- */\n.lesson-num { width: 30px; height: 30px; border-radius: 50%; background: var(--card-raised); display: grid; place-items: center; font-weight: 700; font-size: 0.85rem; flex: none; }\n.lesson-num.done { background: var(--green); color: #0b1030; }\n.lesson-text { white-space: pre-wrap; font-size: 1.05rem; line-height: 1.6; }\n.option .radio { color: var(--lavender); width: 20px; }\n.option.right-answer { background: rgba(92, 219, 168, 0.12); }\n.option.wrong-answer { background: rgba(255, 199, 89, 0.1); }\n\n/* ---------- Krypto-Labor ---------- */\n.blocks { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin: 10px 0; }\n.block { background: var(--card-raised); border-radius: 14px; padding: 12px; border: 2px solid; }\n.block.ok { border-color: rgba(92, 219, 168, 0.6); }\n.block.bad { border-color: rgba(255, 115, 128, 0.7); }\n.block .input { margin: 8px 0; background: var(--card); }\n.block .mono { font-size: 0.78rem; word-break: break-all; margin-top: 4px; }\n.code {\n  width: 100%; background: #0b0f26; color: var(--lavender); border: 1px solid var(--card-border); border-radius: 12px;\n  padding: 12px; font-size: 0.9rem; line-height: 1.5; resize: vertical; outline: none;\n}\n.code:focus { border-color: var(--purple); }\n.console-label { font-size: 0.75rem; color: var(--text3); margin: 14px 0 4px; text-transform: uppercase; letter-spacing: 0.08em; }\n.console {\n  background: #05081a; border-radius: 12px; padding: 12px; margin: 0; font-size: 0.85rem; line-height: 1.55;\n  white-space: pre-wrap; word-break: break-word; max-height: 340px; overflow: auto; border: 1px solid var(--card-border);\n}\n.c-echo { color: var(--text3); }\n.c-info { color: var(--text); }\n.c-ok { color: var(--green); }\n.c-err { color: var(--red); }\n.hash-out { margin-top: 10px; color: var(--lavender); word-break: break-all; font-size: 0.95rem; }\n\n/* ---------- Immobilien-Labor ---------- */\n.city-canvas { width: 100%; height: auto; border-radius: 14px; display: block; cursor: pointer; }\n.tools { display: flex; flex-direction: column; gap: 3px; }\n.tool {\n  display: flex; align-items: center; gap: 10px; background: none; border: 1px solid transparent; border-radius: 10px;\n  padding: 6px 8px; cursor: pointer; text-align: left;\n}\n.tool:hover { background: rgba(255, 255, 255, 0.04); }\n.tool.on { background: var(--card-raised); border-color: var(--purple); }\n.tool i { width: 16px; height: 16px; border-radius: 4px; flex: none; }\n.tool span { flex: 1; font-size: 0.92rem; }\n.tool small { color: var(--text3); font-size: 0.78rem; }\n.city-grid { display: grid; gap: 3px; margin-top: 8px; max-width: 260px; }\n.cell { aspect-ratio: 1; border: 2px solid transparent; border-radius: 5px; cursor: pointer; color: var(--green); font-size: 0.7rem; padding: 0; }\n.cell.sel { border-color: #fff; }\n\n/* ---------- Strategie-Labor ---------- */\n.matrix { display: grid; grid-template-columns: auto 1fr 1fr; gap: 8px; margin: 14px 0; max-width: 560px; }\n.m-head { font-size: 0.82rem; color: var(--text2); display: flex; flex-direction: column; justify-content: center; padding: 4px 8px; }\n.m-head b { color: var(--text); }\n.m-cell { background: var(--card-raised); border-radius: 12px; padding: 16px; text-align: center; font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; }\n.m-cell.nash { background: var(--purple); box-shadow: 0 6px 18px rgba(140, 94, 245, 0.35); }\n.m-cell small { font-size: 0.72rem; margin-top: 2px; }\n.history { display: flex; flex-wrap: wrap; gap: 3px; margin: 6px 0; align-items: center; }\n.chip { width: 22px; height: 22px; border-radius: 6px; background: var(--card-raised); display: grid; place-items: center; font-size: 0.75rem; }\n.chip.coop { color: var(--green); }\n.sep { width: 8px; }\n\n/* ---------- Assistent ---------- */\n.chat { height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 4px; margin-bottom: 12px; }\n.bubble { max-width: 75%; padding: 10px 14px; border-radius: 18px; line-height: 1.45; font-size: 0.95rem; }\n.bubble.bot { background: var(--card-raised); align-self: flex-start; border-bottom-left-radius: 6px; }\n.bubble.me { background: var(--blue); align-self: flex-end; border-bottom-right-radius: 6px; }\n.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }\n.chip-btn {\n  background: var(--card-raised); border: 1px solid var(--card-border); border-radius: 999px; padding: 7px 12px;\n  cursor: pointer; font-size: 0.85rem; color: var(--text2);\n}\n.chip-btn:hover { color: var(--text); }\n.chip-btn.on { background: rgba(140, 94, 245, 0.25); border-color: var(--purple); color: #fff; }\n\n/* ---------- Dialoge (Sheets) ---------- */\n.sheet-backdrop {\n  position: fixed; inset: 0; z-index: 50; background: rgba(3, 5, 18, 0.6); backdrop-filter: blur(6px);\n  display: grid; place-items: center; padding: 20px; animation: fade 0.18s ease;\n}\n.sheet {\n  background: var(--card); border: 1px solid var(--card-border); border-radius: 22px; padding: 22px;\n  width: min(520px, 100%); max-height: calc(100vh - 40px); overflow-y: auto;\n  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5); animation: rise 0.22s ease;\n}\n.sheet-text { color: var(--text2); margin-bottom: 8px; }\n.sheet-backdrop.fullscreen { background: linear-gradient(180deg, var(--bg-top), var(--bg-bottom)); backdrop-filter: none; }\n.sheet-backdrop.fullscreen .sheet { background: transparent; border: 0; box-shadow: none; width: min(620px, 100%); }\n.onb { text-align: left; }\n.onb h1 { text-align: center; font-size: 2rem; }\n.onb > .subtitle { text-align: center; margin-bottom: 18px; }\n@keyframes fade { from { opacity: 0; } }\n@keyframes rise { from { transform: translateY(24px); opacity: 0; } }\n\n#toast {\n  position: fixed; left: 50%; bottom: 28px; transform: translate(-50%, 30px); opacity: 0; z-index: 60;\n  background: var(--card-raised); border: 1px solid var(--card-border); border-radius: 999px; padding: 10px 18px;\n  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); transition: all 0.25s ease; pointer-events: none; font-weight: 600; max-width: 90vw;\n}\n#toast.show { opacity: 1; transform: translate(-50%, 0); }\n#toast.ok { border-color: rgba(92, 219, 168, 0.5); }\n#toast.warn { border-color: rgba(255, 199, 89, 0.6); color: #ffe2a8; }\n\n/* ---------- Scrollbalken ---------- */\n::-webkit-scrollbar { width: 10px; height: 10px; }\n::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }\n::-webkit-scrollbar-track { background: transparent; }\n\n/* ---------- Mittlere Breite ---------- */\n@media (max-width: 1050px) {\n  .grid2, .grid2.wide-left { grid-template-columns: 1fr; }\n}\n\n/* ---------- Schmales Fenster: wie iPhone (Reiterleiste unten) ---------- */\n@media (max-width: 760px) {\n  #app { grid-template-columns: 1fr; grid-template-rows: 1fr auto; }\n  #sidebar {\n    position: fixed; inset: 0; z-index: 20; width: 100%; transform: translateX(-100%); padding-bottom: 84px;\n    transition: transform 0.25s ease; border-right: 0;\n  }\n  body.menu-open #sidebar { transform: none; }\n  #screen { padding: 4px 16px 30px; }\n  h1 { font-size: 1.8rem; }\n  .nav-menu { display: inline-flex; }\n  #tabbar {\n    display: grid; grid-template-columns: repeat(5, 1fr); z-index: 25;\n    background: rgba(9, 14, 36, 0.92); backdrop-filter: blur(18px); border-top: 1px solid var(--card-border);\n    padding: 6px 4px 8px;\n  }\n  #tabbar button { background: none; border: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 0.68rem; color: var(--text3); cursor: pointer; }\n  #tabbar button .ic { width: 24px; height: 24px; }\n  #tabbar button.on { color: var(--sky); }\n  .list-row .spark, .list-row .chg { display: none; }\n  .tiles { grid-template-columns: 1fr 1fr; }\n  .tile-value { font-size: 1.15rem; }\n}\n";
// INVESTMIND_CSS_END
