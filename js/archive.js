/* RealScan — Archivado a Paperless-ngx / NAS (AÑADIDO 7, v3.13.0).
   Exportación sin servidor nuevo: por cada trabajo genera su PDF final con
   un nombre ordenado y predecible (AAAA-MM-DD_tipo_cliente.pdf) más un
   lateral JSON con los metadatos, listos para soltar en la carpeta
   «consume» de Paperless-ngx o en una carpeta del NAS (Synology Drive).
   Cada trabajo queda marcado «archivado» con fecha para no duplicar.
   Es un complemento del respaldo cifrado (recordatorio AÑADIDO 6) y de la
   copia en la nube (AÑADIDO 8), no un sustituto de ninguno. */
(function () {
  'use strict';

  function slug(text) {
    return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  }

  function fileBase(scan) {
    const d = new Date(scan.createdAt || Date.now());
    const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const tipo = slug(scan.docTypeLabel || scan.formatName || scan.format || 'documento') || 'documento';
    const cliente = slug(scan.personName || '') || String(scan.id || 'trabajo').replace('scan_', '');
    return date + '_' + tipo + '_' + cliente;
  }

  function sidecar(scan) {
    const d = new Date(scan.createdAt || Date.now());
    return {
      app: 'RealScan Pro',
      version: 'v3.13.0',
      kind: 'paperless-archive',
      title: scan.personName ? ((scan.docTypeLabel || scan.formatName || 'Documento') + ' — ' + scan.personName) : (scan.title || ''),
      documentType: scan.docTypeLabel || scan.formatName || '',
      documentNumber: scan.docNumber || null,
      personName: scan.personName || null,
      sides: (scan.pages || []).length,
      pageLabels: (scan.pages || []).map(function (p) { return p.label || p.slot || ''; }),
      createdAt: d.toISOString(),
      operator: scan.operator || null,
      notes: scan.printedSheetTitle || '',
      folio: scan.lastFolio || null,
      suggestedTags: ['RealScan', scan.docTypeLabel || scan.formatName || 'Documento', String(d.getFullYear())]
    };
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  async function shareOrDownload(files, zipName) {
    const fileObjs = files.map(function (f) { return new File([f.blob], f.name, { type: f.blob.type || 'application/octet-stream' }); });
    if (fileObjs.length === 1 && navigator.canShare && navigator.canShare({ files: fileObjs })) {
      try { await navigator.share({ files: fileObjs, title: 'RealScan — Archivado' }); return 'shared'; }
      catch (e) { if (e && e.name === 'AbortError') return 'aborted'; }
    }
    if (files.length > 1) {
      if (typeof ensureJSZip === 'function') await ensureJSZip();
      const zip = new JSZip();
      files.forEach(function (f) { zip.file(f.name, f.blob); });
      const blob = await zip.generateAsync({ type: 'blob' });
      if (navigator.canShare) {
        const zipFile = new File([blob], zipName, { type: 'application/zip' });
        if (navigator.canShare({ files: [zipFile] })) {
          try { await navigator.share({ files: [zipFile], title: 'RealScan — Archivado' }); return 'shared'; }
          catch (e) { if (e && e.name === 'AbortError') return 'aborted'; }
        }
      }
      downloadBlob(blob, zipName);
      return 'downloaded';
    }
    downloadBlob(files[0].blob, files[0].name);
    return 'downloaded';
  }

  /* PDF final de un trabajo guardado sin perder el trabajo en curso: se
     vuelca el borrador, se restaura el trabajo, se genera el PDF con el
     mismo motor de la app y se recupera el borrador anterior. Se usa el PDF
     de impresión de la app: el PDF buscable con OCR se genera al vuelo en
     los trabajos de documento y no queda almacenado por trabajo. */
  async function buildPdfBlobForScan(scan) {
    if (typeof ensureJsPdf === 'function') await ensureJsPdf();
    let hadDraft = false;
    try {
      if (typeof saveActiveDraft === 'function') await saveActiveDraft();
      hadDraft = !!(typeof getActiveDraft === 'function' && getActiveDraft());
    } catch (e) {}
    try {
      await restoreScanToApp(scan.id);
      if (typeof waitForProcessingComplete === 'function') await waitForProcessingComplete();
      const doc = generatePdfDoc();
      if (!doc) throw new Error('No se pudo generar el PDF del trabajo.');
      return doc.output('blob');
    } finally {
      try {
        if (hadDraft && typeof restoreActiveDraft === 'function') await restoreActiveDraft();
        else if (typeof prepareWorkspaceForJobSwitch === 'function') { prepareWorkspaceForJobSwitch({ clearDraft: true, keepTitle: false }); if (typeof updateUI === 'function') updateUI(); }
      } catch (e) {}
    }
  }

  async function archiveScan(id, options) {
    const silent = !!(options && options.silent);
    try {
      const scans = await getAllScansFromStorage();
      const scan = scans.find(function (s) { return s.id === id; });
      if (!scan) { if (!silent) showToast('Trabajo no encontrado.', 'error'); return false; }
      const base = fileBase(scan);
      const pdfBlob = await buildPdfBlobForScan(scan);
      const sidecarBlob = new Blob([JSON.stringify(sidecar(scan), null, 2)], { type: 'application/json' });
      const how = await shareOrDownload([
        { blob: pdfBlob, name: base + '.pdf' },
        { blob: sidecarBlob, name: base + '.json' }
      ], base + '.zip');
      if (how === 'aborted') return false;
      if (typeof window.updateScanRecord === 'function') await window.updateScanRecord(scan.id, { archivedAt: Date.now() });
      if (typeof renderHistoryUI === 'function') renderHistoryUI();
      if (!silent) showToast('📥 Trabajo archivado: ' + base + '.pdf (+ metadatos .json). Déjalo en la carpeta «consume» de Paperless o en tu NAS.', 'success');
      return true;
    } catch (e) {
      if (!silent) showToast('No se pudo archivar: ' + (e && e.message ? e.message : e), 'error');
      return false;
    }
  }

  async function archivePending() {
    try {
      const scans = await getAllScansFromStorage();
      const pending = scans.filter(function (s) { return !s.archivedAt; });
      if (!pending.length) { showToast('No hay trabajos pendientes de archivar.', 'info'); return; }
      showToast('📥 Archivando ' + pending.length + ' trabajo(s)…', 'info');
      const files = [];
      const doneIds = [];
      for (const scan of pending) {
        try {
          const base = fileBase(scan);
          files.push({ blob: await buildPdfBlobForScan(scan), name: base + '.pdf' });
          files.push({ blob: new Blob([JSON.stringify(sidecar(scan), null, 2)], { type: 'application/json' }), name: base + '.json' });
          doneIds.push(scan.id);
        } catch (e) { /* un trabajo con error no frena el lote */ }
      }
      if (!files.length) { showToast('No se pudo archivar ningún trabajo.', 'error'); return; }
      const stamp = new Date();
      const zipName = 'RealScan_Archivo_' + stamp.getFullYear() + '-' + String(stamp.getMonth() + 1).padStart(2, '0') + '-' + String(stamp.getDate()).padStart(2, '0') + '.zip';
      const how = await shareOrDownload(files, zipName);
      if (how === 'aborted') return;
      for (const id of doneIds) { if (typeof window.updateScanRecord === 'function') await window.updateScanRecord(id, { archivedAt: Date.now() }); }
      if (typeof renderHistoryUI === 'function') renderHistoryUI();
      showToast('📥 ' + doneIds.length + ' trabajo(s) archivados en ' + zipName + '. Suelta el ZIP (o su contenido) en la carpeta «consume» de Paperless o en el NAS.', 'success');
    } catch (e) {
      showToast('No se pudo completar el archivado: ' + (e && e.message ? e.message : e), 'error');
    }
  }

  async function refreshPendingCount() {
    try {
      const el = document.getElementById('archivePendingCount');
      if (!el || typeof getAllScansFromStorage !== 'function') return;
      const scans = await getAllScansFromStorage();
      const n = scans.filter(function (s) { return !s.archivedAt; }).length;
      el.textContent = n ? '(' + n + ')' : '';
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('btnArchivePending');
    if (btn) btn.addEventListener('click', archivePending);
    refreshPendingCount();
  });

  window.RealScanArchive = { archiveScan: archiveScan, archivePending: archivePending, buildPdfBlobForScan: buildPdfBlobForScan, fileBase: fileBase, sidecar: sidecar, refreshPendingCount: refreshPendingCount };
})();
