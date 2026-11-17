/* 3.44 · Vara de diseño transversal, fijada como prueba:
   - un solo acento (índigo #4f46e5) en los primarios de mostrador, modo
     rápido, Archivo y Trabajos, sin degradados en los CTA medidos;
   - móvil: tarjetas de servicio 2×2 con la etiqueta completa y dock
     inferior que no tapa ni corta el resumen;
   - cero texto técnico visible: sin SHA-256/localStorage en Ajustes,
     sin «MB en memoria»/«ppp»/«(s)»/«Paperless #N» en el documento traído;
   - recepción «Subir archivo» (un solo «Archivo»: el centro);
   - Trabajos: en vista Tablero el select «Ver» duplicado desaparece;
   - camino completo: traer copia → revisar → «Imprimir» visible sin scroll.
   Las mediciones de geometría esperan a que el rect medido se asiente
   (lección counter335: nada de sleeps fijos para medir). */
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert'), { chromium } = require('playwright');
const root = path.resolve('dist'), out = path.resolve('.audit/design344'); fs.mkdirSync(out, { recursive: true });
const csp = JSON.parse(fs.readFileSync('firebase.json')).hosting[0].headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
const server = http.createServer((req, res) => { const name = new URL(req.url, 'http://local').pathname, file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name)); if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end(); res.setHeader('Content-Security-Policy', csp); res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); });
const checks = []; function pass(v) { checks.push(v); console.log('PASS ' + v); }
const HASH = 'beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe';
const ACCENT = 'rgb(79, 70, 229)';
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const DOCS = [{ id: 42, title: 'Pasaporte mexicano · libreta completa' }];

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
  if (pdfBytes) await stub(context, pdfBytes);
  const page = await context.newPage(), errors = [], dialogs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', async d => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
  await page.addInitScript(hash => { if (window !== window.top) return; localStorage.setItem('realscan_welcome_seen_v1', '1'); localStorage.setItem('realscan_auth_v2', JSON.stringify({ users: [{ username: 'admin', passwordHash: hash, role: 'admin', mustChangePassword: false }], currentUsername: 'admin', sessionToken: null, sessionExpiry: 0 })); localStorage.setItem('realscan_paperless_token_v1', 'TOKEN_DE_PRUEBA'); }, HASH);
  await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'domcontentloaded' });
  await page.locator('#loginUserInput').fill('admin'); await page.locator('#loginPassInput').fill('PruebaAcceso2026'); await page.locator('#btnLoginSubmit').click();
  await page.locator('#loginOverlay').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => window.RealScanDocuments && window.RealScanArchivo && window.RealScanWorkspacePolish);
  await page.waitForTimeout(600);
  return { context, page, errors, dialogs };
}

