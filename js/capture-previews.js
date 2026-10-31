/* Captured images stay visible in the receiving step, before the print sheet is ready. */
(function(root){'use strict';const $=id=>document.getElementById(id);let last=[],viewer=null,seen=0,job=null;function allowed(){return $('loginOverlay')?.classList.contains('hidden')&&(!$('setupOverlay')||$('setupOverlay').classList.contains('hidden'));}function close(){if(viewer){viewer.dialog.close();viewer.dialog.remove();viewer=null;}}
function open(side){if(!allowed()||RealScanDocuments.status().active)return;const img=state.images[side],source=img?.processedDataUrl||img?.originalSrc;if(!source)return;close();const revision=state._jobRevision,dialog=document.createElement('dialog');dialog.className='capture-preview-dialog';dialog.setAttribute('aria-label','Vista ampliada de la captura');dialog.innerHTML='<header><div><small>CAPTURA CONFIRMADA</small><h2></h2></div><button type="button" data-preview-close>Cerrar</button></header><p>Comprueba los bordes y la nitidez. Esta vista no cambia la imagen.</p><div class="capture-preview-image"><img alt="Captura seleccionada ampliada"></div><footer><button type="button" data-preview-zoom>Ampliar detalle</button><button type="button" data-preview-edit>Recortar / ajustar</button><button type="button" data-preview-close>Volver al trabajo</button></footer>';dialog.querySelector('h2').textContent=label(side);dialog.querySelector('img').src=source;
/* D: borde de la tarjeta detectada, para confirmar de un vistazo. Solo si se
   detecta una tarjeta; si no, sin overlay y sin bloquear. Se oculta al
   ampliar (la geometría cambia) y se recoloca al cambiar el tamaño. */
if(window.RealScanInePair?.detectSingleCardFromDataUrl){
 const wrap=dialog.querySelector('.capture-preview-image'),imgEl=dialog.querySelector('.capture-preview-image img');
 wrap.style.position='relative';
 let frame=null,lastBox=null;
 const place=()=>{
  if(!lastBox||!viewer||viewer.dialog!==dialog||dialog.dataset.zoom==='true')return;
  if(!imgEl.naturalWidth){imgEl.addEventListener('load',place,{once:true});return;}
  const wRect=wrap.getBoundingClientRect(),iRect=imgEl.getBoundingClientRect(),aspect=imgEl.naturalWidth/imgEl.naturalHeight,boxAspect=iRect.width/iRect.height;
  let dw,dh;if(aspect>boxAspect){dw=iRect.width;dh=iRect.width/aspect;}else{dh=iRect.height;dw=dh*aspect;}
  const ox=iRect.left-wRect.left+(iRect.width-dw)/2,oy=iRect.top-wRect.top+(iRect.height-dh)/2;
  if(!frame){frame=document.createElement('div');frame.className='capture-preview-frame';wrap.append(frame);}
  frame.style.left=(ox+lastBox.box.x/lastBox.width*dw)+'px';frame.style.top=(oy+lastBox.box.y/lastBox.height*dh)+'px';
  frame.style.width=(lastBox.box.w/lastBox.width*dw)+'px';frame.style.height=(lastBox.box.h/lastBox.height*dh)+'px';
 };
 window.RealScanInePair.detectSingleCardFromDataUrl(source).then(result=>{
  if(!viewer||viewer.dialog!==dialog||!result)return;
  lastBox=result;place();window.addEventListener('resize',place);
  dialog.addEventListener('close',()=>window.removeEventListener('resize',place));
  const zoomBtn=dialog.querySelector('[data-preview-zoom]'),prevZoom=zoomBtn.onclick;
  zoomBtn.onclick=e=>{frame?.remove();frame=null;lastBox=null;if(prevZoom)prevZoom(e);};
 }).catch(()=>{});
}for(const b of dialog.querySelectorAll('[data-preview-close]'))b.onclick=close;dialog.querySelector('[data-preview-zoom]').onclick=e=>{const zoom=dialog.dataset.zoom!=='true';dialog.dataset.zoom=String(zoom);e.target.textContent=zoom?'Ver captura completa':'Ampliar detalle';};dialog.querySelector('[data-preview-edit]').onclick=()=>{close();if(!allowed()||RealScanWorkflow.describe().busy)return;RealScanStudio.selectSlot(side);$('studioCrop').click();};dialog.addEventListener('cancel',e=>{e.preventDefault();close();});viewer={dialog,side,source,revision};document.body.append(dialog);dialog.showModal();}
function label(side){return state.activeCategory==='photos'?(side==='front'?'Fotografía A':'Fotografía B'):({front:'Frente',back:'Reverso',page3:'Página 3',page4:'Página 4'}[side]);}
function captureSource(side,source){
 if(!allowed()||RealScanDocuments.status().active||RealScanWorkflow.describe().busy)return;
 if(source==='camera')document.querySelector('[data-camera="'+side+'"]')?.click();
 else $({front:'fileInputFront',back:'fileInputBack',page3:'fileInputPage3',page4:'fileInputPage4'}[side])?.click();
}
function update(){
 const rail=$('capturePreviewRail');if(!rail)return;
 const allowedNow=allowed(),doc=RealScanDocuments.status(),work=RealScanWorkflow.describe(),identity=state.activeCategory!=='photos'&&state.format==='card';
 if(viewer&&(!allowedNow||doc.active||viewer.revision!==state._jobRevision||viewer.source!==(state.images[viewer.side]?.processedDataUrl||state.images[viewer.side]?.originalSrc)))close();
 const key=[allowedNow,doc.active,identity,work.busy,state._jobRevision,state.activeCategory,...work.wanted,...work.wanted.map(side=>state.images[side]?.processedDataUrl||state.images[side]?.originalSrc||'')];
 if(key.length===last.length&&key.every((v,i)=>v===last[i]))return;last=key;
 // Updating another face must not drop keyboard focus when rebuilding the rail.
 const focused=rail.contains(document.activeElement)?document.activeElement.dataset.previewAction+'|'+document.activeElement.dataset.previewSide:null;
 rail.replaceChildren();rail.hidden=!allowedNow||doc.active;if(rail.hidden)return;
 const title=document.createElement('h3');title.textContent=identity?'Añade y revisa las caras':'Tus capturas';rail.append(title);
 const grid=document.createElement('div');grid.className='capture-preview-grid';
 for(const side of work.wanted){
  const img=state.images[side],source=img?.processedDataUrl||img?.originalSrc,b=document.createElement('button');
  b.type='button';b.dataset.previewSide=side;b.dataset.previewAction='view';b.disabled=work.busy;
  b.setAttribute('aria-label',source?'Ampliar captura: '+label(side):'Agregar '+label(side));
  const caption=document.createElement('strong');caption.textContent=label(side);
  if(source){const picture=document.createElement('img');picture.src=source;picture.alt='Vista previa de '+label(side);picture.decoding='async';b.append(picture);b.onclick=()=>open(side);}
  else{const placeholder=document.createElement('span');placeholder.className='capture-preview-empty';placeholder.textContent='+';b.append(placeholder);b.onclick=()=>identity?captureSource(side,'camera'):RealScanWorkflow.moveTo(2,side);}
  const hint=document.createElement('small');hint.textContent=source?'Toca para ampliar':'Pendiente';b.append(caption,hint);
  if(!identity){grid.append(b);continue;}
  const card=document.createElement('article');card.className='capture-side-card';card.dataset.captureSide=side;card.dataset.loaded=String(!!source);card.append(b);
  const actions=document.createElement('div');actions.className='capture-side-actions';actions.setAttribute('role','group');actions.setAttribute('aria-label','Acciones de '+label(side));
  function action(text,key,fn){const button=document.createElement('button');button.type='button';button.textContent=text;button.dataset.previewAction=key;button.dataset.previewSide=side;button.setAttribute('aria-label',text+' · '+label(side));button.disabled=work.busy;button.onclick=()=>{if(allowed()&&!RealScanDocuments.status().active&&!RealScanWorkflow.describe().busy)fn();};actions.append(button);}
  action(source?'Repetir':'Cámara','camera',()=>captureSource(side,'camera'));
  action(source?'Cambiar archivo':'Archivo','file',()=>captureSource(side,'file'));
  if(source)action('Recortar / ajustar','edit',()=>{RealScanStudio.selectSlot(side);$('studioCrop').click();});
  card.append(actions);grid.append(card);
 }
 rail.append(grid);
 if(focused){const [action,side]=focused.split('|');rail.querySelector('[data-preview-action="'+action+'"][data-preview-side="'+side+'"]')?.focus({preventScroll:true});}
 if(job!==state._jobRevision){job=state._jobRevision;seen=0;}
 const loaded=work.wanted.filter(side=>state.images[side]?.processedDataUrl).length;
 if(loaded>seen&&innerWidth<1024&&document.body.dataset.mobileStep==='2'){
  const revision=state._jobRevision;
  setTimeout(()=>{if(allowed()&&revision===state._jobRevision&&!document.querySelector('dialog[open]'))rail.scrollIntoView({block:'center',behavior:'auto'});},0);
 }
 seen=loaded;
}
function init(){if(root.RealScanMobile||!$('flowReceive'))return;const rail=document.createElement('section');rail.id='capturePreviewRail';rail.className='capture-preview-rail';rail.setAttribute('aria-label','Capturas recibidas');$('flowReceive').after(rail);for(const event of ['realscan:studio-updated','realscan:document-updated'])document.addEventListener(event,update);root.RealScanCapturePreviews={open,close,update};update();}root.addEventListener('pagehide',close);document.addEventListener('DOMContentLoaded',()=>setTimeout(init,40));})(window);
