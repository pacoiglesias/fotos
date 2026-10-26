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

function generatePdfDoc(outputOptions = {}) {
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
  window.RealScanDiagnostics?.record('output.pdf',layout.errors.length ? 'error' : 'info',{count:layout.pages.length,guides:layout.includeCutMarks,ruler:layout.includeRulerFooter,labels:layout.includeDocLabels});
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
    // Perfil de calibración de impresora: corrige la geometría del documento
    // (escala y desplazamiento) para la impresora elegida como activa.
    const profileTransform = (window.RealScanPrinterProfiles && typeof window.RealScanPrinterProfiles.getTransform === 'function')
      ? window.RealScanPrinterProfiles.getTransform()
      : null;
    const drawn=page.placements.map(rawItem=>profileTransform?profileTransform(rawItem):rawItem);
    drawn.forEach(function(item) {
      doc.setFillColor(255,255,255);
      for(const rect of RealScanLayout.whiteFrameGeometry(item,drawn,paper))doc.rect(...rect,'F');
      const imgData = outputOptions.imagesOverride?.[item.slot] || state.images[item.slot]?.processedDataUrl || null;

      if (imgData) {
        const properties = doc.getImageProperties(imgData);
        const box = RealScanLayout.imagePlacement(item, properties.width, properties.height);
        doc.addImage(imgData, 'JPEG', box.x, box.y, box.w, box.h, undefined, 'FAST');
      }

      const guide = RealScanLayout.cutGuideGeometry(item,drawn,layout.paper);
      doc.setDrawColor(102,102,102);doc.setLineWidth(0.22);
      doc.setLineDashPattern([1.5,1.5],0);
      if(guide.oval)doc.ellipse(guide.x+guide.w/2,guide.y+guide.h/2,guide.w/2,guide.h/2,'S');
      else if(guide.border)doc.rect(guide.x,guide.y,guide.w,guide.h);
      doc.setLineDashPattern([],0);
      for(const line of guide.lines)doc.line(...line);

      // Rótulo y medidas del documento
      if (item.label) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text(item.label, item.xMm, item.yMm - 2.5);
      }
    });

    // 3. Regla de calibración al pie
    window.RealScanAnnotations?.drawPdf(doc,window.RealScanAnnotationWorkflow.keyFor(page,layout),pageW,pageH,layout.annotations||[]);
    if (page.hasRuler) {
      drawCalibrationFooter(doc, pageW, spec, pageH);
    }
  });

  return doc;
}

/* Ruta de respaldo window.print(): fija el tamaño de página y márgenes cero
   con una regla @page dinámica para no perder la escala 1:1 del papel activo. */
function applyPrintPageStyle() {
  try {
    const paper = (typeof getActivePaperSpec === 'function')
      ? getActivePaperSpec()
      : { widthMm: 210, heightMm: 297 };
    let styleEl = document.getElementById('realscan-print-page');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'realscan-print-page';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = '@page { size: ' + paper.widthMm + 'mm ' + paper.heightMm + 'mm; margin: 0; }';
  } catch (e) {}
}

async function downloadPdf() {
  if (typeof ensureJsPdf === 'function') await ensureJsPdf();
  const doc = generatePdfDoc();
  if (!doc) return;
  if (window.RealScanFolio) window.RealScanFolio.stampOnPdf(doc);
  const spec = getActiveSpec();
  const paper = (typeof getActivePaperSpec === 'function') ? getActivePaperSpec() : { shortName: 'A4' };
  const filename = spec.fileName + '_' + paper.shortName.toLowerCase() + '_1a1_real.pdf';
  doc.save(filename);
  showToast('✅ PDF descargado (' + filename + '). Recuerda imprimir al 100% de escala.', 'success');
}

async function printDirectFromBrowser() { return handlePrintDirect(); }
