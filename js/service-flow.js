/* One compact service panel; all mutations use the shared job engine. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const sideNames={front:'Frente',back:'Reverso',page3:'Página 3',page4:'Página 4'};
 let selected='front';
 function unlocked(){return $('loginOverlay')?.classList.contains('hidden')&&(!$('setupOverlay')||$('setupOverlay').classList.contains('hidden'));}
 function button(text,fn,cls='flow-choice'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=()=>{if(unlocked()){fn();update();}};return b;}
 function change(fn){if(!unlocked()||RealScanWorkflow.describe().busy)return;fn();updateUI();RealScanJourney.update();RealScanStudio.update();if(typeof saveActiveDraft==='function')saveActiveDraft();}
 function update(){
  if(!$('serviceFlow'))return;
  const doc=RealScanDocuments.status(),work=RealScanWorkflow.describe(),photos=state.activeCategory==='photos',allowed=unlocked();
  document.body.dataset.studioDocument=String(doc.active);
  document.body.dataset.flowKind=doc.active?'document':photos?'photos':'id';
  $('flowPhotoChoices').hidden=!photos||doc.active;$('flowQuantity').hidden=!photos||doc.active;$('flowIdChoices').hidden=photos||doc.active;
  $('flowHeading').textContent=doc.active?'Tu documento, página por página':photos?'Prepara tus fotografías':'Prepara tu identificación';
  for(const b of document.querySelectorAll('[data-flow-format]'))b.setAttribute('aria-pressed',String(b.dataset.flowFormat===state.format));
  for(const b of document.querySelectorAll('[data-flow-sides]'))b.setAttribute('aria-pressed',String(b.dataset.flowSides===state.printMode));
  for(const b of document.querySelectorAll('[data-flow-count]'))b.setAttribute('aria-pressed',String(Number(b.dataset.flowCount)===Number(state.photoCopies)));
  $('flowCount').value=state.photoCopies;$('flowSets').value=doc.active?(doc.options.sets||1):(state.outputSets||1);
  $('flowSetLabel').textContent=doc.active?'Juegos para imprimir':'Juegos completos';
  const sets=doc.active?(doc.options.sets||1):(state.outputSets||1),pages=doc.active?doc.count:work.layout.pages.length;
  const summary=doc.active?doc.count+' páginas · '+sets+' juego(s) de impresión · '+PAPER_SPECS[doc.options.paper].shortName+(doc.options.color==='gray'?' · Blanco y negro':' · Color'): (photos?state.photoCopies+' fotos por juego · ':getActiveSpec().shortName+' · ')+sets+' juego(s) · '+pages+' hoja(s) '+work.layout.paper.shortName;
  $('flowSummary').textContent=summary;$('flowSummary').setAttribute('title',summary);
  const ready=doc.active?doc.ready:work.ready&&!work.layout.errors.length;
  $('flowPrimary').disabled=!allowed||!ready||(doc.active?doc.busy:work.busy);
  $('flowPrimary').textContent=doc.active?'Preparar impresión':document.body.dataset.outputMode==='digital'?'Revisar entrega digital':'Revisar e imprimir';
  $('flowNextHint').textContent=doc.active?(doc.count?doc.reviewed+' de '+doc.count+' páginas revisadas. Toca cada página para comprobarla.':'Agrega archivos, captura páginas o recibe desde el celular.'):work.busy?'Preparando imágenes…':work.missing.length?'Agrega '+(photos?'tu fotografía':sideNames[work.missing[0]].toLowerCase())+' para continuar.':'Comprueba el encuadre y las medidas antes de entregar.';
  const busy=doc.active?doc.busy:work.busy;
  for(const el of $('serviceFlow').querySelectorAll('button,input,select'))el.disabled=!allowed||busy;
  $('flowAddMissing').hidden=doc.active||!work.missing.length;$('flowAddMissing').textContent='Agregar '+(photos?'foto':sideNames[work.missing[0]]||'imagen');
  if($('flowUndo')){const side=RealScanStudio.getSelected();$('flowUndo').disabled=!allowed||busy||!window.RealScanEditor?.canUndo(side);$('flowRedo').disabled=!allowed||busy||!window.RealScanEditor?.canRedo(side);$('flowReplace').disabled=!allowed||busy;}
  $('flowDocumentOptions').hidden=!doc.active;
  if(doc.active){$('flowDocColor').value=doc.options.color||'color';$('flowDocDuplex').value=doc.options.duplex||'single';}
  $('flowDuplexHint').hidden=!doc.active||doc.options.duplex!=='manual';
 }
 function init(){
  if(!$('studioWelcome'))return;
  document.body.classList.add('rs-flow');$('colControlPanel').parentElement.id='flowWorkspace';$('studioAdvanced').open=false;
  const panel=document.createElement('section');panel.id='serviceFlow';panel.className='service-flow';
  panel.innerHTML='<p class="flow-eyebrow">PREPARA TU TRABAJO</p><h2 id="flowHeading"></h2><div id="flowReceive"></div><p id="flowNextHint" role="status"></p><button type="button" id="flowAddMissing" class="flow-soft"></button><div id="flowPhotoChoices" class="flow-block"><h3>Tamaño de cada foto</h3><div id="flowSizes" class="flow-choice-grid"></div></div><div id="flowIdChoices" class="flow-block"><h3>Distribución de las caras</h3><div id="flowSides" class="flow-choice-grid"></div></div><div id="flowQuantity" class="flow-block"><h3>Fotos por juego</h3><div id="flowCounts" class="flow-counts"></div><label class="flow-number">Otra cantidad<input id="flowCount" type="number" min="1" max="48" inputmode="numeric"></label></div><div id="flowPaper"></div><label class="flow-number"><span id="flowSetLabel">Juegos completos</span><input id="flowSets" type="number" min="1" max="10" value="1" inputmode="numeric"></label><div id="flowDocumentOptions" class="flow-block"><label>Acabado<select id="flowDocColor"><option value="color">Color</option><option value="gray">Blanco y negro</option></select></label><label>Impresión<select id="flowDocDuplex"><option value="single">Una cara por hoja</option><option value="manual">Doble cara manual · guía</option></select></label><p id="flowDuplexHint">Prepara el PDF y usa la guía de doble cara de Más opciones. Prueba primero con dos páginas: el giro depende de tu impresora. El PDF conserva las páginas en orden.</p></div>';
  $('colControlPanel').prepend(panel);
  $('flowReceive').append($('operatorReceiveActions'));
  $('flowPaper').append($('quickPrintSettings')); // Preserve original control IDs and change handlers.
  for(const [format,name]of [['photo_infantil','Infantil'],['photo_passport','Pasaporte'],['photo_10x15','10 × 15 cm']]){
   if(!FORMAT_SPECS[format])continue;const spec=FORMAT_SPECS[format],b=button('',()=>change(()=>selectFormat(format)));b.dataset.flowFormat=format;
   const art=document.createElement('span');art.className='flow-size-art';art.style.aspectRatio=spec.widthMm+'/'+spec.heightMm;art.textContent='●';
   const label=document.createElement('strong');label.textContent=name;const small=document.createElement('small');small.textContent=spec.widthMm+' × '+spec.heightMm+' mm';b.append(art,label,small);$('flowSizes').append(b);
  }
  $('flowSizes').append(button('Otros tamaños',()=>{$('studioAdvanced').open=true;$('quickPhotoFormatRow').classList.add('flow-show');$('quickPhotoFormat').focus();}));
  for(const [mode,label]of [['both','Frente + reverso juntos'],['both_separate','Una cara por hoja'],['single','Solo frente']]){const b=button(label,()=>change(()=>setPrintMode(mode)));b.dataset.flowSides=mode;$('flowSides').append(b);}
  for(const count of [2,4,6,8]){const b=button(String(count),()=>change(()=>setPhotoCopies(count)));b.dataset.flowCount=count;$('flowCounts').append(b);}
  $('flowCount').onchange=()=>change(()=>setPhotoCopies(Math.max(1,Math.min(48,Math.round(Number($('flowCount').value)||1)))));
  $('flowSets').onchange=()=>{const n=Math.max(1,Math.min(10,Math.round(Number($('flowSets').value)||1)));if(RealScanDocuments.status().active)RealScanDocuments.setOptions({sets:n});else change(()=>{state.outputSets=n;});update();};
  for(const [id,key]of [['flowDocColor','color'],['flowDocDuplex','duplex']])$(id).onchange=()=>{RealScanDocuments.setOptions({[key]:$(id).value});update();};
  $('flowAddMissing').onclick=()=>{if(unlocked())RealScanWorkflow.moveTo(2,RealScanWorkflow.describe().missing[0]);};
  const dock=document.createElement('section');dock.id='flowDock';dock.className='flow-dock';dock.setAttribute('aria-label','Resumen y siguiente acción');dock.innerHTML='<div><strong id="flowSummary"></strong><span>Vista previa y medidas antes de imprimir</span></div><button type="button" id="flowPrimary" class="counter-primary">Revisar e imprimir</button>';document.body.append(dock);
  $('flowPrimary').onclick=()=>{if(!unlocked())return;if(RealScanDocuments.status().active)$('docPrint').click();else if(document.body.dataset.outputMode==='digital')$('btnOpenDeliveryModal').click();else handlePrintDirect();};
  const tools=$('studioEditorTools');
  for(const [id,label,fn]of [['flowUndo','↶ Deshacer',()=>handleSlotUndo(RealScanStudio.getSelected())],['flowRedo','↷ Rehacer',()=>handleSlotRedo(RealScanStudio.getSelected())],['flowReplace','Cambiar imagen',()=>{const side=RealScanStudio.getSelected();$({front:'fileInputFront',back:'fileInputBack',page3:'fileInputPage3',page4:'fileInputPage4'}[side]).click();}]]){const b=button(label,()=>{fn();if(typeof saveActiveDraft==='function')saveActiveDraft();},'studio-button');b.id=id;tools.append(b);}
  const repeat=button('Repetir servicio con imágenes nuevas',()=>RealScanCounter.openNewService('repeat','file'),'flow-repeat');repeat.id='flowRepeat';dock.firstElementChild.append(repeat);
  if($('bannerActiveDraftRecovery'))$('bannerActiveDraftRecovery').setAttribute('aria-label','Recuperar trabajo interrumpido');
  document.addEventListener('realscan:studio-updated',update);document.addEventListener('realscan:document-updated',update);
  document.addEventListener('change',()=>requestAnimationFrame(update));document.addEventListener('click',()=>requestAnimationFrame(update));
  window.RealScanServiceFlow={update,getSelected:()=>RealScanStudio.getSelected(),select(side){selected=side;RealScanStudio.selectSlot(side);}};update();
 }
 document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1));
})();
