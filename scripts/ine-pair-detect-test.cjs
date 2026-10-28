/* Prueba de la detección INE anverso+reverso con imágenes sintéticas.
   Uso: node scripts/ine-pair-detect-test.cjs
   No toca el navegador ni la red: construye búferes RGBA y llama al
   detector puro de js/ine-pair-detect.js. */
'use strict';
const assert = require('node:assert');
const {detectPairRegions, detectSingleCard} = require('../js/ine-pair-detect.js');

function makeImage(w, h, bg){
 const data = Buffer.alloc(w * h * 4);
 for(let i = 0; i < w * h; i++){
  data[i * 4] = bg[0];data[i * 4 + 1] = bg[1];data[i * 4 + 2] = bg[2];data[i * 4 + 3] = 255;
 }
 return {data, w, h};
}
function rect(img, x, y, w, h, color){
 for(let j = y; j < y + h; j++) for(let i = x; i < x + w; i++){
  if(i < 0 || j < 0 || i >= img.w || j >= img.h) continue;
  const k = (j * img.w + i) * 4;
  img.data[k] = color[0];img.data[k + 1] = color[1];img.data[k + 2] = color[2];
 }
}
function card(img, x, y, w, h, base, inner, line){
 rect(img, x, y, w, h, base);
 rect(img, x + 16, y + 16, 70, 90, inner); // foto
 for(let t = 0; t < 3; t++) rect(img, x + 110, y + 30 + t * 34, w - 140, 7, line); // texto
}
function near(box, x, y, w, h, tol){
 return Math.abs(box.x - x) <= tol && Math.abs(box.y - y) <= tol &&
  Math.abs(box.w - w) <= tol && Math.abs(box.h - h) <= tol;
}

let passed = 0;
function check(name, fn){
 fn();
 passed++;
 console.log('ok - ' + name);
}

// 1. Dos tarjetas sobre fondo claro -> par, en orden de lectura.
check('dos tarjetas, fondo claro', () => {
 const img = makeImage(900, 600, [240, 235, 228]);
 card(img, 60, 80, 320, 200, [40, 90, 160], [200, 210, 230], [30, 30, 30]);
 card(img, 500, 300, 320, 200, [180, 40, 50], [210, 200, 190], [25, 25, 25]);
 const boxes = detectPairRegions(img.data, img.w, img.h);
 assert.ok(boxes && boxes.length === 2, 'esperaba 2 cajas, obtuvo ' + JSON.stringify(boxes));
 assert.ok(near(boxes[0], 60, 80, 320, 200, 12), 'primera caja: ' + JSON.stringify(boxes[0]));
 assert.ok(near(boxes[1], 500, 300, 320, 200, 12), 'segunda caja: ' + JSON.stringify(boxes[1]));
});

// 2. Una sola tarjeta -> sin par (el flujo sigue igual).
check('una tarjeta, sin par', () => {
 const img = makeImage(900, 600, [240, 235, 228]);
 card(img, 200, 180, 320, 200, [40, 90, 160], [200, 210, 230], [30, 30, 30]);
 assert.strictEqual(detectPairRegions(img.data, img.w, img.h), null);
});

// 3. Dos tarjetas sobre fondo oscuro -> par.
check('dos tarjetas, fondo oscuro', () => {
 const img = makeImage(900, 600, [30, 35, 40]);
 card(img, 60, 80, 320, 200, [210, 215, 225], [180, 60, 60], [20, 20, 20]);
 card(img, 500, 300, 320, 200, [220, 220, 210], [60, 120, 180], [20, 20, 20]);
 const boxes = detectPairRegions(img.data, img.w, img.h);
 assert.ok(boxes && boxes.length === 2, 'esperaba 2 cajas, obtuvo ' + JSON.stringify(boxes));
});

// 4. Dos tarjetas más un objeto pequeño (bolígrafo) -> par, el ruido se ignora.
check('dos tarjetas más ruido pequeño', () => {
 const img = makeImage(900, 600, [240, 235, 228]);
 card(img, 60, 80, 320, 200, [40, 90, 160], [200, 210, 230], [30, 30, 30]);
 card(img, 500, 300, 320, 200, [180, 40, 50], [210, 200, 190], [25, 25, 25]);
 rect(img, 100, 520, 100, 18, [30, 30, 30]);
 const boxes = detectPairRegions(img.data, img.w, img.h);
 assert.ok(boxes && boxes.length === 2, 'esperaba 2 cajas, obtuvo ' + JSON.stringify(boxes));
});

// 5. Dos tarjetas que se tocan (una sola mancha) -> sin par, sin romper nada.
check('tarjetas que se tocan, sin par', () => {
 const img = makeImage(900, 600, [240, 235, 228]);
 card(img, 100, 100, 320, 200, [40, 90, 160], [200, 210, 230], [30, 30, 30]);
 card(img, 280, 180, 320, 200, [180, 40, 50], [210, 200, 190], [25, 25, 25]);
 assert.strictEqual(detectPairRegions(img.data, img.w, img.h), null);
});

