/* RealScan — Entrega por WhatsApp en un toque (AÑADIDO 9.3, v3.13.0).
   Desde el resumen previo y desde el historial: comparte el PDF del trabajo
   con la hoja de compartir del sistema (Web Share API con archivo), donde
   el cliente elige WhatsApp sin que la app pida su número. Si el sistema no
   permite compartir archivos, se usa la entrega digital/QR de la app como
   respaldo (o la descarga directa del PDF desde el historial). */
(function () {
  'use strict';

  async function sharePdfBlob(blob, fileName, title) {
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: title || 'RealScan — tu documento', text: 'Documento a escala real 1:1, listo para imprimir al 100%.' });
      return true;
    }
    return false;
  }

  /* Trabajo actual (desde el resumen previo): el PDF se genera del lienzo
     en curso; si no hay compartir con archivos, se abre la entrega digital
     de la app (enlace/QR, que ya incluye botón de WhatsApp). */
  async function shareCurrentJob() {
    try {
      if (typeof ensureJsPdf === 'function') await ensureJsPdf();
      const doc = (typeof generatePdfDoc === 'function') ? generatePdfDoc() : null;
      if (!doc) { showToast('Primero prepara un trabajo con fotos.', 'warning'); return; }
      let folio = null;
      if (window.RealScanFolio) folio = window.RealScanFolio.stampOnPdf(doc);
      const blob = doc.output('blob');
      const name = 'RealScan_' + (folio ? folio.replace('-', '') + '_' : '') + Date.now() + '.pdf';
      if (await sharePdfBlob(blob, name)) {
        if (typeof logActivity === 'function') logActivity('Entrega WhatsApp', 'PDF compartido' + (folio ? ' · ' + folio : ''));
        return;
      }
      if (typeof openModal === 'function') { openModal('deliveryModal'); showToast('Tu sistema no comparte archivos directos: usa la entrega digital (enlace/QR con botón de WhatsApp).', 'info'); }
      else showToast('Este navegador no permite compartir archivos.', 'warning');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      showToast('No se pudo compartir: ' + (e && e.message ? e.message : e), 'error');
    }
  }

  /* Trabajo del historial: genera su PDF (sin tocar el trabajo en curso) y
     lo comparte; sin compartir nativo, lo descarga. */
  async function shareScan(id) {
    try {
      const scans = await getAllScansFromStorage();
      const scan = scans.find(function (s) { return s.id === id; });
      if (!scan || !window.RealScanArchive) { showToast('Trabajo no encontrado.', 'error'); return; }
      showToast('📲 Preparando el PDF para compartir…', 'info');
      const blob = await window.RealScanArchive.buildPdfBlobForScan(scan);
      const name = window.RealScanArchive.fileBase(scan) + '.pdf';
      if (await sharePdfBlob(blob, name, scan.title || 'RealScan')) {
        if (typeof logActivity === 'function') logActivity('Entrega WhatsApp', (scan.title || scan.id));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      showToast('Este sistema no comparte archivos: se descargó el PDF para enviarlo por WhatsApp manualmente.', 'info');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      showToast('No se pudo compartir: ' + (e && e.message ? e.message : e), 'error');
    }
  }

  window.RealScanShare = { shareCurrentJob: shareCurrentJob, shareScan: shareScan, sharePdfBlob: sharePdfBlob };
})();
