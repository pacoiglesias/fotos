/* RealScan — Temas de color por dispositivo (AÑADIDO 11, v3.13.0).
   El tema se aplica al instante, se recuerda en este equipo y solo cambia
   el color de acento: la identidad, los estados y el modo oscuro de la app
   no se tocan. */
(function () {
  'use strict';
  const KEY = 'realscan_theme_v1';
  const THEMES = {
    indigo: 'Índigo',
    esmeralda: 'Esmeralda',
    grafito: 'Grafito',
    burdeos: 'Burdeos',
    oceano: 'Océano'
  };
  // Acento de cada tema: también tiñe la barra de estado del móvil
  // (meta theme-color) para que la PWA instalada se vea de una pieza.
  const ACCENTS = {
    indigo: '#4f46e5',
    esmeralda: '#059669',
    grafito: '#475569',
    burdeos: '#be123c',
    oceano: '#0284c7'
  };
  function current() {
    try { return localStorage.getItem(KEY) || 'indigo'; } catch (e) { return 'indigo'; }
  }
  function apply(name) {
    const t = THEMES[name] ? name : 'indigo';
    if (t === 'indigo') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    // En modo oscuro manda el fondo oscuro en la barra de estado; en
    // claro, el acento del tema elegido.
    const meta = document.getElementById('metaThemeColor');
    if (meta && !document.documentElement.classList.contains('dark')) {
      meta.setAttribute('content', ACCENTS[t]);
    }
    document.querySelectorAll('[data-theme-pick]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-theme-pick') === t ? 'true' : 'false');
    });
  }
  function set(name) {
    try { localStorage.setItem(KEY, name); } catch (e) {}
    apply(name);
    if (typeof showToast === 'function') showToast('🎨 Tema «' + THEMES[name] + '» aplicado en este equipo.', 'success');
  }
  // Aplicación inmediata al cargar el script (antes del primer pintado útil:
  // la pantalla de acceso cubre el arranque).
  apply(current());
  document.addEventListener('DOMContentLoaded', function () {
    apply(current());
    document.querySelectorAll('[data-theme-pick]').forEach(function (btn) {
      btn.addEventListener('click', function () { set(btn.getAttribute('data-theme-pick')); });
    });
  });
  window.RealScanTheme = { apply: apply, set: set, current: current, THEMES: THEMES };
})();
