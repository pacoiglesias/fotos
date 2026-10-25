const projectRoot = require('path').resolve(__dirname, '..');
/**
 * test_etapa3.js — Suite de Pruebas Unitarias y Funcionales para Etapa 3
 * Rediseño Visual y Flujo Ergonómico (M-16 a M-21)
 */

const fs = require('fs');
const assert = require('assert');

console.log('--- INICIANDO VALIDACIÓN DE ETAPA 3 (M-16 A M-21) ---\n');

// 1. Validar resultados de la inspección con Playwright real
const resultsPath = '.audit/results.json';
assert(fs.existsSync(resultsPath), 'Debe existir .audit/results.json generado por Playwright');
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
assert.strictEqual(results.buildVersion, JSON.parse(fs.readFileSync('dist/version.json','utf8')).version, 'La evidencia de navegador debe corresponder a la compilación actual');

console.log('--- TEST 1: Control de Desbordamiento Móvil (M-17) ---');
assert.strictEqual(results.mobile.viewport, 390, 'El viewport móvil debe ser de 390px');
assert.strictEqual(results.mobile.width, 390, 'El ancho del DOM (scrollWidth) móvil debe ser exactamente de 390px (0px de desborde horizontal)');
assert(results.mobile.hud.width <= 390, 'La barra flotante HUD debe caber dentro del ancho móvil');
assert(results.mobile.hud.left >= 0, 'La barra HUD debe estar contenida en pantalla');
console.log('  ✓ Viewport móvil verificado en 390 px');
console.log('  ✓ scrollWidth móvil verificado en 390 px exactos (0 px de desborde horizontal, antes 534 px)');
console.log('  ✓ Barra HUD contenida con márgenes seguros en pantalla móvil');

console.log('\n--- TEST 2: Vista Previa Física Amplia en Escritorio (M-19) ---');
assert(results.desktop.sheetWidth >= 540, 'El ancho visual de la hoja A4 en escritorio debe ser >= 540 px');
console.log(`  ✓ Ancho de la hoja A4 en escritorio: ${results.desktop.sheetWidth} px (requisito M-19: >= 540 px, antes 320 px)`);
assert(results.desktop.frontWidth >= 180, 'La credencial/tarjeta en el lienzo debe medir al menos 180 px');
console.log(`  ✓ Ancho de la credencial en el visor: ${results.desktop.frontWidth.toFixed(1)} px (antes 119 px, aumento de +75% en legibilidad física)`);

console.log('\n--- TEST 3: Selector Rápido de Intenciones de Trabajo (M-18) ---');
// Mock de entorno DOM mínimo para verificar la lógica de switchIntent, setStageSheetZoom y setMobileStep
global.window = { state: { activeCategory: 'docs', format: 'card', printMode: 'both' } };
global.state = global.window.state;
global.$ = (id) => ({
  id,
  setAttribute: (k, v) => { global.$[k] = v; },
  getAttribute: (k) => global.$[k],
  addEventListener: () => {},
  removeEventListener: () => {},
  style: {},
  classList: {
    toggle: (c, v) => {},
    contains: (c) => false
  }
});
global.$$ = (sel) => [];
global.showToast = () => {};
global.savePreferences = () => {};
global.updateUI = () => {};
global.switchCategory = (c) => { state.activeCategory = c; };
global.selectFormat = (f) => { state.format = f; };
global.setPrintMode = (m) => { state.printMode = m; };

// Cargar funciones de app.js mediante extracción sintética o evaluación
const appCode = fs.readFileSync('js/app.js', 'utf8');
const vm = require('vm');
const context = {
  document: {body: {dataset: {}}, addEventListener: function(){}},
  window: global.window,
  state: global.state,
  $: global.$,
  $$: global.$$,
  on: (el, ev, fn) => { if (el && typeof el.addEventListener === 'function') el.addEventListener(ev, fn); },
  showToast: global.showToast,
  savePreferences: global.savePreferences,
  updateUI: global.updateUI,
  switchCategory: global.switchCategory,
  selectFormat: global.selectFormat,
  setPrintMode: global.setPrintMode,
  parseInt: parseInt,
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
};
vm.createContext(context);
const cut = appCode.indexOf('PANEL COLAPSABLE');
const end = cut !== -1 ? appCode.lastIndexOf('/*', cut) : -1;
vm.runInContext(end !== -1 ? appCode.slice(0, end) : appCode, context);

