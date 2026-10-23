/* RealScan — Modo mostrador (Revisión 6, pieza C).
   Ajuste por dispositivo, visible y reversible, para usar la app en la
   tienda con luz fuerte: letra más grande, contraste alto de verdad y
   objetivos táctiles principales de al menos 48 px. Sigue el patrón de
   js/theme.js: se aplica al instante poniendo data-counter="on" en
   <html>, se recuerda en este equipo (localStorage) y NO cambia los
   acentos del tema ni el modo oscuro; las reglas viven en css/polish.css
   bajo html[data-counter="on"]. */
(function () {
  'use strict';
  const KEY = 'realscan_mostrador';
  function isOn() {
    try { return localStorage.getItem(KEY) === 'on'; } catch (e) { return false; }
  }
  function apply(on) {
    if (on) document.documentElement.setAttribute('data-counter', 'on');
    else document.documentElement.removeAttribute('data-counter');
    document.querySelectorAll('[data-counter-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function set(on) {
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
    apply(on);
    if (typeof showToast === 'function') {
      showToast(on
        ? '🏪 Modo mostrador activado en este equipo: letra grande y contraste alto.'
        : 'Modo mostrador desactivado en este equipo.', 'success');
    }
  }
  function toggle() { set(!isOn()); }
  // Aplicación inmediata al cargar el script (antes del primer pintado
  // útil: la pantalla de acceso cubre el arranque), igual que theme.js.
  apply(isOn());
  document.addEventListener('DOMContentLoaded', function () {
    apply(isOn());
    document.querySelectorAll('[data-counter-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggle);
    });
  });
  window.RealScanCounterMode = { apply: apply, set: set, toggle: toggle, isOn: isOn };
})();
