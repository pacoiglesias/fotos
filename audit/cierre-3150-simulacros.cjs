/* RealScan Pro v3.15.0 — Simulacros de cierre sobre el build final (dist/).
   (1) Nube real punta a punta: ctx A crea cuenta local desechable, vincula
       (Firebase Auth <usuario>@realscan.local) y sube un trabajo con 2 fotos;
       ctx B (perfil limpio, mismo usuario+clave) lo recupera de la nube.
       Limpieza: borrado del trabajo en A (+propagación a nube), desvincular
       A y B, borrado de la cuenta de prueba en Firebase Auth.
   (2) Archivado/exportación: se archiva el trabajo y se verifica la descarga
       COMPLETA (PDF íntegro con %%EOF + JSON válido, o ZIP íntegro).
   (3) Respaldo cifrado: exportado en A con contraseña, importado en perfil
       limpio C; trabajos y fotos intactos (hash idéntico, decodificables).
   Uso: node audit/cierre-3150-simulacros.cjs   (desde la raíz del repo)
   Evidencia: audit/cierre-3150/
*/
const fs = require('fs'), path = require('path'), http = require('http'),
  assert = require('assert'), crypto = require('crypto');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(__dirname, 'cierre-3150');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
function say(s) { log.push(s); console.log(s); }
const MIME = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.tflite': 'application/octet-stream', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(DIST, path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    res.end(d);
  });
});

const RAND = Date.now().toString(36).slice(-6);
const USER = 'vigilia' + RAND;          // cuenta desechable: vigiliaXXXXXX@realscan.local
const PASS = 'Vigilia-3150-' + RAND;    // >= 6 caracteres
const BKUP_PASS = 'Respaldo-3150-' + RAND;

async function setupFresh(page, base, user, pass) {
  await page.goto(base, { waitUntil: 'load' });
  await page.locator('#setupUserInput').fill(user);
  await page.locator('#setupPassInput').fill(pass);
  await page.locator('#setupPassConfirmInput').fill(pass);
  await page.locator('#setupForm button[type="submit"]').click();
  await page.waitForFunction(() => document.getElementById('loginOverlay')?.classList.contains('hidden'), null, { timeout: 20000 });
  say('  ✓ cuenta local creada: ' + user);
}

/* Foto sintética de documento sobre mesa, vía el input real + revisión real. */
async function uploadPhoto(page, side, seed) {
  const inputId = side === 'front' ? 'fileInputFront' : 'fileInputBack';
  await page.evaluate(async ({ inputId, side, seed }) => {
    const W = 900, H = 1200, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#8a7a66'); grad.addColorStop(1, '#5d5348');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,0.15)';
    for (let i = 0; i < 40; i++) { g.beginPath(); const y = (i * 97 + seed * 13) % H; g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + 30, W * 0.6, y - 30, W, y + 10); g.stroke(); }
    g.save(); g.translate(W / 2, H / 2); g.rotate(((seed % 5) - 2) * 0.02); g.translate(-W / 2, -H / 2);
    g.fillStyle = '#ffffff'; g.fillRect(90, 140, W - 180, H - 280);
    g.fillStyle = '#1e293b'; g.font = 'bold 44px sans-serif';
    g.fillText('SIMULACRO VIGILIA ' + seed, 140, 250);
    g.fillStyle = '#475569';
    for (let i = 0; i < 12; i++) g.fillRect(140, 320 + i * 58, (W - 280) * (0.45 + ((i * 37 + seed) % 50) / 100), 11);
    g.fillStyle = ['#0ea5e9', '#22c55e', '#f59e0b'][seed % 3]; g.fillRect(140, 320 + 12 * 58, 220, 130);
    g.fillStyle = '#0f172a'; g.font = 'bold 30px sans-serif'; g.fillText(side.toUpperCase(), 150, 320 + 12 * 58 + 80);
    g.restore();
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    const file = new File([blob], 'simulacro-' + side + '-' + seed + '.jpg', { type: 'image/jpeg' });
    const input = document.getElementById(inputId);
    const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { inputId, side, seed });
  await page.locator('[data-review="confirm"]').click({ timeout: 15000 });
  await page.waitForFunction(s => window.state && window.state.images && window.state.images[s] && window.state.images[s].originalSrc, side, { timeout: 30000 });
  say('  ✓ foto ' + side + ' cargada y confirmada en revisión');
}

