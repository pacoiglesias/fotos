/* ============================================================
   RealScan Pro — Módulo de Exportación, Impresión Directa e Imagen
   Desarrollado por Paco Iglesias • Escala 1:1 Físicamente Calibrada
   ============================================================ */

async function createDigitalFile(side, format, maxPx) {
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
  if (typeof waitForProcessingComplete === 'function') {
    if (!await waitForProcessingComplete()) return;
  }
  if (reviewed !== true && typeof showPrintReview === 'function') return showPrintReview(() => handlePrintDirect(true));
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
          '\n\n¿Deseas imprimir ÚNICAMENTE las caras disponibles (dejando el espacio vacío sin inventar contenido) o cancelar para cargar la imagen faltante?';
        if (!(await showConfirmDialog(missingMsg, { title: 'Faltan caras por cargar', confirmText: 'Imprimir así' }))) return;
      }
    }
    const warnings = preflight.issues.filter(x => x.type === 'warning');
    if (warnings.length > 0) {
      const warnMsg = warnings.map(x => x.message).join('\n') + '\n\n¿Deseas continuar con la impresión?';
      if (!(await showConfirmDialog(warnMsg, { title: 'Advertencias de impresión', confirmText: 'Continuar' }))) return;
    }
  }

  if (typeof ensureJsPdf === 'function') await ensureJsPdf();
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
    const guide = RealScanLayout.cutGuideGeometry(item);
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
    const canvas = renderPageToCanvas(layout.pages[0], layout, loadedImages);
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

    const pageBlobs = layout.pages.map(function(page, idx) {
      const canvas = renderPageToCanvas(page, layout, loadedImages);
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
    layout.pages.forEach(function(page, idx) {
      const canvas = renderPageToCanvas(page, layout, loadedImages);
      canvas.toBlob(async function(blob) {
        if (!blob) return;
        if (window.RealScanJpeg) blob = await window.RealScanJpeg.blobWithDpi(blob);
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
