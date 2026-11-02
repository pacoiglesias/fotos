/* Counter presentation and review tools share the existing job and millimetre engines. */
(function(root){'use strict';
 const $=id=>document.getElementById(id),types={id:'Identificaciones',photos:'Fotografías',document:'Documentos'};
 const unlocked=()=>$('loginOverlay')?.classList.contains('hidden')&&(!$('setupOverlay')||$('setupOverlay').classList.contains('hidden'));
 const available=()=>unlocked()&&!root.RealScanWorkflow?.describe().busy&&!root.RealScanDocuments?.status().busy&&!root.RealScanWorkspacePolish?.isChanging();
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{if(available())fn();};return b;};
 let detailSide='front',original=false,activeJob=null,totals={},metricsDialog=null;
 function mountDetail(entry){
  if(!unlocked())return;const column=document.querySelector('.review-preview-column');if(!column)return;
  let panel=$('reviewDocumentDetail');if(!panel){panel=document.createElement('section');panel.id='reviewDocumentDetail';panel.hidden=true;panel.setAttribute('aria-label','Detalle del documento');panel.innerHTML='<div class="review-detail-tools"><div id="reviewDetailSides" role="group" aria-label="Cara ampliada"></div><button type="button" id="reviewDetailOriginal" aria-pressed="false">Ver original</button></div><figure><img id="reviewDetailImage" alt=""><figcaption id="reviewDetailCaption"></figcaption></figure>';$('printSheetPreview').before(panel);$('reviewDetailOriginal').onclick=()=>{if(!available())return;original=!original;drawDetail(entry);};}
  const sides=[...new Set(entry.layout.pages.flatMap(p=>p.placements.map(i=>i.slot)))].filter(side=>state.images[side]?.processedDataUrl);
  if(!sides.includes(detailSide))detailSide=sides[0]||'front';
  $('reviewDetailSides').replaceChildren();for(const side of sides){const b=button(({front:'Frente / foto',back:'Reverso',page3:'Página 3',page4:'Página 4'})[side]||side,()=>{detailSide=side;drawDetail(entry);});b.dataset.detailSide=side;$('reviewDetailSides').append(b);}
  $('reviewDetailOriginal').onclick=()=>{if(!available())return;original=!original;drawDetail(entry);};
  for(const b of document.querySelectorAll('[data-review-zoom]'))b.onclick=()=>{if(!available())return;const detail=b.dataset.reviewZoom==='detail';panel.hidden=!detail;$('printSheetPreview').dataset.zoom=detail?'reference':'fit';for(const other of document.querySelectorAll('[data-review-zoom]'))other.setAttribute('aria-pressed',String(other===b));drawDetail(entry);};
  panel.hidden=document.querySelector('[data-review-zoom=detail]')?.getAttribute('aria-pressed')!=='true';
  if(!panel.hidden)$('printSheetPreview').dataset.zoom='reference';drawDetail(entry);
 }
 function drawDetail(entry){
  if(!unlocked())return;const image=$('reviewDetailImage');if(!image)return;const slot=state.images[detailSide],source=original?slot?.originalSrc:slot?.processedDataUrl;
  if(source){if(image.getAttribute('src')!==source)image.src=source;}else image.removeAttribute('src');
  image.alt=(detailSide==='back'?'Reverso':'Imagen')+' · '+(original?'original':'resultado preparado');
  $('reviewDetailCaption').textContent=(original?'Original conservado':'Resultado preparado')+' · vista ampliada; las medidas del archivo se conservan. Las firmas y sellos se revisan en la hoja de referencia.';
  $('reviewDetailOriginal').textContent=original?'Ver resultado':'Ver original';$('reviewDetailOriginal').setAttribute('aria-pressed',String(original));
  for(const b of $('reviewDetailSides').children)b.setAttribute('aria-pressed',String(b.dataset.detailSide===detailSide));
 }
 function mountSheetMap(target,settings,change,isDocument){
  const paper=isDocument?root.RealScanDocuments.annotationPages()[0]?.geometry:root.RealScanLayout.computeDocumentLayout(state).paper;
  const w=isDocument?paper?.paperWidth:paper?.widthMm,h=isDocument?paper?.paperHeight:paper?.heightMm;if(!w||!h)return;
  const section=document.createElement('section');section.className='direct-sheet-map';section.setAttribute('aria-label','Ajuste visual de posición y margen');
  const title=document.createElement('strong');title.textContent='Ajusta sobre la hoja';
  const map=document.createElement('div');map.className='direct-sheet-surface';map.style.aspectRatio=w+' / '+h;
  const margin=isDocument?settings.margin:settings.sheetMarginMm,position=settings.position||settings.sheetPosition||'center';
  const inset=document.createElement('div');inset.className='direct-sheet-inset';inset.style.inset=(margin??12)/h*100+'% '+(margin??12)/w*100+'%';map.append(inset);
  const pieces=isDocument?root.RealScanDocuments.annotationPages().slice(0,1).map(p=>({src:p.data,x:p.geometry.x,y:p.geometry.y,w:p.geometry.width,h:p.geometry.height})):root.RealScanLayout.computeDocumentLayout(state).pages[0]?.placements.map(p=>({src:state.images[p.slot]?.processedDataUrl,x:p.xMm,y:p.yMm,w:p.widthMm,h:p.heightMm}))||[];
  const art=document.createElementNS('http://www.w3.org/2000/svg','svg');art.classList.add('direct-sheet-art');art.setAttribute('viewBox','0 0 '+w+' '+h);art.setAttribute('aria-hidden','true');for(const piece of pieces){if(!piece.src)continue;const image=document.createElementNS(art.namespaceURI,'image');image.setAttribute('href',piece.src);for(const [key,value]of Object.entries({x:piece.x,y:piece.y,width:piece.w,height:piece.h}))image.setAttribute(key,value);art.append(image);}map.append(art);
  const hint=document.createElement('p');hint.textContent='Toca una posición o arrastra el bloque. Se ajusta a tres posiciones seguras, sin cambiar el tamaño.';
  const setPosition=value=>change(()=>isDocument?root.RealScanDocuments.setOptions({position:value}):settings.sheetPosition=value);
  for(const [key,label]of [['top','Arriba'],['center','Centro'],['compact','Junto al margen']]){const b=target.querySelector('[data-sheet-place="'+key+'"]')||button(label,()=>setPosition(key));b.textContent=label;b.dataset.directPlace=key;b.setAttribute('aria-pressed',String(position===key));map.append(b);}
  const block=document.createElement('button');block.type='button';block.className='direct-sheet-block';block.textContent='Mover';block.dataset.position=position;block.setAttribute('aria-label','Mover el contenido: usa las posiciones de la hoja o las flechas del teclado');
  let drag=null;block.onpointerdown=e=>{if(!available()||block.disabled)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};block.setPointerCapture(e.pointerId);};
  block.onpointerup=e=>{if(!drag||drag.id!==e.pointerId)return;const start=drag;drag=null;if(!available()||block.disabled||Math.hypot(e.clientX-start.x,e.clientY-start.y)<5)return;const r=map.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;setPosition(y>.38?'center':x<.3?'compact':'top');};block.onpointercancel=()=>{drag=null;};
  block.onkeydown=e=>{const value={ArrowUp:'top',ArrowDown:'center',ArrowLeft:'compact',Home:'center'}[e.key];if(value&&available()&&!block.disabled){e.preventDefault();setPosition(value);}};map.append(block);
  const label=document.createElement('label'),range=target.querySelector('[data-sheet-setting=margin-map]')||document.createElement('input'),out=document.createElement('output');label.textContent='Margen · ';out.textContent=margin==null?'automático':margin+' mm';range.type='range';range.min=0;range.max=25;range.step=1;range.value=margin??12;range.dataset.sheetSetting='margin-map';range.setAttribute('aria-label','Ajustar margen visual en milímetros');range.oninput=()=>{out.textContent=range.value+' mm';inset.style.inset=range.value/h*100+'% '+range.value/w*100+'%';};range.onchange=()=>{if(available()&&!range.disabled)change(()=>isDocument?root.RealScanDocuments.setOptions({margin:Number(range.value)}):settings.sheetMarginMm=Number(range.value));};label.append(out,range);section.append(title,map,label,hint);target.append(section);target.classList.add('has-direct-sheet-map');
 }
 function nasHub(){
  if(!unlocked())return;let d=$('nasHub');if(!d){d=document.createElement('dialog');d.id='nasHub';d.className='desk-dialog';d.setAttribute('aria-labelledby','nasHubTitle');d.innerHTML='<header><small>ARCHIVO Y ENTREGA</small><h2 id="nasHubTitle">Tu archivo en Paperless</h2></header><p id="nasHubStatus" role="status"></p><div class="nas-hub-actions"></div><dl><dt>Pedido guardado</dt><dd>Queda en este navegador para continuar el trabajo. No es una copia en el NAS.</dd><dt>Descargar PDF</dt><dd>El navegador entrega un archivo a tu equipo. Paperless no lo recibe automáticamente.</dd><dt>Archivar en NAS</dt><dd>Se envía una copia a Paperless. Espera la confirmación de archivado; «Procesando» todavía no confirma el archivo.</dd></dl>';const actions=d.querySelector('.nas-hub-actions');for(const [key,label,fn]of [['load','Buscar y cargar documento',()=>root.RealScanPaperless.openBrowser()],['archive','Revisar y archivar este trabajo',()=>root.RealScanWorkspacePolish.deliver('paperless')],['settings','Conectar / revisar acceso',()=>root.RealScanPaperless.openSettings()]]){const b=button(label,()=>{d.close();fn();});b.dataset.nasAction=key;actions.append(b);}d.append(button('Cerrar',()=>d.close()));document.body.append(d);}
  $('nasHubStatus').textContent=root.RealScanPaperless?.hasToken()?'Acceso configurado en este navegador. El sistema comprobará la conexión al abrir o archivar.':'Conecta Paperless para acceder al NAS. Puedes imprimir y descargar mientras tanto.';
  d.querySelector('[data-nas-action=archive]').disabled=!available()||!(root.RealScanDocuments.status().active?root.RealScanDocuments.status().ready:root.RealScanWorkflow.describe().ready);if(!d.open)d.showModal();
 }
 function sample(){
  if(!unlocked())return;const doc=root.RealScanDocuments.status(),kind=doc.active?'document':state.activeCategory==='photos'?'photos':'id',loaded=doc.active?doc.count:Object.values(state.images).some(i=>i.originalSrc),ready=doc.active?doc.ready:root.RealScanWorkflow.describe().ready,key=state._jobRevision+':'+kind;
  if(!loaded){activeJob=null;return;}if(!activeJob||activeJob.key!==key)activeJob={key,kind,start:performance.now(),clicks:0,recorded:false};
  if(ready&&!activeJob.recorded){activeJob.recorded=true;const t=totals[kind]||(totals[kind]={jobs:0,ms:0,actions:0});t.jobs++;t.ms+=performance.now()-activeJob.start;t.actions+=activeJob.clicks;}
 }
 function showMetrics(){if(!unlocked())return;metricsDialog?.remove();const d=document.createElement('dialog');metricsDialog=d;d.className='desk-dialog';d.id='counterSessionMetrics';d.setAttribute('aria-label','Rapidez de esta sesión');const title=document.createElement('h2');title.textContent='Rapidez de esta sesión';const note=document.createElement('p');note.textContent='Desde la primera imagen recibida hasta que el trabajo queda listo. Incluye esperas y ajustes; no mide el resultado físico. Solo totales de esta sesión, sin nombres ni imágenes.';d.append(title,note);for(const [kind,label]of Object.entries(types)){const t=totals[kind],p=document.createElement('p');p.textContent=label+': '+(t?t.jobs+' trabajo(s) · promedio '+(t.ms/t.jobs/1000).toFixed(1)+' s · '+(t.actions/t.jobs).toFixed(1)+' acciones de ajuste':'sin trabajos medidos');d.append(p);}d.append(button('Cerrar',()=>d.close()));document.body.append(d);d.showModal();}
 function init(){if(!$('colControlPanel'))return;if(!root.RealScanWorkspacePolish?.showStage||!$('deskViewerToolbar')||!$('workspaceDelivery')){setTimeout(init,100);return;}
  document.body.classList.add('rs-evolved');
  const labels=['1. Cargar','2. Ajustar','3. Entregar'];for(const [i,b]of [...document.querySelectorAll('[data-guided-step]')].entries())(b.querySelector('.guided-step-label')||b).textContent=labels[i];
  const hub=$('headerNas');if(hub){hub.onclick=nasHub;hub.setAttribute('aria-label','NAS · cargar, archivar o conectar Paperless');hub.title='Cargar, archivar o conectar Paperless';}$('workspaceNasStatus').hidden=false;
  const actions=document.createElement('div');actions.className='counter-session-tools';const speed=button('Rapidez de esta sesión',showMetrics);speed.id='counterSpeed';actions.append(speed);$('deskTools').append(actions);
  const head=$('workspaceDelivery').querySelector('h3');head.textContent='3. Entrega como prefieras';$('workspaceDelivery').querySelector('p').textContent='Revisa una vez y elige imprimir, descargar, enviar o archivar.';
  const destinationLabel=document.createElement('label');destinationLabel.className='counter-destination';destinationLabel.textContent='Acción rápida';const destination=document.createElement('select');destination.id='counterDestination';destination.setAttribute('aria-label','Destino de la acción principal');for(const [key,label]of [['print','Imprimir'],['pdf','Descargar PDF'],['qr','Enviar al celular'],['paperless','Archivar en NAS']])destination.append(new Option(label,key));destination.onchange=()=>{if(!available())return;destination.dataset.explicit='true';root.RealScanWorkspacePolish.update();};destinationLabel.append(destination);head.after(destinationLabel);
  const where=document.createElement('p');where.className='delivery-location-hint';where.textContent='PDF → tu equipo · QR → celular del cliente · Paperless → NAS';$('workspaceDelivery').append(where);
  document.addEventListener('click',e=>{if(e.isTrusted&&available()&&activeJob&&!activeJob.recorded&&e.target.closest('button,select,input'))activeJob.clicks++;},true);
  for(const event of ['realscan:studio-updated','realscan:document-updated'])document.addEventListener(event,sample);sample();
 }
 function releaseReview(){original=false;$('reviewDetailImage')?.removeAttribute('src');if($('reviewDocumentDetail'))$('reviewDocumentDetail').hidden=true;}
 function clear(){activeJob=null;totals={};metricsDialog?.remove();metricsDialog=null;releaseReview();$('reviewDocumentDetail')?.remove();for(const image of document.querySelectorAll('.direct-sheet-art image'))image.removeAttribute('href');$('nasHub')?.close();if($('counterDestination'))delete $('counterDestination').dataset.explicit;}
 document.addEventListener('realscan:modal-closed',e=>{if(e.detail?.id==='outputReviewModal')releaseReview();});
 document.addEventListener('realscan:auth-lock',clear);root.addEventListener('pagehide',clear);
 root.RealScanCounterEvolution={mountDetail,mountSheetMap,nasHub,sample,metrics:()=>structuredClone(totals),clear};document.addEventListener('DOMContentLoaded',()=>setTimeout(init,220));
})(window);
