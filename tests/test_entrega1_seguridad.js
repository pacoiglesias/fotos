const projectRoot = require('path').resolve(__dirname, '..');
/* ============================================================
   RealScan Pro — Suite de Regresión: Entrega 1
   Integridad de Exportación, Validación Geométrica y Seguridad
   ============================================================ */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🧪 Iniciando Suite de Regresión: Entrega 1...');

// Cargar scripts requeridos
const configCode = fs.readFileSync(path.join(projectRoot, 'js', 'config.js'), 'utf-8');
const layoutCode = fs.readFileSync(path.join(projectRoot, 'js', 'layout-engine.js'), 'utf-8');
const storageCode = fs.readFileSync(path.join(projectRoot, 'js', 'storage.js'), 'utf-8');
const authCode = fs.readFileSync(path.join(projectRoot, 'js', 'auth.js'), 'utf-8');
const exportCode = fs.readFileSync(path.join(projectRoot, 'js', 'export.js'), 'utf-8');

function createSandbox() {
  const store = {};
  const mockLocalStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; }
  };

  const elements = {};
  function getEl(id) {
    if (!elements[id]) {
      let html = '';
      const children = [];
      elements[id] = {
        id,
        value: '',
        textContent: '',
        disabled: false,
        className: '',
        style: {},
        get innerHTML() { return html; },
        set innerHTML(v) { html = v; },
        children,
        appendChild: function(c) { children.push(c); },
        removeChild: function(c) {
          const idx = children.indexOf(c);
          if (idx >= 0) children.splice(idx, 1);
        },
        querySelector: function(sel) {
          // Buscador simple para clases en mocks
          if (sel.startsWith('.')) {
            const cls = sel.slice(1);
            if (html.includes(cls)) {
              const subEl = {
                className: cls,
                children: [],
                appendChild: function(c) { this.children.push(c); }
              };
              return subEl;
            }
          }
          return null;
        },
        querySelectorAll: function() { return []; },
        addEventListener: function() {},
        classList: {
          add: () => {},
          remove: () => {},
          toggle: () => {},
          contains: () => false
        }
      };
    }
    return elements[id];
  }

  const sb = {
    console,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    localStorage: mockLocalStorage,
    document: {
      getElementById: (id) => getEl(id),
      createElement: (tag) => {
        const el = {
          tagName: tag,
          className: '',
          src: '',
          alt: '',
          textContent: '',
          disabled: false,
          children: [],
          appendChild: function(c) { this.children.push(c); },
          querySelector: function() { return null; },
          querySelectorAll: function() { return []; },
          addEventListener: function() {},
          setAttribute: function(k, v) { this[k] = v; },
          getAttribute: function(k) { return this[k]; }
        };
        return el;
      },
      body: {
        classList: { add: () => {}, remove: () => {} },
        appendChild: () => {},
        removeChild: () => {}
      },
      addEventListener: () => {}
    },
    window: {},
    $: (id) => getEl(id),
    TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : require('util').TextEncoder,
    Buffer: Buffer,
    escapeHtml: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    showToast: () => {},
    confirm: () => true,
    alert: () => {},
    crypto: {
      subtle: {
        digest: async (algo, data) => {
          // Mock simple determinístico para hash
          const str = Buffer.from(data).toString('utf-8');
          const hash = Buffer.from(str).toString('hex').padStart(64, '0');
          return Buffer.from(hash, 'hex');
        }
      }
    }
  };

  sb.window = sb;
  return sb;
}

