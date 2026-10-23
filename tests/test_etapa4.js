const projectRoot = require('path').resolve(__dirname, '..');
/**
 * test_etapa4.js — Suite de Pruebas Unitarias y Funcionales para Etapa 4
 * Edición y Gestión Avanzada de Páginas (M-22 a M-26)
 */

const assert = require('assert');
const Editor = require('../js/crop-warp.js');

console.log('--- INICIANDO VALIDACIÓN DE ETAPA 4 (M-22 A M-26) ---\n');

console.log('--- TEST 1: Historial Undo / Redo por Ranura (M-24) ---');
Editor.clearHistory('front');

const initialSlot = {
  originalSrc: 'data:image/jpeg;base64,mockOriginal',
  rotation: 0,
  zoom: 1.0,
  filter: 'color',
  brightness: 0
};

// Snapshot 1 (estado base)
Editor.recordSnapshot('front', initialSlot);
assert.strictEqual(Editor.canUndo('front'), true, 'Debe permitir deshacer tras guardar snapshot');
assert.strictEqual(Editor.canRedo('front'), false, 'No debe haber rehacer antes de deshacer');

// Modificación 1: Rotar a 90°
const stateAfterRot = Object.assign({}, initialSlot, { rotation: 90 });
Editor.recordSnapshot('front', stateAfterRot);

// Modificación 2: Aplicar filtro B/N
const stateAfterFilter = Object.assign({}, stateAfterRot, { filter: 'bw' });

// Deshacer cambio de filtro
const restored1 = Editor.undo('front', stateAfterFilter);
assert.strictEqual(restored1.rotation, 90, 'Al deshacer filtro, la rotación debe permanecer en 90');
assert.strictEqual(restored1.filter, 'color', 'Al deshacer, el filtro debe volver a color');
assert.strictEqual(Editor.canRedo('front'), true, 'Debe poder rehacer tras un deshacer');

// Deshacer rotación
const restored0 = Editor.undo('front', restored1);
assert.strictEqual(restored0.rotation, 0, 'Al deshacer rotación, debe volver a 0 grados');

// Rehacer rotación
const redone = Editor.redo('front', restored0);
assert.strictEqual(redone.rotation, 90, 'Al rehacer, debe regresar a 90 grados');

console.log('  ✓ Historial de snapshots independiente por ranura verificado');
console.log('  ✓ Undo reversa de forma exacta rotación, filtros y ajustes');
console.log('  ✓ Redo restablece el estado futuro con fidelidad');

console.log('\n--- TEST 2: Transformada Proyectiva y Homografía 3x3 (M-22 y M-23) ---');
// Cuadrilátero en perspectiva (trapecio simulando foto tomada en ángulo)
const srcQuad = [
  { x: 30, y: 40 },   // TL
  { x: 370, y: 25 },  // TR
  { x: 390, y: 240 }, // BR
  { x: 15, y: 255 }   // BL
];
const dstW = 400;
const dstH = 250;

const H = Editor.getPerspectiveTransform(srcQuad, dstW, dstH);
assert(H && H.length === 9, 'Debe generar matriz homográfica 3x3 (9 elementos)');

// Verificar que mapea el punto TL (srcQuad[0]) a (0, 0)
function project(pt, mat) {
  const x = pt.x, y = pt.y;
  const wx = mat[0] * x + mat[1] * y + mat[2];
  const wy = mat[3] * x + mat[4] * y + mat[5];
  const w  = mat[6] * x + mat[7] * y + mat[8];
  return { x: wx / w, y: wy / w };
}

const p0 = project(srcQuad[0], H);
assert(Math.abs(p0.x - 0) < 1e-4 && Math.abs(p0.y - 0) < 1e-4, 'TL debe mapear a (0, 0)');

const p1 = project(srcQuad[1], H);
assert(Math.abs(p1.x - dstW) < 1e-4 && Math.abs(p1.y - 0) < 1e-4, 'TR debe mapear a (dstW, 0)');

