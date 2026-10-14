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
  if (side === 'front') return 'Anverso / Pág. 1';
  if (side === 'back') return 'Reverso / Pág. 2';
  if (side === 'page3') return 'Página 3 / Visa 1';
  if (side === 'page4') return 'Página 4 / Visa 2';
  return 'Página';
}

function handleCameraClick(side) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    triggerNativeUpload(side, true);
  } else {
    openLiveCamera(side);
  }
}

async function openLiveCamera(side) {
  state.activeCameraSide = side;
  const titleEl = $('cameraModalTitle');
  if (titleEl) titleEl.textContent = 'Cámara en Vivo — ' + getSlotFriendlyName(side);
  const video = $('liveVideo');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    triggerNativeUpload(side, true);
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    state.cameraStream = stream;
    video.srcObject = stream;
    openModal('liveCameraModal');
  } catch (err) {
    showToast('Usando cámara nativa del sistema...', 'info');
    triggerNativeUpload(side, true);
  }
}

async function switchCameraFacing() {
  state.facingMode = (state.facingMode === 'environment') ? 'user' : 'environment';
  if (state.cameraStream) state.cameraStream.getTracks().forEach(function(t){ t.stop(); });
  openLiveCamera(state.activeCameraSide);
}

function captureLivePhoto() {
  const video = $('liveVideo');
  if (!video.videoWidth) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const side = state.activeCameraSide;
  closeLiveCamera();
  processRawDataUrl(dataUrl, side);
  showToast('¡Foto capturada para ' + getSlotFriendlyName(side) + '!', 'success');
}

function closeLiveCamera() {
  closeModal('liveCameraModal');
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(function(t){ t.stop(); });
    state.cameraStream = null;
  }
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
  loadBlobIntoSide(file, side);
}

async function loadBlobIntoSide(blob, side) {
  const isPdf = blob.type === 'application/pdf' || (blob.name && blob.name.toLowerCase().endsWith('.pdf'));
  if (isPdf) { await handlePdfFile(blob, side); return; }
  const reader = new FileReader();
  reader.onload = function(e) { processRawDataUrl(e.target.result, side); };
  reader.readAsDataURL(blob);
}

async function handlePdfFile(file, targetSide) {
  if (!window.pdfjsLib) { showToast('Cargando motor PDF, reintenta en un segundo...', 'warning'); return; }
  try {
    showToast('Procesando PDF escaneado...', 'info');
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    if (pdfDoc.numPages >= 2 && state.printMode !== 'single') {
      const numToLoad = Math.min(pdfDoc.numPages, 4);
      if (typeof setDocumentPages === 'function' && numToLoad > 2) {
        setDocumentPages(numToLoad);
      }
      const slots = ['front', 'back', 'page3', 'page4'];
      for (let i = 1; i <= numToLoad; i++) {
        const page = await pdfDoc.getPage(i);
        const dataUrl = await renderPdfPageToDataUrl(page);
        processRawDataUrl(dataUrl, slots[i - 1]);
      }
      showToast('¡PDF de ' + numToLoad + ' páginas detectado y cargado con éxito!', 'success');
    } else {
      const p = await pdfDoc.getPage(1);
      processRawDataUrl(await renderPdfPageToDataUrl(p), targetSide);
      showToast('¡PDF cargado en ' + getSlotFriendlyName(targetSide) + '!', 'success');
    }
  } catch (err) {
    showToast('No se pudo leer el PDF. Asegúrate de que no tenga contraseña.', 'warning');
  }
}

