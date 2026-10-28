/* Prueba de extracción de CURP y nombre desde texto OCR, sin navegador ni red.
   Uso: node scripts/ocr-extract-test.cjs */
'use strict';
const assert = require('node:assert');
const {extractCurp, extractName, extractIdentity} = require('../js/ocr-assist.js');

let passed = 0;
function check(name, fn) { fn(); passed++; console.log('ok - ' + name); }

check('CURP limpia en texto con saltos y espacios', () => {
  assert.strictEqual(extractCurp('INSTITUTO NACIONAL ELECTORAL\nCLAVE DE ELECTOR\nABCD1234567890'), null);
  assert.strictEqual(extractCurp('CURP: PEAA 690704 HDF RRL 09'), 'PEAA690704HDFRRL09');
});
check('CURP con confusión O/0 del OCR se tolera', () => {
  assert.strictEqual(extractCurp('CURP PEAA69O7O4HDFRRL09'), 'PEAA690704HDFRRL09');
});
check('sin CURP: null, sin inventar', () => {
  assert.strictEqual(extractCurp('CREDENCIAL PARA VOTAR\nNOMBRE\nJUAN PEREZ'), null);
});
check('nombre tras la etiqueta NOMBRE', () => {
  assert.strictEqual(extractName('CREDENCIAL\nNOMBRE\nJUAN PEREZ GARCIA\nDOMICILIO'), 'JUAN PEREZ GARCIA');
});
check('sin etiqueta NOMBRE: sin nombre', () => {
  assert.strictEqual(extractName('JUAN PEREZ GARCIA'), null);
});
check('identidad completa', () => {
  const id = extractIdentity('NOMBRE\nMARIA LOPEZ DIAZ\nCURP LODM850101MDFPZR04');
  assert.strictEqual(id.curp, 'LODM850101MDFPZR04');
  assert.strictEqual(id.name, 'MARIA LOPEZ DIAZ');
});
console.log(passed + ' pruebas de extracción OCR superadas.');
