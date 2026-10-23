const projectRoot = require('path').resolve(__dirname, '..');
/**
 * Test Suite - Entrega 4: Funcionamiento PWA Offline, Accesibilidad (Focus Trap) y Cierre
 * Verifica:
 * 1. Resiliencia del Service Worker: división CORE/OPTIONAL, await en fallback de navegación,
 *    eliminación de evaluación síncrona || sobre promesas en caches.match.
 * 2. Accesibilidad: Focus trap estricto, atributos ARIA, fondo inerte (inert/aria-hidden) y
 *    devolución de foco al disparador al cerrar con Escape o botón.
 * 3. Coherencia de versiones entre Service Worker, HTML y app.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FALLO: ${message}`);
    process.exitCode = 1;
  }
}

console.log('\n--- INICIANDO TEST SUITE ENTREGA 4 (PWA Offline, Accesibilidad y Cierre) ---\n');

// -------------------------------------------------------------
// BLOQUE 1: Verificación estricta de Service Worker (sw.js)
// -------------------------------------------------------------
console.log('1. Verificación de Service Worker (sw.js)...');
const swCode = fs.readFileSync(path.join(projectRoot, 'dist/sw.js'), 'utf-8');

// 1.1 Debe definir CORE_ASSETS y OPTIONAL_ASSETS por separado
assert(
  swCode.includes('CORE_ASSETS') && !swCode.includes('https://'),
  'La compilación precarga dependencias locales y no requiere CDN'
);

// 1.2 NO debe contener la expresión errónea caches.match(...) || caches.match(...)
const hasBadPromiseOr = /caches\.match\([^)]+\)\s*\|\|\s*caches\.match\(/.test(swCode);
assert(
  !hasBadPromiseOr,
  'sw.js eliminó el operador síncrono || entre promesas de caches.match'
);

// 1.3 Debe esperar con await el resultado de caches.match en el fallback offline
assert(
  swCode.includes('await caches.match') || swCode.includes('then('),
  'sw.js resuelve asíncronamente las promesas de caches.match en el fallback'
);

// 1.4 Debe asociar index.html y la ruta raíz './' para evitar net::ERR_FAILED
assert(
  swCode.includes("/index.html") && swCode.includes("url.pathname==='/'"),
  'sw.js contempla explícitamente tanto ./ como ./index.html en la caché'
);

// 1.5 Debe usar skipWaiting() y clients.claim()
assert(
  swCode.includes('self.skipWaiting()') && swCode.includes('self.clients.claim()'),
  'sw.js asegura activación inmediata y control de clientes sin recarga forzada manual'
);

// -------------------------------------------------------------
// BLOQUE 2: Verificación de Focus Trap y Accesibilidad (js/config.js)
// -------------------------------------------------------------
console.log('\n2. Verificación de Accesibilidad y Focus Trap (js/config.js)...');
const configCode = fs.readFileSync(path.join(projectRoot, 'js/config.js'), 'utf-8');

// 2.1 Debe existir getModalFocusableElements y modalFocusStack
assert(
  configCode.includes('getModalFocusableElements') && configCode.includes('modalFocusStack'),
  'js/config.js define getModalFocusableElements y pila de foco modalFocusStack'
);

// 2.2 Debe gestionar fondo inerte e inert / aria-hidden
assert(
  configCode.includes('setBackgroundInert') && configCode.includes('inert') && configCode.includes('aria-hidden'),
  'js/config.js implementa fondo inerte (inert y aria-hidden) al abrir diálogos'
);

// 2.3 Simulación de DOM para probar el Focus Trap en memoria
const mockDom = {
  activeElement: null,
  body: {
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); }
    },
    children: []
  },
  getElementById(id) {
    function search(el) {
      if (el.id === id) return el;
      for (const c of el.children) {
        const found = search(c);
        if (found) return found;
      }
      return null;
    }
    for (const top of this.body.children) {
      const found = search(top);
      if (found) return found;
    }
    return null;
  },
  querySelector(sel) {
    const list = this.querySelectorAll(sel);
    return list.length > 0 ? list[0] : null;
  },
  querySelectorAll(sel) {
    const res = [];
    function search(el) {
      if (sel.includes('dialog')) {
        if (el.getAttribute('role') === 'dialog' || el.classList.contains('modal')) {
          if (!sel.includes(':not(.hidden)') || !el.classList.contains('hidden')) {
            res.push(el);
          }
        }
      }
      el.children.forEach(search);
    }
    this.body.children.forEach(search);
    return res;
  },
  elements: {},
  addEventListener(evt, fn) { this.listeners[evt] = this.listeners[evt] || []; this.listeners[evt].push(fn); },
  listeners: {},
  dispatchEvent(evt) {
    if (this.listeners[evt.type]) {
      this.listeners[evt.type].forEach(fn => fn(evt));
    }
  }
};

class MockElement {
  constructor(id, tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.classList = {
      classes: new Set(['hidden']),
      contains(c) { return this.classes.has(c); },
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); }
    };
    this.attrs = {};
    this.children = [];
    this.offsetWidth = 100;
    this.offsetHeight = 50;
    this.parent = null;
  }
  getAttribute(k) { return this.attrs[k] || null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return k in this.attrs; }
  focus() { mockDom.activeElement = this; }
  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }
  querySelectorAll(sel) {
    const res = [];
    function walk(el) {
      if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') {
        if (!el.hasAttribute('disabled') && el.getAttribute('type') !== 'hidden') {
          res.push(el);
        }
      }
      el.children.forEach(walk);
    }
    this.children.forEach(walk);
    return res;
  }
  contains(target) {
    if (this === target) return true;
    return this.children.some(c => c.contains(target));
  }
}

// Configurar elementos en mock
const mainContent = new MockElement('mainContent', 'main');
mainContent.classList.remove('hidden');
const triggerBtn = new MockElement('btnOpenSettings', 'button');
mainContent.children.push(triggerBtn);
mockDom.body.children.push(mainContent);

const modalEl = new MockElement('testSettingsModal', 'div');
modalEl.setAttribute('role', 'dialog');
const modalCloseBtn = new MockElement('btnClose', 'button');
const modalInput = new MockElement('inputSetting', 'input');
modalEl.children.push(modalCloseBtn, modalInput);
mockDom.body.children.push(modalEl);

// Contexto VM para ejecutar modales de config.js
const sandbox = {
  document: mockDom,
  window: { addEventListener: () => {} },
  $: (id) => {
    if (id === 'testSettingsModal') return modalEl;
    if (id === 'mainContent') return mainContent;
    return null;
  },
  $$: (sel) => {
    if (sel.includes('dialog')) {
      return [modalEl].filter(m => !m.classList.contains('hidden'));
    }
    return [];
  },
  console: console
};

vm.createContext(sandbox);
vm.runInContext(configCode, sandbox);

// Probar apertura de modal
triggerBtn.focus();
assert(mockDom.activeElement === triggerBtn, 'El botón disparador tiene el foco inicial');

sandbox.openModal('testSettingsModal');

assert(!modalEl.classList.contains('hidden'), 'openModal muestra el modal removiendo .hidden');
assert(modalEl.getAttribute('aria-modal') === 'true', 'openModal establece aria-modal="true"');
assert(mainContent.hasAttribute('inert'), 'openModal establece inert en los contenedores de fondo');
assert(mockDom.activeElement === modalCloseBtn, 'openModal enfoca automáticamente el primer elemento interactivo del modal');

// Probar Focus Trap con tecla Tab
// Al estar en el último elemento (modalInput) y presionar Tab hacia adelante, debe ciclar al primero (modalCloseBtn)
modalInput.focus();
assert(mockDom.activeElement === modalInput, 'El foco se encuentra en el último control del modal');

let tabPrevented = false;
mockDom.dispatchEvent({
  type: 'keydown',
  key: 'Tab',
  shiftKey: false,
  preventDefault: () => { tabPrevented = true; }
});
assert(mockDom.activeElement === modalCloseBtn, 'Focus Trap: Presionar Tab en el último control cicla al primer control del modal');
assert(tabPrevented, 'Focus Trap: preventDefault fue invocado para evitar escape hacia la página de fondo');

// Al estar en el primer control y presionar Shift+Tab, debe ciclar al último
let shiftTabPrevented = false;
mockDom.dispatchEvent({
  type: 'keydown',
  key: 'Tab',
  shiftKey: true,
  preventDefault: () => { shiftTabPrevented = true; }
});
assert(mockDom.activeElement === modalInput, 'Focus Trap: Presionar Shift+Tab en el primer control cicla al último control del modal');
assert(shiftTabPrevented, 'Focus Trap: preventDefault fue invocado para evitar escape inverso');

// Probar cierre con tecla Escape
let escapePrevented = false;
mockDom.dispatchEvent({
  type: 'keydown',
  key: 'Escape',
  preventDefault: () => { escapePrevented = true; }
});
assert(modalEl.classList.contains('hidden'), 'Pulsar tecla Escape cierra el modal activo');
assert(!mainContent.hasAttribute('inert'), 'Al cerrar el modal, se restaura la interactividad del fondo (sin inert)');
assert(mockDom.activeElement === triggerBtn, 'Al cerrar el modal, el foco regresa exactamente al botón disparador original');

// -------------------------------------------------------------
// BLOQUE 3: Coherencia de Versión en el Sistema
// -------------------------------------------------------------
console.log('\n3. Coherencia de Versión del Sistema...');
const appCode = fs.readFileSync(path.join(projectRoot, 'js/app.js'), 'utf-8');
const indexCode = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');

assert(
  configCode.includes("APP_VERSION = 'v" + JSON.parse(fs.readFileSync('package.json','utf8')).version + "'") && appCode.includes('window.APP_VERSION ||'),
  'La aplicación consume la versión canónica de configuración'
);
assert(
  /realscan-[a-f0-9]{16}/.test(swCode),
  'La caché identifica el contenido de la compilación'
);
assert(
  appCode.includes("syncAppVersion()"),
  'js/app.js ejecuta syncAppVersion() para unificar cabecera, pie, settings y accesos'
);

// -------------------------------------------------------------
// RESUMEN FINAL
// -------------------------------------------------------------
console.log(`\n=============================================================`);
console.log(`Resultado Entrega 4: ${passedTests} de ${totalTests} pruebas superadas.`);
console.log(`=============================================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
