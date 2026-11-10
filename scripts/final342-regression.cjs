/* 3.42 · La auditoría hecha prueba: una sola puerta «Archivo», captura en
   un solo paso, un solo historial de 7 días y semáforo sin contradicción. */
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert'), { chromium } = require('playwright');
const root = path.resolve('dist'), out = path.resolve('.audit/final342'); fs.mkdirSync(out, { recursive: true });
const csp = JSON.parse(fs.readFileSync('firebase.json')).hosting[0].headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
const server = http.createServer((req, res) => { const name = new URL(req.url, 'http://local').pathname, file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name)); if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end(); res.setHeader('Content-Security-Policy', csp); res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' })[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); });
const checks = []; function pass(v) { checks.push(v); console.log('PASS ' + v); }
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { if (window !== window.top) return; localStorage.setItem('realscan_welcome_seen_v1', '1'); localStorage.setItem('realscan_auth_v2', JSON.stringify({ users: [{ username: 'admin', passwordHash: 'beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe', role: 'admin', mustChangePassword: false }], currentUsername: 'admin', sessionToken: null, sessionExpiry: 0 })); });
  await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'domcontentloaded' });
  await page.locator('#loginUserInput').fill('admin'); await page.locator('#loginPassInput').fill('PruebaAcceso2026'); await page.locator('#btnLoginSubmit').click();
  await page.locator('#loginOverlay').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => window.RealScanArchivo && document.getElementById('headerArchive'));

  // 1 · Una sola puerta: «Archivo» sí; las cuatro sueltas, no.
  assert.equal(await page.locator('#headerNas').count(), 0); assert.equal(await page.locator('#headerExplore').count(), 0);
  assert.equal(await page.locator('#headerTray').count(), 0); assert.equal(await page.locator('#headerIngest').count(), 0);
  assert(await page.locator('#headerArchive').isVisible());
  const headerButtons = await page.locator('body>header button').count();
  pass('header has one Archivo door and no loose NAS/ingest/explore/tray buttons (' + headerButtons + ' header buttons)');

  // 2 · El centro «Archivo»: pestañas y la explicación de qué confirma el archivo.
  await page.locator('#headerArchive').click(); await page.locator('#archivoHub').waitFor({ state: 'visible' });
  const hubText = await page.locator('#archivoHub').textContent();
  assert(hubText.includes('no confirma el archivo')); assert(hubText.includes('Traer') && hubText.includes('Ingerir') && hubText.includes('Bandeja'));
  assert(hubText.includes('no está conectado')); // sin token: el estado se cuenta una vez, aquí
  await page.locator('#archivoHub [data-tab="bandeja"]').click(); assert(await page.locator('#archivoHub [data-panel="bandeja"]').isVisible());
  await page.screenshot({ path: path.join(out, 'archivo-hub.png') });
  await page.keyboard.press('Escape');
  pass('Archivo hub: tabs Traer/Ingerir/Bandeja, single connection state and honest archive wording');

  // 3 · Semáforo coherente sin conexión: nunca «sin acceso» + «al día».
  const pending = await page.locator('#deskPaperlessPending').textContent();
  assert(pending.toLowerCase().includes('sin acceso'), pending); assert(!pending.includes('al día'), pending); assert(pending.includes('Conéctalo para saber'), pending);
  pass('paperless semaphore without token says connect-to-know, never up-to-date: ' + pending.trim());

  // 4 · Bandeja sin jerga: nada de «PACK 1».
  await page.evaluate(() => localStorage.setItem('realscan_review_tray_v1', JSON.stringify([{ key: 'paperless:42', status: 'traido', addedAt: new Date().toISOString(), origin: 'paperless', sourceId: 42, title: 'Documento de prueba', documentType: null, correspondent: null, tags: [] }])));
  await page.evaluate(() => RealScanPaperlessExplore.openTray());
  await page.locator('#reviewTray').waitFor({ state: 'visible' });
  const trayText = await page.locator('#reviewTray').textContent();
  assert(!trayText.includes('PACK 1'), trayText.slice(0, 200)); assert(trayText.includes('LO QUE TRAJISTE'));
  assert(trayText.includes('Dejar perfecto y re-archivar'));
  await page.keyboard.press('Escape');
  pass('tray speaks plain language (no PACK 1) and offers the one-step perfect-and-rearchive action');

  // 5 · Un solo historial: «Historial» abre Trabajos con pestañas y plazo de 7 días.
  assert.equal(await page.evaluate(() => document.getElementById('selectRetentionDays').value), '7');
  await page.evaluate(() => document.getElementById('btnOpenHistory').click()); await page.locator('#workspaceJobs').waitFor({ state: 'visible' });
  for (const tab of ['Pedidos', 'Impresiones', 'Escaneos']) assert((await page.locator('#workspaceJobs').textContent()).includes(tab));
  // El estado lo escribe renderJobs() DESPUÉS de leer IndexedDB (async):
  // se espera la condición, no se lee en vacío (en CI lento la lectura
  // inmediata veía el texto aún vacío; en local ganaba la carrera).
  await page.waitForFunction(() => document.getElementById('workspaceJobsStatus').textContent.includes('7 días'));
  const jobsStatus = await page.locator('#workspaceJobsStatus').textContent(); assert(jobsStatus.includes('7 días'), jobsStatus);
  await page.locator('#workspaceJobs [data-jobs-tab="scans"]').click();
  await page.waitForFunction(() => document.getElementById('workspaceJobsStatus').textContent.includes('escaneos guardados'));
  const scansStatus = await page.locator('#workspaceJobsStatus').textContent(); assert(scansStatus.includes('7 días'), scansStatus);
  await page.keyboard.press('Escape');
  pass('single history: Trabajos tabs Pedidos/Impresiones/Escaneos, one 7-day retention everywhere');

  // 6 · Atajos del mostrador: fuera del cajón cerrado, con tamaño real.
  const shortcutBox = await page.locator('#deskStart .desk-shortcuts>button').first().boundingBox();
  assert(shortcutBox && shortcutBox.height >= 44, JSON.stringify(shortcutBox));
  assert(await page.evaluate(() => !document.getElementById('deskTools').contains(document.querySelector('#deskStart .desk-shortcuts'))));
  pass('desk shortcuts live on the desk at real touch size (' + Math.round(shortcutBox.height) + ' px)');

  // 7 · Captura en un solo paso: dos pasos y «Ver grande», sin «Confirmar».
  await page.evaluate(() => RealScanCapture.open({ photoMode: false, onAccept: () => {} }));
  await page.locator('.scan-dialog').waitFor({ state: 'visible', timeout: 10000 });
  const steps = await page.locator('.scan-dialog .scan-steps').textContent();
  assert(steps.includes('1 · Capturar') && steps.includes('2 · Ajustar y usar'), steps); assert(!steps.includes('Confirmar'), steps);
  assert((await page.locator('.scan-dialog [data-act="preview"]').textContent()).includes('Ver grande'));
  pass('scan dialog is two steps: Capturar → Ajustar y usar, preview is optional «Ver grande»');
  await page.keyboard.press('Escape');

  // 8 · Hero compacto en modo rápido.
  await page.evaluate(() => document.body.classList.add('rs-quick'));
  const bar = await page.locator('#workbenchBar').boundingBox();
  assert(bar && bar.height <= 64, 'workbench height ' + (bar && bar.height));
  assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('counterIntro')).display), 'none');
  await page.evaluate(() => document.body.classList.remove('rs-quick'));
  pass('quick-mode workbench bar is compact (' + Math.round(bar.height) + ' px, intro hidden)');

  assert.deepEqual(errors, []);
  console.log('SUMMARY final342 ' + checks.length + ' PASS');
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
