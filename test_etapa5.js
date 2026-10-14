/**
 * Suite de Verificación Integral - Etapa 5 (Recuperación y Productividad)
 * Valida:
 * - M-27: Auto-guardado y recuperación de borrador tras cierre accidental
 * - M-28: Nuevo trabajo / Reset con confirmación segura
 * - M-29: Presets de usuario guardables, aplicables y borrables
 * - M-30: Búsqueda y filtrado en tiempo real en historial
 * - M-31: Preflight checks (detección de fotos faltantes, <150 DPI y desbordes)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createBrowserSandbox() {
  const mockLocalStorage = (function() {
    let store = {};
    return {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { store = {}; },
      _dump: () => store
    };
  })();

  const elements = {};
  function getOrCreateElement(id) {
    if (!elements[id]) {
      let children = [];
      let html = '';
      elements[id] = {
        id: id,
        value: '',
        textContent: '',
        get innerHTML() { return html; },
        set innerHTML(v) {
          html = v;
          if (v === '' || !v) children = [];
        },
        className: '',
        classList: {
          classes: new Set(),
          add: function(c) { this.classes.add(c); },
          remove: function(c) { this.classes.delete(c); },
          toggle: function(c, force) {
            if (force === true) this.classes.add(c);
            else if (force === false) this.classes.delete(c);
            else if (this.classes.has(c)) this.classes.delete(c);
            else this.classes.add(c);
          },
          contains: function(c) { return this.classes.has(c); }
        },
        style: {},
        get children() { return children; },
        appendChild: function(child) { children.push(child); },
        querySelectorAll: function() { return []; },
        addEventListener: function() {}
      };
    }
    return elements[id];
  }

  const sandbox = {
    console: console,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    localStorage: mockLocalStorage,
    window: {},
    document: {
      getElementById: (id) => getOrCreateElement(id),
      createElement: (tag) => ({
        tagName: tag,
        className: '',
        innerHTML: '',
        children: [],
        appendChild: function(c) { this.children.push(c); },
        querySelectorAll: function() { return []; },
        addEventListener: function() {}
      }),
      addEventListener: () => {}
    },
    $: (id) => getOrCreateElement(id),
    escapeHtml: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    showToast: () => {},
    confirm: () => true,
    alert: () => {},
    state: {
      activeCategory: 'docs',
      format: 'card',
      paperSize: 'a4',
      printMode: 'both',
      sheetLayout: 'same_page',
      documentPageCount: 2,
      documentCustomTitle: 'Mi Credencial',
      duplicateCard: true,
      includeRulerFooter: true,
      includeDocLabels: true,
      includeCutMarks: true,
      customWidth: 8.5,
      customHeight: 5.4,
      customUnit: 'cm',
      photoCopies: 4,
      images: {
        front: { originalSrc: 'data:image/png;base64,AAA', naturalWidth: 1012, naturalHeight: 638 },
        back: { originalSrc: 'data:image/png;base64,BBB', naturalWidth: 1012, naturalHeight: 638 },
        page3: { originalSrc: null },
        page4: { originalSrc: null }
      }
    },
    getActiveSpec: () => ({ name: 'Credencial / Tarjeta', widthMm: 85.6, heightMm: 53.98, fileName: 'credencial' }),
    getActivePaperSpec: () => ({ name: 'A4', widthMm: 210, heightMm: 297 }),
    getSlotFriendlyName: (s) => s.toUpperCase(),
    updateSidePreview: () => {},
    updateUI: () => {},
    updatePreviewAnnotations: () => {}
  };
  sandbox.window = sandbox;
  return sandbox;
}

async function runTests() {
  console.log('🧪 Iniciando Suite de Verificación Etapa 5 (Recuperación y Productividad)...');
  const code = fs.readFileSync(path.join(__dirname, 'js/storage.js'), 'utf8');

  // TEST 1: M-27 Auto-guardado y recuperación de borrador
  {
    console.log('  ▶ Test 1: Guardado y Restauración de Borrador Activo (M-27)...');
    const sb = createBrowserSandbox();
    vm.createContext(sb);
    vm.runInContext(code, sb);

    sb.saveActiveDraft();
    const draft = sb.getActiveDraft();
    assert(draft !== null, 'El borrador guardado no debe ser null');
    assert.strictEqual(draft.format, 'card');
    assert.strictEqual(draft.documentCustomTitle, 'Mi Credencial');
    assert.strictEqual(draft.images.front.originalSrc, 'data:image/png;base64,AAA');

    // Modificar el estado y restaurar
    sb.state.documentCustomTitle = 'Otro Documento';
    sb.state.format = 'free';
    const restored = await sb.restoreActiveDraft();
    assert.strictEqual(restored, true, 'restoreActiveDraft debe retornar true');
    assert.strictEqual(sb.state.documentCustomTitle, 'Mi Credencial', 'Debe recuperar el título guardado');
    assert.strictEqual(sb.state.format, 'card', 'Debe recuperar el formato guardado');

    // Limpiar borrador
    sb.clearActiveDraft();
    assert.strictEqual(sb.getActiveDraft(), null, 'clearActiveDraft debe vaciar el borrador');
    console.log('    ✅ M-27 Borrador Activo verificado.');
  }

  // TEST 2: M-28 Nuevo Trabajo / Reset de Lienzo con Confirmación
  {
    console.log('  ▶ Test 2: Nuevo Trabajo y Reset Seguro de Lienzo (M-28)...');
    const sb = createBrowserSandbox();
    let slotCleared = [];
    sb.clearSlot = (s) => { slotCleared.push(s); };
    vm.createContext(sb);
    vm.runInContext(code, sb);

    sb.saveActiveDraft();
    sb.resetWorkspaceToNewProject();

    assert.strictEqual(sb.getActiveDraft(), null, 'Debe limpiar el borrador activo al crear nuevo proyecto');
    assert.deepStrictEqual(slotCleared, ['front', 'back', 'page3', 'page4'], 'Debe limpiar las 4 ranuras');
    assert.strictEqual(sb.state.documentCustomTitle, '', 'Debe reiniciar el título');
    console.log('    ✅ M-28 Reset Seguro de Lienzo verificado.');
  }

  // TEST 3: M-29 Presets de Usuario (Guardar, Aplicar, Eliminar)
  {
    console.log('  ▶ Test 3: Presets de Usuario Guardables y Aplicables (M-29)...');
    const sb = createBrowserSandbox();
    vm.createContext(sb);
    vm.runInContext(code, sb);

    const preset = sb.saveUserPreset('Credencial de Chofer');
    assert(preset !== null, 'El preset no debe ser null');
    assert.strictEqual(preset.name, 'Credencial de Chofer');
    assert.strictEqual(preset.format, 'card');

    let allPresets = sb.getUserPresets();
    assert.strictEqual(allPresets.length, 1, 'Debe haber 1 preset guardado');

    // Cambiar configuración en el estado
    sb.state.paperSize = 'letter';
    sb.state.duplicateCard = false;

    // Aplicar preset
    const applied = sb.applyUserPreset(preset.id);
    assert.strictEqual(applied, true, 'applyUserPreset debe retornar true');
    assert.strictEqual(sb.state.duplicateCard, true, 'Debe restaurar duplicateCard del preset');

    // Eliminar preset
    sb.deleteUserPreset(preset.id);
    assert.strictEqual(sb.getUserPresets().length, 0, 'El preset debe haber sido eliminado');
    console.log('    ✅ M-29 Presets de Usuario verificado.');
  }

  // TEST 4: M-30 Búsqueda y Filtrado en Tiempo Real en Historial
  {
    console.log('  ▶ Test 4: Búsqueda y Filtrado en Historial (M-30)...');
    const sb = createBrowserSandbox();
    const mockScans = [
      { id: 'scan_1', title: 'INE Juan Perez 2026', createdFormatted: '14/10/2026', expiresAt: 0, pages: [{}] },
      { id: 'scan_2', title: 'Licencia Manejo A', createdFormatted: '12/10/2026', expiresAt: 0, pages: [{}] },
      { id: 'scan_3', title: 'Pasaporte Abierto', createdFormatted: '10/10/2026', expiresAt: 0, pages: [{}, {}] }
    ];
    sb.getAllScansFromStorage = async () => mockScans;
    sb.window.getAllScansFromStorage = async () => mockScans;
    vm.createContext(sb);
    vm.runInContext(code, sb);
    sb.window.getAllScansFromStorage = async () => mockScans;

    // Búsqueda por coincidencia
    await sb.renderHistoryUI('juan');
    const container = sb.$('historyItemsContainer');
    assert.strictEqual(container.children.length, 1, 'Debe filtrar únicamente el documento de Juan');

    // Búsqueda sin coincidencias
    await sb.renderHistoryUI('inexistente');
    assert(container.innerHTML.includes('No se encontraron escaneos'), 'Debe mostrar mensaje de sin coincidencias');

    // Sin filtro (todos)
    await sb.renderHistoryUI('');
    assert.strictEqual(container.children.length, 3, 'Sin filtro debe mostrar los 3 registros');
    console.log('    ✅ M-30 Búsqueda en Historial verificada.');
  }

  // TEST 5: M-31 Validaciones de Pre-Vuelo Estrictas (Preflight Checks)
  {
    console.log('  ▶ Test 5: Preflight Checks de Impresión y Resolución (M-31)...');
    const sb = createBrowserSandbox();
    vm.createContext(sb);
    vm.runInContext(code, sb);

    // Caso A: Sin fotos cargadas
    sb.state.images.front.originalSrc = null;
    sb.state.images.back.originalSrc = null;
    let chk = sb.runPreflightChecks();
    assert.strictEqual(chk.valid, false, 'Sin fotos debe fallar');
    assert(chk.issues.some(x => x.type === 'error' && x.message.includes('No hay ninguna foto cargada')));

    // Caso B: Foto con resolución insuficiente (<150 DPI físico)
    // Para credencial de 54mm de alto, 150 DPI = (54/25.4)*150 = ~318 px. Si mide 100px:
    sb.state.images.front.originalSrc = 'data:image/png;base64,AAA';
    sb.state.images.front.naturalWidth = 120;
    sb.state.images.front.naturalHeight = 90;
    chk = sb.runPreflightChecks();
    assert.strictEqual(chk.valid, true, 'Warnings no impiden valid si no hay errors fatales');
    assert(chk.issues.some(x => x.type === 'warning' && x.message.includes('Resolución baja')));

    // Caso C: Documento mayor que el papel
    sb.getActiveSpec = () => ({ name: 'Gigante', widthMm: 400, heightMm: 500 });
    chk = sb.runPreflightChecks();
    assert.strictEqual(chk.valid, false, 'Documento mayor al papel debe ser error fatal');
    assert(chk.issues.some(x => x.type === 'error' && x.message.includes('supera el papel')));

    // Caso D: Documento correcto con alta resolución
    sb.getActiveSpec = () => ({ name: 'Credencial', widthMm: 85.6, heightMm: 54 });
    sb.state.images.front.naturalWidth = 1012;
    sb.state.images.front.naturalHeight = 638;
    chk = sb.runPreflightChecks();
    assert.strictEqual(chk.valid, true, 'Documento correcto debe ser válido');
    assert.strictEqual(chk.issues.length, 0, 'No debe tener issues');
    console.log('    ✅ M-31 Preflight Checks verificado.');
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA ETAPA 5 PASARON EXITOSAMENTE AL 100%!');
}

runTests().catch(err => {
  console.error('❌ Error en suite Etapa 5:', err);
  process.exit(1);
});