async function renderPdfPageToDataUrl(page) {
  const viewport = page.getViewport({ scale: 3.0 });
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
  const imgData = state.images[side];
  if (!imgData.originalSrc) {
    showToast('Primero captura o sube una imagen en esta ranura.', 'warning');
    return;
  }

  // 1. Si existe versión recortada pero no está activa, aplicarla
  if (imgData.croppedSrc && !imgData.isCropApplied) {
    imgData.isCropApplied = true;
    imgData.originalSrc = imgData.croppedSrc;
    const btn = $('btnToggleCrop' + getSlotIdSuffix(side));
    if (btn) btn.textContent = '✂️ Recorte Auto';
    imgData.zoom = 1.0;
    imgData.panX = 0;
    imgData.panY = 0;
    const label = $('zoomLabel' + getSlotIdSuffix(side));
    if (label) label.textContent = '1.0x';
    renderProcessedImage(side);
    showToast('¡Ajuste 1:1 aplicado! Documento ampliado para rellenar la ranura exacta.', 'success');
  } else if (!imgData.croppedSrc && imgData.rawOriginalSrc) {
    const tempImg = new Image();
    tempImg.onload = function() {
      const cropped = detectAndCropCard(tempImg);
      if (cropped) {
        imgData.croppedSrc = cropped;
        imgData.isCropApplied = true;
        imgData.originalSrc = cropped;
        imgData.naturalWidth = tempImg.naturalWidth;
        imgData.naturalHeight = tempImg.naturalHeight;
        imgData.zoom = 1.0;
      } else {
        // Si la foto no tiene bordes detectables pero el DNI es pequeño, ampliarlo un paso (+25%)
        imgData.zoom = parseFloat(((imgData.zoom || 1.0) + 0.25).toFixed(2));
      }
      imgData.panX = 0;
      imgData.panY = 0;
      const label = $('zoomLabel' + getSlotIdSuffix(side));
      if (label) label.textContent = (imgData.zoom || 1.0) + 'x';
      renderProcessedImage(side);
      showToast('⚡ ¡DNI ampliado (' + imgData.zoom + 'x) para llenar el tamaño real 1:1! Arrastra sobre la vista previa para centrarlo.', 'success');
    };
    tempImg.src = imgData.rawOriginalSrc;
    return;
  } else {
    // Si ya está activo o recortado, ampliar incrementalmente (+25%) con cada clic para fotos pequeñas
    let currentZ = imgData.zoom || 1.0;
    if (currentZ >= 2.5) {
      currentZ = 1.0;
      showToast('🔄 Zoom restablecido a 1.0x (Tamaño estándar).', 'info');
    } else {
      currentZ = parseFloat((currentZ + 0.25).toFixed(2));
      showToast('🔍 DNI ampliado a ' + currentZ + 'x para llenar la ranura real (85.6 × 54.0 mm).', 'success');
    }
    imgData.zoom = currentZ;
    const label = $('zoomLabel' + getSlotIdSuffix(side));
    if (label) label.textContent = currentZ + 'x';
    renderProcessedImage(side);
  }
}

function setZoomScale(side, targetZoom) {
  const imgData = state.images[side];
  if (!imgData || !imgData.originalSrc) {
    showToast('Carga primero una foto para ajustar su tamaño.', 'warning');
    return;
  }
  imgData.zoom = parseFloat(targetZoom.toFixed(2));
  const label = $('zoomLabel' + getSlotIdSuffix(side));
  if (label) label.textContent = imgData.zoom + 'x';
  renderProcessedImage(side);
  showToast('🔍 Ampliación fijada a ' + imgData.zoom + 'x en ' + getSlotFriendlyName(side) + '. Arrastra la foto para encuadrarla.', 'info');
}

function clearSlot(side) {
  state.images[side] = {
    rawOriginalSrc: null,
    croppedSrc: null,
    isCropApplied: true,
    originalSrc: null,
    processedDataUrl: null,
    naturalWidth: 0,
    naturalHeight: 0,
    rotation: 0,
    zoom: 1.0,
    filter: 'color',
    panX: 0,
    panY: 0,
    showOaciGuide: false
  };

  const suffix = getSlotIdSuffix(side);
  const input = $('fileInput' + suffix);
  if (input) input.value = '';

  const zoomLabel = $('zoomLabel' + suffix);
  if (zoomLabel) zoomLabel.textContent = '1.0x';

  const cropBtn = $('btnToggleCrop' + suffix);
  if (cropBtn) cropBtn.classList.add('hidden');

  updateSidePreview(side);
  showToast('Foto eliminada de ' + getSlotFriendlyName(side) + '. Ranura lista para nueva captura o archivo.', 'info');
}

/* ============================================================
   PROCESAMIENTO DE IMAGEN Y ROTACIÓN INTELIGENTE
   ============================================================ */
