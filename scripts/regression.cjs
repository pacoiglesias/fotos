const fs = require("fs"),
  path = require("path"),
  http = require("http"),
  assert = require("assert");
const { chromium } = require("playwright"),
  jsQR = require("jsqr");
const out = path.resolve(".audit/repair-evidence");
fs.mkdirSync(out, { recursive: true });
if (fs.existsSync(path.join(out, "failure.txt")))
  fs.unlinkSync(path.join(out, "failure.txt"));
const root = path.resolve("dist"),
  checks = [],
  errors = [];
const record = (name, data) => {
  checks.push({ name, data });
  console.log("PASS " + name);
  fs.writeFileSync(
    path.join(out, "regression.json"),
    JSON.stringify({ checks, errors }, null, 2),
  );
};
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://localhost"),
    file = path.resolve(
      root,
      "." + (u.pathname === "/" ? "/index.html" : u.pathname),
    );
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (e, b) => {
    if (e) return res.writeHead(404).end();
    const ext = path.extname(file);
    res.setHeader(
      "Content-Type",
      {
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".html": "text/html",
        ".css": "text/css",
        ".json": "application/json",
        ".wasm": "application/wasm",
        ".png": "image/png",
      }[ext] || "application/octet-stream",
    );
    res.end(b);
  });
});
let browser;
(async () => {
  await new Promise((r) => server.listen(5517, "127.0.0.1", r));
  const base = process.env.REALSCAN_URL || "http://127.0.0.1:5517";
  browser = await chromium.launch({
    headless: true,
    ...(process.env.REALSCAN_CHROMIUM
      ? { executablePath: process.env.REALSCAN_CHROMIUM }
      : {}),
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(base, { waitUntil: "load" });
  await page.waitForFunction(
    () => typeof updateUI === "function" && window.pdfjsLib && window.jspdf,
  );
  const servedVersion = await page.evaluate(() =>
    fetch("version.json", { cache: "no-store" }).then((r) => r.json()),
  );
  assert.equal(
    servedVersion.version,
    JSON.parse(fs.readFileSync("dist/version.json")).version,
    "Served build must equal the tested local build",
  );
  await page.evaluate(() => {
    $("loginOverlay").classList.add("hidden");
    document.body.classList.remove("modal-open");
  });
  assert.deepEqual(errors, []);
  record("Fresh browser starts without JavaScript errors");
  const samples = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1800;
    c.height = 1200;
    const ctx = c.getContext("2d");
    const make = (color, label) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "white";
      ctx.font = "bold 140px sans-serif";
      ctx.fillText(label, 180, 650);
      return c.toDataURL("image/jpeg", 0.95);
    };
    return {
      front: make("#bc2525", "FRENTE A"),
      back: make("#2540bc", "REVERSO B"),
    };
  });
  await page.evaluate(async (s) => {
    processRawDataUrl(s.front, "front");
    clearSlot("front");
    await new Promise((r) => setTimeout(r, 120));
    if (state.images.front.originalSrc)
      throw Error("A cleared slot was repopulated");
    processRawDataUrl(s.front, "front");
    processRawDataUrl(s.back, "front");
    await waitForProcessingComplete();
    if (state.images.front.rawOriginalSrc !== s.back)
      throw Error("An older upload replaced the newer upload");
    prepareWorkspaceForJobSwitch({});
    await handleLoadedFile("front", s.front, "front.jpg");
    await handleLoadedFile("back", s.back, "back.jpg");
    updateUI();
  }, samples);
  record("Clear, replace and new-job races preserve the correct images");
  record("Synthetic front and back decode and finish processing");
  const geometry = await page.evaluate(async () => {
    state.activeCategory = "docs";
    state.format = "card";
    state.printMode = "single";
    state.documentPageCount = 1;
    setPrintScale(100);
    const a =
      RealScanLayout.computeDocumentLayout(state).pages[0].placements[0];
    setPrintScale(50);
    const b =
      RealScanLayout.computeDocumentLayout(state).pages[0].placements[0];
    const doc = generatePdfDoc(),
      data = new Uint8Array(doc.output("arraybuffer"));
    const pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false })
        .promise,
      pg = await pdf.getPage(1),
      ops = await pg.getOperatorList();
    const transforms = ops.fnArray.flatMap((fn, i) =>
      fn === pdfjsLib.OPS.transform ? [ops.argsArray[i]] : [],
    );
    return {
      a,
      b,
      pages: pdf.numPages,
      transforms,
      pdf: doc.output("datauristring").split(",")[1],
    };
  });
  assert.equal(geometry.a.widthMm, 85.6);
  assert.equal(geometry.b.widthMm, 42.8);
  assert(
    geometry.transforms.some((t) => Math.abs(t[0] - (42.8 * 72) / 25.4) < 0.01),
  );
  fs.writeFileSync(
    path.join(out, "card-50-percent.pdf"),
    Buffer.from(geometry.pdf, "base64"),
  );
  delete geometry.pdf;
  record("Scale changes layout AND actual PDF image transform", geometry);
  const outputs = await page.evaluate(async () => {
    const files = [];
    for (const format of ["png", "jpg", "pdf"]) {
      const f = await createDigitalFile("front", format, "600");
      const blob = await (await fetch(f.dataUrl)).blob();
      let dims = null;
      if (format !== "pdf") {
        const im = await createImageBitmap(blob);
        dims = { w: im.width, h: im.height };
        im.close();
      }
      files.push({ type: f.type, name: f.name, size: f.size, dims });
    }
    return files;
  });
  assert.equal(outputs[0].type, "image/png");
  assert.equal(outputs[1].type, "image/jpeg");
  assert.equal(outputs[2].type, "application/pdf");
  assert.equal(Math.max(outputs[0].dims.w, outputs[0].dims.h), 600);
  record("PNG/JPEG/PDF delivery formats and 600 px limit", outputs);
  const qr = await page.evaluate(() => {
    const c = document.createElement("canvas");
    RealScanQrSync.renderQrToCanvas(
      "https://example.org/test#o=owner&s=" + "a".repeat(64),
      c,
      5,
    );
    return {
      w: c.width,
      h: c.height,
      data: Array.from(
        c.getContext("2d").getImageData(0, 0, c.width, c.height).data,
      ),
    };
  });
  const decoded = jsQR(new Uint8ClampedArray(qr.data), qr.w, qr.h);
  assert.equal(
    decoded?.data,
    "https://example.org/test#o=owner&s=" + "a".repeat(64),
  );
  record("Generated QR decodes with independent jsQR decoder");
  const policy = await page.evaluate(async () => {
    switchCategory("photos");
    selectFormat("photo_visa_usa");
    await waitForProcessingComplete();
    setFilter("front", "bw");
    adjustSlotLight("front", "brightness", 15);
    let rejected = false;
    try {
      await createDigitalFile("front", "png", "600");
    } catch (e) {
      rejected = true;
    }
    const f = await createDigitalFile("front", "jpg", "600");
    return {
      filter: state.images.front.filter,
      brightness: state.images.front.brightness,
      pngRejected: rejected,
      type: f.type,
      size: f.size,
    };
  });
  assert.equal(policy.filter, "color");
  assert.equal(policy.brightness, 0);
  assert(policy.pngRejected);
  assert.equal(policy.type, "image/jpeg");
  assert(policy.size <= 240000);
  record(
    "Visa digital profile enforces color, JPEG and file-size limits",
    policy,
  );
  const persistent = await page.evaluate(async () => {
    state.activeCategory = "photos";
    state.format = Object.keys(FORMAT_SPECS).find(
      (k) => FORMAT_SPECS[k].category === "photos",
    );
    state.mixTwoPhotos = true;
    state.photoCopies = 8;
    state.photoCopiesPersonA = 3;
    state.photoCopiesPersonB = 5;
    state.outputScalePercent = 75;
    state.images.front.cropData = { x: 4, y: 5, width: 400, height: 500 };
    state.images.front.warpQuad = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 500 },
      { x: 0, y: 500 },
    ];
    state.images.front.croppedSrc = state.images.front.originalSrc;
    state.images.front.isCropApplied = true;
    const scan = await saveScanToStorage("Synthetic regression", 0);
    prepareWorkspaceForJobSwitch({});
    await restoreScanToApp(scan.id);
    const restored = {
      a: state.photoCopiesPersonA,
      b: state.photoCopiesPersonB,
      scale: state.outputScalePercent,
      crop: state.images.front.cropData,
    };
    const preset = saveUserPreset("Synthetic 3A5B");
    state.photoCopiesPersonA = 1;
    state.photoCopiesPersonB = 1;
    applyUserPreset(preset.id);
    const presetResult = {
      a: state.photoCopiesPersonA,
      b: state.photoCopiesPersonB,
      scale: state.outputScalePercent,
    };
    await saveActiveDraft();
    await new Promise((r) => setTimeout(r, 1000));
    const draft = getActiveDraft();
    const backup = JSON.parse(JSON.stringify(scan));
    backup.id = "backup-synthetic";
    await importScansFromJson(
      new File([JSON.stringify([backup])], "backup.json", {
        type: "application/json",
      }),
    );
    const imported = (await getAllScansFromStorage()).find(
      (x) => x.id === "backup-synthetic",
    );
    return {
      restored,
      presetResult,
      draft: { a: draft.photoCopiesPersonA, b: draft.photoCopiesPersonB },
      imported: {
        a: imported.photoCopiesPersonA,
        b: imported.photoCopiesPersonB,
        crop: imported.pages[0].cropData,
        warp: imported.pages[0].warpQuad,
      },
    };
  });
  assert.equal(persistent.restored.a, 3);
  assert.equal(persistent.restored.b, 5);
  assert.equal(persistent.restored.scale, 75);
  assert.equal(persistent.presetResult.a, 3);
  assert.equal(persistent.draft.b, 5);
  assert.equal(persistent.imported.a, 3);
  assert(persistent.imported.crop && persistent.imported.warp);
  record(
    "Project, preset, draft and imported backup preserve 3A/5B and crops",
    persistent,
  );
  const backupEvent = page.waitForEvent('download');
  await page.locator('#dailyBackup').click();
  const backupDownload = await backupEvent;
  const backupPath = path.join(out, 'daily-backup.json');
  await backupDownload.saveAs(backupPath);
  const savedBackup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const beforeVerify = await page.evaluate(async () => (await getAllScansFromStorage()).length);
  await page.locator('#dailyBackupFile').setInputFiles(backupPath);
  await page.waitForFunction(() => document.getElementById('dailyCareStatus').textContent.includes('Respaldo verificado:'));
  assert.equal(await page.evaluate(async () => (await getAllScansFromStorage()).length), beforeVerify);
  const restoreContext = await browser.newContext({serviceWorkers: 'block'});
  const restorePage = await restoreContext.newPage();
  await restorePage.goto(base);
  await restorePage.waitForFunction(() => typeof inspectBackupFile === 'function' && typeof updateUI === 'function');
  const restoredBackup = await restorePage.evaluate(async (backup) => {
    const file = new File([JSON.stringify(backup)], 'backup.json');
    const inspected = await inspectBackupFile(file);
    const result = await importScansFromJson(file);
    const records = await getAllScansFromStorage();
    const count = records.length;
    const valid = JSON.parse(JSON.stringify(records[0])); valid.id = 'valid-before-corrupt';
    const corrupt = JSON.parse(JSON.stringify(valid)); corrupt.id = 'corrupt'; corrupt.pages[0].dataUrl = 'data:image/jpeg;base64,YmFk';
    await importScansFromJson(new File([JSON.stringify([valid, corrupt])], 'corrupt.json'));
    if ((await getAllScansFromStorage()).length !== count) throw Error('Corrupt restore wrote partial data');
    const blobRecord = JSON.parse(JSON.stringify(valid)); blobRecord.pages[0].originalSrc = 'blob:https://example.org/nonportable';
    let blobRejected = false;
    try { await validateBackupRecords([blobRecord]); } catch (_) { blobRejected = true; }
    const add = IDBObjectStore.prototype.add;
    let calls = 0;
    IDBObjectStore.prototype.add = function(record) {
      if (++calls === 2) { this.transaction.abort(); throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); }
      return add.call(this, record);
    };
    try {
      const second = JSON.parse(JSON.stringify(valid)); second.id = 'second-rollback';
      await importScansFromJson(new File([JSON.stringify([valid, second])], 'rollback.json'));
    } finally { IDBObjectStore.prototype.add = add; }
    if ((await getAllScansFromStorage()).length !== count) throw Error('Failed transaction was not rolled back');
    let oversizeRejected = false;
    try { await inspectBackupFile({size: BACKUP_MAX_BYTES + 1}); } catch (_) { oversizeRejected = true; }
    return { inspected, imported: result.imported, count, blobRejected, oversizeRejected, rollbackCalls: calls };
  }, savedBackup);
  assert.equal(restoredBackup.count, savedBackup.count);
  assert.equal(restoredBackup.imported, savedBackup.count);
  assert(restoredBackup.blobRejected && restoredBackup.oversizeRejected);
  assert.equal(restoredBackup.rollbackCalls, 2);
  await restoreContext.close();
  record('Downloaded backup verifies without mutation, restores on a fresh browser, rejects corruption and rolls back failed writes', restoredBackup);
  const calibration = await page.evaluate(async () => {
    const originalPaper = state.paperSize, originalScale = state.outputScalePercent;
    const results = [];
    for (const paper of ['a4', 'letter', 'oficio', 'legal']) {
      state.paperSize = paper;
      state.outputScalePercent = 50;
      const doc = createCalibrationDocument();
      const bytes = doc.output('arraybuffer');
      const parsed = await pdfjsLib.getDocument({data: new Uint8Array(bytes)}).promise;
      const pdfPage = await parsed.getPage(1);
      const text = (await pdfPage.getTextContent()).items.map(x => x.str).join(' ');
      const raw = doc.internal.pages[1].join('\n');
      const rects = Array.from(raw.matchAll(/(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+re/g), m => [Math.abs(Number(m[3])) * 25.4 / 72, Math.abs(Number(m[4])) * 25.4 / 72]);
      results.push({paper, width: pdfPage.view[2] * 25.4 / 72, height: pdfPage.view[3] * 25.4 / 72, rects, labels: text.includes('85.60 x 53.98') && text.includes('35 x 45')});

    }
    state.paperSize = originalPaper;
    state.outputScalePercent = originalScale;
    return results;
  });
  for (const result of calibration) {
    assert(result.labels);
    assert(result.rects.some(([w,h]) => Math.abs(w-85.6)<0.001 && Math.abs(h-53.98)<0.001));
    assert(result.rects.some(([w,h]) => Math.abs(w-35)<0.001 && Math.abs(h-45)<0.001));
    if(result.paper === 'oficio') assert(Math.abs(result.height-340)<0.001);
  }
  const calibrationEvent = page.waitForEvent('download');
  await page.locator('#dailyCalibration').click();
  const calibrationDownload = await calibrationEvent;
  await calibrationDownload.saveAs(path.join(out, 'calibration.pdf'));
  assert(fs.readFileSync(path.join(out,'calibration.pdf')).subarray(0,4).toString() === '%PDF');
  record('Calibration PDF has actual card and photo dimensions on all four paper sizes, independent of project scale', calibration);
  const clean = await page.evaluate(async () => {
    switchCategory("docs");
    selectFormat("card");
    state.printMode = "both";
    state.documentPageCount = 2;
    state.outputScalePercent = 100;
    state.mixTwoPhotos = false;
    state.images.front.showMmGrid = false;
    renderProcessedImage("front");
    await waitForProcessingComplete();
    const a = state.images.front.processedDataUrl;
    state.images.front.showMmGrid = true;
    renderProcessedImage("front");
    await waitForProcessingComplete();
    return {
      clean: a === state.images.front.processedDataUrl,
      previewGrid: !!document.querySelector(
        "#faithfulSheetPlacements .preview-only",
      ),
    };
  });
  assert(clean.clean && clean.previewGrid);
  record(
    "Measurement guides stay visible in preview without changing exported pixels",
  );
  const pdf = await page.evaluate(async () => {
    const doc = new jspdf.jsPDF({
      unit: "mm",
      format: [90, 60],
      orientation: "landscape",
    });
    doc.setFillColor(190, 30, 30);
    doc.rect(0, 0, 90, 60, "F");
    doc.text("ONE", 20, 30);
    doc.addPage([90, 60], "landscape");
    doc.setFillColor(30, 30, 190);
    doc.rect(0, 0, 90, 60, "F");
    doc.text("TWO", 20, 30);
    const data =
      "data:application/pdf;base64," +
      doc.output("datauristring").split(",")[1];
    const file = {
      id: "synthetic-pdf",
      name: "two-pages.pdf",
      type: "application/pdf",
      dataUrl: data,
      size: Math.floor(data.split(",")[1].length * 0.75),
    };
    RealScanQrSync.addReceivedFile(file);
    await RealScanQrSync.assignFileToSlot(file.id, "front");
    return {
      data,
      assigned: RealScanQrSync.getInboxFiles().find((f) => f.id === file.id)
        .assignedTo,
      thumbnails: $("pdfThumbnailsGrid").children.length,
    };
  });
  assert.equal(pdf.assigned, null);
  assert.equal(pdf.thumbnails, 2);
  await page
    .locator("#pdfThumbnailsGrid > div")
    .nth(1)
    .getByRole("button", { name: "Página 3", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      RealScanQrSync.getInboxFiles().find((f) => f.id === "synthetic-pdf")
        ?.assignedTo === "page3",
  );
  record(
    "Multipage PDF stays pending until a selected page finishes in the chosen slot",
  );
  await page.evaluate(() => {
    state.documentPageCount = 2;
    state.printMode = "both";
    updateUI();
  });
  await page.screenshot({
    path: path.join(out, "desktop.png"),
    fullPage: true,
  });
  const desktop = await page.evaluate(() => ({
    sheetWidth: document.querySelector(".a4-sheet").getBoundingClientRect()
      .width,
    frontWidth: document
      .querySelector("#faithfulSheetPlacements img")
      .getBoundingClientRect().width,
  }));
  const mobile = [];
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const step of [1, 2, 3]) {
      await page.evaluate((s) => setMobileStep(s), step);
      const d = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hud: $("floatingHudBar").getBoundingClientRect().toJSON(),
      }));
      mobile.push({ step, ...d });
      assert(
        d.scrollWidth <= width,
        `overflow ${width}/${step}: ${d.scrollWidth}`,
      );
      if (width === 390)
        await page.screenshot({
          path: path.join(out, "mobile-" + step + ".png"),
          fullPage: true,
        });
    }
  }
  record("All mobile steps fit 360/390/768 px", mobile);
  const audio = await page.evaluate(() => {
    const slider = $("rangeAudioVolume");
    slider.value = "0";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    return {
      volume: state.audioVolume,
      label: $("labelAudioVolume").textContent,
    };
  });
  assert.equal(audio.volume, 0);
  record("Audio slider zero remains silent", audio);
  const measuredMobile = mobile.find((m) => m.width === 390 && m.step === 1);
  fs.writeFileSync(
    ".audit/results.json",
    JSON.stringify(
      {
        buildVersion: JSON.parse(fs.readFileSync("dist/version.json")).version,
        desktop,
        mobile: {
          viewport: 390,
          width: measuredMobile.scrollWidth,
          hud: measuredMobile.hud,
        },
        errors,
      },
      null,
      2,
    ),
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.goto(base + "/phone-upload.html");
  await context.setOffline(true);
  await page.goto(base + "/");
  await page.waitForFunction(
    () => typeof updateUI === "function" && window.pdfjsLib,
  );
  assert.equal(await page.locator("#btnSendFiles").count(), 0);
  record("Phone navigation cannot replace the offline application");
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  record("No uncaught JavaScript errors in core regression");
  if (process.env.REALSCAN_TEST_RELAY === "1") {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => {
      $("loginOverlay").classList.add("hidden");
      document.body.classList.remove("modal-open");
    });
    const session = await page.evaluate(() =>
      RealScanQrSync.createReceiveSession(),
    );
    const phoneContext = await browser.newContext({ serviceWorkers: "block" }),
      phone = await phoneContext.newPage();
    phone.on("pageerror", (e) => errors.push(e.message));
    await phone.goto(session.url);
    await phone.waitForFunction(
      () =>
        document
          .getElementById("transferStatus")
          ?.textContent.includes("Sesión activa"),
      {},
      { timeout: 30000 },
    );
    await phone
      .locator("#fileInput")
      .setInputFiles({
        name: "synthetic-phone.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from(samples.front.split(",")[1], "base64"),
      });
    await phone.waitForFunction(
      () => !document.getElementById("btnSendFiles").disabled,
    );
    await phone.locator("#btnSendFiles").click();
    await phone.waitForFunction(
      () => !document.getElementById("successBox").classList.contains("hidden"),
      {},
      { timeout: 40000 },
    );
    assert.equal(
      await page.evaluate(() => RealScanQrSync.getInboxFiles().length),
      1,
    );
    record(
      "Real Firebase upload acknowledged across independent browser storage",
    );
    await phone.locator("#btnSendMore").click();
    await phone
      .locator("#fileInput")
      .setInputFiles({
        name: "same.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from(samples.front.split(",")[1], "base64"),
      });
    await phone.waitForFunction(
      () => !document.getElementById("btnSendFiles").disabled,
    );
    await phone.locator("#btnSendFiles").click();
    await phone.waitForFunction(
      () => !document.getElementById("successBox").classList.contains("hidden"),
    );
    assert.equal(
      await page.evaluate(() => RealScanQrSync.getInboxFiles().length),
      1,
    );
    record("Retry of the same image does not duplicate the inbox");
    await page.evaluate(() => RealScanQrSync.revokeReceiveSession());
    const denied = await phone.evaluate(async () => {
      try {
        await RealScanRelay.readSession("receive");
        return false;
      } catch (e) {
        return true;
      }
    });
    assert(denied);
    record("Revoked receive session rejected by Firebase rules");
    await page.evaluate(async (s) => {
      await handleLoadedFile("front", s.front, "front.jpg");
    }, samples);
    const delivery = await page.evaluate(async () => {
      const file = await createDigitalFile("front", "png", "600");
      return RealScanQrSync.createDeliverySession([file], {});
    });
    await phone.goto(delivery.url);
    await phone.waitForSelector("a[download]", { timeout: 30000 });
    assert.equal(await phone.locator("a[download]").count(), 1);
    record("Real digital delivery opens on an independent browser");
    await page.evaluate(() => RealScanQrSync.revokeDeliverySession());
    await phone.waitForFunction(
      () => !document.querySelector("a[download]"),
      {},
      { timeout: 15000 },
    );
    record("Revocation removes active download links on the phone");
    await phoneContext.close();
  }
  assert.deepEqual(errors, []);
  record("Regression completed", { checks: checks.length, errors });
  if (process.env.REALSCAN_TEST_RELAY === "1")
    fs.copyFileSync(
      path.join(out, "regression.json"),
      path.join(out, "live-regression.json"),
    );
})()
  .catch((e) => {
    console.error(e);
    fs.writeFileSync(path.join(out, "failure.txt"), e.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    server.close();
  });
