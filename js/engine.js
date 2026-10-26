/* ============================================================
   RealScan Pro — Motor de Imagen, Filtros y Calibración (300 DPI)
   Desarrollado por Paco Iglesias • Escala 1:1 Calibrada
   ============================================================ */

/* ============================================================
   CÁMARA EN VIVO Y DISPOSITIVO NATIVO
   ============================================================ */
function getSlotIdSuffix(side) {
  if (side === 'front') return 'Front';
  if (side === 'back') return 'Back';
  if (side === 'page3') return 'Page3';
  if (side === 'page4') return 'Page4';
  return 'Front';
}

function getSlotFriendlyName(side) {
  if (side === 'front') return '1. Frente (Delantera con Foto)';
  if (side === 'back') return '2. Reverso (Atrás / Vuelta)';
  if (side === 'page3') return 'Página 3 / Visa 1';
  if (side === 'page4') return 'Página 4 / Visa 2';
  return 'Página';
}

function handleCameraClick(side) { openLiveCamera(side); }
function openLiveCamera(side) {
  state.activeCameraSide = side;
  if (!window.RealScanCapture) { triggerNativeUpload(side, true); return; }
  const job = state._jobRevision || 0;
  RealScanCapture.open({
    photoMode: state.activeCategory === 'photos',
    targetRatio: getActiveSpec().widthMm / getActiveSpec().heightMm,
    onNative: () => triggerNativeUpload(side, true),
    onError: error => showToast(error.message || 'No se pudo cargar la captura.', 'error'),
    onAccept: async dataUrl => {
      if ((state._jobRevision || 0) !== job) return;
      processRawDataUrl(dataUrl, side, true);
      if (!await waitForProcessingComplete(15000)) return;
      showToast('Foto lista. Revisa el recorte y el tamaño antes de imprimir.', 'success');
    }
  });
}
function switchCameraFacing() { openLiveCamera(state.activeCameraSide); }
function captureLivePhoto() { /* Capture is managed by the shared assisted camera. */ }
function closeLiveCamera() {
  window.RealScanCapture?.close();
  if (state.cameraStream) { state.cameraStream.getTracks().forEach(t => t.stop()); state.cameraStream = null; }
  closeModal('liveCameraModal');
}

function triggerNativeUpload(side, isCamera) {
  const input = $('fileInput' + getSlotIdSuffix(side));
  if (!input) return;
  if (isCamera) input.setAttribute('capture', 'environment');
  else input.removeAttribute('capture');
  input.value = '';
  input.click();
}

/* ============================================================
   CARGA DE ARCHIVOS Y PDF
   ============================================================ */
function handleImageFile(event, side) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  loadBlobIntoSide(file, side, {review:true}).catch(e=>showToast(e.message, 'error'));
}
function handleDragOver(event){event.preventDefault();event.currentTarget.classList.add('ring-2');}
function handleDragLeave(event){event.currentTarget.classList.remove('ring-2');}
function handleDrop(event,side){event.preventDefault();event.stopPropagation();event.currentTarget.classList.remove('ring-2');const file=event.dataTransfer?.files?.[0];if(file)loadBlobIntoSide(file,side,{review:true});}

function beginSlotRequest(side) {
  const slot=state.images[side];if(!slot)throw Error('Destino no válido.');
  slot._requestVersion=(slot._requestVersion||0)+1;slot._reading=true;
  window.RealScanWorkflow?.update();
  return {side,slot,version:slot._requestVersion,job:state._jobRevision||0};
}
function slotRequestCurrent(request) {
  return request && request.job===(state._jobRevision||0) && state.images[request.side]===request.slot && request.slot._requestVersion===request.version;
}
function finishSlotRequest(request) {if(slotRequestCurrent(request)){request.slot._reading=false;window.RealScanWorkflow?.update();}}

async function loadBlobIntoSide(blob, side, options = {}) {
  const request=beginSlotRequest(side);
  try {
    if (!blob || !blob.size || blob.size > 30*1024*1024) throw Error('Selecciona un archivo válido de hasta 30 MB.');
    if (blob.type === 'application/pdf' || /\.pdf$/i.test(blob.name || '')) {await handlePdfFile(blob,side,null,request);return slotRequestCurrent(request);}
    if (/\.hei[cf]$/i.test(blob.name || '')) throw Error('Exporta la imagen HEIC como JPG o PNG desde tu teléfono.');
    const dataUrl = await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('No se pudo leer el archivo.'));reader.readAsDataURL(blob);});
    if(!slotRequestCurrent(request))return false;
    const reviewed=options.review ? await RealScanReview.open({dataUrl,name:blob.name,photoMode:state.activeCategory==='photos'}) : dataUrl;
    if(!reviewed||!slotRequestCurrent(request))return false;
    const result=await window.handleLoadedFile(side,reviewed,blob.name,null,{request,preserveFrame:!!options.review});
    if(result?.loaded&&slotRequestCurrent(request))state.images[side].rawOriginalSrc=dataUrl;
    return !!result?.loaded;
  } catch(e) {if(slotRequestCurrent(request))showToast(e.message || 'No se pudo procesar el archivo.', 'error');return false;}
  finally {finishSlotRequest(request);}
}

// Función global para inyectar archivos cargados (usada por sincronización QR)
window.handleLoadedFile = async function(side, dataUrl, name, onAssigned, options = {}) {
  if (!state.images[side] || typeof dataUrl !== 'string') throw Error('Destino o archivo no válido.');
  const request=options.request||beginSlotRequest(side);
  try {
  if(!slotRequestCurrent(request))return {cancelled:true};
  const blob = await (await fetch(dataUrl)).blob();
  if(!slotRequestCurrent(request))return {cancelled:true};
  if (blob.type === 'application/pdf') return await handlePdfFile(new File([blob],name||'documento.pdf',{type:blob.type}),side,onAssigned,request);
  if (!blob.type.startsWith('image/')) throw Error('El archivo no es una imagen o PDF.');
  const probe = new Image();probe.src=dataUrl;await probe.decode();
  if(!slotRequestCurrent(request))return {cancelled:true};
  if(probe.naturalWidth*probe.naturalHeight>60000000)throw Error('La imagen supera 60 megapíxeles. Reduce su resolución antes de cargarla.');
  finishSlotRequest(request);
  processRawDataUrl(dataUrl,side,!!options.preserveFrame,request);
  if (!await waitForProcessingComplete(15000)) throw Error('La imagen no terminó de procesarse.');
  if(!slotRequestCurrent(request))return {cancelled:true};
  onAssigned?.(side);
  return {loaded:true};
  } finally {finishSlotRequest(request);}
};

