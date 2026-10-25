/* One compact service panel; all mutations use the shared job engine. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const sideNames={front:'Frente',back:'Reverso',page3:'Página 3',page4:'Página 4'};
 let selected='front',warmTimer=null,lastWarm=[],adviceKey='',placing=false;
 function placePanel(active){const panel=$('serviceFlow'),parent=active?$('documentWorkspace'):$('colControlPanel');if(placing||panel.parentElement===parent)return;placing=true;queueMicrotask(()=>{try{const target=RealScanDocuments.status().active?$('documentWorkspace'):$('colControlPanel');if(panel.parentElement!==target)target.insertBefore(panel,target.firstChild);}finally{placing=false;}});}
 function unlocked(){return $('loginOverlay')?.classList.contains('hidden')&&(!$('setupOverlay')||$('setupOverlay').classList.contains('hidden'));}
 function button(text,fn,cls='flow-choice'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=()=>{if(unlocked()){fn();update();}};return b;}
 function change(fn){if(!unlocked()||RealScanWorkflow.describe().busy)return;fn();updateUI();RealScanJourney.update();RealScanStudio.update();if(typeof saveActiveDraft==='function')saveActiveDraft();}
 function update(){
  if(!$('serviceFlow'))return;
  const doc=RealScanDocuments.status(),work=RealScanWorkflow.describe(),photos=state.activeCategory==='photos',allowed=unlocked();
  placePanel(doc.active);document.body.dataset.studioDocument=String(doc.active);
  document.body.dataset.flowKind=doc.active?'document':photos?'photos':'id';
  $('flowPhotoChoices').hidden=!photos||doc.active;$('flowQuantity').hidden=!photos||doc.active;$('flowIdChoices').hidden=photos||doc.active;
  $('flowHeading').textContent=doc.active?'Tu documento, página por página':photos?'Prepara tus fotografías':'Prepara tu identificación';
  for(const b of document.querySelectorAll('[data-flow-format]'))b.setAttribute('aria-pressed',String(b.dataset.flowFormat===state.format));
  for(const b of document.querySelectorAll('[data-flow-sides]'))b.setAttribute('aria-pressed',String(b.dataset.flowSides===state.printMode));
  for(const b of document.querySelectorAll('[data-flow-count]'))b.setAttribute('aria-pressed',String(Number(b.dataset.flowCount)===Number(state.photoCopies)));
  $('flowCount').value=state.photoCopies;$('flowSets').value=doc.active?(doc.options.sets||1):(state.outputSets||1);
  $('flowSetLabel').textContent=doc.active?'Juegos para imprimir':'Juegos completos';
  const sets=doc.active?(doc.options.sets||1):(state.outputSets||1),pages=doc.active?doc.count:work.layout.pages.length;
  let summary=doc.active?doc.count+' páginas · '+sets+' juego(s) de impresión · '+PAPER_SPECS[doc.options.paper].shortName+(doc.options.color==='gray'?' · Blanco y negro':' · Color'): (photos?(state.mixTwoPhotos?(state.photoCopiesPersonA||0)+' fotos A + '+(state.photoCopiesPersonB||0)+' fotos B':state.photoCopies+' fotos')+' por juego · ':getActiveSpec().shortName+' · ')+sets+' juego(s) · '+pages+' hoja(s) '+work.layout.paper.shortName;
  if(!doc.active&&work.scale!==100)summary+=' · Escala '+work.scale+' %';
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
  refreshAdvice(doc,work,allowed);prepareInBackground(doc,work,allowed);
  if(doc.active){$('flowDocColor').value=doc.options.color||'color';$('flowDocDuplex').value=doc.options.duplex||'single';}
  $('flowDuplexHint').hidden=!doc.active||doc.options.duplex!=='manual';if($('flowDuplexActions')){$('flowDuplexActions').hidden=$('flowDuplexHint').hidden;for(const b of $('flowDuplexActions').querySelectorAll('button'))b.disabled=!allowed||!doc.ready||doc.busy;}
 }
 function prepareInBackground(doc,work,allowed){
  if(!allowed){lastWarm=[];clearTimeout(warmTimer);RealScanPrint.clear();return;}
  const signature=[allowed,doc.active,work.busy,state._jobRevision,JSON.stringify([work.layout,window.RealScanPrinterProfiles?.getActive()]),...work.wanted.map(side=>state.images[side]?.processedDataUrl)];
  if(signature.length===lastWarm.length&&signature.every((x,i)=>x===lastWarm[i]))return;lastWarm=signature;clearTimeout(warmTimer);
  if(!allowed||doc.active||!work.ready||work.layout.errors.length)return;
  warmTimer=setTimeout(async()=>{if(!unlocked()||RealScanDocuments.status().active||!RealScanWorkflow.describe().ready)return;try{await RealScanPrint.prepare();}catch{/* The review provides an actionable retry; background preparation never blocks editing. */}},350);
 }
 function refreshAdvice(doc,work,allowed){
  const holder=$('flowAdvice');if(!holder)return;const side=RealScanStudio.getSelected(),img=state.images[side],key=JSON.stringify([allowed,doc.active,state.activeCategory,state.format,state.paperSize,state.photoCopies,work.layout.errors,work.missing,side,img?.naturalWidth,img?.naturalHeight,img?.rotation]);if(key===adviceKey)return;adviceKey=key;holder.replaceChildren();
  if(!allowed||doc.active)return;
  function suggestion(text,label,fn){const item=document.createElement('div'),p=document.createElement('p');p.textContent=text;item.append(p,button(label,fn,'flow-soft'));holder.append(item);}
  if(work.layout.errors.length&&state.activeCategory==='photos'){
   let max=0;for(let n=1;n<=48;n++){const candidate={...state,photoCopies:n,mixTwoPhotos:false,outputSets:1};if(!RealScanLayout.computeDocumentLayout(candidate).errors.length)max=n;}
   if(!state.mixTwoPhotos&&max&&state.photoCopies>max)suggestion('La cantidad supera lo que admite este papel.', 'Usar '+max+' fotos por juego',()=>change(()=>setPhotoCopies(max)));
   for(const paper of ['a4','letter']){if(paper===state.paperSize)continue;const plan=RealScanLayout.computeDocumentLayout({...state,paperSize:paper});if(!plan.errors.length){suggestion('Puedes conservar tamaño y cantidad usando otro papel.', 'Cambiar a '+PAPER_SPECS[paper].shortName,()=>change(()=>setPaperSize(paper)));break;}}
  }
  if(img?.naturalWidth&&img?.naturalHeight){const spec=getActiveSpec(),turned=(img.rotation||0)%180!==0,w=turned?img.naturalHeight:img.naturalWidth,h=turned?img.naturalWidth:img.naturalHeight,scale=(state.outputScalePercent||100)/100,dpi=Math.min(w/(spec.widthMm*scale/25.4),h/(spec.heightMm*scale/25.4));
   if(dpi<150)suggestion('Esta imagen puede perder nitidez al imprimirse ('+Math.round(dpi)+' ppp estimados).','Reemplazar imagen',()=>$('flowReplace').click());
   if((w>h)!==(spec.widthMm>spec.heightMm)&&Math.abs(w/h-spec.widthMm/spec.heightMm)>.4)suggestion('Comprueba si la orientación y el encuadre son correctos.','Revisar encuadre',()=>$('studioCrop').click());
  }
  holder.hidden=!holder.children.length;
 }
 function init(){
  if(!$('studioWelcome'))return;
  document.body.classList.add('rs-flow');$('colControlPanel').parentElement.id='flowWorkspace';$('studioAdvanced').open=false;
  const panel=document.createElement('section');panel.id='serviceFlow';panel.className='service-flow';
  panel.innerHTML='<p class="flow-eyebrow">PREPARA TU TRABAJO</p><h2 id="flowHeading"></h2><div id="flowReceive"></div><p id="flowNextHint" role="status"></p><button type="button" id="flowAddMissing" class="flow-soft"></button><div id="flowPhotoChoices" class="flow-block"><h3>Tamaño de cada foto</h3><div id="flowSizes" class="flow-choice-grid"></div></div><div id="flowIdChoices" class="flow-block"><h3>Distribución de las caras</h3><div id="flowSides" class="flow-choice-grid"></div></div><div id="flowQuantity" class="flow-block"><h3>Fotos por juego</h3><div id="flowCounts" class="flow-counts"></div><div class="flow-number"><label for="flowCount">Otra cantidad</label><input id="flowCount" type="number" min="1" max="48" inputmode="numeric"></div></div><div id="flowPaper"></div><div class="flow-number"><label id="flowSetLabel" for="flowSets">Juegos completos</label><input id="flowSets" type="number" min="1" max="10" value="1" inputmode="numeric"></div><div id="flowDocumentOptions" class="flow-block"><label>Acabado<select id="flowDocColor"><option value="color">Color</option><option value="gray">Blanco y negro</option></select></label><label>Impresión<select id="flowDocDuplex"><option value="single">Una cara por hoja</option><option value="manual">Doble cara manual · guía</option></select></label><p id="flowDuplexHint">Prueba primero con dos páginas: el giro y el orden de la bandeja dependen de tu impresora. Imprime impares, recoloca el papel e imprime pares. Si un juego tiene páginas impares, se añade un reverso vacío para separar los juegos.</p></div>';
  $('colControlPanel').prepend(panel);
  $('flowReceive').append($('operatorReceiveActions'));if($('operatorNotices'))$('flowNextHint').after($('operatorNotices'));
  $('flowDocumentOptions').prepend($('docPaper').parentElement);
  $('flowPaper').append($('quickPrintSettings')); // Preserve original control IDs and change handlers.
  for(const [format,name]of [['photo_infantil','Infantil'],['photo_passport','Pasaporte'],['photo_10x15','10 × 15 cm']]){
   if(!FORMAT_SPECS[format])continue;const spec=FORMAT_SPECS[format],b=button('',()=>change(()=>selectFormat(format)));b.dataset.flowFormat=format;
   const art=document.createElement('span');art.className='flow-size-art';art.style.aspectRatio=spec.widthMm+'/'+spec.heightMm;art.innerHTML='<svg viewBox="0 0 40 50" aria-hidden="true"><circle cx="20" cy="17" r="8" fill="currentColor" opacity=".55"/><path d="M5 46c0-24 30-24 30 0" fill="currentColor" opacity=".55"/></svg>';
   const label=document.createElement('strong');label.textContent=name;const small=document.createElement('small');small.textContent=spec.widthMm+' × '+spec.heightMm+' mm';b.append(art,label,small);$('flowSizes').append(b);
  }
  $('flowSizes').append(button('Otros tamaños',()=>{$('studioAdvanced').open=true;$('quickPhotoFormatRow').classList.add('flow-show');$('quickPhotoFormat').focus();}));
  for(const [mode,label]of [['both','Frente + reverso juntos'],['both_separate','Una cara por hoja'],['single','Solo frente']]){const b=button(label,()=>change(()=>setPrintMode(mode)));b.dataset.flowSides=mode;$('flowSides').append(b);}
  for(const count of [2,4,6,8]){const b=button(String(count),()=>change(()=>setPhotoCopies(count)));b.dataset.flowCount=count;$('flowCounts').append(b);}
  for(const id of ['flowCount','flowSets']){const input=$(id),wrap=document.createElement('div');wrap.className='flow-stepper';input.before(wrap);for(const [delta,label]of [[-1,'Reducir'],[1,'Aumentar']]){const b=button(delta<0?'−':'+',()=>{input.value=Math.max(Number(input.min),Math.min(Number(input.max),Number(input.value)+delta));input.dispatchEvent(new Event('change',{bubbles:true}));});b.dataset.flowStep=id;b.setAttribute('aria-label',label+(id==='flowCount'?' fotos por juego':' juegos completos'));if(delta<0)wrap.append(b,input);else wrap.append(b);}}
  $('flowCount').onchange=()=>change(()=>setPhotoCopies(Math.max(1,Math.min(48,Math.round(Number($('flowCount').value)||1)))));
  $('flowSets').onchange=()=>{const n=Math.max(1,Math.min(10,Math.round(Number($('flowSets').value)||1)));if(RealScanDocuments.status().active)RealScanDocuments.setOptions({sets:n});else change(()=>{state.outputSets=n;});update();};
  const duplexActions=document.createElement('div');duplexActions.id='flowDuplexActions';duplexActions.className='document-actions';duplexActions.hidden=true;duplexActions.append(button('1. Descargar impares',()=>RealScanDocuments.printFaces('odd')),button('2. Descargar pares',()=>RealScanDocuments.printFaces('even')),button('Ver prueba de giro',()=>RealScanDuplex.open()));$('flowDuplexHint').after(duplexActions);
  for(const [id,key]of [['flowDocColor','color'],['flowDocDuplex','duplex']])$(id).onchange=()=>{RealScanDocuments.setOptions({[key]:$(id).value});update();};
  $('flowAddMissing').onclick=()=>{if(unlocked())RealScanWorkflow.moveTo(2,RealScanWorkflow.describe().missing[0]);};
  const dock=document.createElement('section');dock.id='flowDock';dock.className='flow-dock';dock.setAttribute('aria-label','Resumen y siguiente acción');dock.innerHTML='<div><strong id="flowSummary"></strong><span>Vista previa y medidas antes de imprimir</span></div><button type="button" id="flowPrimary" class="counter-primary">Revisar e imprimir</button>';document.body.append(dock);
  $('flowPrimary').onclick=()=>{if(!unlocked())return;if(RealScanDocuments.status().active)$('docPrint').click();else if(document.body.dataset.outputMode==='digital')$('btnOpenDeliveryModal').click();else handlePrintDirect();};
  const advice=document.createElement('aside');advice.id='flowAdvice';advice.className='flow-advice';advice.hidden=true;$('studioChecks').after(advice);
  const tools=$('studioEditorTools');
  for(const [id,label,fn]of [['flowUndo','↶ Deshacer',()=>handleSlotUndo(RealScanStudio.getSelected())],['flowRedo','↷ Rehacer',()=>handleSlotRedo(RealScanStudio.getSelected())],['flowReplace','Cambiar imagen',()=>{const side=RealScanStudio.getSelected();$({front:'fileInputFront',back:'fileInputBack',page3:'fileInputPage3',page4:'fileInputPage4'}[side]).click();}]]){const b=button(label,()=>{fn();if(typeof saveActiveDraft==='function')saveActiveDraft();},'studio-button');b.id=id;tools.append(b);}
  const repeat=button('Repetir servicio con imágenes nuevas',()=>RealScanCounter.openNewService('repeat','file'),'flow-repeat');repeat.id='flowRepeat';dock.firstElementChild.append(repeat);
  if($('bannerActiveDraftRecovery'))$('bannerActiveDraftRecovery').setAttribute('aria-label','Recuperar trabajo interrumpido');
  document.addEventListener('realscan:print-dialog-closed',()=>{
   if(!unlocked())return;let modal=$('flowPrintResult');if(!modal){modal=document.createElement('div');modal.id='flowPrintResult';modal.className='hidden counter-overlay';modal.setAttribute('role','dialog');modal.setAttribute('aria-labelledby','flowPrintResultTitle');modal.innerHTML='<div class="counter-dialog"><h2 id="flowPrintResultTitle">¿La impresión salió bien?</h2><p>El diálogo se cerró. Comprueba el papel: el navegador no confirma si se imprimió o se canceló.</p><div class="document-actions" id="flowPrintResultActions"></div></div>';document.body.append(modal);for(const [label,fn]of [['Terminar servicio',()=>RealScanCounter.openNewService('id','choose')],['Reimprimir',()=>handlePrintDirect()],['Corregir',()=>RealScanWorkflow.moveTo(2,RealScanStudio.getSelected())]])$('flowPrintResultActions').append(button(label,()=>{closeModal('flowPrintResult');fn();},'counter-secondary'));}openModal('flowPrintResult');
  });
  document.addEventListener('realscan:studio-updated',update);document.addEventListener('realscan:document-updated',update);
  document.addEventListener('change',()=>requestAnimationFrame(update));document.addEventListener('click',()=>requestAnimationFrame(update));
  window.RealScanServiceFlow={update,getSelected:()=>RealScanStudio.getSelected(),select(side){selected=side;RealScanStudio.selectSlot(side);}};update();
 }
 document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1));
})();
