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
let updateRuns=0,updateQueued=false,bannerRelocating=false;
let resumeDismissed=false,resumeArmed=false,metricsStart=0,metricsTaps=0,metricsService='id';
function currentService(){return docActive()?'docs':root.state.activeCategory==='photos'?'photos':'id';}
function metricsReset(){metricsStart=Date.now();metricsTaps=0;metricsService=currentService();}
function metrics(){return {service:metricsService,taps:metricsTaps,seconds:metricsStart?Math.round((Date.now()-metricsStart)/1000):0};}
let optionHistory=[],historyJob=null;
function rememberOptions(){if(historyJob!==root.state._jobRevision){optionHistory=[];historyJob=root.state._jobRevision;}optionHistory.push({mode:root.state.printMode,paper:root.state.paperSize,sets:root.state.outputSets||1,scale:root.state.outputScalePercent||100});optionHistory=optionHistory.slice(-10);}
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
 try{const mode=root.state.printMode==='single'?'single':root.state.printMode==='both_separate'?'both_separate':'both';root.selectFormat?.('card',true);root.setPrintMode?.(mode);setCleanFlags();}catch(e){}
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
 '<nav class="quick-services" aria-label="Servicio del modo rápido"><button type="button" data-quick-service="id" aria-pressed="true">🪪 INE / DNI</button><button type="button" data-quick-service="photos" aria-pressed="false">📷 Fotos</button><button type="button" data-quick-service="docs" aria-pressed="false">📄 Documentos</button></nav>'
 +'<p id="quickResume" class="quick-resume" hidden><span id="quickResumeText"></span> <button type="button" id="quickResumeGo" aria-label="Seguir donde iba">Seguir</button> <button type="button" id="quickResumeNew" aria-label="Empezar un trabajo nuevo">Nuevo</button></p>'
 +'<div class="quick-main">'
 +'<p class="quick-kicker">MODO RÁPIDO</p><h2>INE / DNI — tamaño real</h2>'
 +'<div class="quick-steps" aria-hidden="true"><span id="quickStep1" class="quick-step" data-state="current">1 · Frente</span><span id="quickStep2" class="quick-step" data-state="todo">2 · Reverso</span><span id="quickStep3" class="quick-step" data-state="todo">3 · Entregar</span></div>'
 +'<p id="quickMeta" class="quick-meta"></p><p id="quickStatus" class="quick-status" role="status"></p>'
 +'<fieldset class="quick-sides"><legend>¿Qué necesitas copiar?</legend><div><button type="button" id="quickOnlyFront" aria-pressed="false">Solo frente</button><button type="button" id="quickBothSides" aria-pressed="true">Ambas juntas</button><button type="button" id="quickSeparateSides" aria-pressed="false">Una por hoja</button></div><button type="button" id="quickUndoOptions" class="quick-link" disabled>Deshacer último ajuste</button><p id="quickSidesHint">Puedes cambiarlo sin perder las fotos.</p></fieldset>'
 +'<div class="quick-job-options"><label>Papel<select id="quickJobPaper"><option value="letter">Carta</option><option value="a4">A4</option><option value="legal">Legal</option></select></label><label>Juegos<input id="quickSets" type="number" min="1" max="10" step="1" value="1" inputmode="numeric"></label></div>'
 +'<div class="quick-slots">'+slotHTML('front','Frente')+slotHTML('back','Reverso')+'</div>'
 +'<div id="quickPairHost"></div>'
 +'<button type="button" id="quickScanBtn" class="quick-giant quick-scan"><span class="quick-giant-main"><svg class="rs-ic" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8h3l2-2h6l2 2h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2v-9a2 2 0 012-2z"/><circle cx="12" cy="13" r="3.5"/></svg> Escanear frente</span><span class="quick-giant-sub">Toca para abrir la cámara</span></button>'
 +'<button type="button" id="quickFileBtn" class="quick-link">o subir un archivo</button>'
 +'<label class="quick-name">Nombre (opcional)<input id="quickName" type="text" maxlength="48" placeholder="Ej. INE de Juan Pérez" autocomplete="off"></label>'
 +'<div class="quick-foot"><button type="button" id="quickOtherService" class="quick-link">Otro servicio (fotos/documento)</button>'
 +'<button type="button" id="quickSettingsBtn" class="quick-gear" aria-label="Ajustes"><svg class="rs-ic" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button>'
 +'<button type="button" id="quickFullModeBtn" class="quick-link">Modo completo</button></div>'
 +'</div>'
 +'<div class="quick-photos" hidden>'
 +'<p class="quick-kicker">MODO RÁPIDO</p><h2>Fotos — listas para imprimir</h2>'
 +'<div class="quick-steps" aria-hidden="true"><span id="quickPhotoStep1" class="quick-step" data-state="current">1 · Trabajo</span><span id="quickPhotoStep2" class="quick-step" data-state="todo">2 · Foto</span><span id="quickPhotoStep3" class="quick-step" data-state="todo">3 · Entregar</span></div>'
 +'<p id="quickPhotoMeta" class="quick-meta"></p><p id="quickPhotoStatus" class="quick-status" role="status"></p>'
 +'<div class="quick-slots" style="grid-template-columns:repeat(3,1fr)">'
 +'<button type="button" class="quick-slot-btn" data-quick-photo="passport" aria-pressed="false"><span class="quick-slot-thumb"><span class="quick-slot-plus">🛂</span></span><strong>Pasaporte</strong><small>×4 · 3,5 × 4,5 cm</small></button>'
 +'<button type="button" class="quick-slot-btn" data-quick-photo="infantil" aria-pressed="false"><span class="quick-slot-thumb"><span class="quick-slot-plus">👶</span></span><strong>Infantil</strong><small>×6 · 2,5 × 3,0 cm</small></button>'
 +'<button type="button" class="quick-slot-btn" data-quick-photo="photo10x15" aria-pressed="false"><span class="quick-slot-thumb"><span class="quick-slot-plus">🖼️</span></span><strong>10 × 15</strong><small>×1 · 100 × 150 mm</small></button>'
 +'</div>'
 +'<div class="quick-job-options"><label>Fotos por juego<input id="quickPhotoCount" type="number" min="1" max="48" step="1" value="4" inputmode="numeric"></label><label>Juegos<input id="quickPhotoSets" type="number" min="1" max="10" step="1" value="1" inputmode="numeric"></label></div>'
 +'<div class="quick-slots" style="grid-template-columns:1fr"><article class="quick-slot"><button type="button" class="quick-slot-btn" id="quickPhotoSlotBtn" aria-label="Captura de la foto"><span class="quick-slot-thumb"><span class="quick-slot-plus">+</span><img alt="" hidden><span class="quick-slot-check" hidden>✓</span></span><strong>Foto</strong><small>Pendiente</small></button><div class="quick-slot-tools"><button type="button" id="quickPhotoRotate">↻ Girar</button><button type="button" id="quickPhotoReplace">Cambiar foto</button></div></article></div>'
 +'<button type="button" id="quickPhotoScanBtn" class="quick-giant quick-scan"><span class="quick-giant-main">📷 Escanear foto</span><span class="quick-giant-sub">Toca para abrir la cámara</span></button>'
 +'<button type="button" id="quickPhotoFileBtn" class="quick-link">o subir un archivo</button>'
 +'<div class="quick-foot"><button type="button" id="quickPhotoOtherService" class="quick-link">Otro servicio (INE/documento)</button><button type="button" id="quickPhotoFullModeBtn" class="quick-link">Modo completo</button></div>'
 +'</div>'
 +'<div class="quick-docs" hidden>'
 +'<p class="quick-kicker">MODO RÁPIDO</p><h2>Documentos — por páginas</h2>'
 +'<div class="quick-steps" aria-hidden="true"><span id="quickDocStep1" class="quick-step" data-state="current">1 · Páginas</span><span id="quickDocStep2" class="quick-step" data-state="todo">2 · Revisar</span><span id="quickDocStep3" class="quick-step" data-state="todo">3 · Entregar</span></div>'
 +'<p id="quickDocMeta" class="quick-meta"></p><p id="quickDocStatus" class="quick-status" role="status"></p>'
 +'<ul id="quickDocPages" class="quick-doc-pages"></ul>'
 +'<button type="button" id="quickDocScanBtn" class="quick-giant quick-scan"><span class="quick-giant-main">📷 Escanear página</span><span class="quick-giant-sub">Tras guardarla, el sistema pregunta si añades otra</span></button>'
 +'<button type="button" id="quickDocFileBtn" class="quick-link">o añadir archivos</button>'
 +'<label class="quick-name">Nombre (opcional)<input id="quickDocName" type="text" maxlength="48" placeholder="Ej. Contrato de arrendamiento" autocomplete="off"></label>'
 +'<p id="quickDocHint" class="quick-hint"></p>'
 +'<div class="quick-foot"><button type="button" id="quickDocFullModeBtn" class="quick-link">Modo completo</button></div></div>'
 +'<div class="quick-blocked" hidden><p class="quick-kicker">MODO RÁPIDO</p><h2>INE / DNI — tamaño real</h2>'
 +'<p id="quickBlockedText" class="quick-status"></p>'
 +'<button type="button" id="quickBlockedNew" class="quick-giant quick-scan">Empezar un trabajo nuevo</button><button type="button" id="quickBlockedExit" class="quick-link">Volver al modo completo</button></div>';
 intake.insertBefore(slots,intake.firstChild);
 const actions=document.createElement('section');
 actions.id='quickActions';actions.setAttribute('aria-label','Entregar trabajo rápido');
 actions.innerHTML=
 '<p class="quick-stamp"><span id="quickStampText">✓ Tamaño real · 85.60 × 53.98 mm · </span><span id="quickScale">100%</span></p>'
 +'<p id="quickPrinter" class="quick-printer"></p>'
 +'<div class="quick-deliver">'
 +'<button type="button" id="quickPrintBtn" class="quick-giant quick-print"><svg class="rs-ic" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg> Imprimir</button>'
 +'<button type="button" id="quickPdfBtn" class="quick-giant quick-pdf"><svg class="rs-ic" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-8H7v8M7 3v5h8"/></svg> Descargar PDF</button>'
 +'<div class="quick-extra-delivery"><button type="button" id="quickSendBtn">Enviar / QR</button><button type="button" id="quickArchiveBtn">Guardar en NAS</button></div>'
 +'<p id="quickDeliverHint" class="quick-hint"></p></div>'
 +'<div class="quick-postprint" hidden>'
 +'<button type="button" id="quickNewScanBtn" class="quick-giant quick-print"><svg class="rs-ic" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg> Nuevo escaneo</button>'
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
 if(!unlocked())return;
 if(docActive()){if(root.RealScanDocuments?.status().ready)$('docPrint')?.click();else root.showToast?.('Revisa y confirma todas las páginas antes de imprimir.','info');return;}
 const w=describe();
 if(w.busy)return;
 if((w.missing||[]).length||!w.ready){root.showToast?.(root.state.activeCategory==='photos'?'Captura la foto antes de imprimir.':'Completa el frente y el reverso antes de imprimir.','info');return;}
 root.handlePrintDirect?.();
}
function pdfQuick(){
 if(!unlocked())return;
 if(docActive()){if(root.RealScanDocuments?.status().ready)$('docPdf')?.click();else root.showToast?.('Revisa y confirma todas las páginas antes de guardar el PDF.','info');return;}
 const w=describe();
 if(w.busy)return;
 if((w.missing||[]).length||!w.ready){root.showToast?.(root.state.activeCategory==='photos'?'Captura la foto antes de guardar el PDF.':'Completa el frente y el reverso antes de guardar el PDF.','info');return;}
 root.handleExportPDF?.(false,true);
}
async function newScan(){
 if(!unlocked())return;
 if(root.state.activeCategory==='photos'){
  try{await root.RealScanCounter?.startPrepared('photos',true);}
  catch(e){root.showToast?.(e.message||'No se pudo preparar el nuevo escaneo.','warning');return;}
  postPrint=false;update();
  document.getElementById('quickMode')?.scrollIntoView({block:'start',behavior:'auto'});
  return;
 }
 try{await root.RealScanCounter?.startPrepared('id',true);}
 catch(e){root.showToast?.(e.message||'No se pudo preparar el nuevo escaneo.','warning');return;}
 applyQuickDefaults();postPrint=false;update();
 document.getElementById('quickMode')?.scrollIntoView({block:'start',behavior:'auto'});
}
function wire(){
 for(const [id,mode]of [['quickOnlyFront','single'],['quickBothSides','both'],['quickSeparateSides','both_separate']])$(id).onclick=()=>{if(!unlocked()||describe().busy)return;rememberOptions();root.setPrintMode(mode);postPrint=false;refreshAll();update();};
 $('quickUndoOptions').onclick=()=>{if(!unlocked()||describe().busy||historyJob!==root.state._jobRevision||!optionHistory.length)return;const previous=optionHistory.pop();root.setPrintMode(previous.mode);root.setPaperSize(previous.paper,true);root.state.outputSets=previous.sets;root.state.outputScalePercent=previous.scale;postPrint=false;refreshAll();update();};
 $('quickJobPaper').onchange=e=>{if(!unlocked()||describe().busy)return;rememberOptions();root.setPaperSize(e.target.value,true);postPrint=false;refreshAll();update();};
 $('quickSets').onchange=e=>{if(!unlocked()||describe().busy)return;rememberOptions();root.state.outputSets=Math.max(1,Math.min(10,Math.round(Number(e.target.value)||1)));postPrint=false;refreshAll();update();};
 $('quickSendBtn').onclick=()=>{if(unlocked()&&describe().ready&&!describe().busy)root.RealScanPdfDelivery?.open({destination:'digital'});};
 $('quickArchiveBtn').onclick=()=>{if(!unlocked())return;if(docActive()){archiveQuickDoc();return;}if(describe().ready&&!describe().busy)root.RealScanPdfDelivery?.open({destination:'paperless'});};
 $('quickScanBtn').onclick=()=>scanSide(pendingSide());
 for(const b of document.querySelectorAll('[data-quick-photo]'))b.onclick=()=>{if(!unlocked()||describe().busy)return;const kind=b.dataset.quickPhoto;try{root.RealScanDeskPresets?.apply(kind,kind==='infantil'?6:undefined);}catch(e){}postPrint=false;refreshAll();update();};
 $('quickPhotoCount').onchange=e=>{if(!unlocked()||describe().busy)return;root.setPhotoCopies?.(Math.max(1,Math.min(48,Math.round(Number(e.target.value)||1))));postPrint=false;refreshAll();update();};
 $('quickPhotoSets').onchange=e=>{if(!unlocked()||describe().busy)return;root.state.outputSets=Math.max(1,Math.min(10,Math.round(Number(e.target.value)||1)));postPrint=false;refreshAll();update();};
 $('quickPhotoScanBtn').onclick=()=>scanSide('front');
 $('quickPhotoFileBtn').onclick=()=>fileFor('front');
 $('quickPhotoSlotBtn').onclick=()=>{if(!unlocked())return;if(imgOf('front'))root.RealScanCapturePreviews?.open('front');else scanSide('front');};
 $('quickPhotoRotate').onclick=()=>{if(!unlocked())return;root.RealScanStudio?.selectSlot('front');document.querySelector('[data-rotate="front"]')?.click();};
 $('quickPhotoReplace').onclick=()=>{if(unlocked())fileFor('front');};
 $('quickPhotoOtherService').onclick=exitQuick;
 $('quickPhotoFullModeBtn').onclick=exitQuick;
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
 for(const b of document.querySelectorAll('[data-quick-service]'))b.onclick=()=>switchService(b.dataset.quickService);
 $('quickDocScanBtn').onclick=()=>{if(unlocked()&&!root.RealScanDocuments?.status().busy)$('docCamera')?.click();};
 $('quickDocFileBtn').onclick=()=>{if(unlocked())$('docImport')?.click();};
 $('quickDocName').addEventListener('input',e=>{root.state.documentCustomTitle=e.target.value;});
 $('quickDocName').addEventListener('change',()=>{try{root.saveActiveDraft?.();}catch(e){}});
 $('quickDocFullModeBtn').onclick=exitQuick;
 $('quickResumeGo').onclick=()=>{resumeDismissed=true;const r=$('quickResume');if(r)r.hidden=true;document.getElementById('quickMode')?.scrollIntoView({block:'start',behavior:'auto'});};
 $('quickResumeNew').onclick=async()=>{if(!unlocked())return;if(!confirm('Se empezará un trabajo nuevo del mismo servicio. ¿Continuar?'))return;resumeDismissed=true;try{await root.RealScanCounter?.startPrepared(currentService()==='docs'?'document':currentService(),true);if(currentService()==='id')applyQuickDefaults();metricsReset();update();}catch(e){root.showToast?.(e.message||'No se pudo empezar de nuevo.','warning');}};
 document.addEventListener('click',e=>{if(!quick)return;const t=e.target.closest?.('#quickMode,#quickActions');if(t){metricsTaps++;if(e.target.closest?.('#quickPrintBtn,#quickPdfBtn,#quickArchiveBtn,#quickSendBtn'))root.RealScanDiagnostics?.record('quick.metrics','info',metrics());}},true);
 $('quickBlockedNew').onclick=async()=>{if(!unlocked())return;if(!confirm('Se empezará un trabajo nuevo de INE / DNI. El trabajo actual se conserva en el historial de borradores si estaba guardado. ¿Continuar?'))return;try{await root.RealScanCounter?.startPrepared('id',true);applyQuickDefaults();postPrint=false;update();}catch(e){root.showToast?.(e.message||'No se pudo empezar el trabajo nuevo.','warning');}};
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
async function switchService(kind){
 if(!unlocked()||describe().busy)return;
 const target=kind==='docs'?'document':kind;
 const current=docActive()?'document':root.state.activeCategory==='photos'?'photos':'id';
 if(current===target){update();return;}
 try{await root.RealScanCounter?.startPrepared(target,false);}
 catch(e){
  if(!confirm('Cambiar de servicio guardará el trabajo actual como borrador. ¿Continuar?'))return;
  try{await root.RealScanCounter?.startPrepared(target,true);}catch(e2){root.showToast?.(e2.message||'No se pudo cambiar de servicio.','warning');return;}
 }
 if(target==='id')applyQuickDefaults();
 postPrint=false;metricsReset();update();
 document.getElementById('quickMode')?.scrollIntoView({block:'start',behavior:'auto'});
}
async function archiveQuickDoc(){
 if(!unlocked())return;const docs=root.RealScanDocuments;if(!docs?.status().ready){root.showToast?.('Revisa y confirma todas las páginas antes de archivar.','info');return;}
 try{
  const pdf=await docs.makePdf();const blob=pdf.output('blob');
  const meta=await root.RealScanPaperlessMetadata?.review(root.state.documentCustomTitle||'Documento',{});
  if(!meta)return;
  const receipt=await root.RealScanPaperless?.send(blob,meta.title,null,{metadata:meta,operationId:'quick-doc-'+Date.now()});
  root.showToast?.(receipt?.status==='archived'?'Documento archivado en Paperless.':'Paperless está procesando el documento.','info');
 }catch(e){root.showToast?.(e.message||'No se pudo archivar el documento.','warning');}
}
function moveBannerIn(){
 const banner=document.querySelector('.ine-pair-banner'),host=$('quickPairHost');
 if(!banner||!host||banner.parentElement===host||bannerRelocating)return;
 bannerRelocating=true;
 try{bannerHome={parent:banner.parentElement,next:banner.nextSibling};host.append(banner);}finally{bannerRelocating=false;}
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
 if(!quick)return;
 if(updating){updateQueued=true;return;}
 updating=true;updateRuns++;
 try{
  const card=document.querySelector('#colStageWorkspace .stage-canvas-area')?.closest('section'),actions=$('quickActions');
  if(card&&actions&&actions.previousElementSibling!==card)card.after(actions);
  const docsMode=docActive();
  const photosMode=!docsMode&&root.state.activeCategory==='photos';
  const blocked=!docsMode&&!photosMode&&hasImages()&&root.state.activeCategory==='custom';
  const main=$('quickMode')?.querySelector('.quick-main'),blk=$('quickMode')?.querySelector('.quick-blocked');
 const photosView=$('quickMode')?.querySelector('.quick-photos');
 const docsView=$('quickMode')?.querySelector('.quick-docs');
 for(const b of document.querySelectorAll('[data-quick-service]'))b.setAttribute('aria-pressed',String((b.dataset.quickService==='docs'&&docsMode)||(b.dataset.quickService==='photos'&&photosMode)||(b.dataset.quickService==='id'&&!docsMode&&!photosMode)));
 if(photosView)photosView.hidden=!photosMode;
 if(docsView)docsView.hidden=!docsMode;
 if(main)main.hidden=blocked||photosMode||docsMode;if(blk)blk.hidden=!blocked;
 {const resume=$('quickResume');if(resume){const pending=hasImages()||(root.RealScanDocuments?.status().count||0)>0;if(!pending)resumeArmed=false;resume.hidden=!(pending&&resumeArmed)||resumeDismissed;if(pending&&resumeArmed&&!resumeDismissed)setText('quickResumeText','⏸ Trabajo rápido sin terminar');}}
 if(photosMode){updatePhotos();restoreBanner();return;}
 if(docsMode){updateDocs();restoreBanner();return;}
  if(blocked){
   setText('quickBlockedText','Tienes un trabajo abierto de otro tipo. Puedes empezar un trabajo nuevo sin salir del modo rápido, o volver al modo completo.');
   restoreBanner();return;
  }
  const w=describe(),miss=w.missing||[],front=imgOf('front'),back=imgOf('back');
  if(historyJob!==root.state._jobRevision){optionHistory=[];historyJob=root.state._jobRevision;}if($('quickUndoOptions'))$('quickUndoOptions').disabled=!!w.busy||!optionHistory.length;
  const single=root.state.printMode==='single';
  for(const [id,selected]of [['quickOnlyFront',single],['quickBothSides',root.state.printMode==='both'],['quickSeparateSides',root.state.printMode==='both_separate']]){const button=$(id);button?.setAttribute('aria-pressed',String(selected));if(button)button.disabled=!!w.busy;}
  const backSlot=document.querySelector('[data-quick-slot=back]');if(backSlot)backSlot.hidden=single;
  $('quickMode')?.classList.toggle('quick-single',single);
  if($('quickJobPaper')){$('quickJobPaper').value=root.state.paperSize;$('quickJobPaper').disabled=!!w.busy;}if($('quickSets')){if(document.activeElement!==$('quickSets'))$('quickSets').value=root.state.outputSets||1;$('quickSets').disabled=!!w.busy;}
  setText('quickSidesHint',single?'Solo se entregará el frente. El reverso capturado se conserva al cambiar.':(root.state.printMode==='both_separate'?'Una cara por hoja, conservando tamaño real.':'Ambas caras, juntas en una hoja y a tamaño real.'));
  setText('quickStep2',single?'2 · Revisar':'2 · Reverso');
  const scale=root.state.outputScalePercent||100;
  let meta=paperName()+' · '+scale+'% · '+(root.state.outputSets||1)+' juego(s) · '+w.layout.pages.length+' hoja(s)';
  if(root.RealScanPrinterProfiles?.getActive()&&rulerVerified()===false)meta+=' · Falta medir la regla de 50 mm';
  setText('quickMeta',meta);
  setText('quickStatus',!front?'Paso 1 de 3 · Frente: captura o sube el frente':single?(w.ready?'Paso 3 de 3 · Entregar: Frente listo.':'Paso 2 de 3 · Revisar el frente…'):!back?'Paso 2 de 3 · Reverso: frente listo, ahora el reverso':(w.ready?'Paso 3 de 3 · Entregar: capturas listas, revisa la hoja.':'Paso 2 de 3 · Revisar la hoja antes de entregar.'));
  const statusEl=$('quickStatus');if(statusEl)statusEl.classList.toggle('is-ready',!!w.ready);
  const setStep=(id,state)=>{const el=$(id);if(el)el.dataset.state=state;};
  setStep('quickStep1',front?'done':'current');
  setStep('quickStep2',!front?'todo':single?'done':back?'done':'current');
  setStep('quickStep3',postPrint?'done':w.ready?'current':'todo');
  renderSlot('front','Frente',front);renderSlot('back','Reverso',back);
  const scan=$('quickScanBtn');
  if(scan){
   if(miss.length){scan.hidden=false;const main=scan.querySelector('.quick-giant-main');if(main)main.innerHTML=miss[0]==='back'?'<svg class="rs-ic" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8h3l2-2h6l2 2h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2v-9a2 2 0 012-2z"/><circle cx="12" cy="13" r="3.5"/></svg> Escanear reverso':'<svg class="rs-ic" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8h3l2-2h6l2 2h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2v-9a2 2 0 012-2z"/><circle cx="12" cy="13" r="3.5"/></svg> Escanear frente';scan.dataset.side=miss[0];}
   else scan.hidden=true;
  }
  const fileBtn=$('quickFileBtn');if(fileBtn)fileBtn.hidden=!miss.length;
  const cur=miss[0]||null;
  /* A4: al confirmar el frente, abrir directamente la cámara del reverso
     (modo ambas caras). El operador puede omitirlo con «Solo frente» o
     cerrando la cámara; se reintenta si aún hay un diálogo abierto. */
  if(prevMissing==='front'&&cur==='back'&&root.state.printMode!=='single'){
   const jobRev=root.state._jobRevision;let tries=0;
   const tryAdvance=()=>{
    tries++;
    if(!quick||!unlocked())return;
    if(root.state._jobRevision!==jobRev)return;
    if((describe().missing||[])[0]!=='back')return;
    if(document.querySelector('dialog[open]')||document.querySelector('.counter-overlay:not(.hidden)')){
     if(tries<3)setTimeout(tryAdvance,700);
     return;
    }
    root.showToast?.('Frente listo. Abriendo la cámara del reverso — toca «Solo frente» si no lo necesitas.','info');
    scanSide('back');
   };
   setTimeout(tryAdvance,700);
  }
  else if(prevMissing&&!cur&&w.ready){document.querySelector('#colStageWorkspace .stage-canvas-area')?.closest('section')?.scrollIntoView({block:'center',behavior:'auto'});}
  prevMissing=cur;
  moveBannerIn();
  const name=$('quickName');
  if(name&&document.activeElement!==name&&name.value!==(root.state.documentCustomTitle||''))name.value=root.state.documentCustomTitle||'';
  setText('quickStampText','✓ Tamaño real · 85.60 × 53.98 mm · ');
 setText('quickScale',scale+'%');
  const printer=$('quickPrinter');
  if(printer){const st=$('workspacePrinterStatus')?.textContent||'';if(printer.textContent!==st)printer.textContent=st;}
  const busy=!!w.busy,ok=!miss.length&&!!w.ready&&!busy;
  if(actions)actions.dataset.ready=String(ok);if($('quickMode'))$('quickMode').dataset.ready=String(ok);
  const print=$('quickPrintBtn'),pdf=$('quickPdfBtn');
  if(print)print.disabled=!ok;if(pdf)pdf.disabled=!ok;for(const id of ['quickSendBtn','quickArchiveBtn'])if($(id))$(id).disabled=!ok;
  setText('quickDeliverHint',postPrint?'':(!front&&!back?'Toca Escanear frente para empezar.':miss.length?'Falta '+(miss[0]==='back'?'el reverso':'el frente')+'.':busy?'Preparando imágenes…':'Revisa la hoja y elige cómo entregar.'));
  const deliver=$('quickActions')?.querySelector('.quick-deliver'),post=$('quickActions')?.querySelector('.quick-postprint');
  if(deliver)deliver.hidden=postPrint;if(post)post.hidden=!postPrint;
 }finally{updating=false;if(updateQueued){updateQueued=false;update();}}
}
function updateDocs(){
 const st=root.RealScanDocuments?.status()||{count:0,reviewed:0,ready:false,busy:false};
 const pages=root.RealScanDocuments?.listPages()||[];
 setText('quickDocMeta',st.count+' página(s) · '+st.reviewed+' revisada(s)');
 setText('quickDocStatus',!st.count?'Paso 1 de 3 · Páginas: escanea la primera página o añade archivos':st.busy?'Preparando páginas…':st.ready?'Paso 3 de 3 · Entregar: documento listo.':'Página '+st.count+' escaneada · '+st.reviewed+' de '+st.count+' revisadas · ¿otra página o terminar? Revisa las que falten para entregar.');
 const setStep=(id,state)=>{const el=$(id);if(el)el.dataset.state=state;};
 setStep('quickDocStep1',st.count?'done':'current');
 setStep('quickDocStep2',!st.count?'todo':st.ready?'done':'current');
 setStep('quickDocStep3',st.ready?'current':'todo');
 const list=$('quickDocPages');
 if(list){list.replaceChildren();pages.forEach((p,i)=>{const li=document.createElement('li');li.textContent='Página '+(i+1);list.append(li);});}
 const scan=$('quickDocScanBtn');if(scan){const main=scan.querySelector('.quick-giant-main');if(main)main.textContent=st.count?'📷 Escanear otra página':'📷 Escanear página';scan.disabled=!!st.busy;}
 setText('quickDocHint',st.count&&!st.ready?'Las páginas se confirman al escanearlas en lote; si alguna queda sin revisar, ábrela en el modo completo.':'');
 setText('quickStampText','✓ Documento · '+st.count+' página(s) · ');
 setText('quickScale','');
 {const ok=!!st.ready&&!st.busy;const print=$('quickPrintBtn'),pdf=$('quickPdfBtn');if(print)print.disabled=!ok;if(pdf)pdf.disabled=!ok;for(const id of ['quickSendBtn','quickArchiveBtn'])if($(id))$(id).disabled=!ok;const actions=$('quickActions');if(actions)actions.dataset.ready=String(ok);
  setText('quickDeliverHint',!st.count?'Escanea la primera página para empezar.':st.ready?'Revisa y elige cómo entregar: Imprimir, Guardar PDF o Guardar en NAS.':'Faltan páginas por revisar ('+st.reviewed+' de '+st.count+' confirmadas).');}
 const name=$('quickDocName');if(name&&document.activeElement!==name&&name.value!==(root.state.documentCustomTitle||''))name.value=root.state.documentCustomTitle||'';
}
function renderPhotoSlot(src){
 const btn=$('quickPhotoSlotBtn');if(!btn)return;
 const img=btn.querySelector('img'),plus=btn.querySelector('.quick-slot-plus'),small=btn.querySelector('small'),check=btn.querySelector('.quick-slot-check');
 if(img){img.hidden=!src;if(src)setSrc(img,src);}
 if(plus)plus.hidden=!!src;
 if(check)check.hidden=!src;
 if(small)small.textContent=src?'Lista':'Pendiente';
 btn.dataset.filled=String(!!src);
 const rot=$('quickPhotoRotate');if(rot)rot.disabled=!src;
}
/* B2: vista rápida de fotos — 3 trabajos habituales con sus valores por
   defecto, un botón gigante de escaneo y entrega directa. Reutiliza el mismo
   panel de entrega que el modo INE (#quickActions) y los mismos motores. */
function updatePhotos(){
 const w=describe(),miss=w.missing||[],front=imgOf('front');
 const cur=root.state.format;
 for(const b of document.querySelectorAll('[data-quick-photo]')){
  const kind=b.dataset.quickPhoto;
  const active=(kind==='passport'&&cur==='photo_passport')||(kind==='infantil'&&cur==='photo_infantil')||(kind==='photo10x15'&&cur==='photo_10x15');
  b.setAttribute('aria-pressed',String(active));b.dataset.filled=String(active);
 }
 const spec=root.getActiveSpec?.();
 setText('quickPhotoMeta',(spec?spec.shortName:'')+' · '+(root.state.photoCopies||1)+' foto(s) por juego · '+(root.state.outputSets||1)+' juego(s) · '+paperName());
 setText('quickPhotoStatus',!front?'Paso 1 de 3 · Trabajo: elige el trabajo y toca Escanear foto':w.ready?'Paso 3 de 3 · Entregar: foto lista, revisa la hoja.':'Paso 2 de 3 · Foto: preparando la foto…');
 const statusEl=$('quickPhotoStatus');if(statusEl)statusEl.classList.toggle('is-ready',!!w.ready);
 const setStep=(id,state)=>{const el=$(id);if(el)el.dataset.state=state;};
 setStep('quickPhotoStep1',cur?'done':'current');
 setStep('quickPhotoStep2',!front?'todo':w.ready?'done':'current');
 setStep('quickPhotoStep3',postPrint?'done':w.ready?'current':'todo');
 renderPhotoSlot(front);
 const scan=$('quickPhotoScanBtn');
 if(scan){const main=scan.querySelector('.quick-giant-main');if(main)main.textContent=front?'📷 Repetir foto':'📷 Escanear foto';}
 const count=$('quickPhotoCount');if(count&&document.activeElement!==count)count.value=root.state.photoCopies||1;
 const sets=$('quickPhotoSets');if(sets&&document.activeElement!==sets)sets.value=root.state.outputSets||1;
 setText('quickStampText','✓ Foto a tamaño real · '+(spec?spec.shortName:'')+' · ');
 setText('quickScale',(root.state.outputScalePercent||100)+'%');
 const ok=!miss.length&&!!w.ready&&!w.busy;
 const actions=$('quickActions');
 if(actions)actions.dataset.ready=String(ok);if($('quickMode'))$('quickMode').dataset.ready=String(ok);
 const print=$('quickPrintBtn'),pdf=$('quickPdfBtn');
 if(print)print.disabled=!ok;if(pdf)pdf.disabled=!ok;for(const id of ['quickSendBtn','quickArchiveBtn'])if($(id))$(id).disabled=!ok;
 setText('quickDeliverHint',postPrint?'':(!front?'Toca Escanear foto para empezar.':miss.length?'Falta la foto.':w.busy?'Preparando la foto…':'Revisa la hoja y elige cómo entregar.'));
 const deliver=$('quickActions')?.querySelector('.quick-deliver'),post=$('quickActions')?.querySelector('.quick-postprint');
 if(deliver)deliver.hidden=postPrint;if(post)post.hidden=!postPrint;
}
function enter(){
 quick=true;metricsReset();resumeDismissed=false;
 // La recuperación solo se ofrece si el trabajo ya existía al entrar
 // (p. ej. tras una traba o un cierre); nunca sobre el trabajo en curso.
 resumeArmed=hasImages()||(root.RealScanDocuments?.status().count||0)>0;
 if(!unlocked()){update();return;}
 if(root.state.activeCategory==='photos'||docActive()){prevMissing=(describe().missing||[])[0]||null;update();return;}
 if(hasImages()&&root.state.activeCategory==='custom'){prevMissing=null;update();return;}
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
 build();wire();const slotGrid=document.querySelector('#quickMode .quick-slots');if(slotGrid)slotGrid.before($('quickScanBtn'),$('quickFileBtn'));
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
    disparar ningún evento. CAUSA RAÍZ de la traba (3.41): el observador
    anterior vigilaba childList+subtree de TODO el body, así que cada
    mutación de la app (y las del propio update()) lo disparaba, y su
    moveBannerIn competía con restoreBanner() en un ping-pong de DOM.
    Ahora se observa SOLO la lista de hijos (sin subtree) de los padres de
    los anclas donde el banner se inserta (tras #capturePreviewRail,
    #studioImageTray o #deskStart): barato, acotado y sin realimentación
    (al moverlo, el banner ya está en su destino y la guarda lo detiene). */
 const bannerParents=new Set();
 for(const id of ['capturePreviewRail','studioImageTray','deskStart']){const a=$(id);if(a?.parentElement)bannerParents.add(a.parentElement);}
 const bannerObserver=new MutationObserver(()=>{
  if(!quick||bannerRelocating)return;
  const banner=document.querySelector('.ine-pair-banner');
  if(banner&&banner.parentElement!==$('quickPairHost'))moveBannerIn();
 });
 for(const p of bannerParents)bannerObserver.observe(p,{childList:true});
 root.RealScanQuickMode={update,exit:exitQuick,stats:()=>({runs:updateRuns,queued:updateQueued}),metrics};
}
if(document.readyState==='complete')setTimeout(init,250);
else document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250));
})(window);
