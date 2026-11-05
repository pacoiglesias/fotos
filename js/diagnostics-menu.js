/* Diagnóstico desde el mostrador (3.34.0): atajo en el menú «Más» que abre
   Ajustes directamente en la pestaña Auditoría, donde vive el visor del
   registro técnico (Copiar, Actualizar, Descargar, Borrar). No toca
   counter-desk.js: añade la entrada en tiempo de ejecución, igual que
   mobile-entry.js añade la suya. Si el menú aún no existe cuando este
   módulo arranca, lo espera con un observador sin límite de tiempo y
   reintenta en cada apertura del menú «Más»; la entrada queda primera
   del menú y la pestaña activa se verifica tras cambiar a Auditoría. */
(function () {
  'use strict';
  function openDiagnostics() {
    try { window.closeModal?.('counterMoreModal'); } catch (_) { /* Seguir sin cerrar el menú. */ }
    try { window.openModal?.('settingsModal'); } catch (_) { /* El aviso de abajo lo cubre. */ }
    try {
      if (typeof window.switchSettingsTab === 'function') {
        window.switchSettingsTab('log');
        const logTab = document.getElementById('tabContentLog'), logBtn = document.getElementById('tabBtnLog');
        if ((logTab && logTab.classList.contains('hidden')) || (logBtn && !logBtn.classList.contains('is-active'))) window.switchSettingsTab('log');
      }
    } catch (_) { /* Queda la pestaña que estuviera abierta. */ }
    const modal = document.getElementById('settingsModal');
    if (modal && modal.classList.contains('hidden')) {
      window.showToast?.('No se pudo abrir Ajustes. Abre Ajustes y entra en Auditoría para ver el diagnóstico.', 'warning');
      return;
    }
    const logTab = document.getElementById('tabContentLog');
    if (logTab && logTab.classList.contains('hidden')) {
      window.showToast?.('No se pudo abrir la pestaña Auditoría. Abre Ajustes y entra en Auditoría para ver el diagnóstico.', 'warning');
      return;
    }
    const title = document.getElementById('diagnosticsTitle');
    if (title) setTimeout(function () { title.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 50);
  }
  function addEntry() {
    const menu = document.getElementById('counterTools');
    if (!menu || document.getElementById('counterDiagnosticsEntry')) return true;
    const entry = document.createElement('button');
    entry.type = 'button';
    entry.id = 'counterDiagnosticsEntry';
    entry.className = 'counter-secondary';
    entry.textContent = 'Diagnóstico';
    entry.setAttribute('aria-label', 'Abrir diagnóstico técnico');
    entry.addEventListener('click', openDiagnostics);
    menu.prepend(entry);
    return true;
  }
  document.addEventListener('DOMContentLoaded', function () {
    if (addEntry()) return;
    const observer = new MutationObserver(function () {
      if (addEntry()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.getElementById('counterMore')?.addEventListener('click', function () { addEntry(); });
  });
})();
