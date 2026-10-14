/* ============================================================
   RealScan Pro — Módulo de Generación PDF A4 (1:1)
   Desarrollado por Paco Iglesias • Escala 1:1 Calibrada
   ============================================================ */

function drawCornerCutMarks(doc, x, y, w, h) {
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(120,120,120);
  doc.setLineWidth(0.22);
  const tick = 2.5, off = 1.2;
  doc.line(x-off, y, x-off+tick, y); doc.line(x, y-off, x, y-off+tick);
  doc.line(x+w+off-tick, y, x+w+off, y); doc.line(x+w, y-off, x+w, y-off+tick);
  doc.line(x-off, y+h, x-off+tick, y+h); doc.line(x, y+h+off-tick, x, y+h+off);
  doc.line(x+w+off-tick, y+h, x+w+off, y+h); doc.line(x+w, y+h+off-tick, x+w, y+h+off);
}

function drawCalibrationFooter(doc, pageW, spec, pageH) {
  if (state.includeRulerFooter === false) return; // Si el usuario lo desactiva, la hoja queda 100% limpia para trámites oficiales
  const totalH = pageH || 297;
  const rulerY = Math.round(totalH - 35);
  const rulerLengthMm = 50;
  const rulerStartX = (pageW - rulerLengthMm) / 2;

  doc.setLineDashPattern([], 0);
  doc.setDrawColor(70,70,70);
  doc.setLineWidth(0.35);
  doc.line(rulerStartX, rulerY, rulerStartX + rulerLengthMm, rulerY);

  doc.setLineWidth(0.22);
  for (let mm = 0; mm <= 50; mm++) {
    const markX = rulerStartX + mm;
    let tickH = 1.0;
    if (mm % 10 === 0) tickH = 2.8;
    else if (mm % 5 === 0) tickH = 1.8;
    doc.line(markX, rulerY, markX, rulerY + tickH);
  }

  doc.setFontSize(6.5);
  doc.setTextColor(80,80,80);
  doc.setFont('Helvetica', 'normal');
  for (let i = 0; i <= 5; i++) {
    const markX = rulerStartX + (i * 10);
    doc.text(i + 'cm', markX - (i === 0 ? 0.6 : 1.8), rulerY + 5.8);
  }

  const paper = (typeof getActivePaperSpec === 'function') ? getActivePaperSpec() : { name: 'A4' };
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30,30,30);
  doc.text('INSTRUCCIONES PARA IMPRIMIR A TAMAÑO REAL EXACTO (1:1):', pageW / 2, rulerY + 10.5, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80,80,80);
  doc.text('1. En tu impresora, selecciona Papel ' + paper.shortName + ' y ESCALA: 100% o TAMAÑO REAL (NO "Ajustar").', pageW / 2, rulerY + 14.5, { align: 'center' });
  doc.text('2. Mide la regla superior con una regla física: debe medir exactamente 5 centímetros.', pageW / 2, rulerY + 18, { align: 'center' });
  doc.text('RealScan — Desarrollado por Paco Iglesias | ' + spec.name + ' • Hoja ' + paper.name, pageW / 2, rulerY + 21.5, { align: 'center' });
}