// 6. Dos tarjetas apiladas (una arriba, otra abajo) -> par, arriba primero.
check('dos tarjetas apiladas', () => {
 const img = makeImage(900, 600, [240, 235, 228]);
 card(img, 200, 40, 320, 200, [40, 90, 160], [200, 210, 230], [30, 30, 30]);
 card(img, 200, 340, 320, 200, [180, 40, 50], [210, 200, 190], [25, 25, 25]);
 const boxes = detectPairRegions(img.data, img.w, img.h);
 assert.ok(boxes && boxes.length === 2, 'esperaba 2 cajas, obtuvo ' + JSON.stringify(boxes));
 assert.ok(near(boxes[0], 200, 40, 320, 200, 12), 'primera caja: ' + JSON.stringify(boxes[0]));
 assert.ok(near(boxes[1], 200, 340, 320, 200, 12), 'segunda caja: ' + JSON.stringify(boxes[1]));
});

// 7. Dos tarjetas lado a lado -> par, izquierda primero.
check('dos tarjetas lado a lado', () => {
 const img = makeImage(900, 600, [240, 235, 228]);
 card(img, 60, 200, 320, 200, [40, 90, 160], [200, 210, 230], [30, 30, 30]);
 card(img, 520, 220, 320, 200, [180, 40, 50], [210, 200, 190], [25, 25, 25]);
 const boxes = detectPairRegions(img.data, img.w, img.h);
 assert.ok(boxes && boxes.length === 2, 'esperaba 2 cajas, obtuvo ' + JSON.stringify(boxes));
 assert.ok(near(boxes[0], 60, 200, 320, 200, 12), 'primera caja: ' + JSON.stringify(boxes[0]));
 assert.ok(near(boxes[1], 520, 220, 320, 200, 12), 'segunda caja: ' + JSON.stringify(boxes[1]));
});

// 8. Dos tarjetas BLANCAS con borde visible sobre fondo claro -> par por bordes.
// El cuerpo blanco se confunde con el fondo; el paso de color falla y el de
// bordes debe rescatar el par. El borde gris simula la sombra del canto.
function whiteCard(img, x, y, w, h) {
 rect(img, x, y, w, h, [250, 250, 250]);
 for (let i = 0; i < w; i++) { rect(img, x + i, y, 1, 2, [190, 190, 190]); rect(img, x + i, y + h - 2, 1, 2, [190, 190, 190]); }
 for (let j = 0; j < h; j++) { rect(img, x, y + j, 2, 1, [190, 190, 190]); rect(img, x + w - 2, y + j, 2, 1, [190, 190, 190]); }
 rect(img, x + 16, y + 16, 70, 90, [120, 130, 150]);
 for (let t = 0; t < 3; t++) rect(img, x + 110, y + 30 + t * 34, w - 140, 7, [30, 30, 30]);
}
check('dos tarjetas blancas con borde, fondo claro (paso de bordes)', () => {
 const img = makeImage(900, 600, [240, 235, 228]);
 whiteCard(img, 60, 80, 320, 200);
 whiteCard(img, 500, 300, 320, 200);
 const boxes = detectPairRegions(img.data, img.w, img.h);
 assert.ok(boxes && boxes.length === 2, 'esperaba 2 cajas, obtuvo ' + JSON.stringify(boxes));
 assert.ok(near(boxes[0], 60, 80, 320, 200, 14), 'primera caja: ' + JSON.stringify(boxes[0]));
 assert.ok(near(boxes[1], 500, 300, 320, 200, 14), 'segunda caja: ' + JSON.stringify(boxes[1]));
});

// 9. Dos tarjetas blancas SIN borde visible -> sin par (límite honesto: lo
// invisible no se detecta; el botón manual de dividir cubre este caso).
check('dos tarjetas blancas sin borde, sin par', () => {
 const img = makeImage(900, 600, [240, 235, 228]);
 rect(img, 60, 80, 320, 200, [250, 250, 250]);
 rect(img, 500, 300, 320, 200, [250, 250, 250]);
 assert.strictEqual(detectPairRegions(img.data, img.w, img.h), null);
});

// 10. Una sola tarjeta -> detectSingleCard la localiza; sin tarjeta -> null.
check('una tarjeta: detectSingleCard', () => {
 const img = makeImage(900, 600, [240, 235, 228]);
 card(img, 200, 180, 320, 200, [40, 90, 160], [200, 210, 230], [30, 30, 30]);
 const box = detectSingleCard(img.data, img.w, img.h);
 assert.ok(box, 'esperaba una caja');
 assert.ok(near(box, 200, 180, 320, 200, 12), 'caja: ' + JSON.stringify(box));
 const empty = makeImage(900, 600, [240, 235, 228]);
 assert.strictEqual(detectSingleCard(empty.data, empty.w, empty.h), null);
});

console.log(passed + ' pruebas de detección INE superadas.');
