/* ============================================================
   RealScan Pro — Módulo de Exportación, Impresión Directa e Imagen
   Desarrollado por Paco Iglesias • Escala 1:1 Calibrada
   ============================================================ */

/**
 * Descarga de Blob PDF generado con fallback robusto
 */
function downloadPdfBlob(doc, fileName) {
  showToast('Descargando PDF...', 'info');
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
    showToast('¡PDF generado! Ábrelo e imprime al 100%.', 'success');
  } catch (err) {
    doc.save(fileName);
    showToast('¡PDF descargado!', 'success');
  }
}

/**
 * Manejador principal de Exportar / Compartir PDF
 */
async function handleExportPDF(tryShare) {
  const doc = generatePdfDoc();
  if (!doc) return;
  const spec = getActiveSpec();
  const customName = (state.documentCustomTitle || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  const baseName = customName ? customName : ('RealScan_' + spec.fileName);
  const fileName = baseName + '_' + Date.now() + '.pdf';

  try {
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (tryShare && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      showToast('Abriendo menú para compartir...', 'info');
      await navigator.share({
        files: [pdfFile],
        title: 'RealScan - Documento en tamaño real A4',
        text: 'PDF con Anverso y Reverso a tamaño físico 1:1 en una sola hoja A4.'
      });
      if (typeof logActivity === 'function') {
        logActivity('Compartir PDF A4', (state.activeCategory === 'photos' ? state.photoCopies + ' fotos' : spec.name));
      }
      showToast('¡Archivo compartido con éxito!', 'success');
      return;
    }
    if (typeof logActivity === 'function') {
      logActivity('Descarga PDF A4 (1:1)', (state.activeCategory === 'photos' ? state.photoCopies + ' fotos' : spec.name));
    }
    downloadPdfBlob(doc, fileName);
  } catch (err) {
    if (err && err.name === 'AbortError') { showToast('Envío cancelado.', 'info'); return; }
    if (typeof logActivity === 'function') {
      logActivity('Descarga PDF A4 (Fallback)', spec.name);
    }
    downloadPdfBlob(doc, fileName);
  }
}

/**
 * Imprimir Directo (1 Clic):
 * Genera el PDF con las medidas físicas 1:1 y dispara la ventana de impresión
 */
function handlePrintDirect() {
  const doc = generatePdfDoc();
  if (!doc) return;

  const spec = getActiveSpec();
  if (typeof logActivity === 'function') {
    logActivity('Impresión Directa 1:1', (state.activeCategory === 'photos' ? state.photoCopies + ' fotos' : spec.name));
  }
  showToast('Preparando impresión... Elige ESCALA 100% en el diálogo.', 'info');

  let blobUrl;
  try {
    blobUrl = doc.output('bloburl');
  } catch (e) {
    blobUrl = URL.createObjectURL(doc.output('blob'));
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  iframe.src = blobUrl;
  iframe.onload = function() {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      // Fallback a ventana nueva si iframe falla en navegadores móviles estrictos
      window.open(blobUrl, '_blank');
    }
    setTimeout(function() {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      if (typeof blobUrl === 'string' && blobUrl.indexOf('blob:') === 0) {
        setTimeout(function(){ URL.revokeObjectURL(blobUrl); }, 60000);
      }
    }, 90000);
  };
  document.body.appendChild(iframe);
}

/**
 * Descarga de Imagen A4 Calibrada (300 DPI Constantes)
 */
function downloadA4Image() {
  if (!state.images.front.processedDataUrl) {
    showToast('Por favor captura o sube al menos una imagen.', 'warning');
    return;
  }

  const paper = (typeof getActivePaperSpec === 'function') ? getActivePaperSpec() : { widthMm: 210, heightMm: 297, name: 'A4', shortName: 'A4' };
  showToast('Generando imagen ' + paper.shortName + ' a 300 DPI...', 'info');

  // Papel físico a 300 DPI calibrados
  const pxPerMm = 300 / 25.4;
  const sheetW = Math.round(paper.widthMm * pxPerMm);
  const sheetH = Math.round(paper.heightMm * pxPerMm);

  const canvas = document.createElement('canvas');
  canvas.width = sheetW;
  canvas.height = sheetH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sheetW, sheetH);

  const spec = getActiveSpec();

  // Regla de calibración en imagen (5 cm) — Opcional
  if (state.includeRulerFooter !== false) {
    const rulerLengthMm = 50;
    const rulerLengthPx = rulerLengthMm * pxPerMm;
    const rulerStartX = (sheetW - rulerLengthPx) / 2;
    const rulerY = (paper.heightMm - 35) * pxPerMm;

    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(rulerStartX, rulerY);
    ctx.lineTo(rulerStartX + rulerLengthPx, rulerY);
    ctx.stroke();

    ctx.lineWidth = 2.2;
    for (let mm = 0; mm <= 50; mm++) {
      const mx = rulerStartX + mm * pxPerMm;
      let tickH = 10;
      if (mm % 10 === 0) tickH = 28;
      else if (mm % 5 === 0) tickH = 18;
      ctx.beginPath();
      ctx.moveTo(mx, rulerY);
      ctx.lineTo(mx, rulerY + tickH);
      ctx.stroke();
    }

    ctx.fillStyle = '#444444';
    ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const mx = rulerStartX + (i * 10) * pxPerMm;
      ctx.fillText(i + 'cm', mx, rulerY + 54);
    }

    ctx.font = 'bold 26px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#222222';
    ctx.fillText('INSTRUCCIONES: IMPRIMIR AL 100% (TAMAÑO REAL) — LA REGLA DEBE MEDIR 5 CM', sheetW / 2, rulerY + 95);
    ctx.font = '20px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('RealScan por Paco Iglesias | Formato: ' + spec.name + ' • Hoja: ' + paper.name + ' (300 DPI)', sheetW / 2, rulerY + 130);
  }

  function drawImageWithMarks(imgObj, xMm, yMm, wMm, hMm) {
    const x = xMm * pxPerMm;
    const y = yMm * pxPerMm;
    const w = wMm * pxPerMm;
    const h = hMm * pxPerMm;

    // Líneas de corte
    ctx.save();
    if (spec.isOval) {
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.setLineDash([12, 12]);
      ctx.strokeStyle = '#b0b0b0';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    }
    ctx.restore();

    // Imagen 1:1
    ctx.drawImage(imgObj, x, y, w, h);

    // Guías de corte
    if (!spec.isOval) {
      ctx.save();
      ctx.strokeStyle = '#777777';
      ctx.lineWidth = 2.2;
      const tick = 25, off = 10;
      ctx.beginPath();
      ctx.moveTo(x-off, y); ctx.lineTo(x-off+tick, y);
      ctx.moveTo(x, y-off); ctx.lineTo(x, y-off+tick);
      ctx.moveTo(x+w+off-tick, y); ctx.lineTo(x+w+off, y);
      ctx.moveTo(x+w, y-off); ctx.lineTo(x+w, y-off+tick);
      ctx.moveTo(x-off, y+h); ctx.lineTo(x-off+tick, y+h);
      ctx.moveTo(x, y+h+off-tick); ctx.lineTo(x, y+h+off);
      ctx.moveTo(x+w+off-tick, y+h); ctx.lineTo(x+w+off, y+h);
      ctx.moveTo(x+w, y+h+off-tick); ctx.lineTo(x+w, y+h+off);
      ctx.stroke();
      ctx.restore();
    }
  }

  function triggerDownload() {
    canvas.toBlob(function(blob) {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RealScan_' + spec.fileName + '_' + paper.shortName.replace(/\s+/g, '_') + '_300DPI.jpg';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);
      if (typeof logActivity === 'function') {
        logActivity('Descarga Imagen ' + paper.shortName + ' (300 DPI)', (state.activeCategory === 'photos' ? state.photoCopies + ' fotos' : spec.name));
      }
      showToast('¡Imagen ' + paper.shortName + ' a 300 DPI descargada con éxito!', 'success');
    }, 'image/jpeg', 0.95);
  }

  const frontImg = new Image();
  frontImg.onload = function() {
    if (state.activeCategory === 'photos') {
      const copies = state.photoCopies;
      const info = (typeof getPhotoLayoutInfo === 'function') ? getPhotoLayoutInfo(spec.widthMm, spec.heightMm, copies) : { cols: 4, gap: 4 };
      const cols = info.cols;
      const gap = info.gap;
      const totalGridW = cols * spec.widthMm + (cols - 1) * gap;
      const startXMm = (paper.widthMm - totalGridW) / 2;
      const startYMm = 22;

      ctx.fillStyle = '#333333';
      ctx.font = 'bold 30px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PLANILLA DE FOTOS: ' + spec.name.toUpperCase() + ' (' + copies + ' FOTOS)', sheetW / 2, (startYMm - 9) * pxPerMm);

      ctx.font = '22px Helvetica, Arial, sans-serif';
      ctx.fillStyle = '#777777';
      ctx.fillText('Medida física: ' + spec.widthMm + ' × ' + spec.heightMm + ' mm | Escala 1:1 real en papel ' + paper.name, sheetW / 2, (startYMm - 4.5) * pxPerMm);

      const backImg = (state.mixTwoPhotos && state.images.back.processedDataUrl) ? new Image() : null;
      const halfCopies = Math.floor(copies / 2);

      function renderAllGrid() {
        for (let i = 0; i < copies; i++) {
          const useBack = (backImg && i >= halfCopies);
          const curImg = useBack ? backImg : frontImg;
          const c = i % cols;
          const r = Math.floor(i / cols);
          const pxMm = startXMm + c * (spec.widthMm + gap);
          const pyMm = startYMm + r * (spec.heightMm + gap);
          if (pyMm + spec.heightMm <= (paper.heightMm - 41)) {
            drawImageWithMarks(curImg, pxMm, pyMm, spec.widthMm, spec.heightMm);
          }
        }
        triggerDownload();
      }

      if (backImg) {
        backImg.onload = renderAllGrid;
        backImg.src = state.images.back.processedDataUrl;
      } else {
        renderAllGrid();
      }
    } else {
      // Documentos
      const targetW = spec.widthMm;
      const targetH = spec.heightMm;
      const posX = (paper.widthMm - targetW) / 2;
      const topMarginFront = (targetH > 100) ? 18 : 25;

      drawImageWithMarks(frontImg, posX, topMarginFront, targetW, targetH);

      if (state.printMode === 'both' && state.images.back.processedDataUrl) {
        const backImg = new Image();
        backImg.onload = function() {
          const topMarginBack = (targetH > 100) ? (topMarginFront + targetH + 14) : (topMarginFront + targetH + 15);
          if (topMarginBack + targetH <= (paper.heightMm - 41)) {
            drawImageWithMarks(backImg, posX, topMarginBack, targetW, targetH);
          }
          triggerDownload();
        };
        backImg.src = state.images.back.processedDataUrl;
        return;
      }
      triggerDownload();
    }
  };
  frontImg.src = state.images.front.processedDataUrl;
}
