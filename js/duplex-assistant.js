/* Manual duplex: placement is learned from the operator's physical test, never guessed. */
(function(root){
 'use strict';
 const key='realscan_duplex_profiles_v1',activeKey='realscan_duplex_active_v1',$=id=>document.getElementById(id);
 let profiles=[],activeName='',firstPass=null;
 try{const saved=JSON.parse(localStorage.getItem(key)||'[]');profiles=Array.isArray(saved)?saved.filter(p=>p&&typeof p.name==='string'&&p.name.length<=80&&typeof p.notes==='string'&&p.notes.length<=180&&['book','calendar'].includes(p.flip)).slice(-20):[];activeName=localStorage.getItem(activeKey)||'';}catch{}
 function unlocked(){return $('loginOverlay')?.classList.contains('hidden')&&(!$('setupOverlay')||$('setupOverlay').classList.contains('hidden'));}
 function paperKey(){const doc=root.RealScanDocuments?.status();return doc?.active?doc.options.paper:state.paperSize;}
 function currentPaper(){return PAPER_SPECS[paperKey()]||getActivePaperSpec();}
 function structured(p){return p&&['up','down'].includes(p.face)&&['top','bottom'].includes(p.edge)&&p.paper===paperKey()&&Number.isFinite(p.verifiedAt);}
 function guide(){const p=profiles.find(p=>p.name===activeName);return structured(p)?{...p}:null;}
 function sheet(face,edge){const visible=face==='up';return '<svg viewBox="0 0 240 166" role="img" aria-label="'+(visible?'Cara A visible hacia arriba':'Cara A hacia abajo, oculta')+'; '+(edge==='top'?'borde ARRIBA entra primero':'borde contrario a ARRIBA entra primero')+'"><rect x="28" y="13" width="184" height="138" rx="17" fill="var(--duplex-tray,#e8eef5)"/><path d="M53 30h134" stroke="#8296ac" stroke-width="6" stroke-linecap="round"/><path d="m120 4-7 10h14z" fill="#275ecb"/><rect x="73" y="35" width="94" height="110" rx="5" fill="white" stroke="#7188a2" stroke-width="2"/><rect x="80" y="'+(edge==='top'?'39':'131')+'" width="80" height="7" rx="2" fill="#f59e0b"/><text x="120" y="84" text-anchor="middle" font-size="24" font-weight="700" fill="#275ecb">'+(visible?'A':'B')+'</text><text x="120" y="103" text-anchor="middle" font-size="9" fill="#435a72">'+(visible?'YA IMPRESA':'SIN IMPRIMIR')+'</text><path d="M120 23v-8m-5 5 5-5 5 5" stroke="#275ecb" stroke-width="2" fill="none"/></svg>';}
 function renderGuide(container,placement=guide()){
  if(!container)return;container.replaceChildren();container.className='duplex-placement';
  if(!placement){const p=document.createElement('p');p.textContent='No hay una colocación verificada para este papel. Haz primero la prueba de una hoja; no adivines el giro.';container.append(p);return;}
  const figure=document.createElement('div');figure.className='duplex-placement-art';figure.innerHTML=sheet(placement.face,placement.edge);
  const text=document.createElement('div'),title=document.createElement('strong');title.textContent=placement.face==='up'?'Cara A impresa hacia ARRIBA':'Cara A impresa hacia ABAJO';
  const edge=document.createElement('p');edge.textContent=placement.edge==='top'?'Entra primero el borde naranja marcado ARRIBA.':'Entra primero el borde contrario al marcado ARRIBA.';
  const note=document.createElement('small');note.textContent='El dibujo muestra la hoja al entrar en la bandeja. '+(placement.flip==='book'?'Lectura final: como un libro.':'Lectura final: como un calendario.');text.append(title,edge,note);container.append(figure,text);
  if(placement.name){const profile=document.createElement('p');profile.className='duplex-placement-profile';profile.textContent='Tu prueba: '+placement.name+' · '+(PAPER_SPECS[placement.paper]?.shortName||placement.paper);container.append(profile);}
 }
 function placement(){const face=$('duplexFace'),edge=$('duplexEdge'),flip=$('duplexFlip');return {face:face?.value||'',edge:edge?.value||'',flip:flip?.value||'book'};}
 function invalidate(){ $('duplexVerified').checked=false;firstPass=null;$('duplexJobReinserted').checked=false;update(); }
 function update(){
  const p=placement(),complete=['up','down'].includes(p.face)&&['top','bottom'].includes(p.edge);
  $('duplexVerified').disabled=!complete;$('duplexSave').disabled=!complete||!$('duplexVerified').checked;
  $('duplexJobA').disabled=!complete||!$('duplexVerified').checked;
  $('duplexJobB').disabled=!complete||!$('duplexVerified').checked||!firstPass||!$('duplexJobReinserted').checked;
  $('duplexJobReinserted').disabled=!firstPass;
  $('duplexSheet').dataset.flip=p.flip;
  $('duplexInstruction').textContent=p.flip==='book'?'Comprueba A y B leyéndolas como un libro.':'Comprueba A y B leyéndolas como un calendario.';
  renderGuide($('duplexPlacementPreview'),complete?p:null);
 }
 function refresh(){const select=$('duplexProfiles');select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Nueva prueba de una hoja';select.append(empty);for(const p of profiles){const o=document.createElement('option');o.value=p.name;o.textContent=p.name+(structured(p)?' · probada':' · repetir prueba');select.append(o);}}
 function load(){const p=profiles.find(p=>p.name===$('duplexProfiles').value);activeName=p?.name||'';firstPass=null;$('duplexJobReinserted').checked=false;
  $('duplexName').value=p?.name||'';$('duplexNotes').value=p?.notes||'';$('duplexFlip').value=p?.flip||'book';$('duplexFace').value=p?.face||'';$('duplexEdge').value=p?.edge||'';$('duplexVerified').checked=!!structured(p);update();
  $('duplexStatus').textContent=p?(structured(p)?'Colocación guardada para este papel. Repite la prueba si cambias de impresora, bandeja o ajustes.':'Este perfil no tiene una colocación verificada para el papel actual. Conservamos tus notas; repite la prueba.'):'Completa primero la prueba con una sola hoja común. No uses aún las hojas del cliente.';
  try{localStorage.setItem(activeKey,activeName);}catch{}
 }
 function open(){
  if(!unlocked())return;let modal=$('duplexAssistantModal');
  if(!modal){modal=document.createElement('div');modal.id='duplexAssistantModal';modal.className='hidden fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','duplexTitle');
   modal.innerHTML='<div class="duplex-dialog"><div class="duplex-title-row"><div><span class="duplex-kicker">TU IMPRESORA · TU COLOCACIÓN</span><h2 id="duplexTitle">Doble cara, sin adivinar.</h2></div><button type="button" data-close-modal="duplexAssistantModal" aria-label="Cerrar guía">Cerrar</button></div><p>La impresora no informa al navegador cómo toma el papel. Guardaremos la colocación que tú compruebes con una hoja.</p><label>Impresora y bandeja guardadas<select id="duplexProfiles"></select></label><section class="duplex-step"><span class="duplex-step-number">1</span><div><h3>Imprime la cara A</h3><p>Usa una hoja común y escala 100 %. La prueba lleva una A grande y el borde ARRIBA en naranja.</p><button type="button" id="duplexTestA">Descargar prueba A</button></div></section><section class="duplex-step"><span class="duplex-step-number">2</span><div><h3>Prueba una colocación</h3><p>Después de imprimir A, elige cómo vas a meter de nuevo esa misma hoja. El dibujo cambia con tus respuestas.</p><div class="duplex-pickers"><label>La cara A ya impresa queda<select id="duplexFace"><option value="">Elige una colocación</option><option value="down">Hacia abajo · no la veo</option><option value="up">Hacia arriba · la veo</option></select></label><label>El borde que entra primero es<select id="duplexEdge"><option value="">Elige el borde</option><option value="top">El naranja · ARRIBA</option><option value="bottom">El contrario a ARRIBA</option></select></label></div><div id="duplexPlacementPreview"></div><p>Imprime B en esa misma hoja. Si cae encima de A, cambia la cara. Si B queda de cabeza al leerla con el giro elegido, cambia el borde y repite con una hoja nueva.</p><button type="button" id="duplexTestB">Descargar prueba B</button></div></section><section class="duplex-step"><span class="duplex-step-number">3</span><div><h3>Comprueba y guarda tu dibujo</h3><label>Cómo se lee el resultado<select id="duplexFlip"><option value="book">Como un libro · giro lateral</option><option value="calendar">Como un calendario · giro superior</option></select></label><div class="duplex-demo" aria-hidden="true"><div id="duplexSheet" class="duplex-sheet"><span class="duplex-front">A<br>ARRIBA ↑</span><span class="duplex-back">B<br>ARRIBA ↑</span></div></div><p id="duplexInstruction"></p><label>Nombre de impresora y bandeja<input id="duplexName" maxlength="80" placeholder="Ej. Mostrador · bandeja trasera"></label><label>Una nota para recordarlo<input id="duplexNotes" maxlength="180" placeholder="Opcional: posición de la bandeja o ajustes"></label><label class="duplex-confirm"><input id="duplexVerified" type="checkbox"><span>A y B están en caras distintas de la MISMA hoja y se leen derechas con el giro elegido.</span></label><button type="button" id="duplexSave" class="duplex-primary">Guardar esta colocación</button></div></section><details class="duplex-job"><summary>Usar con una identificación de frente y reverso</summary><p>Descarga e imprime el frente a 100 %. Recoloca una hoja siguiendo el dibujo; confirma antes de descargar el reverso.</p><button type="button" id="duplexJobA">Descargar frente del trabajo</button><label class="duplex-confirm"><input id="duplexJobReinserted" type="checkbox"><span>El frente salió bien y reinserté esa hoja como muestra el dibujo.</span></label><button type="button" id="duplexJobB">Descargar reverso del trabajo</button></details><p id="duplexStatus" role="status" aria-live="polite"></p><p class="duplex-note">La colocación se guarda en este navegador. Para varias hojas, comprueba también el orden de salida y empieza con dos páginas.</p></div>';
   document.body.append(modal);
   for(const id of ['duplexFace','duplexEdge','duplexFlip'])$(id).onchange=invalidate;
   $('duplexName').oninput=$('duplexNotes').oninput=invalidate;
   $('duplexVerified').onchange=$('duplexJobReinserted').onchange=update;
   $('duplexProfiles').onchange=load;
   $('duplexTestA').onclick=()=>testPdf('A').catch(fail);$('duplexTestB').onclick=()=>testPdf('B').catch(fail);
   $('duplexJobA').onclick=()=>jobPdf(1).catch(fail);$('duplexJobB').onclick=()=>jobPdf(2).catch(fail);
   $('duplexSave').onclick=()=>{
    if(!unlocked())return;const p=placement();if(!$('duplexVerified').checked||!$('duplexName').value.trim()||!p.face||!p.edge){$('duplexStatus').textContent='Elige cara y borde, escribe el nombre y comprueba ambas caras antes de guardar.';return;}
    const profile={name:$('duplexName').value.trim(),notes:$('duplexNotes').value.trim(),...p,paper:paperKey(),verifiedAt:Date.now()};const next=[...profiles.filter(p=>p.name!==profile.name),profile].slice(-20);
    try{localStorage.setItem(key,JSON.stringify(next));localStorage.setItem(activeKey,profile.name);profiles=next;activeName=profile.name;refresh();$('duplexProfiles').value=profile.name;$('duplexStatus').textContent='Colocación guardada. La próxima vez verás el dibujo de esta impresora, bandeja y papel.';document.dispatchEvent(new Event('realscan:duplex-profile-updated'));}catch{$('duplexStatus').textContent='No se pudo guardar en este navegador. Conserva cara y borde por escrito; la prueba no se guardó.';}
   };
  }
  refresh();$('duplexProfiles').value=activeName;load();openModal('duplexAssistantModal');
 }
 function fail(e){$('duplexStatus').textContent=e.message||'No se pudo preparar la prueba. Vuelve a intentarlo.';}
 async function testPdf(face){
  if(!unlocked())return;if(typeof ensureJsPdf==='function')await ensureJsPdf();if(!unlocked())return;
  const paper=currentPaper(),doc=new jspdf.jsPDF({unit:'mm',format:[paper.widthMm,paper.heightMm]});const w=paper.widthMm,h=paper.heightMm;
  doc.setFillColor(245,158,11);doc.rect(9,9,w-18,12,'F');doc.setTextColor(25,40,55);doc.setFontSize(12);doc.text('ARRIBA / TOP - BORDE NARANJA',w/2,17,{align:'center'});
  doc.setFontSize(Math.min(100,h*.32));doc.text(face,w/2,h*.52,{align:'center'});doc.setFontSize(14);doc.text('PRUEBA - CARA '+face,w/2,h*.66,{align:'center'});
  doc.setFontSize(10);doc.text(doc.splitTextToSize('Una hoja comun - misma impresora y bandeja - escala 100%',w-20),w/2,h-32,{align:'center'});doc.text(doc.splitTextToSize('A y B deben quedar en caras diferentes y leerse derechas.',w-20),w/2,h-18,{align:'center'});
  downloadPdfBlob(doc,'RealScan_Prueba_Duplex_'+face+'.pdf');$('duplexStatus').textContent='Prueba '+face+' descargada. Descargar no confirma que la impresora haya impreso.';
 }
 function signature(placementOverride){return JSON.stringify([state._jobRevision,paperKey(),RealScanLayout.computeDocumentLayout(state),state.hideSheetTitle,state.documentCustomTitle,state.outputScalePercent,state.images.front.rotation,state.images.back.rotation,state.images.front.processedDataUrl,state.images.back.processedDataUrl,placementOverride||placement()]);}
 /* Núcleo compartido: descarga una cara del trabajo como PDF de una página,
    sin depender de los controles del modal. Lo usan los botones del modal
    y el flujo guiado de un toque. */
 async function downloadJobFace(face,placementOverride){
  if(state.activeCategory==='photos'||state.documentPageCount>2||!state.images.front.processedDataUrl||!state.images.back.processedDataUrl)throw Error('Carga frente y reverso de una identificación. Para documentos de varias páginas usa la guía de impares y pares.');
  const preparedSignature=signature(placementOverride);if(typeof ensureJsPdf==='function')await ensureJsPdf();if(!unlocked()||preparedSignature!==signature(placementOverride))throw Error('El trabajo cambió. Revisa de nuevo antes de descargar.');
  const old={printMode:state.printMode,duplicateCard:state.duplicateCard,documentPageCount:state.documentPageCount};
  try{Object.assign(state,{printMode:'both_separate',duplicateCard:false,documentPageCount:2});const doc=generatePdfDoc();if(!doc||doc.getNumberOfPages()!==2)throw Error('Revisa medidas, papel y las dos caras.');doc.deletePage(face===1?2:1);downloadPdfBlob(doc,'RealScan_Duplex_'+(face===1?'Frente':'Reverso')+'.pdf');}
  finally{Object.assign(state,old);}
 }
 async function jobPdf(face){
  const status=$('duplexStatus');if(!unlocked())return;
  if(!$('duplexVerified').checked||!$('duplexFace').value||!$('duplexEdge').value){status.textContent='Completa primero la prueba con papel común.';return;}
  if(face===2&&(firstPass!==signature()||!$('duplexJobReinserted').checked)){status.textContent='Imprime el frente y confirma la recolocación. Si cambió el trabajo, prepara otra vez el frente.';firstPass=null;update();return;}
  try{await downloadJobFace(face);status.textContent='Imprime a tamaño real 100 %. Sigue el dibujo de cara y borde.';}
  catch(e){fail(e);return;}
  if(face===1){firstPass=signature();$('duplexJobReinserted').checked=false;}else firstPass=null;update();
 }
 /* Dúplex de un toque para trabajos con colocación ya verificada: descarga
    el frente, muestra el dibujo de recolocación y, al confirmar, descarga
    el reverso. Sin colocación verificada abre el asistente (nunca adivina).
    El navegador no puede saber si la impresora soporta dúplex ni cómo toma
    el papel: la prueba física guardada es la única fuente de verdad. */
 function confirmReinsert(placementValue){
  return new Promise(resolve=>{
   let dialog=$('duplexReinsertDialog');
   if(dialog)dialog.remove();
   dialog=document.createElement('dialog');dialog.id='duplexReinsertDialog';dialog.className='desk-dialog';dialog.setAttribute('aria-label','Recolocar el papel para el reverso');
   dialog.innerHTML='<h2>Frente descargado</h2><p>Imprime el frente a tamaño real 100 %. Después recoloca esa misma hoja siguiendo el dibujo y descarga el reverso.</p><div id="duplexReinsertGuide"></div><div class="document-actions"><button type="button" id="duplexReinsertContinue" class="counter-primary">Ya reinserté la hoja: descargar reverso</button><button type="button" id="duplexReinsertCancel">Cancelar</button></div>';
   document.body.append(dialog);
   renderGuide(dialog.querySelector('#duplexReinsertGuide'),placementValue);
   dialog.querySelector('#duplexReinsertContinue').onclick=()=>{dialog.close();dialog.remove();resolve(true);};
   dialog.querySelector('#duplexReinsertCancel').onclick=()=>{dialog.close();dialog.remove();resolve(false);};
   dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();dialog.remove();resolve(false);});
   dialog.showModal();
  });
 }
 async function printJobGuided(){
  if(!unlocked())return;
  const verified=guide();
  if(!verified){open();return;}
  if(state.activeCategory==='photos'||state.documentPageCount>2||!state.images.front.processedDataUrl||!state.images.back.processedDataUrl){root.showToast?.('Carga frente y reverso de una identificación para usar el dúplex.','info');open();return;}
  try{await downloadJobFace(1,verified);}
  catch(e){root.showToast?.(e.message||'No se pudo preparar el frente.','warning');return;}
  const reinserted=await confirmReinsert(verified);
  if(!reinserted||!unlocked())return;
  try{await downloadJobFace(2,verified);root.showToast?.('Reverso descargado. Imprime a 100 % por la segunda cara.','success');}
  catch(e){root.showToast?.(e.message||'No se pudo preparar el reverso.','warning');}
 }
 root.RealScanDuplex={open,getGuide:guide,renderGuide,printJobGuided};
})(window);
