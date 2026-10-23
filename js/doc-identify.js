/* RealScan — Identificación de documentos por OCR local (v3.13.0).
   AÑADIDO 9.2: propone el nombre del trabajo («INE — Nombre Apellidos») a
   partir del nombre y el número de documento extraídos con el OCR local.
   AÑADIDO 10.2: reconoce el tipo (INE, DNI, pasaporte, licencia) por el
   texto; sin una palabra clave clara NO sugiere nada (antes genérico que
   inventado). Todo el OCR corre en el dispositivo (Tesseract en vendor/ocr);
   si algo falla, se conserva el comportamiento anterior. */
(function () {
  'use strict';

  let enginePromise = null;
  function loadEngine() {
    if (window.Tesseract) return Promise.resolve();
    if (enginePromise) return enginePromise;
    enginePromise = new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      const timer = setTimeout(function () { cleanup(); reject(new Error('ocr-timeout')); }, 25000);
      function cleanup() { clearTimeout(timer); script.remove(); }
      script.src = 'vendor/ocr/tesseract.min.js';
      script.onload = function () { cleanup(); window.Tesseract ? resolve() : reject(new Error('ocr-missing')); };
      script.onerror = function () { cleanup(); reject(new Error('ocr-load')); };
      document.head.appendChild(script);
    });
    enginePromise.catch(function () { enginePromise = null; });
    return enginePromise;
  }

  function extract(text) {
    const raw = String(text || '');
    const upper = raw.replace(/\s+/g, ' ').toUpperCase();
    let type = null, typeLabel = null, formatKey = null;
    if (/INSTITUTO NACIONAL ELECTORAL|CREDENCIAL PARA VOTAR|CLAVE DE ELECTOR/.test(upper)) { type = 'ine'; typeLabel = 'INE'; formatKey = 'card'; }
    else if (/PASAPORTE|PASSPORT/.test(upper)) { type = 'pasaporte'; typeLabel = 'Pasaporte'; formatKey = null; }
    else if (/DOCUMENTO NACIONAL DE IDENTIDAD/.test(upper) || (/\bDNI\b/.test(upper) && /ESPANA|ESPAÑA|MINISTERIO DEL INTERIOR|REINO DE ESPANA/.test(upper))) { type = 'dni'; typeLabel = 'DNI'; formatKey = 'card'; }
    else if (/LICENCIA (PARA|DE) CONDUCIR|PERMISO (PARA|DE) CONDUCIR|DRIVER/.test(upper)) { type = 'licencia'; typeLabel = 'Licencia'; formatKey = 'card'; }
    if (!type) return null;

    let docNumber = null;
    if (type === 'ine') { const m = upper.match(/\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}\b/); if (m) docNumber = m[0]; }
    if (type === 'dni') { const m = upper.match(/\b\d{8}[A-Z]\b/); if (m) docNumber = m[0]; }

    let personName = null;
    const lines = raw.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    for (let i = 0; i < lines.length && !personName; i++) {
      if (/^(NOMBRE|APELLIDOS? Y NOMBRE|NAME)$/i.test(lines[i]) && lines[i + 1]) personName = lines[i + 1];
      else { const m = lines[i].match(/NOMBRE[:\s]+(.{4,60})$/i); if (m) personName = m[1]; }
    }
    if (!personName) {
      const stop = /INSTITUTO|CREDENCIAL|PASAPORTE|PASSPORT|LICENCIA|MEXICO|ESPANA|ESPAÑA|VOTAR|ELECTORAL|DOCUMENTO|CONDUCIR|PERMISO/;
      const candidate = lines.find(function (l) {
        const words = l.replace(/[^A-Za-zÁÉÍÓÚÜÑ ]/gi, '').trim().split(/\s+/).filter(Boolean);
        return words.length >= 2 && words.length <= 5 && l === l.toUpperCase() && !stop.test(l.toUpperCase());
      });
      if (candidate) personName = candidate;
    }
    if (personName) {
      personName = personName.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]/g, '').replace(/\s+/g, ' ').trim();
      if (personName.length < 4) personName = null;
      else personName = personName.toLowerCase().replace(/(^|\s|-)(\S)/g, function (m, p, c) { return p + c.toUpperCase(); });
    }
    return { type: type, typeLabel: typeLabel, formatKey: formatKey, docNumber: docNumber, personName: personName };
  }

  async function identifyImage(dataUrl) {
    await loadEngine();
    const img = await new Promise(function (resolve, reject) {
      const i = new Image();
      i.onload = function () { resolve(i); };
      i.onerror = reject;
      i.src = dataUrl;
    });
    const scale = Math.min(1, 1100 / (img.naturalWidth || 1100));
    const cv = document.createElement('canvas');
    cv.width = Math.max(50, Math.round((img.naturalWidth || 1100) * scale));
    cv.height = Math.max(50, Math.round((img.naturalHeight || 800) * scale));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const worker = await window.Tesseract.createWorker('spa', 1, {
      workerPath: new URL('vendor/ocr/worker.min.js', location.href).href,
      corePath: new URL('vendor/ocr/core/', location.href).href,
      langPath: new URL('vendor/ocr/lang/', location.href).href,
      workerBlobURL: false, errorHandler: function () {}, logger: function () {}
    });
    try {
      const out = await Promise.race([
        worker.recognize(cv),
        new Promise(function (_, reject) { setTimeout(function () { reject(new Error('ocr-slow')); }, 60000); })
      ]);
      return extract(out && out.data ? out.data.text : '');
    } finally {
      try { await worker.terminate(); } catch (e) {}
    }
  }

  /* Sugerencia de tipo en un toque (10.2): solo con palabra clave clara y
     solo en la categoría de documentos. El operador decide. */
  function suggestFormat(found) {
    try {
      if (!found || !found.formatKey) return;
      if (typeof state === 'undefined' || state.activeCategory !== 'docs' || state.format === found.formatKey) return;
      const bar = document.querySelector('[data-format-bar]');
      if (!bar || document.getElementById('docTypeSuggestion')) return;
      const chip = document.createElement('div');
      chip.id = 'docTypeSuggestion';
      chip.className = 'mt-2 px-3 py-2.5 rounded-xl border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 dark:border-indigo-800 flex flex-wrap items-center gap-2';
      chip.innerHTML = '<span class="text-xs font-bold text-indigo-900 dark:text-indigo-100 flex-1 min-w-[180px]">🔎 Parece un ' + found.typeLabel + '. ¿Usar ese tipo y marco?</span>' +
        '<button type="button" id="btnUseDocType" class="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold min-h-[44px]">Usar ' + found.typeLabel + '</button>' +
        '<button type="button" id="btnDismissDocType" class="px-3 py-2 rounded-lg border border-indigo-300 text-indigo-900 dark:text-indigo-100 text-xs font-bold min-h-[44px]">No</button>';
      bar.parentNode.insertBefore(chip, bar.nextSibling);
      chip.querySelector('#btnUseDocType').addEventListener('click', function () {
        const btn = document.querySelector('[data-quick-format="' + found.formatKey + '"], [data-format="' + found.formatKey + '"]');
        if (btn) btn.click();
        chip.remove();
      });
      chip.querySelector('#btnDismissDocType').addEventListener('click', function () { chip.remove(); });
    } catch (e) {}
  }

  /* Tras guardar un trabajo, identifica su primera página en segundo plano
     y guarda los metadatos (búsqueda del historial, archivado AÑADIDO 7 y
     nube AÑADIDO 8). Si hay nombre, propone el título del trabajo. */
  let enriching = false;
  async function enrichRecord(record) {
    try {
      if (!record || enriching || record.personName || record.docType) return;
      const page = (record.pages || [])[0];
      if (!page || !page.dataUrl) return;
      enriching = true;
      const found = await identifyImage(page.dataUrl);
      enriching = false;
      if (!found) return;
      const patch = { docType: found.type, docTypeLabel: found.typeLabel, docNumber: found.docNumber || null, personName: found.personName || null };
      if (found.personName) patch.title = found.typeLabel + ' — ' + found.personName;
      if (typeof window.updateScanRecord === 'function') await window.updateScanRecord(record.id, patch);
      if (typeof renderHistoryUI === 'function') renderHistoryUI();
      // Costumbre (12.8): si el mismo nombre ya estaba en el historial, se
      // SUGIERE el parentesco; no se copia ni se rellena ningún dato.
      let prev = null;
      if (found.personName && typeof getAllScansFromStorage === 'function') {
        try {
          const all = await getAllScansFromStorage();
          prev = all.find(function (x) { return x.id !== record.id && x.personName && x.personName.toLowerCase() === found.personName.toLowerCase(); }) || null;
        } catch (e) {}
      }
      if (typeof showToast === 'function') {
        if (prev) showToast('👋 ' + found.personName + ' ya tenía un trabajo el ' + new Date(prev.createdAt).toLocaleDateString('es-ES') + ' (' + (prev.title || prev.id) + '). ¿El mismo cliente de la vez pasada?', 'info');
        else showToast('🏷️ Documento identificado: ' + (patch.title || found.typeLabel) + '. El nombre se puede corregir desde el historial.', 'success');
      }
      suggestFormat(found);
    } catch (e) { enriching = false; }
  }

  window.RealScanIdentify = { identifyImage: identifyImage, extract: extract, enrichRecord: enrichRecord, suggestFormat: suggestFormat };
})();
