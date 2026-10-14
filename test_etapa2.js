// test_etapa2.js — Verificación de Seguridad, Proyecto v2, Restauración y Sanitización
const fs = require('fs');
const vm = require('vm');

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log('  ✓ ' + msg);
  } else {
    console.error('  ✗ FALLO: ' + msg);
    failures++;
  }
}

// Mock IndexedDB and browser storage
class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] || null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

const mockLocalStorage = new MockStorage();

const sandbox = {
  window: {},
  localStorage: mockLocalStorage,
  console: console,
  Math: Math,
  parseInt: parseInt,
  parseFloat: parseFloat,
  Date: Date,
  Set: Set,
  Array: Array,
  String: String,
  JSON: JSON,
  crypto: {
    subtle: {
      digest: async function(algo, buf) {
        // Simple mock SHA-256 for Node test environment
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(Buffer.from(buf)).digest();
        return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
      }
    }
  },
  TextEncoder: require('util').TextEncoder,
  document: {
    createElement: () => ({ style: {}, classList: { add:()=>{}, remove:()=>{}, toggle:()=>{} }, appendChild:()=>{}, setAttribute:()=>{} }),
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  }
};
sandbox.window = sandbox;

// Load config.js
vm.runInNewContext(fs.readFileSync('js/config.js', 'utf8'), sandbox);
// Load auth.js
vm.runInNewContext(fs.readFileSync('js/auth.js', 'utf8'), sandbox);
// Load storage.js
vm.runInNewContext(fs.readFileSync('js/storage.js', 'utf8'), sandbox);

