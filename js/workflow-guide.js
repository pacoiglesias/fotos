/* One shared description of the work actually placed on the output sheets. */
(function () {
  'use strict';
  const names = {front:'frente',back:'reverso',page3:'página 3',page4:'página 4'};
  const targets = {front:'dropzoneFront',back:'cardBackContainer',page3:'cardPage3Container',page4:'cardPage4Container'};
  function describe(layout) {
    layout = layout || RealScanLayout.computeDocumentLayout(state);
    const wanted = [...new Set(layout.pages.flatMap(page => page.placements.map(piece => piece.slot)))];
    const missing = wanted.filter(side => !state.images[side]?.processedDataUrl);
    const busy = !!state._processingPending || Object.values(state.images).some(image => image._reading);
    const scale = Number(state.outputScalePercent) || 100;
    const warnings = [...new Set([...(layout.errors || []), ...(layout.warnings || [])])];
    if (scale !== 100) warnings.unshift('Escala de ' + scale + ' %: las piezas no saldrán a tamaño real.');
    return {layout,wanted,missing,busy,scale,warnings,ready:!busy && !missing.length && wanted.length > 0};
  }
  function moveTo(step, side) {
    setMobileStep(step);
    const target = side ? document.getElementById(targets[side]) : step===3&&document.body.dataset.outputMode==='digital'?document.getElementById('digitalOutput'):document.querySelector('.mob-pane-' + step);
    if (!target) return;
    target.tabIndex = -1;
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  function text(id, value) {
    const el = document.getElementById(id);
    if (el && el.textContent !== value) el.textContent = value;
  }
  function update(layout) {
    const card = document.getElementById('workflowGuide');
    if (!card) return;
    const work = describe(layout), photos = state.activeCategory === 'photos',digital=document.body.dataset.outputMode==='digital';
    const sideName = side => photos ? (side === 'back' ? 'la foto de la persona B' : state.mixTwoPhotos ? 'la foto de la persona A' : 'tu fotografía') : 'el ' + names[side];
    const loaded = work.wanted.length - work.missing.length;
    const intent = photos ? 'photos' : state.activeCategory === 'custom' ? 'custom' : ['passport','passport_open'].includes(state.format) ? 'multi' : state.format === 'card' ? 'id' : '';
    document.querySelectorAll('.intent-card').forEach(button => {
      const active = button.dataset.intent === intent;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    const next = work.busy ? 'Preparando las imágenes…' : work.missing.length ?
      (loaded ? 'Falta cargar ' + sideName(work.missing[0]) : 'Carga ' + (photos ? sideName(work.missing[0]) : 'el frente del documento')) : 'Revisa el resultado antes de entregar';
    card.dataset.state = work.busy ? 'busy' : work.ready ? 'review' : 'load';
    text('workflowTitle', next);
    text('workflowSummary', digital?getActiveSpec().shortName+' · '+work.wanted.length+' archivo(s) individuales':getActiveSpec().shortName + ' · ' + work.layout.paper.shortName + ' · ' + work.layout.pages.length + ' hoja(s)' + (photos ? ' · ' + state.photoCopies + ' foto(s)' : '') + ' · ' + work.scale + ' %');
    text('workflowProgress', loaded + ' de ' + work.wanted.length + ' imágenes preparadas');
    text('workflowTip', work.busy ? 'Espera a que termine la carga. Tu selección más reciente tiene prioridad.' : work.missing.length ?
      'Elige cámara o archivo en la zona de carga, o recibe las imágenes desde otro celular por QR.' :
      (photos ? 'Comprueba rostro, márgenes y copias. «Encajar todo» conserva la imagen; «Rellenar y recortar» puede cortar los bordes.' : 'Comprueba que todos los bordes, textos y caras estén completos. Para imprimir, usa tamaño real / 100 % en la impresora.'));
    const primary = document.getElementById('workflowNext');
    primary.disabled = work.busy;
    primary.textContent = work.busy ? 'Preparando…' : work.missing.length ? (loaded ? 'Cargar ' + sideName(work.missing[0]) : 'Elegir cámara o archivo') : 'Revisar hoja';
    if(digital&&!work.missing.length&&!work.busy){primary.textContent='Revisar archivos';text('workflowTip','Revisa orientación, bordes y nitidez. Después elige formato, dimensiones y peso de los archivos que recibirá el cliente.');}
    const notice = document.getElementById('workflowNotice');
    notice.hidden = !work.warnings.length;
    text('workflowNotice', work.warnings.join(' '));
    text('workflowConnection', navigator.onLine ? 'Conexión disponible' : 'Sin conexión: puedes editar y descargar. El QR en la nube necesita internet.');
    document.querySelectorAll('[data-workflow-step]').forEach(button => {
      const step = Number(button.dataset.workflowStep), active = Number(document.body.dataset.mobileStep || 1) === step;
      button.setAttribute('aria-current', active ? 'step' : 'false');
      button.dataset.complete = String(step === 1 || step === 2 && work.ready);
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('workflowNext').addEventListener('click', () => {
      const work = describe();
      if (!work.busy) moveTo(work.missing.length ? 2 : 3,work.missing[0]);
    });
    document.getElementById('workflowReceive').addEventListener('click', () => document.getElementById('btnOpenReceiveModal').click());
    document.querySelectorAll('[data-workflow-step]').forEach(button => button.addEventListener('click', () => moveTo(Number(button.dataset.workflowStep))));
    update();
  });
  window.addEventListener('online', () => update());
  window.addEventListener('offline', () => update());
  window.RealScanWorkflow = {describe,update,moveTo};
})();
