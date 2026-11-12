#!/usr/bin/env node
/**
 * build-test.js — Sparkline Table by TCViz
 *
 * Empaqueta una build de PRUEBA y restaura los fuentes al salir, pase lo que pase:
 *   node build-test.js          -> _test     (Pro forzado cuando exista licencia)
 *   node build-test.js --free   -> _testfree (licencia real)
 *   node build-test.js --capturas -> _test con Pro y SIN sello, solo para capturas de la tienda y la web
 *   --verbose (con cualquiera de los anteriores) -> lista las funciones opcionales que pbiviz echa en falta
 * Con el guid real, Power BI Desktop serviría la versión instalada desde AppSource y no la tuya.
 * Reglas del skill pbiviz-appsource: parchea -> empaqueta -> RESTAURA.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const free = process.argv.includes("--free");
const capturas = process.argv.includes("--capturas");
const PBIVIZ = path.join(__dirname, "pbiviz.json");
const VISUAL = path.join(__dirname, "src", "visual.ts");
const origP = fs.readFileSync(PBIVIZ, "utf8");
const origV = fs.readFileSync(VISUAL, "utf8");

let restored = false;
const restore = () => {
    if (restored) return;
    fs.writeFileSync(PBIVIZ, origP, "utf8");
    fs.writeFileSync(VISUAL, origV, "utf8");
    restored = true;
    console.log("  fuentes restaurados al estado de producción");
};
process.on("exit", restore);
process.on("SIGINT", () => { restore(); process.exit(1); });

const json = JSON.parse(origP);
if (json.visual.guid.endsWith("_test") || json.visual.guid.endsWith("_testfree")) {
    console.error("ERROR: el guid ya lleva sufijo de prueba: restaura pbiviz.json antes de seguir.");
    process.exit(1);
}
const suffix = free ? "_testfree" : "_test";
// Power BI Desktop guarda cada visual por guid + versión: con la misma versión sigue sirviendo el paquete
// anterior aunque importes uno nuevo. Cada build de prueba lleva su propio último dígito (contador local).
const CONTADOR = path.join(__dirname, ".tmp", "test-build-counter");
fs.mkdirSync(path.dirname(CONTADOR), { recursive: true });
const n = (parseInt(fs.existsSync(CONTADOR) ? fs.readFileSync(CONTADOR, "utf8") : "0", 10) || 0) + 1;
fs.writeFileSync(CONTADOR, String(n), "utf8");
const partes = json.visual.version.split(".");
partes[3] = String(Number(partes[3]) + n);
json.visual.version = partes.join(".");
json.visual.guid += suffix;
json.visual.displayName += free ? " (test free)" : " (test)";
fs.writeFileSync(PBIVIZ, JSON.stringify(json, null, 2) + "\n", "utf8");

let vsrc = origV;
// Marca de compilación: para saber qué build está ejecutando Desktop.
const STAMP = 'const TEST_STAMP = ""; // TEST_STAMP_MARKER';
if (vsrc.indexOf(STAMP) === -1) { console.error("ERROR: no encuentro TEST_STAMP_MARKER en visual.ts: actualiza build-test.js."); process.exit(1); }
const d = new Date();
const pad = x => String(x).padStart(2, "0");
const stamp = (free ? "testfree " : "test ") + d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
    " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + " v" + json.visual.version;
// --capturas: Desktop siempre está en edición; para las capturas de la tienda se pinta como lo ve el lector
// (sin avisos de edición). Solo en este paquete; el fuente no cambia.
if (capturas) {
    const ED = 'this.editing = typeof vm === "number" && vm !== 0; // EDITING_MARKER';
    if (vsrc.indexOf(ED) === -1) { console.error("ERROR: no encuentro EDITING_MARKER en visual.ts: actualiza build-test.js."); process.exit(1); }
    vsrc = vsrc.replace(ED, "this.editing = false; // PATCHED BY build-test.js --capturas");
}
if (!capturas) vsrc = vsrc.replace(STAMP, 'const TEST_STAMP = "' + stamp + '"; // PATCHED BY build-test.js');

// Licencia: _test fuerza Pro (ISPRO_MARKER); _testfree deja que el licenseManager resuelva (sin plan para el GUID de
// test, sale Free de verdad: vista previa con marca editando, Report theme y gráfico gratis en lectura).
const FIND = "    private isPro = false; // ISPRO_MARKER";
if (vsrc.indexOf(FIND) === -1) { console.error("ERROR: no encuentro la línea ISPRO_MARKER en visual.ts: actualiza build-test.js."); process.exit(1); }
if (!free) vsrc = vsrc.replace(FIND, "    private isPro = true; // ISPRO_MARKER PATCHED BY build-test.js");
fs.writeFileSync(VISUAL, vsrc, "utf8");

console.log("Build TEST — " + json.visual.displayName + "  guid " + json.visual.guid + "  v" + json.visual.version + "  [" + stamp + "]");
try {
    execSync("npx pbiviz package" + (process.argv.includes("--verbose") ? " --verbose" : ""), { stdio: "inherit", cwd: __dirname });
    console.log("  Test build: dist/" + json.visual.guid + "." + json.visual.version + ".pbiviz");
} catch (e) {
    console.error("ERROR: la build ha fallado.");
    process.exitCode = 1;
} finally {
    restore();
}