async function handlePdfFile(file, targetSide, onAssigned, request = beginSlotRequest(targetSide)) {
  let task=null, retained=false;
  try {
    if(!window.pdfjsLib&&window.ensurePdfReader)await window.ensurePdfReader();
    if (!window.pdfjsLib) throw Error('No se pudo cargar el lector PDF. Recarga la aplicación.');
    showToast('Procesando PDF escaneado...', 'info');
    const arrayBuffer = await file.arrayBuffer();
    if(!slotRequestCurrent(request))return {cancelled:true};
    task = pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false, cMapUrl:'vendor/cmaps/', cMapPacked:true, standardFontDataUrl:'vendor/standard_fonts/', wasmUrl:'vendor/wasm/' });
    const pdfDoc = await task.promise;
    if(!slotRequestCurrent(request))return {cancelled:true};
    if (pdfDoc.numPages > 40) throw Error('El PDF supera 40 páginas. Divide el documento antes de cargarlo.');

    if (pdfDoc.numPages >= 2) {
      if (typeof openPdfPageSelector === 'function') {
        finishSlotRequest(request);
        retained=true;
        await openPdfPageSelector(pdfDoc, targetSide, onAssigned,()=>task.destroy?.());
        return {pendingSelection:true};
      }
      const numToLoad = Math.min(pdfDoc.numPages, 4);
      if (typeof setDocumentPages === 'function' && numToLoad > 2) {
        setDocumentPages(numToLoad);
      }
      const slots = ['front', 'back', 'page3', 'page4'];
      for (let i = 1; i <= numToLoad; i++) {
        const page = await pdfDoc.getPage(i);
        const dataUrl = await renderPdfPageToDataUrl(page);
        if(!slotRequestCurrent(request))return {cancelled:true};
        processRawDataUrl(dataUrl, slots[i - 1],true,slots[i - 1]===targetSide?request:null);
      }
      showToast('¡PDF de ' + numToLoad + ' páginas detectado y cargado con éxito!', 'success');
    } else {
      const p = await pdfDoc.getPage(1);
      const data=await renderPdfPageToDataUrl(p);
      if(!slotRequestCurrent(request))return {cancelled:true};
      finishSlotRequest(request);
      processRawDataUrl(data, targetSide,true,request);
      if (!await waitForProcessingComplete()) throw Error('El PDF aún se está procesando.');
      if(!slotRequestCurrent(request))return {cancelled:true};
      onAssigned?.(targetSide);
      showToast('¡PDF cargado en ' + getSlotFriendlyName(targetSide) + '!', 'success');
    }
  } catch (err) {
    if(!slotRequestCurrent(request))return {cancelled:true};
    throw Error(err.message?.includes('40 páginas') ? err.message : 'No se pudo abrir el PDF. Comprueba que sea válido y no tenga contraseña.');
  } finally {finishSlotRequest(request);if(!retained)await Promise.resolve(task?.destroy?.()).catch(()=>{});}
}

function getSafePdfViewport(page, requestedScale, maxDimension = 4000) {
  const natural = page.getViewport({scale:1});
  if(!Number.isFinite(natural.width) || !Number.isFinite(natural.height) || natural.width<=0 || natural.height<=0) throw Error('La página PDF tiene medidas inválidas.');
  return page.getViewport({scale:Math.min(requestedScale,maxDimension/Math.max(natural.width,natural.height))});
}

async function renderPdfPageToDataUrl(page) {
  const viewport = getSafePdfViewport(page, 3.0);
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.95);
}

/* ============================================================
   RECORTE AUTOMÁTICO DE BORDES BLANCOS (SCANNER AUTO-TRIM & RELLENO 1:1)
   ============================================================ */
function detectAndCropCard(img) {
  try {
    const canvas = document.createElement('canvas');
    const maxDim = 1000;
    let scale = 1;
    if (img.naturalWidth > maxDim || img.naturalHeight > maxDim) {
      scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
    }
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    function getRGB(x, y) {
      const idx = (y * w + x) * 4;
      return { r: d[idx], g: d[idx + 1], b: d[idx + 2], a: d[idx + 3] };
    }

    // Muestreo de las 4 esquinas exteriores para determinar fondo
    const c1 = getRGB(3, 3), c2 = getRGB(w - 4, 3), c3 = getRGB(3, h - 4), c4 = getRGB(w - 4, h - 4);
    const bgR = (c1.r + c2.r + c3.r + c4.r) / 4;
    const bgG = (c1.g + c2.g + c3.g + c4.g) / 4;
    const bgB = (c1.b + c2.b + c3.b + c4.b) / 4;
    const isLightBg = (bgR > 210 && bgG > 210 && bgB > 210);
    const isDarkBg = (bgR < 45 && bgG < 45 && bgB < 45);

    function isBackgroundPixel(x, y) {
      const p = getRGB(x, y);
      if (p.a < 35) return true; // transparente
      if (isLightBg) {
        // En fondos claros de escáner / PDF, los píxeles blancos o muy claros son fondo
        return p.r > 220 && p.g > 220 && p.b > 220;
      }
      if (isDarkBg) {
        return p.r < 45 && p.g < 45 && p.b < 45;
      }
      const diff = Math.abs(p.r - bgR) + Math.abs(p.g - bgG) + Math.abs(p.b - bgB);
      return diff < 42;
    }

    // Escaneo completo para encontrar el rectángulo del documento (DNI, carnet, pasaporte)
    let top = 0, bottom = h - 1, left = 0, right = w - 1;

    // Escanear de arriba hacia abajo
    for (let y = 0; y < h; y++) {
      let nonBg = 0;
      for (let x = 0; x < w; x += 4) {
        if (!isBackgroundPixel(x, y)) nonBg++;
      }
      if (nonBg > (w / 4) * 0.035) {
        top = Math.max(0, y - 2);
        break;
      }
    }

    // Escanear de abajo hacia arriba
    for (let y = h - 1; y >= 0; y--) {
      let nonBg = 0;
      for (let x = 0; x < w; x += 4) {
        if (!isBackgroundPixel(x, y)) nonBg++;
      }
      if (nonBg > (w / 4) * 0.035) {
        bottom = Math.min(h - 1, y + 2);
        break;
      }
    }

    // Escanear de izquierda a derecha
    for (let x = 0; x < w; x++) {
      let nonBg = 0;
      for (let y = 0; y < h; y += 4) {
        if (!isBackgroundPixel(x, y)) nonBg++;
      }
      if (nonBg > (h / 4) * 0.035) {
        left = Math.max(0, x - 2);
        break;
      }
    }

    // Escanear de derecha a izquierda
    for (let x = w - 1; x >= 0; x--) {
      let nonBg = 0;
      for (let y = 0; y < h; y += 4) {
        if (!isBackgroundPixel(x, y)) nonBg++;
      }
      if (nonBg > (h / 4) * 0.035) {
        right = Math.min(w - 1, x + 2);
        break;
      }
    }

    const cropW = right - left + 1;
    const cropH = bottom - top + 1;
    const wasTrimmed = (top > 8 || bottom < h - 9 || left > 8 || right < w - 9);

    if (wasTrimmed && cropW > 60 && cropH > 40 && top < bottom && left < right) {
      const origLeft = Math.round(left / scale);
      const origTop = Math.round(top / scale);
      const origWidth = Math.min(img.naturalWidth - origLeft, Math.round(cropW / scale));
      const origHeight = Math.min(img.naturalHeight - origTop, Math.round(cropH / scale));

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = origWidth;
      cropCanvas.height = origHeight;
      const cropCtx = cropCanvas.getContext('2d');
      cropCtx.drawImage(img, origLeft, origTop, origWidth, origHeight, 0, 0, origWidth, origHeight);
      return cropCanvas.toDataURL('image/jpeg', 0.96);
    }
  } catch (err) {
    console.warn('[RealScan] Error en auto-crop:', err);
  }
  return null;
}

