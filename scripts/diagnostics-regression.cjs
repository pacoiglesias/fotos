// Diagnóstico técnico 3.34.0: el registro acepta los eventos nuevos del flujo
// (impresión, Paperless, lotes, recuperación, cámara) y su lista blanca impide
// que datos sensibles lleguen al registro aunque un llamador los pase por error.
// Se ejecuta con: node scripts/diagnostics-regression.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const store = new Map();
const localStorageStub = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
let clipboardText = null;
const clickHandlers = {};
const elementStub = (id) => ({
  id,
  textContent: '',
  replaceChildren: function () { this.children = []; },
  appendChild: function () {},
  addEventListener: function (type, fn) { clickHandlers[id + ':' + type] = fn; },
});
const domHandlers = {};
const documentStub = {
  querySelectorAll: () => [],
  querySelector: () => null,
  getElementById: (id) => elementStub(id),
  addEventListener: (type, fn) => { domHandlers[type] = fn; },
  createElement: () => ({ style: {}, select: () => {}, remove: () => {} }),
  body: { appendChild: () => {}, removeChild: () => {} },
  execCommand: () => true,
};
const windowStub = {
  APP_VERSION: 'v3.34.0',
  crypto: { randomUUID: () => 'test-session' },
  addEventListener: () => {},
  showToast: () => {},
  location: { hostname: 'test' },
};
const navigatorStub = {
  userAgent: 'test-agent',
  onLine: true,
  clipboard: { writeText: async (t) => { clipboardText = t; } },
};

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'diagnostics.js'), 'utf8');
const factory = new Function('window', 'document', 'navigator', 'localStorage', 'location', 'confirm', 'fetch', source + '\nreturn window.RealScanDiagnostics;');
const diag = factory(windowStub, documentStub, navigatorStub, localStorageStub, { hostname: 'test' }, () => true, async () => ({ ok: false }));

(async () => {
  // Conectar los botones como lo haría el navegador al cargar la página.
  assert.equal(typeof domHandlers.DOMContentLoaded, 'function', 'falta el arranque DOMContentLoaded');
  domHandlers.DOMContentLoaded();
  // 1. Los eventos nuevos del flujo quedan registrados (antes varios se descartaban).
  for (const event of ['print.prepared', 'print.started', 'print.completed', 'print.failed', 'paperless.send', 'paperless.sent', 'paperless.failed', 'batch.started', 'batch.completed', 'batch.failed', 'recovery.code', 'recovery.qr', 'recovery.failed', 'camera.permission', 'camera.first_frame', 'preview.failed', 'annotations.preview', 'pwa.worker_blocked']) {
    diag.record(event, 'info', { count: 1 });
  }
  let events = JSON.parse(localStorageStub.getItem('realscan_diagnostics_v1') || '[]');
  for (const event of ['print.prepared', 'paperless.send', 'batch.started', 'recovery.qr', 'camera.first_frame']) {
    assert(events.some((e) => e.event === event), 'falta el evento ' + event);
  }
  console.log('PASS eventos nuevos del flujo registrados');

  // 2. La lista blanca borra datos sensibles aunque un llamador los pase.
  diag.record('paperless.failed', 'error', {
    errorType: 'Error', token: 'SECRETO', url: 'https://paperless.ejemplo/token', title: 'Cliente Ejemplo',
    name: 'Ana', phone: '5551234567', code: 'CODIGO-LEIDO', photo: 'data:image/png;base64,xxx',
  });
  events = JSON.parse(localStorageStub.getItem('realscan_diagnostics_v1') || '[]');
  const failed = events.filter((e) => e.event === 'paperless.failed').pop();
  assert.deepEqual(Object.keys(failed.details).sort(), ['errorType']);
  assert.equal(failed.details.errorType, 'Error');
  console.log('PASS la lista blanca borra token, url, nombres, teléfonos, títulos y códigos');

  // 3. Copiar produce texto con los eventos y sin los valores sensibles.
  await diag.copyReport();
  assert(clipboardText && clipboardText.includes('paperless.send'), 'copiar debe incluir los eventos');
  assert(!clipboardText.includes('SECRETO') && !clipboardText.includes('paperless.ejemplo') && !clipboardText.includes('Ana'), 'copiar no debe filtrar datos sensibles');
  console.log('PASS copiar genera texto técnico sin datos sensibles');

  // 4. Tope de 200 eventos: los más viejos se descartan.
  for (let i = 0; i < 210; i++) diag.record('ui.click', 'info', {});
  events = JSON.parse(localStorageStub.getItem('realscan_diagnostics_v1') || '[]');
  assert.equal(events.length, 200);
  console.log('PASS tope de 200 eventos');

  // 5. Borrar vacía el registro guardado.
  const clear = clickHandlers['btnClearDiagnostics:click'];
  assert.equal(typeof clear, 'function', 'falta el botón Borrar');
  clear();
  assert.equal(localStorageStub.getItem('realscan_diagnostics_v1'), '[]');
  console.log('PASS borrar vacía el registro');
  console.log('DIAGNOSTICS REGRESSION OK');
})().catch((error) => { console.error('FAIL ' + (error && error.message)); process.exitCode = 1; });
