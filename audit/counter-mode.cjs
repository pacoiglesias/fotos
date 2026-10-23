/* Pieza C — Modo mostrador: verificación Playwright (audit, no forma
   parte de verify.cjs). Sirve dist/, entra con la cuenta de prueba de
   las regresiones, abre Ajustes y mide ANTES/DESPUÉS: font-size raíz,
   tamaño y color del texto secundario, altura de objetivos táctiles,
   contraste en oscuro, persistencia tras recargar y restauración al
   desactivar. Capturas en audit/counter-mode/. */
const fs = require("fs"),
  path = require("path"),
  http = require("http"),
  assert = require("assert"),
  { chromium } = require("playwright");
const root = path.resolve("dist");
const out = path.resolve("audit/counter-mode");
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
const openSettings = async (page) => {
  await page.locator("#counterMore").click();
  await page.locator("#btnOpenSettings").click();
  await page.locator("#btnCounterModeToggle").waitFor({ state: "visible" });
};
const measure = (page) => page.evaluate(() => {
  const desc = document.querySelector("#counterModeLabel")?.parentElement?.querySelector("p:last-child");
  const btn = document.getElementById("btnShowWelcome");
  const cs = (el) => (el ? getComputedStyle(el) : null);
  return {
    rootFontPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
    attr: document.documentElement.getAttribute("data-counter"),
    descFontPx: desc ? parseFloat(cs(desc).fontSize) : null,
    descColor: desc ? cs(desc).color : null,
    welcomeBtnH: btn ? btn.getBoundingClientRect().height : null,
    pressed: document.getElementById("btnCounterModeToggle")?.getAttribute("aria-pressed"),
    stored: (() => { try { return localStorage.getItem("realscan_mostrador"); } catch (e) { return null; } })(),
  };
});
(async () => {
  await new Promise((r) => server.listen(5561, "127.0.0.1", r));
  const browser = await chromium.launch({ headless: true, ...(process.env.REALSCAN_CHROMIUM ? { executablePath: process.env.REALSCAN_CHROMIUM } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.getItem("realscan_auth_v2") || localStorage.setItem("realscan_auth_v2", JSON.stringify({ users: [{ username: "admin", passwordHash: "beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe", role: "admin", mustChangePassword: false }], currentUsername: "admin", sessionToken: null, sessionExpiry: 0 }));
    });
    await page.goto("http://127.0.0.1:5561/", { waitUntil: "load" });
    await page.locator("#loginUserInput").fill("admin");
    await page.locator("#loginPassInput").fill("PruebaAcceso2026");
    await page.locator("#btnLoginSubmit").click();
    await page.locator("#loginOverlay").waitFor({ state: "hidden" });
    await openSettings(page);

    const before = await measure(page);
    assert.equal(before.attr, null);
    assert.equal(before.rootFontPx, 16, "raíz base 16px");
    await page.screenshot({ path: path.join(out, "01-antes.png") });

    await page.locator("#btnCounterModeToggle").click();
    const after = await measure(page);
    assert.equal(after.attr, "on");
    assert.equal(after.pressed, "true");
    assert.equal(after.stored, "on");
    assert.ok(after.rootFontPx >= 19 && after.rootFontPx <= 20, "raíz ~120%: " + after.rootFontPx);
    assert.ok(after.descFontPx > before.descFontPx, "texto secundario más grande");
    assert.equal(after.descColor, "rgb(51, 65, 85)", "slate-500 endurecido a slate-700 en claro: " + after.descColor);
    assert.ok(after.welcomeBtnH >= 48, "objetivo táctil ≥48px: " + after.welcomeBtnH);
    await page.screenshot({ path: path.join(out, "02-mostrador-claro.png") });

    // Contraste en modo oscuro con el mostrador activo.
    const dark = await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      const desc = document.querySelector("#counterModeLabel")?.parentElement?.querySelector("p:last-child");
      return desc ? getComputedStyle(desc).color : null;
    });
    assert.equal(dark, "rgb(226, 232, 240)", "texto secundario claro en oscuro: " + dark);
    await page.screenshot({ path: path.join(out, "03-mostrador-oscuro.png") });
    await page.evaluate(() => document.documentElement.classList.remove("dark"));

    // Persistencia tras recargar (la sesión puede pedir acceso otra vez;
    // el atributo y la medida deben sobrevivir igualmente).
    await page.reload({ waitUntil: "load" });
    if (await page.locator("#loginOverlay").isVisible().catch(() => false)) {
      await page.locator("#loginUserInput").fill("admin");
      await page.locator("#loginPassInput").fill("PruebaAcceso2026");
      await page.locator("#btnLoginSubmit").click();
      await page.locator("#loginOverlay").waitFor({ state: "hidden" });
    }
    await openSettings(page);
    const persisted = await measure(page);
    assert.equal(persisted.attr, "on", "persiste tras recargar");
    assert.equal(persisted.pressed, "true");
    assert.ok(persisted.rootFontPx >= 19);

    // Desactivar restaura.
    await page.locator("#btnCounterModeToggle").click();
    const off = await measure(page);
    assert.equal(off.attr, null);
    assert.equal(off.pressed, "false");
    assert.equal(off.stored, "off");
    assert.equal(off.rootFontPx, 16, "raíz restaurada a 16px");
    await page.screenshot({ path: path.join(out, "04-desactivado.png") });

    const result = { before, after, darkDescColor: dark, persisted, off };
    fs.writeFileSync(path.join(out, "results.json"), JSON.stringify(result, null, 2));
    console.log("PASS counter-mode", JSON.stringify(result));
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
