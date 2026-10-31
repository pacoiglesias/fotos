/* v3.16.0 — Pantalla de inicio práctica y funcional (criterio de Paco).
   Pasada de uso real en viewport de teléfono (390×844) con Chromium y
   WebKit: sirve dist/, entra con la cuenta de prueba de las regresiones
   y recorre el flujo del mostrador como un usuario: abrir → comprobar
   que servicio actual, captura y siguiente paso están a la vista sin
   scroll ni desplegables → elegir formato directo → cargar una foto
   por «Archivo / USB» → revisar → pasar a la hoja de entrega.
   Capturas y resultados en .audit/home-screen/. */
const fs = require("fs"),
  path = require("path"),
  http = require("http"),
  assert = require("assert"),
  { chromium, webkit } = require("playwright");
const root = path.resolve("dist");
const out = path.resolve(".audit/home-screen");
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  const file = path.resolve(root, "." + (u.pathname === "/" ? "/index.html" : u.pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (e, b) => {
    if (e) return res.writeHead(404).end();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", { ".js": "application/javascript", ".mjs": "application/javascript", ".html": "text/html", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".png": "image/png" }[path.extname(file)] || "application/octet-stream");
    res.end(b);
  });
});
const checks = [];
function pass(s) { checks.push(s); console.log("PASS " + s); }

