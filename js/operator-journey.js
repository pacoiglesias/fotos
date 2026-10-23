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
    $('operatorReceiveActions').hidden = !!count && ready;
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
    panel.innerHTML = '<nav aria-label="Recibir, revisar, ajustar y entregar"></nav><div class="operator-next"><div><p class="counter-kicker">SIGUIENTE PASO</p><h2 id="operatorNextTitle"></h2><p id="operatorNextHint" class="counter-help"></p></div><button id="operatorNext" type="button" class="counter-primary"></button></div><div id="operatorReceiveActions" class="operator-receive" aria-label="Formas de recibir"></div>';
    for (const [i,step,label] of [[1,'receive','Recibir'],[2,'review','Revisar'],[3,'adjust','Ajustar'],[4,'deliver','Entregar']]) {
      const b = button(i+' · '+label,()=>go(step)); b.dataset.journey = step; panel.querySelector('nav').append(b);
    }
    for (const [label,action] of [['Cámara',()=>{if(RealScanDocuments.status().active)$('docCamera').click();else{const side=RealScanWorkflow.describe().missing[0]||RealScanWorkflow.describe().wanted[0]||'front';RealScanWorkflow.moveTo(2,side);document.querySelector('[data-camera="'+side+'"]')?.click();}}],['Archivo / USB',()=>{if(RealScanDocuments.status().active)$('docImport').click();else{const side=RealScanWorkflow.describe().missing[0]||'front';RealScanWorkflow.moveTo(2,side);$({front:'fileInputFront',back:'fileInputBack',page3:'fileInputPage3',page4:'fileInputPage4'}[side])?.click();}}],['Desde otro celular',()=>$('btnOpenReceiveModal').click()]]) panel.querySelector('#operatorReceiveActions').append(button(label,action));
    $('counterService').after(panel);
    // Less frequently used settings stay accessible through an explicit disclosure.
    const more = document.createElement('details'); more.className = 'operator-advanced'; more.innerHTML = '<summary>Otros formatos: identificación, pasaporte y medida personalizada</summary>';
    $('serviceFormats').before(more); more.append($('serviceFormats')); more.open = true;
    more.addEventListener('toggle',()=>{more.dataset.expanded=String(more.open);});
    update();
    document.addEventListener('click',()=>requestAnimationFrame(update));
    document.addEventListener('change',()=>requestAnimationFrame(update));
    window.addEventListener('online',update); window.addEventListener('offline',update);
    setInterval(update,1000);
  });
  window.RealScanJourney = {update};
})();
