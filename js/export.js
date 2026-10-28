/* Folio y marca en las entregas digitales (AÑADIDO 10.4, v3.13.0).
   Cada entrega digital lleva un folio correlativo del negocio y, si está
   configurada en Ajustes, la marca de la tienda en el pie de la HOJA —
   nunca sobre el documento oficial—. El folio queda en la bitácora y en
   el trabajo del historial asociado. */
window.RealScanFolio = (function() {
  const SEQ_KEY = 'realscan_folio_seq_v1';
  const BRAND_KEY = 'realscan_shop_brand_v1';
  function peekNext() { try { return parseInt(localStorage.getItem(SEQ_KEY) || '1', 10) || 1; } catch (e) { return 1; } }
  function format(n) { return 'F-' + String(n).padStart(6, '0'); }
  function brand() { try { return (localStorage.getItem(BRAND_KEY) || '').trim(); } catch (e) { return ''; } }
  function assign() {
    const n = peekNext();
    try { localStorage.setItem(SEQ_KEY, String(n + 1)); } catch (e) {}
    const folio = format(n);
    if (typeof logActivity === 'function') logActivity('Entrega digital', 'Folio ' + folio + (brand() ? ' · ' + brand() : ''));
    try {
      const id = (typeof state !== 'undefined') ? state._lastSavedScanId : null;
      if (id && typeof window.updateScanRecord === 'function') {
        window.updateScanRecord(id, { lastFolio: folio }).then(function() { if (typeof renderHistoryUI === 'function') renderHistoryUI(); });
      }
    } catch (e) {}
    return folio;
  }
  function stampOnPdf(doc) {
    if (!doc || typeof doc.internal === 'undefined') return null;
    const folio = assign();
    try {
      const pages = doc.getNumberOfPages ? doc.getNumberOfPages() : 1;
      const shop = brand();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        const size = doc.internal.pageSize;
        const w = size.getWidth ? size.getWidth() : size.width;
        const h = size.getHeight ? size.getHeight() : size.height;
        doc.setFontSize(6.5);
        doc.setTextColor(130, 130, 130);
        doc.text('Folio ' + folio + ' · RealScan Pro', 8, h - 4);
        if (shop) doc.text(shop, w - 8, h - 4, { align: 'right' });
      }
    } catch (e) {}
    return folio;
  }
  return { peek: function() { return format(peekNext()); }, format: format, brand: brand, assign: assign, stampOnPdf: stampOnPdf };
})();

/* ============================================================
   RealScan Pro — Módulo de Exportación, Impresión Directa e Imagen
   Desarrollado por Paco Iglesias • Escala 1:1 Físicamente Calibrada
   ============================================================ */

/* Peso real de un dataUrl base64 (con corrección del relleno '=' final),
   igual que el cálculo del módulo de entrega retirado: así el tamaño
   declarado coincide con los bytes reales del archivo. */
function deliveryBytes(data) {
  return Math.floor(data.split(",")[1].length * 0.75) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
}

async function createDigitalFileBase(side, format, maxPx) {
  const source = state.images[side]?.processedDataUrl;
  if (!source) throw Error('No hay imagen procesada en la cara seleccionada.');
  const image = new Image(); image.src = source; await image.decode();
  const policy = getActiveSpec().digital;
  if(getActiveSpec().noRetouch && (state.images[side].filter !== 'color' || state.images[side].brightness || state.images[side].contrast)) throw Error('Restablece color y luz originales antes de entregar una foto de este perfil.');
  if(policy && !policy.formats.includes(format)) throw Error('Este perfil requiere JPG para la foto digital. La hoja de impresión se entrega como PDF por separado.');
  const requestedLimit = maxPx === 'original' ? Math.max(image.naturalWidth, image.naturalHeight) : Math.max(100, Number(maxPx) || 1920);
  const limit = policy ? Math.min(requestedLimit, policy.maxPixels) : requestedLimit;
  const ratio = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  if(policy && (canvas.width < policy.minPixels || canvas.height < policy.minPixels)) throw Error('La imagen digital necesita al menos '+policy.minPixels+' × '+policy.minPixels+' píxeles. Carga una foto con mayor resolución.');
  const ctx = canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  let type, dataUrl, extension;
  if (format === 'pdf') {
    if (typeof ensureJsPdf === 'function') await ensureJsPdf();
    const spec = getActiveSpec();
    const doc = new window.jspdf.jsPDF({orientation:spec.widthMm>spec.heightMm?'landscape':'portrait',unit:'mm',format:[spec.widthMm,spec.heightMm]});
    const box = RealScanLayout.imagePlacement({xMm:0,yMm:0,widthMm:spec.widthMm,heightMm:spec.heightMm},canvas.width,canvas.height);
    doc.addImage(canvas.toDataURL('image/jpeg',.95),'JPEG',box.x,box.y,box.w,box.h);
    type='application/pdf';extension='pdf';dataUrl='data:application/pdf;base64,'+doc.output('datauristring').split(',')[1];
  } else {
    type=format==='png'?'image/png':'image/jpeg';extension=format==='png'?'png':'jpg';dataUrl=canvas.toDataURL(type,.94);
    if(policy?.maxBytes){for(const quality of [.90,.85,.80,.75]){if(Math.floor(dataUrl.split(',')[1].length*.75)<=policy.maxBytes)break;dataUrl=canvas.toDataURL(type,quality);}if(Math.floor(dataUrl.split(',')[1].length*.75)>policy.maxBytes)throw Error('La foto supera el peso máximo del perfil. Prueba la opción de 600 px.');}
    // Escribe la densidad 300 DPI en la cabecera JFIF para que la entrega
    // conserve la escala al imprimirla en otro equipo.
    if (type === 'image/jpeg' && window.RealScanJpeg) dataUrl = window.RealScanJpeg.dataUrlWithDpi(dataUrl);
  }
  return {name:'RealScan_'+(side==='front'?'Frente':'Reverso')+'_'+Date.now()+'.'+extension,type,dataUrl,size:Math.floor((dataUrl.length-dataUrl.indexOf(',')-1)*.75)};
}

