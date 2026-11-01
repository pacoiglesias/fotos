/* Counter interaction layer: settings only in preferences; customer media stays in the job. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),KEY='realscan_shortcuts_v1';
 const defaults={capture:'1',review:'2',deliver:'3',jobs:'4'};
 const unlocked=()=>root.RealScanMobile?true:$('loginOverlay')?.classList.contains('hidden')&&(!$('setupOverlay')||$('setupOverlay').classList.contains('hidden'));
 const available=()=>unlocked()&&!root.RealScanMobile?.status.busy&&!root.RealScanWorkflow?.describe().busy&&!root.RealScanDocuments?.status().busy;
 const jobId=()=>root.state?._jobRevision??root.RealScanMobile?.annotationRevision;
 function captureSettings(){return {margin:state.sheetMarginMm??null,position:state.sheetPosition||'center',cuts:state.includeCutMarks!==false,ruler:state.includeRulerFooter!==false,labels:state.includeDocLabels!==false,titleHidden:!!state.hideSheetTitle,printer:root.RealScanPrinterProfiles?.getActiveId()||''};}
 function validSettings(p){return !!p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).every(k=>['margin','position','cuts','ruler','labels','titleHidden','printer'].includes(k))&&(p.margin===null||Number.isFinite(p.margin)&&p.margin>=0&&p.margin<=25)&&['center','top','compact'].includes(p.position)&&['cuts','ruler','labels','titleHidden'].every(k=>typeof p[k]==='boolean')&&typeof p.printer==='string'&&p.printer.length<=100;}
 function applySettings(p){if(!validSettings(p))return;Object.assign(state,{sheetMarginMm:p.margin,sheetPosition:p.position,includeCutMarks:p.cuts,includeRulerFooter:p.ruler,includeDocLabels:p.labels,hideSheetTitle:p.titleHidden});if(!p.printer||root.RealScanPrinterProfiles.list().some(row=>row.id===p.printer))root.RealScanPrinterProfiles.setActive(p.printer||null);}
 root.RealScanDeskConfig={capture:captureSettings,valid:validSettings,apply:applySettings};

 // Keep the origin of a dialogue, including scroll, without keeping a customer snapshot.
 const origins=new WeakMap(),nativeShow=HTMLDialogElement.prototype.showModal;let trigger=null,triggerAt=0;
 document.addEventListener('pointerdown',event=>{trigger=event.target.closest?.('button,a,input,summary,[role=button]');triggerAt=performance.now();},true);
 document.addEventListener('keydown',()=>{trigger=null;},true);
 function origin(){return {element:trigger?.isConnected&&performance.now()-triggerAt<1000?trigger:document.activeElement,x:scrollX,y:scrollY,job:jobId()};}
 HTMLDialogElement.prototype.showModal=function(){
  if(!this.open){origins.set(this,origin());this.addEventListener('close',()=>{
   const saved=origins.get(this);origins.delete(this);setTimeout(()=>{if(!saved||!unlocked()||saved.job!==jobId()||document.querySelector('dialog[open]')||!saved.element?.isConnected)return;root.scrollTo({left:saved.x,top:saved.y,behavior:'instant'});saved.element.focus?.({preventScroll:true});},0);
  },{once:true});}return nativeShow.call(this);
 };
 const legacyOrigins=new Map();
 function installLegacyFocus(){if(!root.openModal||!root.closeModal)return;const open=root.openModal,close=root.closeModal;
  root.openModal=function(id){legacyOrigins.set(id,origin());return open.apply(this,arguments);};
  root.closeModal=function(id){const saved=legacyOrigins.get(id),result=close.apply(this,arguments);legacyOrigins.delete(id);setTimeout(()=>{if(saved&&available()&&saved.job===state._jobRevision&&saved.element?.isConnected&&!document.querySelector('dialog[open]')&&!document.querySelector('[role=dialog][aria-modal=true]:not(.hidden)')){scrollTo({left:saved.x,top:saved.y,behavior:'instant'});saved.element.focus?.({preventScroll:true});}},0);return result;};
 }
 function action(label,fn){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{if(available())fn();};return button;}
 function bindings(){try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&Object.keys(defaults).every(k=>typeof p[k]==='string'&&/^[1-9]?$/.test(p[k])))return p;}catch{}return {...defaults};}
 function shortcuts(){if(!available()||document.querySelector('dialog[open]'))return;const dialog=document.createElement('dialog');dialog.className='desk-dialog';dialog.id='deskShortcuts';dialog.innerHTML='<h2>Atajos del mostrador</h2><p>Usa Alt y el número elegido. Los atajos se pausan al escribir o abrir un diálogo.</p>';const settings=bindings();
  for(const [key,label]of [['capture','Capturar'],['review','Revisar hoja'],['deliver','Elegir entrega'],['jobs','Trabajos']]){const row=document.createElement('label'),select=document.createElement('select');select.dataset.shortcut=key;select.append(new Option('Sin atajo',''),...Array.from({length:9},(_,i)=>new Option('Alt + '+(i+1),String(i+1))));select.value=settings[key];row.append(document.createTextNode(label),select);dialog.append(row);}
  const note=document.createElement('p');note.setAttribute('role','status');const save=action('Guardar atajos',()=>{const value=Object.fromEntries([...dialog.querySelectorAll('select')].map(el=>[el.dataset.shortcut,el.value])),used=Object.values(value).filter(Boolean);if(new Set(used).size!==used.length){note.textContent='Elige un número diferente para cada acción.';return;}try{localStorage.setItem(KEY,JSON.stringify(value));dialog.close();}catch{note.textContent='No se pudieron guardar los atajos.';}});dialog.append(note,save,action('Cerrar',()=>dialog.close()));dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
 }
 function invoke(key){if(key==='capture'){if(root.RealScanDocuments.status().active)$('docCamera').click();else{const work=root.RealScanWorkflow.describe(),side=work.missing[0]||root.RealScanStudio.getSelected()||work.wanted[0];root.RealScanWorkflow.moveTo(2,side);document.querySelector('[data-camera="'+side+'"]')?.click();}}if(key==='review'){if(root.RealScanDocuments.status().active)root.RealScanDocumentPrint.review();else root.handlePrintDirect?.();}if(key==='deliver')root.RealScanWorkspacePolish?.showStage('deliver');if(key==='jobs')root.RealScanWorkspacePolish?.openJobs();}
 document.addEventListener('keydown',event=>{if(!$('colControlPanel')||!event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.repeat||!available()||document.querySelector('dialog[open]')||event.target.closest?.('input,select,textarea,[contenteditable=true]'))return;const key=Object.keys(defaults).find(k=>bindings()[k]===event.key);if(key){event.preventDefault();invoke(key);}});

 let selected='sheet',viewJob=null;
 function view(value){if(!available())return;selected=value;document.body.dataset.deskView=value;const sheet=$('idSheetView');if(sheet&&value==='sheet')sheet.open=true;if(value!=='sheet')root.RealScanStudio.selectSlot(value);updateViewer();}
 function updateViewer(){const toolbar=$('deskViewerToolbar');if(!toolbar)return;if(viewJob!==state._jobRevision){viewJob=state._jobRevision;selected='sheet';}const doc=root.RealScanDocuments.status(),work=root.RealScanWorkflow.describe();toolbar.hidden=doc.active;const image=$('deskViewerImage');
  if(!unlocked()||doc.active){image.removeAttribute('src');$('deskImageViewport').hidden=true;return;}
  if(!work.wanted.includes(selected)&&selected!=='sheet')selected='sheet';document.body.dataset.deskView=selected;
  for(const button of toolbar.querySelectorAll('[data-desk-view]')){button.setAttribute('aria-pressed',String(button.dataset.deskView===selected));button.hidden=button.dataset.deskView==='back'&&!work.wanted.includes('back');button.disabled=!available();}
  const source=selected==='sheet'?null:state.images[selected]?.processedDataUrl;$('deskImageViewport').hidden=selected==='sheet';if(source){if(image.getAttribute('src')!==source)image.src=source;}else image.removeAttribute('src');image.alt=selected==='back'?'Reverso ampliado':'Frente o fotografía ampliada';$('deskViewerEmpty').hidden=!!source;$('deskViewerAdjust').disabled=!source||!available();
 }
 const transientTransfers=new Map();
 function updateTransfers(event){const list=$('deskNasTransfers');if(!list)return;list.replaceChildren();if(!unlocked()){transientTransfers.clear();return;}const detail=event?.detail;if(detail?.key){if(detail.status==='sending')transientTransfers.set(detail.key,{...detail,canCheck:false});else transientTransfers.delete(detail.key);}const transfers=[...transientTransfers.values(),...(root.RealScanPaperless?.transfers?.()||[])].sort((a,b)=>b.at-a.at);
  for(const transfer of transfers.slice(0,8)){const row=document.createElement('div'),label=document.createElement('span');label.textContent=new Date(transfer.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' · '+({sending:'Enviando',processing:'Procesando',archived:'Archivado',failed:'Error de procesamiento',unknown:'Envío sin confirmar'}[transfer.status]||'Pendiente');row.append(label);if(transfer.canCheck){const check=action('Comprobar',async()=>{check.disabled=true;try{await root.RealScanPaperless.resumeTransfer(transfer.key);}catch(e){root.showToast?.(e.message,'warning');}finally{updateTransfers();}});row.append(check);}if(transfer.status==='failed'||transfer.status==='unknown'){const link=document.createElement('a');link.href=root.RealScanPaperless.DEFAULT_BASE;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Revisar en Paperless';row.append(link);}list.append(row);}if(!list.children.length)list.textContent='Los envíos de este navegador aparecerán aquí. No se guardan nombres ni imágenes en esta lista.';
 }
 function init(){if(!root.RealScanWorkspacePolish?.showStage||!$('counterIntake')){setTimeout(init,100);return;}document.body.classList.add('rs-desk336');installLegacyFocus();
  $('studioWelcome').querySelector('h1').textContent='Servicio';$('deskStart').querySelector('h2').textContent='Recibir';
  const tools=$('deskTools');if(tools){$('counterIntake').after(tools);const button=action('Atajos de teclado',shortcuts);button.id='deskShortcutSettings';tools.append(button);}
  const toolbar=document.createElement('nav');toolbar.id='deskViewerToolbar';toolbar.setAttribute('aria-label','Visor del trabajo');for(const [key,label]of [['sheet','Hoja'],['front','Frente / foto'],['back','Reverso']]){const button=action(label,()=>view(key));button.dataset.deskView=key;toolbar.append(button);}const adjust=action('Recortar / ajustar',()=>{if(selected==='sheet')selected=root.RealScanStudio.getSelected()||'front';root.RealScanStudio.selectSlot(selected);$('studioCrop').click();});adjust.id='deskViewerAdjust';toolbar.append(adjust);
  const viewport=document.createElement('figure');viewport.id='deskImageViewport';viewport.hidden=true;viewport.innerHTML='<img id="deskViewerImage" alt="Captura ampliada"><figcaption id="deskViewerEmpty">Usa Cámara o Archivo para agregar esta cara.</figcaption><figcaption>Vista ampliada. El tamaño impreso se conserva.</figcaption>';$('colStageWorkspace').prepend(toolbar,viewport);
  const transfers=document.createElement('details');transfers.id='deskNasPanel';transfers.innerHTML='<summary>Estado de envíos al NAS</summary><div id="deskNasTransfers" role="status"></div>';$('workspaceNas').append(transfers);
  for(const event of ['realscan:studio-updated','realscan:document-updated','realscan:auth-lock'])document.addEventListener(event,updateViewer);for(const event of ['realscan:paperless-transfer','realscan:paperless-changed','realscan:auth-lock'])document.addEventListener(event,updateTransfers);
  updateViewer();updateTransfers();root.RealScanDeskExperience={view,shortcuts,update:updateViewer};
 }
 document.addEventListener('realscan:auth-lock',()=>{legacyOrigins.clear();$('deskViewerImage')?.removeAttribute('src');});
 document.addEventListener('DOMContentLoaded',()=>{if($('colControlPanel'))setTimeout(init,180);});
})(window);
