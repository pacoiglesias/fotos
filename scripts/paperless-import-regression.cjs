/* 3.43 · Traer del NAS/Paperless y abrir la copia, fijado como prueba:
   el camino completo con un PDF de 3 páginas por las DOS puertas
   (buscador clásico y explorador/bandeja) afirma:
   - cero diálogos nativos (confirm) en todo el camino;
   - al abrir, el usuario aterriza VIENDO las páginas: miniatura en el
     viewport, grande, y vista previa grande fuera de la ayuda plegable;
   - el trabajo previo queda conservado en «Trabajos»;
   - la copia queda en la bandeja «Por revisar» como En revisión y con
     su banda de origen visible sobre el documento;
   - las acciones de entrega están presentes en la misma pantalla. */
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert'), { chromium } = require('playwright');
const root = path.resolve('dist'), out = path.resolve('.audit/paperless-import'); fs.mkdirSync(out, { recursive: true });
const csp = JSON.parse(fs.readFileSync('firebase.json')).hosting[0].headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
const server = http.createServer((req, res) => { const name = new URL(req.url, 'http://local').pathname, file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name)); if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end(); res.setHeader('Content-Security-Policy', csp); res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); });
const checks = []; function pass(v) { checks.push(v); console.log('PASS ' + v); }
const HASH = 'beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe';
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const DOCS = [{ id: 42, title: 'Pasaporte mexicano · libreta completa' }, { id: 43, title: 'Acta de nacimiento · copia' }];

