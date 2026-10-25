/* A task-oriented layer over the existing, shared job and review controls. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let signature = '';
  const icons={id:'M4 5h16v14H4z M8 9a2 2 0 1 0 0 4a2 2 0 1 0 0-4 M5 17c0-4 6-4 6 0 M14 9h3 M14 13h3',photos:'M4 4h16v16H4z M4 16l5-5 4 4 3-3 4 4 M15 8h.01',document:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',camera:'M3 7h4l2-3h6l2 3h4v13H3z M16 13a4 4 0 1 1-8 0a4 4 0 1 1 8 0',file:'M3 7h7l2 2h9v11H3z M3 7V4h7l2 3',qr:'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h3v3h3v3h-6z'};
  function icon(kind){const span=document.createElement('span');span.className='task-icon';span.setAttribute('aria-hidden','true');span.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+icons[kind]+'"/></svg>';return span;}
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
    } else if (doc?.active) { if(doc.ready&&document.body.dataset.outputMode!=='digital'&&window.RealScanDocumentPrint){RealScanDocumentPrint.review();return;}$('docPdf').scrollIntoView({block:'center'}); $('docPdf').focus(); }
    else if(document.body.dataset.outputMode==='digital')$('btnOpenDeliveryModal').click();
    else handlePrintDirect();
  }
  function update() {
    if (!$('operatorJourney')) return;
    const doc = window.RealScanDocuments?.status(), work = RealScanWorkflow.describe();
    const count = doc?.active ? doc.count : work.wanted.length - work.missing.length;
    const busy = doc?.active ? doc.busy : work.busy;
    const ready = doc?.active ? doc.ready : work.ready;
    const key = JSON.stringify([doc, count, busy, ready, work.missing, work.warnings, state.format, state.activeCategory, state._jobRevision, state.paperSize,state.photoCopies,state.printMode,state.mixTwoPhotos,document.body.dataset.outputMode,navigator.onLine]);
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
    $('operatorNext').hidden=!count&&!busy;
    if(!busy)$('operatorNext').textContent=!ready?'Completar y revisar':document.body.dataset.outputMode==='digital'?'Entregar archivos':'Revisar e imprimir';
    $('operatorNextTitle').textContent=busy?'Preparando las imágenes…':!count?'Empieza con una foto o identificación':!ready?'Completa y revisa las imágenes':'Tu hoja está lista para revisar';
    $('operatorNextHint').textContent=doc?.active?doc.reviewed+' de '+doc.count+' páginas revisadas.':busy?'Tu trabajo se conserva. Al terminar podrás continuar.':!count?'Elige Cámara, Archivo o Celular por QR.':!ready?'Añade la cara pendiente o revisa el tamaño y el papel.':'Verás la hoja completa antes de abrir la impresión.';
    if(!$('quickPrintSettings'))return;
    const photos=state.activeCategory==='photos';
    $('quickPrintSettings').hidden=!!doc?.active||document.body.dataset.outputMode==='digital';
    $('quickPhotoFormatRow').hidden=!photos;$('quickCopiesRow').hidden=!photos||state.mixTwoPhotos;$('quickIdSidesRow').hidden=photos||state.format!=='card';
    $('quickPaper').value=state.paperSize;$('quickPhotoFormat').value=state.format;
    if(document.activeElement!==$('quickCopies'))$('quickCopies').value=state.photoCopies;
    $('quickCopies').max=$('inputPhotoCopies').max;$('quickIdSides').value=state.printMode;
    $('operatorStatus').replaceChildren();
    for(const side of work.wanted){const tag=document.createElement('button');tag.type='button';tag.className='job-status-chip';const missing=work.missing.includes(side);tag.dataset.ready=String(!missing);tag.textContent=(missing?'○ ':'✓ ')+(photos?(side==='back'?'Foto B':'Foto'):({front:'Frente',back:'Reverso',page3:'Página 3',page4:'Página 4'}[side]))+(missing?' · añadir':' · lista');tag.onclick=()=>RealScanWorkflow.moveTo(2,side);$('operatorStatus').append(tag);}
    $('operatorStatus').hidden=!!doc?.active;
    $('operatorNotices').textContent=work.warnings.join(' ');$('operatorNotices').hidden=!work.warnings.length||!!doc?.active;
    for(const b of document.querySelectorAll('[data-task]'))b.setAttribute('aria-pressed',String(doc?.active?b.dataset.task==='document':b.dataset.task===(photos?'photos':'id')));
  }
  document.addEventListener('DOMContentLoaded', () => {
    const quick = document.createElement('div'); quick.className = 'operator-tasks'; quick.setAttribute('aria-label','Comenzar por tarea');
    for (const [kind,title,hint,source] of [['id','Identificación','Frente y reverso','choose'],['photos','Fotografías','Tamaño y copias','choose'],['document','Documentos','Varias páginas','choose']]) {
      const b = button('', () => {const occupied=Object.values(state.images).some(i=>i.originalSrc||i.processedDataUrl||i._reading)||RealScanDocuments.status().active||RealScanQrSync.getInboxFiles().length;if(occupied||kind==='document'){RealScanCounter.openNewService(kind,source);return;}switchIntent(kind);RealScanCounter.setOutput('print');RealScanWorkflow.moveTo(2,'front');update();}, 'operator-task'); b.dataset.task = kind;
      const strong = document.createElement('strong'), small = document.createElement('small'),copy=document.createElement('span'); strong.textContent = title; small.textContent = hint;copy.append(strong,small); b.append(icon(kind),copy); quick.append(b);
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
    Array.from($('operatorReceiveActions').children).forEach((b,i)=>{b.prepend(icon(['camera','file','qr'][i]));if(i===2)b.lastChild.textContent='Celular por QR';});
    const status=document.createElement('div');status.id='operatorStatus';status.className='job-status';status.setAttribute('aria-label','Imágenes del trabajo');panel.querySelector('.operator-next').after(status);
    const settings=document.createElement('div');settings.id='quickPrintSettings';settings.className='quick-print-settings';settings.innerHTML='<label>Papel de la impresora<select id="quickPaper"></select></label><label id="quickPhotoFormatRow">Tamaño de foto<select id="quickPhotoFormat"></select></label><label id="quickCopiesRow">Fotos a imprimir<input id="quickCopies" type="number" min="1" inputmode="numeric" value="4"></label><label id="quickIdSidesRow">Caras<select id="quickIdSides"><option value="both">Frente y reverso juntos</option><option value="single">Solo frente</option><option value="both_separate">Una cara por hoja</option><option value="multi">Varias páginas</option></select></label>';
    status.after(settings);
    for(const [id,spec]of Object.entries(PAPER_SPECS)){const o=document.createElement('option');o.value=id;o.textContent=spec.shortName;$('quickPaper').append(o);}
    for(const [id,spec]of Object.entries(FORMAT_SPECS).filter(([id])=>id.startsWith('photo_'))){const o=document.createElement('option');o.value=id;o.textContent=spec.shortName;$('quickPhotoFormat').append(o);}
    $('quickPaper').onchange=()=>{setPaperSize($('quickPaper').value);update();};$('quickCopies').onchange=()=>{setPhotoCopies($('quickCopies').value);update();};$('quickIdSides').onchange=()=>{setPrintMode($('quickIdSides').value);update();};$('quickPhotoFormat').onchange=()=>{selectFormat($('quickPhotoFormat').value);update();};
    const notices=document.createElement('p');notices.id='operatorNotices';notices.className='output-review-warning';notices.setAttribute('role','status');panel.append(notices);
    for(const [id,label]of [['btnNewProject','Nuevo'],['btnOpenReceiveModal','Recibir QR'],['btnOpenDeliveryModal','Entregar']])$(id).lastElementChild.textContent=label;
    $('quickIdSides').options[0].textContent='Ambas caras';$('quickIdSides').options[2].textContent='Separadas';
    // v3.16.0: las tarjetas «Comenzar por tarea» salen de la tarjeta del
    // servicio actual y quedan DESPUÉS del recorrido. Tal como estaban
    // (tres tarjetas apiladas dentro de «Servicio actual») empujaban la
    // captura y el siguiente paso fuera de la primera pantalla del
    // teléfono: primero manda el servicio en curso y su siguiente paso;
    // empezar otro servicio por tarea sigue a un toque, justo debajo.
    if (quick && quick.parentElement) $('counterService').append(quick);
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
    document.addEventListener('realscan:studio-updated',update);document.addEventListener('realscan:document-updated',update);
  });
  window.RealScanJourney = {update,go};
})();
