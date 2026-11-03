const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert"), crypto = require("crypto"), { chromium, webkit } = require("playwright");
const root = path.resolve("dist"), out = path.resolve(".audit/document-tools");
fs.mkdirSync(out, { recursive: true });
let browser;
const checks = [];
const server = http.createServer((req, res) => {
  const name = new URL(req.url, "http://local").pathname, file = path.resolve(root, "." + (name === "/" ? "/index.html" : name));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
  res.setHeader("Content-Type", { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm" }[path.extname(file)] || "application/octet-stream");
  res.end(fs.readFileSync(file));
});
const pass = (t) => {
  checks.push(t);
  console.log("PASS " + t);
}, digest = (b) => crypto.createHash("sha256").update(b).digest("hex");
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  for (const [engine, type] of Object.entries({ chromium, webkit })) {
    browser = await type.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: "block", reducedMotion: "reduce" }), page = await context.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await context.route("**/*", (r) => {
      const u = new URL(r.request().url());
      return u.origin === origin || /^(data|blob):$/.test(u.protocol) ? r.continue() : r.abort();
    });
    await page.addInitScript(() => {
      if (window !== top) return;
      localStorage.setItem("realscan_welcome_seen_v1", "1");
      localStorage.setItem("realscan_auth_v2", JSON.stringify({ users: [{ username: "admin", passwordHash: "beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe", role: "admin", mustChangePassword: false }], currentUsername: "admin", sessionToken: null, sessionExpiry: 0 }));
    });
    await page.goto(origin);
    await page.locator("#loginUserInput").fill("admin");
    await page.locator("#loginPassInput").fill("PruebaAcceso2026");
    await page.locator("#btnLoginSubmit").click();
    await page.locator("#loginOverlay").waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.getElementById("docMergeFiles") && window.RealScanDocumentTools && window.RealScanWorkspacePolish);
    await page.evaluate(async () => {
      await ensureJsPdf();
      const pdf = new jspdf.jsPDF({ unit: "mm", format: "a4" });
      pdf.setFillColor(245, 80, 70);
      pdf.rect(0, 0, 210, 297, "F");
      pdf.setFontSize(24);
      pdf.text("DATO SINTETICO PRIVADO", 15, 40);
      pdf.addPage([215.9, 279.4], "portrait");
      pdf.setFillColor(20, 190, 70);
      pdf.rect(0, 0, 215.9, 279.4, "F");
      pdf.addPage([297, 210], "landscape");
      pdf.setFillColor(40, 90, 240);
      pdf.rect(0, 0, 297, 210, "F");
      window.__source339 = pdf.output("blob");
      window.__sourceBytes339 = Array.from(new Uint8Array(await __source339.arrayBuffer()));
      const api = RealScanDocumentTools;
      window.__selection339 = { odd: api.select("odd", "", 3), even: api.select("even", "", 3), groups: api.groups("groups", "all", "", "1;2-3", 3) };
      let rejected = 0;
      for (const run of [() => api.select("even", "", 1), () => api.groups("groups", "all", "", "1-2;2-3", 3), () => api.groups("groups", "all", "", "1;2", 3), () => api.cleanMarks([{ page: 0, x: 0.9, y: 0, w: 0.5, h: 0.2 }], 3)]) try {
        run();
      } catch {
        rejected++;
      }
      if (rejected !== 4) throw Error("Invalid selections accepted");
    });
    assert.deepEqual(await page.evaluate(() => __selection339), { odd: [0, 2], even: [1], groups: [[0], [1, 2]] });
    const redaction = await page.evaluate(async () => {
      const api = RealScanDocumentTools, files = await api.transform(__source339, { sets: [[0], [1, 2]], marks: [{ page: 0, x: 0.05, y: 0.05, w: 0.85, h: 0.3 }] }), task = pdfjsLib.getDocument({ data: new Uint8Array(await files[0].blob.arrayBuffer()) });
      try {
        const pdf = await task.promise, p = await pdf.getPage(1), text = await p.getTextContent(), ops = await p.getOperatorList(), view = p.getViewport({ scale: 1 }), c = document.createElement("canvas");
        c.width = Math.ceil(view.width);
        c.height = Math.ceil(view.height);
        const x = c.getContext("2d");
        await p.render({ canvasContext: x, viewport: view }).promise;
        const black = Array.from(x.getImageData(Math.floor(c.width * 0.2), Math.floor(c.height * 0.15), 1, 1).data), outside = Array.from(x.getImageData(Math.floor(c.width * 0.95), Math.floor(c.height * 0.9), 1, 1).data);
        c.width = c.height = 0;
        return { black, outside, text: text.items.length, attachments: await pdf.getAttachments(), annotations: (await p.getAnnotations()).length, hasText: ops.fnArray.includes(pdfjsLib.OPS.showText), files: files.map((f) => ({ pages: f.pages, sizes: f.report.sizes })), unchanged: JSON.stringify(__sourceBytes339) === JSON.stringify(Array.from(new Uint8Array(await __source339.arrayBuffer()))) };
      } finally {
        await task.destroy();
      }
    });
    assert.deepEqual(redaction.black, [0, 0, 0, 255]);
    assert(redaction.outside[0] > 230 && redaction.outside[1] < 100);
    assert.equal(redaction.text, 0);
    assert.equal(redaction.hasText, false);
    assert.equal(redaction.attachments, null);
    assert.equal(redaction.annotations, 0);
    assert(redaction.unchanged);
    assert.deepEqual(redaction.files.map((f) => f.pages), [1, 2]);
    for (const [actual, expected] of redaction.files.flatMap((f) => f.sizes).map((s, i) => [s, [[210, 297], [215.9, 279.4], [297, 210]][i]])) {
      assert(Math.abs(actual.width - expected[0]) < 0.05);
      assert(Math.abs(actual.height - expected[1]) < 0.05);
    }
    pass(engine + " splitting preserves mixed paper dimensions; redaction is opaque pixels with no OCR, annotations, attachments or original payload and leaves source unchanged");
    const compressed = await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 1200;
      c.height = 1600;
      const x = c.getContext("2d"), d = x.createImageData(c.width, c.height);
      let seed = 7;
      for (let i = 0; i < d.data.length; i += 4) {
        seed = seed * 1664525 + 1013904223 >>> 0;
        d.data[i] = seed & 255;
        d.data[i + 1] = seed >>> 8 & 255;
        d.data[i + 2] = seed >>> 16 & 255;
        d.data[i + 3] = 255;
      }
      x.putImageData(d, 0, 0);
      const p = new jspdf.jsPDF();
      p.addImage(c.toDataURL(), "PNG", 0, 0, 210, 297);
      c.width = c.height = 0;
      const blob = p.output("blob"), limit = 512 * 1024, result = await RealScanDocumentTools.transform(blob, { sets: [[0]], maxBytes: limit });
      let impossible = false, cancelled = false;
      try {
        await RealScanDocumentTools.transform(blob, { sets: [[0]], maxBytes: 1024 });
      } catch {
        impossible = true;
      }
      let current = true;
      try {
        await RealScanDocumentTools.transform(__source339, { sets: [[0, 1, 2]], isCurrent: () => current, onProgress: () => {
          current = false;
        } });
      } catch {
        cancelled = true;
      }
      const blank = new jspdf.jsPDF(), report = await RealScanDocumentTools.inspect(blank.output("blob"));
      let missing = false;
      try {
        await RealScanDocumentTools.inspect(blank.output("blob"), { expectedPages: 2 });
      } catch {
        missing = true;
      }
      return { source: blob.size, bytes: result[0].blob.size, limit, impossible, cancelled, blank: report.warnings.length, missing };
    });
    assert(compressed.source > compressed.limit);
    assert(compressed.bytes <= compressed.limit);
    assert(compressed.impossible && compressed.cancelled && compressed.missing);
    assert.equal(compressed.blank, 1);
    pass(engine + " weight limit is measured on real bytes; impossible limits, missing pages and cancelled jobs return no deliverable; blank pages warn");
    await page.evaluate(() => RealScanDocuments.activate());
    const incoming = await page.evaluate(async () => {
      const a = new jspdf.jsPDF();
      a.text("PRIMER ARCHIVO", 20, 30);
      const b = new jspdf.jsPDF();
      b.text("SEGUNDO ARCHIVO / 1", 20, 30);
      b.addPage();
      b.text("SEGUNDO ARCHIVO / 2", 20, 30);
      return [a.output("datauristring").split(",")[1], b.output("datauristring").split(",")[1]];
    });
    await page.locator("#docMergeFiles").setInputFiles(incoming.map((data, i) => ({ name: "ejemplo-" + i + ".pdf", mimeType: "application/pdf", buffer: Buffer.from(data, "base64") })));
    await page.waitForFunction(() => RealScanDocuments.status().count === 3 && !RealScanDocuments.status().busy);
    assert.equal(await page.evaluate(() => RealScanDocuments.exportSnapshot().originals.length), 2);
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-page-action="Revisar"]').nth(i).click();
      await page.locator(".asset-review [data-review=confirm]").click();
      await page.locator(".asset-review").waitFor({ state: "detached" });
    }
    await page.waitForFunction(() => RealScanDocuments.status().ready);
    await page.evaluate(() => RealScanPdfDelivery.open());
    await page.waitForFunction(() => !document.getElementById("pdfDeliveryTools").disabled);
    assert((await page.locator("#pdfDeliveryFileCheck").textContent()).includes("3 página(s) comprobadas"));
    const download = async (locator) => {
      const event = page.waitForEvent("download");
      await locator.click();
      return fs.readFileSync(await (await event).path());
    };
    const before = await download(page.locator("#pdfDeliveryDownload"));
    await page.locator("#pdfDeliveryTools").click();
    await page.waitForFunction(() => !document.querySelector("[data-copy=build]").disabled);
    const q = (k) => page.locator('[data-copy="' + k + '"]');
    await q("mode").selectOption("groups");
    await q("groups").fill("1;2-3");
    await q("groups").dispatchEvent("change");
    await page.locator("#documentCopyTools details>summary").click();
    for (const [k, v] of [["x", "5"], ["y", "5"], ["w", "80"], ["h", "30"]]) await q(k).fill(v);
    await q("add").click();
    await q("build").click();
    assert((await q("status").textContent()).includes("confirma"));
    await q("confirm").check();
    await q("build").click();
    await page.waitForFunction(() => !document.querySelector("[data-copy=download]").disabled, null, { timeout: 12e4 });
    assert.equal(await q("result").locator("option").count(), 2);
    await q("result").selectOption("1");
    await page.waitForFunction(() => document.querySelector("[data-copy=page]").textContent === "Página 1 de 2");
    await q("next").click();
    await page.waitForFunction(() => document.querySelector("[data-copy=page]").textContent === "Página 2 de 2");
    await q("zoom").selectOption("2");
    await page.waitForFunction(()=>document.querySelector('[data-copy=canvas]').style.maxWidth==='none'&&document.querySelector('[data-copy=page]').textContent==='Página 2 de 2');
    assert(await page.locator('#documentCopyTools').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Zoom must scroll inside its viewer, without widening the dialog');
    const zipBytes = await download(q("download")), zipCounts = await page.evaluate(async (bytes) => {
      await ensureJSZip();
      const zip = await JSZip.loadAsync(new Uint8Array(bytes)), result = [];
      for (const name of Object.keys(zip.files)) {
        const task = pdfjsLib.getDocument({ data: await zip.file(name).async("uint8array") });
        try {
          result.push((await task.promise).numPages);
        } finally {
          await task.destroy();
        }
      }
      return result;
    }, Array.from(zipBytes));
    assert.deepEqual(zipCounts, [1, 2]);
    await q("close").click();
    assert.equal(digest(await download(page.locator("#pdfDeliveryDownload"))), digest(before));
    await page.locator("#pdfDeliveryScope").selectOption("odd");
    await page.locator("#pdfDeliveryBuild").click();
    await page.waitForFunction(() => !document.getElementById("pdfDeliveryDownload").disabled);
    const odds = await download(page.locator("#pdfDeliveryDownload"));
    assert.equal(await page.evaluate(async (bytes) => {
      const task = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
      try {
        return (await task.promise).numPages;
      } finally {
        await task.destroy();
      }
    }, Array.from(odds)), 2);
    pass(engine + " merge imports both originals in order; real copy UI requires redaction consent, previews every result and downloads correct ZIP groups without changing parent PDF");
    await page.locator("#pdfDeliveryTools").click();
    await page.waitForFunction(() => !document.querySelector("[data-copy=build]").disabled);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1e3 });
      assert(await page.locator("#documentCopyTools").evaluate((e) => e.scrollWidth <= e.clientWidth + 1), "tools overflow " + width);
      await page.screenshot({ path: path.join(out, engine + "-tools-" + width + ".png") });
    }
    await q("close").click();
    await page.locator("#pdfDeliveryClose").click();
    await page.evaluate(() => {
      RealScanDocuments.setOptions({ paper: "legal", margin: 13, color: "gray", sets: 3, headerEnabled: true, headerText: "CLIENTE_PRIVADO_339" });
      for (const id of ["deskClient", "deskPhone", "deskNote"]) document.getElementById(id).value = "CLIENTE_PRIVADO_339";
    });
    await page.locator("#deskTools>summary").click();
    await page.locator("#repeatLastSettings").click();
    await page.locator("#newServiceConfirm").check();
    await page.locator("#newServiceStart").click();
    await page.waitForFunction(() => document.getElementById("newServiceModal").classList.contains("hidden") && RealScanDocuments.status().active && RealScanDocuments.status().count === 0);
    const repeat = await page.evaluate(() => ({ options: RealScanDocuments.status().options, snapshot: RealScanDocuments.exportSnapshot(), fields: ["deskClient", "deskPhone", "deskNote"].map((id) => document.getElementById(id).value), leaked: Object.values(localStorage).some((v) => v.includes("CLIENTE_PRIVADO_339")) }));
    assert.equal(repeat.options.paper, "legal");
    assert.equal(repeat.options.margin, 13);
    assert.equal(repeat.options.sets, 3);
    assert.equal(repeat.options.headerText, "");
    assert.deepEqual(repeat.options.annotations, []);
    assert.equal(repeat.snapshot.originals.length, 0);
    assert.deepEqual(repeat.fields, ["", "", ""]);
    assert.equal(repeat.leaked, false);
    pass(engine + " new-client repeat retains only paper, margin, color and sets, clears originals/header/annotations/client fields and never persists private values");
    await page.evaluate(async () => {
      await RealScanWorkspacePolish.choose("photos");
      setPhotoCopies(12);
      setPaperSize("photo_4x6", true);
      state.outputSets = 2;
      state.sheetMarginMm = 7;
      state.sheetPosition = "top";
      const c = document.createElement("canvas");
      c.width = 250;
      c.height = 300;
      c.getContext("2d").fillRect(0, 0, 250, 300);
      Object.assign(state.images.front, { originalSrc: c.toDataURL(), processedDataUrl: c.toDataURL(), isCropApplied: true, naturalWidth: 250, naturalHeight: 300 });
      c.width = c.height = 0;
      state.documentCustomTitle = "CLIENTE_FOTO_339";
      state.outputAnnotations = [{ id: "example", type: "text", pages: ["sheet:0:front"], x: 0.5, y: 0.5, w: 0.2, h: 0.05, opacity: 1, angle: 0, color: "#172b40", text: "CLIENTE_FOTO_339" }];
      updateUI();
      RealScanStudio.update();
    });
    if (!await page.locator("#deskTools").evaluate((e) => e.open)) await page.locator("#deskTools>summary").click();
    await page.locator("#repeatLastSettings").click();
    await page.locator("#newServiceConfirm").check();
    await page.locator("#newServiceStart").click();
    await page.waitForFunction(() => document.getElementById("newServiceModal").classList.contains("hidden") && !RealScanDocuments.status().active);
    const photo = await page.evaluate(() => ({ count: state.photoCopies, paper: state.paperSize, sets: state.outputSets, margin: state.sheetMarginMm, position: state.sheetPosition, title: state.documentCustomTitle, marks: state.outputAnnotations, images: Object.values(state.images).some((i) => i.originalSrc || i.processedDataUrl) }));
    assert.equal(photo.count, 12);
    assert.equal(photo.paper, "photo_4x6");
    assert.equal(photo.sets, 2);
    assert.equal(photo.margin, 7);
    assert.equal(photo.position, "top");
    assert.equal(photo.title, "");
    assert.deepEqual(photo.marks, []);
    assert.equal(photo.images, false);
    const warnings = await page.evaluate(() => RealScanDocumentTools.layoutWarnings([{ key: "test", w: 210, h: 297, geometry: { x: -2, y: 0, width: 200, height: 297, paperWidth: 210, paperHeight: 297 } }], [{ pages: ["test"], x: 1, y: 1, w: 0.3, h: 0.1, angle: 30 }]));
    assert.equal(warnings.length, 2);
    pass(engine + " photo repeat retains real settings without customer images/title/marks; preflight warns about content and rotated marks outside paper");
    await page.evaluate(() => RealScanDocumentTools.open({ blob: __source339 }));
    await page.waitForFunction(() => !document.querySelector("[data-copy=build]").disabled);
    const old = await page.locator("[data-copy=canvas]").evaluateHandle((c) => c);
    await page.evaluate(() => document.dispatchEvent(new Event("realscan:auth-lock")));
    assert.equal(await page.locator("#documentCopyTools").count(), 0);
    assert(await old.evaluate((c) => c.width === 0 && c.height === 0));
    assert.deepEqual(errors, []);
    await browser.close();
    browser = null;
  }
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify({ version: JSON.parse(fs.readFileSync("dist/version.json")), checks }, null, 2));
})().catch(async (error) => {
  console.error(error);
  for (const context of browser?.contexts() || []) for (const page of context.pages()) await page.screenshot({ path: path.join(out, "failure.png") }).catch(() => {
  });
  process.exitCode = 1;
}).finally(async () => {
  await browser?.close();
  server.close();
});
