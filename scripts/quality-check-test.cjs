/* Prueba de la métrica de foto mala (borrosa / lavada) con patrones sintéticos.
   Uso: node scripts/quality-check-test.cjs — sin navegador ni red. */
'use strict';
const assert = require('node:assert');
const {analyzePixels, verdict} = require('../js/quality-check.js');

function makeImage(w, h, fill) {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = fill; data[i * 4 + 1] = fill; data[i * 4 + 2] = fill; data[i * 4 + 3] = 255; }
  return {data, w, h};
}
function bars(img) {
  // Texto simulado: barras negras nítidas sobre blanco.
  for (let y = 20; y < img.h - 20; y += 24) for (let x = 20; x < img.w - 20; x += 8) {
    for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) {
      const k = ((y + j) * img.w + (x + i)) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 0;
    }
  }
  return img;
}
function blur(img) {
  // Desenfoque de caja 3x3 aplicado cuatro veces: una foto realmente mala.
  // Dos pasadas dejan transiciones aún legibles y NO deben avisar.
  const gray = new Float32Array(img.w * img.h);
  for (let i = 0; i < img.w * img.h; i++) gray[i] = img.data[i * 4];
  for (let pass = 0; pass < 4; pass++) {
    const next = new Float32Array(gray);
    for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += gray[(y + dy) * img.w + (x + dx)];
      next[y * img.w + x] = sum / 9;
    }
    gray.set(next);
  }
  for (let i = 0; i < img.w * img.h; i++) { const v = Math.round(gray[i]); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; }
  return img;
}
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('ok - ' + name); }

check('patrón nítido: no se marca borroso', () => {
  const img = bars(makeImage(400, 300, 255));
  const v = verdict(analyzePixels(img.data, img.w, img.h));
  assert.strictEqual(v.blurry, false, JSON.stringify(v));
});
check('patrón desenfocado: se marca borroso, no lavado', () => {
  const img = blur(bars(makeImage(400, 300, 255)));
  const v = verdict(analyzePixels(img.data, img.w, img.h));
  assert.strictEqual(v.blurry, true, JSON.stringify(v));
  assert.strictEqual(v.washed, false, JSON.stringify(v));
});
check('imagen casi toda blanca: se marca lavada', () => {
  const img = makeImage(400, 300, 255);
  const v = verdict(analyzePixels(img.data, img.w, img.h));
  assert.strictEqual(v.washed, true, JSON.stringify(v));
});
check('imagen con contenido: no se marca lavada', () => {
  const img = bars(makeImage(400, 300, 255));
  const v = verdict(analyzePixels(img.data, img.w, img.h));
  assert.strictEqual(v.washed, false, JSON.stringify(v));
});
console.log(passed + ' pruebas de calidad superadas.');
