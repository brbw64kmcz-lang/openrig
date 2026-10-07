/* =====================================================================
   ELECTRON FIDDLE – FENSTER 2 von 5:  preload.js
   Sichere Brücke zwischen Fenster und Hauptprozess (Laden und Speichern).
   Alles in diesem Fenster löschen und diesen Code komplett einfügen.
   ===================================================================== */
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("investmindSpeicher", {
  laden: () => ipcRenderer.invoke("daten:laden"),
  speichern: (daten) => ipcRenderer.invoke("daten:speichern", daten),
  pfad: () => ipcRenderer.invoke("daten:pfad"),
});