function processRawDataUrl(rawSrc, side) {
  const img = new Image();
  img.onload = function() {
    state.images[side].rawOriginalSrc = rawSrc;
    state.images[side].zoom = 1.0;
    const label = $('zoomLabel' + getSlotIdSuffix(side));
    if (label) label.textContent = '1.0x';

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

    const croppedData = detectAndCropCard(img);
    const toggleBtn = $('btnToggleCrop' + getSlotIdSuffix(side));

    if (croppedData) {
      state.images[side].croppedSrc = croppedData;
      state.images[side].isCropApplied = true;
      state.images[side].originalSrc = croppedData;
      if (toggleBtn) toggleBtn.classList.remove('hidden');

      const ci = new Image();
      ci.onload = function() {
        state.images[side].naturalWidth = ci.naturalWidth;
        state.images[side].naturalHeight = ci.naturalHeight;
        const spec = getActiveSpec();
        const specIsPortrait = spec.heightMm > spec.widthMm;
        const imgIsPortrait = ci.naturalHeight > ci.naturalWidth;
        state.images[side].rotation = (specIsPortrait === imgIsPortrait) ? 0 : 90;
        renderProcessedImage(side);
        showToast('✂️ ¡Bordes blancos eliminados automáticamente! Escala 1:1 real.', 'success');
      };
      ci.src = croppedData;
      return;
    }

    state.images[side].originalSrc = rawSrc;
    state.images[side].naturalWidth = img.naturalWidth;
    state.images[side].naturalHeight = img.naturalHeight;
    if (toggleBtn) toggleBtn.classList.add('hidden');

    const spec = getActiveSpec();
    const specIsPortrait = spec.heightMm > spec.widthMm;
    const imgIsPortrait = img.naturalHeight > img.naturalWidth;
    state.images[side].rotation = (specIsPortrait === imgIsPortrait) ? 0 : 90;
    renderProcessedImage(side);
  };
  img.src = rawSrc;
}

function rotateImage(side) {
  if (!state.images[side].originalSrc) return;
  state.images[side].rotation = (state.images[side].rotation + 90) % 360;
  renderProcessedImage(side);
}

function adjustZoom(side, delta) {
  if (!state.images[side].originalSrc) return;
  let z = state.images[side].zoom || 1.0;
  z = Math.max(0.5, Math.min(3.5, z + delta));
  state.images[side].zoom = parseFloat(z.toFixed(2));
  const label = $('zoomLabel' + getSlotIdSuffix(side));
  if (label) label.textContent = state.images[side].zoom + 'x';
  renderProcessedImage(side);
}

/* ============================================================
   RENDERIZADO CON ESCALA 1:1 CALIBRADA (300 DPI)
   ============================================================ */
function renderProcessedImage(side) {
  const imgData = state.images[side];
  if (!imgData.originalSrc) return;
  const img = new Image();
  img.onload = function() {
    const rotation = imgData.rotation || 0;
    const zoom = imgData.zoom || 1.0;
    const panX = imgData.panX || 0;
    const panY = imgData.panY || 0;
    const filter = imgData.filter || 'color';
    const spec = getActiveSpec();

    let outW = Math.round(spec.widthMm / 25.4 * window.TARGET_DPI);
    let outH = Math.round(spec.heightMm / 25.4 * window.TARGET_DPI);
    if (outW > window.MAX_OUT_PX) { const r = window.MAX_OUT_PX / outW; outW = window.MAX_OUT_PX; outH = Math.round(outH * r); }
    if (outH > window.MAX_OUT_PX) { const r = window.MAX_OUT_PX / outH; outH = window.MAX_OUT_PX; outW = Math.round(outW * r); }

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);

    const rotW = (rotation === 90 || rotation === 270) ? img.naturalHeight : img.naturalWidth;
    const rotH = (rotation === 90 || rotation === 270) ? img.naturalWidth : img.naturalHeight;
    const scaleCover = Math.max(outW / rotW, outH / rotH) * zoom;

    const offsetX = (panX / 100) * outW;
    const offsetY = (panY / 100) * outH;

    ctx.save();
    ctx.translate(outW / 2 + offsetX, outH / 2 + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scaleCover, scaleCover);
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
          for (let i = 0; i < d.length; i += 4) {
            let lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
            if (lum > 185) lum = 255;
            else if (lum < 115) lum = Math.max(0, lum * 0.72);
            else lum = ((lum - 115) / (185 - 115)) * 255;
            d[i] = lum; d[i+1] = lum; d[i+2] = lum;
          }
        }
        ctx.putImageData(imgPixels, 0, 0);
      } catch(e) {}
    }

    imgData.processedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    updateSidePreview(side);
  };
  img.src = imgData.originalSrc;
}

