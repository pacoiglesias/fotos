/* Local technical diagnostics: deliberately excludes free text and customer data. */
(function(global) {
  'use strict';
  const KEY = 'realscan_diagnostics_v1', MAX = 200, TTL = 14 * 86400000;
  let events = [], persistent = true, build = null;
  const staticIds = new Set(Array.from(document.querySelectorAll('[id]')).map(element=>element.id));
  for(const id of ['counterStart','counterDeliver','counterMore','counterShowDelivery','newServiceStart','newServiceModal','counterMoreModal','pendingDeliveryModal','pendingDeliveryRevoke'])staticIds.add(id);
  const session = global.crypto?.randomUUID?.() || String(Date.now());
  const allowedEvents = new Set(['draft.failed','camera.open','camera.close','camera.failed','camera.corrected','camera.full_frame','app.start','app.ready','ui.click','ui.feedback','modal.open','modal.close','modal.recover','receive.start','receive.ready','receive.failed','receive.cancelled','delivery.start','delivery.ready','delivery.failed','delivery.cancelled','pwa.request','pwa.accepted','pwa.dismissed','pwa.failed','pwa.fallback','pwa.installed','pwa.worker_failed','runtime.error','runtime.rejection','runtime.resource_failed','network.online','network.offline']);
  for (const event of ['layout.guides','image.fit','output.pdf','output.raster','camera.focus','camera.ready','camera.quality','counter.new-service','document.output']) allowedEvents.add(event);
  function cleanDetails(details) {
    const result = {};
    if (!details || typeof details !== 'object') return result;
    for (const key of ['guides','ruler','labels','supported','applied','hasEdges']) if (typeof details[key] === 'boolean') result[key] = details[key];
    if (['fit','cover'].includes(details.fitMode)) result.fitMode = details.fitMode;
    if (['id','photos','multi','custom','repeat','document'].includes(details.service)) result.service=details.service;
    if (['choose','qr','camera','file'].includes(details.source)) result.source=details.source;
    if (['print','digital','both'].includes(details.output)) result.output=details.output;
    if (typeof details.keepDelivery==='boolean') result.keepDelivery=details.keepDelivery;
    for (const key of ['depth','line','column','durationMs','count','widthPx','heightPx','brightness','sharpness']) if (Number.isFinite(details[key])) result[key] = Math.max(0, Math.min(100000000, Math.round(details[key])));
    for (const key of ['modal','control']) {
      const value = details[key], element = typeof value === 'string' ? document.getElementById(value) : null;
      if (element && staticIds.has(value) && /^[a-zA-Z][a-zA-Z0-9_-]{0,70}$/.test(value)) result[key] = value;
    }
    const types = ['Error','TypeError','ReferenceError','SyntaxError','RangeError','DOMException','FirebaseError','SecurityError','QuotaExceededError','NotAllowedError','AbortError'];
    if (types.includes(details.errorType)) result.errorType = details.errorType;
    const codes = ['auth/network-request-failed','auth/operation-not-allowed','auth/api-key-not-valid.-please-pass-a-valid-api-key.','auth/too-many-requests','auth/internal-error','PERMISSION_DENIED','permission_denied','NETWORK_ERROR','QuotaExceededError','AbortError','NotAllowedError'];
    if (codes.includes(details.code)) result.code = details.code;
    if (typeof details.file === 'string') {
      const file = details.file.split(/[?#]/)[0].split('/').pop();
      const known = Array.from(document.scripts).some(script => script.src && script.src.split(/[?#]/)[0].split('/').pop() === file);
      if (known && /^[a-zA-Z0-9_-]+\.(js|mjs)$/.test(file)) result.file = file;
    }
    return result;
  }
  function prune() { const cutoff = Date.now() - TTL; events = events.filter(event => event.at >= cutoff && event.at <= Date.now() + 1000 && allowedEvents.has(event.event)).slice(-MAX); }
  function persist() {
    prune();
    try { localStorage.setItem(KEY, JSON.stringify(events)); persistent = true; } catch (_) { persistent = false; }
  }
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (Array.isArray(stored)) events = stored.filter(e => e && Number.isFinite(e.at) && allowedEvents.has(e.event)).map(e => ({at:e.at, event:e.event, level:['info','warning','error'].includes(e.level)?e.level:'info', details:cleanDetails(e.details),build:typeof e.build==='string'&&/^realscan-[a-f0-9]{16}$/.test(e.build)?e.build:null}));
  } catch (_) { persistent = false; }
  function record(event, level = 'info', details) {
    try {
      if (!allowedEvents.has(event)) return;
      events.push({at:Date.now(),event:event,level:['info','warning','error'].includes(level)?level:'info',details:cleanDetails(details),build:build?.version || null});
      persist(); render();
    } catch (_) { /* Logging must never block the application. */ }
  }
  function snapshot() {
    prune();
    return {app:'RealScan',schemaVersion:2,site:location.hostname,appVersion:global.APP_VERSION || document.querySelector('meta[name="application-version"]')?.content || 'startup',build:build,session:session,online:navigator.onLine,persistence:persistent?'local':'memory',operation:operationContext(),events:JSON.parse(JSON.stringify(events))};
  }
  function operationContext() {
    try {
      const s = global.state || {}, layout = global.RealScanLayout?.computeDocumentLayout(s);
      const number = value => Number.isFinite(value) ? Math.max(-10000,Math.min(10000,Math.round(value*100)/100)) : null;
      return {
        category:['docs','photos','custom'].includes(s.activeCategory)?s.activeCategory:null,
        paper:layout ? {widthMm:number(layout.paper.widthMm),heightMm:number(layout.paper.heightMm)} : null,
        piece:layout ? {widthMm:number(layout.spec.widthMm),heightMm:number(layout.spec.heightMm)} : null,
        pages:layout?.pages.length || 0,pieces:layout?.pages.reduce((n,p)=>n+p.placements.length,0) || 0,
        guides:s.includeCutMarks!==false,ruler:s.includeRulerFooter!==false,labels:s.includeDocLabels!==false,
        previewEditing:!!s._previewEditEnabled,
        geometryErrors:layout?.errors.length || 0,geometryWarnings:layout?.warnings.length || 0,
        slots:['front','back','page3','page4'].map(side=>{const image=s.images?.[side] || {};return {side,loaded:!!image.processedDataUrl,fitMode:['fit','cover'].includes(image.fitMode)?image.fitMode:null,rotation:number(image.rotation),zoom:number(image.zoom),panX:number(image.panX),panY:number(image.panY)};}),
        viewport:{width:global.innerWidth,height:global.innerHeight,pixelRatio:global.devicePixelRatio}
      };
    } catch (_) { return null; }
  }
  const labels = {"draft.failed":"No se pudo guardar el borrador","camera.open":"Cámara abierta","camera.close":"Cámara cerrada","camera.failed":"Cámara no disponible","camera.corrected":"Encuadre confirmado","camera.full_frame":"Foto completa confirmada","app.start":"Inicio del sistema","app.ready":"Sistema preparado","ui.click":"Control seleccionado","ui.feedback":"Aviso mostrado","modal.open":"Ventana abierta","modal.close":"Ventana cerrada","modal.recover":"Controles recuperados","receive.start":"Conectando recepción","receive.ready":"Recepción preparada","receive.failed":"Falló la conexión de recepción","receive.cancelled":"Recepción cancelada","delivery.start":"Preparando entrega","delivery.ready":"Entrega preparada","delivery.failed":"Falló la entrega","delivery.cancelled":"Entrega cancelada","pwa.request":"Instalación solicitada","pwa.accepted":"Instalación aceptada","pwa.dismissed":"Instalación cancelada","pwa.failed":"Falló la instalación","pwa.fallback":"Ayuda de instalación abierta","pwa.installed":"Aplicación instalada","pwa.worker_failed":"No se pudo preparar el uso sin conexión","runtime.error":"Error de funcionamiento","runtime.rejection":"Operación sin completar","runtime.resource_failed":"No se pudo cargar un recurso","network.online":"Conexión recuperada","network.offline":"Sin conexión"};
  function render() {
    const summary = document.getElementById('diagnosticsSummary'), list = document.getElementById('diagnosticsEvents');
    if (summary) summary.textContent = events.length + ' eventos · ' + events.filter(e => e.level === 'error').length + ' errores · ' + (navigator.onLine ? 'Con conexión' : 'Sin conexión') + (persistent ? '' : ' · Registro temporal: almacenamiento no disponible');
    if (list) {
      list.replaceChildren();
      events.slice(-12).reverse().forEach(e => { const row = document.createElement('p'); row.textContent = new Date(e.at).toLocaleTimeString() + ' · ' + ({info:'Información',warning:'Aviso',error:'Error'}[e.level]) + ' · ' + (labels[e.event] || {'counter.new-service':'Nuevo servicio preparado','layout.guides':'Guías de corte cambiadas','image.fit':'Ajuste proporcional cambiado','output.pdf':'Hoja PDF preparada','output.raster':'Hoja de imagen preparada'}[e.event] || 'Evento del sistema'); list.appendChild(row); });
    }
  }
  function exportReport() {
    const blob = new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}), url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url; a.download='RealScan_Diagnostico_'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function recover() {
    global.closeAllModals?.();
    record('modal.recover','warning');
    global.showToast?.('Ventanas cerradas y controles recuperados. Tu trabajo se conserva.','info');
  }
  async function shareReport() {
    const file = new File([JSON.stringify(snapshot(),null,2)],'RealScan_Diagnostico_'+new Date().toISOString().slice(0,10)+'.json',{type:'application/json'});
    if (!navigator.canShare?.({files:[file]})) {exportReport();global.showToast?.('Diagnóstico descargado. Puedes adjuntarlo a este chat.','info');return;}
    try { await navigator.share({files:[file],title:'Diagnóstico RealScan'}); }
    catch(error) {if(error.name!=='AbortError'){exportReport();global.showToast?.('Se descargó el diagnóstico para compartirlo como archivo.','info');}}
  }
  global.RealScanDiagnostics = {record,snapshot,render,exportReport,recover};
  global.addEventListener('error',function(e) {
    if (e.target && e.target !== global && ['SCRIPT','LINK'].includes(e.target.tagName)) record('runtime.resource_failed','error',{file:e.target.src || e.target.href});
    else record('runtime.error','error',{errorType:e.error?.name,file:e.filename,line:e.lineno,column:e.colno});
  },true);
  global.addEventListener('unhandledrejection',e=>record('runtime.rejection','error',{errorType:e.reason?.name,code:e.reason?.code}));
  global.addEventListener('online',()=>record('network.online'));
  global.addEventListener('offline',()=>record('network.offline','warning'));
  document.addEventListener('keydown',e=>{if(e.altKey&&e.shiftKey&&e.key.toLowerCase()==='r'){e.preventDefault();recover();}});
  document.addEventListener('click',e=>{const button=e.target.closest?.('button[id]');if(button)record('ui.click','info',{control:button.id});},true);
  document.addEventListener('DOMContentLoaded',function() {
    document.getElementById('btnExportDiagnostics')?.addEventListener('click',exportReport);
    document.getElementById('btnShareDiagnostics')?.addEventListener('click',shareReport);
    document.getElementById('btnRecoverControls')?.addEventListener('click',recover);
    document.getElementById('btnClearDiagnostics')?.addEventListener('click',()=>{if(confirm('¿Borrar sólo el diagnóstico técnico? Tus trabajos se conservan.')){events=[];persist();render();}});
    render();
    fetch('version.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(value=>{if(value && /^realscan-[a-f0-9]{16}$/.test(value.version) && /^[a-f0-9]{40}$/.test(value.sourceCommit))build={version:value.version,sourceCommit:value.sourceCommit};}).catch(()=>{});
  });
  record('app.start');
})(window);
