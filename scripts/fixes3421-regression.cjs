/* 3.42.1 · Los dos fallos de Paco, fijados como prueba:
   1) «Revisa tu documento» sin botón de imprimir ni de cerrar a la vista:
      las acciones quedan fijas al pie del diálogo, visibles y operativas
      SIN scroll aunque el contenido supere el viewport, con «Imprimir»
      en claro y X de cierre en la cabecera.
   2) El pasaporte no se veía en la mesa: tarjeta propia «Pasaporte» y
      los dos formatos (abierto / 1 página) elegibles ANTES de capturar
      en dos toques, escritorio y móvil. */
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert'), { chromium } = require('playwright');
const root = path.resolve('dist'), out = path.resolve('.audit/fixes3421'); fs.mkdirSync(out, { recursive: true });
const csp = JSON.parse(fs.readFileSync('firebase.json')).hosting[0].headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
const server = http.createServer((req, res) => { const name = new URL(req.url, 'http://local').pathname, file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name)); if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end(); res.setHeader('Content-Security-Policy', csp); res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' })[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); });
const checks = []; function pass(v) { checks.push(v); console.log('PASS ' + v); }
const SEED = () => { if (window !== window.top) return; localStorage.setItem('realscan_welcome_seen_v1', '1'); localStorage.setItem('realscan_auth_v2', JSON.stringify({ users: [{ username: 'admin', passwordHash: 'beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe', role: 'admin', mustChangePassword: false }], currentUsername: 'admin', sessionToken: null, sessionExpiry: 0 })); };
async function login(browser, viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.addInitScript(SEED);
  await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'domcontentloaded' });
  await page.locator('#loginUserInput').fill('admin'); await page.locator('#loginPassInput').fill('PruebaAcceso2026'); await page.locator('#btnLoginSubmit').click();
  await page.locator('#loginOverlay').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => window.RealScanDocuments && window.RealScanDocumentPrint && document.querySelector('[data-task="passport"]'));
  return { context, page, errors };
}
const hit = (page, selector) => page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return false; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!top && (top === el || el.contains(top)); }, selector);

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true });

  // ---- FALLO 2 · escritorio: abierto en 2 toques ----
  {
    const { context, page, errors } = await login(browser, { width: 1366, height: 900 });
    const card = page.locator('[data-task="passport"]');
    assert.equal(await card.count(), 1); assert(await card.isVisible());
    await card.click();
    assert(await page.locator('#passportChoices').isVisible());
    const labels = await page.locator('#passportChoices button').allTextContents();
    assert(labels.some(t => t.includes('Pasaporte abierto')) && labels.some(t => t.includes('Pasaporte (1 página)')), labels.join('|'));
    await page.screenshot({ path: path.join(out, 'mesa-pasaporte-escritorio.png') });
    await page.locator('#passportChoices button').filter({ hasText: 'Pasaporte abierto' }).first().click();
    await page.waitForFunction(() => state.format === 'passport_open');
    const s = await page.evaluate(() => ({ format: state.format, cat: state.activeCategory, captured: Object.values(state.images).some(i => i.originalSrc), pressed: document.querySelector('[data-task="passport"]').getAttribute('aria-pressed') }));
    assert.equal(s.cat, 'docs'); assert.equal(s.captured, false); assert.equal(s.pressed, 'true');
    pass('passport on the desk: «Pasaporte abierto» ready in 2 touches, before capturing (desktop)');
    assert.deepEqual(errors, []); await context.close();
  }
  // ---- FALLO 2 · móvil: 1 página en 2 toques ----
  {
    const { context, page, errors } = await login(browser, { width: 390, height: 844 });
    await page.locator('[data-task="passport"]').click();
    assert(await page.locator('#passportChoices').isVisible());
    await page.screenshot({ path: path.join(out, 'mesa-pasaporte-movil.png') });
    await page.locator('#passportChoices button').filter({ hasText: 'Pasaporte (1 página)' }).first().click();
    await page.waitForFunction(() => state.format === 'passport');
    const s = await page.evaluate(() => ({ cat: state.activeCategory, captured: Object.values(state.images).some(i => i.originalSrc) }));
    assert.equal(s.cat, 'docs'); assert.equal(s.captured, false);
    pass('passport on the desk: «Pasaporte (1 página)» ready in 2 touches, before capturing (mobile)');
    assert.deepEqual(errors, []); await context.close();
  }
  // ---- FALLO 1 · viewport bajo de mostrador (800×600) ----
  {
    const { context, page, errors } = await login(browser, { width: 800, height: 600 });
    await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 1240; c.height = 1754;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1240, 1754); g.fillStyle = '#111'; g.font = '48px sans-serif'; g.fillText('Página de prueba', 80, 120);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const file = new File([blob], 'pagina.png', { type: 'image/png' });
      RealScanDocuments.activate(); await RealScanDocuments.addFiles([file, file, file]);
    });
    for (let i = 0; i < 3; i++) {
      await page.locator('#docPages [data-page-action="Revisar"]').nth(i).click();
      await page.locator('.asset-review [data-review=confirm]').click();
      await page.waitForFunction(() => !RealScanDocuments.status().busy).catch(() => {});
      await page.waitForTimeout(150);
    }
    await page.waitForFunction(() => RealScanDocuments.status().ready);
    const direct = page.locator('#documentDirectPrint');
    if (await direct.count() && await direct.isVisible().catch(() => false)) await direct.click(); else await page.evaluate(() => RealScanDocumentPrint.review());
    await page.waitForFunction(() => { const b = document.getElementById('documentPrintConfirm'); return b && !b.disabled && /preparada/.test(document.getElementById('documentPrintStatus')?.textContent || ''); });
    const geo = await page.evaluate(() => { const d = document.querySelector('#documentPrintReview .counter-dialog'); return { scrollHeight: d.scrollHeight, clientHeight: d.clientHeight }; });
    assert(geo.scrollHeight > geo.clientHeight, 'la condición del fallo: el contenido supera el diálogo ' + JSON.stringify(geo));
    assert.equal(await page.locator('#documentPrintConfirm').textContent(), 'Imprimir');
    assert.equal(await page.locator('#documentPrintConfirm').isDisabled(), false);
    assert(await hit(page, '#documentPrintConfirm'), 'Imprimir debe verse sin scroll');
    assert(await hit(page, '#documentPrintReview [data-close-modal="documentPrintReview"]:not([aria-label])'), 'Volver debe verse sin scroll');
    assert(await hit(page, '#documentPrintReview [data-close-modal="documentPrintReview"][aria-label]'), 'La X debe verse sin scroll');
    assert((await page.locator('#documentPrintConfirm').boundingBox()).height >= 44);
    await page.screenshot({ path: path.join(out, 'revision-acciones-fijas.png') });
    pass('print review at 800×600: content overflows (' + geo.scrollHeight + '>' + geo.clientHeight + ') yet Imprimir/Volver/× are visible without scroll');
    await page.locator('#documentPrintReview [data-close-modal="documentPrintReview"][aria-label]').click();
    await page.waitForFunction(() => document.getElementById('documentPrintReview').classList.contains('hidden'));
    pass('print review: the × in the heading closes the dialog');
    await page.evaluate(() => RealScanDocumentPrint.review());
    await page.waitForFunction(() => { const b = document.getElementById('documentPrintConfirm'); return b && !b.disabled && /preparada/.test(document.getElementById('documentPrintStatus')?.textContent || ''); });
    await page.evaluate(() => { const frame = document.getElementById('realscan_document_print'); window.__printed = false; frame.contentWindow.print = () => { window.__printed = true; frame.contentWindow.dispatchEvent(new Event('afterprint')); }; });
    await page.locator('#documentPrintConfirm').click();
    await page.waitForFunction(() => window.__printed === true);
    await page.waitForFunction(() => document.getElementById('documentPrintReview').classList.contains('hidden'));
    pass('print review: «Imprimir» runs the print and closes the dialog');
    assert.deepEqual(errors, []); await context.close();
  }

  console.log('SUMMARY fixes3421 ' + checks.length + ' PASS');
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