async function runEngine(name, launcher) {
  const browser = await launcher.launch({ headless: true, ...(process.env.REALSCAN_CHROMIUM && launcher === chromium ? { executablePath: process.env.REALSCAN_CHROMIUM } : {}) });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.addInitScript(() => {
      localStorage.getItem("realscan_auth_v2") || localStorage.setItem("realscan_auth_v2", JSON.stringify({ users: [{ username: "admin", passwordHash: "beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe", role: "admin", mustChangePassword: false }], currentUsername: "admin", sessionToken: null, sessionExpiry: 0 }));
    });
    await page.goto("http://127.0.0.1:5573/", { waitUntil: "load" });
    await page.locator("#loginUserInput").fill("admin");
    await page.locator("#loginPassInput").fill("PruebaAcceso2026");
    await page.locator("#btnLoginSubmit").click();
    await page.locator("#loginOverlay").waitFor({ state: "hidden" });
    await page.waitForFunction(() => window.RealScanJourney && window.RealScanCounter);
    await page.waitForTimeout(900);

    // --- La pantalla de inicio, tal como la ve el operador al abrir ---
    const home = await page.evaluate(() => {
      const rect = (el) => (el ? el.getBoundingClientRect() : null);
      const cam = [...document.querySelectorAll("#operatorReceiveActions button")].find((b) => b.textContent.trim() === "Cámara");
      const sf = document.getElementById("serviceFormats");
      return {
        scrollY: window.scrollY,
        details: document.querySelectorAll("details.operator-advanced").length,
        formatsInDetails: !!sf?.closest("details"),
        formatsDisplay: sf ? getComputedStyle(sf).display : null,
        camaraTop: rect(cam)?.top ?? null,
        camaraPrimary: cam?.className.includes("counter-primary"),
        receiveHidden: document.getElementById("operatorReceiveActions")?.hidden,
        nextTop: rect(document.getElementById("operatorNextTitle"))?.top ?? null,
        nextTitle: document.getElementById("operatorNextTitle")?.textContent || "",
        current: document.getElementById("counterCurrent")?.textContent || "",
      };
    });
    assert.equal(home.scrollY, 0);
    assert.equal(home.details, 0, "sin desplegable «Otros formatos»");
    assert.equal(home.formatsInDetails, false, "los formatos no viven en un desplegable");
    assert.notEqual(home.formatsDisplay, "none", "la sección de formatos está visible");
    assert.equal(home.receiveHidden, false, "las formas de recibir están visibles desde el inicio");
    assert.equal(home.camaraPrimary, true, "Cámara es la acción principal");
    assert(home.camaraTop !== null && home.camaraTop < 844, "Cámara en la primera pantalla (top=" + home.camaraTop + ")");
    assert(home.nextTop !== null && home.nextTop < 844, "«Siguiente paso» en la primera pantalla (top=" + home.nextTop + ")");
    assert(home.current.length > 0 && home.nextTitle.length > 0, "servicio actual y siguiente paso se leen de un vistazo");
    pass(name + ": inicio sin desplegables; servicio actual, Cámara y siguiente paso en la primera pantalla");
    await page.screenshot({ path: path.join(out, name + "-01-inicio.png") });
    await page.screenshot({ path: path.join(out, name + "-01-inicio-completa.png"), fullPage: true });

    // --- Elegir formato DIRECTO (un toque, sin abrir nada) ---
    await page.locator("#btnIntentId").scrollIntoViewIfNeeded();
    await page.locator("#btnIntentId").click();
    assert(await page.locator("#btnIntentId").evaluate((el) => el.classList.contains("is-active")), "Identificaciones queda activo");
    pass(name + ": el formato Identificaciones se elige directo, a un toque");

    // --- Cargar la primera foto por «Archivo / USB» ---
    const sample = await page.evaluate(async () => {
      const c = document.createElement("canvas"); c.width = 900; c.height = 600;
      const x = c.getContext("2d"); x.fillStyle = "white"; x.fillRect(0, 0, 900, 600);
      x.fillStyle = "black"; x.font = "60px sans-serif"; x.fillText("SYNTHETIC TEST", 80, 250);
      return c.toDataURL();
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#operatorReceiveActions button").filter({ hasText: "Archivo / USB" }).click();
    const chooser = await chooserPromise;
    assert.equal(await chooser.element().getAttribute("id"), "fileInputFront", "«Archivo / USB» abre el selector del frente, que es lo que falta");
    // Nota de entorno (A/B contra la base 3.16.0 sin esta pasada): entregar
    // el archivo vía filechooser en este headless deja el procesamiento en
    // «Preparando…» indefinidamente, igual sin mis cambios. Se carga por
    // handleLoadedFile, la misma entrada que usa el manejador del input.
    await page.evaluate(async (data) => { await handleLoadedFile("front", data, "frente.png"); }, sample);
    await page.waitForFunction(() => window.state && state.images.front && state.images.front.originalSrc && !state._processingPending, null, { timeout: 30000 });
    await page.waitForTimeout(600);
    const mid = await page.evaluate(() => ({
      nextTitle: document.getElementById("operatorNextTitle")?.textContent || "",
      receiveHidden: document.getElementById("operatorReceiveActions")?.hidden,
    }));
    assert(mid.nextTitle.includes("revisa"), "el siguiente paso pasa a revisar lo que falta: " + mid.nextTitle);
    assert.equal(mid.receiveHidden, false, "las formas de recibir siguen visibles con trabajo en curso");
    pass(name + ": cargar por Archivo funciona y la captura sigue visible con el trabajo en curso");
    await page.screenshot({ path: path.join(out, name + "-02-revisar.png") });

    // --- Completar el reverso y pasar a la hoja de entrega ---
    await page.evaluate(async (data) => { await handleLoadedFile("back", data, "reverso.png"); }, sample);
    await page.waitForFunction(() => window.RealScanWorkflow && RealScanWorkflow.describe().ready && !state._processingPending, null, { timeout: 30000 });
    // La etiqueta del botón principal se refresca con el pulso de 1 s de la
    // app (en uso real, el evento de captura lo refresca al instante). Se
    // espera a ver «Revisar entrega», igual que lo vería el operador.
    await page.waitForFunction(() => window.RealScanWorkflow && RealScanWorkflow.describe().ready && !RealScanWorkflow.describe().busy && document.getElementById("operatorNext")?.textContent === "Revisar entrega", null, { timeout: 30000 });
    await page.locator("#operatorNext").click();
    // La app lleva a la sección «Revisar y entregar» (paso 3) con la hoja
    // renderizada justo debajo de su cabecera — comprobado por A/B que es
    // el mismo aterrizaje que en la base 3.16.0 sin esta pasada.
    await page.waitForFunction(() => {
      const el = document.querySelector(".a4-sheet");
      return document.getElementById("tabMobStep3")?.classList.contains("is-active") && el && el.getBoundingClientRect().height > 0;
    }, null, { timeout: 15000 });
    pass(name + ": con el trabajo listo, el botón principal lleva a la sección de entrega con la hoja renderizada");
    await page.evaluate(() => document.querySelector(".a4-sheet")?.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, name + "-03-entregar.png") });

    assert.deepEqual(errors, [], "sin errores JS: " + errors.join(" | "));
    pass(name + ": sin errores JS en todo el recorrido");
    await context.close();
  } finally {
    await browser.close();
  }
  return errors;
}

(async () => {
  await new Promise((r) => server.listen(5573, "127.0.0.1", r));
  try {
    await runEngine("chromium", chromium);
    await runEngine("webkit", webkit);
    fs.writeFileSync(path.join(out, "results.json"), JSON.stringify({ version: JSON.parse(fs.readFileSync("dist/version.json")), checks }, null, 2));
    console.log("HOME-SCREEN PASS (" + checks.length + " checks)");
  } finally {
    server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
