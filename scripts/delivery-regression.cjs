const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert"), { chromium } = require("../node_modules/playwright"), jsQR = require("../node_modules/jsqr");
const root = path.resolve("dist"), out = path.resolve(".audit/delivery-evidence");
fs.mkdirSync(out, { recursive: true });
let browser, server;
(async () => {
  let base = process.env.REALSCAN_SMOKE_URL;
  if (!base) {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://localhost"), file = path.resolve(root, "." + (url.pathname === "/" ? "/index.html" : url.pathname));
      if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
      res.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm" }[path.extname(file)] || "application/octet-stream");
      fs.readFile(file, (e, data) => e ? res.writeHead(404).end() : res.end(data));
    });
    await new Promise((r) => server.listen(5521, "127.0.0.1", r));
    base = "http://127.0.0.1:5521/";
  }
  browser = await chromium.launch({ headless: true, ...process.env.REALSCAN_CHROMIUM ? { executablePath: process.env.REALSCAN_CHROMIUM } : {} });
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 1e3 } }), page = await context.newPage(), errors = [], results = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(base);
  await page.waitForFunction(() => typeof updateUI === "function" && window.pdfjsLib);
  assert.equal(await page.evaluate(() => APP_VERSION), "v" + require("../package.json").version);
  await page.locator("#loginUserInput").fill("admin");
  await page.locator("#loginPassInput").fill("1313");
  await page.locator("#btnLoginSubmit").click();
  await page.locator("#loginOverlay").waitFor({ state: "hidden" });
  const samples = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1400;
    c.height = 900;
    const x = c.getContext("2d");
    return ["#a52635", "#254caa"].map((color, i) => {
      x.fillStyle = color;
      x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = "white";
      x.font = "80px sans-serif";
      x.fillText("PRUEBA " + (i ? "REVERSO" : "FRENTE"), 100, 450);
      return c.toDataURL("image/jpeg");
    });
  });
  for (const [i, side] of ["Front", "Back"].entries()) { await page.locator("#fileInput" + side).setInputFiles({ name: "synthetic-" + side + ".jpg", mimeType: "image/jpeg", buffer: Buffer.from(samples[i].split(",")[1], "base64") }); await page.locator(".asset-review [data-review=confirm]").click(); }
  await page.waitForFunction(() => !!state.images.front.processedDataUrl && !!state.images.back.processedDataUrl && state._processingPending === 0);
  const phoneContext = await browser.newContext({ serviceWorkers: "block" }), phone = await phoneContext.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  phone.on("response", async (r) => {
    if (r.status() >= 400) {
      const u = new URL(r.url());
      console.log("REMOTE FAILURE " + u.hostname + " " + r.status());
      if (u.hostname === "identitytoolkit.googleapis.com") try {
        console.log((await r.json()).error?.message);
      } catch (_) {
      }
    }
  });
  try {
    for (const format of ["jpg", "png", "pdf"]) {
      console.log("BEGIN " + format);
      await page.locator("#btnOpenDeliveryModal").click();
      await page.locator("#checkDeliverPdfSheet").check();
      await page.locator("#checkDeliverFrontJpg").check();
      await page.locator("#checkDeliverBackJpg").check();
      await page.locator("#selectDeliveryFormat").selectOption(format);
      await page.locator("#selectDeliveryMaxPx").selectOption("600");
      await page.locator("#btnGenerateDeliveryQr").click();
      await page.waitForFunction(() => !deliveryGenerating && !document.getElementById("deliveryQrResultBox").classList.contains("hidden"), {}, { timeout: 45e3 });
      const session = await page.evaluate(() => RealScanQrSync.getActiveDeliverySession());
      const qr = await page.locator("#canvasDeliveryQr").evaluate((c) => ({ w: c.width, h: c.height, data: Array.from(c.getContext("2d").getImageData(0, 0, c.width, c.height).data) }));
      assert.equal(jsQR(new Uint8ClampedArray(qr.data), qr.w, qr.h)?.data, session.url);
      await phone.goto(session.url);
      try {
        await phone.waitForFunction(() => document.querySelectorAll("a[download]").length === 3, {}, { timeout: 3e4 });
      } catch (error) {
        console.log("PHONE STATE " + await phone.locator("#deliveryFilesList").textContent());
        console.log("OPERATOR FILES " + JSON.stringify(await page.evaluate(() => RealScanQrSync.getActiveDeliverySession()?.files?.map((f) => ({ type: f.type, size: f.size })))));
        throw error;
      }
      const files = [];
      for (let i = 0; i < 3; i++) {
        const event = phone.waitForEvent("download");
        await phone.locator("a[download]").nth(i).click();
        const d = await event;
        const target = path.join(out, format + "-" + i + "-" + d.suggestedFilename());
        await d.saveAs(target);
        const bytes = fs.readFileSync(target), isPdf = bytes.subarray(0, 4).toString() === "%PDF";
        if (i === 2 || format === "pdf") {
          assert(isPdf);
          const numPages = await page.evaluate(async (data) => (await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise).numPages, Array.from(bytes));
          assert(numPages >= 1);
          files.push({ type: "pdf", bytes: bytes.length, pages: numPages });
        } else {
          assert(format === "jpg" ? bytes[0] === 255 && bytes[1] === 216 : bytes.subarray(1, 4).toString() === "PNG");
          const dims = await page.evaluate(async (data) => {
            const image = await createImageBitmap(new Blob([new Uint8Array(data)]));
            const result = { w: image.width, h: image.height };
            image.close();
            return result;
          }, Array.from(bytes));
          assert.equal(Math.max(dims.w, dims.h), 600);
          files.push({ type: format, bytes: bytes.length, ...dims });
        }
      }
      await page.locator("#btnRevokeDeliverySession").click();
      await phone.waitForFunction(() => !document.querySelector("a[download]"), {}, { timeout: 2e4 });
      await page.locator("#digitalDeliveryModal [data-close-modal]").first().click();
      assert.equal(await page.evaluate(() => !!document.getElementById("btnOpenDeliveryModal").closest("[inert]")), false);
      results.push({ format, qrDecoded: true, files, revoked: true });
      console.log("PASS real QR " + format + ": front, back and sheet downloaded; revoke and close work");
    }
  } finally {
    await page.evaluate(() => RealScanQrSync.revokeDeliverySession()).catch(() => {
    });
    await phoneContext.close();
  }
  assert.deepEqual(errors, []);
  const version = await page.evaluate(() => fetch("version.json").then((r) => r.json()));
  fs.writeFileSync(path.join(out, (base.startsWith("http://127.") ? "local" : new URL(base).hostname) + ".json"), JSON.stringify({ base, version, results, errors }, null, 2));
  console.log(JSON.stringify({ base, version, formats: results.map((x) => x.format), errors }));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server) server.close();
});