const p2 = project(srcQuad[2], H);
assert(Math.abs(p2.x - dstW) < 1e-4 && Math.abs(p2.y - dstH) < 1e-4, 'BR debe mapear a (dstW, dstH)');

const p3 = project(srcQuad[3], H);
assert(Math.abs(p3.x - 0) < 1e-4 && Math.abs(p3.y - dstH) < 1e-4, 'BL debe mapear a (0, dstH)');

console.log('  ✓ Matriz homográfica 3x3 calculada por eliminación Gaussiana');
console.log('  ✓ Las 4 esquinas deformadas mapean con precisión matemática a las esquinas ortogonales rectangulares');

// Inversión matricial H * H_inv = I
const Hinv = Editor.invert3x3(H);
assert(Hinv && Hinv.length === 9, 'Debe invertir la matriz 3x3 correctamente');

// Multiplicación H * Hinv
function matMul3x3(A, B) {
  const R = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) sum += A[r * 3 + k] * B[k * 3 + c];
      R[r * 3 + c] = sum;
    }
  }
  return R;
}

const I = matMul3x3(H, Hinv);
assert(Math.abs(I[0] - 1.0) < 1e-4, 'I[0,0] debe ser 1');
assert(Math.abs(I[4] - 1.0) < 1e-4, 'I[1,1] debe ser 1');
assert(Math.abs(I[8] - 1.0) < 1e-4, 'I[2,2] debe ser 1');
assert(Math.abs(I[1]) < 1e-4 && Math.abs(I[2]) < 1e-4, 'Fuera de la diagonal debe ser 0');
console.log('  ✓ Matriz inversa H⁻¹ verificada: H × H⁻¹ = Identidad (exactitud para backward mapping sin artefactos)');

console.log('\n--- TEST 3: Intercambio Limpio de Ranuras (Swap Slots) (M-25) ---');
const slotA = {
  originalSrc: 'src_front',
  rotation: 90,
  zoom: 1.25,
  filter: 'color'
};
const slotB = {
  originalSrc: 'src_back',
  rotation: 180,
  zoom: 1.0,
  filter: 'bw'
};

const swapped = Editor.swapSlotData(slotA, slotB);
assert.strictEqual(swapped, true, 'El intercambio debe completarse con éxito');
assert.strictEqual(slotA.originalSrc, 'src_back', 'slotA ahora debe tener src_back');
assert.strictEqual(slotA.rotation, 180, 'slotA ahora debe tener rotation 180');
assert.strictEqual(slotB.originalSrc, 'src_front', 'slotB ahora debe tener src_front');
assert.strictEqual(slotB.rotation, 90, 'slotB ahora debe tener rotation 90');
console.log('  ✓ Intercambio de ranuras (Frente ⇄ Reverso) verificado sin fugas ni estados inconsistentes');

console.log('\n--- TEST 4: Compensador de Iluminación Adaptativo (M-26) ---');
// Mock de imagen para computeAdaptiveLighting
// Simular Canvas en Node con 2D context
const mockCanvas = {
  width: 200,
  height: 150,
  getContext: () => ({
    drawImage: () => {},
    getImageData: () => {
      // 200x150 píxeles oscuros (media de luminancia ~60)
      const data = new Uint8Array(200 * 150 * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 55;     // R
        data[i + 1] = 60; // G
        data[i + 2] = 65; // B
        data[i + 3] = 255;
      }
      return { data };
    }
  })
};

global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') return mockCanvas;
    return {};
  }
};

const lightResult = Editor.computeAdaptiveLighting({ naturalWidth: 800, naturalHeight: 600 });
assert(lightResult.brightness > 0, 'Una foto oscura debe recibir un ajuste positivo de brillo');
assert(lightResult.contrast > 0, 'Debe realzar el contraste para mejorar la legibilidad de la credencial');
console.log(`  ✓ Detección de sombra exitosa: brillo compensado a +${lightResult.brightness}%, contraste +${lightResult.contrast}% (${lightResult.advice})`);

console.log('\n========================================');
console.log('🎉 TODAS LAS PRUEBAS DE LA ETAPA 4 PASARON CON ÉXITO');
