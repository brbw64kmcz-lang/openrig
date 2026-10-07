/* =====================================================================
   ELECTRON FIDDLE – FENSTER 1 von 5:  main.js
   Hauptprozess: öffnet das App-Fenster, speichert Daten, schreibt Meldungen in die Fiddle-Konsole.
   Alles in diesem Fenster löschen und diesen Code komplett einfügen.
   ===================================================================== */
"use strict";

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const DATA_FILE = () => path.join(app.getPath("userData"), "investmind-daten.json");

function log(text) {
  const time = new Date().toLocaleTimeString("de-DE");
  console.log(`[${time}] ${text}`);
}

// ---------------------------------------------------------------------
// Speichern und Laden (wird von preload.js aufgerufen)
// ---------------------------------------------------------------------
ipcMain.handle("daten:laden", () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE(), "utf8"));
  } catch {
    return null; // erster Start: noch keine Daten
  }
});

ipcMain.handle("daten:speichern", (_event, data) => {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE()), { recursive: true });
    fs.writeFileSync(DATA_FILE(), JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    log("Fehler beim Speichern: " + err.message);
    return false;
  }
});

ipcMain.handle("daten:pfad", () => DATA_FILE());

// ---------------------------------------------------------------------
// Das App-Fenster (Größe wie die iPad-Vorschau in Swift Playgrounds)
// ---------------------------------------------------------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1194,
    height: 834,
    minWidth: 390,
    minHeight: 640,
    title: "InvestMind",
    backgroundColor: "#090e24",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));

  win.once("ready-to-show", () => {
    win.show();
    log("App-Fenster ist offen (1194 × 834, wie die iPad-Vorschau).");
    log("Daten werden gespeichert in: " + DATA_FILE());
  });

  // Meldungen aus der App (console.log in app.js) hier im Terminal anzeigen
  win.webContents.on("console-message", (event, levelOld, messageOld, lineOld, sourceOld) => {
    const message = event.message ?? messageOld;
    const level = event.level ?? levelOld;
    const line = event.lineNumber ?? lineOld;
    const source = path.basename(String(event.sourceId ?? sourceOld ?? ""));
    const isError = level === "error" || level === 3;
    const isWarning = level === "warning" || level === 2;
    const prefix = isError ? "FEHLER" : isWarning ? "Warnung" : "App";
    const where = isError && source ? ` (${source}, Zeile ${line})` : "";
    log(`${prefix}: ${message}${where}`);
  });

  win.webContents.on("render-process-gone", (_e, details) => {
    log("Die Oberfläche wurde beendet: " + details.reason);
  });

  // Externe Links im normalen Browser öffnen, nicht in der App
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  console.log("");
  console.log("  ◆ InvestMind  –  Lernen · Simulieren · Investieren");
  console.log("  ───────────────────────────────────────────────");
  console.log(`  Electron ${process.versions.electron} · Chromium ${process.versions.chrome} · Node ${process.versions.node}`);
  console.log("  Alle Kurse und Kennzahlen sind Demodaten. Keine Anlageberatung.");
  console.log("  Beenden: Fenster schließen oder hier Strg + C drücken.");
  console.log("");
  log("Starte App …");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  log("Fenster geschlossen – App wird beendet.");
  if (process.platform !== "darwin") app.quit();
});
