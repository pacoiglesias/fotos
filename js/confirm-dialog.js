/* ============================================================
   RealScan Pro — Diálogo de confirmación propio (basado en promesas)
   Reemplaza a confirm() nativo: se ve igual que el resto de la app,
   funciona en PWA/móvil sin bloquear la interfaz y devuelve una
   promesa booleana. Uso:
     const ok = await showConfirmDialog('¿Borrar este registro?');
     const ok = await showConfirmDialog('Texto', { danger: true, confirmText: 'Borrar' });
   ============================================================ */
(function () {
  let overlayEl = null;
  let resolver = null;
  let lastFocused = null;

  function ensureDom() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.id = 'rsConfirmOverlay';
    overlayEl.className = 'fixed inset-0 z-[120] hidden items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    overlayEl.innerHTML =
      '<div role="alertdialog" aria-modal="true" aria-labelledby="rsConfirmTitle" aria-describedby="rsConfirmMsg" ' +
      'class="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xl p-5 space-y-4">' +
      '<h3 id="rsConfirmTitle" class="text-base font-black leading-tight">Confirmar acción</h3>' +
      '<p id="rsConfirmMsg" class="text-sm leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300"></p>' +
      '<div class="flex gap-2 justify-end">' +
      '<button type="button" id="rsConfirmCancel" class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>' +
      '<button type="button" id="rsConfirmOk" class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">Confirmar</button>' +
      '</div></div>';
    document.body.appendChild(overlayEl);
    overlayEl.querySelector('#rsConfirmCancel').addEventListener('click', function () { close(false); });
    overlayEl.querySelector('#rsConfirmOk').addEventListener('click', function () { close(true); });
    overlayEl.addEventListener('click', function (ev) { if (ev.target === overlayEl) close(false); });
    document.addEventListener('keydown', function (ev) {
      if (!overlayEl || overlayEl.classList.contains('hidden')) return;
      if (ev.key === 'Escape') close(false);
      if (ev.key === 'Enter') { ev.preventDefault(); close(true); }
    });
    return overlayEl;
  }

  function close(result) {
    if (!overlayEl) return;
    overlayEl.classList.add('hidden');
    overlayEl.classList.remove('flex');
    if (lastFocused && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus(); } catch (e) {}
    }
    if (resolver) { const r = resolver; resolver = null; r(!!result); }
  }

  function showConfirmDialog(message, options) {
    const opts = options || {};
    ensureDom();
    if (resolver) { const r = resolver; resolver = null; r(false); }
    overlayEl.querySelector('#rsConfirmTitle').textContent = opts.title || 'Confirmar acción';
    overlayEl.querySelector('#rsConfirmMsg').textContent = String(message || '');
    const okBtn = overlayEl.querySelector('#rsConfirmOk');
    okBtn.textContent = opts.confirmText || 'Confirmar';
    okBtn.className = 'px-4 py-2 rounded-xl text-white text-sm font-bold ' +
      (opts.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700');
    overlayEl.classList.remove('hidden');
    overlayEl.classList.add('flex');
    lastFocused = document.activeElement;
    try { okBtn.focus(); } catch (e) {}
    return new Promise(function (resolve) { resolver = resolve; });
  }

  window.showConfirmDialog = showConfirmDialog;
})();
