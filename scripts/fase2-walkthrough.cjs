/* RealScan 3.32.0 fase 2 — recorrido en emulación iPhone (Chromium).
   Sirve dist/ (nuevo) y before-dist-3310/ (3.31.0) en puertos distintos,
   recorre los flujos nuevos y el modo rápido, y guarda capturas en walk2/.
   Solo local: el QR se prueba con un relay simulado, sin Firebase. */
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert');
const {chromium, devices} = require('playwright');
const repo = path.resolve(__dirname, '..');
const out = path.resolve(__dirname, '../../walk2');
fs.mkdirSync(out, {recursive: true});
function serve(rootDir, port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(rootDir, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(rootDir + path.sep)) return res.writeHead(403).end();
    res.setHeader('Content-Type', ({'.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm'})[path.extname(file)] || 'application/octet-stream');
    fs.readFile(file, (e, data) => e ? res.writeHead(404).end() : res.end(data));
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r(server)));
}
const checks = [];
const pass = name => { checks.push(name); console.log('PASS ' + name); };
const shot = async (page, name) => { await page.screenshot({path: path.join(out, name), fullPage: true}).catch(() => {}); };
async function login(page) {
  await page.addInitScript(() => {
    localStorage.getItem('realscan_auth_v2') || localStorage.setItem('realscan_auth_v2', JSON.stringify({users: [{username: 'admin', passwordHash: 'beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe', role: 'admin', mustChangePassword: false}], currentUsername: 'admin', sessionToken: null, sessionExpiry: 0}));
  });
  await page.goto(page.__base);
  await page.waitForFunction(() => typeof updateUI === 'function' && window.pdfjsLib);
  await page.locator('#loginUserInput').fill('admin');
  await page.locator('#loginPassInput').fill('PruebaAcceso2026');
  await page.locator('#btnLoginSubmit').click();
  await page.locator('#loginOverlay').waitFor({state: 'hidden'});
}
async function seed(page, kind) {
  await page.evaluate((kind) => {
    const mk = (draw) => { const c = document.createElement('canvas'); c.width = 1000; c.height = 640; const x = c.getContext('2d'); draw(x, c); return c.toDataURL('image/jpeg', 0.92); };
    const card = (x, px, py, pw, ph, base, text) => {
      x.fillStyle = base; x.fillRect(px, py, pw, ph);
      x.fillStyle = '#222'; x.fillRect(px + 20, py + 20, 90, 110);
      x.fillStyle = '#fff'; x.font = 'bold 28px sans-serif'; x.fillText(text, px + 130, py + 60);
      x.fillStyle = '#333'; for (let t = 0; t < 3; t++) x.fillRect(px + 130, py + 90 + t * 36, pw - 160, 10);
    };
    const twoCards = mk((x) => {
      x.fillStyle = '#efe9dc'; x.fillRect(0, 0, 1000, 640);
      card(x, 40, 90, 430, 280, '#0f766e', 'FRENTE');
      card(x, 530, 90, 430, 280, '#1e3a8a', 'REVERSO');
    });
    const single = (text) => mk((x) => {
      x.fillStyle = '#efe9dc'; x.fillRect(0, 0, 1000, 640);
      card(x, 120, 120, 760, 400, '#0f766e', text);
    });
    const blurry = (() => {
      const src = document.createElement('canvas'); src.width = 1000; src.height = 640;
      const sx = src.getContext('2d'); sx.fillStyle = '#efe9dc'; sx.fillRect(0, 0, 1000, 640);
      card(sx, 120, 120, 760, 400, '#0f766e', 'BORROSA');
      const big = document.createElement('canvas'); big.width = 1000; big.height = 640;
      const bx = big.getContext('2d'); bx.filter = 'blur(12px)'; bx.drawImage(src, 0, 0);
      return big.toDataURL('image/jpeg', 0.92);
    })();
    const set = (side, url) => Object.assign(state.images[side], {originalSrc: url, processedDataUrl: url, naturalWidth: 1000, naturalHeight: 640, isCropApplied: true});
    const clear = (side) => Object.assign(state.images[side], {originalSrc: null, processedDataUrl: null, naturalWidth: 0, naturalHeight: 0});
    if (kind === 'both') { set('front', single('FRENTE')); set('back', single('REVERSO')); }
    if (kind === 'bothB') { set('front', single('FRENTE B')); set('back', single('REVERSO B')); }
    if (kind === 'bothC') { set('front', single('FRENTE C')); set('back', single('REVERSO C')); }
    if (kind === 'frontTwoCards') { set('front', twoCards); clear('back'); }
    if (kind === 'frontBlurry') { set('front', blurry); set('back', single('REVERSO')); }
    updateUI(); RealScanJourney.update(); RealScanStudio.update();
  }, kind);
  await page.waitForFunction(() => !!state.images.front.processedDataUrl);
}
(async () => {
  const beforeDir = path.resolve(__dirname, '../../before-dist-3310');
  const servers = [await serve(path.join(repo, 'dist'), 5530)];
  if (fs.existsSync(beforeDir)) servers.push(await serve(beforeDir, 5531));
  const browser = await chromium.launch({headless: true});
  const iphone = devices['iPhone 13'] || {viewport: {width: 390, height: 844}, deviceScaleFactor: 3, isMobile: true, hasTouch: true};
  const errors = [];
  try {
    // ---- ANTES (3.31.0): mostrador sin semáforo y entrega legacy ----
    if (servers.length > 1) {
      const ctx = await browser.newContext({...iphone, serviceWorkers: 'block'});
      const page = await ctx.newPage();
      page.on('pageerror', e => errors.push('before: ' + e.message));
      page.on('dialog', d => d.accept());
      page.__base = 'http://127.0.0.1:5531';
      await login(page);
      await page.waitForTimeout(800);
      await shot(page, 'before-desk.png');
      assert.equal(await page.locator('#deskSemaphore').count(), 0);
      await seed(page, 'both');
      await page.locator('#btnOpenDeliveryModal').click();
      await page.locator('#digitalDeliveryModal').waitFor({state: 'visible'});
      await shot(page, 'before-delivery-legacy.png');
      await page.keyboard.press('Escape');
      await ctx.close();
      pass('Antes 3.31.0: sin semáforo y con entrega legacy (capturas guardadas)');
    }
    // ---- DESPUÉS (3.32.0) ----
    const ctx = await browser.newContext({...iphone, serviceWorkers: 'block'});
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    page.__base = 'http://127.0.0.1:5530';
    await login(page);
    await page.waitForTimeout(800);
    // F1 semáforo
    await page.locator('#deskSemaphore').waitFor({state: 'visible'});
    const lights = await page.locator('#deskSemaphore .desk-light').allInnerTexts();
    assert(lights.some(t => t.includes('Impresora')) && lights.some(t => t.includes('Paperless')) && lights.some(t => t.includes('NAS')));
    // La captura del semáforo va ANTES de cargar trabajo: al cargar, el
    // semáforo se recoge igual que el encabezado del mostrador.
    await shot(page, 'after-desk-semaphore.png');
    // E2 visa + A3 sellos junto a la hoja (tras cargar trabajo)
    assert(await page.locator('#deskVisa').count() >= 1, 'preset Visa USA en mostrador');
    await seed(page, 'both');
    await page.waitForTimeout(600);
    assert(await page.locator('[data-flow-format="photo_visa_usa"]').count() >= 1, 'tamaño Visa USA en el flujo');
    assert(await page.locator('#sheetQuickStamps').count() >= 1, 'sellos rápidos junto a la hoja');
    pass('Semáforo del mostrador, Visa USA de un toque y sellos junto a la hoja');
    // A1 diálogo único: hoja + caras + botones
    await page.locator('#btnOpenDeliveryModal').click();
    await page.locator('.pdf-delivery-dialog').waitFor({state: 'visible'});
    await page.waitForFunction(() => !document.getElementById('pdfDeliveryDownload').disabled);
    const assetOptions = await page.locator('#pdfDeliveryAsset option').allInnerTexts();
    assert(assetOptions.some(t => t.includes('Hoja preparada')) && assetOptions.some(t => t.includes('Frente')) && assetOptions.some(t => t.includes('Reverso')));
    for (const btn of ['#pdfDeliveryDownload', '#pdfDeliveryQr', '#pdfDeliveryWhatsapp', '#pdfDeliveryPaperless', '#pdfDeliveryArchive']) assert(await page.locator(btn).count() === 1, btn + ' presente');
    await shot(page, 'after-delivery-dialog.png');
    // Cara JPG individual
    await page.locator('#pdfDeliveryAsset').selectOption('side:front');
    await page.locator('#pdfDeliveryBuild').click();
    await page.waitForFunction(() => !document.getElementById('pdfDeliveryDownload').disabled);
    assert(await page.locator('#pdfDeliveryPhoto').isVisible());
    // QR con relay simulado + revocar
    await page.evaluate(() => {
      window.__relay = {calls: 0, revokes: 0};
      RealScanRelay.create = async () => { __relay.calls++; return {id: 'WALK', url: location.origin + '/phone-upload.html#walk', expiresAt: Date.now() + 900000, status: 'waiting'}; };
      RealScanRelay.revoke = async () => { __relay.revokes++; };
      RealScanRelay.clearFiles = async () => {};
    });
    await page.locator('#pdfDeliveryQr').click();
    await page.waitForFunction(() => !document.getElementById('pdfDeliveryQrResult').hidden);
    assert((await page.locator('#pdfDeliveryQrCanvas').evaluate(c => c.width)) > 0);
    await page.locator('#pdfDeliveryRevoke').click();
    await page.waitForFunction(() => document.getElementById('pdfDeliveryQrResult').hidden && __relay.revokes >= 1);
    await page.keyboard.press('Escape');
    pass('Diálogo único: hoja PDF, caras JPG, QR con revocar, WhatsApp, Paperless y Archivar');
    // D calidad: frente borrosa avisa antes de imprimir
    await seed(page, 'frontBlurry');
    await page.evaluate(() => handlePrintDirect());
    await page.locator('#outputReviewModal').waitFor({state: 'visible'});
    await page.waitForFunction(() => [...document.querySelectorAll('.output-review-warning')].some(p => p.textContent.includes('borrosa')), null, {timeout: 20000});
    assert(await page.locator('#btnReviewDuplex').count() === 1, 'botón dúplex en revisión');
    assert(await page.locator('#btnReviewClientScreen').count() === 1, 'botón pantalla cliente en revisión');
    await shot(page, 'after-review-blurry.png');
    await page.locator('#outputReviewModal [data-close-modal]').click();
    pass('Aviso de foto borrosa antes de imprimir; botones dúplex y pantalla de cliente en la revisión');
    // D mismo documento: OCR simulado con CURP distintas -> aviso; iguales -> sin aviso
    // (variante B para no chocar con la caché de OCR del seed anterior)
    await seed(page, 'bothB');
    await page.evaluate(() => {
      window.RealScanOcr.recognizeText = async (url) => ({text: url === state.images.front.originalSrc ? 'CURP ABCD123456HDFXXX01' : 'CURP WXYZ987654MDFYYY02'});
    });
    await page.evaluate(() => handlePrintDirect());
    await page.locator('#outputReviewModal').waitFor({state: 'visible'});
    await page.waitForFunction(() => [...document.querySelectorAll('.output-review-warning')].some(p => p.textContent.includes('documentos distintos')), null, {timeout: 20000});
    await page.locator('#outputReviewModal [data-close-modal]').click();
    await seed(page, 'bothC');
    await page.evaluate(() => {
      window.RealScanOcr.recognizeText = async () => ({text: 'CURP ABCD123456HDFXXX01'});
    });
    await page.evaluate(() => handlePrintDirect());
    await page.locator('#outputReviewModal').waitFor({state: 'visible'});
    await page.waitForTimeout(3000);
    assert(!(await page.evaluate(() => [...document.querySelectorAll('.output-review-warning')].some(p => p.textContent.includes('documentos distintos')))), 'sin falso aviso con la misma CURP');
    pass('Verificación mismo documento: avisa solo cuando las CURP difieren');
    // C6 pantalla para el cliente (solo su trabajo + cierre)
    if(!await page.locator('#printReviewMoreActions').evaluate(e=>e.open))await page.locator('#printReviewMoreActions > summary').click();await page.locator('#btnReviewClientScreen').click();
    await page.locator('#clientScreen').waitFor({state: 'visible'});
    assert.equal(await page.locator('#clientScreen #btnClientApprove').count(), 0);
    assert.equal(await page.locator('#clientScreen #btnClientRepeat').count(), 0);
    assert(await page.locator('#clientScreen #btnClientScreenClose').isVisible());
    await shot(page, 'after-client-screen.png');
    await page.locator('#btnClientScreenClose').click();
    pass('Pantalla para el cliente: solo su trabajo y un cierre');
    // E3 dúplex guiado: con both_separate el botón se muestra y abre el asistente
    await page.evaluate(() => { state.printMode = 'both_separate'; updateUI(); });
    await page.evaluate(() => handlePrintDirect());
    await page.locator('#outputReviewModal').waitFor({state: 'visible'});
    await page.waitForFunction(() => !document.getElementById('btnReviewDuplex').classList.contains('hidden'));
    if(!await page.locator('#printReviewMoreActions').evaluate(e=>e.open))await page.locator('#printReviewMoreActions > summary').click();await page.locator('#btnReviewDuplex').click();
    await page.locator('#duplexAssistantModal').waitFor({state: 'visible'});
    await page.locator('#duplexAssistantModal [data-close-modal]').first().click();
    pass('Dúplex guiado desde la revisión abre el asistente');
    // B par INE manual: foto con dos caras -> dividir
    await seed(page, 'frontTwoCards');
    await page.waitForTimeout(800);
    await page.locator('#inePairSplitBtn').waitFor({state: 'visible'});
    await page.locator('#inePairSplitBtn').click();
    await page.locator('#inePairSplitDialog').waitFor({state: 'visible'});
    await shot(page, 'after-ine-pair-split.png');
    await page.locator('#inePairSplitCancel').click();
    pass('Par INE manual: botón dividir y diálogo de separación visibles');
    // F2 cola: guardar, código visible, abrir por código
    await seed(page, 'both');
    await page.evaluate(() => RealScanJobQueue.saveCurrent('Prueba recorrido'));
    await page.evaluate(() => RealScanJobQueue.open());
    await page.locator('#jobQueueModal').waitFor({state: 'visible'});
    await page.waitForFunction(() => !!document.querySelector('.queue-code'));
    const code = await page.locator('.queue-code').first().innerText();
    assert(/Código: [0-9A-F]{8}/.test(code), 'código corto visible: ' + code);
    const prefix = code.replace('Código: ', '').slice(0, 4);
    await page.locator('#jobQueueCode').fill(prefix);
    await page.waitForFunction(() => document.querySelectorAll('.queue-card').length >= 1);
    await page.locator('#jobQueueOpenCode').click();
    await page.locator('#jobQueueModal').waitFor({state: 'hidden'});
    pass('Cola: código corto visible y recuperación por código');
    // Modo rápido intacto
    await page.locator('#workbenchQuick').waitFor({state: 'visible'});
    await page.locator('#workbenchQuick').click();
    await page.locator('#quickMode').waitFor({state: 'visible'});
    // Con el trabajo completo retomado de la cola, el modo rápido muestra
    // Imprimir/Guardar; con huecos vacíos mostraría el botón gigante.
    assert(await page.locator('#quickScanBtn').isVisible() || await page.locator('#quickPrintBtn').isVisible());
    assert(await page.locator('#quickSlotFront').isVisible() && await page.locator('#quickSlotBack').isVisible());
    await shot(page, 'after-quickmode.png');
    pass('Modo rápido intacto: pantalla, huecos y entrega');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({checks, errors}, null, 2));
    console.log('WALK2 OK: ' + checks.length + ' comprobaciones');
    await ctx.close();
  } catch (e) {
    console.error(e);
    console.error(errors);
    try { const ctxs = browser.contexts(); for (const c of ctxs) for (const p of c.pages()) await p.screenshot({path: path.join(out, 'failure.png')}).catch(() => {}); } catch (_) {}
    process.exitCode = 1;
  } finally {
    await browser.close();
    for (const s of servers) s.close();
  }
})();