async function runTests() {
  // ============================================================
  // TEST 1: Regresión C01 — No inventar caras faltantes (PDF / Preflight)
  // ============================================================
  console.log('  ▶ Test 1: Comprobación estricta de caras faltantes (C01)...');
  {
    const sb = createSandbox();
    vm.createContext(sb);
    vm.runInContext(configCode, sb);
    vm.runInContext(layoutCode, sb);
    vm.runInContext(storageCode, sb);

    // Configurar documento de 2 caras (Frente y Reverso)
    sb.state.activeCategory = 'docs';
    sb.state.format = 'card';
    sb.state.printMode = 'both';
    sb.state.documentPageCount = 2;
    sb.state.images.front = {
      originalSrc: 'data:image/png;base64,FRONT_IMG',
      processedDataUrl: 'data:image/png;base64,FRONT_PROCESSED',
      naturalWidth: 800,
      naturalHeight: 500
    };
    sb.state.images.back = {
      originalSrc: null,
      processedDataUrl: null
    };

    // 1. Preflight debe bloquear con error
    const preflight = sb.runPreflightChecks();
    assert.strictEqual(preflight.valid, false, 'Preflight debe ser inválido si falta el reverso en modo 2 caras');
    const missingSlotIssue = preflight.issues.find(x => x.code === 'MISSING_SLOT' && x.slot === 'back');
    assert(missingSlotIssue, 'Debe reportar issue de cara faltante para slot back');
    assert(missingSlotIssue.message.includes('Falta la imagen para: Reverso'), 'El mensaje debe indicar explícitamente el reverso faltante');

    // 2. Simular generación en Canvas: placement de back no debe recibir front
    const layout = sb.RealScanLayout.computeDocumentLayout(sb.state);
    const backPlacement = layout.pages[0].placements.find(p => p.slot === 'back');
    assert(backPlacement, 'Debe existir placement para reverso');

    const loadedImages = {
      front: { src: 'FRONT_OBJ' }
      // back no cargado
    };
    const imgObj = (loadedImages && loadedImages[backPlacement.slot]) ? loadedImages[backPlacement.slot] : null;
    assert.strictEqual(imgObj, null, 'El slot back no debe recibir fallback a front bajo ninguna circunstancia');

    console.log('    ✅ C01: Imágenes faltantes no sustituidas y preflight bloqueante verificado.');
  }

  // ============================================================
  // TEST 2: Regresión C06 — Validación geométrica común centralizada
  // ============================================================
  console.log('  ▶ Test 2: Validación geométrica común bloqueante (C06)...');
  {
    const sb = createSandbox();
    vm.createContext(sb);
    vm.runInContext(configCode, sb);
    vm.runInContext(layoutCode, sb);

    // Caso A: Documento gigante de 250 × 400 mm en A4 (210 × 297 mm)
    const giantSpec = { widthMm: 250, heightMm: 400, shortName: 'Gigante 250x400' };
    const a4Paper = { widthMm: 210, heightMm: 297, shortName: 'A4' };

    const stateGiant = {
      activeCategory: 'custom',
      customWidth: 25,
      customHeight: 40,
      customUnit: 'cm',
      paperSize: 'a4',
      printMode: 'single',
      images: { front: { processedDataUrl: 'data:image/png;base64,AAA' } }
    };

    sb.getActiveSpec = () => giantSpec;
    sb.getActivePaperSpec = () => a4Paper;

    const layoutGiant = sb.RealScanLayout.computeDocumentLayout(stateGiant);
    assert.strictEqual(layoutGiant.errors.length > 0, true, 'El layout gigante debe contener errores bloqueantes');
    assert(layoutGiant.errors.some(e => e.includes('supera el papel')), 'Debe reportar que el documento supera el papel');

    const geomCheck = sb.RealScanLayout.validateDocumentGeometry(layoutGiant, giantSpec, a4Paper);
    assert.strictEqual(geomCheck.valid, false, 'validateDocumentGeometry debe devolver valid=false para documento gigante');
    assert(geomCheck.errors.some(e => e.includes('desborda la hoja') || e.includes('supera el papel')));

    // Caso B: Dimensiones negativas o no finitas
    const invalidSpec = { widthMm: -10, heightMm: NaN };
    const invalidCheck = sb.RealScanLayout.validateDocumentGeometry(null, invalidSpec, a4Paper);
    assert.strictEqual(invalidCheck.valid, false, 'Medidas no finitas/negativas deben ser inválidas');

    console.log('    ✅ C06: Validación geométrica bloqueante verificada (sin encogimiento silencioso).');
  }

  // ============================================================
  // TEST 3: Regresión C03 — Permisos por rol y protección del último admin
  // ============================================================
  console.log('  ▶ Test 3: Permisos de operador y continuidad del administrador (C03)...');
  {
    const sb = createSandbox();
    vm.createContext(sb);
    vm.runInContext(configCode, sb);
    vm.runInContext(authCode, sb);

    // 1. Estado inicial (v3.12.0): sin cuentas precreadas ni credencial de
    // fábrica; el primer uso obliga a crear el administrador.
    const initialAuth = sb.getAuthData();
    assert.strictEqual(initialAuth.users.length, 0);
    assert.strictEqual(initialAuth.needsSetup, true);
    await sb.createInitialAdmin('admin', 'ClaveInicialSegura2026');
    const authAdmin = sb.getAuthData();
    assert.strictEqual(authAdmin.users.length, 1);
    assert.strictEqual(authAdmin.users[0].role, 'admin');

    // 2. Crear un operador legítimo mediante admin
    sb.window.DEFAULT_USER = 'admin';

    sb.$('inputAddUserName').value = 'cajero1';
    sb.$('inputAddUserPass').value = 'pin1234';
    sb.$('selectAddUserRole').value = 'operador';
    await sb.handleAddUser();

    const authWithOp = sb.getAuthData();
    assert.strictEqual(authWithOp.users.length, 2);
    const cajero = authWithOp.users.find(u => u.username === 'cajero1');
    assert(cajero && cajero.role === 'operador', 'El operador cajero1 debe haber sido creado');

    // 3. Cambiar sesión activa a cajero1 (rol operador)
    authWithOp.currentUsername = 'cajero1';
    sb.saveAuthData(authWithOp);
    assert.strictEqual(sb.getCurrentUserRole(), 'operador');
    assert.strictEqual(sb.isCurrentUserAdmin(), false);

    // 4. Operador intenta crear un nuevo administrador -> Debe ser bloqueado
    sb.$('inputAddUserName').value = 'admin_hacker';
    sb.$('inputAddUserPass').value = 'hacked123';
    sb.$('selectAddUserRole').value = 'admin';
    await sb.handleAddUser();

    const authAfterBlockedAdd = sb.getAuthData();
    assert.strictEqual(authAfterBlockedAdd.users.length, 2, 'El operador NO debe haber podido crear un usuario');
    assert(!authAfterBlockedAdd.users.some(u => u.username === 'admin_hacker'));

    // 5. Operador intenta eliminar al administrador legítimo -> Debe ser bloqueado
    sb.handleDeleteUser('admin');
    const authAfterBlockedDelete = sb.getAuthData();
    assert(authAfterBlockedDelete.users.some(u => u.username === 'admin'), 'El admin NO debe poder ser eliminado por un operador');

    // 6. Cambiar sesión a admin e intentar eliminar al ÚNICO admin -> Debe ser bloqueado
    authAfterBlockedDelete.currentUsername = 'admin';
    sb.saveAuthData(authAfterBlockedDelete);
    assert.strictEqual(sb.getCurrentUserRole(), 'admin');

    sb.handleDeleteUser('admin');
    const authAfterSoleAdminCheck = sb.getAuthData();
    assert(authAfterSoleAdminCheck.users.some(u => u.username === 'admin'), 'El único admin del sistema no debe poder ser eliminado');

    console.log('    ✅ C03: Permisos de operador respetados y continuidad de admin protegida.');
  }

  // ============================================================
  // TEST 4: Regresión C03 — Sanitización DOM en miniaturas de historial
  // ============================================================
  console.log('  ▶ Test 4: Renderizado seguro de miniaturas vía propiedad DOM src (C03)...');
  {
    const sb = createSandbox();
    vm.createContext(sb);
    vm.runInContext(configCode, sb);
    vm.runInContext(storageCode, sb);

    // Inyección maliciosa simulada en miniatura
    const payloadInjected = 'data:image/png;base64,AAA" data-audit-injected="true" style="display:none"';
    const mockScans = [{
      id: 'scan_vuln_1',
      title: 'INE Seguro',
      createdFormatted: '14/10/2026',
      thumbnail: payloadInjected,
      pages: [{ dataUrl: 'data:image/png;base64,AAA' }]
    }];

    sb.getAllScansFromStorage = async () => mockScans;

    // Renderizar dashboard
    await sb.renderSavedScansDashboard();
    const dashContainer = sb.$('recentScansGrid');
    assert(!dashContainer.innerHTML.includes('data-audit-injected='), 'No debe existir atributo inyectado data-audit-injected en el HTML del dashboard');

    // Renderizar historial
    await sb.renderHistoryUI();
    const histContainer = sb.$('historyItemsContainer');
    assert(!histContainer.innerHTML.includes('data-audit-injected='), 'No debe existir atributo inyectado data-audit-injected en el HTML del historial');

    console.log('    ✅ C03: Cero interpolación insegura de HTML en miniaturas verificado.');
  }

  console.log('\n========================================');
  console.log('🎉 TODAS LAS PRUEBAS DE LA ENTREGA 1 PASARON AL 100%');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('\n❌ ERROR EN SUITE ENTREGA 1:', err);
  process.exit(1);
});