function toggleAutoCrop(side) {
  const imgData = state.images[side];
  if (!imgData.rawOriginalSrc || !imgData.croppedSrc) return;
  imgData.isCropApplied = !imgData.isCropApplied;
  const targetSrc = imgData.isCropApplied ? imgData.croppedSrc : imgData.rawOriginalSrc;
  const btn = $('btnToggleCrop' + getSlotIdSuffix(side));
  if (btn) btn.textContent = imgData.isCropApplied ? '✂️ Recorte Auto' : 'Original';

  const img = new Image();
  img.onload = function() {
    imgData.originalSrc = targetSrc;
    imgData.naturalWidth = img.naturalWidth;
    imgData.naturalHeight = img.naturalHeight;
    renderProcessedImage(side);
    showToast(imgData.isCropApplied ? 'Recorte de bordes activado (relleno 1:1)' : 'Mostrando imagen sin recortar', 'info');
  };
  img.src = targetSrc;
}

function autoFitSlotToCard(side) {
  // A repeatable operation: never crop the original or increase zoom per click.
  setFitMode(side, 'fit');
}

let _lastContinuousSnapshotTime = 0;
let _lastContinuousSlot = null;
let _lastContinuousType = null;

function recordContinuousSnapshot(side, imgData, type) {
  const now = Date.now();
  if (_lastContinuousSlot !== side || _lastContinuousType !== type || (now - _lastContinuousSnapshotTime > 500)) {
    if (typeof RealScanEditor !== 'undefined' && RealScanEditor.recordSnapshot) {
      RealScanEditor.recordSnapshot(side, imgData);
    } else if (typeof window !== 'undefined' && window.RealScanEditor && window.RealScanEditor.recordSnapshot) {
      window.RealScanEditor.recordSnapshot(side, imgData);
    }
  }
  _lastContinuousSnapshotTime = now;
  _lastContinuousSlot = side;
  _lastContinuousType = type;
}

function setZoomScale(side, targetZoom) {
  const imgData = state.images[side];
  if (!imgData || !imgData.originalSrc) {
    showToast('Carga primero una foto para ajustar su tamaño.', 'warning');
    return;
  }
  const z = parseFloat(Math.max(0.20, Math.min(3.50, targetZoom)).toFixed(2));
  if (imgData.zoom !== z) {
    recordContinuousSnapshot(side, imgData, 'zoom');
    imgData.zoom = z;
  }
  const suffix = getSlotIdSuffix(side);

  const label = $('zoomLabel' + suffix);
  if (label) label.textContent = z + 'x';

  const slider = $('zoomSlider' + suffix);
  if (slider) slider.value = Math.round(z * 100);

  const percentLabel = $('zoomPercent' + suffix);
  if (percentLabel) percentLabel.textContent = Math.round(z * 100) + '%';

  renderProcessedImage(side);
}

function setFitMode(side, mode) {
  const imgData = state.images[side];
  if (!imgData || !imgData.originalSrc) {
    showToast('Carga primero una foto para cambiar el modo de ajuste.', 'warning');
    return;
  }
  if (typeof RealScanEditor !== 'undefined' && RealScanEditor.recordSnapshot) {
    RealScanEditor.recordSnapshot(side, imgData);
  } else if (typeof window !== 'undefined' && window.RealScanEditor && window.RealScanEditor.recordSnapshot) {
    window.RealScanEditor.recordSnapshot(side, imgData);
  }
  if (!['fit','cover'].includes(mode)) return;
  imgData.fitMode = mode;
  imgData.zoom = 1; imgData.panX = 0; imgData.panY = 0;
  window.RealScanDiagnostics?.record('image.fit','info',{fitMode:mode});
  const suffix = getSlotIdSuffix(side);
  if ($('zoomLabel' + suffix)) $('zoomLabel' + suffix).textContent = '1.0x';
  if ($('zoomSlider' + suffix)) $('zoomSlider' + suffix).value = 100;
  if ($('zoomPercent' + suffix)) $('zoomPercent' + suffix).textContent = '100%';

  const btnFit = $('btnFitMode' + suffix);
  const btnCover = $('btnCoverMode' + suffix);
  if (btnFit && btnCover) {
    btnFit.classList.toggle('is-active', mode === 'fit');
    btnCover.classList.toggle('is-active', mode === 'cover');
  }
  renderProcessedImage(side);
  if (mode === 'fit') {
    showToast('📐 Ajuste Completo (Fit): Documento entero reducido para caber completo sin cortes.', 'success');
  } else {
    showToast('🔲 Relleno 1:1 (Cover): La imagen cubre el marco completo de la ranura.', 'info');
  }
}

function toggleMmGrid(side) {
  const imgData = state.images[side];
  if (!imgData || !imgData.originalSrc) return;
  imgData.showMmGrid = !imgData.showMmGrid;
  const suffix = getSlotIdSuffix(side);
  const btn = $('btnToggleMmGrid' + suffix);
  if (btn) {
    btn.classList.toggle('bg-indigo-100', imgData.showMmGrid);
    btn.classList.toggle('dark:bg-indigo-900', imgData.showMmGrid);
    btn.classList.toggle('text-indigo-700', imgData.showMmGrid);
    btn.classList.toggle('dark:text-indigo-300', imgData.showMmGrid);
  }
  renderProcessedImage(side);
  showToast(imgData.showMmGrid ? '📏 Regla milimétrica superpuesta activada.' : 'Regla superpuesta desactivada.', 'info');
}


/* Análisis de reflejos y sombras (AÑADIDO 9.1): trabaja sobre una reducción
   de la imagen capturada. Reflejo: una celda de la rejilla 3×3 con una
   fracción alta de píxeles quemados (luminancia >= 248) que contrasta con el
   resto (para no confundirlo con un papel blanco bien iluminado). Sombra
   dura: una celda muy oscura en una imagen globalmente clara. */
function analyzeGlareShadow(img) {
  const result = { glareZone: null, shadow: false };
  try {
    const iw = img.naturalWidth || 0, ih = img.naturalHeight || 0;
    if (!iw || !ih) return result;
    const scale = Math.min(1, 360 / iw);
    const w = Math.max(30, Math.round(iw * scale)), h = Math.max(30, Math.round(ih * scale));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, w, h);
    const data = cx.getImageData(0, 0, w, h).data;
    const cells = [];
    for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
      let sum = 0, clipped = 0, count = 0;
      const x0 = Math.floor(gx * w / 3), x1 = Math.floor((gx + 1) * w / 3);
      const y0 = Math.floor(gy * h / 3), y1 = Math.floor((gy + 1) * h / 3);
      for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
        const i = (y * w + x) * 4;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sum += lum; if (lum >= 248) clipped++;
        count++;
      }
      cells.push({ gx: gx, gy: gy, mean: count ? sum / count : 0, clip: count ? clipped / count : 0 });
    }
    const globalMean = cells.reduce(function(a, c) { return a + c.mean; }, 0) / 9;
    const zones = [['la esquina superior izquierda', 'la parte superior', 'la esquina superior derecha'], ['el lado izquierdo', 'el centro', 'el lado derecho'], ['la esquina inferior izquierda', 'la parte inferior', 'la esquina inferior derecha']];
    let worst = null;
    cells.forEach(function(c) { if (c.clip >= 0.38 && (!worst || c.clip > worst.clip)) worst = c; });
    if (worst) {
      const othersMean = Math.max.apply(null, cells.filter(function(c) { return c !== worst; }).map(function(c) { return c.mean; }));
      if (othersMean <= 218) result.glareZone = zones[worst.gy][worst.gx];
    }
    if (cells.some(function(c) { return c.mean <= 52; }) && globalMean >= 125) result.shadow = true;
  } catch (e) { /* el análisis nunca bloquea el flujo */ }
  return result;
}

