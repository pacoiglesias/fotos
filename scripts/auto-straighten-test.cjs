/* Prueba del estimador de inclinación con patrones sintéticos.
   Uso: node scripts/auto-straighten-test.cjs — sin navegador ni red.
   El ángulo devuelto es la corrección que hay que aplicar (mismo signo que
   el giro de photo-finish): líneas que bajan 5° a la derecha piden -5°. */
'use strict';
const assert = require('node:assert');
const {estimateSkewFromGray} = require('../js/auto-straighten.js');

function lines(slopeDeg) {
  const w = 500, h = 300, gray = new Float32Array(w * h).fill(255);
  const slope = Math.tan(slopeDeg * Math.PI / 180);
  for (let base = 40; base < h - 20; base += 40) {
    for (let x = 20; x < w - 20; x++) {
      const y = Math.round(base + slope * (x - 250));
      if (y < 1 || y >= h - 1) continue;
      gray[y * w + x] = 0; gray[(y + 1) * w + x] = 0;
    }
  }
  return {gray, w, h};
}
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('ok - ' + name); }

check('líneas inclinadas +5°: corrección ≈ -5°', () => {
  const {gray, w, h} = lines(5);
  const result = estimateSkewFromGray(gray, w, h);
  assert.ok(result, 'esperaba un ángulo');
  assert.ok(Math.abs(result.angle + 5) <= 1.5, 'ángulo: ' + JSON.stringify(result));
});
check('líneas inclinadas -8°: corrección ≈ +8°', () => {
  const {gray, w, h} = lines(-8);
  const result = estimateSkewFromGray(gray, w, h);
  assert.ok(result, 'esperaba un ángulo');
  assert.ok(Math.abs(result.angle - 8) <= 1.5, 'ángulo: ' + JSON.stringify(result));
});
check('líneas horizontales: sin corrección', () => {
  const {gray, w, h} = lines(0);
  assert.strictEqual(estimateSkewFromGray(gray, w, h), null);
});
check('imagen vacía: sin corrección', () => {
  const gray = new Float32Array(500 * 300).fill(255);
  assert.strictEqual(estimateSkewFromGray(gray, 500, 300), null);
});
console.log(passed + ' pruebas de enderezado superadas.');
