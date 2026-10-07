/* =====================================================================
   DATEI 3 von 7:  preload.js
   Die sichere "Brücke" zwischen Fenster (app.js) und Hauptprozess
   (main.js). Das Fenster darf nur diese drei Dinge tun: Daten laden,
   Daten speichern und den Speicherort abfragen.
   ===================================================================== */
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("investmindSpeicher", {
  laden: () => ipcRenderer.invoke("daten:laden"),
  speichern: (daten) => ipcRenderer.invoke("daten:speichern", daten),
  pfad: () => ipcRenderer.invoke("daten:pfad"),
});
