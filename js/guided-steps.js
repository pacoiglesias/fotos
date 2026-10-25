/* ============================================================
   RealScan Pro — Flujo guiado en 3 pasos (modo mostrador) v3.12.0
   Barra de progreso siempre visible arriba: «1 Tipo → 2 Fotos →
   3 Imprimir/Entregar». Refleja el paso actual según el estado
   real del trabajo y permite saltar a cualquier paso tocándolo
   (sobre todo, volver atrás). NO sustituye a la navegación libre:
   es una ayuda visual y de acceso rápido; todo lo demás sigue
   funcionando igual para quien ya conoce la app.
   ============================================================ */
(function () {
  'use strict';
  const FORMAT_PICKED_KEY = 'realscan_guided_format_picked';
  let bar = null;
  let signature = '';

  function formatPicked() {
    try { return sessionStorage.getItem(FORMAT_PICKED_KEY) === '1'; } catch (e) { return false; }
  }
  function computeStep() {
    const documentJob=window.RealScanDocuments?.status();
    if(documentJob?.active)return {current:documentJob.ready?3:2,loaded:!!documentJob.count,ready:documentJob.ready};
    const images = (window.state && state.images) || {};
    const loaded = Object.keys(images).some(function (k) { return !!(images[k] && images[k].processedDataUrl); });
    let ready = loaded;
    try {
      if (window.RealScanWorkflow && typeof RealScanWorkflow.describe === 'function') {
        const w = RealScanWorkflow.describe();
        if (w) ready = !!w.ready;
      }
    } catch (e) {}
    const visibleStep=Number(document.body.dataset.mobileStep);
    if(matchMedia('(max-width:1023px)').matches&&[1,2,3].includes(visibleStep))return {current:visibleStep,loaded,ready};
    if (!loaded && !formatPicked()) return { current: 1, loaded: loaded, ready: ready };
    if (!ready) return { current: 2, loaded: loaded, ready: ready };
    return { current: 3, loaded: loaded, ready: ready };
  }
  function goStep(step) {
    if(step===2 && window.RealScanDocuments?.status().active){RealScanJourney.go('review');return;}
    if(step===2 && window.RealScanWorkflow){const work=RealScanWorkflow.describe();RealScanWorkflow.moveTo(2,work.missing[0]||work.wanted[0]);return;}
    if(step===3 && window.RealScanJourney){RealScanJourney.go('deliver');return;}
    if(step===1 && typeof setMobileStep==='function')setMobileStep(1);
    let target = null;
    if (step === 1) {
      target = document.getElementById('serviceFlow') || document.querySelector('[data-format-wrap="' + (state.activeCategory || 'docs') + '"]') ||
        document.getElementById('serviceFormats') ||
        document.querySelector('.cat-tab');
    } else if (step === 2) {
      let side = 'front';
      try {
        const missing = window.RealScanWorkflow?.describe?.().missing;
        if (missing && missing[0]) side = missing[0];
      } catch (e) {}
      const suffix = { front: 'Front', back: 'Back', page3: 'Page3', page4: 'Page4' }[side] || 'Front';
      target = document.getElementById('dropzone' + suffix) || document.getElementById('dropzoneFront');
    } else {
      target = document.querySelector('.a4-sheet');
    }
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.classList.add('ring-4', 'ring-indigo-300');
      setTimeout(function () { target.classList.remove('ring-4', 'ring-indigo-300'); }, 1600);
    }
  }
  function render() {
    if (!bar) return;
    const info = computeStep();
    const sig = info.current + '|' + info.loaded + '|' + info.ready;
    if (sig === signature) return;
    signature = sig;
    bar.querySelectorAll('[data-guided-step]').forEach(function (btn) {
      const step = Number(btn.getAttribute('data-guided-step'));
      btn.disabled=step===3&&!info.ready;
      const isCurrent = step === info.current;
      const isDone = step < info.current || (step === 3 && info.ready && info.current === 3);
      btn.setAttribute('aria-current', isCurrent ? 'step' : 'false');
      btn.className =
        'flex-1 min-h-[44px] px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all ' +
        (isCurrent
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300 dark:shadow-none'
          : isDone
            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400');
      const label = btn.querySelector('.guided-step-label');
      if (label) {
        const base = { 1: 'Elegir', 2: 'Cargar', 3: 'Revisar / Imprimir' }[step];
        label.textContent = (isDone && !isCurrent ? '✓ ' : step + ' · ') + base;
      }
    });
  }
  function init() {
    if (document.getElementById('guidedStepsBar')) return;
    bar = document.createElement('div');
    bar.id = 'guidedStepsBar';
    bar.className = 'sticky top-0 z-40 flex items-stretch gap-1.5 p-1.5 mb-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Pasos del trabajo');
    [1, 2, 3].forEach(function (step) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-guided-step', String(step));
      btn.innerHTML = '<span class="guided-step-label"></span>';
      btn.addEventListener('click', function () { goStep(step); });
      bar.appendChild(btn);
      if (step < 3) {
        const arrow = document.createElement('span');
        arrow.className = 'self-center text-slate-300 dark:text-slate-600 font-bold';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '›';
        bar.appendChild(arrow);
      }
    });
    const anchor = document.getElementById('counterService');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor);
    else if (document.querySelector('main')) document.querySelector('main').prepend(bar);
    else document.body.prepend(bar);

    // v3.14.0: la barra se pega JUSTO debajo de la cabecera fija, nunca
    // encima de ella, y publica la altura total (cabecera + barra) como
    // --rs-sticky-offset para que ningún destino de scroll quede tapado.
    function placeBar() {
      const header = document.querySelector('header');
      const hh = header ? Math.round(header.getBoundingClientRect().height) : 0;
      bar.style.top = 'calc(env(safe-area-inset-top) + ' + hh + 'px)';
      const total = hh + bar.offsetHeight + 12;
      document.documentElement.style.setProperty('--rs-sticky-offset', total + 'px');
    }
    placeBar();
    window.addEventListener('resize', placeBar);
    setTimeout(placeBar, 300);
    setTimeout(placeBar, 1200);

    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.format-btn')) {
        try { sessionStorage.setItem(FORMAT_PICKED_KEY, '1'); } catch (err) {}
      }
      setTimeout(render, 60);
    }, true);
    document.addEventListener('realscan:studio-updated',render);document.addEventListener('realscan:document-updated',render);
    render();
    window.RealScanGuided={render};
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
