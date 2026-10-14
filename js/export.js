/* ============================================================
   RealScan Pro — Módulo de Exportación, Impresión Directa e Imagen
   Desarrollado por Paco Iglesias • Escala 1:1 Físicamente Calibrada
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
    showToast('¡PDF generado! Ábrelo e imprime al 100% de escala.', 'success');
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
        title: 'RealScan - Documento en tamaño real',
        text: 'PDF a escala física 1:1 real listo para imprimir al 100%.'
      });
      if (typeof logActivity === 'function') {
        logActivity('Compartir PDF', (state.activeCategory === 'photos' ? state.photoCopies + ' fotos' : spec.name));
      }
      showToast('¡Archivo compartido con éxito!', 'success');
      return;
    }
    if (typeof logActivity === 'function') {
      logActivity('Descarga PDF (1:1)', (state.activeCategory === 'photos' ? state.photoCopies + ' fotos' : spec.name));
    }
    downloadPdfBlob(doc, fileName);
  } catch (err) {
    if (err && err.name === 'AbortError') { showToast('Envío cancelado.', 'info'); return; }
    if (typeof logActivity === 'function') {
      logActivity('Descarga PDF (Fallback)', spec.name);
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
 * Dibuja una página completa en un elemento Canvas a 300 DPI calibrados
 * usando las posiciones milimétricas de RealScanLayout
 */
function renderPageToCanvas(page, layout, loadedImages) {
  const paper = layout.paper;
  const pxPerMm = 300 / 25.4; // 11.811 px por mm a 300 DPI
  const sheetW = Math.round(paper.widthMm * pxPerMm);
  const sheetH = Math.round(paper.heightMm * pxPerMm);

  const canvas = document.createElement('canvas');
  canvas.width = sheetW;
  canvas.height = sheetH;
  const ctx = canvas.getContext('2d');

  // Fondo blanco 100% puro
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sheetW, sheetH);

  // 1. Encabezado de página
  if (!layout.isCleanSheet && page.sheetTitle) {
    ctx.fillStyle = '#475569';
    ctx.font = 'bold ' + Math.round(8.5 * pxPerMm * 0.35) + 'px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(page.sheetTitle.toUpperCase(), sheetW / 2, 12 * pxPerMm);
  }

  // 2. Colocar cada imagen en la página según sus coordenadas mm
  page.placements.forEach(function(item) {
    const x = item.xMm * pxPerMm;
    const y = item.yMm * pxPerMm;
    const w = item.widthMm * pxPerMm;
    const h = item.heightMm * pxPerMm;

    const imgObj = loadedImages[item.slot] || loadedImages.front;

    // A. Borde y marcas de corte
    if (item.drawOvalGuide) {
      ctx.save();
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (item.drawBorder) {
      ctx.save();
      ctx.setLineDash([12, 12]);
      ctx.strokeStyle = '#b0b0b0';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
      ctx.restore();
    }

    // B. Dibujar imagen a escala física 1:1
    if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
      ctx.drawImage(imgObj, x, y, w, h);
    }

    // C. Marcas de corte en esquinas
    if (item.drawCutMarks && !item.drawOvalGuide) {
      ctx.save();
      ctx.strokeStyle = '#777777';
      ctx.lineWidth = 2.2;
      const tick = 25, off = 10;
      ctx.beginPath();
      ctx.moveTo(x - off, y); ctx.lineTo(x - off + tick, y);
      ctx.moveTo(x, y - off); ctx.lineTo(x, y - off + tick);
      ctx.moveTo(x + w + off - tick, y); ctx.lineTo(x + w + off, y);
      ctx.moveTo(x + w, y - off); ctx.lineTo(x + w, y - off + tick);
      ctx.moveTo(x - off, y + h); ctx.lineTo(x - off + tick, y + h);
      ctx.moveTo(x, y + h + off - tick); ctx.lineTo(x, y + h + off);
      ctx.moveTo(x + w + off - tick, y + h); ctx.lineTo(x + w + off, y + h);
      ctx.moveTo(x + w, y + h + off - tick); ctx.lineTo(x + w, y + h + off);
      ctx.stroke();
      ctx.restore();
    }

    // D. Rótulo del documento
    if (item.label) {
      ctx.save();
      ctx.fillStyle = '#475569';
      ctx.font = 'bold ' + Math.round(7 * pxPerMm * 0.35) + 'px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x, y - 6);
      ctx.restore();
    }
  });

  // 3. Regla de calibración al pie (5 cm exacta)
  if (page.hasRuler) {
    const rulerLengthMm = 50;
    const rulerLengthPx = rulerLengthMm * pxPerMm;
    const rulerStartX = (sheetW - rulerLengthPx) / 2;
    const rulerY = (paper.heightMm - 35) * pxPerMm;

    ctx.save();
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
    ctx.fillText('RealScan por Paco Iglesias | Formato: ' + layout.spec.name + ' • Hoja: ' + paper.name + ' (300 DPI)', sheetW / 2, rulerY + 130);
    ctx.restore();
  }

  return canvas;
}