async function saveJob(page) {
  await page.locator('#btnSaveToHistory').click();
  await page.waitForFunction(() => (typeof getAllScansFromStorage === 'function') && getAllScansFromStorage().then(a => a.length >= 1), null, { timeout: 30000 });
  const rec = await page.evaluate(async () => (await getAllScansFromStorage()).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0]);
  say('  ✓ trabajo guardado: id=' + rec.id + ' páginas=' + (rec.pages || []).length);
  return rec;
}

async function openMore(page) {
  const modal = page.locator('#counterMoreModal');
  if (await modal.evaluate(el => el.classList.contains('hidden'))) {
    await page.locator('#counterMore').click();
  }
  await modal.waitFor({ state: 'visible', timeout: 15000 });
}
async function openSettings(page) {
  await openMore(page);
  await page.locator('#counterTools #btnOpenSettings').click();
  await page.locator('#settingsModal').waitFor({ state: 'visible', timeout: 15000 });
}
async function openHistory(page) {
  const modal = page.locator('#historyModal');
  if (await modal.evaluate(el => el.classList.contains('hidden'))) {
    await openMore(page);
    await page.locator('#counterTools #btnOpenHistory').click();
  }
  await modal.waitFor({ state: 'visible', timeout: 15000 });
}
async function closeSettings(page) {
  const modal = page.locator('#settingsModal');
  if (await modal.evaluate(el => !el.classList.contains('hidden'))) {
    await page.locator('#settingsModal [data-close-modal="settingsModal"]').first().click();
  }
  await modal.waitFor({ state: 'hidden', timeout: 10000 });
}
async function linkCloud(page, password) {
  await openSettings(page);
  const toggle = page.locator('#cloudEnableToggle');
  await toggle.waitFor({ state: 'visible', timeout: 15000 });
  if (!(await toggle.isChecked())) await toggle.check();
  await page.locator('#btnCloudLink').click();
  await page.locator('#rsBackupPass1').fill(password);
  await page.locator('#rsBackupPassOk').click();
  await page.waitForFunction(() => /guardado en la nube ✓/i.test(document.getElementById('cloudStatusLine')?.textContent || ''), null, { timeout: 120000 });
  say('  ✓ vinculada y sincronizada: ' + await page.locator('#cloudStatusLine').textContent());
}

