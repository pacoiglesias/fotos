/* A task-oriented layer over the existing, shared job and review controls. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let signature = '';
  function button(label, action, className = 'counter-secondary') {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.className = className; b.onclick = action; return b;
  }
  function go(step) {
    const doc = window.RealScanDocuments?.status();
    if (step === 'receive') {
      const target = doc?.active ? $('docImport') : document.querySelector('[data-camera="' + (RealScanWorkflow.describe().missing[0] || 'front') + '"]');
      if (!doc?.active) RealScanWorkflow.moveTo(2, RealScanWorkflow.describe().missing[0]);
      target?.focus(); target?.scrollIntoView({block:'center'});
    } else if (step === 'review' || step === 'adjust') {
      if (doc?.active) { const target=step==='adjust'?$('docPaper'):$('docPages');target.scrollIntoView({block:'center'});(target.querySelector('button')||target).focus(); }
      else RealScanWorkflow.moveTo(step === 'adjust' ? 3 : 2, step === 'review' ? RealScanWorkflow.describe().missing[0]||RealScanWorkflow.describe().wanted[0] : null);
    } else if (doc?.active) { $('docPdf').scrollIntoView({block:'center'}); $('docPdf').focus(); }
    else RealScanWorkflow.moveTo(3);
  }
  function update() {
    if (!$('operatorJourney')) return;
    const doc = window.RealScanDocuments?.status(), work = RealScanWorkflow.describe();
    const count = doc?.active ? doc.count : work.wanted.length - work.missing.length;
    const busy = doc?.active ? doc.busy : work.busy;
    const ready = doc?.active ? doc.ready : work.ready;
    const key = JSON.stringify([doc, count, busy, ready, work.missing, work.warnings, state.format, state.activeCategory, state._jobRevision, navigator.onLine]);
    if (key === signature) return; signature = key;
    const current = !count ? 'receive' : !ready ? 'review' : 'deliver';
    for (const b of $('operatorJourney').querySelectorAll('[data-journey]')) {
      if (b.dataset.journey === current) b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current');
      b.disabled = busy || (!count && b.dataset.journey !== 'receive');
    }
    $('operatorNextTitle').textContent = busy ? 'Preparando tu trabajo…' : !count ? 'Recibe el documento o la fotografía' : !ready ? 'Completa y revisa las capturas' : 'Comprueba el resultado y entrega';
    $('operatorNextHint').textContent = doc?.active ? doc.reviewed+' de '+doc.count+' páginas revisadas. Confirma cada página; después elige PDF, impresión o QR.' : !ready ? 'Puedes usar la cámara, abrir un archivo o recibir desde otro celular. El trabajo actual se conserva.' : 'Revisa orientación, bordes, caras y medidas. El texto OCR y la aceptación de una foto oficial requieren revisión humana.';
    // v3.16.0: las formas de recibir (Cámara / Archivo / otro celular) quedan
    // SIEMPRE visibles: capturar es la acción principal del mostrador y no
    // debe desaparecer cuando el trabajo ya está listo (añadir una página o
    // una foto más es también trabajo de todos los días).
    $('operatorReceiveActions').querySelectorAll('button').forEach(b=>b.disabled=busy);
    $('operatorNext').disabled = busy;
    $('operatorNext').textContent = !count ? 'Elegir cómo recibir' : !ready ? 'Revisar lo que falta' : 'Revisar entrega';
    $('operatorNext').onclick = () => go(!count ? 'receive' : !ready ? 'review' : 'deliver');
  }
  document.addEventListener('DOMContentLoaded', () => {
    const quick = document.createElement('div'); quick.className = 'operator-tasks'; quick.setAttribute('aria-label','Comenzar por tarea');
    for (const [kind,title,hint,source] of [['document','Escanear documento','Hojas y PDF de varias páginas','choose'],['photos','Foto para trámite','Elige medida, encuadre y copias','choose'],['id','Recibir del cliente','Abre el QR para su celular','qr']]) {
      const b = button('', () => RealScanCounter.openNewService(kind,source), 'operator-task'); b.dataset.task = kind;
      const strong = document.createElement('strong'), small = document.createElement('small'); strong.textContent = title; small.textContent = hint; b.append(strong,small); quick.append(b);
    }
    $('counterService').append(quick);
    const panel = document.createElement('section'); panel.id = 'operatorJourney'; panel.className = 'operator-journey'; panel.setAttribute('aria-label','Recorrido del servicio');
    // v3.16.0: la fila de recepción (Cámara / Archivo / otro celular) va
    // ANTES del bloque «Siguiente paso»: capturar es la acción principal
    // del mostrador y debe quedar en la primera pantalla del teléfono,
    // sin scroll. El bloque de orientación queda justo debajo.
    panel.innerHTML = '<nav aria-label="Recibir, revisar, ajustar y entregar"></nav><div id="operatorReceiveActions" class="operator-receive" aria-label="Formas de recibir"></div><div class="operator-next"><div><p class="counter-kicker">SIGUIENTE PASO</p><h2 id="operatorNextTitle"></h2><p id="operatorNextHint" class="counter-help"></p></div><button id="operatorNext" type="button" class="counter-primary"></button></div>';
    for (const [i,step,label] of [[1,'receive','Recibir'],[2,'review','Revisar'],[3,'adjust','Ajustar'],[4,'deliver','Entregar']]) {
      const b = button(i+' · '+label,()=>go(step)); b.dataset.journey = step; panel.querySelector('nav').append(b);
    }
    for (const [label,action] of [['Cámara',()=>{if(RealScanDocuments.status().active)$('docCamera').click();else{const side=RealScanWorkflow.describe().missing[0]||RealScanWorkflow.describe().wanted[0]||'front';RealScanWorkflow.moveTo(2,side);document.querySelector('[data-camera="'+side+'"]')?.click();}}],['Archivo / USB',()=>{if(RealScanDocuments.status().active)$('docImport').click();else{const side=RealScanWorkflow.describe().missing[0]||'front';RealScanWorkflow.moveTo(2,side);$({front:'fileInputFront',back:'fileInputBack',page3:'fileInputPage3',page4:'fileInputPage4'}[side])?.click();}}],['Desde otro celular',()=>$('btnOpenReceiveModal').click()]]) { const b = button(label,action); if (label === 'Cámara') b.className = 'counter-primary'; panel.querySelector('#operatorReceiveActions').append(b); }
    $('counterService').after(panel);
    // v3.16.0: las tarjetas «Comenzar por tarea» salen de la tarjeta del
    // servicio actual y quedan DESPUÉS del recorrido. Tal como estaban
    // (tres tarjetas apiladas dentro de «Servicio actual») empujaban la
    // captura y el siguiente paso fuera de la primera pantalla del
    // teléfono: primero manda el servicio en curso y su siguiente paso;
    // empezar otro servicio por tarea sigue a un toque, justo debajo.
    if (quick && quick.parentElement) panel.after(quick);
    // v3.16.0 (criterio de Paco: la app debe ser práctica y funcional por
    // encima de lo visual): los formatos del servicio quedan DIRECTOS en
    // la pantalla de inicio, sin menú desplegable. La v3.14.0 envolvió
    // #serviceFormats en un <details> «Otros formatos» recogido en móvil,
    // y el formato de todos los días (identificaciones) costaba dos toques
    // y scroll antes de poder elegirse. Ahora la sección queda en su sitio,
    // visible y a un toque; lo menos frecuente sigue agrupado más abajo en
    // el paso 1 (modos de hoja y categorías), como siempre.
    update();
    document.addEventListener('click',()=>requestAnimationFrame(update));
    document.addEventListener('change',()=>requestAnimationFrame(update));
    window.addEventListener('online',update); window.addEventListener('offline',update);
    setInterval(update,1000);
  });
  window.RealScanJourney = {update};
})();
