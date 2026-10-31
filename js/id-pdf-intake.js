/* PDF identity intake: propose two real card regions, review, then save or print.
   No OCR, network requests or persistent private data are needed for detection. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),MM=25.4/72,RATIO=85.6/53.98;
 let active=null,focus=null,originalPanel=null,panelAnchor=null,focusedImport=null,lastFocus=[],printOpenedSheet=false;
 const unlocked=()=>$('loginOverlay')?.classList.contains('hidden')&&(!$('setupOverlay')||$('setupOverlay').classList.contains('hidden'));
 function multiply(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
 function point(m,x,y){return [m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];}
 function bounds(points){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
 function cardLike(box){const ratio=Math.max(box.w,box.h)/Math.min(box.w,box.h);return box.w>0&&box.h>0&&Math.abs(ratio/RATIO-1)<.035;}
 function overlap(a,b){return Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;}
 async function regions(page){
  const ops=await page.getOperatorList(),OPS=root.pdfjsLib.OPS,stack=[],found=[];let matrix=[1,0,0,1,0,0];
  if(ops.fnArray.length>100000)return [];
  for(let i=0;i<ops.fnArray.length;i++){
   const op=ops.fnArray[i],args=ops.argsArray[i];
   if(op===OPS.save)stack.push(matrix.slice());
   else if(op===OPS.restore)matrix=stack.pop()||[1,0,0,1,0,0];
   else if(op===OPS.transform)matrix=multiply(matrix,args);
   else if(op===OPS.paintImageXObject||op===OPS.paintInlineImageXObject){
    // Axis-aligned images are unambiguous. Leave skewed/clipped layouts to review.
    if(!((Math.abs(matrix[1])<.01&&Math.abs(matrix[2])<.01)||(Math.abs(matrix[0])<.01&&Math.abs(matrix[3])<.01)))continue;
    const box=bounds([[0,0],[1,0],[0,1],[1,1]].map(p=>point(matrix,...p))),view=page.view;
    const iw=op===OPS.paintImageXObject?args[1]:args[0]?.width,ih=op===OPS.paintImageXObject?args[2]:args[0]?.height;
    if(!cardLike(box)||!Number.isFinite(iw)||!Number.isFinite(ih)||iw<160||ih<100)continue;
    if(box.x<view[0]-.5||box.y<view[1]-.5||box.x+box.w>view[2]+.5||box.y+box.h>view[3]+.5)continue;
    if(Math.min(box.w,box.h)*MM<15||Math.max(box.w,box.h)*MM>420)continue;
    found.push({...box,pixels:Math.max(iw,ih),page});if(found.length>8)return [];
   }
  }
  return found;
 }
 async function crop(region){
  const {page}=region,scale=Math.min(6,Math.max(3,region.pixels/Math.max(region.w,region.h))),view=page.getViewport({scale});
  const box=bounds([[region.x,region.y],[region.x+region.w,region.y],[region.x,region.y+region.h],[region.x+region.w,region.y+region.h]].map(p=>point(view.transform,...p)));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(box.w));canvas.height=Math.max(1,Math.round(box.h));let rotated=null;
  try{
   if(canvas.width*canvas.height>16000000)throw Error('La identificación tiene demasiada resolución.');
   await page.render({canvasContext:canvas.getContext('2d'),viewport:view,transform:[1,0,0,1,-box.x,-box.y]}).promise;
   let output=canvas;if(canvas.height>canvas.width){rotated=document.createElement('canvas');rotated.width=canvas.height;rotated.height=canvas.width;const ctx=rotated.getContext('2d');ctx.translate(0,rotated.height);ctx.rotate(-Math.PI/2);ctx.drawImage(canvas,0,0);output=rotated;}
   return output.toDataURL('image/jpeg',.98);
  }finally{canvas.width=canvas.height=0;if(rotated)rotated.width=rotated.height=0;}
 }
 async function find(pdf){
  if(pdf.numPages<1||pdf.numPages>2)return null;
  const found=[];
  for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),items=await regions(page);found.push(...items.map(item=>({...item,pageNumber:n})));}
  if(found.length!==2||pdf.numPages===2&&found[0].pageNumber===found[1].pageNumber)return null;
  const [a,b]=found;if(a.pageNumber===b.pageNumber&&overlap(a,b))return null;
  if(Math.abs(Math.max(a.w,a.h)/Math.max(b.w,b.h)-1)>.15||Math.abs(Math.min(a.w,a.h)/Math.min(b.w,b.h)-1)>.15)return null;
  found.sort((a,b)=>a.pageNumber-b.pageNumber||((Math.abs(a.y-b.y)>Math.min(a.h,b.h)*.35)?b.y-a.y:a.x-b.x));
  const cards=[];try{for(const region of found)cards.push(await crop(region));return {cards,boxes:found.map(({page,pixels,...box})=>box),method:'pdf-image-regions'};}finally{for(const page of new Set(found.map(region=>region.page)))page.cleanup?.();}
 }
 function dismiss(){if(!active)return;const value=active;active=null;value.dialog.close();value.dialog.remove();value.cards.length=0;}
 async function tryOpen(pdf,{request,fileName='',file=null,targetSide,onAssigned,allowDocument=false,isCurrent=()=>true}={}){
  if(!unlocked())return false;
  const named=/(?:^|[^a-z0-9])(dni|ine|identificaci[oó]n|credencial)(?=$|[^a-z0-9])/i.test(fileName);
  if(root.RealScanDocuments?.status().active&&(!allowDocument||!named||root.RealScanDocuments.status().count))return false;
  if(root.state.activeCategory==='photos'&&!named)return false;
  let value;try{value=await find(pdf);}catch{return false;}if(!value||!root.slotRequestCurrent(request)||!unlocked()||!isCurrent())return false;
  // A photograph PDF is not silently converted just because two photos share a ratio.
  if(!named&&!(state.activeCategory==='docs'&&state.format==='card')&&!value.boxes.every(b=>Math.abs(Math.max(b.w,b.h)*MM/85.6-1)<.15))return false;
  const original=file;
  if(!root.slotRequestCurrent(request)||!unlocked()||!isCurrent())return false;
  dismiss();const dialog=document.createElement('dialog');dialog.id='idPdfIntake';dialog.className='desk-dialog id-pdf-intake';dialog.setAttribute('aria-labelledby','idPdfTitle');
  dialog.innerHTML='<header><small>IDENTIFICACIÓN DETECTADA</small><h2 id="idPdfTitle">Frente y reverso, listos para revisar</h2><p>Encontramos dos imágenes de tarjeta dentro del PDF. Comprueba el orden y que los bordes estén completos.</p></header><label class="id-pdf-front-choice"><input type="checkbox" id="idPdfOnlyFront"> Solo necesito el frente</label><div id="idPdfCards" class="id-card-grid"></div><p class="id-size-note">Al continuar: <strong>85.60 × 53.98 mm · escala 100 %</strong>. La vista ampliada no cambia el tamaño de impresión.</p><button type="button" id="idPdfSwap">Intercambiar frente y reverso</button><label id="idPdfReplaceRow"><input id="idPdfReplace" type="checkbox"> Reemplazar las capturas y anotaciones del trabajo actual</label><p id="idPdfStatus" role="status"></p><footer><button type="button" id="idPdfCancel">Cancelar</button><button type="button" id="idPdfWhole">Usar la página completa</button><button type="button" id="idPdfPrepare">Solo preparar</button><button type="button" id="idPdfSave">Guardar PDF</button><button type="button" id="idPdfPrint">Imprimir</button></footer>';
  const q=id=>dialog.querySelector('#'+id),replace=Object.values(state.images).some(i=>i.originalSrc)||!!state.outputAnnotations?.length;let busy=false,commitJob=null;
  const current=()=>active?.dialog===dialog&&unlocked()&&(busy?state._jobRevision===commitJob:root.slotRequestCurrent(request)&&isCurrent());
  function draw(){q('idPdfCards').replaceChildren();value.cards.forEach((src,i)=>{const figure=document.createElement('figure'),img=document.createElement('img'),label=document.createElement('figcaption');img.src=src;img.alt=i?'Reverso detectado':'Frente detectado';label.textContent=i?'Reverso':'Frente';figure.append(img,label);q('idPdfCards').append(figure);});}
  function buttons(){for(const id of ['idPdfPrepare','idPdfSave','idPdfPrint'])q(id).disabled=busy||replace&&!q('idPdfReplace').checked;}
  async function apply(action){
   if(!current()||busy||replace&&!q('idPdfReplace').checked)return;
   if(root.RealScanWorkflow.describe().busy){q('idPdfStatus').textContent='Espera a que termine la operación actual.';return;}
   commitJob=state._jobRevision;busy=true;buttons();q('idPdfStatus').textContent='Preparando las dos caras a tamaño de identificación…';
   const previous=root.snapshotActiveDraft(),job=state._jobRevision,cards=value.cards.slice();
   try{
    root.RealScanInePair?.cancel();root.RealScanDocuments?.deactivate();root.switchIntent('id');root.setPrintMode(q('idPdfOnlyFront').checked?'single':'both');
    if(!['a4','letter','legal','oficio'].includes(state.paperSize))root.setPaperSize('letter',true);
    Object.assign(state,{outputScalePercent:100,outputSets:1,duplicateCard:false,outputAnnotations:[],documentCustomTitle:'',includeDocLabels:false,includeRulerFooter:false,hideSheetTitle:true});
    for(const side of ['front','back','page3','page4'])root.clearSlot(side);
    root.processRawDataUrl(cards[0],'front',true);root.processRawDataUrl(cards[1],'back',true);
    if(!await root.waitForProcessingComplete(15000))throw Error('La identificación aún se está procesando.');
    if(!unlocked()||job!==state._jobRevision)return;
    if(state.images.front.rawOriginalSrc!==cards[0]||state.images.back.rawOriginalSrc!==cards[1]||!state.images.front.processedDataUrl||!state.images.back.processedDataUrl)throw Error('No se pudieron preparar ambas caras.');
    focusedImport={job};root.updateUI();root.RealScanStudio?.update();root.RealScanServiceFlow?.update();root.saveActiveDraft?.();root.RealScanJourney?.go('review');onAssigned?.('both');dismiss();syncFocus();if($('idSheetView'))$('idSheetView').open=false;
    if(action==='print')root.handlePrintDirect();else if(action==='save')await root.RealScanPdfDelivery.open({destination:'pdf'});else $('idFocusPreview')?.scrollIntoView({block:'start',behavior:'instant'});
   }catch(error){if(unlocked()&&job===state._jobRevision&&previous)await root.restoreActiveDraft(previous);root.showToast?.(error.message||'No se pudo preparar la identificación.','error');dismiss();}
   finally{busy=false;if(active?.dialog===dialog)buttons();}
  }
  q('idPdfReplaceRow').hidden=!replace;q('idPdfReplace').onchange=buttons;q('idPdfWhole').hidden=!original;
  q('idPdfSwap').onclick=()=>{if(!busy&&current()){value.cards.reverse();draw();}};
  q('idPdfCancel').onclick=()=>{if(!busy)dismiss();};dialog.addEventListener('cancel',e=>{e.preventDefault();if(!busy)dismiss();});
  q('idPdfWhole').onclick=()=>{if(!current()||busy)return;dismiss();root.RealScanDocuments.activate();root.RealScanDocuments.addFiles([original],{skipIdentity:true}).then(added=>{if(added)onAssigned?.('document');});};
  for(const [id,action]of [['idPdfPrepare','prepare'],['idPdfSave','save'],['idPdfPrint','print']])q(id).onclick=()=>apply(action);
  active={dialog,cards:value.cards,current};if(value.boxes.some(box=>Math.abs(Math.max(box.w,box.h)/Math.min(box.w,box.h)/RATIO-1)>.01))q('idPdfStatus').textContent='Se conservará la proporción del escaneo. Revisa que no tenga bordes sobrantes antes de imprimir.';draw();buttons();document.body.append(dialog);dialog.showModal();return true;
 }
 function removeFocus(){if(originalPanel&&panelAnchor?.isConnected)panelAnchor.after(originalPanel);$('idSheetView')?.remove();focus?.remove();focus=null;originalPanel=null;panelAnchor?.remove();panelAnchor=null;delete document.body.dataset.idFocus;lastFocus=[];}
 function syncFocus(){
  if(active&&!active.current())dismiss();
  const show=!document.body.classList.contains('rs-quick')&&unlocked()&&state.activeCategory==='docs'&&state.format==='card'&&!root.RealScanDocuments?.status().active&&Object.values(state.images).some(i=>i.processedDataUrl);
  if(!show){removeFocus();if(focusedImport?.job!==state._jobRevision)focusedImport=null;return;}
  if(!$('colStageWorkspace')||!root.RealScanWorkspacePolish)return;const work=root.RealScanWorkflow.describe(),key=[state._jobRevision,state.outputScalePercent,state.printMode,JSON.stringify(state.outputAnnotations||[]),work.busy,...work.wanted,...work.wanted.map(side=>state.images[side]?.processedDataUrl)];if(focus&&key.length===lastFocus.length&&key.every((v,i)=>v===lastFocus[i]))return;lastFocus=key;
  if(!focus){
   originalPanel=document.querySelector('#colStageWorkspace .panel-sheet-preview');if(!originalPanel)return;
   focus=document.createElement('section');focus.id='idFocusPreview';focus.className='id-focus-preview';focus.innerHTML='<div class="id-focus-heading"><div><small>TU IDENTIFICACIÓN</small><h3>Revisa las caras</h3></div><strong id="idFocusSize"></strong></div><div id="idFocusCards" class="id-card-grid"></div><p>Vista ampliada para revisar los bordes. La impresión conserva las medidas indicadas.</p><div class="id-focus-actions"><button type="button" id="idFocusSave">Guardar PDF</button><button type="button" id="idFocusPrint">Imprimir</button></div>';
   panelAnchor=document.createComment('identity-sheet-position');originalPanel.before(panelAnchor,focus);const sheet=document.createElement('details');sheet.id='idSheetView';const summary=document.createElement('summary');summary.textContent='Ver hoja de impresión completa';sheet.append(summary);focus.after(sheet);sheet.append(originalPanel);sheet.open=focusedImport?.job!==state._jobRevision;
   focus.querySelector('#idFocusSave').onclick=()=>root.RealScanPdfDelivery.open({destination:'pdf'});focus.querySelector('#idFocusPrint').onclick=()=>root.handlePrintDirect();
  }
  if((state.outputAnnotations||[]).length&&$('idSheetView'))$('idSheetView').open=true;
  document.body.dataset.idFocus='true';const scale=(Number(state.outputScalePercent)||100)/100;
  focus.querySelector('#idFocusSize').textContent=(85.6*scale).toFixed(2)+' × '+(53.98*scale).toFixed(2)+' mm · '+Math.round(scale*100)+' %';
  const container=focus.querySelector('#idFocusCards'),sides=root.RealScanWorkflow.describe().wanted.filter(side=>['front','back'].includes(side));
  for(const node of [...container.children])if(!sides.includes(node.dataset.side))node.remove();
  for(const side of sides){let figure=container.querySelector('[data-side="'+side+'"]');if(!figure){figure=document.createElement('figure');figure.dataset.side=side;figure.innerHTML='<button type="button"><img></button><figcaption></figcaption>';figure.querySelector('button').onclick=()=>{root.RealScanStudio.selectSlot(side);root.RealScanCapturePreviews?.open(side);};container.append(figure);}const src=state.images[side].processedDataUrl,img=figure.querySelector('img');if(src){if(img.getAttribute('src')!==src)img.src=src;img.hidden=false;}else{img.removeAttribute('src');img.hidden=true;}img.alt=side==='front'?'Frente de la identificación':'Reverso de la identificación';figure.querySelector('figcaption').textContent=(side==='front'?'Frente':'Reverso')+(src?'':' · pendiente de capturar');}
  for(const id of ['idFocusSave','idFocusPrint'])focus.querySelector('#'+id).disabled=!root.RealScanWorkflow.describe().ready||root.RealScanWorkflow.describe().busy;
 }
 new MutationObserver(syncFocus).observe(document.body,{attributes:true,attributeFilter:['class']});
 for(const event of ['realscan:studio-updated','realscan:document-updated'])document.addEventListener(event,syncFocus);
 document.addEventListener('realscan:auth-lock',()=>{dismiss();removeFocus();focusedImport=null;});
 root.addEventListener('beforeprint',()=>{const sheet=$('idSheetView');if(sheet&&!sheet.open){printOpenedSheet=true;sheet.open=true;}});root.addEventListener('afterprint',()=>{if(printOpenedSheet&&$('idSheetView'))$('idSheetView').open=false;printOpenedSheet=false;});
 root.RealScanIdPdf={tryOpen,find,regions,close:dismiss,syncFocus};
})(window);