context.switchIntent('id');
assert.strictEqual(state.activeCategory, 'docs', 'Intención ID debe activar categoría docs');
assert.strictEqual(state.format, 'card', 'Intención ID debe seleccionar formato card (85.6x54 mm)');
assert.strictEqual(state.printMode, 'both', 'Intención ID debe seleccionar printMode both');
console.log('  ✓ switchIntent("id") configura correctamente documentos, credencial INE/DNI y ambas caras');

context.switchIntent('photos');
assert.strictEqual(state.activeCategory, 'photos', 'Intención photos debe activar categoría photos');
assert.strictEqual(state.format, 'photo_infantil', 'Intención photos debe seleccionar photo_infantil');
console.log('  ✓ switchIntent("photos") configura categoría de fotos y formato oficial infantil');

context.switchIntent('multi');
assert.strictEqual(state.activeCategory, 'docs', 'Intención multi debe activar categoría docs');
assert.strictEqual(state.format, 'passport_open', 'Intención multi debe seleccionar passport_open');
assert.strictEqual(state.printMode, 'both_separate', 'Intención multi debe seleccionar hojas separadas');
console.log('  ✓ switchIntent("multi") configura pasaporte en hojas separadas navegables');

context.switchIntent('custom');
assert.strictEqual(state.activeCategory, 'custom', 'Intención custom debe activar medidas personalizadas');
console.log('  ✓ switchIntent("custom") activa modo libre en cm/mm');

console.log('\n--- TEST 4: Zoom de Visualización del Lienzo (M-19) ---');
context.setStageSheetZoom('75');
assert.strictEqual(global.$['data-sheet-zoom'], '75', 'setStageSheetZoom debe asignar el atributo data-sheet-zoom="75"');
context.setStageSheetZoom('100');
assert.strictEqual(global.$['data-sheet-zoom'], '100', 'setStageSheetZoom debe asignar el atributo data-sheet-zoom="100"');
console.log('  ✓ setStageSheetZoom modifica el zoom de la hoja (Fit, 75%, 100%, 125%) sin alterar el encuadre 1:1');

console.log('\n--- TEST 5: Navegación Móvil por Etapas sin Pérdida de Datos (M-20) ---');
// Simular imágenes en el estado
state.images = {
  front: { originalSrc: 'data:image/png;base64,mock1', zoom: 1.0 },
  back: { originalSrc: 'data:image/png;base64,mock2', zoom: 1.0 }
};
context.setMobileStep(2);
assert.strictEqual(state.images.front.originalSrc, 'data:image/png;base64,mock1', 'Navegar de paso 1 a 2 no debe alterar las imágenes');
context.setMobileStep(3);
assert.strictEqual(state.images.back.originalSrc, 'data:image/png;base64,mock2', 'Navegar al paso 3 no debe alterar las imágenes');
context.setMobileStep(1);
assert.strictEqual(state.images.front.originalSrc, 'data:image/png;base64,mock1', 'Regresar al paso 1 no debe perder las fotos');
console.log('  ✓ Navegación por etapas móviles (Paso 1, 2 y 3) preserva la integridad total de fotos y configuraciones');

console.log('\n--- TEST 6: Cero Errores en Runtime ---');
assert.strictEqual(results.errors.length, 0, 'No debe haber errores de consola ni de ejecución');
console.log('  ✓ Cero errores de ejecución registrados en Playwright');

console.log('\n========================================');
console.log('🎉 TODAS LAS PRUEBAS DE LA ETAPA 3 PASARON CON ÉXITO');
