/* RealScan Pro — Prueba del fondo blanco con IA en el dispositivo.
   Independiente de scripts/verify.cjs. Sirve dist/ y comprueba en
   Chromium y WebKit:
   (a) foto sintética de «persona» (fondo variado con degradado y rayas,
       cabeza y torso, prenda de color parecido al fondo),
   (b) «Fondo blanco» aplicado por la vía real de la app (botón
       [data-whitebg] -> toggleWhiteBackground -> pipeline de render),
   (c) esquinas blancas (>=250), torso NO blanco, borde sin halo grueso
       y render procesado con el tamaño del spec activo,
   (d) con vendor/segment/* bloqueado, el respaldo por inundación
       funciona y el flujo no se rompe,
   (e) la preparación sin conexión registra segment:true en status().
   Evidencia: capturas y metrics.json en .audit/fondo-ia/. */
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..', 'dist');
const outDir = path.resolve(__dirname, '..', '.audit', 'fondo-ia');
fs.mkdirSync(outDir, { recursive: true });
const MIME = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.gz': 'application/gzip', '.tflite': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (e, b) => { if (e) return res.writeHead(404).end(); res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream'); res.end(b); });
});
const PORT = 5577, BASE = 'http://127.0.0.1:' + PORT + '/';

/* Figura «persona» dibujada en la propia página. varied=true: fondo con
   degradado, rayas diagonales y bloques; varied=false: pared uniforme
   (caso para el respaldo por inundación). La camiseta (#2e7d8c) repite el
   color del fondo en su esquina superior izquierda a propósito. */
const FIXTURE_JS = `
window.makePerson = function makePerson(varied) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 800;
  const x = c.getContext('2d');
  if (varied) {
    const g = x.createLinearGradient(0, 0, 640, 800);
    g.addColorStop(0, '#2e7d8c'); g.addColorStop(.55, '#7fb069'); g.addColorStop(1, '#e0a458');
    x.fillStyle = g; x.fillRect(0, 0, 640, 800);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 26;
    for (let i = -800; i < 640; i += 90) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 800, 800); x.stroke(); }
    x.fillStyle = '#8c5a2e'; x.fillRect(40, 620, 180, 120);
    x.fillStyle = '#37474f'; x.fillRect(430, 90, 150, 110);
  } else {
    x.fillStyle = '#d8cfbc'; x.fillRect(0, 0, 640, 800);
  }
  x.fillStyle = '#263238'; x.fillRect(245, 560, 60, 190); x.fillRect(335, 560, 60, 190);
  x.fillStyle = '#2e7d8c';
  x.beginPath(); x.moveTo(320, 300);
  x.bezierCurveTo(210, 300, 185, 380, 195, 470); x.lineTo(205, 575); x.lineTo(435, 575); x.lineTo(445, 470);
  x.bezierCurveTo(455, 380, 430, 300, 320, 300); x.fill();
  x.fillStyle = '#c68863'; x.fillRect(180, 330, 28, 190); x.fillRect(432, 330, 28, 190);
  x.fillRect(300, 255, 40, 55);
  x.beginPath(); x.arc(320, 205, 62, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#3e2723'; x.beginPath(); x.arc(320, 190, 64, Math.PI, Math.PI * 2); x.fill(); x.fillRect(256, 185, 128, 18);
  return c.toDataURL('image/png');
}
window.loadIntoApp = function loadIntoApp(src) {
  $('loginOverlay').classList.add('hidden'); document.body.classList.remove('modal-open');
  Object.assign(state, { activeCategory: 'photos', format: 'photo_infantil', mixTwoPhotos: false });
  Object.assign(state.images.front, {
    rawOriginalSrc: src, originalSrc: src, processedDataUrl: src,
    naturalWidth: 640, naturalHeight: 800, rotation: 0, zoom: 1, panX: 0, panY: 0,
    fitMode: 'fit', filter: 'color', brightness: 0, contrast: 0,
    whiteBg: false, whiteBgAiSrc: null, whiteBgAiFor: null
  });
  updateSidePreview('front');
}
async function sampleImageImpl(dataUrl) {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const W = cv.width, H = cv.height;
  const px = (x, y) => { const d = cx.getImageData(Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y)), 1, 1).data; return [d[0], d[1], d[2]]; };
  const minCh = p => Math.min(p[0], p[1], p[2]);
  // Halo: en la banda del torso, fuera del contorno (3-8 px) casi todo
  // debe ser blanco; un halo grueso dejaría color de fondo ahí.
  let bandTotal = 0, bandBad = 0;
  for (let y = Math.round(H * 0.40); y < Math.round(H * 0.68); y += 6) {
    let xl = -1, xr = -1;
    for (let x = 0; x < W; x++) { if (minCh(px(x, y)) < 245) { xl = x; break; } }
    for (let x = W - 1; x >= 0; x--) { if (minCh(px(x, y)) < 245) { xr = x; break; } }
    if (xl < 10 || xr < 0) continue;
    for (let x = xl - 8; x <= xl - 3; x++) { bandTotal++; if (minCh(px(x, y)) < 245) bandBad++; }
    for (let x = xr + 3; x <= xr + 8; x++) { bandTotal++; if (minCh(px(x, y)) < 245) bandBad++; }
  }
  return {
    width: W, height: H,
    corners: [px(4, 4), px(W - 5, 4), px(4, H - 5), px(W - 5, H - 5)],
    torso: px(Math.round(W / 2), Math.round(H * 0.55)),
    head: px(Math.round(W / 2), Math.round(H * 0.27)),
    haloBandBadRatio: bandTotal ? Math.round((bandBad / bandTotal) * 1000) / 1000 : 1
  };
};
window.sampleImage = sampleImageImpl;
`;