/* Espera a que el rect de un selector se quede quieto (3 lecturas iguales). */
async function stableRect(page, selector) {
  await page.waitForFunction(sel => { const r = document.querySelector(sel)?.getBoundingClientRect(); if (!r || !r.width) return false; const k = [r.x, r.y, r.width, r.height].map(Math.round).join(','); if (window.__srk === k) { window.__src = (window.__src || 0) + 1; } else { window.__srk = k; window.__src = 0; } return window.__src >= 3; }, selector, { timeout: 10000, polling: 120 }).catch(() => {});
  return page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right, bg: cs.backgroundColor, bgImage: cs.backgroundImage, display: cs.display, text: el.textContent.trim() }; }, selector);
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true });
  const pdfBytes = await makePdf(browser);

  // ===== E1 · Escritorio: acento único y etiquetas de recepción =====
  {
    const { context, page, errors } = await login(browser, { width: 1366, height: 900 }, null);
    const labels = await page.evaluate(() => [...document.querySelectorAll('#operatorReceiveActions > button')].map(b => b.textContent.trim().replace(/\s+/g, ' ')));
    assert.deepEqual(labels.slice(0, 3), ['Cámara', 'Subir archivo', 'Recibir QR'], 'recepción con un solo significado de Archivo: ' + JSON.stringify(labels));
    assert(!labels.includes('Archivo'), 'ningún botón de recepción se llama ya «Archivo»: ' + JSON.stringify(labels));
    pass('E1 receive row reads Cámara / Subir archivo / Recibir QR');
    await page.locator('#btnNewProject').click();
    await page.locator('#newServiceModal:not(.hidden)').waitFor({ state: 'visible', timeout: 10000 });
    const np = await stableRect(page, '#newServiceStart');
    assert.equal(np.bg, ACCENT, '«Preparar nuevo servicio» en el acento: ' + np.bg);
    assert.equal(np.bgImage, 'none', '«Preparar nuevo servicio» sin degradado: ' + np.bgImage);
    pass('E1 .counter-primary is the single accent, flat (no gradient)');
    await page.locator('#newServiceModal [data-close-modal="newServiceModal"]').first().click();
    await page.locator('[data-task="id"]').click();
    await page.locator('#flowDock:not([hidden])').waitFor({ state: 'visible', timeout: 10000 });
    await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 850; c.height = 540; const x = c.getContext('2d');
      x.fillStyle = '#28418c'; x.fillRect(0, 0, 850, 540); x.fillStyle = '#fff'; x.font = 'bold 40px Arial'; x.fillText('INE', 60, 120);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      await loadBlobIntoSide(new File([blob], 'ine.png', { type: 'image/png' }), 'front', { review: false });
    });
    await page.waitForFunction(() => { const b = document.getElementById('flowPrimary'); return b && !b.disabled; }, null, { timeout: 20000 });
    const fp = await stableRect(page, '#flowPrimary');
    assert.equal(fp.bg, ACCENT, 'el CTA del dock usa el acento: ' + fp.bg);
    const fsText = await page.locator('#flowSummary').textContent();
    assert(!fsText.includes('(s)'), 'el resumen del dock sin plurales perezosos: ' + fsText);
    pass('E1 dock CTA in the single accent and flow summary without «(s)»');
    await page.evaluate(() => RealScanArchivo.open('traer'));
    await page.locator('#archivoHub[open]').waitFor({ state: 'visible', timeout: 10000 });
    const tab = await stableRect(page, '.archivo-tabs button.active');
    assert.equal(tab.bg, ACCENT, 'la pestaña activa de Archivo usa el acento: ' + tab.bg);
    pass('E1 Archivo hub active tab in the single accent');
    await page.evaluate(() => document.getElementById('archivoHub').close());
    assert.deepEqual(errors, [], 'sin errores: ' + errors.join('|'));
    await context.close();
  }

  // ===== E2 · Escritorio: modo rápido — acento y barra de paso ligera =====
  {
    const { context, page, errors } = await login(browser, { width: 1366, height: 900 }, null);
    await page.locator('#workbenchQuick').click();
    await page.locator('#quickMode').waitFor({ state: 'visible', timeout: 10000 });
    const scan = await stableRect(page, '#quickScanBtn');
    assert.equal(scan.bg, ACCENT, 'el CTA de escaneo usa el acento: ' + scan.bg);
    assert.equal(scan.bgImage, 'none', 'el CTA de escaneo sin degradado: ' + scan.bgImage);
    const step = await stableRect(page, '#quickMode .quick-step[data-state="current"]');
    assert.equal(step.bg, ACCENT, 'el paso activo usa el acento: ' + step.bg);
    const svc = await stableRect(page, '#quickMode [data-quick-service][aria-pressed="true"]');
    assert.equal(svc.bg, ACCENT, 'el servicio activo usa el acento: ' + svc.bg);
    const status = await page.evaluate(() => { const el = document.getElementById('quickStatus'); const cs = getComputedStyle(el); return { bg: cs.backgroundColor, text: el.textContent }; });
    assert.equal(status.bg, 'rgba(0, 0, 0, 0)', 'la barra «Paso N de 3» ya no es un bloque oscuro: ' + status.bg);
    pass('E2 quick mode: scan CTA, current step and active service share the single flat accent; step status is a plain text line');
    assert.deepEqual(errors, [], 'sin errores: ' + errors.join('|'));
    await context.close();
  }

  // ===== E3 · Escritorio: Ajustes sin jerga técnica =====
  {
    const { context, page } = await login(browser, { width: 1366, height: 900 }, null);
    await page.evaluate(() => document.getElementById('btnOpenSettings').click());
    await page.locator('#settingsModal:not(.hidden)').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const txt = await page.evaluate(() => document.getElementById('settingsModal')?.textContent || '');
    assert(txt.length > 100, 'Ajustes abierto');
    assert(!txt.includes('SHA-256') && !txt.includes('localStorage'), 'Ajustes sin jerga técnica visible');
    pass('E3 Settings shows no SHA-256/localStorage jargon');
    await context.close();
  }

  // ===== E4 · Escritorio: Trabajos sin filtro duplicado en Tablero =====
  {
    const { context, page } = await login(browser, { width: 1366, height: 900 }, null);
    await page.evaluate(() => RealScanWorkspacePolish.openJobs());
    await page.waitForFunction(() => document.getElementById('workspaceJobsRows')?.dataset.view === 'board', null, { timeout: 10000 });
    const labelBoard = await page.evaluate(() => { const s = document.getElementById('workspaceJobsFilter'); return s ? getComputedStyle(s.closest('label')).display : 'missing'; });
    assert.equal(labelBoard, 'none', 'en Tablero el select «Ver» duplicado no se ve: ' + labelBoard);
    await page.locator('[data-jobs-view="list"]').click();
    await page.waitForFunction(() => document.getElementById('workspaceJobsRows')?.dataset.view === 'list', null, { timeout: 10000 });
    const labelList = await page.evaluate(() => { const s = document.getElementById('workspaceJobsFilter'); return s ? getComputedStyle(s.closest('label')).display : 'missing'; });
    assert.notEqual(labelList, 'none', 'en Lista el select «Ver» sigue disponible: ' + labelList);
    pass('E4 Jobs: duplicate «Ver» select hidden in board view, available in list view');
    await context.close();
  }

  // ===== E5 · Escritorio: camino completo con la copia traída, sin textos internos =====
  {
    const { context, page, dialogs, errors } = await login(browser, { width: 1366, height: 900 }, pdfBytes);
    await page.evaluate(() => RealScanPaperless.openBrowser());
    await page.locator('.nas-result').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.nas-result').first().click();
    await page.locator('#nasSelected:not([hidden])').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('#nasImport').click();
    await page.waitForFunction(() => { const s = RealScanDocuments.status(); return s.active && !s.busy && s.count === 3; }, null, { timeout: 30000 });
    assert.equal(dialogs.length, 0, 'sin diálogos nativos');
    const texts = await page.evaluate(() => ({
      banner: document.getElementById('paperlessOriginBanner')?.textContent || '',
      summary: document.getElementById('docSummary')?.textContent || '',
      geometry: document.getElementById('docGeometry')?.textContent || '',
      workspace: document.getElementById('documentWorkspace')?.textContent || '',
    }));
    assert(texts.banner.includes('Copia de Paperless') && !texts.banner.includes('Paperless #'), 'la banda sin identificador interno: ' + texts.banner.slice(0, 120));
    assert(!texts.summary.includes('(s)') && !texts.summary.includes('MB'), 'el resumen del documento en lenguaje de mostrador: ' + texts.summary);
    assert(texts.geometry.includes('mm') && !texts.geometry.includes('ppp'), 'la geometría conserva el papel en mm y pierde los ppp: ' + texts.geometry);
    assert(!texts.workspace.includes('MB en memoria'), 'el documento no enseña límites internos de memoria');
    pass('E5 imported copy: banner, summary and geometry speak counter language (no ids, no MB, no ppp, no «(s)»)');
    for (let i = 0; i < 3; i++) {
      await page.locator('#docPages [data-page-action="Revisar"]').nth(i).click();
      await page.locator('.asset-review [data-review=confirm]').click();
      await page.waitForFunction(() => !RealScanDocuments.status().busy).catch(() => {});
      await page.waitForTimeout(150);
    }
    await page.waitForFunction(() => RealScanDocuments.status().ready, null, { timeout: 15000 });
    await page.evaluate(() => RealScanDocumentPrint.review());
    await page.waitForFunction(() => { const b = document.getElementById('documentPrintConfirm'); return b && !b.disabled && /preparada/.test(document.getElementById('documentPrintStatus')?.textContent || ''); }, null, { timeout: 20000 });
    const btn = await page.locator('#documentPrintConfirm').boundingBox();
    assert(btn && btn.y >= 0 && btn.y + btn.height <= 900, '«Imprimir» visible sin scroll al revisar: ' + JSON.stringify(btn));
    assert.equal(await page.locator('#documentPrintConfirm').textContent(), 'Imprimir');
    pass('E5 full path: traer copia → revisar → «Imprimir» visible in the first viewport');
    assert.deepEqual(errors, [], 'sin errores: ' + errors.join('|'));
    await context.close();
  }

  // ===== M1 · Móvil: tarjetas 2×2 con etiqueta completa =====
  {
    const { context, page, errors } = await login(browser, { width: 390, height: 844 }, null);
    const geo = await page.evaluate(() => [...document.querySelectorAll('#studioWelcome .operator-task')].map(b => { const r = b.getBoundingClientRect(); const s = b.querySelector('strong'); return { label: s?.textContent.trim(), left: Math.round(r.left), top: Math.round(r.top), h: r.height, trunc: s ? s.scrollWidth > s.clientWidth + 1 : null }; }));
    assert.equal(geo.length, 4, 'cuatro tarjetas de servicio: ' + JSON.stringify(geo));
    const cols = new Set(geo.map(g => g.left)), rows = new Set(geo.map(g => g.top));
    assert.equal(cols.size, 2, 'dos columnas en móvil: ' + JSON.stringify(geo));
    assert.equal(rows.size, 2, 'dos filas en móvil: ' + JSON.stringify(geo));
    assert(geo.every(g => g.trunc === false), 'ninguna etiqueta truncada: ' + JSON.stringify(geo));
    assert(geo.every(g => g.h >= 52), 'suelo táctil de las tarjetas: ' + JSON.stringify(geo));
    assert(geo.some(g => g.label === 'Pasaporte'), 'la tarjeta Pasaporte se lee completa');
    pass('M1 mobile service cards form a 2×2 grid with full labels: ' + geo.map(g => g.label).join(', '));
    assert.deepEqual(errors, [], 'sin errores: ' + errors.join('|'));
    await context.close();
  }

  // ===== M2 · Móvil: el dock no tapa ni corta el resumen =====
  {
    const { context, page } = await login(browser, { width: 390, height: 844 }, null);
    await page.locator('[data-task="id"]').click();
    await page.locator('#flowDock:not([hidden])').waitFor({ state: 'visible', timeout: 10000 });
    const m = await page.evaluate(() => {
      const s = document.getElementById('flowSummary').getBoundingClientRect();
      const r = document.getElementById('receiptOpen')?.getBoundingClientRect();
      const dock = document.getElementById('flowDock').getBoundingClientRect();
      const overlap = r ? !(s.right <= r.left || r.right <= s.left || s.bottom <= r.top || r.bottom <= s.top) : null;
      return { overlap, summaryText: document.getElementById('flowSummary').textContent, dockH: Math.round(dock.height), summaryH: Math.round(s.height) };
    });
    assert.equal(m.overlap, false, 'el resumen y «Comprobante con folio» no se solapan: ' + JSON.stringify(m));
    assert(!m.summaryText.includes('(s)'), 'resumen sin «(s)»: ' + m.summaryText);
    pass('M2 mobile dock: summary on its own line, receipt action clear of it');
    await context.close();
  }

  // ===== E6/M3 · I9 (3.44.1): el semáforo del estudio es UNA línea =====
  async function loadStudioDocument(page) {
    await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 1040; c.height = 736; const x = c.getContext('2d');
      x.fillStyle = '#1f3a7a'; x.fillRect(0, 0, 1040, 736); x.fillStyle = '#f5eeda'; x.fillRect(40, 40, 960, 656);
      x.fillStyle = '#222'; x.font = 'bold 64px Arial'; x.fillText('DOCUMENTO', 90, 150); x.font = '44px Arial'; x.fillText('Página de prueba', 90, 240);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      RealScanDocuments.activate();
      await RealScanDocuments.addFiles([new File([blob], 'prueba.png', { type: 'image/png' })]);
    });
    await page.waitForFunction(() => document.body.dataset.workspaceLoaded === 'true' && RealScanDocuments.status().count === 1 && !RealScanDocuments.status().busy, null, { timeout: 30000 });
  }
  async function semaphoreState(page) {
    await stableRect(page, '#deskSemaphore');
    return page.evaluate(() => {
      const sem = document.getElementById('deskSemaphore');
      const r = sem.getBoundingClientRect();
      const lights = [...sem.querySelectorAll('.desk-light')].map(b => { const br = b.getBoundingClientRect(); const lab = b.querySelector('.desk-light-label'); const lr = lab?.getBoundingClientRect(); return { text: lab?.textContent || '', top: Math.round(br.top), labelH: lr ? Math.round(lr.height) : null }; });
      const refresh = document.getElementById('deskSemaphoreRefresh');
      const rr = refresh?.getBoundingClientRect();
      const ws = document.getElementById('documentWorkspace')?.getBoundingClientRect();
      return {
        blockH: Math.round(r.height), lights,
        refreshVisible: !!rr && rr.height > 0 && getComputedStyle(refresh).display !== 'none',
        pendingInside: sem.contains(document.getElementById('deskPaperlessPending')),
        measurementInside: sem.contains(document.getElementById('deskPrinterMeasurement')),
        semDisplay: getComputedStyle(sem).display,
        workspaceTop: ws ? Math.round(ws.top) : null,
      };
    });
  }
  function assertStudioStrip(st, viewportH, tag) {
    assert(st.blockH <= 64, tag + ': el bloque del estudio mide ≤64 px: ' + st.blockH);
    assert.equal(st.lights.length, 3, tag + ': tres luces');
    assert(st.lights.every(l => Math.abs(l.top - st.lights[0].top) <= 2), tag + ': las tres luces en una sola fila: ' + JSON.stringify(st.lights));
    assert(st.lights.every(l => l.labelH !== null && l.labelH <= 22), tag + ': ninguna etiqueta se parte en dos líneas: ' + JSON.stringify(st.lights));
    assert.deepEqual(st.lights.map(l => l.text), ['Impresora', 'Paperless', 'NAS'], tag + ': etiquetas cortas de la franja: ' + JSON.stringify(st.lights.map(l => l.text)));
    assert.equal(st.refreshVisible, false, tag + ': sin botón «Actualizar» propio en el estudio');
    assert.equal(st.pendingInside, false, tag + ': el aviso de Paperless fuera del bloque');
    assert.equal(st.measurementInside, false, tag + ': la nota de medición fuera del bloque');
    assert(st.workspaceTop !== null && st.workspaceTop < viewportH, tag + ': el trabajo entra en el primer pantallazo: top=' + st.workspaceTop);
  }
  function assertMesaSemaphore(st, tag) {
    assert.equal(st.refreshVisible, true, tag + ': la mesa conserva su botón «Actualizar»');
    assert.equal(st.pendingInside, true, tag + ': en la mesa el aviso de Paperless vive dentro del bloque');
    assert.equal(st.measurementInside, true, tag + ': en la mesa la nota de medición vive dentro del bloque');
    assert(st.lights[0].text.includes('Elegir perfil') || st.lights[0].text.includes('Perfil seleccionado'), tag + ': en la mesa las frases son completas: ' + st.lights[0].text);
    assert(st.lights[2].text.length > 3, tag + ': en la mesa la luz NAS lleva su frase completa: ' + st.lights[2].text);
  }
  {
    const { context, page, errors } = await login(browser, { width: 1366, height: 900 }, pdfBytes);
    assertMesaSemaphore(await semaphoreState(page), 'E6 mesa escritorio');
    pass('E6 counter (mesa) keeps the full semaphore: own refresh button, notes inside, full labels');
    await loadStudioDocument(page);
    assertStudioStrip(await semaphoreState(page), 900, 'E6 estudio escritorio');
    pass('E6 studio semaphore is one line (≤64 px): short labels, no own button, notes below the strip, work in the first viewport');
    // La franja entera es el acceso: tocarla (fuera de las luces) recomprueba sin romper la línea.
    const box = await page.locator('#deskSemaphore').boundingBox();
    await page.mouse.click(box.x + box.width - 4, box.y + box.height / 2);
    await page.waitForTimeout(400);
    assertStudioStrip(await semaphoreState(page), 900, 'E6 estudio tras tocar la franja');
    pass('E6 tapping the strip itself re-checks and the line stays one row');
    assert.deepEqual(errors, [], 'sin errores: ' + errors.join('|'));
    await context.close();
  }
  {
    // E7 · El modo rápido sigue ocultando el semáforo entero (y sus notas)
    // aunque haya trabajo cargado; al salir, la franja del estudio vuelve.
    const { context, page, errors } = await login(browser, { width: 1366, height: 900 }, pdfBytes);
    await loadStudioDocument(page);
    assertStudioStrip(await semaphoreState(page), 900, 'E7 estudio antes del modo rápido');
    await page.locator('#workbenchQuick').click();
    await page.waitForFunction(() => document.body.classList.contains('rs-quick'), null, { timeout: 10000 });
    const quick = await page.evaluate(() => {
      const sem = document.getElementById('deskSemaphore');
      const inside = [document.getElementById('deskPaperlessPending'), document.getElementById('deskPrinterMeasurement')].every(el => sem.contains(el));
      return { display: getComputedStyle(sem).display, notesBackInside: inside };
    });
    assert.equal(quick.display, 'none', 'E7: en modo rápido el semáforo sigue oculto: ' + quick.display);
    assert.equal(quick.notesBackInside, true, 'E7: en modo rápido las notas vuelven dentro del bloque oculto');
    pass('E7 quick mode still hides the whole semaphore (notes back inside) with work loaded');
    await page.locator('#workbenchQuick').click();
    await page.waitForFunction(() => !document.body.classList.contains('rs-quick'), null, { timeout: 10000 });
    assertStudioStrip(await semaphoreState(page), 900, 'E7 estudio tras salir del modo rápido');
    pass('E7 leaving quick mode restores the one-line studio strip');
    assert.deepEqual(errors, [], 'sin errores: ' + errors.join('|'));
    await context.close();
  }
  {
    const { context, page, errors } = await login(browser, { width: 390, height: 844 }, pdfBytes);
    assertMesaSemaphore(await semaphoreState(page), 'M3 mesa móvil');
    pass('M3 counter (mesa) keeps the full semaphore on mobile');
    await loadStudioDocument(page);
    assertStudioStrip(await semaphoreState(page), 844, 'M3 estudio móvil');
    pass('M3 mobile studio semaphore is one line (≤64 px) with unwrapped short labels and no own button');
    assert.deepEqual(errors, [], 'sin errores: ' + errors.join('|'));
    await context.close();
  }

  console.log('design344-regression: ' + checks.length + ' PASS');
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