/**
 * Descarga de Imagen(es) a 300 DPI Constantes con soporte para todas las páginas
 */
async function downloadA4Image() {
  if (!state.images.front || !state.images.front.processedDataUrl) {
    showToast('Por favor captura o sube al menos una imagen.', 'warning');
    return;
  }

  const layout = window.RealScanLayout.computeDocumentLayout(state);
  const paper = layout.paper;
  const spec = layout.spec;

  showToast('Generando ' + layout.totalPages + ' hoja(s) ' + paper.shortName + ' a 300 DPI...', 'info');

  // Cargar imágenes necesarias de forma asíncrona y segura
  const slotsToLoad = ['front', 'back', 'page3', 'page4'];
  const loadedImages = {};

  const loadPromises = slotsToLoad.map(function(s) {
    return new Promise(function(resolve) {
      if (state.images[s] && state.images[s].processedDataUrl) {
        const img = new Image();
        img.onload = function() { loadedImages[s] = img; resolve(); };
        img.onerror = function() { resolve(); };
        img.src = state.images[s].processedDataUrl;
      } else {
        resolve();
      }
    });
  });

  await Promise.all(loadPromises);

  const customTitle = (state.documentCustomTitle || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  const baseName = customTitle ? customTitle : ('RealScan_' + spec.fileName);

  // Caso 1: 1 sola página -> Descarga directa de archivo JPG
  if (layout.totalPages === 1) {
    const canvas = renderPageToCanvas(layout.pages[0], layout, loadedImages);
    canvas.toBlob(function(blob) {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = baseName + '_' + paper.shortName.toLowerCase() + '_300DPI.jpg';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);
      showToast('¡Imagen ' + paper.shortName + ' a 300 DPI descargada con éxito!', 'success');
    }, 'image/jpeg', 0.95);
    return;
  }

  // Caso 2: Múltiples páginas -> Empaquetar en ZIP si JSZip está presente, o descargar secuencialmente
  if (typeof window.JSZip !== 'undefined') {
    const zip = new window.JSZip();
    const folder = zip.folder(baseName + '_hojas_300DPI');

    const pageBlobs = layout.pages.map(function(page, idx) {
      const canvas = renderPageToCanvas(page, layout, loadedImages);
      return new Promise(function(resolve) {
        canvas.toBlob(function(blob) {
          folder.file('Hoja_' + (idx + 1) + '_' + paper.shortName.toLowerCase() + '.jpg', blob);
          resolve();
        }, 'image/jpeg', 0.95);
      });
    });

    await Promise.all(pageBlobs);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = baseName + '_' + layout.totalPages + '_hojas_300DPI.zip';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(zipUrl);
    }, 2000);
    showToast('¡Paquete ZIP con ' + layout.totalPages + ' hojas descargado!', 'success');
  } else {
    // Fallback: descargar cada página individualmente
    layout.pages.forEach(function(page, idx) {
      const canvas = renderPageToCanvas(page, layout, loadedImages);
      canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = baseName + '_Hoja_' + (idx + 1) + '_300DPI.jpg';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
          if (a.parentNode) a.parentNode.removeChild(a);
          URL.revokeObjectURL(url);
        }, 2000);
      }, 'image/jpeg', 0.95);
    });
    showToast('¡' + layout.totalPages + ' imágenes descargadas!', 'success');
  }
}
