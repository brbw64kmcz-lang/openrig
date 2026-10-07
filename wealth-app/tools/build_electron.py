"""Baut aus wealth-app/electron die eingebettete CSS in app.js und die Fiddle-Variante.

Aufruf:  python3 wealth-app/tools/build_electron.py
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "electron")
DST = os.path.join(ROOT, "electron-fiddle")


def read(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return f.read()


def write(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def strip_header(code):
    return re.sub(r"^/\*\s*=+.*?=+\s*\*/\s*\n", "", code, count=1, flags=re.S)


def hdr(n, name, what):
    return ("/* =====================================================================\n"
            f"   ELECTRON FIDDLE – FENSTER {n} von 5:  {name}\n   {what}\n"
            "   Alles in diesem Fenster löschen und diesen Code komplett einfügen.\n"
            "   ===================================================================== */\n")


css_body = strip_header(read("styles.css"))
css_js = "var INVESTMIND_CSS = " + json.dumps(css_body, ensure_ascii=False) + ";"

# 1) eingebettete CSS in app.js aktualisieren
app = read("app.js")
app = re.sub(r"(// INVESTMIND_CSS_START\n).*?(\n// INVESTMIND_CSS_END)", lambda m: m.group(1) + css_js + m.group(2), app, flags=re.S)
write(os.path.join(SRC, "app.js"), app)

# 2) Fiddle-Variante (5 Fenster)
os.makedirs(DST, exist_ok=True)
write(os.path.join(DST, "main.js"), hdr(1, "main.js", "Hauptprozess: öffnet das App-Fenster, speichert Daten, schreibt Meldungen in die Fiddle-Konsole.") + strip_header(read("main.js")))
write(os.path.join(DST, "preload.js"), hdr(2, "preload.js", "Sichere Brücke zwischen Fenster und Hauptprozess (Laden und Speichern).") + strip_header(read("preload.js")))
html = read("index.html")
html = re.sub(r"<!-- =+.*?=+ -->\n", "<!-- =====================================================================\n     ELECTRON FIDDLE – FENSTER 3 von 5:  index.html\n     Grundgerüst des Fensters. Alles in diesem Fenster löschen und diesen\n     Code komplett einfügen.\n     ===================================================================== -->\n", html, count=1, flags=re.S)
html = re.sub(r"  <!-- Reihenfolge.*?<script src=\"app.js\"></script>", "  <!-- Logik, Oberfläche und Design stehen zusammen in renderer.js -->\n  <script src=\"./renderer.js\"></script>", html, flags=re.S)
html = html.replace('href="styles.css"', 'href="./styles.css"')
assert "./renderer.js" in html
write(os.path.join(DST, "index.html"), html)
eng = strip_header(read("engines.js")).replace('"use strict";\n', "", 1)
app_body = strip_header(app).replace('"use strict";\n', "", 1)
renderer = (hdr(4, "renderer.js", "Teil A: Daten und Berechnungen. Teil B: Oberfläche. Am Ende: eingebautes Design.")
            + '"use strict";\n\n// #####################################################################\n// TEIL A – Daten und Rechenkerne\n// #####################################################################\n'
            + eng + "\n\n// #####################################################################\n// TEIL B – Oberfläche\n// #####################################################################\n" + app_body)
write(os.path.join(DST, "renderer.js"), renderer)
write(os.path.join(DST, "styles.css"), hdr(5, "styles.css", "Aussehen wie die Swift-Playgrounds-Vorschau (ist zur Sicherheit auch in renderer.js eingebaut).") + css_body)
print("ok:", len(css_body), "Zeichen CSS eingebettet")
