/* Modo rápido INE/DNI — capa de presentación sobre los motores existentes.
   Convierte el botón "Modo rápido" del mostrador en un flujo real de 4 toques:
   escanear frente → escanear reverso → Imprimir o Guardar PDF.
   No crea motores nuevos: reutiliza la cámara (scan-assist), el detector par INE,
   el motor de medidas, la impresión (handlePrintDirect) y el PDF (handleExportPDF).
   Guardarraíles: nunca imprime sin vista previa (la revisión previa al diálogo
   del sistema) y nunca pierde capturas al cambiar de modo: salir del modo rápido
   solo vuelve a mostrar los paneles, el trabajo queda intacto. */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
let mounted=false,attempts=0,quick=false,postPrint=false,prevMissing=null,bannerHome=null,lastQuick=false,updating=false;
const unlocked=()=>$('loginOverlay')?.classList.contains('hidden')&&(!$('setupOverlay')||$('setupOverlay').classList.contains('hidden'));
const docActive=()=>!!root.RealScanDocuments?.status().active;
const hasImages=()=>Object.values(root.state?.images||{}).some(i=>i.originalSrc||i.processedDataUrl||i._reading);
const describe=()=>root.RealScanWorkflow?.describe()||{};
const imgOf=side=>{const im=root.state?.images?.[side];return im?.processedDataUrl||im?.originalSrc||'';};
const paperName=()=>{try{return (root.PAPER_SPECS?.[root.state?.paperSize]||{}).shortName||root.state?.paperSize||'';}catch(e){return '';}};
const rulerVerified=()=>{try{const profile=root.RealScanPrinterProfiles?.getActive();if(!profile)return null;const v=JSON.parse(localStorage.getItem('realscan_calibration_verified_'+profile.id)||'null');return !!v&&v.scaleX===profile.scaleX&&v.scaleY===profile.scaleY;}catch(e){return null;}};
const pendingSide=()=>{const m=describe().missing||[];return m[0]||'front';};
function setText(id,text){const el=$(id);if(el&&el.textContent!==text)el.textContent=text;}
function setSrc(img,src){if(!img)return;const cur=img.getAttribute('src')||'';if(cur!==src){if(src)img.setAttribute('src',src);else img.removeAttribute('src');}}
function setCleanFlags(){root.state.hideSheetTitle=true;root.state.includeDocLabels=false;root.state.includeRulerFooter=false;}
function refreshAll(){try{root.updateUI?.();root.RealScanStudio?.update();root.RealScanServiceFlow?.update();root.savePreferences?.();root.saveActiveDraft?.();}catch(e){}}
/* Defaults del modo rápido para trabajos NUEVOS: siempre Carta (el preset INE es
   "frente y reverso en Carta"). NO se lee el "último papel" de realscan_prefs_v2:
   la app guarda ahí su A4 por defecto al iniciar, así que ese valor no distingue
   un papel elegido por el operador del arranque por defecto y revertiría el preset. */
function applyQuickDefaults(){
 try{
  root.selectFormat?.('card',true);root.setDocumentPages?.(2);root.setPrintMode?.('both');root.setPaperSize?.('letter',true);
  root.state.outputScalePercent=100;root.state.outputSets=1;setCleanFlags();
 }catch(e){}
 refreshAll();
}
/* Trabajos adoptados (INE en curso): se normalizan formato/modo/escala/banderas
   pero se CONSERVA su papel — cambiarlo a mitad de un trabajo sería destruirlo. */
