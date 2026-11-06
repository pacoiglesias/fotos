/* B2: modo rápido de fotos — 3 trabajos habituales, escaneo gigante y entrega.
   Verifica que las tiles aplican sus presets, que el escaneo entrega la foto
   con un toque y que el modo rápido INE sigue intacto al coordinarse. */
const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert"), { chromium } = require("playwright");
const root = path.resolve("dist"), out = path.resolve(".audit/quick-photos");
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const file = path.resolve(root, "." + (new URL(req.url, "http://localhost").pathname === "/" ? "/index.html" : new URL(req.url, "http://localhost").pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  res.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm" }[path.extname(file)] || "application/octet-stream");
  fs.readFile(file, (e, b) => e ? res.writeHead(404).end() : res.end(b));
});
const pass = (s) => { console.log("PASS " + s); };
const checks = [];
let browser;
const errors = [];
function cameraFixture() {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 900;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#172234";
  ctx.fillRect(0, 0, 1200, 900);
  ctx.fillStyle = "#f5f2e8";
  ctx.beginPath();
  ctx.moveTo(150, 130);
  ctx.lineTo(1050, 170);
  ctx.lineTo(1e3, 750);
  ctx.lineTo(190, 720);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#172234";
  ctx.font = "28px sans-serif";
  for (let y = 270; y < 650; y += 48) ctx.fillText("Documento de prueba \xB7 123456789", 270, y);
  window.__fixture = c;
  window.__tracks = [];
  window.__constraints = [];
  window.__mode = "normal";
  navigator.mediaDevices.getUserMedia = async () => {
    if (__mode === "deny") throw new DOMException("Denied", "NotAllowedError");
    if (__mode === "slow") await new Promise((r) => window.__resolveCamera = r);
    const stream = c.captureStream(15), track = stream.getVideoTracks()[0];
    __tracks.push(track);
    const repaint = setInterval(() => {
      if (track.readyState === "ended") {
        clearInterval(repaint);
        return;
      }
      ctx.fillStyle = "#172234";
      ctx.fillRect(0, 0, 2, 2);
    }, 60);
    track.getCapabilities = () => ({ focusMode: ["continuous"], torch: true });
    track.applyConstraints = async (a) => {
      __constraints.push(a);
    };
    return stream;
  };
  window.ImageCapture = class {
    async takePhoto() {
      return new Promise((resolve) => c.toBlob(resolve, "image/jpeg", 0.98));
    }
  };
}
(async () => {
  await new Promise((r) => server.listen(5527, "127.0.0.1", r));
  browser = await chromium.launch({ headless: true, ...process.env.REALSCAN_CHROMIUM ? { executablePath: process.env.REALSCAN_CHROMIUM } : {} });
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1400, height: 1000 } }), page = await context.newPage();
  page.setDefaultTimeout(2e4);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(cameraFixture);
  await page.addInitScript(() => {
    localStorage.getItem('realscan_auth_v2')||localStorage.setItem('realscan_auth_v2', JSON.stringify({ users: [{ username: "admin", passwordHash: "beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe", role: "admin", mustChangePassword: false }], currentUsername: "admin", sessionToken: null, sessionExpiry: 0 }));
  });
  await page.goto("http://127.0.0.1:5527");
  await page.locator("#loginUserInput").fill("admin");
  await page.locator("#loginPassInput").fill("PruebaAcceso2026");
  await page.locator("#btnLoginSubmit").click();
  await page.locator("#loginOverlay").waitFor({ state: "hidden" });
  await page.waitForFunction(() => window.RealScanQuickMode && window.RealScanDeskPresets && document.getElementById("workbenchQuick"));
  const stateOf = () => page.evaluate(() => ({ category: state.activeCategory, format: state.format, copies: state.photoCopies, paper: state.paperSize, sets: state.outputSets }));

  // Entrar en modo rápido con fotos: se ve el panel de fotos, no el de INE.
  await page.evaluate(() => switchIntent("photos"));
  await page.waitForFunction(() => state.activeCategory === "photos");
  await page.locator("#workbenchQuick").click();
  await page.waitForFunction(() => !document.querySelector("#quickMode .quick-photos").hidden);
  assert(await page.evaluate(() => document.querySelector("#quickMode .quick-main").hidden), "INE main hidden in photo quick mode");
  assert.equal((await page.locator('[data-quick-photo="passport"]').count()), 1);
  pass("Photo quick mode shows its own panel instead of the INE panel");

  // El modo INE sigue intacto al salir y volver a entrar con INE.
  await page.locator("#quickPhotoFullModeBtn").click();
  await page.evaluate(() => { switchIntent("id"); selectFormat("card"); });
  await page.locator("#workbenchQuick").click();
  await page.waitForFunction(() => !document.querySelector("#quickMode .quick-main").hidden);
  assert(await page.evaluate(() => document.querySelector("#quickMode .quick-photos").hidden), "photo panel hidden in INE quick mode");
  await page.locator("#quickFullModeBtn").click();
  await page.evaluate(() => switchIntent("photos"));
  await page.locator("#workbenchQuick").click();
  await page.waitForFunction(() => !document.querySelector("#quickMode .quick-photos").hidden);
  pass("INE quick mode still shows its own panel and hands back to photos");

  // Cada tile aplica su preset completo.
  await page.locator('[data-quick-photo="passport"]').click();
  assert.deepEqual(await stateOf(), { category: "photos", format: "photo_passport", copies: 4, paper: "a4", sets: 1 });
  await page.locator('[data-quick-photo="infantil"]').click();
  assert.deepEqual(await stateOf(), { category: "photos", format: "photo_infantil", copies: 6, paper: "photo_4x6", sets: 1 });
  await page.locator('[data-quick-photo="photo10x15"]').click();
  assert.deepEqual(await stateOf(), { category: "photos", format: "photo_10x15", copies: 1, paper: "photo_4x6", sets: 1 });
  pass("Passport, Infantil and 10x15 tiles apply format, copies and paper");

  // Escanear con el botón gigante entrega la foto con un toque (B1: sin confirmación extra).
  await page.locator('[data-quick-photo="passport"]').click();
  await page.locator("#quickPhotoScanBtn").click();
  await page.waitForFunction(() => !document.querySelector(".scan-dialog [data-act=capture]").disabled);
  await page.locator(".scan-dialog [data-act=capture]").click();
  await page.locator(".scan-dialog [data-act=original]").waitFor();
  assert(await page.locator(".scan-dialog [data-act=accept]").isHidden(), "photo mode hides the warp button");
  await page.locator(".scan-dialog [data-act=original]").click();
  await page.locator(".scan-dialog").waitFor({ state: "detached" });
  await page.waitForFunction(() => !!state.images.front.processedDataUrl);
  assert(await page.evaluate(() => RealScanWorkflow.describe().ready), "photo job ready after one-tap delivery");
  await page.waitForFunction(() => !document.getElementById("quickPrintBtn").disabled);
  assert(await page.locator("#quickPrintBtn").isEnabled(), "print enabled when the photo is ready");
  assert((await page.locator("#quickStampText").innerText()).includes("Foto a tamaño real"), "deliver stamp names the photo job");
  assert.equal(await page.locator("#quickPhotoSlotBtn small").innerText(), "Lista");
  pass("Giant scan button captures the photo and enables delivery in one tap");

  // La cantidad se ajusta desde el panel.
  await page.locator("#quickPhotoCount").fill("8");
  await page.locator("#quickPhotoCount").dispatchEvent("change");
  assert.equal((await stateOf()).copies, 8);
  pass("Photo count changes from the quick panel");

  assert.deepEqual(errors, []);
  checks.push("quick-photos");
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify({ checks, errors }, null, 2));
})().catch(async (e) => {
  console.error(e);
  console.error(errors);
  for (const c of browser?.contexts() || []) for (const p of c.pages()) await p.screenshot({ path: path.join(out, "failure.png") }).catch(() => {});
  process.exitCode = 1;
}).finally(async () => { await browser?.close(); server.close(); });