/* Límite de peso de la entrega digital (antes en el módulo de entrega
   retirado con el modal legacy; ahora vive aquí, junto al exportador).
   Sin límite (sin 4º argumento y sin política digital del perfil) no
   cambia nada: solo actúa cuando se pide un tope o el perfil lo impone.
   El PNG nunca se convierte en silencio: si supera el tope, se avisa. */
async function createDigitalFile(side, format, maxPx, maxBytes) {
  const first = await createDigitalFileBase(side, format, maxPx);
  first.size = deliveryBytes(first.dataUrl);
  const policy = getActiveSpec().digital, cap = Math.min(maxBytes || Infinity, policy?.maxBytes || Infinity);
  if (first.size <= cap) return first;
  if (format === "png") throw Error("El PNG supera el peso elegido. Elige JPG para comprimir o aumenta el límite; no se cambiará el formato automáticamente.");
  if (format === "pdf") {
    let limit = maxPx === "original" ? Math.max(state.images[side].naturalWidth, state.images[side].naturalHeight) : Number(maxPx);
    for (let attempt = 0; attempt < 12; attempt++) {
      limit = Math.floor(limit * 0.85);
      if (limit < 600) break;
      const file = await createDigitalFileBase(side, format, String(limit));
      file.size = deliveryBytes(file.dataUrl);
      if (file.size <= cap) return file;
    }
    throw Error("No se pudo reducir este PDF al peso elegido conservando resolución suficiente. Aumenta el límite o entrega una imagen JPG.");
  }
  const image = new Image();
  image.src = first.dataUrl;
  await image.decode();
  const canvas = document.createElement("canvas"), min = policy?.minPixels || 300;
  for (let factor = 1; factor > 0.1; factor *= 0.85) {
    canvas.width = Math.floor(image.naturalWidth * factor);
    canvas.height = Math.floor(image.naturalHeight * factor);
    if (Math.min(canvas.width, canvas.height) < min) break;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality), size = deliveryBytes(dataUrl);
      if (size <= cap) return { ...first, dataUrl, size };
    }
  }
  throw Error("No se pudo cumplir el peso sin reducir demasiado la resolución. Elige un límite mayor. El original se conserva.");
}

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
async function handleExportPDF(tryShare, reviewed) {
  if (typeof waitForProcessingComplete === 'function') {
    if (!await waitForProcessingComplete()) return;
  }
  // Resumen previo a la descarga (mismo criterio que «Revisa antes de imprimir»):
  // tipo, caras, papel, copias, perfil de impresora y vista de la hoja.
  if (reviewed !== true && tryShare !== true && typeof showPrintReview === 'function') {
    return showPrintReview(function() { handleExportPDF(tryShare, true); }, { title: 'Revisa antes de descargar el PDF', confirmLabel: 'Continuar a descargar', mode: 'pdf' });
  }
  // Verificación de Pre-Vuelo Estricta (M-31)
  if (typeof runPreflightChecks === 'function') {
    const preflight = runPreflightChecks();
    if (!preflight.valid) {
      const fatalErrors = preflight.issues.filter(x => x.type === 'error' && x.code !== 'MISSING_SLOT');
      if (fatalErrors.length > 0) {
        const errorMsg = fatalErrors.map(x => x.message).join('\n');
        if (typeof showToast === 'function') showToast(errorMsg, 'error');
        alert(errorMsg);
        return;
      }
      const missingSlotErrors = preflight.issues.filter(x => x.type === 'error' && x.code === 'MISSING_SLOT');
      if (missingSlotErrors.length > 0) {
        const missingMsg = missingSlotErrors.map(x => x.message).join('\n') +
          '\n\n¿Deseas exportar ÚNICAMENTE las caras disponibles (dejando el espacio vacío sin inventar contenido) o cancelar para cargar la imagen faltante?';
        if (!(await showConfirmDialog(missingMsg, { title: 'Faltan caras por cargar', confirmText: 'Exportar así' }))) return;
      }
    }
    const warnings = preflight.issues.filter(x => x.type === 'warning');
    if (warnings.length > 0) {
      const warnMsg = warnings.map(x => x.message).join('\n') + '\n\n¿Deseas continuar con la exportación?';
      if (!(await showConfirmDialog(warnMsg, { title: 'Advertencias de exportación', confirmText: 'Continuar' }))) return;
    }
  }

  if (typeof ensureJsPdf === 'function') await ensureJsPdf();
  const doc = generatePdfDoc();
  if (!doc) return;
  if (window.RealScanFolio) window.RealScanFolio.stampOnPdf(doc);
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
async function handlePrintDirect(reviewed = false) {
  if (state._processingPending) showToast('Terminando la imagen antes de imprimir…', 'info');
  if (!await waitForProcessingComplete()) return;
  if (reviewed !== true || !RealScanPrint.isPrepared()) return showPrintReview(() => handlePrintDirect(true));
  const fatal = runPreflightChecks().issues.filter(i => i.type === 'error' && i.code !== 'MISSING_SLOT');
  if (fatal.length) { showToast(fatal.map(i => i.message).join(' '), 'error'); return; }
  try {
    showToast('Abriendo impresión. Selecciona el papel indicado y Tamaño real / 100 %.', 'info');
    await RealScanPrint.print();
    if (typeof logActivity === 'function') logActivity('Abrir impresión', getActiveSpec().name);
  } catch (error) { showToast(error.message + ' Puedes descargar la hoja PDF como alternativa.', 'error'); }
}

/**
 * Dibuja una página completa en un elemento Canvas a 300 DPI calibrados
 * usando las posiciones milimétricas de RealScanLayout
 */
async function renderPageToCanvas(page, layout, loadedImages) {
  await window.RealScanAnnotations?.prepare(layout.annotations||[]);
  window.RealScanDiagnostics?.record('output.raster','info',{count:page.placements.length,guides:layout.includeCutMarks});
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

    const imgObj = (loadedImages && loadedImages[item.slot]) ? loadedImages[item.slot] : null;

    // Image first, then guides, so opaque photos cannot hide their cut outline.
    if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
      const box = RealScanLayout.imagePlacement(item,imgObj.naturalWidth,imgObj.naturalHeight);
      ctx.drawImage(imgObj,box.x*pxPerMm,box.y*pxPerMm,box.w*pxPerMm,box.h*pxPerMm);
    }
    const guide = RealScanLayout.cutGuideGeometry(item,page.placements,layout.paper);
    ctx.save();
    ctx.scale(pxPerMm,pxPerMm);ctx.strokeStyle='#666666';ctx.lineWidth=0.22;ctx.setLineDash([1.5,1.5]);
    if(guide.oval){ctx.beginPath();ctx.ellipse(guide.x+guide.w/2,guide.y+guide.h/2,guide.w/2,guide.h/2,0,0,Math.PI*2);ctx.stroke();}
    else if(guide.border)ctx.strokeRect(guide.x,guide.y,guide.w,guide.h);
    ctx.setLineDash([]);ctx.beginPath();
    for(const [x1,y1,x2,y2] of guide.lines){ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);}
    ctx.stroke();ctx.restore();

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

  // Folio y marca en el pie de la hoja (AÑADIDO 10.4): franja inferior de
  // la HOJA, nunca sobre el documento.
  try {
    if (window.RealScanFolio) {
      const folioTxt = window.RealScanFolio.assign();
      const brandTxt = window.RealScanFolio.brand();
      const stripH = Math.max(20, Math.round(canvas.height * 0.014));
      const c2 = canvas.getContext('2d');
      c2.fillStyle = '#ffffff';
      c2.fillRect(0, canvas.height - stripH, canvas.width, stripH);
      c2.fillStyle = '#666666';
      c2.font = Math.round(stripH * 0.52) + 'px sans-serif';
      c2.textBaseline = 'middle';
      c2.fillText('Folio ' + folioTxt + ' · RealScan Pro', 12, canvas.height - stripH / 2);
      if (brandTxt) { const tw = c2.measureText(brandTxt).width; c2.fillText(brandTxt, canvas.width - tw - 12, canvas.height - stripH / 2); }
    }
  } catch (e) {}

  const annotations=window.RealScanAnnotations?.raster(window.RealScanAnnotationWorkflow.keyFor(page,layout),paper.widthMm,paper.heightMm,layout.annotations||[]);if(annotations){const layer=await window.RealScanAnnotationWorkflow.image(annotations);ctx.drawImage(layer,0,0,canvas.width,canvas.height);}
  return canvas;
}

