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
  const doc = await generatePdfDoc();
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
async function handlePrintDirect() {
  const doc = await generatePdfDoc();
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
/* ============================================================
   Descarga de Imagen a 300 DPI — con la MISMA paginación que el PDF.
   Antes: solo dibujaba anverso/reverso y recortaba en silencio lo que no
   cabía en 1 hoja. Ahora genera una imagen por hoja igual que el PDF.
   ============================================================ */

function loadJpgImg(dataUrl) {
  return new Promise(function(resolve, reject) {
    const img = new Image();
    img.onload = function() { resolve(img); };
    img.onerror = function() { reject(new Error('No se pudo cargar la imagen')); };
    img.src = dataUrl;
  });
}

/* Regla de calibración de 5 cm al pie (igual que en el PDF) */
function drawRulerFooterJpg(ctx, sheetW, paper, pxPerMm, spec) {
  if (state.includeRulerFooter === false) return;
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

/* Encabezado de planilla de fotos (igual que en el PDF) */
function drawPhotoHeaderJpg(ctx, sheetW, pxPerMm, spec, copies, pageIdx, totalPages) {
  const pageStr = totalPages > 1 ? (' (Hoja ' + (pageIdx + 1) + ' de ' + totalPages + ')') : '';
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 30px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PLANILLA DE FOTOS: ' + spec.name.toUpperCase() + ' (' + copies + ' FOTOS' + pageStr + ')', sheetW / 2, (22 - 9) * pxPerMm);
  ctx.font = '22px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#777777';
  ctx.fillText('Medida física: ' + spec.widthMm + ' × ' + spec.heightMm + ' mm | Escala 1:1 real en papel ' + paperName(), sheetW / 2, (22 - 4.5) * pxPerMm);
}

function paperName() {
  const paper = (typeof getActivePaperSpec === 'function') ? getActivePaperSpec() : { name: 'A4' };
  return paper.name;
}

/* Dibuja una imagen con marcas de corte. En formato Óvalo aplica máscara
   elíptica REAL sobre la imagen (antes solo la guía de corte era elipse). */
function drawImageWithMarksJpg(ctx, imgObj, xMm, yMm, wMm, hMm, pxPerMm, spec) {
  const x = xMm * pxPerMm;
  const y = yMm * pxPerMm;
  const w = wMm * pxPerMm;
  const h = hMm * pxPerMm;

  ctx.save();
  if (spec.isOval) {
    // Máscara elíptica real: la imagen exportada queda en forma de óvalo
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(imgObj, x, y, w, h);
    ctx.restore();

    // Guía de corte elíptica
    ctx.save();
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Líneas de corte rectangulares
  ctx.setLineDash([12, 12]);
  ctx.strokeStyle = '#b0b0b0';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  ctx.restore();

  // Imagen 1:1
  ctx.drawImage(imgObj, x, y, w, h);

  // Guías de corte en esquinas
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

/* Rótulo de documento sobre la imagen (igual que en el PDF) */
function drawDocLabelJpg(ctx, text, xMm, yMm, pxPerMm) {
  if (state.includeDocLabels === false) return;
  ctx.fillStyle = '#5a5a5a';
  ctx.font = 'bold 21px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, xMm * pxPerMm, (yMm - 2.5) * pxPerMm);
}

/* Arma las hojas de la planilla de fotos con la misma paginación del PDF */
function buildPhotoSheetsJpg(paper, spec) {
  const copies = state.photoCopies;
  const info = (typeof getPhotoLayoutInfo === 'function') ? getPhotoLayoutInfo(spec.widthMm, spec.heightMm, copies) : { cols: 4, gap: 4, maxPerPage: 36, maxRows: 9 };
  const cols = info.cols;
  const gap = info.gap;
  const maxPerPage = info.maxPerPage;
  const totalGridW = cols * spec.widthMm + (cols - 1) * gap;
  const startXMm = (paper.widthMm - totalGridW) / 2;
  const startYMm = 22;
  const halfCopies = Math.floor(copies / 2);

  const sheets = [];
  let current = [];
  for (let i = 0; i < copies; i++) {
    if (current.length >= maxPerPage) { sheets.push(current); current = []; }
    const c = current.length % cols;
    const r = Math.floor(current.length / cols);
    const useBack = (state.mixTwoPhotos && state.images.back.processedDataUrl && i >= halfCopies);
    current.push({
      dataUrl: useBack ? state.images.back.processedDataUrl : state.images.front.processedDataUrl,
      xMm: startXMm + c * (spec.widthMm + gap),
      yMm: startYMm + r * (spec.heightMm + gap),
      wMm: spec.widthMm,
      hMm: spec.heightMm
    });
  }
  if (current.length) sheets.push(current);
  return sheets;
}

/* Arma las hojas de documentos con la misma paginación del PDF */
function buildDocSheetsJpg(paper, spec) {
  const candidateSlots = (state.printMode === 'single')
    ? ['front']
    : ['front', 'back', 'page3', 'page4'].slice(0, state.documentPageCount || 2);

  const activeItems = [];
  candidateSlots.forEach(function(slotKey) {
    if (state.images[slotKey] && state.images[slotKey].processedDataUrl) {
      activeItems.push({ dataUrl: state.images[slotKey].processedDataUrl, label: slotKey });
    }
  });
  if (!activeItems.length) return [];

  const targetW = spec.widthMm;
  const targetH = spec.heightMm;
  const pageW = paper.widthMm;
  const pageH = paper.heightMm;

  // Etiquetas como en el PDF
  activeItems.forEach(function(item, idx) {
    let label = 'PÁGINA ' + (idx + 1);
    if (state.format === 'business_card') {
      label = (idx === 0) ? 'FRENTE (CONTACTO Y LOGO)' : (idx === 1 ? 'REVERSO (QR / SERVICIOS / MAPA)' : ('TARJETA 2 (PÁG. ' + (idx - 1) + ')'));
    } else if (state.format === 'passport') {
      label = (idx === 0) ? 'PÁG. 1 (DATOS BIOGRÁFICOS / FOTO)' : (idx === 1 ? 'PÁG. 2 (VISA / FIRMA / SELLO)' : ('PÁGINA ' + (idx + 1) + ' (VISA O SELLO)'));
    } else if (state.format === 'card') {
      label = (idx === 0) ? 'FRENTE (DELANTERA CON FOTO)' : (idx === 1 ? 'REVERSO (ATRÁS / VUELTA)' : ('DOCUMENTO 2 (PÁG. ' + (idx - 1) + ')'));
    } else {
      label = (idx === 0) ? 'FRENTE (DELANTERA)' : (idx === 1 ? 'REVERSO (ATRÁS / VUELTA)' : ('PÁGINA ' + (idx + 1)));
    }
    item.label = label;
  });

  // Modo Duplicado: 2 juegos en 1 hoja (igual que el PDF)
  if (state.duplicateCard && (targetW * 2 + 12) <= pageW) {
    const gapX = 14;
    const totalWidth2Col = targetW * 2 + gapX;
    const startXCol1 = (pageW - totalWidth2Col) / 2;
    const startXCol2 = startXCol1 + targetW + gapX;
    const topMargin = 20;
    const sheet = [{ header: 'COPIA DOBLE OFICIAL (2 JUEGOS EN 1 HOJA A TAMAÑO REAL 1:1)', items: [] }];
    [startXCol1, startXCol2].forEach(function(colX) {
      activeItems.forEach(function(item, itemIdx) {
        sheet[0].items.push({
          dataUrl: item.dataUrl,
          xMm: colX,
          yMm: topMargin + itemIdx * (targetH + 14),
          wMm: targetW,
          hMm: targetH,
          label: item.label
        });
      });
    });
    return sheet;
  }

  const isSeparateSheets = (state.printMode === 'both_separate' || state.sheetLayout === 'separate_sheets');
  const topMargin = (targetH > 100) ? 18 : 22;
  const maxAvailableH = (state.includeRulerFooter !== false) ? (pageH - 42) : (pageH - 24);
  const fitsTwo = !isSeparateSheets && ((topMargin + targetH * 2 + 14) <= maxAvailableH);
  const itemsPerSheet = fitsTwo ? 2 : 1;
  const posX = (pageW - targetW) / 2;

  const sheets = [];
  let current = [];
  activeItems.forEach(function(item) {
    if (current.length >= itemsPerSheet) { sheets.push(current); current = []; }
    let itemY = topMargin;
    if (itemsPerSheet === 2 && current.length === 1) {
      itemY = topMargin + targetH + 14;
    } else if (itemsPerSheet === 1 && targetH <= (maxAvailableH - 20)) {
      itemY = Math.max(16, Math.round((maxAvailableH - targetH) / 2));
    }
    current.push({ dataUrl: item.dataUrl, xMm: posX, yMm: itemY, wMm: targetW, hMm: targetH, label: item.label });
  });
  if (current.length) sheets.push(current);
  return sheets;
}

/* Renderiza una hoja a canvas 300 DPI y devuelve el blob JPEG */
async function renderJpgSheet(paper, spec, sheet, pageIdx, totalPages, kind, copies) {
  const pxPerMm = 300 / 25.4;
  const sheetW = Math.round(paper.widthMm * pxPerMm);
  const sheetH = Math.round(paper.heightMm * pxPerMm);

  const canvas = document.createElement('canvas');
  canvas.width = sheetW;
  canvas.height = sheetH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sheetW, sheetH);

  const items = sheet.items || sheet;
  if (sheet.header) {
    ctx.fillStyle = '#464646';
    ctx.font = 'bold 26px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sheet.header, sheetW / 2, (20 - 8) * pxPerMm);
  }
  if (kind === 'photos') {
    drawPhotoHeaderJpg(ctx, sheetW, pxPerMm, spec, copies, pageIdx, totalPages);
  }

  const customName = (state.documentCustomTitle || '').trim();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const img = await loadJpgImg(it.dataUrl);
    drawImageWithMarksJpg(ctx, img, it.xMm, it.yMm, it.wMm, it.hMm, pxPerMm, spec);
    if (kind === 'docs' && it.label) {
      const sheetInfo = totalPages > 1 ? (' [Hoja ' + (pageIdx + 1) + '/' + totalPages + ']') : '';
      const displayLabel = customName ? (customName + ' • ' + it.label) : it.label;
      drawDocLabelJpg(ctx, displayLabel + ' — ' + spec.widthMm + ' × ' + spec.heightMm + ' mm' + sheetInfo, it.xMm, it.yMm, pxPerMm);
    }
  }

  drawRulerFooterJpg(ctx, sheetW, paper, pxPerMm, spec);

  return new Promise(function(resolve) {
    canvas.toBlob(function(blob) { resolve(blob); }, 'image/jpeg', 0.95);
  });
}

function downloadJpgBlob(blob, fileName) {
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
}

/* Punto de entrada: Descarga de Imagen 300 DPI con paginación igual al PDF */
async function downloadA4Image() {
  if (!state.images.front.processedDataUrl) {
    showToast('Por favor captura o sube al menos una imagen.', 'warning');
    return;
  }

  const paper = (typeof getActivePaperSpec === 'function') ? getActivePaperSpec() : { widthMm: 210, heightMm: 297, name: 'A4', shortName: 'A4' };
  const spec = getActiveSpec();
  const kind = (state.activeCategory === 'photos') ? 'photos' : 'docs';

  showToast('Generando imagen ' + paper.shortName + ' a 300 DPI...', 'info');

  let sheets;
  try {
    sheets = (kind === 'photos') ? buildPhotoSheetsJpg(paper, spec) : buildDocSheetsJpg(paper, spec);
  } catch (err) {
    showToast('Error armando las hojas: ' + err.message, 'warning');
    return;
  }

  if (!sheets.length) {
    showToast('No hay imágenes para exportar.', 'warning');
    return;
  }

  const customName = (state.documentCustomTitle || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  const baseName = customName ? customName : ('RealScan_' + spec.fileName);
  const paperTag = paper.shortName.replace(/\s+/g, '_');

  try {
    for (let i = 0; i < sheets.length; i++) {
      const blob = await renderJpgSheet(paper, spec, sheets[i], i, sheets.length, kind, state.photoCopies);
      if (!blob) throw new Error('No se pudo generar la imagen');
      const suffix = sheets.length > 1 ? ('_hoja' + (i + 1) + 'de' + sheets.length) : '';
      downloadJpgBlob(blob, baseName + '_' + paperTag + '_300DPI' + suffix + '.jpg');
      if (i < sheets.length - 1) await new Promise(function(r) { setTimeout(r, 400); });
    }
    if (typeof logActivity === 'function') {
      logActivity('Descarga Imagen ' + paper.shortName + ' (300 DPI)', (kind === 'photos' ? state.photoCopies + ' fotos' : spec.name) + (sheets.length > 1 ? ' — ' + sheets.length + ' hojas' : ''));
    }
    showToast(sheets.length > 1
      ? '¡' + sheets.length + ' imágenes (una por hoja) descargadas con éxito!'
      : '¡Imagen ' + paper.shortName + ' a 300 DPI descargada con éxito!', 'success');
  } catch (err) {
    showToast('Error generando la imagen: ' + err.message, 'warning');
  }
}
