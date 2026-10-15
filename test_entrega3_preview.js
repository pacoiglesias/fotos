/* ============================================================
   SUITE DE PRUEBAS: ENTREGA 3 — VISTA PREVIA FIEL Y HERRAMIENTAS
   RealScan Pro • Verificación de Placements, Multipágina y Edición
   ============================================================ */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function runTest() {
  console.log('--- Iniciando Test Entrega 3: Vista Previa Fiel, Herramientas y Multipágina ---');

  // 1. Simulación de entorno DOM y navegador
  const elements = {};
  const domListeners = {};

  function makeMockElement(id, tag = 'div') {
    return {
      id: id,
      tagName: tag.toUpperCase(),
      classList: {
        _classes: new Set(),
        add: function(...cls) { cls.forEach(c => this._classes.add(c)); },
        remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); },
        toggle: function(c, force) {
          if (force === undefined) {
            if (this._classes.has(c)) this._classes.delete(c);
            else this._classes.add(c);
          } else if (force) {
            this._classes.add(c);
          } else {
            this._classes.delete(c);
          }
        },
        contains: function(c) { return this._classes.has(c); }
      },
      style: {},
      innerHTML: '',
      textContent: '',
      value: '',
      disabled: false,
      children: [],
      appendChild: function(ch) { this.children.push(ch); return ch; },
      setAttribute: function(k, v) { this[k] = v; },
      getAttribute: function(k) { return this[k]; },
      removeAttribute: function(k) { delete this[k]; },
      addEventListener: function(evt, handler) {
        if (!domListeners[evt]) domListeners[evt] = [];
        domListeners[evt].push({ el: this, handler });
      },
      dispatchEvent: function(e) {
        if (domListeners[e.type]) {
          domListeners[e.type].filter(l => l.el === this).forEach(l => l.handler(e));
        }
      },
      getBoundingClientRect: function() { return { left: 0, top: 0, width: 300, height: 400 }; }
    };
  }

  const documentMock = {
    getElementById: function(id) {
      if (!elements[id]) elements[id] = makeMockElement(id);
      return elements[id];
    },
    querySelector: function(sel) {
      if (sel === '.a4-sheet') return documentMock.getElementById('faithfulSheetPlacements');
      return makeMockElement(sel);
    },
    querySelectorAll: function(sel) {
      return [];
    },
    createElement: function(tag) {
      return makeMockElement('gen_' + Math.random(), tag);
    },
    addEventListener: function(evt, h) {},
    readyState: 'complete'
  };

  const sandbox = {
    window: {},
    self: {},
    document: documentMock,
    console: console,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    localStorage: {
      _data: {},
      getItem: function(k) { return this._data[k] || null; },
      setItem: function(k, v) { this._data[k] = String(v); },
      removeItem: function(k) { delete this._data[k]; }
    },
    Image: function() {
      this.naturalWidth = 800;
      this.naturalHeight = 600;
      setTimeout(() => { if (this.onload) this.onload(); }, 1);
    }
  };

  sandbox.window = sandbox;
  sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);

  // Cargar scripts requeridos
  const configCode = fs.readFileSync(path.join(__dirname, 'js', 'config.js'), 'utf8');
  const cropWarpCode = fs.readFileSync(path.join(__dirname, 'js', 'crop-warp.js'), 'utf8');
  const layoutCode = fs.readFileSync(path.join(__dirname, 'js', 'layout-engine.js'), 'utf8');

  vm.runInContext(configCode, ctx);
  vm.runInContext(cropWarpCode, ctx);
  vm.runInContext(layoutCode, ctx);

  let passed = 0;
  let total = 0;

  function assert(condition, desc) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ ${desc}`);
    } else {
      console.error(`  ✗ FALLO: ${desc}`);
    }
  }

  // --- PRUEBA 1: Versión Unificada del Sistema ---
  assert(sandbox.window.APP_VERSION === 'v' + JSON.parse(fs.readFileSync('package.json','utf8')).version, 'APP_VERSION coincide con la versión del paquete');

  // --- PRUEBA 2: Duplicado en 2 columnas genera 4 placements en la hoja ---
  const stateDup = JSON.parse(JSON.stringify(sandbox.window.state));
  stateDup.format = 'card';
  stateDup.printMode = 'both';
  stateDup.documentPageCount = 2;
  stateDup.duplicateCard = true;
  stateDup.paperSize = 'a4';

  const planDup = sandbox.window.RealScanLayout.computeDocumentLayout(stateDup);
  assert(planDup.pages.length === 1, 'Modo duplicado cabe en 1 hoja A4');
  assert(planDup.pages[0].placements.length === 4, 'Modo duplicado genera exactamente 4 placements (2 frentes + 2 reversos)');

  const pCol1 = planDup.pages[0].placements.filter(p => p.xMm < 100);
  const pCol2 = planDup.pages[0].placements.filter(p => p.xMm >= 100);
  assert(pCol1.length === 2 && pCol2.length === 2, 'Los 4 placements se distribuyen en 2 columnas exactas');

  // --- PRUEBA 3: Paginación de fotos sin truncamiento artificial a 4 ---
  const statePhotos5 = JSON.parse(JSON.stringify(sandbox.window.state));
  statePhotos5.activeCategory = 'photos';
  statePhotos5.format = 'photo_titulo'; // 60x90 mm: caben 4 por hoja A4
  statePhotos5.photoCopies = 5;

  const planPhotos5 = sandbox.window.RealScanLayout.computeDocumentLayout(statePhotos5);
  assert(planPhotos5.totalPages === 2, '5 fotos de título se distribuyen en 2 hojas en lugar de recortarse a 4');
  assert(planPhotos5.pages[0].placements.length === 4, 'Hoja 1 contiene 4 fotos');
  assert(planPhotos5.pages[1].placements.length === 1, 'Hoja 2 contiene la 5ta foto solicitada');

  // --- PRUEBA 4: Cantidades independientes para mezcla de 2 fotos (Persona A y Persona B) ---
  const stateMix = JSON.parse(JSON.stringify(sandbox.window.state));
  stateMix.activeCategory = 'photos';
  stateMix.format = 'photo_infantil';
  stateMix.mixTwoPhotos = true;
  stateMix.photoCopiesPersonA = 3;
  stateMix.photoCopiesPersonB = 2;
  stateMix.photoCopies = 5;

  const planMix = sandbox.window.RealScanLayout.computeDocumentLayout(stateMix);
  const placementsA = planMix.pages[0].placements.filter(p => p.slot === 'front' && p.tag === 'A');
  const placementsB = planMix.pages[0].placements.filter(p => p.slot === 'back' && p.tag === 'B');
  assert(placementsA.length === 3, 'Se colocan exactamente 3 fotos para Persona A');
  assert(placementsB.length === 2, 'Se colocan exactamente 2 fotos para Persona B');

  // --- PRUEBA 5: Intercambio de ranuras (Swap) ---
  const slotFront = { originalSrc: 'data:image/jpeg;base64,FRONT_DATA', zoom: 1.2, panX: 10 };
  const slotBack = { originalSrc: 'data:image/jpeg;base64,BACK_DATA', zoom: 0.9, panX: -5 };
  const swapOk = sandbox.window.RealScanEditor.swapSlotData(slotFront, slotBack);
  assert(swapOk === true, 'RealScanEditor.swapSlotData ejecuta con éxito');
  assert(slotFront.originalSrc === 'data:image/jpeg;base64,BACK_DATA' && slotFront.zoom === 0.9, 'Ranura front recibió datos de back');
  assert(slotBack.originalSrc === 'data:image/jpeg;base64,FRONT_DATA' && slotBack.zoom === 1.2, 'Ranura back recibió datos de front');

  // --- PRUEBA 6: Homografía de perspectiva rechaza cuadriláteros colineales o singulares ---
  const quadColinear = [{ x: 10, y: 10 }, { x: 50, y: 50 }, { x: 100, y: 100 }, { x: 150, y: 150 }];
  const H_singular = sandbox.window.RealScanEditor.getPerspectiveTransform(quadColinear, 300, 200);
  assert(H_singular === null, 'getPerspectiveTransform devuelve null para 4 esquinas colineales');

  const quadValid = [{ x: 10, y: 10 }, { x: 290, y: 12 }, { x: 288, y: 195 }, { x: 12, y: 198 }];
  const H_valid = sandbox.window.RealScanEditor.getPerspectiveTransform(quadValid, 300, 200);
  assert(Array.isArray(H_valid) && H_valid.length === 9, 'getPerspectiveTransform devuelve matriz 3x3 válida para cuadrilátero convexo');

  console.log(`\n========================================`);
  console.log(`Resultado Entrega 3: ${passed}/${total} pruebas superadas.`);
  console.log(`========================================\n`);

  if (passed !== total) process.exit(1);
}

runTest();
