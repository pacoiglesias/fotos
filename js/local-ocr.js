(function(root) {
  "use strict";
  let worker = null, epoch = 0, busy = false, externalSource=null,lastSuggestion=null,externalRequestId=null;
  function open(options = {}) {
      cancel(true);
    externalSource=options.dataUrl || null;externalRequestId=options.requestId||null;
    let modal = document.getElementById("localOcrModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "localOcrModal";
      modal.className = "hidden fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "localOcrTitle");
      modal.innerHTML = '<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-5 max-w-xl w-full space-y-3 max-h-[90vh] overflow-y-auto"><h2 id="localOcrTitle" class="font-bold text-lg">Reconocer texto en este equipo</h2><p class="text-xs">El procesamiento se hace en tu navegador. Revisa nombres y números: puede haber errores. No modifica la imagen ni envía su contenido a servidores.</p><label class="block">Imagen <select id="ocrSide" class="border rounded p-2 bg-white dark:bg-slate-800"><option value="front">Frente / Foto A</option><option value="back">Reverso / Foto B</option><option value="page3">Página 3</option><option value="page4">Página 4</option></select></label><label class="block">Idioma <select id="ocrLanguage" class="border rounded p-2 bg-white dark:bg-slate-800"><option value="spa">Español</option><option value="eng">Inglés</option></select></label><p id="ocrStatus" role="status" class="text-xs">Los recursos de reconocimiento se cargan al utilizarlos.</p><textarea id="ocrText" aria-label="Texto reconocido, editable para corregir" rows="8" class="w-full border rounded-xl p-3 bg-white dark:bg-slate-800"></textarea><div class="flex gap-2 flex-wrap"><button type="button" id="ocrRun" class="px-4 py-2 rounded bg-indigo-600 text-white">Extraer texto</button><button type="button" id="ocrCancel" class="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700">Cancelar proceso</button><button type="button" id="ocrCopy" class="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700">Copiar texto</button><button type="button" id="ocrDownload" class="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700">Descargar TXT</button><button type="button" data-close-modal="localOcrModal" class="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700">Cerrar</button></div></div>';
      document.body.append(modal);
      const $ = (id) => document.getElementById(id);
      $("ocrRun").onclick = run;
      $("ocrCancel").onclick = cancel;
      $("ocrCopy").onclick = async () => {
        try {
          await navigator.clipboard.writeText($("ocrText").value);
          $("ocrStatus").textContent = "Texto copiado.";
        } catch {
          $("ocrText").select();
          $("ocrStatus").textContent = "Selecciona el texto y cópialo desde el menú del navegador.";
        }
      };
      $("ocrDownload").onclick = () => {
        const blob = new Blob([$("ocrText").value], { type: "text/plain;charset=utf-8" }), url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url;
        a.download = "RealScan_texto_revisar.txt";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2e3);
      };
    }
    document.getElementById('ocrSide').closest('label').hidden=!!externalSource;
    openModal("localOcrModal");
  }
  async function cancel(clearText = false) {
    if(clearText===true){externalSource=null;lastSuggestion=null;}
    if(clearText===true){const text=document.getElementById("ocrText");if(text)text.value="";}
    const cancelledRevision = ++epoch;
    busy = false;
    document.getElementById("ocrRun")?.removeAttribute("disabled");
    const current = worker;
    worker = null;
    await current?.terminate().catch(() => {
    });
    const status = document.getElementById("ocrStatus");
    if (status && epoch===cancelledRevision) status.textContent = "Proceso cancelado. La imagen original se conserva.";
  }
  async function run() {
    if (busy) return;
    if(root.RealScanSearchable?.busy){document.getElementById("ocrStatus").textContent="Espera a que termine el PDF con texto o cancélalo desde el documento.";return;}
    const $ = (id) => document.getElementById(id), source = externalSource || root.state?.images[$("ocrSide").value]?.originalSrc;
    if (!source) {
      $("ocrStatus").textContent = "Carga una imagen en la cara seleccionada.";
      return;
    }
    busy = true;
    $("ocrRun").disabled = true;
    const revision = ++epoch, job = state._jobRevision || 0, documentRevision=root.RealScanDocuments?.status().revision,requestId=externalRequestId;
    let owned = null, timeout = null, canvas = null, stage = 'image';
    try {
      $("ocrStatus").textContent = "Preparando imagen para leer el texto…";
      const image = new Image(); image.src = source; await image.decode();
      if (revision !== epoch) return;
      const scale = Math.min(1, 2600 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d'); context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      stage = 'resources';
      $("ocrStatus").textContent = "Preparando lector e idioma. La primera vez puede tardar…";
      if (!root.Tesseract) await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "vendor/ocr/tesseract.min.js";
        const timer = setTimeout(() => { script.remove(); reject(Error('resources')); }, 20000);
        script.onload = () => { clearTimeout(timer); resolve(); };
        script.onerror = () => { clearTimeout(timer); script.remove(); reject(Error('resources')); };
        document.head.append(script);
      });
      if (revision !== epoch) return;
      const pending = Tesseract.createWorker($("ocrLanguage").value, 1, { workerPath: new URL("vendor/ocr/worker.min.js", location.href).href, corePath: new URL("vendor/ocr/core/", location.href).href, langPath: new URL("vendor/ocr/lang/", location.href).href, workerBlobURL: false, errorHandler: () => {}, logger: (m) => {
        if (revision === epoch) $("ocrStatus").textContent = "Reconociendo en este equipo… " + Math.round((m.progress || 0) * 100) + " %";
      } });
      pending.then(w => { if (revision !== epoch || stage === 'expired') w.terminate().catch(() => {}); }, () => {});
      const w = await Promise.race([pending, new Promise((_, reject) => { timeout = setTimeout(() => { stage = 'expired'; reject(Error('resources')); }, 60000); })]);
      clearTimeout(timeout); owned = w;
      if (revision !== epoch) {
        await w.terminate();
        return;
      }
      worker = w;
      stage = 'recognition';
      const result = await Promise.race([w.recognize(canvas), new Promise((_, reject) => { timeout = setTimeout(() => reject(Error('timeout')), 90000); })]);
      if (revision !== epoch || job !== (state._jobRevision || 0)||documentRevision!==root.RealScanDocuments?.status().revision) return;
      $("ocrText").value = result.data.text;
      lastSuggestion={job:state._jobRevision,documentRevision,suggestion:suggestDocument(result.data.text)};document.dispatchEvent(new CustomEvent('realscan:ocr-completed',{detail:{requestId,suggestion:structuredClone(lastSuggestion.suggestion)}}));
      $("ocrStatus").textContent = result.data.text.trim() ? "Texto listo para revisar. Confianza estimada: " + Math.round(result.data.confidence) + " %. Comprueba los datos contra la imagen." : "No se encontró texto legible. Endereza la página, mejora la luz y vuelve a intentar.";
      root.RealScanDiagnostics?.record('ocr.completed', 'info', {language: $("ocrLanguage").value, confidence: Math.round(result.data.confidence)});
    } catch {
      if (revision === epoch) {
        $("ocrStatus").textContent = stage === 'image' ? "No se pudo leer la imagen. Vuelve a cargarla; el original se conserva." : stage === 'resources' || stage === 'expired' ? "No se pudo cargar el lector o su idioma. Comprueba internet y pulsa Extraer texto para reintentar." : "El lector no pudo terminar. Prueba una página más nítida; la imagen se conserva.";
        root.RealScanDiagnostics?.record('ocr.failed', 'error', {stage});
      }
    } finally {
      clearTimeout(timeout);
      await owned?.terminate().catch(() => {});
      if(canvas)canvas.width=canvas.height=0;
      if (revision === epoch) {
        worker = null;
        busy = false;
        $("ocrRun").disabled = false;
      }
    }
  }
  /* Reconocimiento sin modal: para nombrar archivos y comparar CURP.
     No toca la interfaz ni el worker del modal; si el modal está en curso,
     devuelve null (el operador ya está leyendo esa imagen). Nunca lanza. */
  async function recognizeText(dataUrl, lang='spa') {
    if (busy || !dataUrl) return null;
    let owned = null, timeout = null, canvas = null;
    try {
      const image = new Image(); image.src = dataUrl; await image.decode();
      const scale = Math.min(1, 2600 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d'); context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (!root.Tesseract) await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "vendor/ocr/tesseract.min.js";
        const timer = setTimeout(() => { script.remove(); reject(Error('resources')); }, 20000);
        script.onload = () => { clearTimeout(timer); resolve(); };
        script.onerror = () => { clearTimeout(timer); script.remove(); reject(Error('resources')); };
        document.head.append(script);
      });
      const pending = Tesseract.createWorker(lang, 1, { workerPath: new URL("vendor/ocr/worker.min.js", location.href).href, corePath: new URL("vendor/ocr/core/", location.href).href, langPath: new URL("vendor/ocr/lang/", location.href).href, workerBlobURL: false, errorHandler: () => {}, logger: () => {} });
      const w = await Promise.race([pending, new Promise((_, reject) => { timeout = setTimeout(() => reject(Error('resources')), 60000); })]);
      clearTimeout(timeout); owned = w;
      const result = await Promise.race([w.recognize(canvas), new Promise((_, reject) => { timeout = setTimeout(() => reject(Error('timeout')), 90000); })]);
      return { text: result.data.text || '', confidence: Math.round(result.data.confidence || 0) };
    } catch { return null; }
    finally {
      clearTimeout(timeout);
      await owned?.terminate().catch(() => {});
      if (canvas) canvas.width = canvas.height = 0;
    }
  }
  function suggestDocument(text='',date=new Date()) {
    const value=String(text).slice(0,60000).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
    const day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    let type='Documento',tags=[];
    if(/INSTITUTO NACIONAL ELECTORAL|CREDENCIAL PARA VOTAR|\bINE\b|\bDNI\b/.test(value)){type='Identificación';tags=['Identificación','INE'];}
    else if(/ACTA.{0,35}NACIMIENTO|REGISTRO CIVIL/.test(value)){type='Acta de nacimiento';tags=['Actas','Nacimiento'];}
    else if(/COMPROBANTE.{0,25}DOMICILIO|COMISION FEDERAL DE ELECTRICIDAD|RECIBO.{0,20}(LUZ|AGUA|TELEFONO)/.test(value)){type='Comprobante de domicilio';tags=['Comprobantes','Domicilio'];}
    return {title:type+' · '+day,documentType:type,tags,source:'local-suggestion'};
  }
  root.RealScanOcr = { open, cancel, suggestDocument, recognizeText, getSuggestion(){return lastSuggestion&&lastSuggestion.job===state._jobRevision&&lastSuggestion.documentRevision===root.RealScanDocuments?.status().revision?structuredClone(lastSuggestion.suggestion):null;} };
  document.addEventListener('realscan:modal-closed',event=>{if(event.detail?.id==='localOcrModal')cancel();});
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancel();
  });
})(window);
