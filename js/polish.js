/* RealScan — Pulido «hermoso, amigable, proactivo» (AÑADIDO 12, v3.13.0).
   12.1 Marca de éxito animada al completar acciones clave.
   12.4 Guía de bienvenida de 3 pantallas (solo la primera vez; se puede
        volver a ver desde Ajustes).
   12.6 Panel «Hoy»: resumen accionable y cerrable (sin archivar, respaldo,
        calibración y nube), sin ventanas emergentes.
   12.8 Costumbres: cuenta el uso de tipos de documento (con franja
        horaria) y preselecciona el más usado cuando aún no hay un último
        tipo recordado. No rellena datos de clientes: eso lo sugiere el OCR
        (doc-identify) y siempre lo confirma el operador. */
(function () {
  'use strict';

  const WELCOME_KEY = 'realscan_welcome_seen_v1';
  const TODAY_DISMISS_KEY = 'realscan_today_dismissed_v1';
  const USAGE_KEY = 'realscan_format_usage_v1';
  const LAST_BACKUP_KEY = 'realscan_last_backup_at_v1';

  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function reducedMotion() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  /* ---------- 12.1 Marca de éxito ---------- */
  function successCheck(message) {
    try {
      const old = document.getElementById('rsSuccessCheck');
      if (old) old.remove();
      const wrap = document.createElement('div');
      wrap.id = 'rsSuccessCheck';
      wrap.setAttribute('aria-hidden', 'true');
      wrap.innerHTML = '<div class="rs-check-card rs-check-pop">' +
        '<svg width="64" height="64" viewBox="0 0 56 56" fill="none" aria-hidden="true">' +
        '<circle class="rs-check-circle" cx="28" cy="28" r="26" stroke="#059669" stroke-width="3.5"/>' +
        '<path class="rs-check-mark" d="M17 29.5 L24.5 37 L39 21" stroke="#059669" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<p class="rs-check-msg"></p></div>';
      wrap.querySelector('.rs-check-msg').textContent = message || 'Hecho';
      document.body.append(wrap);
      setTimeout(function () { wrap.remove(); }, reducedMotion() ? 900 : 1500);
    } catch (e) {}
  }

  /* ---------- Entrada a la app (tras el acceso) ---------- */
  function whenAppEntered(cb) {
    let tries = 0;
    const timer = setInterval(function () {
      tries++;
      const gate = document.getElementById('loginOverlay');
      const setup = document.getElementById('setupOverlay');
      const entered = (!gate || gate.classList.contains('hidden')) && (!setup || setup.classList.contains('hidden') || setup.offsetParent === null);
      if (entered || tries > 80) { clearInterval(timer); if (entered) cb(); }
    }, 700);
  }

  /* ---------- 12.4 Guía de bienvenida ---------- */
  const WELCOME_STEPS = [
    { icon: '📄', title: '1 · Elige el tipo', text: 'Toca el tipo de documento o foto (INE, pasaporte, foto infantil…). Los frecuentes están arriba y el buscador encuentra cualquiera en dos toques.' },
    { icon: '📷', title: '2 · Haz las fotos', text: 'Usa la cámara con detección automática o sube archivos. La miniatura y el semáforo de calidad te dicen al instante si la foto sirve y si hay reflejos.' },
    { icon: '🖨️', title: '3 · Imprime o entrega', text: 'Revisa el resumen, imprime a escala real 1:1 o entrega por WhatsApp/QR. Tus trabajos quedan en el historial, con respaldo cifrado y copia en la nube si la activas.' }
  ];
  let welcomeIdx = 0;
  function showWelcome() {
    let overlay = document.getElementById('rsWelcome');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'rsWelcome';
      overlay.className = 'fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'rsWelcomeTitle');
      overlay.innerHTML = '<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">' +
        '<p id="rsWelcomeIcon" class="text-5xl text-center" aria-hidden="true">📄</p>' +
        '<h2 id="rsWelcomeTitle" class="text-lg font-black text-center">1 · Elige el tipo</h2>' +
        '<p id="rsWelcomeText" class="text-sm text-center text-slate-600 dark:text-slate-300"></p>' +
        '<p id="rsWelcomeDots" class="text-center text-xs tracking-[0.4em]" aria-hidden="true">●○○</p>' +
        '<div class="flex gap-2.5">' +
        '<button type="button" id="rsWelcomeSkip" class="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold min-h-[48px]">Saltar</button>' +
        '<button type="button" id="rsWelcomeNext" class="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold min-h-[48px]">Siguiente</button>' +
        '</div></div>';
      document.body.append(overlay);
      overlay.querySelector('#rsWelcomeSkip').addEventListener('click', closeWelcome);
      overlay.querySelector('#rsWelcomeNext').addEventListener('click', function () {
        if (welcomeIdx < WELCOME_STEPS.length - 1) { welcomeIdx++; renderWelcomeStep(); }
        else closeWelcome();
      });
    }
    welcomeIdx = 0;
    renderWelcomeStep();
    overlay.classList.remove('hidden');
  }
  function renderWelcomeStep() {
    const step = WELCOME_STEPS[welcomeIdx];
    const overlay = document.getElementById('rsWelcome');
    if (!overlay) return;
    overlay.querySelector('#rsWelcomeIcon').textContent = step.icon;
    overlay.querySelector('#rsWelcomeTitle').textContent = step.title;
    overlay.querySelector('#rsWelcomeText').textContent = step.text;
    overlay.querySelector('#rsWelcomeDots').textContent = WELCOME_STEPS.map(function (_, i) { return i === welcomeIdx ? '●' : '○'; }).join('');
    overlay.querySelector('#rsWelcomeNext').textContent = welcomeIdx === WELCOME_STEPS.length - 1 ? '¡Empezar!' : 'Siguiente';
  }
  function closeWelcome() {
    try { localStorage.setItem(WELCOME_KEY, '1'); } catch (e) {}
    const overlay = document.getElementById('rsWelcome');
    if (overlay) overlay.classList.add('hidden');
  }
  function welcomeSeen() {
    try { return !!localStorage.getItem(WELCOME_KEY); } catch (e) { return true; }
  }

  /* ---------- Copia en la nube: pasos de activación (v3.14.0) ----------
     La activación se hace una sola vez en la consola de Firebase; la app
     la resume en una lista breve en vez de llevar a un callejón sin salida. */
  function showCloudSteps() {
    let overlay = document.getElementById('cloudStepsModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cloudStepsModal';
      overlay.className = 'hidden counter-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-labelledby', 'cloudStepsTitle');
      overlay.innerHTML = '<div class="counter-dialog">' +
        '<div class="counter-dialog-heading"><div><p class="counter-kicker">COPIA EN LA NUBE</p><h2 id="cloudStepsTitle">Activar la copia en la nube</h2></div>' +
        '<button type="button" data-close-modal="cloudStepsModal" aria-label="Cerrar">×</button></div>' +
        '<p class="counter-help">La activación se hace una sola vez desde la consola de Firebase del proyecto. Después, vincular este equipo lleva un solo toque.</p>' +
        '<ol class="cloud-steps-list">' +
        '<li>En la consola de Firebase del proyecto «fotos-cobertores-pro», crea el depósito de <strong>Storage</strong> si aún no existe.</li>' +
        '<li>Publica las reglas de <strong>Realtime Database</strong> y de <strong>Storage</strong> incluidas en el proyecto.</li>' +
        '<li>En <strong>Authentication</strong>, activa el acceso con correo y contraseña.</li>' +
        '<li>Vuelve a esta app, abre <strong>Ajustes → Copia en la nube</strong> y pulsa «Vincular / Sincronizar ahora».</li>' +
        '</ol>' +
        '<div class="counter-dialog-actions"><button type="button" data-close-modal="cloudStepsModal" class="counter-secondary">Cerrar</button>' +
        '<button type="button" id="cloudStepsOpenSettings" class="counter-primary">Abrir ajustes</button></div></div>';
      document.body.append(overlay);
      overlay.querySelector('#cloudStepsOpenSettings').addEventListener('click', function () {
        if (typeof closeModal === 'function') closeModal('cloudStepsModal');
        const b = document.querySelector('button[title*="Ajustes"]');
        if (b) b.click();
        else if (typeof openModal === 'function') openModal('settingsModal');
      });
    }
    if (typeof openModal === 'function') openModal('cloudStepsModal');
    else overlay.classList.remove('hidden');
  }

  /* ---------- 12.6 Panel «Hoy» ---------- */
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }); }
  }
  async function buildTodayPanel() {
    if (document.getElementById('rsTodayPanel')) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem(TODAY_DISMISS_KEY) === todayStr(); } catch (e) {}
    if (dismissed) return;
    const rows = [];
    if (!welcomeSeen()) rows.push({ icon: '🎓', text: '¿Primera vez con RealScan? La guía rápida de 3 pantallas te enseña el flujo en un minuto.', btn: 'Ver la guía', act: function () { showWelcome(); } });
    try {
      const scans = (typeof getAllScansFromStorage === 'function') ? await getAllScansFromStorage() : [];
      const pending = scans.filter(function (s) { return !s.archivedAt; }).length;
      if (pending > 0) rows.push({ icon: '📥', text: 'Tienes ' + pending + ' trabajo(s) sin archivar a Paperless/NAS.', btn: 'Archivar ahora', act: function () { if (window.RealScanArchive) window.RealScanArchive.archivePending(); } });
      let lastBackup = 0;
      try { lastBackup = parseInt(localStorage.getItem(LAST_BACKUP_KEY) || '0', 10) || 0; } catch (e) {}
      if (!lastBackup) rows.push({ icon: '🛡️', text: 'Aún no has exportado ningún respaldo cifrado de tu historial.', btn: 'Ir al respaldo', act: function () { scrollToId('dailyCare'); } });
      else {
        const days = Math.floor((Date.now() - lastBackup) / 86400000);
        if (days >= 7) rows.push({ icon: '🛡️', text: 'Tu último respaldo fue hace ' + days + ' días.', btn: 'Ir al respaldo', act: function () { scrollToId('dailyCare'); } });
      }
      const profiles = window.RealScanPrinterProfiles;
      if (profiles && !profiles.getActive()) rows.push({ icon: '📏', text: 'Tu impresora no tiene perfil de calibración: la escala 1:1 puede variar.', btn: 'Calibrar', act: function () { scrollToId('dailyCare'); } });
      if (window.RealScanCloudSync && !window.RealScanCloudSync.isLinked()) rows.push({ compact: true, icon: '☁️', text: 'Nube sin vincular · Los trabajos se guardan solo en este equipo.', btn: 'Cómo activarla', act: showCloudSteps });
    } catch (e) {}
    if (!rows.length) return;
    const panel = document.createElement('section');
    panel.id = 'rsTodayPanel';
    panel.className = 'bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-2 mt-4';
    panel.setAttribute('aria-labelledby', 'rsTodayTitle');
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between';
    header.innerHTML = '<h2 id="rsTodayTitle" class="text-base font-bold text-slate-900 dark:text-white">☀️ Hoy</h2>';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold min-w-[44px] min-h-[44px]';
    closeBtn.setAttribute('aria-label', 'Cerrar el panel de hoy');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', function () {
      try { localStorage.setItem(TODAY_DISMISS_KEY, todayStr()); } catch (e) {}
      panel.remove();
    });
    header.append(closeBtn);
    panel.append(header);
    rows.forEach(function (row) {
      const line = document.createElement('div');
      const span = document.createElement('span');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = row.btn;
      btn.addEventListener('click', row.act);
      if (row.compact) {
        // Estado compacto (v3.14.0): una línea discreta, sin ocupar el
        // mejor sitio de la pantalla ni competir con las acciones.
        line.className = 'flex flex-wrap items-center gap-x-2 gap-y-1 px-1 py-1';
        span.className = 'text-xs font-medium text-slate-500 dark:text-slate-400 flex-1 min-w-[200px]';
        btn.className = 'px-2 py-1.5 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 underline decoration-indigo-300 dark:decoration-indigo-700 underline-offset-2 min-h-[36px]';
      } else {
        line.className = 'flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-2.5';
        span.className = 'text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 min-w-[210px]';
        btn.className = 'px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold min-h-[44px]';
      }
      span.textContent = row.icon + ' ' + row.text;
      line.append(span, btn);
      panel.append(line);
    });
    // v3.14.0: el panel «Hoy» va DESPUÉS del bloque principal de trabajo
    // (servicio actual + siguiente paso), no en el mejor sitio de la
    // pantalla inicial. Son avisos del día, no la acción principal.
    const journey = document.getElementById('operatorJourney');
    const counter = document.getElementById('counterService');
    const bar = document.getElementById('guidedStepsBar');
    const daily=document.getElementById('dailyCare');
    if(daily&&daily.parentNode)daily.before(panel);
    else if (journey && journey.parentNode) journey.parentNode.insertBefore(panel, journey.nextSibling);
    else if (counter && counter.parentNode) counter.parentNode.insertBefore(panel, counter.nextSibling);
    else if (bar && bar.parentNode) bar.parentNode.insertBefore(panel, bar.nextSibling);
    else { const care = document.getElementById('dailyCare'); if (care && care.parentNode) care.parentNode.insertBefore(panel, care); }
  }

  /* ---------- 12.8 Costumbres de uso ---------- */
  function recordFormatUse(key) {
    try {
      const data = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
      const entry = data[key] || { total: 0, hours: {} };
      entry.total++;
      const h = String(new Date().getHours());
      entry.hours[h] = (entry.hours[h] || 0) + 1;
      data[key] = entry;
      localStorage.setItem(USAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }
  function habitCandidate() {
    try {
      const data = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
      const keys = Object.keys(data);
      if (!keys.length) return null;
      const h = String(new Date().getHours());
      let bestHour = null, bestHourCount = 0, bestAll = null, bestAllCount = 0;
      keys.forEach(function (k) {
        const hc = (data[k].hours || {})[h] || 0;
        if (hc > bestHourCount) { bestHourCount = hc; bestHour = k; }
        if ((data[k].total || 0) > bestAllCount) { bestAllCount = data[k].total; bestAll = k; }
      });
      if (bestHour && bestHourCount >= 3) return bestHour;
      if (bestAll && bestAllCount >= 3) return bestAll;
    } catch (e) {}
    return null;
  }
  function preselectHabit() {
    try {
      if (localStorage.getItem('realscan_last_formats_v1')) return; // ya hay un último tipo recordado
    } catch (e) { return; }
    const key = habitCandidate();
    if (!key) return;
    const btn = document.querySelector('[data-quick-format="' + key + '"], [data-format="' + key + '"]');
    if (btn && btn.offsetParent !== null) btn.click();
  }

  document.addEventListener('click', function (e) {
    const t = e.target && e.target.closest ? e.target.closest('[data-format], [data-quick-format]') : null;
    if (t) recordFormatUse(t.getAttribute('data-format') || t.getAttribute('data-quick-format'));
  }, true);

  /* ---------- La barra flotante nunca tapa los pasos (v3.14.0) ----------
     La barra de acciones rápidas (visible en el paso de impresión) se
     retira cuando los pasos del recorrido entran en la franja inferior
     de la pantalla, para no cubrirlos en ningún estado. */
  function guardHudOverlap(tries) {
    const hud = document.getElementById('floatingHudBar');
    const nav = document.querySelector('#operatorJourney nav');
    if (!hud) return;
    if (!nav) { if ((tries || 0) < 10) setTimeout(function () { guardHudOverlap((tries || 0) + 1); }, 500); return; }
    if (!('IntersectionObserver' in window)) return;
    hud.classList.add('hud-guarded');
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { hud.classList.toggle('hud-yield', e.isIntersecting); });
    }, { rootMargin: '-86% 0px 0px 0px', threshold: 0 });
    io.observe(nav);
  }

  document.addEventListener('DOMContentLoaded', function () {
    guardHudOverlap(0);
    const welcomeBtn = document.getElementById('btnShowWelcome');
    if (welcomeBtn) welcomeBtn.addEventListener('click', showWelcome);
    const themeName = document.getElementById('themeCurrentName');
    if (themeName && window.RealScanTheme) {
      themeName.textContent = window.RealScanTheme.THEMES[window.RealScanTheme.current()] || 'Índigo';
      document.querySelectorAll('[data-theme-pick]').forEach(function (b) {
        b.addEventListener('click', function () { themeName.textContent = window.RealScanTheme.THEMES[b.getAttribute('data-theme-pick')] || ''; });
      });
    }
    whenAppEntered(function () {
      buildTodayPanel();
      setTimeout(preselectHabit, 1200);
    });
  });

  window.RealScanPolish = { successCheck: successCheck, showWelcome: showWelcome, buildTodayPanel: buildTodayPanel, habitCandidate: habitCandidate };
})();
