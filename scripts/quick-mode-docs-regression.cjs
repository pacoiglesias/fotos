/* 3.41 modo rápido: Documentos como tercer servicio y corrección de la traba.
   Cubre: selector de 3 servicios visible al entrar; cambiar entre INE/Fotos/
   Documentos sin bloqueo; un documento activo abre su pestaña rápida (no el
   panel bloqueado); y update() no entra en bucle ante una ráfaga de eventos
   (contador de ejecuciones acotado). */
const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert"), { chromium } = require("playwright");
const root = path.resolve("dist"), out = path.resolve(".audit/quick-mode-docs");
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const file = path.resolve(root, "." + (new URL(req.url, "http://localhost").pathname === "/" ? "/index.html" : new URL(req.url, "http://localhost").pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  res.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm" }[path.extname(file)] || "application/octet-stream");
  fs.readFile(file, (e, b) => e ? res.writeHead(404).end() : res.end(b));
});
const pass = s => console.log("PASS " + s);
let browser; const errors = [];
(async () => {
  await new Promise(r => server.listen(5543, "127.0.0.1", r));
  browser = await chromium.launch({ headless: true, ...(process.env.REALSCAN_CHROMIUM ? { executablePath: process.env.REALSCAN_CHROMIUM } : {}) });
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1400, height: 1000 } }), page = await context.newPage();
  page.setDefaultTimeout(6e4);
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.getItem('realscan_auth_v2') || localStorage.setItem('realscan_auth_v2', JSON.stringify({ users: [{ username: "admin", passwordHash: "beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe", role: "admin", mustChangePassword: false }], currentUsername: "admin", sessionToken: null, sessionExpiry: 0 }));
  });
  await page.goto("http://127.0.0.1:5543");
  await page.locator("#loginUserInput").fill("admin");
  await page.locator("#loginPassInput").fill("PruebaAcceso2026");
  await page.locator("#btnLoginSubmit").click();
  await page.locator("#loginOverlay").waitFor({ state: "hidden" });
  await page.waitForFunction(() => window.RealScanQuickMode && document.getElementById("workbenchQuick"));

  // Selector de 3 servicios visible al entrar en modo rápido.
  await page.locator("#workbenchQuick").click();
  await page.waitForFunction(() => !document.querySelector("#quickMode .quick-main").hidden);
  assert.equal(await page.locator("[data-quick-service]").count(), 3);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("[data-quick-service]")].map(b => b.dataset.quickService)), ["id", "photos", "docs"]);
  pass("Quick mode shows the 3-service selector (INE, Fotos, Documentos) on entry");

  // Cambiar a Documentos: abre su pestaña rápida, nunca el panel bloqueado.
  await page.locator('[data-quick-service="docs"]').click();
  await page.waitForFunction(() => !document.querySelector("#quickMode .quick-docs").hidden);
  assert(await page.evaluate(() => document.querySelector("#quickMode .quick-blocked").hidden), "blocked panel stays hidden for documents");
  assert(await page.evaluate(() => !!document.getElementById("quickDocScanBtn")), "docs view has its giant scan button");
  pass("Switching to Documentos opens the quick docs view instead of the blocked panel");

  // Con el documento activo, salir y reentrar: sigue en su pestaña rápida.
  await page.evaluate(() => document.getElementById("quickDocFullModeBtn").click());
  await page.locator("#workbenchQuick").click();
  await page.waitForFunction(() => !document.querySelector("#quickMode .quick-docs").hidden);
  pass("An active document job re-enters quick mode on its docs tab, not blocked");

  // Cambiar entre los 3 servicios sin bloqueo.
  await page.locator('[data-quick-service="photos"]').click();
  await page.waitForFunction(() => !document.querySelector("#quickMode .quick-photos").hidden);
  await page.locator('[data-quick-service="id"]').click();
  await page.waitForFunction(() => !document.querySelector("#quickMode .quick-main").hidden);
  await page.locator('[data-quick-service="docs"]').click();
  await page.waitForFunction(() => !document.querySelector("#quickMode .quick-docs").hidden);
  pass("Switching among INE, Fotos and Documentos never lands on the blocked panel");

  // Anti-bucle: ante una ráfaga de 60 eventos, update() corre como mucho
  // 1 vez por evento (nunca se redispara a sí mismo en cadena) y, al
  // cesar los eventos, el contador queda estable (sin bucle autónomo).
  const runs = await page.evaluate(async () => {
    const before = RealScanQuickMode.stats().runs;
    for (let i = 0; i < 60; i++) document.dispatchEvent(new Event("realscan:document-updated"));
    const after = RealScanQuickMode.stats().runs;
    await new Promise(r => setTimeout(r, 600));
    const later = RealScanQuickMode.stats().runs;
    await new Promise(r => setTimeout(r, 1000));
    return { before, after, later, final: RealScanQuickMode.stats().runs };
  });
  assert(runs.after - runs.before <= 60, "update() never self-triggers beyond 1 run per event: " + JSON.stringify(runs));
  assert(runs.later - runs.after <= 2 && runs.final === runs.later, "update() settles and stays stable when events stop (no autonomous loop): " + JSON.stringify(runs));
  pass("update() does not loop: at most 1 run per event and fully stable after the burst");

  assert.deepEqual(errors, []);
})().catch(async e => {
  console.error(e); console.error(errors);
  for (const c of browser?.contexts() || []) for (const p of c.pages()) await p.screenshot({ path: path.join(out, "failure.png") }).catch(() => {});
  process.exitCode = 1;
}).finally(async () => { await browser?.close(); server.close(); });