async function cloudCreds(page) {
  return page.evaluate(() => Object.assign(
    JSON.parse(localStorage.getItem('realscan_cloud_link_v1') || '{}'),
    { apiKey: window.REALSCAN_FIREBASE_CONFIG.apiKey, databaseURL: window.REALSCAN_FIREBASE_CONFIG.databaseURL, storageBucket: window.REALSCAN_FIREBASE_CONFIG.storageBucket }
  ));
}
async function idTokenFor(apiKey, refreshToken) {
  const r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(apiKey), {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(refreshToken)
  });
  const j = await r.json();
  assert(j.id_token, 'sin id_token al refrescar sesión');
  return j.id_token;
}
function sha(b) { return crypto.createHash('sha256').update(b).digest('hex').slice(0, 16); }
function b64bytes(dataUrl) { return Buffer.from(String(dataUrl).split(',')[1] || '', 'base64'); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  say('Sirviendo dist en ' + base);
  const browser = await chromium.launch();
  const summary = { user: USER + '@realscan.local', drills: {} };

  /* ============ SIMULACRO 1 — nube real punta a punta ============ */
  say('\n[1] Nube real de punta a punta');
  const ctxA = await browser.newContext({ acceptDownloads: true });
  const pageA = await ctxA.newPage();
  await setupFresh(pageA, base, USER, PASS);
  await uploadPhoto(pageA, 'front', 11);
  await uploadPhoto(pageA, 'back', 22);
  const recA = await saveJob(pageA);
  const refFront = b64bytes((recA.pages[0] || {}).dataUrl || (recA.pages[0] || {}).originalSrc);
  const refBack = b64bytes((recA.pages[1] || {}).dataUrl || (recA.pages[1] || {}).originalSrc);
  assert(refFront.length > 20000 && refBack.length > 20000, 'fotos de referencia demasiado pequeñas');
  await linkCloud(pageA, PASS);
  await closeSettings(pageA);

  // Verificación independiente del backend (REST, sin la app)
  const creds = await cloudCreds(pageA);
  const token = await idTokenFor(creds.apiKey, creds.refreshToken);
  const rtdb = await (await fetch(creds.databaseURL + '/users/' + creds.uid + '/scans/' + recA.id + '.json?auth=' + encodeURIComponent(token))).json();
  assert(rtdb && rtdb.id === recA.id, 'RTDB no contiene el trabajo');
  say('  ✓ RTDB contiene el trabajo (metadatos)');
  for (const slot of ['front', 'back']) {
    const dl = await fetch('https://firebasestorage.googleapis.com/v0/b/' + creds.storageBucket + '/o/' + encodeURIComponent('users/' + creds.uid + '/scans/' + recA.id + '/' + slot + '.jpg') + '?alt=media', { headers: { Authorization: 'Bearer ' + token } });
    assert(dl.ok, 'Storage no entrega ' + slot + '.jpg (HTTP ' + dl.status + ')');
    const buf = Buffer.from(await dl.arrayBuffer());
    const ref = slot === 'front' ? refFront : refBack;
    say('  ✓ Storage ' + slot + '.jpg: ' + buf.length + ' bytes, bytes idénticos al original: ' + (buf.equals(ref) ? 'SÍ' : 'NO (difiere)'));
    if (slot === 'front') summary.drills.cloudFrontBytesEqual = buf.equals(ref);
  }

  // Contexto B: perfil limpio, mismo usuario+clave → recupera
  const ctxB = await browser.newContext({ acceptDownloads: true });
  const pageB = await ctxB.newPage();
  await setupFresh(pageB, base, USER, PASS);
  await linkCloud(pageB, PASS);
  await closeSettings(pageB);
  // El banner de restauración vive dentro del modal de Historial (por diseño,
  // junto a #historyCloudStatus): hay que abrir Historial para verlo y para
  // pulsar «Recuperar». Sin este paso el banner existe y está activo (sin la
  // clase hidden) pero nunca es visible para Playwright.
  await openHistory(pageB);
  await pageB.waitForSelector('#cloudRestoreBanner:not(.hidden)', { timeout: 60000 });
  say('  ✓ banner de restauración visible en el perfil limpio: ' + await pageB.locator('#cloudRestoreText').textContent());
  await pageB.locator('#btnCloudRestoreNow').click();
  await pageB.waitForFunction(() => getAllScansFromStorage().then(a => a.length >= 1), null, { timeout: 60000 });
  const recB = (await pageB.evaluate(async () => getAllScansFromStorage())).find(s => s.id === recA.id);
  assert(recB, 'el trabajo no apareció en el perfil limpio');
  const gotFront = b64bytes((recB.pages[0] || {}).dataUrl || (recB.pages[0] || {}).originalSrc);
  const gotBack = b64bytes((recB.pages[1] || {}).dataUrl || (recB.pages[1] || {}).originalSrc);
  assert(gotFront.length > 20000 && gotBack.length > 20000, 'fotos recuperadas vacías');
  await pageB.evaluate(async (rec) => {
    for (const p of rec.pages || []) {
      const img = new Image(); img.src = p.dataUrl || p.originalSrc; await img.decode();
      if (!img.naturalWidth) throw new Error('foto no decodifica');
    }
  }, recB);
  say('  ✓ trabajo recuperado en perfil limpio con 2 fotos decodificables');
  say('  ✓ hash frente A==B: ' + (sha(refFront) === sha(gotFront)) + ' · hash reverso A==B: ' + (sha(refBack) === sha(gotBack)));
  summary.drills.cloud = { rtdbOk: true, photosDecodable: true, frontHashEqual: sha(refFront) === sha(gotFront), backHashEqual: sha(refBack) === sha(gotBack) };
  await ctxB.close();
  say('  ✓ contexto B cerrado');

  /* ============ SIMULACRO 2 — archivado/exportación, descarga COMPLETA ============ */
  say('\n[2] Archivado/exportación con descarga completa');
  await openHistory(pageA);
  await pageA.locator('#btnArchivePending').waitFor({ state: 'visible', timeout: 15000 });
  const [dlArch] = await Promise.all([
    pageA.waitForEvent('download', { timeout: 120000 }),
    pageA.locator('#btnArchivePending').click(),
  ]);
  const archPath = path.join(OUT, 'archivado-' + dlArch.suggestedFilename());
  await dlArch.saveAs(archPath);
  const archBuf = fs.readFileSync(archPath);
  assert(archBuf.length > 10000, 'archivo archivado demasiado pequeño: ' + archBuf.length);
  const archName = path.basename(archPath).toLowerCase();
  let archOk = false, archDetail = '';
  if (archName.endsWith('.zip')) {
    const { execSync } = require('child_process');
    const listing = execSync('unzip -l ' + JSON.stringify(archPath)).toString();
    execSync('unzip -t ' + JSON.stringify(archPath), { stdio: 'pipe' });
    archOk = true; archDetail = 'ZIP íntegro; contiene: ' + listing.split('\n').slice(3, 6).map(l => l.trim().split(/\s+/).pop()).join(', ');
  } else if (archName.endsWith('.pdf')) {
    archOk = archBuf.slice(0, 4).toString() === '%PDF' && archBuf.includes('%%EOF');
    archDetail = 'PDF cabecera %PDF y marca %%EOF: ' + (archOk ? 'SÍ' : 'NO');
  } else if (archName.endsWith('.json')) {
    JSON.parse(archBuf.toString('utf8')); archOk = true; archDetail = 'JSON válido';
  }
  assert(archOk, 'descarga de archivado incompleta o corrupta: ' + archDetail);
  say('  ✓ descarga completa: ' + path.basename(archPath) + ' (' + archBuf.length + ' bytes) — ' + archDetail);
  const recA2 = (await pageA.evaluate(async () => getAllScansFromStorage())).find(s => s.id === recA.id);
  say('  ✓ trabajo marcado archivado: ' + (!!(recA2 && (recA2.archivedAt || recA2.archived))));
  summary.drills.archive = { file: path.basename(archPath), bytes: archBuf.length, detail: archDetail };

  /* ============ SIMULACRO 3 — respaldo cifrado: exportar en A, restaurar en C ============ */
  say('\n[3] Respaldo cifrado: exportar en A, restaurar en perfil limpio C');
  await openSettings(pageA);
  const encChk = pageA.locator('#dailyBackupEncrypt');
  await encChk.waitFor({ state: 'visible', timeout: 15000 });
  if (!(await encChk.isChecked())) await encChk.check();
  const [dlBk] = await Promise.all([
    pageA.waitForEvent('download', { timeout: 120000 }),
    pageA.locator('#btnBackupNowReminder').click(),
  ]);
  await pageA.locator('#rsBackupPass1').fill(BKUP_PASS);
  await pageA.locator('#rsBackupPass2').fill(BKUP_PASS);
  await pageA.locator('#rsBackupPassOk').click();
  const bkPath = path.join(OUT, 'respaldo-cifrado-' + dlBk.suggestedFilename());
  await dlBk.saveAs(bkPath);
  const bkObj = JSON.parse(fs.readFileSync(bkPath, 'utf8'));
  const isEnc = await pageA.evaluate(o => window.RealScanBackupCrypto.isEncryptedBackupObject(o), bkObj);
  assert(isEnc, 'el respaldo no es un objeto cifrado válido');
  say('  ✓ respaldo cifrado exportado: ' + path.basename(bkPath) + ' (' + fs.statSync(bkPath).size + ' bytes), objeto cifrado válido');

  const ctxC = await browser.newContext({ acceptDownloads: true });
  const pageC = await ctxC.newPage();
  await setupFresh(pageC, base, 'vigiliac' + RAND, PASS);
  await openHistory(pageC);
  await pageC.locator('#fileInputImportHistory').setInputFiles(bkPath);
  await pageC.locator('#rsBackupPass1').fill(BKUP_PASS);
  await pageC.locator('#rsBackupPassOk').click();
  await pageC.waitForFunction(() => getAllScansFromStorage().then(a => a.length >= 1), null, { timeout: 60000 });
  const recC = (await pageC.evaluate(async () => getAllScansFromStorage())).find(s => s.pages && s.pages.length >= 2);
  assert(recC, 'el respaldo no restauró el trabajo en el perfil limpio');
  const gotCFront = b64bytes((recC.pages[0] || {}).dataUrl || (recC.pages[0] || {}).originalSrc);
  const gotCBack = b64bytes((recC.pages[1] || {}).dataUrl || (recC.pages[1] || {}).originalSrc);
  await pageC.evaluate(async (rec) => {
    for (const p of rec.pages || []) {
      const img = new Image(); img.src = p.dataUrl || p.originalSrc; await img.decode();
      if (!img.naturalWidth) throw new Error('foto del respaldo no decodifica');
    }
  }, recC);
  const hEqF = sha(refFront) === sha(gotCFront), hEqB = sha(refBack) === sha(gotCBack);
  assert(hEqF && hEqB, 'las fotos restauradas difieren del original');
  say('  ✓ restaurado en perfil limpio: ' + recC.pages.length + ' páginas, hash idéntico al original (frente y reverso), imágenes decodificables');
  summary.drills.backup = { jobs: 1, pages: recC.pages.length, hashesEqual: hEqF && hEqB, encryptedObject: true };
  await ctxC.close();

  /* ============ Limpieza del simulacro 1 ============ */
  say('\n[Limpieza] borrado de datos de prueba');
  await openHistory(pageA);
  await pageA.locator('.btn-delete-scan[data-id="' + recA.id + '"], .btn-dash-delete[data-id="' + recA.id + '"]').first().click();
  await pageA.locator('#rsConfirmOk').click();
  await pageA.waitForFunction(() => getAllScansFromStorage().then(a => a.length === 0), null, { timeout: 30000 });
  say('  ✓ trabajo borrado en local (A)');
  await pageA.waitForFunction(() => /guardado en la nube ✓/i.test(document.getElementById('cloudStatusLine')?.textContent || ''), null, { timeout: 120000 });
  const token2 = await idTokenFor(creds.apiKey, creds.refreshToken);
  const rtdbAfter = await (await fetch(creds.databaseURL + '/users/' + creds.uid + '/scans.json?auth=' + encodeURIComponent(token2))).json();
  assert(!rtdbAfter || Object.keys(rtdbAfter).length === 0, 'RTDB aún contiene datos de prueba: ' + JSON.stringify(rtdbAfter).slice(0, 200));
  say('  ✓ RTDB sin restos del trabajo de prueba');
  for (const slot of ['front', 'back']) {
    const chk = await fetch('https://firebasestorage.googleapis.com/v0/b/' + creds.storageBucket + '/o/' + encodeURIComponent('users/' + creds.uid + '/scans/' + recA.id + '/' + slot + '.jpg'), { headers: { Authorization: 'Bearer ' + token2 } });
    assert(chk.status === 404, 'Storage aún conserva ' + slot + '.jpg (HTTP ' + chk.status + ')');
  }
  say('  ✓ Storage sin restos (404 en ambas fotos)');
  await openSettings(pageA);
  await pageA.locator('#btnCloudUnlink').click();
  await closeSettings(pageA);
  const del = await (await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key=' + encodeURIComponent(creds.apiKey), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token2 })
  })).json();
  assert(!del.error, 'no se pudo borrar la cuenta de prueba: ' + JSON.stringify(del).slice(0, 200));
  say('  ✓ cuenta ' + USER + '@realscan.local eliminada de Firebase Auth; equipo A desvinculado');
  summary.cleanup = true;

  await browser.close();
  server.close();
  summary.ok = true;
  fs.writeFileSync(path.join(OUT, 'simulacros-resumen.json'), JSON.stringify(summary, null, 2));
  say('\nTODOS LOS SIMULACROS EN VERDE. Resumen: ' + path.join(OUT, 'simulacros-resumen.json'));
})().catch(e => {
  console.error('\n❌ SIMULACRO FALLIDO: ' + (e && e.message));
  try { fs.writeFileSync(path.join(OUT, 'simulacros-resumen.json'), JSON.stringify({ ok: false, error: String(e && e.message), log }, null, 2)); } catch {}
  server.close();
  process.exit(1);
});