function setFilter(side, filter) {
  if (!state.images[side].originalSrc) return;
  state.images[side].filter = filter;
  renderProcessedImage(side);
  const names = { color: 'Color original', bw: 'Blanco y Negro oficial', scanner: 'Escáner / Fotocopia nítida' };
  showToast('Filtro aplicado: ' + (names[filter] || filter), 'info');
}

function adjustPan(side, dx, dy) {
  if (!state.images[side].originalSrc) return;
  state.images[side].panX = Math.max(-50, Math.min(50, (state.images[side].panX || 0) + dx));
  state.images[side].panY = Math.max(-50, Math.min(50, (state.images[side].panY || 0) + dy));
  renderProcessedImage(side);
}

function resetPan(side) {
  if (!state.images[side].originalSrc) return;
  state.images[side].panX = 0;
  state.images[side].panY = 0;
  renderProcessedImage(side);
  showToast('Posición centrada al origen.', 'info');
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

  if (imgData && imgData.processedDataUrl) {
    if (previewImg) {
      previewImg.src = imgData.processedDataUrl;
      previewImg.classList.remove('hidden');
      previewImg.className = 'w-full h-full object-cover rounded-sm';
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (tools) tools.classList.remove('hidden');
    if (btnDelete) btnDelete.classList.remove('hidden');

    if (badge) {
      badge.textContent = 'Listo';
      badge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200';
    }

    $$('[data-filter^="' + side + ':"]').forEach(function(b) {
      const f = b.getAttribute('data-filter').split(':')[1];
      b.classList.toggle('is-active', f === (imgData.filter || 'color'));
    });

    const oaciOverlay = $('oaciGuide' + suffix);
    if (oaciOverlay) oaciOverlay.classList.toggle('hidden', !imgData.showOaciGuide);

    if (typeof updateUI === 'function') updateUI();
  } else {
    if (previewImg) {
      previewImg.src = '';
      previewImg.classList.add('hidden');
    }
    if (placeholder) placeholder.classList.remove('hidden');
    if (tools) tools.classList.add('hidden');
    if (btnDelete) btnDelete.classList.add('hidden');

    if (badge) {
      badge.textContent = 'Sin foto';
      badge.className = 'text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
    }

    const oaciOverlay = $('oaciGuide' + suffix);
    if (oaciOverlay) oaciOverlay.classList.add('hidden');

    if (typeof updateUI === 'function') updateUI();
  }
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
          loadBlobIntoSide(blob, side);
          showToast('¡Imagen pegada desde el portapapeles con éxito!', 'success');
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
      loadBlobIntoSide(blob, target);
      showToast('¡Imagen pegada con éxito en ' + getSlotFriendlyName(target) + '!', 'success');
      e.preventDefault();
      break;
    }
  }
});

/* ============================================================
   AUTO-AJUSTE MÁGICO 1:1 (Luz, Nitidez, Encuadre y Milímetros)
   ============================================================ */
function autoEnhanceActiveSlots() {
  const activeSlots = ['front', 'back', 'page3', 'page4'].slice(0, state.documentPageCount || 2);
  let enhancedCount = 0;

  activeSlots.forEach(function(side) {
    const imgData = state.images[side];
    if (imgData && imgData.originalSrc) {
      // 1. Resetear paneo y centrar milimétricamente
      imgData.panX = 0;
      imgData.panY = 0;
      imgData.zoom = 1.0;
      imgData.rotation = 0;
      imgData.isCropApplied = true;

      // 2. Si es documento oficial y está en color, aplicar escaneo de alta nitidez
      if (state.activeCategory === 'docs' && imgData.filter === 'color') {
        imgData.filter = 'scanner';
      }

      renderProcessedImage(side);
      enhancedCount++;
    }
  });

  if (enhancedCount > 0) {
    showToast('✨ Auto-Ajuste Mágico 1:1 aplicado en ' + enhancedCount + ' cara(s): luz optimizada, textos nítidos y escala calibrada.', 'success');
    if (typeof logActivity === 'function') {
      logActivity('Auto-Ajuste Mágico 1:1', enhancedCount + ' caras optimizadas automáticamente');
    }
  } else {
    showToast('Carga primero una foto o escaneo para aplicar el Auto-Ajuste Mágico.', 'warning');
  }
}

