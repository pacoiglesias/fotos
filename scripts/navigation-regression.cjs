const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert');
const {chromium} = require('playwright');
const root = path.resolve('dist'), checks = [];
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + (new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  res.setHeader('Content-Type', ({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm'})[path.extname(file)] || 'application/octet-stream');
  fs.readFile(file, (error, bytes) => error ? res.writeHead(404).end() : res.end(bytes));
});
let browser;
const pass = name => { checks.push(name); console.log('PASS ' + name); };
(async () => {
  await new Promise(resolve => server.listen(5519, '127.0.0.1', resolve));
  browser = await chromium.launch({headless:true,...(process.env.REALSCAN_CHROMIUM ? {executablePath:process.env.REALSCAN_CHROMIUM} : {})});
  const context = await browser.newContext({serviceWorkers:'block', viewport:{width:1440,height:1000}}), page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  // v3.12.0: ya no hay PIN de fábrica; se siembra una cuenta de prueba
  // (hash SHA-256 de "PruebaAcceso2026", clave elegida solo para la suite).
  await page.addInitScript(() => {
    localStorage.getItem('realscan_auth_v2')||localStorage.setItem('realscan_auth_v2', JSON.stringify({ users: [{ username: 'admin', passwordHash: 'beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe', role: 'admin', mustChangePassword: false }], currentUsername: 'admin', sessionToken: null, sessionExpiry: 0 }));
  });
  await page.goto(process.env.REALSCAN_URL || 'http://127.0.0.1:5519');
  await page.waitForFunction(() => typeof updateUI === 'function' && window.pdfjsLib && typeof ensureJsPdf === 'function');
  await page.locator('#loginUserInput').fill('admin');
  await page.locator('#loginPassInput').fill('PruebaAcceso2026');
  await page.locator('#btnLoginSubmit').click();
  await page.locator('#loginOverlay').waitFor({state:'hidden'});
  const duplicates = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll('[id]')).map(e => e.id);
    return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  });
  assert.deepEqual(duplicates, []);
  pass('Real login succeeds and all controls and dialogs have unique IDs');
  await page.evaluate(() => {
    window.__relay = {calls:0, revokes:0, mode:'normal'};
    RealScanRelay.create = async function(kind, files, onFile) {
      __relay.calls++;
      if (__relay.mode === 'slow') await new Promise(resolve => { __relay.resolve = resolve; });
      if (__relay.mode === 'error') throw Object.assign(new Error('private-client.jpg #s=PRIVATE_TOKEN data:image/jpeg;base64,PRIVATE_IMAGE'), {code:'auth/network-request-failed'});
      return {id:'SYNTHETIC',url:location.origin + '/phone-upload.html#synthetic',expiresAt:Date.now()+900000,status:'waiting'};
    };
    RealScanRelay.revoke = async () => { __relay.revokes++; };
    RealScanRelay.clearFiles = async () => {};
  });
  async function receive() {
    await page.locator('#btnOpenReceiveModal').click();
    await page.waitForFunction(() => document.getElementById('receiveConnectionStatus').textContent.includes('Listo para recibir'));
  }
  async function unlocked() {
    // El diálogo único de entrega exige un trabajo cargado; aquí solo se
    // comprueba que no quedan modales ni bloqueos tras cada cierre.
    assert.equal(await page.evaluate(() => !!document.getElementById('btnOpenDeliveryModal').closest('[inert]')), false);
    assert.equal(await page.evaluate(() => modalFocusStack.length), 0);
  }
  await receive();
  for (let i=0;i<5;i++) {
    await page.locator('#btnRenewReceiveSession').click();
    await page.waitForFunction(() => !document.getElementById('btnRenewReceiveSession').disabled);
    assert.equal(await page.evaluate(() => modalFocusStack.length), 1);
  }
  await page.locator('#receiveFromPhoneModal [data-close-modal]').last().click();
  await unlocked();
  pass('Five QR renewals followed by one close leave the workspace usable');
  const calls = await page.evaluate(() => __relay.calls);
  await receive();
  assert.equal(await page.evaluate(() => __relay.calls), calls);
  await page.keyboard.press('Escape');
  await unlocked();
  pass('Reopening reception reuses the current session instead of discarding its inbox');
  await receive();
  await page.locator('#receiveFromPhoneModal').click({position:{x:3,y:3}});
  await unlocked();
  pass('Backdrop dismissal restores background interaction');
  await receive();
  // Exercise the actual nested PDF assignment flow, rather than only open/close helpers.
  await page.evaluate(async () => {
    await ensureJsPdf();
    const doc = new jspdf.jsPDF(); doc.text('Synthetic page one',20,20); doc.addPage(); doc.text('Synthetic page two',20,20);
    const data = doc.output('datauristring').split(',')[1];
    RealScanQrSync.addReceivedFile({id:'synthetic-pdf',name:'synthetic.pdf',type:'application/pdf',dataUrl:'data:application/pdf;base64,'+data,size:atob(data).length});
  });
  await page.locator('#qrInboxList [data-slot="front"]').click();
  await page.locator('#pdfPageSelectorModal').waitFor({state:'visible'});
  assert.equal(await page.locator('#pdfPageSelectorModal').evaluate(e => !!e.closest('[inert]')), false);
  await page.locator('#pdfThumbnailsGrid button').filter({hasText:'Frente'}).first().click();
  await page.locator('#pdfPageSelectorModal').waitFor({state:'hidden'});
  assert.equal(await page.locator('#receiveFromPhoneModal').evaluate(e => !!e.closest('[inert]')), false);
  await page.locator('#btnCopyReceiveUrl').focus();
  await page.keyboard.press('Escape');
  await unlocked();
  pass('PDF selection inside reception returns focus and interaction to the underlying dialog');
  await page.evaluate(() => { __relay.mode='slow'; });
  await page.locator('#btnOpenReceiveModal').click(); // reuses the existing session
  await page.locator('#btnRenewReceiveSession').click();
  await page.waitForFunction(() => typeof __relay.resolve === 'function');
  const slowCalls = await page.evaluate(() => __relay.calls);
  await page.evaluate(() => openReceiveFromPhoneModal({renew:true}));
  assert.equal(await page.evaluate(() => __relay.calls), slowCalls);
  await page.locator('#receiveFromPhoneModal [data-close-modal]').first().click();
  await unlocked();
  await page.evaluate(() => __relay.resolve());
  await page.waitForFunction(() => !receiveOpening);
  assert.equal(await page.locator('#receiveFromPhoneModal').isVisible(), false);
  await unlocked();
  pass('Double requests are coalesced; closing during a slow connection never reopens or locks the app');
  await page.evaluate(() => { __relay.mode='error'; });
  await page.locator('#btnOpenReceiveModal').click();
  await page.waitForFunction(() => document.getElementById('receiveConnectionStatus').textContent.includes('No se pudo conectar'));
  assert.equal(await page.locator('#btnRenewReceiveSession').isEnabled(), true);
  await page.keyboard.press('Escape');
  await unlocked();
  await page.evaluate(() => { __relay.mode='normal'; });
  await receive();
  await page.keyboard.press('Escape');
  pass('Failed connection leaves retry, close and other functions available; a subsequent attempt succeeds');
  // Trabajo INE/DNI sintético para que el diálogo único de entrega pueda construir.
  await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 800; c.height = 500;
    const x = c.getContext('2d'); x.fillStyle = 'white'; x.fillRect(0, 0, 800, 500);
    x.fillStyle = 'black'; x.font = '40px Arial'; x.fillText('PRUEBA SINTETICA', 50, 130);
    for (const side of ['front', 'back']) Object.assign(state.images[side], {originalSrc: c.toDataURL(), processedDataUrl: c.toDataURL(), naturalWidth: 800, naturalHeight: 500, isCropApplied: true});
    updateUI(); RealScanJourney.update(); RealScanStudio.update();
  });
  await page.locator('#btnOpenDeliveryModal').click();
  await page.locator('.pdf-delivery-dialog').waitFor({state:'visible'});
  await page.waitForFunction(() => !document.getElementById('pdfDeliveryDownload').disabled);
  const beforeFailedPdf = await page.evaluate(() => {
    window.__pdfGenerator = generatePdfDoc;
    window.generatePdfDoc = () => null;
    return __relay.calls;
  });
  await page.locator('#pdfDeliveryBuild').click();
  await page.waitForFunction(() => document.getElementById('pdfDeliveryStatus').textContent.includes('Revisa las imágenes'));
  assert.equal(await page.evaluate(() => __relay.calls), beforeFailedPdf);
  assert.equal(await page.locator('#pdfDeliveryQr').isEnabled(), false);
  await page.evaluate(() => { window.generatePdfDoc = __pdfGenerator; __relay.mode = 'slow'; delete __relay.resolve; });
  await page.locator('#pdfDeliveryBuild').click();
  await page.waitForFunction(() => !document.getElementById('pdfDeliveryDownload').disabled);
  if(!await page.locator('#pdfDeliveryMore').evaluate(e=>e.open))await page.locator('#pdfDeliveryShare').click();await page.locator('#pdfDeliveryQr').click();
  await page.waitForFunction(() => typeof __relay.resolve === 'function');
  const deliveryCalls = await page.evaluate(() => __relay.calls);
  // Mientras la generación está pendiente, el botón QR se deshabilita: la
  // segunda generación no se puede ni pulsar, así que no hay llamada nueva.
  assert.equal(await page.locator('#pdfDeliveryQr').isEnabled(), false);
  assert.equal(await page.evaluate(() => __relay.calls), deliveryCalls);
  await page.keyboard.press('Escape');
  await page.locator('.pdf-delivery-dialog').waitFor({state:'hidden'});
  await page.locator('#btnOpenDeliveryModal').click();
  await page.locator('.pdf-delivery-dialog').waitFor({state:'visible'});
  await page.evaluate(() => __relay.resolve());
  await page.waitForFunction(() => __relay.revokes >= 1);
  assert.equal(await page.locator('#pdfDeliveryQrResult').isVisible(), false);
  await page.evaluate(() => { __relay.mode = 'normal'; });
  await page.waitForFunction(() => !document.getElementById('pdfDeliveryDownload').disabled);
  if(!await page.locator('#pdfDeliveryMore').evaluate(e=>e.open))await page.locator('#pdfDeliveryShare').click();await page.locator('#pdfDeliveryQr').click();
  await page.waitForFunction(() => !document.getElementById('pdfDeliveryQrResult').hidden);
  await page.keyboard.press('Escape');
  pass('Delivery never omits a failed requested PDF, rejects duplicate generation and cancels stale results across close and reopen');
  await page.locator('#counterMore').click();
  await page.locator('#btnInstallPwa').click();
  await page.locator('#iphoneHelpModal').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
  for (const outcome of ['accepted','dismissed','error']) {
    await page.evaluate(outcome => {
      const event = new Event('beforeinstallprompt',{cancelable:true});
      event.prompt = async () => { if (outcome === 'error') throw new Error('Synthetic install rejection'); };
      event.userChoice = Promise.resolve({outcome});
      window.dispatchEvent(event);
    }, outcome);
    await page.locator('#counterMore').click();
    await page.locator('#btnInstallPwa').click();
    await page.waitForFunction(() => !document.getElementById('btnInstallPwa').disabled);
    if (outcome==='error') await page.keyboard.press('Escape');
  }
  pass('Installation has a working fallback and handles accepted, dismissed and failed native prompts');
  await page.locator('#counterMore').click();
  await page.locator('#userBadge').click();
  await page.locator('#settingsModal').waitFor({state:'visible'});
  for (const [button, panel] of [['tabBtnCreds','tabContentCreds'],['tabBtnStorage','tabContentStorage'],['tabBtnAudio','tabContentAudio'],['tabBtnCloud','tabContentCloud'],['tabBtnLog','tabContentLog']]) {
    await page.locator('#'+button).click();
    assert.equal(await page.locator('#'+panel).isVisible(), true);
  }
  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent('error',{message:'PRIVATE_TOKEN private-client.jpg',error:new TypeError('PRIVATE_IMAGE'),filename:location.origin+'/js/app.js#s=PRIVATE_TOKEN',lineno:777,colno:12}));
    const rejection=new Event('unhandledrejection');
    rejection.reason=Object.assign(new Error('PRIVATE_IMAGE'),{code:'auth/network-request-failed'});
    window.dispatchEvent(rejection);
  });
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#btnExportDiagnostics').click();
  const download = await downloadEvent;
  fs.mkdirSync('.audit/navigation-evidence',{recursive:true});
  await download.saveAs('.audit/navigation-evidence/diagnostic.json');
  const diagnostic = fs.readFileSync('.audit/navigation-evidence/diagnostic.json','utf8');
  for (const privateValue of ['PRIVATE_TOKEN','PRIVATE_IMAGE','private-client.jpg','data:image/','#s=']) assert(!diagnostic.includes(privateValue));
  assert(JSON.parse(diagnostic).events.some(e => e.event === 'receive.failed' && e.details.code === 'auth/network-request-failed'));
  assert(JSON.parse(diagnostic).events.some(e => e.event === 'runtime.error' && e.details.line === 777 && e.details.file === 'app.js'));
  assert(JSON.parse(diagnostic).events.some(e => e.event === 'runtime.rejection'));
  await page.locator('#diagnosticsTitle').scrollIntoViewIfNeeded();
  await page.locator('#settingsModal > div').screenshot({path:'.audit/navigation-evidence/diagnostics-desktop.png'});
  pass('Admin account opens settings, every settings tab works, and the exported error report excludes private payloads');
  await page.evaluate(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));
  const sharedDownload = page.waitForEvent('download');
  await page.locator('#btnShareDiagnostics').click();
  assert((await sharedDownload).suggestedFilename().endsWith('.json'));
  const originalImage = await page.evaluate(()=>state.images.front.processedDataUrl);
  await page.locator('#btnClearDiagnostics').click();
  assert.equal(await page.evaluate(()=>RealScanDiagnostics.snapshot().events.length),0);
  assert.equal(await page.evaluate(()=>state.images.front.processedDataUrl),originalImage);
  pass('Sharing falls back to a JSON download and clearing diagnostics preserves the current work');
  await page.locator('#btnRecoverControls').click();
  await unlocked();
  await receive();
  await page.keyboard.press('Alt+Shift+R');
  await unlocked();
  pass('Recovery button and keyboard shortcut unlock without clearing the current image');
  assert.equal(await page.evaluate(() => !!state.images.front.processedDataUrl), true);
  await page.locator('#counterMore').click();
  await page.locator('#btnLogout').click();
  assert.equal(await page.locator('#loginOverlay').isVisible(), true);
  await page.keyboard.press('Alt+Shift+R');
  assert.equal(await page.locator('#loginOverlay').isVisible(), true);
  pass('Recovery preserves the login lock and does not bypass authentication');
  const logging = await page.evaluate(() => {
    for(let i=0;i<250;i++) RealScanDiagnostics.record('ui.click','info',{control:'btnThemeToggle'});
    const bounded=RealScanDiagnostics.snapshot().events.length;
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(){throw new DOMException('Synthetic quota exceeded','QuotaExceededError');};
    let fallback;
    try { RealScanDiagnostics.record('app.ready');fallback=RealScanDiagnostics.snapshot().persistence; }
    finally { Storage.prototype.setItem=original; }
    return {bounded,fallback};
  });
  assert.equal(logging.bounded,200);
  assert.equal(logging.fallback,'memory');
  pass('Technical log is bounded and unavailable storage never blocks the app');
  assert.deepEqual(errors, []);
  fs.writeFileSync('.audit/navigation-evidence/results.json',JSON.stringify({checks,errors},null,2));
})().catch(error => { console.error(error);process.exitCode=1; }).finally(async()=>{if(browser)await browser.close();server.close();});
