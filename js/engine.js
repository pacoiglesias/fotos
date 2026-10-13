/* ============================================================
   RealScan Pro — Motor de Imagen, Filtros y Calibración (300 DPI)
   Desarrollado por Paco Iglesias • Escala 1:1 Calibrada
   ============================================================ */

/* ============================================================
   CÁMARA EN VIVO Y DISPOSITIVO NATIVO
   ============================================================ */
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
  if (titleEl) titleEl.textContent = 'Cámara en Vivo — ' + (side === 'front' ? 'Anverso' : 'Reverso');
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
  showToast('¡Foto capturada para ' + (side === 'front' ? 'Anverso' : 'Reverso') + '!', 'success');
}

function closeLiveCamera() {
  closeModal('liveCameraModal');
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(function(t){ t.stop(); });
    state.cameraStream = null;
  }
}

function triggerNativeUpload(side, isCamera) {
  const input = side === 'front' ? $('fileInputFront') : $('fileInputBack');
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

    if (pdfDoc.numPages >= 2 && state.printMode === 'both') {
      const p1 = await pdfDoc.getPage(1);
      processRawDataUrl(await renderPdfPageToDataUrl(p1), 'front');
      const p2 = await pdfDoc.getPage(2);
      processRawDataUrl(await renderPdfPageToDataUrl(p2), 'back');
      showToast('¡PDF de 2 páginas detectado! Anverso y Reverso cargados.', 'success');
    } else {
      const p = await pdfDoc.getPage(1);
      processRawDataUrl(await renderPdfPageToDataUrl(p), targetSide);
      showToast('¡PDF cargado en ' + (targetSide === 'front' ? 'Anverso' : 'Reverso') + '!', 'success');
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
   RECORTE AUTOMÁTICO DE BORDES BLANCOS (SCANNER AUTO-TRIM)
   ============================================================ */
function detectAndCropCard(img) {
  try {
    const canvas = document.createElement('canvas');
    const maxDim = 1400;
    let scale = 1;
    if (img.naturalWidth > maxDim || img.naturalHeight > maxDim) {
      scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
    }
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    function getRGB(x, y) { const i = (y*w + x)*4; return { r:d[i], g:d[i+1], b:d[i+2], a:d[i+3] }; }
    const c1 = getRGB(4,4), c2 = getRGB(w-5,4), c3 = getRGB(4,h-5), c4 = getRGB(w-5,h-5);
    const isLight = function(c){ return c.r>225 && c.g>225 && c.b>225; };
    const hasWhiteBg = isLight(c1) || isLight(c2) || isLight(c3) || isLight(c4);
    function isBackground(x, y) {
      const p = getRGB(x, y);
      if (p.a < 30) return true;
      if (hasWhiteBg) return p.r>230 && p.g>230 && p.b>230;
      const diff = Math.abs(p.r-c1.r) + Math.abs(p.g-c1.g) + Math.abs(p.b-c1.b);
      return diff < 38;
    }
    let top=0, bottom=h-1, left=0, right=w-1;
    for (let y=0; y<h*0.45; y++) { let n=0; for (let x=Math.round(w*0.1); x<w*0.9; x+=4) if(!isBackground(x,y)) n++; if(n>(w*0.8/4)*0.08){ top=Math.max(0,y-2); break; } }
    for (let y=h-1; y>h*0.55; y--) { let n=0; for (let x=Math.round(w*0.1); x<w*0.9; x+=4) if(!isBackground(x,y)) n++; if(n>(w*0.8/4)*0.08){ bottom=Math.min(h-1,y+2); break; } }
    for (let x=0; x<w*0.45; x++) { let n=0; for (let x=Math.round(h*0.1); y<h*0.9; y+=4) if(!isBackground(x,y)) n++; if(n>(h*0.8/4)*0.08){ left=Math.max(0,x-2); break; } }
    for (let x=w-1; x>w*0.55; x--) { let n=0; for (let y=Math.round(h*0.1); y<h*0.9; y+=4) if(!isBackground(x,y)) n++; if(n>(h*0.8/4)*0.08){ right=Math.min(w-1,x+2); break; } }

    const cropW = right-left+1, cropH = bottom-top+1;
    const wasTrimmed = (top>5) || (bottom<h-6) || (left>5) || (right<w-6);

    if (wasTrimmed && cropW>80 && cropH>50) {
      const oL = Math.round(left/scale), oT = Math.round(top/scale);
      const oW = Math.min(img.naturalWidth-oL, Math.round(cropW/scale));
      const oH = Math.min(img.naturalHeight-oT, Math.round(cropH/scale));
      const cc = document.createElement('canvas');
      cc.width = oW; cc.height = oH;
      const cx = cc.getContext('2d');
      cx.drawImage(img, oL, oT, oW, oH, 0, 0, oW, oH);
      return cc.toDataURL('image/jpeg', 0.96);
    }
  } catch (err) { /* silent */ }
  return null;
}

function toggleAutoCrop(side) {
  const imgData = state.images[side];
  if (!imgData.rawOriginalSrc || !imgData.croppedSrc) return;
  imgData.isCropApplied = !imgData.isCropApplied;
  const targetSrc = imgData.isCropApplied ? imgData.croppedSrc : imgData.rawOriginalSrc;
  const btn = $(side === 'front' ? 'btnToggleCropFront' : 'btnToggleCropBack');
  if (btn) btn.textContent = imgData.isCropApplied ? '✂️ Recorte Auto' : 'Original';

  const img = new Image();
  img.onload = function() {
    imgData.originalSrc = targetSrc;
    imgData.naturalWidth = img.naturalWidth;
    imgData.naturalHeight = img.naturalHeight;
    renderProcessedImage(side);
    showToast(imgData.isCropApplied ? 'Recorte de bordes activado' : 'Mostrando imagen sin recortar', 'info');
  };
  img.src = targetSrc;
}

/* ============================================================
   PROCESAMIENTO DE IMAGEN Y ROTACIÓN INTELIGENTE
   ============================================================ */
function processRawDataUrl(rawSrc, side) {
  const img = new Image();
  img.onload = function() {
    state.images[side].rawOriginalSrc = rawSrc;
    state.images[side].zoom = 1.0;
    const label = $(side === 'front' ? 'zoomLabelFront' : 'zoomLabelBack');
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
    const toggleBtn = $(side === 'front' ? 'btnToggleCropFront' : 'btnToggleCropBack');

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
  const label = $(side === 'front' ? 'zoomLabelFront' : 'zoomLabelBack');
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
  const oaciOverlay = $(side === 'front' ? 'oaciGuideFront' : 'oaciGuideBack');
  if (oaciOverlay) oaciOverlay.classList.toggle('hidden', !state.images[side].showOaciGuide);
  const guideBtn = document.querySelector('[data-guide="' + side + '"]');
  if (guideBtn) {
    guideBtn.classList.toggle('bg-indigo-100', state.images[side].showOaciGuide);
    guideBtn.classList.toggle('dark:bg-indigo-900', state.images[side].showOaciGuide);
  }
  showToast(state.images[side].showOaciGuide ? '👤 Guía OACI activada (alinea ojos y mentón)' : 'Guía OACI desactivada', 'info');
}

function updateSidePreview(side) {
  const isFront = side === 'front';
  const imgData = state.images[side];
  const previewImg = $(isFront ? 'previewImgFront' : 'previewImgBack');
  const placeholder = $(isFront ? 'placeholderFront' : 'placeholderBack');
  const tools = $(isFront ? 'toolsFront' : 'toolsBack');
  const badge = $(isFront ? 'badgeStatusFront' : 'badgeStatusBack');

  if (imgData.processedDataUrl) {
    previewImg.src = imgData.processedDataUrl;
    previewImg.classList.remove('hidden');
    previewImg.className = 'w-full h-full object-cover rounded-sm';
    placeholder.classList.add('hidden');
    tools.classList.remove('hidden');

    badge.textContent = 'Listo';
    badge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200';

    $$('[data-filter^="' + side + ':"]').forEach(function(b) {
      const f = b.getAttribute('data-filter').split(':')[1];
      b.classList.toggle('is-active', f === (imgData.filter || 'color'));
    });

    const oaciOverlay = $(isFront ? 'oaciGuideFront' : 'oaciGuideBack');
    if (oaciOverlay) oaciOverlay.classList.toggle('hidden', !imgData.showOaciGuide);

    if (typeof updateUI === 'function') updateUI();
  }
}