function generatePdfDoc() {
  if (!state.images.front.processedDataUrl) {
    showToast('Por favor captura o sube al menos el Anverso o Foto principal.', 'warning');
    return null;
  }

  if (state.activeCategory === 'docs' && state.printMode === 'both' && !state.images.back.processedDataUrl) {
    const ok = confirm('Has seleccionado imprimir Anverso + Reverso en 1 hoja, pero no has cargado la foto del Reverso.\n\n¿Deseas generar el PDF incluyendo solo el Anverso?');
    if (!ok) return null;
  }

  const paper = (typeof getActivePaperSpec === 'function') ? getActivePaperSpec() : { widthMm: 210, heightMm: 297, jsPdfFormat: 'a4' };
  const jsPDFCtor = window.jspdf.jsPDF;
  const doc = new jsPDFCtor({ orientation: 'portrait', unit: 'mm', format: paper.jsPdfFormat, compress: true });

  try {
    doc.setProperties({
      title: 'RealScan — ' + getActiveSpec().name,
      author: 'Paco Iglesias (RealScan)',
      creator: 'RealScan'
    });
  } catch (e) {}

  const spec = getActiveSpec();
  const targetW = spec.widthMm;
  const targetH = spec.heightMm;
  const pageW = paper.widthMm;
  const pageH = paper.heightMm;

  if (state.activeCategory === 'photos') {
    const copies = state.photoCopies;
    const info = getPhotoLayoutInfo(targetW, targetH, copies);
    const cols = info.cols;
    const gapX = info.gap;
    const gapY = info.gap;
    const maxRowsPerPage = info.maxRows;
    const maxPerPage = cols * maxRowsPerPage;

    const totalGridW = cols * targetW + (cols - 1) * gapX;
    const startX = (pageW - totalGridW) / 2;
    const startY = 22;

    let currentPagePhotos = 0;
    const totalPages = Math.max(1, Math.ceil(copies / maxPerPage));

    function printPhotoHeader(pageIdx) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(50,50,50);
      const pageStr = totalPages > 1 ? (' (Hoja ' + (pageIdx + 1) + ' de ' + totalPages + ')') : '';
      doc.text('PLANILLA DE FOTOS: ' + spec.name.toUpperCase() + ' (' + copies + ' FOTOS' + pageStr + ')', pageW/2, startY - 9, { align: 'center' });

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(110,110,110);
      doc.text('Medida física exacta: ' + targetW + ' × ' + targetH + ' mm | Guías de corte calibradas a escala 1:1 real', pageW/2, startY - 4.5, { align: 'center' });
    }

    printPhotoHeader(0);

    for (let i = 0; i < copies; i++) {
      if (currentPagePhotos >= maxPerPage) {
        drawCalibrationFooter(doc, pageW, spec, pageH);
        doc.addPage();
        currentPagePhotos = 0;
        const curPageIdx = Math.floor(i / maxPerPage);
        printPhotoHeader(curPageIdx);
      }

      const c = currentPagePhotos % cols;
      const r = Math.floor(currentPagePhotos / cols);
      const photoX = startX + c * (targetW + gapX);
      const photoY = startY + r * (targetH + gapY);

      const useBack = (state.mixTwoPhotos && state.images.back.processedDataUrl && i >= Math.floor(copies / 2));
      const curImg = useBack ? state.images.back.processedDataUrl : state.images.front.processedDataUrl;
      doc.addImage(curImg, 'JPEG', photoX, photoY, targetW, targetH, undefined, 'FAST');

      if (spec.isOval) {
        // Línea de corte elíptica calibrada oficial (SEP / Título)
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.28);
        doc.setLineDashPattern([2, 1.5], 0);
        doc.ellipse(photoX + targetW / 2, photoY + targetH / 2, targetW / 2, targetH / 2, 'S');

        // Marcas de corte cardinales en los 4 extremos de la elipse
        doc.setLineWidth(0.25);
        doc.setLineDashPattern([], 0);
        const tick = 2.5;
        doc.line(photoX + targetW / 2, photoY - tick, photoX + targetW / 2, photoY);
        doc.line(photoX + targetW / 2, photoY + targetH, photoX + targetW / 2, photoY + targetH + tick);
        doc.line(photoX - tick, photoY + targetH / 2, photoX, photoY + targetH / 2);
        doc.line(photoX + targetW, photoY + targetH / 2, photoX + targetW + tick, photoY + targetH / 2);
      } else {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.22);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.rect(photoX - 0.2, photoY - 0.2, targetW + 0.4, targetH + 0.4);
        drawCornerCutMarks(doc, photoX, photoY, targetW, targetH);
      }

      currentPagePhotos++;
    }
  } else {
    // Modo Documentos: Soporte completo para 1, 2, 3 o 4 páginas (Pasaporte, Tarjetas de Visita, DNI, etc.)
    const candidateSlots = (state.printMode === 'single') 
      ? ['front']
      : ['front', 'back', 'page3', 'page4'].slice(0, state.documentPageCount || 2);

    const activeItems = [];
    candidateSlots.forEach(function(slotKey, idx) {
      if (state.images[slotKey] && state.images[slotKey].processedDataUrl) {
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

        activeItems.push({
          slot: slotKey,
          label: label,
          dataUrl: state.images[slotKey].processedDataUrl
        });
      }
    });

    if (activeItems.length === 0) {
      showToast('Por favor captura o sube al menos una imagen.', 'warning');
      return null;
    }

    if (activeItems.length === 1 && state.printMode !== 'single' && !state.duplicateCard) {
      const ok = confirm('Has seleccionado imprimir múltiples caras o páginas, pero solo has cargado 1 foto.\n\n¿Deseas generar el PDF incluyendo solo esta página?');
      if (!ok) return null;
    }

    // Modo Duplicado: 2 Juegos de Copias en la misma Hoja (INE / DNI x2 en 2 Columnas)
    if (state.duplicateCard && (targetW * 2 + 12) <= pageW) {
      const gapX = 14;
      const totalWidth2Col = targetW * 2 + gapX;
      const startXCol1 = (pageW - totalWidth2Col) / 2;
      const startXCol2 = startXCol1 + targetW + gapX;
      const topMargin = 20;

      // Encabezado de la planilla duplicada
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      doc.text('COPIA DOBLE OFICIAL (2 JUEGOS EN 1 HOJA A TAMAÑO REAL 1:1)', pageW / 2, topMargin - 8, { align: 'center' });

      const columns = [
        { title: 'JUEGO 1', startX: startXCol1 },
        { title: 'JUEGO 2', startX: startXCol2 }
      ];

      columns.forEach(function(col) {
        activeItems.forEach(function(item, itemIdx) {
          const itemY = topMargin + itemIdx * (targetH + 14);

          // Borde punteado
          doc.setDrawColor(190, 190, 190);
          doc.setLineWidth(0.25);
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.rect(col.startX - 0.5, itemY - 0.5, targetW + 1, targetH + 1);

          // Imagen 1:1
          doc.addImage(item.dataUrl, 'JPEG', col.startX, itemY, targetW, targetH, undefined, 'FAST');
          drawCornerCutMarks(doc, col.startX, itemY, targetW, targetH);

          // Rótulo
          if (state.includeDocLabels !== false) {
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(90, 90, 90);
            const customName = (state.documentCustomTitle || '').trim();
            const prefix = customName ? (customName + ' • ' + col.title + ': ') : (col.title + ' • ');
            doc.text(prefix + item.label + ' (' + targetW + ' × ' + targetH + ' mm)', col.startX, itemY - 2.5);
          }
        });
      });

      drawCalibrationFooter(doc, pageW, spec, pageH);
      return doc;
    }

    const isSeparateSheets = (state.printMode === 'both_separate' || state.sheetLayout === 'separate_sheets');
    const posX = (pageW - targetW) / 2;
    const topMargin = (targetH > 100) ? 18 : 22;
    const maxAvailableH = (state.includeRulerFooter !== false) ? (pageH - 42) : (pageH - 24);
    const fitsTwo = !isSeparateSheets && ((topMargin + targetH * 2 + 14) <= maxAvailableH);
    const itemsPerSheet = fitsTwo ? 2 : 1;

    let itemsOnCurrentSheet = 0;
    let currentSheetIndex = 0;
    const totalSheets = Math.ceil(activeItems.length / itemsPerSheet);

    for (let i = 0; i < activeItems.length; i++) {
      if (itemsOnCurrentSheet >= itemsPerSheet) {
        drawCalibrationFooter(doc, pageW, spec, pageH);
        doc.addPage();
        itemsOnCurrentSheet = 0;
        currentSheetIndex++;
      }

      const item = activeItems[i];
      let itemY = topMargin;
      if (itemsPerSheet === 2 && itemsOnCurrentSheet === 1) {
        itemY = topMargin + targetH + 14;
      } else if (itemsPerSheet === 1 && targetH <= (maxAvailableH - 20)) {
        // Centrar verticalmente en la zona útil de la hoja (antes de la regla de calibración)
        itemY = Math.max(16, Math.round((maxAvailableH - targetH) / 2));
      }

      // Borde punteado de corte
      doc.setDrawColor(190, 190, 190);
      doc.setLineWidth(0.25);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.rect(posX - 0.5, itemY - 0.5, targetW + 1, targetH + 1);

      // Imagen procesada a escala 1:1 real
      doc.addImage(item.dataUrl, 'JPEG', posX, itemY, targetW, targetH, undefined, 'FAST');
      drawCornerCutMarks(doc, posX, itemY, targetW, targetH);

      // Título y dimensiones físicas (opcional para trámites oficiales)
      if (state.includeDocLabels !== false) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(90, 90, 90);
        const customName = (state.documentCustomTitle || '').trim();
        const displayLabel = customName ? (customName + ' • ' + item.label) : item.label;
        const sheetInfo = totalSheets > 1 ? (' [Hoja ' + (currentSheetIndex + 1) + '/' + totalSheets + ']') : '';
        doc.text(displayLabel + ' — ' + targetW + ' × ' + targetH + ' mm' + sheetInfo, posX, itemY - 2.5);
      }

      itemsOnCurrentSheet++;
    }
  }

  drawCalibrationFooter(doc, pageW, spec, pageH);
  return doc;
}
