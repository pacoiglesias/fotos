/* RealScan 3.20: visual workspace over the shared job, editor and print engine. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const PRESETS_KEY = 'realscan_studio_presets_v1';
  const suffix = {front:'Front',back:'Back',page3:'Page3',page4:'Page4'};
  const labels = {front:'Frente',back:'Reverso',page3:'Página 3',page4:'Página 4'};
  let selected = 'front', comparison = false, previous = [], revision = null;
  let originalSeen = '', processedSeen = '';
  let engaged = false;
  let approval = null;
  function approvalSnapshot() {
    return [JSON.stringify([state._jobRevision,RealScanLayout.computeDocumentLayout(state),window.RealScanPrinterProfiles?.getActive()]),...wanted().map(s=>state.images[s]?.processedDataUrl)];
  }
  function markApproved() { approval=approvalSnapshot();previous=[];update(); }
  const paths = {
    arrow:'M5 12h14m-5-5 5 5-5 5', rotate:'M20 7v5h-5 M20 12a8 8 0 1 0-3 6',
    crop:'M6 3v15h15 M3 6h15v15', compare:'M12 3v18 M3 5h18v14H3z',
    eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0',
    plus:'M12 4v16 M4 12h16', print:'M6 8V3h12v5 M6 17H3V9h18v8h-3 M6 14h12v7H6z M17 11h.01',
    file:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6', check:'m5 12 4 4L19 6',
    star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z'
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[name]+'"/></svg>'; }
  function node(tag, cls, text) { const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el; }
  function action(id, text, symbol, callback, primary=false) {
    const b=node('button',primary?'studio-button studio-primary':'studio-button');b.type='button';b.id=id;
    if(symbol)b.innerHTML=icon(symbol);b.append(node('span','',text));
    b.addEventListener('click',()=>{if(unlocked())callback();});return b;
  }
  function unlocked() { return $('loginOverlay')?.classList.contains('hidden') && (!$('setupOverlay') || $('setupOverlay').classList.contains('hidden')); }
  function photoLabel(side) { return state.activeCategory==='photos'?(side==='back'?'Foto B':'Foto A'):labels[side]; }
  function wanted() { return window.RealScanWorkflow?.describe().wanted || ['front']; }
  function occupied() { return Object.values(state.images).some(i=>i.originalSrc||i.processedDataUrl||i._reading)||window.RealScanDocuments?.status().active; }
  function validPreset(p) {
    return p && typeof p.name==='string' && p.name.length<=48 && ['id','photos'].includes(p.kind) &&
      typeof p.format==='string' && Object.hasOwn(FORMAT_SPECS,p.format) && typeof p.paper==='string' && Object.hasOwn(PAPER_SPECS,p.paper) && Number.isInteger(p.copies) && p.copies>=1 && p.copies<=48 &&
      ['both','single','both_separate','multi'].includes(p.sides);
  }
  function savedPresets() { try { const p=JSON.parse(localStorage.getItem(PRESETS_KEY)||'[]');return Array.isArray(p)?p.filter(validPreset).slice(0,6):[]; } catch(e) {return [];} }
  function applyPreset(p) {
    const kind=state.activeCategory==='photos'?'photos':'id';
    if(occupied() && (p.kind!==kind||window.RealScanDocuments?.status().active)) {
      RealScanCounter.openNewService(p.kind,'choose');
      showToast('Prepara el servicio nuevo y vuelve a tocar este formato. El trabajo actual se conserva hasta confirmar.','info');return;
    }
    engaged=true;
    if(p.kind!==kind)switchIntent(p.kind);
    selectFormat(p.format);setPaperSize(p.paper);if(p.kind==='photos')setPhotoCopies(p.copies);else setPrintMode(p.sides);
    window.RealScanJourney?.update();update();showToast('Formato aplicado: '+p.name,'success');
  }
  function renderPresets() {
    const list=$('studioPresets');if(!list)return;list.replaceChildren();
    const defaults=[
      {name:'Identificación',kind:'id',format:'card',paper:'a4',copies:1,sides:'both'},
      {name:'6 fotos infantiles',kind:'photos',format:'photo_infantil',paper:'a4',copies:6,sides:'single'},
      {name:'4 fotos pasaporte',kind:'photos',format:'photo_passport',paper:'a4',copies:4,sides:'single'}
    ];
    for(const [i,p] of [...defaults,...savedPresets()].entries()) {
      const wrap=node('div','studio-preset-wrap'), b=action('studioPreset'+i,'',null,()=>applyPreset(p));
      b.classList.add('studio-preset');b.append(node('span','studio-preset-mark',p.kind==='photos'?'▦':'▤'));
      const copy=node('span');copy.append(node('strong','',p.name),node('small','',FORMAT_SPECS[p.format].shortName+' · '+PAPER_SPECS[p.paper].shortName));b.append(copy);wrap.append(b);
      if(i>=defaults.length){const remove=action('studioRemovePreset'+i,'Eliminar '+p.name,null,()=>{try{const saved=savedPresets();saved.splice(i-defaults.length,1);localStorage.setItem(PRESETS_KEY,JSON.stringify(saved));renderPresets();}catch(e){showToast('No se pudo actualizar el formato guardado.','warning');}});remove.className='studio-preset-remove';remove.textContent='×';remove.setAttribute('aria-label','Eliminar formato '+p.name);wrap.append(remove);}
      list.append(wrap);
    }
  }
  function savePreset() {
    if(window.RealScanDocuments?.status().active||!FORMAT_SPECS[state.format]){showToast('Guarda formatos de fotografía o identificación desde su espacio de trabajo.','info');return;}
    const p={name:getActiveSpec().shortName+' · '+(state.activeCategory==='photos'?state.photoCopies+' fotos':'identificación'),kind:state.activeCategory==='photos'?'photos':'id',format:state.format,paper:state.paperSize,copies:Math.max(1,Math.min(48,Number(state.photoCopies)||1)),sides:state.printMode};
    p.name=p.name.slice(0,48);if(!validPreset(p))return;
    try { const saved=savedPresets().filter(x=>!(x.format===p.format&&x.paper===p.paper&&x.copies===p.copies&&x.sides===p.sides));saved.unshift(p);localStorage.setItem(PRESETS_KEY,JSON.stringify(saved.slice(0,6)));renderPresets();showToast('Formato guardado en este equipo. No contiene fotos ni datos del cliente.','success'); }
    catch(e){showToast('El navegador no permite guardar preferencias en este momento.','warning');}
  }
  function selectSlot(side) {
    selected=side;comparison=false;previous=[];update();
    if(!state.images[side]?.processedDataUrl){RealScanWorkflow.moveTo(2,side);return;}
    const image=$('previewImg'+suffix[side]);image?.closest('.doc-slot')?.classList.add('studio-selected');
  }
  function compare() { comparison=!comparison;previous=[];update(); }
  function updateComparison(img, allowed) {
    const before=allowed&&comparison?(img?.rawOriginalSrc||img?.originalSrc||''):'';
    const after=allowed&&comparison?(img?.processedDataUrl||''):'';
    $('studioCompare').hidden=!before||!after;
    if(before!==originalSeen){if(before)$('studioBefore').src=before;else $('studioBefore').removeAttribute('src');originalSeen=before;}
    if(after!==processedSeen){if(after)$('studioAfter').src=after;else $('studioAfter').removeAttribute('src');processedSeen=after;}
    $('studioCompareButton').setAttribute('aria-pressed',String(comparison&&!!before));
  }
  function update() {
    if(!$('studioWelcome')||!window.state)return;
    const work=RealScanWorkflow.describe(),doc=window.RealScanDocuments?.status(),allowed=unlocked();
    const sides=work.wanted,active=!!doc?.active,busy=active?doc.busy:work.busy,ready=allowed&&(active?doc.ready:work.ready);
    const snapshot=approvalSnapshot();
    const current=[document.body.dataset.mobileStep,allowed,active,busy,ready,engaged,doc?.count,doc?.reviewed,state._jobRevision,snapshot[0],state.activeCategory,selected,comparison,...sides,...sides.flatMap(s=>[state.images[s]?.originalSrc,state.images[s]?.processedDataUrl,state.images[s]?.rotation,state.images[s]?._renderVersion])];
    if(current.length===previous.length&&current.every((x,i)=>x===previous[i]))return;previous=current;
    if(revision!==state._jobRevision){comparison=false;selected=sides[0]||'front';revision=state._jobRevision;}
    if(!sides.includes(selected))selected=sides[0]||'front';
    document.body.dataset.studioDocument=String(active);
    document.body.dataset.studioReady=String(ready);
    const has=allowed&&sides.some(s=>!!state.images[s]?.processedDataUrl);
    document.body.dataset.studioHasImages=String(has||active);
    document.body.dataset.studioEngaged=String(engaged||has||active);
    const favorites=$('studioFavorites');
    if(!document.body.classList.contains('rs-next')&&(engaged||has||active)&&favorites.parentElement!==$('colControlPanel'))$('operatorJourney').after(favorites);
    else if(!document.body.classList.contains('rs-next')&&!(engaged||has||active)&&favorites.parentElement===$('colControlPanel'))$('studioWelcome').after(favorites);
    $('studioWelcomeHint').textContent=active?'Importa, revisa y organiza las páginas de tu documento.':has?'Tu trabajo está en curso. Ajusta y revisa el resultado antes de imprimir.':'Elige el servicio y agrega tus imágenes. El resultado aparece en la hoja.';
    $('studioJobTitle').textContent=active?'Documento completo':getActiveSpec().shortName;
    $('studioJobMeta').textContent=active?doc.count+' páginas · '+doc.reviewed+' revisadas':PAPER_SPECS[state.paperSize].shortName+' · '+(state.activeCategory==='photos'?state.photoCopies+' fotografías':work.wanted.length+' cara(s)')+' · '+(state.outputScalePercent||100)+' %';
    $('studioReady').textContent=busy?'Preparando…':ready?'Listo para revisar':has?'Completa el trabajo':'Esperando imágenes';
    $('studioReady').dataset.ready=String(ready);
    const tray=$('studioImageTray');tray.replaceChildren();tray.hidden=active;
    for(const side of sides){
      const img=state.images[side], b=action('studioSlot'+suffix[side],photoLabel(side),null,()=>selectSlot(side));b.className='studio-slot';b.dataset.side=side;b.setAttribute('aria-pressed',String(selected===side));
      if(allowed&&img?.processedDataUrl){const thumb=node('img');thumb.src=img.processedDataUrl;thumb.alt='';b.prepend(thumb);b.append(node('small','','Lista'));}
      else{b.prepend(node('span','studio-slot-placeholder','+'));b.append(node('small','','Por agregar'));}
      tray.append(b);
    }
    const image=state.images[selected],loaded=allowed&&!!image?.processedDataUrl;
    if(!allowed||approval&&(approval.length!==snapshot.length||!approval.every((x,i)=>x===snapshot[i])))approval=null;
    $('studioApprovalNote').textContent=approval?'El cliente aprobó esta versión. Cualquier cambio requiere revisarla otra vez.':'La vista del cliente muestra las hojas preparadas, sin los controles de edición.';
    $('studioClient').setAttribute('aria-label',approval?'Vista del cliente: versión aprobada':'Abrir vista del cliente');
    $('studioEditorTools').hidden=active;$('studioSelectedLabel').textContent=photoLabel(selected);
    for(const id of ['studioRotate','studioCrop','studioCompareButton'])$(id).disabled=!loaded||busy;
    updateComparison(image,allowed);
    const list=$('studioChecks');list.replaceChildren();
    if(has&&!active){
      const issues=runPreflightChecks().issues;
      for(const issue of issues.slice(0,4))list.append(node('li',issue.type==='error'?'studio-issue':'studio-notice',issue.message));
      const spec=getActiveSpec(),scale=(Number(state.outputScalePercent)||100)/100;
      if(image?.naturalWidth&&image?.naturalHeight){const turned=(image.rotation||0)%180!==0;const w=turned?image.naturalHeight:image.naturalWidth,h=turned?image.naturalWidth:image.naturalHeight;const dpi=Math.min(w/(spec.widthMm*scale/25.4),h/(spec.heightMm*scale/25.4));if(dpi<150)list.append(node('li','studio-notice','Resolución estimada baja ('+Math.round(dpi)+' ppp). Revisa la nitidez o toma otra foto.'));}
    }
    $('studioChecks').hidden=!list.children.length;
    $('studioPrint').disabled=!ready||busy;$('studioPdf').disabled=!ready||busy;$('studioClient').disabled=!ready||busy;
    $('studioDigital').disabled=busy||!(active?doc.ready:has);
    $('studioSavePreset').disabled=active;
    $('studioEmpty').hidden=has||active;$('studioActionHint').textContent=busy?'Terminando el procesamiento de las imágenes.':ready?'Revisa el resultado y elige cómo entregar.':'Agrega las imágenes pendientes para continuar.';
    document.dispatchEvent(new Event('realscan:studio-updated'));
  }
  function illustrations() {
    const open='<svg viewBox="0 0 240 125" fill="none" aria-hidden="true">';
    return {
      id:open+'<rect x="37" y="26" width="165" height="88" rx="12" fill="currentColor" opacity=".12"/><rect x="27" y="13" width="166" height="94" rx="11" fill="var(--studio-surface)" stroke="currentColor" stroke-width="2"/><rect x="40" y="31" width="48" height="57" rx="7" fill="currentColor" opacity=".12"/><circle cx="64" cy="49" r="10" fill="currentColor" opacity=".5"/><path d="M47 78c0-22 34-22 34 0" fill="currentColor" opacity=".5"/><path d="M103 38h66M103 53h45M103 77h59M103 89h29" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity=".5"/></svg>',
      photos:open+'<rect x="47" y="12" width="146" height="103" rx="7" fill="var(--studio-surface)" stroke="currentColor" stroke-width="2"/>'+[0,1,2,3,4,5].map(i=>'<g transform="translate('+(59+(i%3)*40)+' '+(23+Math.floor(i/3)*43)+')"><rect width="32" height="36" rx="3" fill="currentColor" opacity=".1"/><circle cx="16" cy="12" r="7" fill="currentColor" opacity=".45"/><path d="M4 32c0-18 24-18 24 0" fill="currentColor" opacity=".45"/></g>').join('')+'</svg>',
      document:open+'<rect x="68" y="19" width="103" height="100" rx="6" fill="currentColor" opacity=".14"/><rect x="58" y="8" width="103" height="103" rx="6" fill="var(--studio-surface)" stroke="currentColor" stroke-width="2"/><rect x="73" y="23" width="35" height="18" rx="3" fill="currentColor" opacity=".15"/><path d="M73 54h70M73 66h70M73 78h51M73 90h61" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".45"/></svg>'
    };
  }
  function init() {
    if(!$('colControlPanel')||!$('operatorJourney'))return;
    document.body.classList.add('rs-studio');
    const left=$('colControlPanel'),stage=$('colStageWorkspace'),grid=left.parentElement;
    grid.classList.add('studio-grid');stage.classList.add('studio-stage');
    const welcome=node('section','studio-welcome');welcome.id='studioWelcome';
    welcome.innerHTML='<div class="studio-welcome-heading"><div><p class="studio-eyebrow">TU ESTUDIO DE IMPRESIÓN</p><h1>Un buen trabajo empieza aquí.</h1><p id="studioWelcomeHint"></p></div><span class="studio-version">ESTUDIO 3.29.1</span></div><div class="studio-services"></div>';
    $('counterService').before(welcome);
    const art=illustrations();const tasks=document.querySelector('.operator-tasks');
    welcome.querySelector('.studio-services').append(tasks);
    for(const b of tasks.querySelectorAll('[data-task]')){const picture=node('span','studio-service-art');picture.innerHTML=art[b.dataset.task];b.prepend(picture);b.append(node('span','studio-card-arrow','↗'));}
    const favorites=node('section','studio-favorites');favorites.id='studioFavorites';favorites.innerHTML='<div class="studio-section-heading"><div><h2>Formatos de todos los días</h2><p>Un toque para preparar el tamaño, el papel y las copias.</p></div></div><div id="studioPresets" class="studio-presets"></div>';
    favorites.firstElementChild.append(action('studioSavePreset','Guardar formato','star',savePreset));welcome.after(favorites);renderPresets();
    const originalChildren=Array.from(left.children),capture=$('dropzoneFront').closest('section');
    const advanced=node('details','studio-advanced');advanced.id='studioAdvanced';advanced.open=true;advanced.append(node('summary','','Más ajustes de formato'));
    for(const child of originalChildren)if(child!==capture)advanced.append(child);
    left.append(advanced);left.prepend(capture);left.prepend($('serviceFormats'));left.prepend($('operatorJourney'));
    const paper=stage.querySelector('[data-paper]')?.parentElement.parentElement;if(paper)advanced.append(paper);
    const heading=node('div','studio-work-heading');heading.innerHTML='<div><p class="studio-eyebrow">VISTA PREVIA EN VIVO</p><h2 id="studioJobTitle"></h2><p id="studioJobMeta"></p></div><span id="studioReady" role="status"></span>';stage.prepend(heading);
    const tray=node('div','studio-image-tray');tray.id='studioImageTray';tray.setAttribute('aria-label','Seleccionar imagen para editar');heading.after(tray);
    const toolbar=node('div','studio-editor-tools');toolbar.id='studioEditorTools';toolbar.append(node('strong','','Editar: '));const label=node('span');label.id='studioSelectedLabel';toolbar.append(label);
    toolbar.append(action('studioRotate','Girar','rotate',()=>document.querySelector('[data-rotate="'+selected+'"]')?.click()),action('studioCrop','Recortar','crop',()=>document.querySelector('[data-crop="'+selected+'"]')?.click()),action('studioCompareButton','Antes / después','compare',compare));tray.after(toolbar);
    const comparisonPanel=node('div','studio-compare');comparisonPanel.id='studioCompare';comparisonPanel.hidden=true;comparisonPanel.innerHTML='<figure><img id="studioBefore" alt="Imagen original"><figcaption>Original</figcaption></figure><figure><img id="studioAfter" alt="Imagen con los ajustes actuales"><figcaption>Resultado</figcaption></figure>';toolbar.after(comparisonPanel);
    const issues=node('ul','studio-checks');issues.id='studioChecks';comparisonPanel.after(issues);
    const empty=node('div','studio-empty');empty.id='studioEmpty';empty.innerHTML=icon('plus')+'<strong>Aquí verás tu hoja</strong><span>Agrega una imagen con Cámara, Archivo o Celular.</span>';stage.querySelector('.stage-canvas-area').before(empty);
    const actions=node('section','studio-actions');actions.setAttribute('aria-label','Revisar y entregar el trabajo');actions.innerHTML='<p id="studioActionHint" role="status"></p><p id="studioApprovalNote"></p><div></div>';const buttons=actions.lastElementChild;
    buttons.append(action('studioClient','Vista del cliente','eye',async()=>{await handlePrintDirect();if(RealScanPrint.isPrepared()&&!$('confirmPrintReview').disabled&&!$('outputReviewModal').classList.contains('hidden'))showClientApproval();}),action('studioPdf','Guardar PDF','file',()=>{if(window.RealScanDocuments?.status().active)$('docPdf').click();else handleExportPDF();}),action('studioDigital','Entregar','arrow',()=>{if(window.RealScanDocuments?.status().active)$('docQr').click();else $('btnOpenDeliveryModal').click();}),action('studioPrint','Revisar e imprimir','print',()=>{if(window.RealScanDocuments?.status().active)window.RealScanDocumentPrint?RealScanDocumentPrint.review():$('docPrint')?.click();else handlePrintDirect();},true));stage.append(actions);
    // Image selection is shared by the thumbnails and the actual sheet.
    for(const [side,tail]of Object.entries(suffix))$('previewImg'+tail)?.addEventListener('click',()=>{if(unlocked())selectSlot(side);});
    document.addEventListener('change',()=>requestAnimationFrame(update));document.addEventListener('click',e=>{if(e.target.closest('[data-task]'))engaged=true;requestAnimationFrame(update);});
    window.addEventListener('storage',e=>{if(e.key===PRESETS_KEY)renderPresets();});
    setInterval(update,650);update();window.RealScanStudio={getSelected:()=>selected,update,applyPreset,savedPresets,selectSlot,markApproved};
  }
  if(document.readyState==='complete')init();else document.addEventListener('DOMContentLoaded',init);
})();
