const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert"), { chromium } = require("playwright");
const root = path.resolve("dist"), out = path.resolve(".audit/capture-evidence"), checks = [];
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const file = path.resolve(root, "." + (new URL(req.url, "http://localhost").pathname === "/" ? "/index.html" : new URL(req.url, "http://localhost").pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  res.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm" }[path.extname(file)] || "application/octet-stream");
  fs.readFile(file, (e, b) => e ? res.writeHead(404).end() : res.end(b));
});
const pass = (s) => {
  checks.push(s);
  console.log("PASS " + s);
};
let browser;
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
  await new Promise((r) => server.listen(5521, "127.0.0.1", r));
  browser = await chromium.launch({ headless: true, ...process.env.REALSCAN_CHROMIUM ? { executablePath: process.env.REALSCAN_CHROMIUM } : {} });
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1400, height: 1e3 } }), page = await context.newPage(), errors = [];
  page.setDefaultTimeout(2e4);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(cameraFixture);
  // v3.12.0: ya no hay PIN de fábrica; se siembra una cuenta de prueba
  // (hash SHA-256 de "PruebaAcceso2026", clave elegida solo para la suite).
  await page.addInitScript(() => {
    localStorage.getItem('realscan_auth_v2')||localStorage.setItem('realscan_auth_v2', JSON.stringify({ users: [{ username: "admin", passwordHash: "beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe", role: "admin", mustChangePassword: false }], currentUsername: "admin", sessionToken: null, sessionExpiry: 0 }));
  });
  await page.goto("http://127.0.0.1:5521");
  await page.locator("#loginUserInput").fill("admin");
  await page.locator("#loginPassInput").fill("PruebaAcceso2026");
  await page.locator("#btnLoginSubmit").click();
  await page.locator("#loginOverlay").waitFor({ state: "hidden" });
  const analysis = await page.evaluate(() => {
    const a = RealScanCapture.analyze(__fixture);
    const blank = document.createElement("canvas");
    blank.width = 400;
    blank.height = 300;
    blank.getContext("2d").fillRect(0, 0, 400, 300);
    const low=document.createElement('canvas');low.width=400;low.height=300;const l=low.getContext('2d');l.fillStyle='#d5d5d5';l.fillRect(0,0,400,300);l.fillStyle='#e5e5e5';l.fillRect(50,40,300,220);
    const soft=document.createElement('canvas');soft.width=1200;soft.height=900;const b=soft.getContext('2d');b.filter='blur(16px)';b.drawImage(__fixture,0,0);
    return { a, low:RealScanCapture.analyze(low),soft:RealScanCapture.analyze(soft),blank: RealScanCapture.analyze(blank), invalid: RealScanCapture.validQuad([{ x: 0, y: 0 }, { x: 300, y: 300 }, { x: 300, y: 0 }, { x: 0, y: 300 }], 400, 400) };
  });
  assert(analysis.a.quad, "Detect skewed white page on contrasting table");
  assert(Math.abs(analysis.a.quad[0].x - 0.125) < 0.025);
  assert(Math.abs(analysis.a.quad[2].y - 0.833) < 0.025);
  assert.equal(analysis.blank.quad, null);
  assert.equal(analysis.invalid, false);
  assert(analysis.low.quad,'Detect a light page on a uniform light background');
  assert(analysis.soft.sharpness<analysis.a.sharpness,'Blur estimate must distinguish the softened image');
  pass("Skewed page edges detected; blank scene and crossed corners rejected");
  await page.locator('[data-camera="front"]').click();
  await page.locator(".scan-dialog [data-act=capture]").waitFor();
  await page.waitForFunction(() => !document.querySelector(".scan-dialog [data-act=capture]").disabled);
  assert(await page.evaluate(() => __constraints.some((c) => c.advanced[0].focusMode === "continuous")));
  await page.locator(".scan-settings summary").click();
  await page.selectOption(".scan-format select", "card");
  await page.locator(".scan-dialog [data-act=torch]").click();
  assert(await page.evaluate(() => __constraints.some((c) => c.advanced[0].torch === true)));
  await page.locator(".scan-dialog [data-act=capture]").click();
  await page.locator(".scan-corner").first().waitFor();
  assert(await page.evaluate(() => __tracks.every((t) => t.readyState === "ended")));
  await page.locator(".scan-corner").first().focus();
  await page.keyboard.press("ArrowRight");
  await page.screenshot({ path: path.join(out, "desktop-corners.png") });
  await page.locator(".scan-dialog [data-act=accept]").click();
  await page.locator(".scan-dialog [data-act=confirm]").click();
  await page.locator(".scan-dialog").waitFor({ state: "detached" });
  await page.waitForFunction(() => !!state.images.front.processedDataUrl);
  const dimensions = await page.evaluate(() => ({ w: state.images.front.naturalWidth, h: state.images.front.naturalHeight }));
  assert(dimensions.w > 800 && dimensions.w < 1e3);
  assert(dimensions.h > 500 && dimensions.h < 700);
  assert(Math.abs(dimensions.w/dimensions.h-85.6/53.98)<.01);
  assert.equal(await page.evaluate(()=>state.images.front.fitMode), "fit");
  pass("Camera requests supported continuous focus, controls torch, corrects perspective and preserves confirmed frame");
  await page.locator("#btnPrintDirect").click();
  await page.locator("#outputReviewModal").waitFor({ state: "visible" });
  assert((await page.locator("#printReview").innerText()).includes("85.6"));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll("#printReview img")].filter(i => !i.closest(".output-review-sheet")).length), 1);
  await page.locator("#printSheetPreview svg").first().waitFor(); assert(await page.evaluate(() => !!document.querySelector("#printSheetPreview svg")), "La revisión muestra la hoja exacta preparada para imprimir");
  await page.locator("#outputReviewModal").screenshot({path:path.join(out,"print-review.png")});
  await page.locator("#outputReviewModal [data-close-modal]").click();
  await page.locator("#btnOpenDeliveryModal").click();
  await page.selectOption("#selectDeliveryFormat", "png");
  await page.selectOption("#selectDeliveryMaxPx", "600");
  assert((await page.locator("#deliveryReview").innerText()).includes("PNG \xB7 600 px"));
  await page.keyboard.press("Escape");
  pass("Actual print button opens visual review; delivery summary tracks selected format and dimensions");
  await page.evaluate(() => {
    window.ImageCapture = undefined;
    RealScanCapture.open({ photoMode: true, onAccept: () => {
    } });
  });
  await page.waitForFunction(() => !document.querySelector(".scan-dialog [data-act=capture]").disabled);
  await page.locator(".scan-dialog [data-act=capture]").click();
  await page.locator(".scan-dialog [data-act=original]").waitFor();
  assert(await page.locator(".scan-dialog [data-act=accept]").isHidden());
  await page.locator(".scan-dialog [data-act=retry]").click();
  await page.waitForFunction(() => !document.querySelector(".scan-dialog [data-act=capture]").disabled);
  await page.locator(".scan-dialog [data-act=switch]").click();
  await page.waitForFunction(() => !document.querySelector(".scan-dialog [data-act=capture]").disabled);
  await page.keyboard.press("Escape");
  await page.evaluate(() => { RealScanCapture.open({}); });
  await page.waitForFunction(() => !document.querySelector(".scan-dialog [data-act=capture]").disabled);
  await page.keyboard.press("Alt+Shift+R");
  assert.equal(await page.locator(".scan-dialog").count(), 0);
  assert(await page.evaluate(() => __tracks.every((t) => t.readyState === "ended")));
  pass("Portrait photo mode keeps full frame; retake, camera switch and Escape release every track");
  await page.evaluate(() => {
    __mode = "slow";
    RealScanCapture.open({});
  });
  await page.waitForFunction(() => typeof __resolveCamera === "function");
  await page.locator(".scan-dialog [data-act=close]").click();
  await page.evaluate(() => __resolveCamera());
  await page.waitForFunction(() => __tracks.every((t) => t.readyState === "ended"));
  await page.evaluate(() => {
    __mode = "deny";
    RealScanCapture.open({ onNative: () => triggerNativeUpload("front", true) });
  });
  await page.waitForFunction(() => document.querySelector(".scan-status").textContent.includes("No se pudo abrir"));
  const chooser = page.waitForEvent("filechooser");
  await page.locator(".scan-dialog [data-act=native]").click();
  await chooser;
  assert.equal(await page.locator(".scan-dialog").count(), 0);
  pass("Closing pending permission stops late streams; denied camera offers native file capture");
  const phone = await context.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.addInitScript(cameraFixture);
  await phone.route("**/js/firebase-transfer.js", (r) => r.fulfill({ contentType: "application/javascript", body: 'window.__sent=0;window.RealScanRelay={readSession:async()=>({token:"synthetic1234"}),validate:()=>{},send:async()=>{__sent++}};' }));
  await phone.goto("http://127.0.0.1:5521/phone-upload.html");
  await phone.locator("#btnSmartScan").click();
  await phone.waitForFunction(() => !document.querySelector(".scan-dialog [data-act=capture]").disabled);
  await phone.locator(".scan-settings summary").click();
  await phone.selectOption(".scan-format select", "a4");
  await phone.locator(".scan-dialog [data-act=capture]").click();
  await phone.locator(".scan-corner").first().waitFor();
  await phone.screenshot({ path: path.join(out, "phone-corners.png") });
  assert(await phone.evaluate(() => document.querySelector(".scan-dialog").getBoundingClientRect().right <= innerWidth));
  await phone.locator(".scan-dialog [data-act=accept]").click();
  await phone.locator(".scan-dialog [data-act=confirm]").click();
  await phone.waitForFunction(() => document.getElementById("filesCount").textContent === "1" && !document.getElementById("btnSendFiles").disabled);
  assert.equal(await phone.evaluate(() => __sent), 0);
  assert.equal(await phone.locator("#thumbnailsList img").count(), 1);
  await phone.locator("#thumbnailsList img").evaluate(async image=>{await image.decode();if(Math.abs(image.naturalWidth/image.naturalHeight-297/210)>.01)throw Error("A4 ratio lost");});
  await phone.locator("#btnSendFiles").click();
  await phone.locator("#successBox").waitFor({ state: "visible" });
  assert.equal(await phone.evaluate(() => __sent), 1);
  pass("Phone capture fits viewport, shows corrected thumbnail and sends only after explicit confirmation");
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify({ checks, dimensions, errors }, null, 2));
})().catch(async (e) => {
  for (const c of browser?.contexts() || []) for (const p of c.pages()) {
    console.error(await p.evaluate(() => ({ status: document.querySelector(".scan-status")?.textContent, video: document.querySelector("video") ? { w: document.querySelector("video").videoWidth, h: document.querySelector("video").videoHeight, paused: document.querySelector("video").paused } : null })).catch(() => ({})));
    await p.screenshot({ path: path.join(out, "failure.png") }).catch(() => {
    });
  }
  console.error(e);
  process.exitCode = 1;
}).finally(async () => {
  await browser?.close();
  server.close();
});
