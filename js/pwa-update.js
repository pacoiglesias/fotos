/* RealScan — Actualización fluida de la PWA (pieza D).
   ÚNICA vía de registro y actualización del service worker en la
   página principal: index.html ya no registra (solo conserva su red
   de seguridad de controllerchange para recuperar una app vieja o
   rota cacheada) y js/app.js ya no registra (setupPwaSupport solo
   gestiona el aviso de instalación). offline-setup.js y
   phone-local.js registran por su cuenta en SUS páginas, como antes.

   Flujo: al abrir la app, al volver a primer plano y cada ~30 min se
   pide registration.update() (registro con updateViaCache:'none').
   Cuando una versión nueva se instala habiendo ya un controlador,
   se muestra un aviso persistente «Nueva versión lista» con botón
   «Actualizar» de un toque: si hay worker en espera se le manda
   {type:'SKIP_WAITING'} y al llegar controllerchange se recarga UNA
   vez (guardia anti-bucle); como sw.js además hace skipWaiting al
   instalar, lo normal es que el toque simplemente recargue y la
   recarga ya sirva la versión nueva desde la caché nueva. */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  const CHECK_INTERVAL_MS = 30 * 60 * 1000;
  let registration = null;
  let waitingWorker = null;
  let updateReady = false;
  let reloadArmed = false;   // solo tras pulsar «Actualizar»
  let reloading = false;     // guardia anti-bucle: una recarga por página
  let reloadTimer = null;
  // ¿Esta página ya estaba controlada al arrancar? Si no, el primer
  // controllerchange es la instalación inicial, no una actualización.
  let hadController = !!navigator.serviceWorker.controller;

  function banner() {
    let el = document.getElementById('pwaUpdateBanner');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'pwaUpdateBanner';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.hidden = true;
    const text = document.createElement('span');
    text.textContent = '🆕 Nueva versión lista';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnPwaUpdateNow';
    btn.textContent = 'Actualizar';
    btn.addEventListener('click', applyUpdate);
    el.appendChild(text);
    el.appendChild(btn);
    (document.body || document.documentElement).appendChild(el);
    return el;
  }

  function showBanner() {
    const el = banner();
    el.hidden = false;
  }

  function markUpdateReady(worker) {
    if (worker) waitingWorker = worker;
    if (!hadController && !navigator.serviceWorker.controller) return;
    updateReady = true;
    if (document.body) showBanner();
    else document.addEventListener('DOMContentLoaded', showBanner, { once: true });
  }

  function reloadOnce() {
    if (reloading) return;
    reloading = true;
    location.reload();
  }

  function applyUpdate() {
    if (reloading) return;
    const waiting = waitingWorker || (registration && registration.waiting);
    if (waiting) {
      reloadArmed = true;
      try { waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
      // Si el controllerchange no llega (el worker ya activó), la
      // recarga por temporizador sirve igualmente la versión nueva.
      reloadTimer = setTimeout(reloadOnce, 1500);
    } else {
      // El SW nuevo ya activó (skipWaiting al instalar): recargar basta.
      reloadOnce();
    }
  }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloadArmed) { reloadOnce(); return; }
    if (!hadController) { hadController = true; return; }
    // Un SW nuevo tomó el control con esta página abierta. Si la app
    // está rota (sin updateUI), la red de seguridad de index.html ya
    // recarga por su cuenta; aquí no competimos con ella.
    if (typeof window.updateUI !== 'function') return;
    markUpdateReady(null);
  });

  async function checkNow() {
    try {
      const reg = registration || (await navigator.serviceWorker.getRegistration());
      if (!reg) return null;
      registration = reg;
      await reg.update();
      if (reg.waiting && navigator.serviceWorker.controller) markUpdateReady(reg.waiting);
      return reg;
    } catch (e) { return null; }
  }

  window.addEventListener('load', async function () {
    try {
      registration = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
    } catch (e) {
      window.RealScanDiagnostics?.record('pwa.worker_failed', 'warning', { errorType: e.name, code: e.code });
      return;
    }
    // SIMULACRO B (v3.15.0): register() puede resolver con valor falsy cuando
    // el service worker está bloqueado; sin esta guarda, la línea siguiente
    // lanzaba "Cannot read properties of undefined (reading 'waiting')"
    // como pageerror no capturado.
    if (!registration) {
      window.RealScanDiagnostics?.record('pwa.worker_blocked', 'warning', {});
      return;
    }
    if (registration.waiting && navigator.serviceWorker.controller) {
      markUpdateReady(registration.waiting);
    }
    registration.addEventListener('updatefound', function () {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', function () {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          markUpdateReady(registration.waiting || installing);
        }
      });
    });
    checkNow();
    setInterval(checkNow, CHECK_INTERVAL_MS);
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) checkNow();
  });

  window.RealScanPwaUpdate = {
    checkNow: checkNow,
    applyUpdate: applyUpdate,
    isUpdateReady: function () { return updateReady; }
  };
})();
