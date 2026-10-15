(function(root) {
  "use strict";
  let worker = null, epoch = 0, busy = false;
  function open() {
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
    openModal("localOcrModal");
  }
  async function cancel(clearText = false) {
    if(clearText===true){const text=document.getElementById("ocrText");if(text)text.value="";}
    ++epoch;
    busy = false;
    document.getElementById("ocrRun")?.removeAttribute("disabled");
    const current = worker;
    worker = null;
    await current?.terminate().catch(() => {
    });
    const status = document.getElementById("ocrStatus");
    if (status) status.textContent = "Proceso cancelado. La imagen original se conserva.";
  }
  async function run() {
    if (busy) return;
    const $ = (id) => document.getElementById(id), source = root.state?.images[$("ocrSide").value]?.originalSrc;
    if (!source) {
      $("ocrStatus").textContent = "Carga una imagen en la cara seleccionada.";
      return;
    }
    busy = true;
    $("ocrRun").disabled = true;
    const revision = ++epoch, job = state._jobRevision || 0;
    try {
      $("ocrStatus").textContent = "Preparando reconocimiento local…";
      if (!root.Tesseract) await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "vendor/ocr/tesseract.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      if (revision !== epoch) return;
      const w = await Tesseract.createWorker($("ocrLanguage").value, 1, { workerPath: new URL("vendor/ocr/worker.min.js", location.href).href, corePath: new URL("vendor/ocr/core/", location.href).href, langPath: new URL("vendor/ocr/lang/", location.href).href, workerBlobURL: false, logger: (m) => {
        if (revision === epoch) $("ocrStatus").textContent = "Reconociendo en este equipo… " + Math.round((m.progress || 0) * 100) + " %";
      } });
      if (revision !== epoch) {
        await w.terminate();
        return;
      }
      worker = w;
      const result = await w.recognize(source);
      if (revision !== epoch || job !== (state._jobRevision || 0)) return;
      $("ocrText").value = result.data.text;
      $("ocrStatus").textContent = "Texto listo para revisar. Confianza estimada: " + Math.round(result.data.confidence) + " %. Comprueba los datos contra la imagen.";
    } catch {
      if (revision === epoch) $("ocrStatus").textContent = "No se pudo completar el OCR. Comprueba conexión para preparar sus recursos o prueba una imagen más nítida.";
    } finally {
      if (revision === epoch) {
        await worker?.terminate().catch(() => {
        });
        worker = null;
        busy = false;
        $("ocrRun").disabled = false;
      }
    }
  }
  root.RealScanOcr = { open, cancel };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancel();
  });
})(window);