/* Fondo blanco automático (AÑADIDO 10.1): sustituye por blanco el fondo
   conectado a los bordes cuyo color se parece al color dominante del marco
   exterior (inundación desde los bordes con tolerancia). Pensado para fotos
   oficiales contra pared o fondo uniforme; la foto original no se toca y el
   operador puede desactivarlo y comparar manteniendo pulsada la miniatura. */
function applyWhiteBackground(ctx, W, H) {
  const imgPixels = ctx.getImageData(0, 0, W, H);
  const d = imgPixels.data;
  const step = Math.max(1, Math.floor(Math.min(W, H) / 60));
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let x = 0; x < W; x += step) {
    let i = x * 4; sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++;
    i = ((H - 1) * W + x) * 4; sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++;
  }
  for (let y = 0; y < H; y += step) {
    let i = (y * W) * 4; sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++;
    i = (y * W + W - 1) * 4; sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++;
  }
  const refR = sr / n, refG = sg / n, refB = sb / n;
  const TOL2 = 34 * 34 * 3;
  const visited = new Uint8Array(W * H);
  const stack = [];
  function pushPx(p) { if (!visited[p]) { visited[p] = 1; stack.push(p); } }
  for (let x = 0; x < W; x++) { pushPx(x); pushPx((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { pushPx(y * W); pushPx(y * W + W - 1); }
  while (stack.length) {
    const p = stack.pop();
    const i = p * 4;
    const dr = d[i] - refR, dg = d[i + 1] - refG, db = d[i + 2] - refB;
    if ((dr * dr + dg * dg + db * db) > TOL2) continue;
    d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) pushPx(p - 1);
    if (x < W - 1) pushPx(p + 1);
    if (y > 0) pushPx(p - W);
    if (y < H - 1) pushPx(p + W);
  }
  ctx.putImageData(imgPixels, 0, 0);
}

/* Fondo blanco: primero intenta la segmentación de persona con IA en el
   dispositivo (js/segment-loader.js, MediaPipe servido desde el propio
   dist). Si la IA no está disponible, falla o tarda demasiado, se usa el
   respaldo por inundación de applyWhiteBackground sin cambiar la UX. La
   foto original nunca se toca: el resultado IA queda en whiteBgAiSrc,
   ligado a la foto exacta que lo generó (whiteBgAiFor), y el pipeline de
   render lo usa como base mientras whiteBg esté activo. */
const WHITE_BG_AI_TIMEOUT_MS = 30000;
async function toggleWhiteBackground(side) {
  const imgData = state.images[side];
  if (!imgData || !imgData.originalSrc) { showToast('Primero captura o sube la foto.', 'warning'); return; }
  if (typeof RealScanEditor !== 'undefined' && RealScanEditor.recordSnapshot) RealScanEditor.recordSnapshot(side, imgData);
  imgData.whiteBg = !imgData.whiteBg;
  // Cualquier pulsación nueva invalida una preparación IA en curso.
  const request = (imgData._whiteBgAiRequest || 0) + 1;
  imgData._whiteBgAiRequest = request;
  if (!imgData.whiteBg) {
    renderProcessedImage(side);
    showToast('Fondo original restaurado.', 'info');
    if (typeof scheduleSaveDraft === 'function') scheduleSaveDraft();
    return;
  }
  const sourceAtStart = imgData.originalSrc;
  let usedAi = !!(imgData.whiteBgAiSrc && imgData.whiteBgAiFor === sourceAtStart);
  if (!usedAi && typeof window !== 'undefined' && typeof window.createAiWhiteBackground === 'function') {
    showToast('Preparando fondo con IA…', 'info');
    try {
      const timeout = new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('La IA tardó demasiado.')); }, WHITE_BG_AI_TIMEOUT_MS);
      });
      const aiSrc = await Promise.race([window.createAiWhiteBackground(sourceAtStart), timeout]);
      // Si mientras tanto se desactivó, se cambió la foto o llegó otra
      // pulsación, el resultado ya no corresponde: se descarta.
      if (aiSrc && state.images[side] === imgData && imgData.whiteBg &&
          imgData._whiteBgAiRequest === request && imgData.originalSrc === sourceAtStart) {
        imgData.whiteBgAiSrc = aiSrc;
        imgData.whiteBgAiFor = sourceAtStart;
        usedAi = true;
      }
    } catch (e) { /* respaldo por inundación, sin romper el flujo */ }
    if (state.images[side] !== imgData || !imgData.whiteBg || imgData._whiteBgAiRequest !== request) return;
  }
  renderProcessedImage(side);
  showToast(usedAi
    ? '⬜ Fondo blanco con IA aplicado. Mantén pulsada la miniatura para comparar con la original.'
    : '⬜ Fondo blanco aplicado. Mantén pulsada la miniatura para comparar con la original.', 'info');
  if (typeof scheduleSaveDraft === 'function') scheduleSaveDraft();
}

