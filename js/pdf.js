/* ============================================================
   RealScan Pro — Módulo de Generación PDF (1:1)
   Desarrollado por Paco Iglesias • Escala 1:1 Físicamente Calibrada
   ============================================================ */

function drawCornerCutMarks(doc, x, y, w, h) {
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.22);
  const tick = 2.5, off = 1.2;
  doc.line(x - off, y, x - off + tick, y); doc.line(x, y - off, x, y - off + tick);
  doc.line(x + w + off - tick, y, x + w + off, y); doc.line(x + w, y - off, x + w, y - off + tick);
  doc.line(x - off, y + h, x - off + tick, y + h); doc.line(x, y + h + off - tick, x, y + h + off);
  doc.line(x + w + off - tick, y + h, x + w + off, y + h); doc.line(x + w, y + h + off - tick, x + w, y + h + off);
}

function drawOvalCutMarks(doc, x, y, w, h) {
  // Elipse punteada oficial
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.28);
  doc.setLineDashPattern([2, 1.5], 0);
  doc.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 'S');

  // Marcas cardinales en los 4 polos
  doc.setLineWidth(0.25);
  doc.setLineDashPattern([], 0);
  const tick = 2.5;
  doc.line(x + w / 2, y - tick, x + w / 2, y);
  doc.line(x + w / 2, y + h, x + w / 2, y + h + tick);
  doc.line(x - tick, y + h / 2, x, y + h / 2);
  doc.line(x + w, y + h / 2, x + w + tick, y + h / 2);
}

function drawCalibrationFooter(doc, pageW, spec, pageH) {
  if (state.includeRulerFooter === false) return; // Si el usuario lo desactiva, la hoja queda 100% limpia para trámites oficiales
  const totalH = pageH || 297;
  const rulerY = Math.round(totalH - 35);
  const rulerLengthMm = 50;
  const rulerStartX = (pageW - rulerLengthMm) / 2;

  doc.setLineDashPattern([], 0);
  doc.setDrawColor(70, 70, 70);
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
  doc.setTextColor(80, 80, 80);
  doc.setFont('Helvetica', 'normal');
  for (let i = 0; i <= 5; i++) {
    const markX = rulerStartX + (i * 10);
    doc.text(i + 'cm', markX - (i === 0 ? 0.6 : 1.8), rulerY + 5.8);
  }

  const paper = (typeof getActivePaperSpec === 'function') ? getActivePaperSpec() : { name: 'A4', shortName: 'A4' };
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('INSTRUCCIONES PARA IMPRIMIR A TAMAÑO REAL EXACTO (1:1):', pageW / 2, rulerY + 10.5, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('1. En tu impresora, selecciona Papel ' + paper.shortName + ' y ESCALA: 100% o TAMAÑO REAL (NO "Ajustar").', pageW / 2, rulerY + 14.5, { align: 'center' });
  doc.text('2. Mide la regla superior con una regla física: debe medir exactamente 5 centímetros.', pageW / 2, rulerY + 18, { align: 'center' });
  doc.text('RealScan — Desarrollado por Paco Iglesias | ' + spec.name + ' • Hoja ' + paper.name, pageW / 2, rulerY + 21.5, { align: 'center' });
}

function generatePdfDoc() {
  // Comprobar imágenes disponibles en cualquier ranura
  const hasAnyImage = Object.keys(state.images || {}).some(function(k) {
    return !!(state.images[k] && state.images[k].processedDataUrl);
  });
  if (!hasAnyImage) {
    showToast('Por favor captura o sube al menos una imagen antes de generar el PDF.', 'warning');
    return null;
  }

  // Generar el plan de composición milimétrico unificado
  const layout = window.RealScanLayout.computeDocumentLayout(state);
  const paper = layout.paper;
  const spec = layout.spec;
  const pageW = paper.widthMm;
  const pageH = paper.heightMm;

  // Bloqueo estricto por errores geométricos
  if (layout.errors && layout.errors.length > 0) {
    showToast('Error de geometría: ' + layout.errors[0], 'error');
    return null;
  }

  // Advertencias de geometría
  if (layout.warnings && layout.warnings.length > 0) {
    showToast(layout.warnings[0], 'warning');
  }

  const jsPDFCtor = window.jspdf.jsPDF;
  const doc = new jsPDFCtor({ orientation: 'portrait', unit: 'mm', format: paper.jsPdfFormat, compress: true });

  try {
    doc.setProperties({
      title: 'RealScan — ' + spec.name + ' (' + (state.outputScalePercent || 100) + '%)' ,
      author: 'Paco Iglesias (RealScan Pro)',
      creator: 'RealScan Pro ' + window.APP_VERSION
    });
  } catch (e) {}

  // Recorrer las páginas calculadas por el layout engine
  layout.pages.forEach(function(page, pageIdx) {
    if (pageIdx > 0) {
      doc.addPage(paper.jsPdfFormat, 'portrait');
    }

    // 1. Encabezado de página (si no es Hoja Limpia y hay título)
    if (!layout.isCleanSheet && page.sheetTitle) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text(page.sheetTitle.toUpperCase(), pageW / 2, 12, { align: 'center' });
    }

    // 2. Elementos colocados en la página (sin inventar caras faltantes)
    page.placements.forEach(function(item) {
      const imgData = (state.images[item.slot] && state.images[item.slot].processedDataUrl)
        ? state.images[item.slot].processedDataUrl
        : null;

      if (imgData) {
        doc.addImage(imgData, 'JPEG', item.xMm, item.yMm, item.widthMm, item.heightMm, undefined, 'FAST');
      }

      // Líneas de corte y bordes
      if (item.drawOvalGuide) {
        drawOvalCutMarks(doc, item.xMm, item.yMm, item.widthMm, item.heightMm);
      } else if (item.drawBorder) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.22);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.rect(item.xMm - 0.2, item.yMm - 0.2, item.widthMm + 0.4, item.heightMm + 0.4);
      }

      if (item.drawCutMarks && !item.drawOvalGuide) {
        drawCornerCutMarks(doc, item.xMm, item.yMm, item.widthMm, item.heightMm);
      }

      // Rótulo y medidas del documento
      if (item.label) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text(item.label, item.xMm, item.yMm - 2.5);
      }
    });

    // 3. Regla de calibración al pie
    if (page.hasRuler) {
      drawCalibrationFooter(doc, pageW, spec, pageH);
    }
  });

  return doc;
}

function downloadPdf() {
  const doc = generatePdfDoc();
  if (!doc) return;
  const spec = getActiveSpec();
  const paper = (typeof getActivePaperSpec === 'function') ? getActivePaperSpec() : { shortName: 'A4' };
  const filename = spec.fileName + '_' + paper.shortName.toLowerCase() + '_1a1_real.pdf';
  doc.save(filename);
  showToast('✅ PDF descargado (' + filename + '). Recuerda imprimir al 100% de escala.', 'success');
}

function printDirectFromBrowser() {
  const doc = generatePdfDoc();
  if (!doc) return;
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    let printFrame = document.getElementById('realscan_print_iframe');
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'realscan_print_iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }
    printFrame.src = blobUrl;
    printFrame.onload = function() {
      setTimeout(function() {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
        } catch(e) {
          window.print();
        }
      }, 350);
    };
    showToast('🖨️ Abriendo cuadro de impresión a escala 1:1 real...', 'info');
  } catch (err) {
    window.print();
  }
}