function normalizeAdopted(){
 try{
  root.selectFormat?.('card',true);root.setDocumentPages?.(2);root.setPrintMode?.('both');
  root.state.outputScalePercent=100;root.state.outputSets=1;setCleanFlags();
 }catch(e){}
 refreshAll();
}
function slotHTML(side,label){
 return '<article class="quick-slot" data-quick-slot="'+side+'">'
 +'<button type="button" class="quick-slot-btn" id="quickSlot'+(side==='front'?'Front':'Back')+'" aria-label="Captura de '+label+'">'
 +'<span class="quick-slot-thumb"><span class="quick-slot-plus">+</span><img alt="" hidden><span class="quick-slot-check" hidden>✓</span></span>'
 +'<strong>'+label+'</strong><small>Pendiente</small></button>'
 +'<div class="quick-slot-tools"><button type="button" data-quick-rotate="'+side+'">↻ Girar</button>'
 +'<button type="button" data-quick-replace="'+side+'">Cambiar foto</button></div></article>';
}
function build(){
 const intake=$('counterIntake');
 const slots=document.createElement('section');
 slots.id='quickMode';slots.setAttribute('aria-label','Modo rápido INE DNI');
 slots.innerHTML=
 '<div class="quick-main">'
 +'<p class="quick-kicker">MODO RÁPIDO</p><h2>INE / DNI — tamaño real</h2>'
 +'<div class="quick-steps" aria-hidden="true"><span id="quickStep1" class="quick-step" data-state="current">1 · Frente</span><span id="quickStep2" class="quick-step" data-state="todo">2 · Reverso</span><span id="quickStep3" class="quick-step" data-state="todo">3 · Entregar</span></div>'
 +'<p id="quickMeta" class="quick-meta"></p><p id="quickStatus" class="quick-status" role="status"></p>'
 +'<div class="quick-slots">'+slotHTML('front','Frente')+slotHTML('back','Reverso')+'</div>'
 +'<div id="quickPairHost"></div>'
 +'<button type="button" id="quickScanBtn" class="quick-giant quick-scan"><span class="quick-giant-main">📷 Escanear frente</span><span class="quick-giant-sub">Toca para abrir la cámara</span></button>'
 +'<button type="button" id="quickFileBtn" class="quick-link">o subir un archivo</button>'
 +'<label class="quick-name">Nombre (opcional)<input id="quickName" type="text" maxlength="48" placeholder="Ej. INE de Juan Pérez" autocomplete="off"></label>'
 +'<div class="quick-foot"><button type="button" id="quickOtherService" class="quick-link">Otro servicio (fotos/documento)</button>'
 +'<button type="button" id="quickSettingsBtn" class="quick-gear" aria-label="Ajustes">⚙️</button>'
 +'<button type="button" id="quickFullModeBtn" class="quick-link">Modo completo</button></div>'
 +'</div>'
 +'<div class="quick-blocked" hidden><p class="quick-kicker">MODO RÁPIDO</p><h2>INE / DNI — tamaño real</h2>'
 +'<p id="quickBlockedText" class="quick-status"></p>'
 +'<button type="button" id="quickBlockedExit" class="quick-giant quick-scan">Volver al modo completo</button></div>';
 intake.insertBefore(slots,intake.firstChild);
 const actions=document.createElement('section');
 actions.id='quickActions';actions.setAttribute('aria-label','Entregar trabajo rápido');
 actions.innerHTML=
 '<p class="quick-stamp">✓ Tamaño real · 85.60 × 53.98 mm · <span id="quickScale">100%</span></p>'
 +'<p id="quickPrinter" class="quick-printer"></p>'
 +'<div class="quick-deliver">'
 +'<button type="button" id="quickPrintBtn" class="quick-giant quick-print">🖨 Imprimir</button>'
 +'<button type="button" id="quickPdfBtn" class="quick-giant quick-pdf">💾 Guardar PDF</button>'
 +'<p id="quickDeliverHint" class="quick-hint"></p></div>'
 +'<div class="quick-postprint" hidden>'
 +'<button type="button" id="quickNewScanBtn" class="quick-giant quick-print">➕ Nuevo escaneo</button>'
 +'<button type="button" id="quickHistoryBtn" class="quick-link">Ver historial</button>'
 +'<button type="button" id="quickKeepBtn" class="quick-link">Seguir con este trabajo</button></div>';
 const card=document.querySelector('#colStageWorkspace .stage-canvas-area')?.closest('section');
 if(card&&card.parentElement)card.after(actions);
 else if($('colStageWorkspace'))$('colStageWorkspace').append(actions);
 else slots.after(actions);
}
function scanSide(side){
 if(!unlocked())return;
 const cam=document.querySelector('[data-camera="'+side+'"]');
 if(cam)cam.click();
 else fileFor(side);
}
function fileFor(side){const input=$({front:'fileInputFront',back:'fileInputBack'}[side]);if(input)input.click();}
function exitQuick(){if(document.body.classList.contains('rs-quick'))$('workbenchQuick')?.click();}
function printQuick(){
 if(!unlocked())return;const w=describe();
 if(w.busy)return;
 if((w.missing||[]).length||!w.ready){root.showToast?.('Completa el frente y el reverso antes de imprimir.','info');return;}
 root.handlePrintDirect?.();
}
function pdfQuick(){
 if(!unlocked())return;const w=describe();
 if(w.busy)return;
 if((w.missing||[]).length||!w.ready){root.showToast?.('Completa el frente y el reverso antes de guardar el PDF.','info');return;}
 root.handleExportPDF?.(false,true);
}
async function newScan(){
 if(!unlocked())return;
 try{await root.RealScanCounter?.startPrepared('id',true);}
 catch(e){root.showToast?.(e.message||'No se pudo preparar el nuevo escaneo.','warning');return;}
 applyQuickDefaults();postPrint=false;update();
 document.getElementById('quickMode')?.scrollIntoView({block:'start',behavior:'auto'});
}
function wire(){
 $('quickScanBtn').onclick=()=>scanSide(pendingSide());
 $('quickFileBtn').onclick=()=>fileFor(pendingSide());
 for(const side of ['front','back']){
  $('quickSlot'+(side==='front'?'Front':'Back')).onclick=()=>{
   if(!unlocked())return;
   if(imgOf(side))root.RealScanCapturePreviews?.open(side);
   else scanSide(side);
  };
  document.querySelector('[data-quick-rotate="'+side+'"]').onclick=()=>{
   if(!unlocked())return;root.RealScanStudio?.selectSlot(side);
   document.querySelector('[data-rotate="'+side+'"]')?.click();
  };
  document.querySelector('[data-quick-replace="'+side+'"]').onclick=()=>{if(unlocked())fileFor(side);};
 }
 $('quickName').addEventListener('input',e=>{root.state.documentCustomTitle=e.target.value;});
 $('quickName').addEventListener('change',()=>{try{root.saveActiveDraft?.();}catch(e){}});
 $('quickOtherService').onclick=exitQuick;
 $('quickFullModeBtn').onclick=exitQuick;
 $('quickBlockedExit').onclick=exitQuick;
 $('quickSettingsBtn').onclick=()=>{if(unlocked())$('btnOpenSettings')?.click();};
 $('quickPrintBtn').onclick=printQuick;
 $('quickPdfBtn').onclick=pdfQuick;
 $('quickNewScanBtn').onclick=newScan;
 $('quickHistoryBtn').onclick=()=>{if(unlocked())root.RealScanDesk?.openHistory();};
 $('quickKeepBtn').onclick=()=>{postPrint=false;update();};
}
function moveBannerIn(){
 const banner=document.querySelector('.ine-pair-banner'),host=$('quickPairHost');
 if(!banner||!host||banner.parentElement===host)return;
 bannerHome={parent:banner.parentElement,next:banner.nextSibling};
 host.append(banner);
}
function restoreBanner(){
 const banner=document.querySelector('.ine-pair-banner');
 if(!banner||!bannerHome)return;
 const home=bannerHome;bannerHome=null;
 if(home.parent.isConnected)home.parent.insertBefore(banner,home.next);
 else{const anchor=$('capturePreviewRail')||$('studioImageTray')||$('deskStart');anchor?.after(banner);}
}
function renderSlot(side,label,src){
 const btn=$('quickSlot'+(side==='front'?'Front':'Back'));if(!btn)return;
 const img=btn.querySelector('img'),plus=btn.querySelector('.quick-slot-plus'),small=btn.querySelector('small'),check=btn.querySelector('.quick-slot-check');
 if(img){img.hidden=!src;if(src)setSrc(img,src);}
 if(plus)plus.hidden=!!src;
 if(check)check.hidden=!src;
 if(small)small.textContent=src?'Lista':'Pendiente';
 btn.dataset.filled=String(!!src);
 const rot=document.querySelector('[data-quick-rotate="'+side+'"]');if(rot)rot.disabled=!src;
}
function update(){
 if(!quick||updating)return;updating=true;
 try{
  const card=document.querySelector('#colStageWorkspace .stage-canvas-area')?.closest('section'),actions=$('quickActions');
  if(card&&actions&&actions.previousElementSibling!==card)card.after(actions);
  const blocked=docActive()||(hasImages()&&root.state.activeCategory!=='docs');
  const main=$('quickMode')?.querySelector('.quick-main'),blk=$('quickMode')?.querySelector('.quick-blocked');
  if(main)main.hidden=blocked;if(blk)blk.hidden=!blocked;
  if(blocked){
   setText('quickBlockedText',docActive()?'El modo rápido es para INE / DNI. Termina o cierra el documento para usarlo.':'Tienes un trabajo abierto que no es INE / DNI. Termínalo o guárdalo y vuelve al modo rápido.');
   restoreBanner();return;
  }
  const w=describe(),miss=w.missing||[],front=imgOf('front'),back=imgOf('back');
  const scale=root.state.outputScalePercent||100;
  let meta=paperName()+' · '+scale+'% · 1 juego';
  if(root.RealScanPrinterProfiles?.getActive()&&rulerVerified()===false)meta+=' · Falta medir la regla de 50 mm';
  setText('quickMeta',meta);
  setText('quickStatus',!front&&!back?'Falta el frente':!back?'Frente lista · Ahora el reverso':(w.ready?'Capturas listas. Revisa la hoja antes de imprimir.':'Revisa la hoja antes de entregar.'));
  const statusEl=$('quickStatus');if(statusEl)statusEl.classList.toggle('is-ready',!!w.ready);
  const setStep=(id,state)=>{const el=$(id);if(el)el.dataset.state=state;};
  setStep('quickStep1',front?'done':'current');
  setStep('quickStep2',!front?'todo':back?'done':'current');
  setStep('quickStep3',postPrint?'done':w.ready?'current':'todo');
  renderSlot('front','Frente',front);renderSlot('back','Reverso',back);
  const scan=$('quickScanBtn');
  if(scan){
   if(miss.length){scan.hidden=false;const main=scan.querySelector('.quick-giant-main');if(main)main.textContent=miss[0]==='back'?'📷 Escanear reverso':'📷 Escanear frente';scan.dataset.side=miss[0];}
   else scan.hidden=true;
  }
  const fileBtn=$('quickFileBtn');if(fileBtn)fileBtn.hidden=!miss.length;
  const cur=miss[0]||null;
  if(prevMissing==='front'&&cur==='back'){const s=$('quickScanBtn');s?.scrollIntoView({block:'center',behavior:'auto'});s?.focus({preventScroll:true});}
  else if(prevMissing&&!cur&&w.ready){document.querySelector('#colStageWorkspace .stage-canvas-area')?.closest('section')?.scrollIntoView({block:'center',behavior:'auto'});}
  prevMissing=cur;
  moveBannerIn();
  const name=$('quickName');
  if(name&&document.activeElement!==name&&name.value!==(root.state.documentCustomTitle||''))name.value=root.state.documentCustomTitle||'';
  setText('quickScale',scale+'%');
  const printer=$('quickPrinter');
  if(printer){const st=$('workspacePrinterStatus')?.textContent||'';if(printer.textContent!==st)printer.textContent=st;}
  const busy=!!w.busy,ok=!miss.length&&!!w.ready&&!busy;
  const print=$('quickPrintBtn'),pdf=$('quickPdfBtn');
  if(print)print.disabled=!ok;if(pdf)pdf.disabled=!ok;
  setText('quickDeliverHint',postPrint?'':(!front&&!back?'Toca Escanear frente para empezar.':miss.length?'Falta '+(miss[0]==='back'?'el reverso':'el frente')+'.':busy?'Preparando imágenes…':'Revisa la hoja y elige cómo entregar.'));
  const deliver=$('quickActions')?.querySelector('.quick-deliver'),post=$('quickActions')?.querySelector('.quick-postprint');
  if(deliver)deliver.hidden=postPrint;if(post)post.hidden=!postPrint;
 }finally{updating=false;}
}
function enter(){
 quick=true;
 if(!unlocked()){update();return;}
 if(docActive()||(hasImages()&&root.state.activeCategory!=='docs')){prevMissing=(describe().missing||[])[0]||null;update();return;}
 if(!hasImages()){
  try{root.RealScanDeskPresets?.apply('ine');}catch(e){}
  setCleanFlags();refreshAll();
 }else{
  normalizeAdopted();
 }
 prevMissing=(describe().missing||[])[0]||null;
 update();
}
function exit(){
 quick=false;postPrint=false;prevMissing=null;restoreBanner();update();
}
function init(){
 if(mounted)return;
 if(!$('counterIntake')||!$('workbenchBar')){if(attempts++<25)setTimeout(init,200);return;}
 mounted=true;
 build();wire();
 new MutationObserver(()=>{
  const now=document.body.classList.contains('rs-quick');
  if(now===lastQuick)return;lastQuick=now;
  if(now)enter();else exit();
 }).observe(document.body,{attributes:true,attributeFilter:['class']});
 lastQuick=document.body.classList.contains('rs-quick');
 if(lastQuick)enter();
 document.addEventListener('realscan:studio-updated',update);
 document.addEventListener('realscan:document-updated',update);
 document.addEventListener('realscan:print-dialog-closed',()=>{if(quick){postPrint=true;update();}});
 /* El banner par INE se crea de forma asíncrona (promesa de detección) sin
    disparar ningún evento: sin este observador, en modo rápido podía quedarse
    anclado tras paneles ocultos y el operador nunca lo vería. */
 new MutationObserver(()=>{
  if(!quick||!document.getElementsByClassName('ine-pair-banner').length)return;
  moveBannerIn();
 }).observe(document.body,{childList:true,subtree:true});
 root.RealScanQuickMode={update,exit:exitQuick};
}
if(document.readyState==='complete')setTimeout(init,250);
else document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250));
})(window);