function inspectSlotImage(side, img) {
  const suffix = getSlotIdSuffix(side);
  const banner = $('inspectorBanner' + suffix);
  if (!banner) return;

  const w = img.naturalWidth || 0;
  const h = img.naturalHeight || 0;
  if (w === 0 || h === 0) return;

  const rotated = (state.images[side]?.rotation || 0) % 180 !== 0;
  const imageW = rotated ? h : w, imageH = rotated ? w : h;
  const isPortraitImg = imageH > imageW;
  const spec = getActiveSpec();
  const isPortraitSpec = spec.heightMm > spec.widthMm;

  const textEl = $('inspectorText' + suffix);
  const subtextEl = $('inspectorSubtext' + suffix);
  const actionsEl = $('inspectorActions' + suffix);

  let advice = '';
  const estimatedDpi = Math.round(Math.min(imageW/spec.widthMm,imageH/spec.heightMm)*25.4);
  let sub = `${w} × ${h} px · ${estimatedDpi} ppp estimados para este tamaño · Revisa la nitidez`;
  let actionHtml = '';

  if (isPortraitImg !== isPortraitSpec && state.activeCategory === 'photos') {
    advice = 'Foto y marco tienen distinta orientación. Se conserva la foto completa.';
    actionHtml = `<button type="button" class="btn-inspect-fit px-2 py-1 rounded bg-slate-800 text-white text-xs" data-side="${side}">Encajar sin recortar</button>`;
  } else if (isPortraitImg !== isPortraitSpec) {
    advice = '💡 Foto vertical detectada en ranura horizontal:';
    actionHtml = `<button type="button" class="btn-inspect-rotate px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px] hover:bg-indigo-700 transition-colors shadow-sm" data-side="${side}">🔄 Girar 90°</button>`;
  } else if (w > 2000 || h > 2000) {
    advice = '💡 Foto amplia de alta resolución:';
    actionHtml = `<button type="button" class="btn-inspect-fit px-2 py-0.5 rounded bg-slate-800 dark:bg-slate-700 text-white font-bold text-[10px] hover:bg-slate-900 transition-colors shadow-sm" data-side="${side}">📐 Encajar Todo</button>`;
  } else {
    advice = 'Imagen cargada. Revisa el encuadre antes de imprimir.';
  }

  if (textEl) textEl.textContent = advice;
  if (subtextEl) subtextEl.textContent = sub;
  if (actionsEl) {
    actionsEl.innerHTML = actionHtml;
    const rotateBtn = actionsEl.querySelector('.btn-inspect-rotate');
    if (rotateBtn) rotateBtn.addEventListener('click', () => rotateImage(side));
    const fitBtn = actionsEl.querySelector('.btn-inspect-fit');
    if (fitBtn) fitBtn.addEventListener('click', () => setFitMode(side, 'fit'));
  }
  banner.classList.remove('hidden');

  // Semáforo de calidad (AÑADIDO 4.1) con reflejos y sombras (AÑADIDO 9.1):
  // visible siempre bajo la miniatura, sin abrir desplegables.
  try {
    const flags = analyzeGlareShadow(img);
    if (state.images[side]) state.images[side].qualityFlags = flags;
    const strip = $('qualityStrip' + suffix);
    if (strip) {
      let level = estimatedDpi >= 300 ? 'good' : (estimatedDpi >= 150 ? 'warn' : 'bad');
      const sizeTxt = (spec.widthMm / 10).toFixed(1).replace('.0', '') + ' × ' + (spec.heightMm / 10).toFixed(1).replace('.0', '') + ' cm';
      let reason = level === 'good' ? 'Nítida para este tamaño' : (level === 'warn' ? 'Resolución justa para ' + sizeTxt : 'Saldrá borrosa a ' + sizeTxt + ': resolución baja');
      if (flags.glareZone) { reason += ' · Hay reflejo en ' + flags.glareZone + ': inclina un poco el teléfono'; if (level === 'good') level = 'warn'; }
      if (flags.shadow) { reason += ' · Sombra fuerte sobre el documento: cambia la luz de lado'; if (level === 'good') level = 'warn'; }
      const conf = { good: ['🟢', 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-100'], warn: ['🟡', 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-100'], bad: ['🔴', 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950/50 dark:border-red-800 dark:text-red-100'] }[level];
      strip.className = 'mt-2 px-2.5 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-2 ' + conf[1];
      strip.textContent = conf[0] + ' ' + estimatedDpi + ' ppp · ' + reason;
    }
  } catch (e) { /* el semáforo nunca bloquea el flujo */ }
}

function clearSlot(side) {
  state.images[side] = {
    rawOriginalSrc: null,
    croppedSrc: null,
    isCropApplied: false,
    cropData: null,
    warpQuad: null,
    originalSrc: null,
    processedDataUrl: null,
    whiteBg: false,
    whiteBgAiSrc: null,
    whiteBgAiFor: null,
    qualityFlags: null,
    naturalWidth: 0,
    naturalHeight: 0,
    rotation: 0,
    zoom: 1.0,
    fitMode: 'cover',
    showMmGrid: false,
    filter: 'color',
    panX: 0,
    panY: 0,
    showOaciGuide: false,
    brightness: 0,
    contrast: 0
  };

  const suffix = getSlotIdSuffix(side);
  const input = $('fileInput' + suffix);
  if (input) input.value = '';

  const zoomLabel = $('zoomLabel' + suffix);
  if (zoomLabel) zoomLabel.textContent = '1.0x';

  const slider = $('zoomSlider' + suffix);
  if (slider) slider.value = 100;

  const percentLabel = $('zoomPercent' + suffix);
  if (percentLabel) percentLabel.textContent = '100%';

  const cropBtn = $('btnToggleCrop' + suffix);
  if (cropBtn) cropBtn.classList.add('hidden');

  const banner = $('inspectorBanner' + suffix);
  if (banner) banner.classList.add('hidden');

  if (typeof RealScanEditor !== 'undefined' && RealScanEditor.clearHistory) {
    RealScanEditor.clearHistory(side);
  } else if (typeof window !== 'undefined' && window.RealScanEditor && window.RealScanEditor.clearHistory) {
    window.RealScanEditor.clearHistory(side);
  }

  updateSidePreview(side);
  showToast('Foto eliminada de ' + getSlotFriendlyName(side) + '. Ranura lista para nueva captura o archivo.', 'info');
}

/* ============================================================
   PROCESAMIENTO DE IMAGEN Y ROTACIÓN INTELIGENTE
   ============================================================ */
function processRawDataUrl(rawSrc, side, preserveFrame = false, request = null) {
  if(request && !slotRequestCurrent(request))return;
  if(!request){state.images[side]._requestVersion=(state.images[side]._requestVersion||0)+1;state.images[side]._reading=false;}
  request=request||{side,slot:state.images[side],version:state.images[side]._requestVersion,job:state._jobRevision||0};
  const startRevision = state._jobRevision || 0;
  const slot = state.images[side];
  const loadVersion = (slot._loadVersion || 0) + 1; slot._loadVersion = loadVersion;
  const settle = function(){if(startRevision === (state._jobRevision || 0)) state._processingPending = Math.max(0, (state._processingPending || 1) - 1);};
  state._processingPending = (state._processingPending || 0) + 1;
  const img = new Image();
  img.onload = function() {
    if (!slotRequestCurrent(request) || startRevision !== (state._jobRevision || 0) || state.images[side] !== slot || slot._loadVersion !== loadVersion) {
      settle();
      return;
    }
    state.images[side].rawOriginalSrc = rawSrc;
    state.images[side].croppedSrc = null;
    state.images[side].cropData = null;
    state.images[side].perspectiveQuad = null;
    state.images[side].warpQuad = null;
    state.images[side].isCropApplied = false;
    window.RealScanEditor?.clearHistory?.(side);
    if(getActiveSpec().noRetouch){state.images[side].filter='color';state.images[side].brightness=0;state.images[side].contrast=0;}
    state._previewEditEnabled = false;
    state._previewDragging = false;
    state._previewDragSide = null;
    state.images[side].panX = 0;
    state.images[side].panY = 0;
    state.images[side].zoom = 1.0;
    state.images[side].fitMode = preserveFrame || state.activeCategory === 'photos' ? 'fit' : 'cover';
    state.images[side].showMmGrid = false;
    const suffix = getSlotIdSuffix(side);
    const label = $('zoomLabel' + suffix);
    if (label) label.textContent = '1.0x';
    const slider = $('zoomSlider' + suffix);
    if (slider) slider.value = 100;
    const percentLabel = $('zoomPercent' + suffix);
    if (percentLabel) percentLabel.textContent = '100%';

    // Auto-adaptar orientación de Pasaporte según la proporción de la imagen capturada/subida
    const imgAspect = img.naturalWidth / img.naturalHeight;
    if (state.format === 'passport_open') {
      if (imgAspect > 1.15 && state.passportOpenOrientation !== 'landscape') {
        state.passportOpenOrientation = 'landscape';
        if (typeof updatePassportOptionsUI === 'function') updatePassportOptionsUI();
      } else if (imgAspect < 0.88 && state.passportOpenOrientation !== 'portrait') {
        state.passportOpenOrientation = 'portrait';
        if (typeof updatePassportOptionsUI === 'function') updatePassportOptionsUI();
      }
    } else if (state.format === 'passport') {
      if (imgAspect < 0.88 && state.passportPageOrientation !== 'portrait') {
        state.passportPageOrientation = 'portrait';
        if (typeof updatePassportOptionsUI === 'function') updatePassportOptionsUI();
      } else if (imgAspect > 1.15 && state.passportPageOrientation !== 'landscape') {
        state.passportPageOrientation = 'landscape';
        if (typeof updatePassportOptionsUI === 'function') updatePassportOptionsUI();
      }
    }

    const croppedData = preserveFrame || state.activeCategory === 'photos' ? null : detectAndCropCard(img);
    const toggleBtn = $('btnToggleCrop' + suffix);

    if (croppedData) {
      state.images[side].croppedSrc = croppedData;
      state.images[side].isCropApplied = true;
      state.images[side].whiteBgAiSrc = null;
      state.images[side].whiteBgAiFor = null;
      state.images[side].originalSrc = croppedData;
      if (toggleBtn) toggleBtn.classList.remove('hidden');

      const ci = new Image();
      ci.onload = function() {
        if (!slotRequestCurrent(request) || startRevision !== (state._jobRevision || 0) || state.images[side] !== slot || slot._loadVersion !== loadVersion) {
          settle();
          return;
        }
        state.images[side].naturalWidth = ci.naturalWidth;
        state.images[side].naturalHeight = ci.naturalHeight;
        const spec = getActiveSpec();
        const specIsPortrait = spec.heightMm > spec.widthMm;
        const imgIsPortrait = ci.naturalHeight > ci.naturalWidth;
        state.images[side].rotation = (specIsPortrait === imgIsPortrait) ? 0 : 90;
        inspectSlotImage(side, ci);
        settle();
        renderProcessedImage(side);
        showToast('✂️ ¡Bordes blancos eliminados automáticamente! Escala 1:1 real.', 'success');
      };
      ci.onerror = function() {
        settle();
      };
      ci.src = croppedData;
      return;
    }

    state.images[side].whiteBgAiSrc = null;
    state.images[side].whiteBgAiFor = null;
    state.images[side].originalSrc = rawSrc;
    state.images[side].naturalWidth = img.naturalWidth;
    state.images[side].naturalHeight = img.naturalHeight;
    if (toggleBtn) toggleBtn.classList.add('hidden');

    const spec = getActiveSpec();
    const specIsPortrait = spec.heightMm > spec.widthMm;
    const imgIsPortrait = img.naturalHeight > img.naturalWidth;
    state.images[side].rotation = preserveFrame || state.activeCategory === 'photos' ? 0 : ((specIsPortrait === imgIsPortrait) ? 0 : 90);
    inspectSlotImage(side, img);
    settle();
    renderProcessedImage(side);
  };
  img.onerror = function() {
    settle();
  };
  img.src = rawSrc;
}

function rotateImage(side) {
  if (!state.images[side].originalSrc) return;
  if (typeof RealScanEditor !== 'undefined' && RealScanEditor.recordSnapshot) {
    RealScanEditor.recordSnapshot(side, state.images[side]);
  }
  state.images[side].rotation = (state.images[side].rotation + 90) % 360;
  renderProcessedImage(side);
}

function adjustZoom(side, delta) {
  if (!state.images[side].originalSrc) return;
  let z = state.images[side].zoom || 1.0;
  z = Math.max(0.20, Math.min(3.50, z + delta));
  setZoomScale(side, z);
}

/* ============================================================
   RENDERIZADO CON ESCALA 1:1 CALIBRADA (300 DPI)
   ============================================================ */
function renderProcessedImage(side) {
  const imgData = state.images[side];
  if (!imgData.originalSrc) return;
  // Base IA solo si corresponde a la foto original actual de la ranura.
  const useAiBase = !!(imgData.whiteBg && imgData.whiteBgAiSrc && imgData.whiteBgAiFor === imgData.originalSrc);
  const startRevision = state._jobRevision || 0;
  const renderVersion = (imgData._renderVersion || 0) + 1; imgData._renderVersion = renderVersion;
  const settle = function(){if(startRevision === (state._jobRevision || 0)) state._processingPending = Math.max(0, (state._processingPending || 1) - 1);};
  state._processingPending = (state._processingPending || 0) + 1;
  const img = new Image();
  img.onload = function() {
    if (startRevision !== (state._jobRevision || 0) || state.images[side] !== imgData || imgData._renderVersion !== renderVersion) {
      settle();
      return;
    }
    const rotation = imgData.rotation || 0;
    const zoom = imgData.zoom || 1.0;
    const panX = imgData.panX || 0;
    const panY = imgData.panY || 0;
    const filter = imgData.filter || 'color';
    const fitMode = imgData.fitMode || 'cover';
    const spec = getActiveSpec();

    let outW = Math.round(spec.widthMm / 25.4 * window.TARGET_DPI);
    let outH = Math.round(spec.heightMm / 25.4 * window.TARGET_DPI);
    const renderLimit = state._previewDragging && state._previewDragSide===side ? Math.min(1200,window.MAX_OUT_PX) : window.MAX_OUT_PX;
    if (outW > renderLimit) { const r = renderLimit / outW; outW = renderLimit; outH = Math.round(outH * r); }
    if (outH > renderLimit) { const r = renderLimit / outH; outH = renderLimit; outW = Math.round(outW * r); }

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);

    const rotW = (rotation === 90 || rotation === 270) ? img.naturalHeight : img.naturalWidth;
    const rotH = (rotation === 90 || rotation === 270) ? img.naturalWidth : img.naturalHeight;

    // Soporte de ajuste: 'fit' (contener completo de más a menos) o 'cover' (rellenar marco)
    const baseScale = (fitMode === 'fit') 
      ? Math.min(outW / rotW, outH / rotH) 
      : Math.max(outW / rotW, outH / rotH);
    const finalScale = baseScale * zoom;

    const offsetX = (panX / 100) * outW;
    const offsetY = (panY / 100) * outH;

    const b = imgData.brightness || 0;
    const c = imgData.contrast || 0;

    ctx.save();
    // Soporte para Formatos Óvalo (Título, Mignon, Credencial): Enmascarar esquinas en blanco puro
    if (spec.isOval) {
      ctx.beginPath();
      ctx.ellipse(outW / 2, outH / 2, outW / 2 - 3, outH / 2 - 3, 0, 0, Math.PI * 2);
      ctx.clip();
    }

    if (b !== 0 || c !== 0) {
      ctx.filter = 'brightness(' + (100 + b) + '%) contrast(' + (100 + c) + '%)';
    }
    ctx.translate(outW / 2 + offsetX, outH / 2 + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(finalScale, finalScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // Filtros de Escáner y Blanco y Negro
    if (filter === 'bw' || filter === 'scanner') {
      try {
        const imgPixels = ctx.getImageData(0, 0, outW, outH);
        const d = imgPixels.data;
        if (filter === 'bw') {
          for (let i = 0; i < d.length; i += 4) {
            let lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
            lum = ((lum / 255 - 0.5) * 1.18 + 0.5) * 255;
            lum = Math.max(0, Math.min(255, lum));
            d[i] = lum; d[i+1] = lum; d[i+2] = lum;
          }
        } else if (filter === 'scanner') {
          // Nivel «escáner» (v3.12.0): corrección de campo plano. Se estima el
          // fondo (papel + sombras + viñeta) con una versión muy reducida y
          // suavizada de la imagen, y la luminancia se divide entre ese fondo:
          // el papel queda blanco uniforme sin sombras y el texto se refuerza
          // con un umbral suave. Sustituye al umbral fijo anterior, que dejaba
          // las sombras como manchas grises.
          const W = imgPixels.width, H = imgPixels.height;
          const bwS = Math.max(8, Math.round(W / 24)), bhS = Math.max(8, Math.round(H / 24));
          const bgRaw = new Float32Array(bwS * bhS);
          for (let by = 0; by < bhS; by++) {
            for (let bx = 0; bx < bwS; bx++) {
              let sum = 0, count = 0;
              const x0 = Math.floor(bx * W / bwS), x1 = Math.max(x0 + 1, Math.floor((bx + 1) * W / bwS));
              const y0 = Math.floor(by * H / bhS), y1 = Math.max(y0 + 1, Math.floor((by + 1) * H / bhS));
              for (let yy = y0; yy < y1; yy += 2) {
                for (let xx = x0; xx < x1; xx += 2) {
                  const idx = (yy * W + xx) * 4;
                  sum += 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
                  count++;
                }
              }
              bgRaw[by * bwS + bx] = count ? sum / count : 255;
            }
          }
          const bg = new Float32Array(bwS * bhS);
          for (let by = 0; by < bhS; by++) {
            for (let bx = 0; bx < bwS; bx++) {
              let sum = 0, count = 0;
              for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const nx = bx + dx, ny = by + dy;
                if (nx >= 0 && ny >= 0 && nx < bwS && ny < bhS) { sum += bgRaw[ny * bwS + nx]; count++; }
              }
              bg[by * bwS + bx] = sum / count;
            }
          }
          for (let y = 0; y < H; y++) {
            const gy = Math.min(bhS - 1, Math.floor(y * bhS / H));
            for (let x = 0; x < W; x++) {
              const gx = Math.min(bwS - 1, Math.floor(x * bwS / W));
              const i = (y * W + x) * 4;
              let lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              lum = lum * (255 / Math.max(60, bg[gy * bwS + gx]));
              if (lum > 232) lum = 255;
              else if (lum < 118) lum = Math.max(0, lum * 0.68);
              else lum = ((lum - 118) / (232 - 118)) * 255;
              d[i] = lum; d[i + 1] = lum; d[i + 2] = lum;
            }
          }
        }
        ctx.putImageData(imgPixels, 0, 0);
      } catch(e) {}
    }

    // Fondo blanco oficial (AÑADIDO 10.1), tras los filtros de color.
    // Si hay resultado de IA para esta foto exacta ya viene compuesto
    // sobre blanco desde la base (img.src), así que la inundación solo
    // actúa como respaldo cuando no hay IA.
    if (imgData.whiteBg && !useAiBase) {
      try { applyWhiteBackground(ctx, outW, outH); } catch(e) {}
    }

    imgData.processedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    settle();
    updateSidePreview(side);
  };
  img.onerror = function() {
    settle();
  };
  img.src = useAiBase ? imgData.whiteBgAiSrc : imgData.originalSrc;
}

function setFilter(side, filter) {
  if (getActiveSpec().noRetouch && filter !== 'color') {showToast('Este perfil requiere una fotografía en color sin filtros.', 'warning');return;}
  if (!state.images[side].originalSrc) return;
  if (typeof RealScanEditor !== 'undefined' && RealScanEditor.recordSnapshot) {
    RealScanEditor.recordSnapshot(side, state.images[side]);
  }
  state.images[side].filter = filter;
  renderProcessedImage(side);
  const names = { color: 'Color original', bw: 'Blanco y Negro oficial', scanner: 'Escáner / Fotocopia nítida' };
  showToast('Filtro aplicado: ' + (names[filter] || filter), 'info');
}

function adjustPan(side, dx, dy) {
  if (!state.images[side].originalSrc) return;
  recordContinuousSnapshot(side, state.images[side], 'pan');
  state.images[side].panX = Math.max(-50, Math.min(50, (state.images[side].panX || 0) + dx));
  state.images[side].panY = Math.max(-50, Math.min(50, (state.images[side].panY || 0) + dy));
  renderProcessedImage(side);
}

function resetPan(side) {
  if (!state.images[side].originalSrc) return;
  if (typeof RealScanEditor !== 'undefined' && RealScanEditor.recordSnapshot) {
    RealScanEditor.recordSnapshot(side, state.images[side]);
  } else if (typeof window !== 'undefined' && window.RealScanEditor && window.RealScanEditor.recordSnapshot) {
    window.RealScanEditor.recordSnapshot(side, state.images[side]);
  }
  state.images[side].panX = 0;
  state.images[side].panY = 0;
  renderProcessedImage(side);
  showToast('Posición centrada al origen.', 'info');
}

/* ============================================================
   CORRECTOR RÁPIDO DE ILUMINACIÓN Y CONTRASTE (+15% / -15%)
   ============================================================ */
function adjustSlotLight(side, type, delta) {
  if (getActiveSpec().noRetouch) {showToast('Este perfil requiere conservar la apariencia original.', 'warning');return;}
  const imgData = state.images[side];
  if (!imgData || !imgData.originalSrc) {
    showToast('Carga primero una foto para ajustar la luz y sombra.', 'warning');
    return;
  }
  recordContinuousSnapshot(side, imgData, type);
  if (type === 'brightness') {
    imgData.brightness = Math.max(-60, Math.min(60, (imgData.brightness || 0) + delta));
    const sign = imgData.brightness > 0 ? '+' : '';
    showToast('☀️ Brillo ajustado a ' + sign + imgData.brightness + '%', 'info');
  } else if (type === 'contrast') {
    imgData.contrast = Math.max(-60, Math.min(60, (imgData.contrast || 0) + delta));
    const sign = imgData.contrast > 0 ? '+' : '';
    showToast('🔆 Contraste ajustado a ' + sign + imgData.contrast + '%', 'info');
  }
  renderProcessedImage(side);
}

function resetSlotLight(side) {
  const imgData = state.images[side];
  if (!imgData) return;
  if (typeof RealScanEditor !== 'undefined' && RealScanEditor.recordSnapshot) {
    RealScanEditor.recordSnapshot(side, imgData);
  } else if (typeof window !== 'undefined' && window.RealScanEditor && window.RealScanEditor.recordSnapshot) {
    window.RealScanEditor.recordSnapshot(side, imgData);
  }
  imgData.brightness = 0;
  imgData.contrast = 0;
  renderProcessedImage(side);
  showToast('🔄 Iluminación restablecida a valores originales.', 'info');
}

function toggleOaciGuide(side) {
  state.images[side].showOaciGuide = !state.images[side].showOaciGuide;
  const oaciOverlay = $('oaciGuide' + getSlotIdSuffix(side));
  if (oaciOverlay) oaciOverlay.classList.toggle('hidden', !state.images[side].showOaciGuide);
  const guideBtn = document.querySelector('[data-guide="' + side + '"]');
  if (guideBtn) {
    guideBtn.classList.toggle('bg-indigo-100', state.images[side].showOaciGuide);
    guideBtn.classList.toggle('dark:bg-indigo-900', state.images[side].showOaciGuide);
  }
  showToast(state.images[side].showOaciGuide ? '👤 Guía OACI activada (alinea ojos y mentón)' : 'Guía OACI desactivada', 'info');
}

function updateSidePreview(side) {
  const suffix = getSlotIdSuffix(side);
  const imgData = state.images[side];
  const previewImg = $('previewImg' + suffix);
  const placeholder = $('placeholder' + suffix);
  const tools = $('tools' + suffix);
  const badge = $('badgeStatus' + suffix);
  const btnDelete = $('btnDelete' + suffix);
  const manualCrop=$('btnToggleCrop'+suffix);
  if(manualCrop)manualCrop.classList.toggle('hidden',!imgData?.originalSrc);
  for(const [prefix,mode]of [['btnFitMode','fit'],['btnCoverMode','cover']]){
    const control=$(prefix+suffix);if(control){control.classList.toggle('is-active',imgData?.fitMode===mode);control.setAttribute('aria-pressed',String(imgData?.fitMode===mode));}
  }

  if (imgData && imgData.processedDataUrl) {
    if (previewImg) {
      previewImg.src = imgData.processedDataUrl;
      previewImg.classList.remove('hidden');
      previewImg.className = 'w-full h-full object-contain rounded-sm';
    }
    // Miniatura dentro de la propia tarjeta del slot: la foto se ve donde se
    // trabaja en cuanto se captura y tras cada ajuste (rotar, recorte, zoom).
    const thumbImg = $('slotThumb' + suffix);
    const thumbWrap = $('slotThumbWrap' + suffix);
    if (thumbImg && thumbImg.getAttribute('src') !== imgData.processedDataUrl) thumbImg.src = imgData.processedDataUrl;
    if (thumbWrap) thumbWrap.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
    if (tools) tools.classList.remove('hidden');
    if (btnDelete) btnDelete.classList.remove('hidden');

    if (badge) {
      badge.textContent = 'Listo';
      badge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200';
    }

    // Pistas en los encabezados de los desplegables: si un ajuste está activo
    // dentro de una sección cerrada, el encabezado lo anuncia (p. ej.
    // «Mejoras de imagen · B/N») para que no quede escondido.
    const hintFit = $('accHintFit' + suffix);
    if (hintFit) {
      const partsFit = [];
      if (imgData.zoom && Math.abs(imgData.zoom - 1) > 0.001) partsFit.push(Math.round(imgData.zoom * 100) + '%');
      if (imgData.fitMode === 'fit') partsFit.push('Encajar');
      hintFit.textContent = partsFit.length ? '· ' + partsFit.join(' · ') : '';
    }
    const hintImg = $('accHintImg' + suffix);
    if (hintImg) {
      const partsImg = [];
      if (imgData.filter === 'bw') partsImg.push('B/N');
      else if (imgData.filter === 'scanner') partsImg.push('Escáner');
      if (imgData.whiteBg) partsImg.push('Fondo blanco');
      if (imgData.brightness || imgData.contrast) partsImg.push('Luz ajustada');
      hintImg.textContent = partsImg.length ? '· ' + partsImg.join(' · ') : '';
    }
    const hintTools = $('accHintTools' + suffix);
    if (hintTools) {
      const partsTools = [];
      if (imgData.rotation) partsTools.push('Girada ' + imgData.rotation + '°');
      if (imgData.isCropApplied && imgData.croppedSrc) partsTools.push('Recortada');
      hintTools.textContent = partsTools.length ? '· ' + partsTools.join(' · ') : '';
    }

    $$('[data-filter^="' + side + ':"]').forEach(function(b) {
      const f = b.getAttribute('data-filter').split(':')[1];
      b.classList.toggle('is-active', f === (imgData.filter || 'color'));
    });

    const oaciOverlay = $('oaciGuide' + suffix);
    if (oaciOverlay) oaciOverlay.classList.toggle('hidden', !imgData.showOaciGuide);

    if (state._previewDragging) {
      document.querySelectorAll('[data-preview-slot="'+side+'"] > img').forEach(image=>{image.src=imgData.processedDataUrl;});
    } else if (typeof updateUI === 'function') updateUI();
  } else {
    if (previewImg) {
      previewImg.src = '';
      previewImg.classList.add('hidden');
    }
    const thumbImgEmpty = $('slotThumb' + suffix);
    const thumbWrapEmpty = $('slotThumbWrap' + suffix);
    if (thumbImgEmpty) thumbImgEmpty.removeAttribute('src');
    if (thumbWrapEmpty) thumbWrapEmpty.classList.add('hidden');
    const stripEmpty = $('qualityStrip' + suffix);
    if (stripEmpty) stripEmpty.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (tools) tools.classList.add('hidden');
    if (btnDelete) btnDelete.classList.add('hidden');

    if (badge) {
      badge.textContent = 'Sin foto';
      badge.className = 'text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
    }

    ['accHintFit', 'accHintImg', 'accHintTools'].forEach(function(prefix) {
      const hintEl = $(prefix + suffix);
      if (hintEl) hintEl.textContent = '';
    });

    const oaciOverlay = $('oaciGuide' + suffix);
    if (oaciOverlay) oaciOverlay.classList.add('hidden');

    if (typeof updateUI === 'function') updateUI();
  }
  if (typeof saveActiveDraft === 'function') saveActiveDraft();
}

/* ============================================================
   PORTAPAPELES (PEGAR DIRECTO CON CTRL + V O BOTÓN)
   ============================================================ */
async function pasteFromClipboard(side) {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      showToast('Presiona Ctrl + V en tu teclado para pegar la imagen copiada.', 'info');
      return;
    }
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          if(await loadBlobIntoSide(blob, side,{review:true}))showToast('Imagen revisada y cargada.','success');
          return;
        }
      }
    }
    showToast('No se encontró ninguna imagen en el portapapeles. Copia una imagen y reintenta.', 'warning');
  } catch (err) {
    showToast('Haz clic aquí y presiona Ctrl + V para pegar directo.', 'info');
  }
}

