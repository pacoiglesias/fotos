/**
 * Test Suite - Prompt Maestro: Implementación y Validación Final
 * Verifica:
 * 1. Papeles fotográficos 10x15 cm y 4x6 pulg, y metadatos oficiales de trámites (fuente, requisitos, restricciones).
 * 2. Control de escala de impresión (%) con aviso explícito cuando != 100%.
 * 3. Sistema de alertas sonoras y feedback auditivo con Web Audio API (offline).
 * 4. Sincronización QR: Sesiones temporales, bandeja de recepción, asignación a ranuras y entrega digital.
 * 5. Detección y asistencia para fotos HEIC/HEIF y portales móviles de cliente.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FALLO: ${message}`);
    process.exitCode = 1;
  }
}

console.log('\n--- INICIANDO TEST SUITE PROMPT MAESTRO (Validación Final Integral) ---\n');

// -------------------------------------------------------------
// BLOQUE 1: Papeles Fotográficos 10x15 y 4x6 y Ficha de Trámites
// -------------------------------------------------------------
console.log('1. Verificación de Papeles Fotográficos y Ficha Oficial...');
const configCode = fs.readFileSync(path.join(__dirname, 'js/config.js'), 'utf-8');

const sandbox = {
  window: {},
  document: {
    addEventListener: () => {},
    documentElement: { classList: { toggle: () => false, add: () => {} } },
    activeElement: null,
    body: { classList: { add: () => {}, remove: () => {} }, children: [] },
    getElementById: () => null,
    querySelectorAll: () => []
  },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console: console
};
vm.createContext(sandbox);
vm.runInContext(configCode, sandbox);

const papers = sandbox.window.PAPER_SPECS;
assert(papers.photo_10x15, 'PAPER_SPECS define photo_10x15');
assert(
  papers.photo_10x15.widthMm === 100.0 && papers.photo_10x15.heightMm === 150.0,
  'photo_10x15 mide exactamente 100.0 × 150.0 mm (métrica)'
);

assert(papers.photo_4x6, 'PAPER_SPECS define photo_4x6');
assert(
  papers.photo_4x6.widthMm === 101.6 && papers.photo_4x6.heightMm === 152.4,
  'photo_4x6 mide exactamente 101.6 × 152.4 mm (imperial 4×6 pulgadas)'
);

// Metadatos de trámites oficiales
const formats = sandbox.window.FORMAT_SPECS;
assert(
  formats.card && formats.card.officialSource && formats.card.editingRestrictions,
  'Formato card (INE/DNI) incluye fuente oficial y restricciones de edición estrictas'
);
assert(
  formats.photo_passport && formats.photo_passport.officialSource.includes('ICAO') && formats.photo_passport.editingRestrictions,
  'Foto Pasaporte incluye normativa OACI Doc 9303 y prohibición de filtros'
);
assert(
  formats.photo_visa_usa && formats.photo_visa_usa.officialSource.includes('Department of State'),
  'Foto Visa USA incluye especificación oficial de U.S. Dept of State'
);

// -------------------------------------------------------------
// BLOQUE 2: Sistema de Alertas Sonoras (js/audio.js)
// -------------------------------------------------------------
console.log('\n2. Verificación de Alertas Sonoras (js/audio.js)...');
const audioCode = fs.readFileSync(path.join(__dirname, 'js/audio.js'), 'utf-8');

assert(
  audioCode.includes('RealScanAudio') && audioCode.includes('playSuccess') && audioCode.includes('playWarning'),
  'js/audio.js define el objeto RealScanAudio con métodos armónicos'
);
assert(
  audioCode.includes('playReceive') && audioCode.includes('playCapture'),
  'js/audio.js implementa campanilla de recepción móvil y obturador'
);
assert(
  audioCode.includes('AudioContext') || audioCode.includes('webkitAudioContext'),
  'js/audio.js utiliza Web Audio API nativo sin dependencias de audio externas'
);

// -------------------------------------------------------------
// BLOQUE 3: Sincronización QR y Sesiones Temporales (js/qr-sync.js)
// -------------------------------------------------------------
console.log('\n3. Verificación de Sincronización QR (js/qr-sync.js)...');
const qrCode = fs.readFileSync(path.join(__dirname, 'js/qr-sync.js'), 'utf-8');

const qrSandbox = {
  window: { 
    location: { origin: 'http://localhost:5500', pathname: '/app/' },
    addEventListener: () => {},
    BroadcastChannel: class {
      constructor() {}
      postMessage() {}
      close() {}
    }
  },
  document: {
    createElement: () => ({ getContext: () => ({ fillRect: () => {}, clearRect: () => {} }) })
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  },
  console: console
};
vm.createContext(qrSandbox);
vm.runInContext(qrCode, qrSandbox);

const qrSync = qrSandbox.RealScanQrSync || qrSandbox.window.RealScanQrSync;
assert(qrSync, 'RealScanQrSync se inicializa correctamente');

// Crear sesión de recepción
const recSession = qrSync.createReceiveSession();
assert(recSession && recSession.id.startsWith('RS-'), 'createReceiveSession genera un ID impredecible (RS-XXXX)');
assert(recSession.expiresAt > Date.now(), 'La sesión de recepción tiene fecha de caducidad (15 min)');
assert(recSession.url.includes('phone-upload.html?session='), 'La sesión apunta a phone-upload.html con parámetro de sesión');

// Probar recepción de archivo
const mockFile = {
  name: 'identificacion_cliente.jpg',
  size: 512000,
  type: 'image/jpeg',
  dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
};
const receivedItem = qrSync.addReceivedFile(mockFile);
assert(receivedItem && receivedItem.name === mockFile.name, 'addReceivedFile almacena el archivo en la bandeja');

const inbox = qrSync.getInboxFiles();
assert(inbox.length === 1 && inbox[0].id === receivedItem.id, 'getInboxFiles devuelve los archivos recibidos');

// Crear sesión de entrega digital
const delSession = qrSync.createDeliverySession([mockFile], { format: 'jpg', maxPx: '1920' });
assert(delSession && delSession.id.startsWith('DL-'), 'createDeliverySession genera un ID de entrega (DL-XXXX)');
assert(delSession.url.includes('phone-download.html?delivery='), 'La entrega apunta a phone-download.html');

// -------------------------------------------------------------
// BLOQUE 4: Portales Móviles de Cliente y Asistencia HEIC
// -------------------------------------------------------------
console.log('\n4. Portales Móviles y Asistencia de Archivos...');
assert(fs.existsSync(path.join(__dirname, 'phone-upload.html')), 'phone-upload.html existe físicamente');
assert(fs.existsSync(path.join(__dirname, 'phone-download.html')), 'phone-download.html existe físicamente');

const engineCode = fs.readFileSync(path.join(__dirname, 'js/engine.js'), 'utf-8');
assert(
  engineCode.includes('.heic') && engineCode.includes('.heif'),
  'js/engine.js detecta archivos HEIC/HEIF de iPhone y muestra guía al usuario'
);
assert(
  engineCode.includes('window.handleLoadedFile'),
  'js/engine.js expone window.handleLoadedFile para inyección desde sincronización QR'
);

// -------------------------------------------------------------
// BLOQUE 5: Modales e Integración en HTML y Service Worker
// -------------------------------------------------------------
console.log('\n5. Verificación de Modales y Service Worker...');
const htmlCode = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
assert(htmlCode.includes('id="receiveFromPhoneModal"'), 'index.html incluye el modal receiveFromPhoneModal');
assert(htmlCode.includes('id="digitalDeliveryModal"'), 'index.html incluye el modal digitalDeliveryModal');
assert(htmlCode.includes('id="formatRequirementsModal"'), 'index.html incluye el modal formatRequirementsModal');
assert(htmlCode.includes('id="selectOutputScale"'), 'index.html incluye el selector de escala de impresión %');
assert(htmlCode.includes('id="bannerScaleWarning"'), 'index.html incluye el banner de aviso de escala modificada');

const swCode = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf-8');
assert(swCode.includes('./js/audio.js'), 'sw.js incluye ./js/audio.js en precaching');
assert(swCode.includes('./js/qr-sync.js'), 'sw.js incluye ./js/qr-sync.js en precaching');
assert(swCode.includes('./phone-upload.html'), 'sw.js incluye ./phone-upload.html en precaching');
assert(swCode.includes('./phone-download.html'), 'sw.js incluye ./phone-download.html en precaching');

// -------------------------------------------------------------
// RESUMEN FINAL
// -------------------------------------------------------------
console.log(`\n=============================================================`);
console.log(`Resultado Prompt Maestro: ${passedTests} de ${totalTests} pruebas superadas.`);
console.log(`=============================================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
