/* Pieza D — Actualización fluida: LA PRUEBA CLAVE (audit, no forma
   parte de verify.cjs).
   1) Sirve dist/ como «build A» en un puerto local y abre la app
      hasta que el SW la controla (APP_VERSION = la del paquete).
   2) Genera «build B» copiando dist/ y cambiando SOLO la marca
      visible (window.APP_VERSION en js/config.js) + el nombre de
      caché en sw.js/version.json, y pasa a servir B en el MISMO
      origen/puerto.
   3) Pide la comprobación (RealScanPwaUpdate.checkNow, la misma vía
      que visibilitychange/intervalo) y afirma que aparece el aviso
      persistente «Nueva versión lista».
   4) Pulsa «Actualizar» y afirma que la app acaba mostrando la
      marca de B SIN borrar cachés ni storage a mano (un centinela
      en localStorage sobrevive a la actualización).
   Evidencia en audit/pwa-update/. */
const fs = require("fs"),
  path = require("path"),
  http = require("http"),
  assert = require("assert"),
  { chromium } = require("playwright");
const pkgVersion = "v" + require("../package.json").version;
const MARK_B = "v9.9.9-B";
const CACHE_B = "realscan-bbbbbbbbbbbbbbbb";
const distA = path.resolve("dist");
const out = path.resolve("audit/pwa-update");
const distB = path.join(out, "dist-b");
fs.mkdirSync(out, { recursive: true });

// --- Generar build B (solo marca + nombre de caché) ---
fs.rmSync(distB, { recursive: true, force: true });
fs.cpSync(distA, distB, { recursive: true });
const cfgB = path.join(distB, "js/config.js");
fs.writeFileSync(cfgB, fs.readFileSync(cfgB, "utf8").replace(pkgVersion, MARK_B));
const swB = path.join(distB, "sw.js");
const swSrc = fs.readFileSync(swB, "utf8");
assert(/realscan-[a-f0-9]{16}/.test(swSrc), "sw A sin nombre de caché válido");
fs.writeFileSync(swB, swSrc.replace(/realscan-[a-f0-9]{16}/, CACHE_B));
const vj = JSON.parse(fs.readFileSync(path.join(distB, "version.json"), "utf8"));
vj.version = CACHE_B;
fs.writeFileSync(path.join(distB, "version.json"), JSON.stringify(vj));

let serving = distA;
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  const file = path.resolve(serving, "." + (u.pathname === "/" ? "/index.html" : u.pathname));
  if (!file.startsWith(serving + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (e, b) => {
    if (e) return res.writeHead(404).end();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", { ".js": "application/javascript", ".mjs": "application/javascript", ".html": "text/html", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".png": "image/png" }[path.extname(file)] || "application/octet-stream");
    res.end(b);
  });
});
(async () => {
  await new Promise((r) => server.listen(5562, "127.0.0.1", r));
  const browser = await chromium.launch({ headless: true, ...(process.env.REALSCAN_CHROMIUM ? { executablePath: process.env.REALSCAN_CHROMIUM } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const notes = [];
    await page.goto("http://127.0.0.1:5562/", { waitUntil: "load" });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 45000 });
    await page.waitForFunction((v) => window.APP_VERSION === v, pkgVersion, { timeout: 45000 });
    notes.push("A controlado, APP_VERSION=" + pkgVersion);
    assert.equal(await page.evaluate(() => document.querySelector("#pwaUpdateBanner:not([hidden])")), null, "sin aviso en A");
    await page.evaluate(() => localStorage.setItem("realscan_audit_sentinel", "keep-me"));
    await page.screenshot({ path: path.join(out, "01-build-A.png") });

    serving = distB;
    notes.push("servidor ahora sirve build B en el mismo origen");
    await page.evaluate(async () => { await window.RealScanPwaUpdate.checkNow(); });
    const banner = page.locator("#pwaUpdateBanner");
    await banner.waitFor({ state: "visible", timeout: 45000 });
    assert.match(await banner.innerText(), /Nueva versión lista/);
    assert.equal(await page.evaluate(() => window.RealScanPwaUpdate.isUpdateReady()), true);
    notes.push("aviso «Nueva versión lista» visible sin recargar a mano");
    await page.screenshot({ path: path.join(out, "02-aviso-nueva-version.png") });

    await page.locator("#btnPwaUpdateNow").click();
    await page.waitForFunction((v) => window.APP_VERSION === v, MARK_B, { timeout: 45000 });
    notes.push("tras «Actualizar», APP_VERSION=" + MARK_B);
    assert.equal(await page.evaluate(() => localStorage.getItem("realscan_audit_sentinel")), "keep-me", "storage intacto");
    const keys = await page.evaluate(() => caches.keys());
    assert.ok(keys.includes(CACHE_B), "caché de B activa: " + keys.join(","));
    assert.ok(!keys.some((k) => k.startsWith("realscan-") && k !== CACHE_B), "caché de A retirada: " + keys.join(","));
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => !!document.querySelector("#pwaUpdateBanner:not([hidden])")), false, "sin aviso tras actualizar");
    await page.screenshot({ path: path.join(out, "03-build-B.png") });

    const result = { buildA: pkgVersion, buildB: MARK_B, cacheB: CACHE_B, cachesAfter: keys, notes };
    fs.writeFileSync(path.join(out, "results.json"), JSON.stringify(result, null, 2));
    console.log("PASS pwa-update", JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
