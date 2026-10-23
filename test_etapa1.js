// test_etapa1.js — Verificación sintética de la Etapa 1
const fs = require('fs');
const vm = require('vm');

// Mock window and browser context
const sandbox = {
  window: {},
  console: console,
  Math: Math,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN
};
sandbox.window = sandbox;

// Load config.js
const configCode = fs.readFileSync('js/config.js', 'utf8');
vm.runInNewContext(configCode, sandbox);

// Load layout-engine.js
const layoutCode = fs.readFileSync('js/layout-engine.js', 'utf8');
vm.runInNewContext(layoutCode, sandbox);

const RealScanLayout = sandbox.window.RealScanLayout;
console.log('✅ RealScanLayout cargado con éxito.');

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log('  ✓ ' + msg);
  } else {
    console.error('  ✗ FALLO: ' + msg);
    failures++;
  }
}

// TEST 1: Modos de caras separadas (both_separate)
console.log('\n--- TEST 1: Modo 2 Caras Separadas (both_separate) ---');
{
  const state = JSON.parse(JSON.stringify(sandbox.window.state));
  state.format = 'card';
  state.printMode = 'both_separate';
  state.paperSize = 'a4';
  const layout = RealScanLayout.computeDocumentLayout(state);

  assert(layout.pages.length === 2, 'Debe generar exactamente 2 páginas');
  assert(layout.pages[0].placements.length === 1 && layout.pages[0].placements[0].slot === 'front', 'Página 1 debe contener solo Front');
  assert(layout.pages[1].placements.length === 1 && layout.pages[1].placements[0].slot === 'back', 'Página 2 debe contener solo Back');
  assert(layout.pages[0].paper.shortName === 'A4', 'El papel debe ser A4');
}

// TEST 2: Duplicado y Paginación (evitar desbordamiento vertical)
console.log('\n--- TEST 2: Documento duplicado con auto-paginación ---');
{
  const state = JSON.parse(JSON.stringify(sandbox.window.state));
  state.activeCategory = 'custom';
  state.format = 'custom';
  state.customWidth = 80;
  state.customHeight = 100;
  state.customUnit = 'mm';
  state.documentPageCount = 4;
  state.duplicateCard = true;
  state.paperSize = 'a4'; // A4 height = 297mm. 4 slots of 100mm + gap will NOT fit on 1 sheet.
  const layout = RealScanLayout.computeDocumentLayout(state);

  assert(layout.pages.length >= 2, 'Un documento de 4 caras de 100mm duplicado (8 items) debe paginar en múltiples hojas');
  layout.pages.forEach((p, idx) => {
    p.placements.forEach(item => {
      const bottomY = item.yMm + item.heightMm;
      assert(bottomY <= p.paper.heightMm, `En hoja ${idx+1}, el item ${item.label} (${bottomY.toFixed(1)}mm) no debe exceder el alto del papel (${p.paper.heightMm}mm)`);
    });
  });
}

// TEST 3: Hoja 100% limpia
console.log('\n--- TEST 3: Hoja 100% Limpia ---');
{
  const state = JSON.parse(JSON.stringify(sandbox.window.state));
  state.includeRulerFooter = false;
  state.includeDocLabels = false;
  state.includeCutMarks = false;
  const layout = RealScanLayout.computeDocumentLayout(state);

  assert(layout.cleanSheetMode === true, 'cleanSheetMode debe ser true');
  assert(layout.includeCutMarks === false, 'includeCutMarks debe ser false');
  assert(layout.includeDocLabels === false, 'includeDocLabels debe ser false');
  assert(layout.includeRulerFooter === false, 'includeRulerFooter debe ser false');
}

// TEST 4: Planilla de fotos y límites físicos
console.log('\n--- TEST 4: Planilla de Fotos en Oficio México y A4 ---');
{
  const state = JSON.parse(JSON.stringify(sandbox.window.state));
  state.activeCategory = 'photos';
  state.format = 'photo_infantil'; // 25x30mm
  state.photoCopies = 24;
  state.paperSize = 'oficio'; // 215.9 x 340mm
  const layout = RealScanLayout.computeDocumentLayout(state);

  assert(layout.isPhotoGrid === true, 'isPhotoGrid debe ser true');
  assert(layout.pages[0].placements.length === 24, 'Debe posicionar 24 fotos');
  const paperH = layout.pages[0].paper.heightMm;
  const lastItem = layout.pages[0].placements[23];
  assert(lastItem.yMm + lastItem.heightMm <= paperH, 'La última foto no debe salirse del papel Oficio');
}

// TEST 5: Todos los tamaños de papel calibrados
console.log('\n--- TEST 5: Validación de márgenes y área útil en todos los papeles ---');
['a4', 'letter', 'oficio', 'legal'].forEach(paperKey => {
  const state = JSON.parse(JSON.stringify(sandbox.window.state));
  state.paperSize = paperKey;
  state.format = 'card';
  state.printMode = 'both';
  const layout = RealScanLayout.computeDocumentLayout(state);
  const p = layout.pages[0];
  p.placements.forEach(item => {
    assert(item.xMm >= 0 && (item.xMm + item.widthMm) <= p.paper.widthMm, `${paperKey}: Item dentro de ancho de papel`);
    assert(item.yMm >= 0 && (item.yMm + item.heightMm) <= p.paper.heightMm, `${paperKey}: Item dentro de alto de papel`);
  });
});

console.log(`\n========================================`);
if (failures === 0) {
  console.log('🎉 TODAS LAS PRUEBAS DE LA ETAPA 1 PASARON CON ÉXITO');
  process.exit(0);
} else {
  console.error(`❌ HUBO ${failures} FALLOS EN LA ETAPA 1`);
  process.exit(1);
}