/**
 * Descarga de Imagen(es) a 300 DPI Constantes con soporte para todas las páginas
 */
async function downloadA4Image() {
  if (typeof waitForProcessingComplete === 'function') {
    if (!await waitForProcessingComplete()) return;
  }
  // Verificación de Pre-Vuelo Estricta antes de generar imagen(es)
  if (typeof runPreflightChecks === 'function') {
    const preflight = runPreflightChecks();
    if (!preflight.valid) {
      const fatalErrors = preflight.issues.filter(x => x.type === 'error' && x.code !== 'MISSING_SLOT');
      if (fatalErrors.length > 0) {
        const errorMsg = fatalErrors.map(x => x.message).join('\n');
        if (typeof showToast === 'function') showToast(errorMsg, 'error');
        alert(errorMsg);
        return;
      }
      const missingSlotErrors = preflight.issues.filter(x => x.type === 'error' && x.code === 'MISSING_SLOT');
      if (missingSlotErrors.length > 0) {
        const missingMsg = missingSlotErrors.map(x => x.message).join('\n') +
          '\n\n¿Deseas exportar ÚNICAMENTE las caras disponibles (dejando el espacio vacío sin inventar contenido) o cancelar para cargar la imagen faltante?';
        if (!(await showConfirmDialog(missingMsg, { title: 'Faltan caras por cargar', confirmText: 'Exportar así' }))) return;
      }
    }
    const warnings = preflight.issues.filter(x => x.type === 'warning');
    if (warnings.length > 0) {
      const warnMsg = warnings.map(x => x.message).join('\n') + '\n\n¿Deseas continuar con la exportación de imagen?';
      if (!(await showConfirmDialog(warnMsg, { title: 'Advertencias de exportación', confirmText: 'Continuar' }))) return;
    }
  }

  const hasAnyImage = Object.keys(state.images || {}).some(function(k) {
    return !!(state.images[k] && state.images[k].processedDataUrl);
  });
  if (!hasAnyImage) {
    showToast('Por favor captura o sube al menos una imagen.', 'warning');
    return;
  }

  const layout = window.RealScanLayout.computeDocumentLayout(state);
  if (layout.errors && layout.errors.length > 0) {
    showToast('Error de geometría: ' + layout.errors[0], 'error');
    alert('No se puede exportar la imagen:\n' + layout.errors.join('\n'));
    return;
  }
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
    const canvas = await renderPageToCanvas(layout.pages[0], layout, loadedImages);
    canvas.toBlob(async function(blob) {
      if (!blob) return;
      if (window.RealScanJpeg) blob = await window.RealScanJpeg.blobWithDpi(blob);
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

  // Caso 2: Múltiples páginas -> Empaquetar en ZIP (JSZip se carga bajo demanda),
  // o descargar secuencialmente si la librería no se pudo cargar
  const zipReady = (typeof ensureJSZip === 'function') ? await ensureJSZip() : (typeof window.JSZip !== 'undefined');
  if (zipReady && typeof window.JSZip !== 'undefined') {
    const zip = new window.JSZip();
    const folder = zip.folder(baseName + '_hojas_300DPI');

    const pageBlobs = layout.pages.map(async function(page, idx) {
      const canvas = await renderPageToCanvas(page, layout, loadedImages);
      return new Promise(function(resolve) {
        canvas.toBlob(async function(blob) {
          if (blob && window.RealScanJpeg) blob = await window.RealScanJpeg.blobWithDpi(blob);
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
    for (const [idx,page] of layout.pages.entries()) {
      const canvas=await renderPageToCanvas(page,layout,loadedImages);
      let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.95));
      if(!blob)continue;
      if(window.RealScanJpeg)blob=await window.RealScanJpeg.blobWithDpi(blob);
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=baseName+'_Hoja_'+(idx+1)+'_300DPI.jpg';document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},2000);
    }
    showToast('¡' + layout.totalPages + ' imágenes descargadas!', 'success');
  }
}