async function makePdf(browser) {
  const page = await browser.newPage();
  const imgs = await page.evaluate(() => {
    const out = [];
    for (let n = 1; n <= 3; n++) {
      const c = document.createElement('canvas'); c.width = 1040; c.height = 736; const x = c.getContext('2d');
      x.fillStyle = ['#7a1f1f', '#1f3a7a', '#1f7a4d'][n - 1]; x.fillRect(0, 0, 1040, 736);
      x.fillStyle = '#f5eeda'; x.fillRect(40, 40, 960, 656); x.fillStyle = '#222'; x.font = 'bold 64px Arial'; x.fillText('DOCUMENTO', 90, 150);
      x.font = '44px Arial'; x.fillText('Página ' + n + ' de 3', 90, 240);
      out.push(c.toDataURL('image/jpeg', .9));
    }
    return out;
  });
  const html = imgs.map((src, i) => `<div style="width:125mm;height:88mm;page-break-after:${i < 2 ? 'always' : 'auto'};margin:0"><img src="${src}" style="width:125mm;height:88mm;display:block"></div>`).join('');
  await page.setContent(`<html><head><style>@page{size:125mm 88mm;margin:0}body{margin:0}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const pdf = await page.pdf({ width: '125mm', height: '88mm', printBackground: true, preferCSSPageSize: true });
  await page.close();
  return pdf;
}

async function stub(ctx, pdfBytes) {
  await ctx.route('https://paperless.iglesiasmurrieta.com/**', route => {
    const url = new URL(route.request().url()), p = url.pathname;
    const json = obj => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(obj) });
    if (p === '/api/tags/') return json({ count: 1, next: null, results: [{ id: 5, name: 'Personal' }] });
    if (p === '/api/document_types/') return json({ count: 1, next: null, results: [{ id: 8, name: 'Identificación' }] });
    if (p === '/api/correspondents/') return json({ count: 1, next: null, results: [{ id: 1, name: 'Paco Iglesias' }] });
    const m = p.match(/^\/api\/documents\/(\d+)\/(download|preview|thumb)\/$/);
    if (m) {
      if (m[2] === 'thumb') return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG_1PX });
      return route.fulfill({ status: 200, contentType: 'application/pdf', headers: { 'access-control-allow-origin': '*' }, body: pdfBytes });
    }
    if (p === '/api/documents/') return json({ count: DOCS.length, next: null, results: DOCS.map(d => ({ id: d.id, title: d.title, created: '2026-01-15T10:00:00', correspondent: 1, document_type: 8, tags: [5], content: 'contenido de prueba' })) });
    return route.fulfill({ status: 404, body: 'nf' });
  });
}

async function login(browser, viewport, pdfBytes) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await stub(context, pdfBytes);
  const page = await context.newPage(), errors = [], dialogs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', async d => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
  await page.addInitScript(hash => { if (window !== window.top) return; localStorage.setItem('realscan_welcome_seen_v1', '1'); localStorage.setItem('realscan_auth_v2', JSON.stringify({ users: [{ username: 'admin', passwordHash: hash, role: 'admin', mustChangePassword: false }], currentUsername: 'admin', sessionToken: null, sessionExpiry: 0 })); localStorage.setItem('realscan_paperless_token_v1', 'TOKEN_DE_PRUEBA'); }, HASH);
  await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'domcontentloaded' });
  await page.locator('#loginUserInput').fill('admin'); await page.locator('#loginPassInput').fill('PruebaAcceso2026'); await page.locator('#btnLoginSubmit').click();
  await page.locator('#loginOverlay').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => window.RealScanDocuments && window.RealScanPaperlessImport && window.RealScanPaperlessExplore);
  await page.waitForTimeout(700);
  return { context, page, errors, dialogs };
}

async function waitDoc(page, count = 3) {
  await page.waitForFunction(n => { const s = RealScanDocuments.status(); return s.active && !s.busy && s.count === n; }, count, { timeout: 30000 });
  // El aterrizaje termina con scrolls encadenados (recorrido + asiento):
  // se espera a que el scroll se quede quieto antes de medir, para que
  // la medición sea la del estado final y no la de un frame intermedio.
  await page.waitForFunction(() => { const y = scrollY; if (window.__lastY === y) { window.__stable = (window.__stable || 0) + 1; } else { window.__stable = 0; window.__lastY = y; } return window.__stable >= 3; }, null, { timeout: 10000, polling: 120 }).catch(() => {});
  // Y la primera miniatura quieta: el contenido puede crecer sin que
  // cambie scrollY (imágenes que terminan de decodificar).
  await page.waitForFunction(() => { const r = document.querySelector('#docPages .document-page img')?.getBoundingClientRect(); if (!r) return false; const k = Math.round(r.top) + 'x' + Math.round(r.width); if (window.__lastT === k) { window.__stableT = (window.__stableT || 0) + 1; } else { window.__stableT = 0; window.__lastT = k; } return window.__stableT >= 3; }, null, { timeout: 10000, polling: 120 }).catch(() => {});
  await page.waitForTimeout(250);
}
async function landing(page, minThumb) {
  return page.evaluate(min => {
    const thumb = document.querySelector('#docPages .document-page img');
    const tr = thumb?.getBoundingClientRect();
    const prev = document.querySelector('#docPreview img');
    const pr = prev?.getBoundingClientRect();
    const details = document.querySelector('#docPreview')?.closest('details');
    const banner = document.getElementById('paperlessOriginBanner');
    const br = banner?.getBoundingClientRect();
    return {
      thumbEnViewport: !!tr && tr.bottom > 0 && tr.top < innerHeight && tr.width >= min,
      thumbW: tr ? Math.round(tr.width) : 0,
      previewExiste: !!prev,
      previewFueraDeAyuda: !!prev && (!details || details.open),
      previewEnViewport: !!pr && pr.bottom > 0 && pr.top < innerHeight,
      bannerVisible: !!banner && !!br && br.height > 0,
      bannerTexto: banner?.textContent || '',
      workspaceTop: Math.round(document.getElementById('documentWorkspace').getBoundingClientRect().top),
      entregaVisible: !!document.querySelector('#documentWorkspace #documentDirectPrint, #documentWorkspace [data-workspace-deliver="print"]'),
    };
  }, minThumb);
}
function assertLanding(m, etiqueta, { movil = false } = {}) {
  assert(m.thumbEnViewport, etiqueta + ': la primera miniatura debe verse en el viewport y ser grande: ' + JSON.stringify(m));
  assert(m.previewExiste && m.previewFueraDeAyuda, etiqueta + ': la vista previa grande debe existir fuera de la ayuda plegada: ' + JSON.stringify(m));
  assert(m.previewEnViewport || movil, etiqueta + ': la vista previa debe asomar en el viewport: ' + JSON.stringify(m));
  assert(m.bannerVisible && m.bannerTexto.includes('Copia de Paperless'), etiqueta + ': la banda de origen debe verse: ' + JSON.stringify(m));
  assert(m.entregaVisible, etiqueta + ': las acciones de entrega deben estar en la misma pantalla: ' + JSON.stringify(m));
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true });
  const pdfBytes = await makePdf(browser);
  assert(pdfBytes.length > 1000, 'PDF de prueba generado');

  // ===== S1 · Buscador clásico, CON trabajo previo (INE en curso) =====
  {
    const { context, page, dialogs, errors } = await login(browser, { width: 1366, height: 900 }, pdfBytes);
    await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 850; c.height = 540; const x = c.getContext('2d');
      x.fillStyle = '#28418c'; x.fillRect(0, 0, 850, 540); x.fillStyle = '#fff'; x.font = 'bold 40px Arial'; x.fillText('INE EN CURSO', 60, 120);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      await loadBlobIntoSide(new File([blob], 'ine.png', { type: 'image/png' }), 'front', { review: false });
    });
    await page.waitForFunction(() => state.images.front.processedDataUrl && !RealScanWorkflow.describe().busy, null, { timeout: 20000 });
    await page.evaluate(() => RealScanPaperless.openBrowser());
    await page.locator('.nas-result').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.nas-result').first().click();
    await page.locator('#nasSelected:not([hidden])').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('#nasImport').click();
    await waitDoc(page);
    assert.equal(dialogs.length, 0, 'sin diálogos nativos: ' + dialogs.join(' | '));
    pass('S1 classic browser: opening a copy fires NO native dialog even with a job in progress');
    const queue = await page.evaluate(async () => (await RealScanJobQueue.list()).map(r => ({ kind: r.kind, title: r.title })));
    assert(queue.some(r => r.kind === 'id'), 'el INE en curso debe quedar en Trabajos: ' + JSON.stringify(queue));
    pass('S1 previous INE job is auto-saved to Trabajos before the switch: ' + JSON.stringify(queue));
    const tray = await page.evaluate(() => JSON.parse(localStorage.getItem('realscan_review_tray_v1') || '[]'));
    assert(tray.some(t => t.key === 'paperless:42' && t.status === 'en-revision'), 'la copia queda en la bandeja como En revisión: ' + JSON.stringify(tray));
    pass('S1 copy lands in the review tray as En revisión with its Paperless origin');
    const m = await landing(page, 140);
    assertLanding(m, 'S1');
    pass('S1 landing shows the pages (thumb ' + m.thumbW + 'px in viewport, big preview out of the help fold, origin banner, delivery actions)');
    assert.equal(errors.length, 0, 'sin errores de página: ' + errors.join(' | '));
    await context.close();
  }

  // ===== S2 · Explorador §9: «Traer y abrir ahora» en un toque =====
  {
    const { context, page, dialogs } = await login(browser, { width: 1366, height: 900 }, pdfBytes);
    await page.evaluate(() => RealScanPaperlessExplore.openExplore());
    await page.locator('.explore-card').first().waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('.explore-card').first().click();
    await page.locator('#paperlessExplore [data-a="detail"]:not([hidden])').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#paperlessExplore .explore-bring-open').click();
    await waitDoc(page);
    assert.equal(dialogs.length, 0, 'sin diálogos nativos: ' + dialogs.join(' | '));
    const m = await landing(page, 140);
    assertLanding(m, 'S2');
    pass('S2 explorer «Traer y abrir ahora»: one tap from detail to visible pages, no native dialog, origin banner on the document');
    await context.close();
  }

  // ===== S3 · Explorador §9: traer a la bandeja y abrir desde ella =====
  {
    const { context, page, dialogs } = await login(browser, { width: 1366, height: 900 }, pdfBytes);
    await page.evaluate(() => RealScanPaperlessExplore.openExplore());
    await page.locator('.explore-card').first().waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('.explore-card').first().click();
    await page.locator('#paperlessExplore [data-a="detail"]:not([hidden])').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#paperlessExplore [data-a="detail"] button', { hasText: 'Traer a la bandeja' }).click();
    await page.locator('#reviewTray').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#reviewTray button', { hasText: 'Abrir y revisar ahora' }).first().click();
    await waitDoc(page);
    assert.equal(dialogs.length, 0, 'sin diálogos nativos: ' + dialogs.join(' | '));
    const m = await landing(page, 140);
    assertLanding(m, 'S3');
    pass('S3 tray «Abrir y revisar ahora»: same no-wall path and visual landing as the classic browser');
    await context.close();
  }

  // ===== S4 · Móvil: buscador clásico sin trabajo previo =====
  {
    const { context, page, dialogs } = await login(browser, { width: 390, height: 844 }, pdfBytes);
    await page.evaluate(() => RealScanPaperless.openBrowser());
    await page.locator('.nas-result').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.nas-result').first().click();
    await page.locator('#nasSelected:not([hidden])').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('#nasImport').click();
    await waitDoc(page);
    assert.equal(dialogs.length, 0, 'sin diálogos nativos: ' + dialogs.join(' | '));
    const m = await landing(page, 100);
    assertLanding(m, 'S4', { movil: true });
    assert(m.previewEnViewport || m.thumbEnViewport, 'en móvil se ve la previa o la primera miniatura sin bajar: ' + JSON.stringify(m));
    pass('S4 mobile: copy opens with pages on screen (' + m.thumbW + 'px thumbs), no native dialog');
    await context.close();
  }

  // ===== S5 · Abrir OTRA copia con un documento ya abierto: el anterior se conserva =====
  {
    const { context, page, dialogs } = await login(browser, { width: 1366, height: 900 }, pdfBytes);
    await page.evaluate(() => RealScanPaperless.openBrowser());
    await page.locator('.nas-result').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.nas-result').first().click();
    await page.locator('#nasSelected:not([hidden])').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('#nasImport').click();
    await waitDoc(page);
    await page.evaluate(() => RealScanPaperless.openBrowser());
    await page.locator('.nas-result').nth(1).waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.nas-result').nth(1).click();
    await page.locator('#nasSelected:not([hidden])').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('#nasImport').click();
    await waitDoc(page);
    assert.equal(dialogs.length, 0, 'sin diálogos nativos: ' + dialogs.join(' | '));
    const queue = await page.evaluate(async () => (await RealScanJobQueue.list()).map(r => ({ kind: r.kind, title: r.title })));
    assert(queue.some(r => r.kind === 'document'), 'el documento anterior debe quedar en Trabajos: ' + JSON.stringify(queue));
    const banner = await page.evaluate(() => document.getElementById('paperlessOriginBanner')?.textContent || '');
    assert(banner.includes('Acta de nacimiento'), 'la banda muestra el origen de la copia nueva: ' + banner);
    pass('S5 opening a second copy auto-saves the open document to Trabajos and the banner follows the new copy');
    await context.close();
  }

  console.log('paperless-import-regression: ' + checks.length + ' PASS');
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