async function runBrowser(name, launcher) {
  const metrics = { browser: name };
  const browser = await launcher.launch({ headless: true });
  try {
    // ---------- (a)+(b)+(c) Vía IA ----------
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    const pageErrors = [], consoleErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 240)); });
    await page.goto(BASE);
    await page.waitForFunction(() => typeof window.toggleWhiteBackground === 'function' && typeof window.createAiWhiteBackground === 'function');
    await page.evaluate('(() => {' + FIXTURE_JS + ' window.loadIntoApp(window.makePerson(true)); })()');
    const t0 = Date.now();
    // Clic sobre el botón real (su listener de app.js); el hit-test de
    // Playwright choca con las capas fijas de la app, así que se pulsa el
    // elemento, que dispara exactamente el mismo handler.
    await page.evaluate(() => document.querySelector('button[data-whitebg="front"]').click());
    await page.waitForFunction(() => !!state.images.front.whiteBgAiSrc, null, { timeout: 90000 });
    await page.waitForFunction(() => window.waitForProcessingComplete ? true : true);
    await page.evaluate(() => window.waitForProcessingComplete(20000));
    metrics.aiMs = Date.now() - t0;
    const ai = await page.evaluate(async () => {
      const spec = getActiveSpec();
      return {
        whiteBg: state.images.front.whiteBg,
        aiForMatchesOriginal: state.images.front.whiteBgAiFor === state.images.front.originalSrc,
        segmenterReady: window.RealScanSegmenter.isReady(),
        stats: window.RealScanSegmenter.lastStats(),
        expectedDims: [Math.round(spec.widthMm / 25.4 * window.TARGET_DPI), Math.round(spec.heightMm / 25.4 * window.TARGET_DPI)],
        base: await window.sampleImage(state.images.front.whiteBgAiSrc),
        processed: await window.sampleImage(state.images.front.processedDataUrl)
      };
    });
    metrics.ai = ai;
    assert.equal(ai.whiteBg, true, 'whiteBg debe quedar activo');
    assert.equal(ai.aiForMatchesOriginal, true, 'whiteBgAiFor debe ligar la IA a la foto original');
    assert.equal(ai.segmenterReady, true, 'el segmentador IA debe estar listo');
    assert.ok(ai.stats && ai.stats.foregroundRatio > 0.05 && ai.stats.foregroundRatio < 0.6, 'ratio de persona creíble: ' + JSON.stringify(ai.stats));
    for (const c of ai.base.corners) assert.ok(Math.min(...c) >= 250, 'esquina de la base IA no blanca: ' + c);
    assert.ok(Math.min(...ai.base.torso) < 200, 'el torso no debe ser blanco: ' + ai.base.torso);
    assert.ok(ai.base.haloBandBadRatio <= 0.05, 'halo grueso en el borde: ' + ai.base.haloBandBadRatio);
    assert.deepEqual([ai.processed.width, ai.processed.height], ai.expectedDims, 'el render procesado debe tener el tamaño del spec');
    for (const c of ai.processed.corners) assert.ok(Math.min(...c) >= 250, 'esquina del procesado no blanca: ' + c);
    assert.ok(Math.min(...ai.processed.torso) < 200, 'el torso del procesado no debe ser blanco: ' + ai.processed.torso);
    await page.screenshot({ path: path.join(outDir, name + '-ia.png'), fullPage: false });

    // Deshacer / rehacer conservan el estado del fondo blanco con IA.
    const undo = await page.evaluate(async () => {
      handleSlotUndo('front');
      await window.waitForProcessingComplete(20000);
      const afterUndo = { whiteBg: state.images.front.whiteBg, ai: !!state.images.front.whiteBgAiSrc };
      handleSlotRedo('front');
      await window.waitForProcessingComplete(20000);
      return { afterUndo, afterRedo: { whiteBg: state.images.front.whiteBg, ai: !!state.images.front.whiteBgAiSrc } };
    });
    metrics.undoRedo = undo;
    assert.equal(undo.afterUndo.whiteBg, false, 'deshacer debe quitar el fondo blanco');
    assert.equal(undo.afterRedo.whiteBg, true, 'rehacer debe restaurar el fondo blanco');
    assert.equal(undo.afterRedo.ai, true, 'rehacer debe restaurar el resultado IA');

    // Comparación con pulsación larga: muestra la original y al soltar vuelve.
    const compare = await page.evaluate(async () => {
      const btn = document.querySelector('[data-slot-thumb="front"]');
      const img = btn && btn.querySelector('img');
      if (!btn || !img) return { skipped: true };
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await new Promise(r => setTimeout(r, 600));
      const during = img.getAttribute('src');
      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
      return { duringIsOriginal: during === state.images.front.originalSrc, afterIsProcessed: img.getAttribute('src') === state.images.front.processedDataUrl };
    });
    metrics.longPressCompare = compare;
    if (!compare.skipped) {
      assert.equal(compare.duringIsOriginal, true, 'la pulsación larga debe mostrar la original');
      assert.equal(compare.afterIsProcessed, true, 'al soltar debe volver la procesada');
    }
    metrics.pageErrors = pageErrors;
    metrics.consoleErrors = consoleErrors.filter(t => !/TensorFlow Lite|mediapipe|Graph successfully/i.test(t));
    assert.deepEqual(pageErrors, [], 'sin errores de página en la vía IA');
    await ctx.close();

    // ---------- (d) Fallback por inundación con vendor/segment bloqueado ----------
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page2 = await ctx2.newPage();
    const pageErrors2 = [], consoleErrors2 = [];
    page2.on('pageerror', e => pageErrors2.push(e.message));
    page2.on('console', m => { if (m.type() === 'error') consoleErrors2.push(m.text().slice(0, 240)); });
    await page2.route('**/vendor/segment/**', route => route.abort());
    await page2.goto(BASE);
    await page2.waitForFunction(() => typeof window.toggleWhiteBackground === 'function');
    await page2.evaluate('(() => {' + FIXTURE_JS + ' window.loadIntoApp(window.makePerson(false)); })()');
    await page2.evaluate(() => document.querySelector('button[data-whitebg="front"]').click());
    await page2.waitForFunction(() => state.images.front.whiteBg === true, null, { timeout: 30000 });
    await page2.evaluate(() => window.waitForProcessingComplete(20000));
    const fb = await page2.evaluate(async () => ({
      whiteBg: state.images.front.whiteBg,
      aiSrc: state.images.front.whiteBgAiSrc,
      processed: await window.sampleImage(state.images.front.processedDataUrl)
    }));
    metrics.fallback = fb;
    assert.equal(fb.whiteBg, true, 'el fallback debe activar el fondo blanco');
    assert.equal(fb.aiSrc, null, 'con segment bloqueado no debe haber resultado IA');
    for (const c of fb.processed.corners) assert.ok(Math.min(...c) >= 250, 'esquina del fallback no blanca: ' + c);
    assert.ok(Math.min(...fb.processed.torso) < 200, 'el torso del fallback no debe ser blanco: ' + fb.processed.torso);
    assert.deepEqual(pageErrors2, [], 'sin errores de página en el fallback');
    metrics.fallbackPageErrors = pageErrors2;
    metrics.fallbackConsoleErrors = consoleErrors2;
    await page2.screenshot({ path: path.join(outDir, name + '-fallback.png'), fullPage: false });
    await ctx2.close();

    // ---------- (e) Preparación sin conexión: grupo SEGMENT ----------
    if (name === 'chromium') {
      const ctx3 = await browser.newContext();
      const page3 = await ctx3.newPage();
      page3.on('pageerror', e => metrics.offlinePageErrors = (metrics.offlinePageErrors || []).concat(e.message));
      await page3.goto(BASE);
      await page3.waitForFunction(() => !!window.RealScanOffline);
      const offline = await page3.evaluate(async () => {
        const res = await window.RealScanOffline.prepare(() => {});
        const st = await window.RealScanOffline.status();
        return { prepare: res, status: st };
      });
      metrics.offline = offline;
      assert.equal(offline.status.segment, true, 'status() debe exponer segment:true tras preparar');
      assert.equal(offline.status.exports, true, 'status() debe mantener exports:true');
      await ctx3.close();
    }
    metrics.ok = true;
  } catch (e) {
    metrics.ok = false;
    metrics.error = String(e && e.message || e);
    throw e;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(outDir, 'metrics-' + name + '.json'), JSON.stringify(metrics, null, 2));
  }
  return metrics;
}

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const all = {};
  try {
    all.chromium = await runBrowser('chromium', chromium);
    all.webkit = await runBrowser('webkit', webkit);
    fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(all, null, 2));
    console.log(JSON.stringify({
      chromium: { aiMs: all.chromium.aiMs, stats: all.chromium.ai.stats, offline: all.chromium.offline && all.chromium.offline.status },
      webkit: { aiMs: all.webkit.aiMs, stats: all.webkit.ai.stats }
    }, null, 2));
    console.log('FONDO IA OK (chromium + webkit)');
  } finally {
    server.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