document.addEventListener('paste', function(e) {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      // Encontrar la ranura destino vacía
      let target = 'front';
      const pageCount = state.documentPageCount || 2;
      if (!state.images.front.processedDataUrl) target = 'front';
      else if (pageCount >= 2 && !state.images.back.processedDataUrl) target = 'back';
      else if (pageCount >= 3 && !state.images.page3.processedDataUrl) target = 'page3';
      else if (pageCount >= 4 && !state.images.page4.processedDataUrl) target = 'page4';
      loadBlobIntoSide(blob, target,{review:true});
      e.preventDefault();
      break;
    }
  }
});

/* ============================================================
   AUTO-AJUSTE MÁGICO 1:1 (Luz, Nitidez, Encuadre y Milímetros)
   ============================================================ */
function autoEnhanceActiveSlots() {
  const activeSlots = state.activeCategory==='photos' ? (state.mixTwoPhotos?['front','back']:['front']) : ['front','back','page3','page4'].slice(0,state.documentPageCount||2);
  let count=0;
  for(const side of activeSlots)if(state.images[side]?.originalSrc){setFitMode(side,'fit');count++;}
  showToast(count ? count+' cara(s) centradas y encajadas. Se conservan orientación, color y original.' : 'Carga una imagen antes de encajar las caras.',count?'success':'warning');
}

function waitForProcessingComplete(timeoutMs) {
  timeoutMs = timeoutMs || 15000;
  return new Promise(function(resolve) {
    const start = Date.now();
    function check() {
      if ((!state._processingPending || state._processingPending <= 0) && !state._previewDragging && !Object.values(state.images||{}).some(image=>image?._reading)) return resolve(true);
      if (Date.now() - start > timeoutMs) {showToast('El procesamiento aún no termina. Espera y vuelve a intentar.', 'error');return resolve(false);}
      setTimeout(check, 30);
    }
    check();
  });
}

if (typeof window !== 'undefined') {
  window.waitForProcessingComplete = waitForProcessingComplete;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports.waitForProcessingComplete = waitForProcessingComplete;
}