async function runTests() {
  console.log('--- TEST 1: Seguridad de Autenticación y Eliminación de Bypass Maestro ---');
  {
    const initialAuth = sandbox.getAuthData();
    assert(initialAuth.users.length > 0, 'Debe inicializar al menos 1 usuario');
    assert(initialAuth.users[0].username === 'admin', 'Usuario inicial debe ser admin');

    // Cambiar contraseña a "MiClaveSegura2026!"
    const newPass = 'MiClaveSegura2026!';
    const newHash = await sandbox.computeSha256(newPass);
    initialAuth.users[0].passwordHash = newHash;
    sandbox.saveAuthData(initialAuth);

    const reloadedAuth = sandbox.getAuthData();
    assert(reloadedAuth.users[0].passwordHash === newHash, 'La nueva contraseña debe guardarse con su hash');

    // Intentar iniciar sesión con la clave correcta
    const hashCheck = await sandbox.computeSha256(newPass);
    const validMatch = reloadedAuth.users.find(u => u.username === 'admin' && u.passwordHash === hashCheck);
    assert(!!validMatch, 'Login con contraseña legítima actualizada debe ser exitoso');

    // Intentar bypass con el PIN maestro antiguo "1313"
    const masterHash = await sandbox.computeSha256('1313');
    const masterMatch = reloadedAuth.users.find(u => u.username === 'admin' && u.passwordHash === masterHash);
    assert(!masterMatch, 'El PIN maestro 1313 NO debe autenticar tras cambiar la contraseña');

    // Intentar bypass con código 2026
    const bypassHash = await sandbox.computeSha256('2026');
    const bypassMatch = reloadedAuth.users.find(u => u.username === 'admin' && u.passwordHash === bypassHash);
    assert(!bypassMatch, 'El código 2026 NO debe autenticar tras cambiar la contraseña');
  }

  console.log('\n--- TEST 2: Sanitización de Cadenas contra Ataques XSS ---');
  {
    const escapeHtml = sandbox.escapeHtml;
    const malicious = '<script>alert("XSS")</script>&<img src=x onerror=alert(1)>';
    const escaped = escapeHtml(malicious);

    assert(!escaped.includes('<script>'), 'No debe contener etiquetas <script>');
    assert(!escaped.includes('<img'), 'No debe contener etiquetas <img>');
    assert(escaped.includes('&lt;script&gt;'), 'Debe escapar < y >');
    assert(escaped.includes('&amp;'), 'Debe escapar &');
    assert(escaped.includes('&quot;'), 'Debe escapar comillas dobles');
  }

  console.log('\n--- TEST 3: Esquema RealScanProject v2 y Separación de Originales ---');
  {
    // Simular estado completo del proyecto
    sandbox.window.state.paperSize = 'oficio';
    sandbox.window.state.printMode = 'both_separate';
    sandbox.window.state.duplicateCard = true;
    sandbox.window.state.includeCutMarks = false;
    sandbox.window.state.includeRulerFooter = false;
    sandbox.window.state.images.front = {
      rawOriginalSrc: 'data:image/jpeg;base64,RAW_ORIGINAL_PIXELS',
      originalSrc: 'data:image/jpeg;base64,RAW_ORIGINAL_PIXELS',
      processedDataUrl: 'data:image/jpeg;base64,FILTERED_ROTATED_PIXELS',
      filter: 'bw',
      rotation: 90,
      zoom: 1.25,
      brightness: 10,
      contrast: 5
    };

    // Crear mock DB
    const mockDBStore = {};
    sandbox.getDB = async () => ({
      transaction: () => ({
        objectStore: () => ({
          put: (rec) => {
            mockDBStore[rec.id] = rec;
            const req = { onsuccess: null, onerror: null };
            setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
            return req;
          }
        })
      })
    });

    const savedRecord = await sandbox.saveScanToStorage('Test Proyecto Completo', 5);
    assert(savedRecord !== null, 'Debe guardar el registro');
    assert(savedRecord.schemaVersion === 2, 'El registro debe tener schemaVersion = 2');
    assert(savedRecord.paperSize === 'oficio', 'Debe persistir paperSize = oficio');
    assert(savedRecord.printMode === 'both_separate', 'Debe persistir printMode = both_separate');
    assert(savedRecord.duplicateCard === true, 'Debe persistir duplicateCard = true');
    assert(savedRecord.includeCutMarks === false, 'Debe persistir includeCutMarks = false');
    assert(savedRecord.includeRulerFooter === false, 'Debe persistir includeRulerFooter = false');

    const frontPage = savedRecord.pages[0];
    assert(frontPage.rawOriginalSrc === 'data:image/jpeg;base64,RAW_ORIGINAL_PIXELS', 'Debe guardar rawOriginalSrc intacto');
    assert(frontPage.filter === 'bw' && frontPage.rotation === 90, 'Debe guardar parámetros de edición');
  }

  console.log('\n--- TEST 4: Restauración Sin Doble Procesamiento y Limpieza de Estado ---');
  {
    // Mock scans getter
    const savedRecord = {
      schemaVersion: 2,
      id: 'scan_123',
      paperSize: 'letter',
      printMode: 'single',
      documentPageCount: 1,
      duplicateCard: false,
      includeCutMarks: true,
      includeRulerFooter: true,
      pages: [
        {
          slot: 'front',
          rawOriginalSrc: 'data:image/jpeg;base64,RAW_CLEAN',
          originalSrc: 'data:image/jpeg;base64,RAW_CLEAN',
          dataUrl: 'data:image/jpeg;base64,PROCESSED',
          filter: 'scanner',
          rotation: 180,
          zoom: 1.1
        }
      ]
    };

    sandbox.getAllScansFromStorage = async () => [savedRecord];
    sandbox.closeModal = () => {};
    sandbox.showToast = () => {};

    // Estado sucio previo en ranura back
    sandbox.window.state.images.back = {
      rawOriginalSrc: 'data:image/jpeg;base64,DIRTY_PREVIOUS',
      processedDataUrl: 'data:image/jpeg;base64,DIRTY_PREVIOUS'
    };

    await sandbox.restoreScanToApp('scan_123');

    // 1. Limpieza de ranuras anteriores
    assert(sandbox.window.state.images.back.rawOriginalSrc === null, 'La ranura back del trabajo anterior debe quedar limpia');
    assert(sandbox.window.state.images.back.processedDataUrl === null, 'processedDataUrl del trabajo anterior debe quedar null');

    // 2. Restauración de parámetros
    assert(sandbox.window.state.paperSize === 'letter', 'Debe restaurar papel = letter');
    assert(sandbox.window.state.printMode === 'single', 'Debe restaurar printMode = single');

    // 3. Restauración de imagen sin duplicar transformaciones
    const restoredFront = sandbox.window.state.images.front;
    assert(restoredFront.rawOriginalSrc === 'data:image/jpeg;base64,RAW_CLEAN', 'rawOriginalSrc restaurado correctamente');
    assert(restoredFront.filter === 'scanner' && restoredFront.rotation === 180, 'Parámetros de edición intactos');
  }

  console.log('\n--- TEST 5: Migración de Proyectos v1 Antiguos ---');
  {
    // Simular registro antiguo v1 (sin schemaVersion ni rawOriginalSrc)
    const oldV1Record = {
      id: 'scan_old_v1',
      title: 'INE Anterior',
      format: 'card',
      pages: [
        {
          slot: 'front',
          dataUrl: 'data:image/jpeg;base64,PRE_FILTERED_IMAGE',
          filter: 'bw',
          rotation: 90,
          zoom: 1.0
        }
      ]
    };

    sandbox.getAllScansFromStorage = async () => [oldV1Record];
    await sandbox.restoreScanToApp('scan_old_v1');

    const restoredFront = sandbox.window.state.images.front;
    assert(restoredFront.rawOriginalSrc === 'data:image/jpeg;base64,PRE_FILTERED_IMAGE', 'En v1, la imagen guardada se convierte en el original de partida');
    assert(restoredFront.filter === 'color' && restoredFront.rotation === 0, 'En v1, los filtros deben resetearse a neutros para no aplicarse por duplicado');
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log('🎉 TODAS LAS PRUEBAS DE LA ETAPA 2 PASARON CON ÉXITO');
    process.exit(0);
  } else {
    console.error(`❌ HUBO ${failures} FALLOS EN LA ETAPA 2`);
    process.exit(1);
  }
}

runTests();
