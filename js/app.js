/* ============================================================
   RealScan Pro — Aplicación Principal, Layout e Inicialización
   Desarrollado por Paco Iglesias • Escala 1:1 Calibrada
   ============================================================ */

/* ============================================================
   INTENCIONES RÁPIDAS DE TRABAJO (M-18)
   ============================================================ */
function switchIntent(intent) {
  $$('.intent-card').forEach(function(card) {
    const active = card.getAttribute('data-intent') === intent;
    card.classList.toggle('is-active', active);
  });

  if (intent === 'id') {
    switchCategory('docs');
    selectFormat('card');
    setPrintMode('both');
    showToast('🪪 Modo Identificaciones: INE / DNI calibrado a 85.6 × 54.0 mm', 'info');
  } else if (intent === 'photos') {
    switchCategory('photos');
    selectFormat('photo_infantil');
    showToast('📷 Modo Fotos Oficiales: Planilla calibrada a escala 1:1', 'info');
  } else if (intent === 'multi') {
    switchCategory('docs');
    selectFormat('passport_open');
    setPrintMode('both_separate');
    showToast('📑 Modo Multipágina: Hojas separadas navegables para pasaportes y trámites', 'info');
  } else if (intent === 'custom') {
    switchCategory('custom');
    showToast('📐 Modo Medidas Libres: Configura dimensiones en cm o mm', 'info');
  }
}

/* ============================================================
   ZOOM DE VISUALIZACIÓN DEL LIENZO DE LA HOJA (M-19)
   ============================================================ */
function setStageSheetZoom(zoomLevel) {
  const wrapper = $('stageSheetWrapper');
  if (!wrapper) return;
  wrapper.setAttribute('data-sheet-zoom', zoomLevel);
  $$('.sheet-zoom-btn').forEach(function(btn) {
    btn.classList.toggle('is-active', btn.getAttribute('data-sheet-zoom') === zoomLevel);
  });
}

/* ============================================================
   NAVEGACIÓN MÓVIL POR ETAPAS FLUIDAS (M-20)
   ============================================================ */
function setMobileStep(step) {
  document.body.dataset.mobileStep = String(step);
  const stepNum = parseInt(step, 10) || 1;
  $$('.mobile-step-tab').forEach(function(tab) {
    const s = parseInt(tab.getAttribute('data-mob-step'), 10);
    const active = (s === stepNum);
    tab.classList.toggle('is-active', active);
    tab.classList.toggle('text-slate-500', !active);
    tab.classList.toggle('dark:text-slate-400', !active);
  });

  $$('.mob-pane').forEach(function(pane) {
    const isStep1 = pane.classList.contains('mob-pane-1');
    const isStep2 = pane.classList.contains('mob-pane-2');
    const isStep3 = pane.classList.contains('mob-pane-3');
    
    let active = false;
    if (stepNum === 1 && isStep1) active = true;
    else if (stepNum === 2 && isStep2) active = true;
    else if (stepNum === 3 && isStep3) active = true;

    pane.classList.toggle('mob-pane-active', active);
  });

  if (window.innerWidth < 1024) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/* ============================================================
   PANEL COLAPSABLE DE HISTORIAL LOCAL
   ============================================================ */
function toggleSavedScansSection() {
  const grid = $('mainSavedScansGrid');
  const icon = $('iconToggleSavedScans');
  const label = $('labelToggleSavedScans');
  if (!grid) return;
  const isHidden = grid.classList.toggle('hidden');
  if (icon) icon.textContent = isHidden ? '▶' : '▼';
  if (label) label.textContent = isHidden ? 'Mostrar' : 'Ocultar';
}

/* ============================================================
   ETAPA 4: EDICIÓN AVANZADA, PERSPECTIVA Y GESTIÓN DE PÁGINAS (M-22 a M-26)
   ============================================================ */
let activeWarpSide = 'front';
let warpPoints = []; // [TL, TR, BR, BL] en coords nativas
let warpImage = null;
let warpDragIndex = -1;

function openPerspectiveWarpModal(side) {
  const imgData = state.images[side];
  const src = imgData ? (imgData.rawOriginalSrc || imgData.originalSrc) : null;
  if (!src) {
    showToast('Carga primero una foto para enderezar su perspectiva.', 'warning');
    return;
  }
  activeWarpSide = side;
  const title = $('warpModalTitle');
  if (title) title.textContent = 'Enderezar Perspectiva — ' + getSlotFriendlyName(side);

  const img = new Image();
  img.onload = function() {
    warpImage = img;
    if (imgData.perspectiveQuad && Array.isArray(imgData.perspectiveQuad) && imgData.perspectiveQuad.length === 4) {
      warpPoints = JSON.parse(JSON.stringify(imgData.perspectiveQuad));
    } else {
      resetWarpPointsToInset(0.06);
    }
    openModal('perspectiveWarpModal');
    renderWarpCanvas();
  };
  img.src = src;
}

function resetWarpPointsToInset(marginPercent) {
  if (!warpImage) return;
  const w = warpImage.naturalWidth;
  const h = warpImage.naturalHeight;
  const mx = w * marginPercent;
  const my = h * marginPercent;
  warpPoints = [
    { x: mx, y: my },             // 0: Top-Left
    { x: w - mx, y: my },         // 1: Top-Right
    { x: w - mx, y: h - my },     // 2: Bottom-Right
    { x: mx, y: h - my }          // 3: Bottom-Left
  ];
}

function renderWarpCanvas() {
  const canvas = $('canvasWarpInteractive');
  if (!canvas || !warpImage) return;
  const maxW = 760;
  const maxH = 520;
  const scale = Math.min(maxW / warpImage.naturalWidth, maxH / warpImage.naturalHeight, 1.0);
  const w = Math.round(warpImage.naturalWidth * scale);
  const h = Math.round(warpImage.naturalHeight * scale);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(warpImage, 0, 0, w, h);

  // Oscurecer exterior
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, w, h);

  // Hueco interior iluminado
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(warpPoints[0].x * scale, warpPoints[0].y * scale);
  ctx.lineTo(warpPoints[1].x * scale, warpPoints[1].y * scale);
  ctx.lineTo(warpPoints[2].x * scale, warpPoints[2].y * scale);
  ctx.lineTo(warpPoints[3].x * scale, warpPoints[3].y * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Líneas guías del cuadrilátero
  ctx.save();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(warpPoints[0].x * scale, warpPoints[0].y * scale);
  ctx.lineTo(warpPoints[1].x * scale, warpPoints[1].y * scale);
  ctx.lineTo(warpPoints[2].x * scale, warpPoints[2].y * scale);
  ctx.lineTo(warpPoints[3].x * scale, warpPoints[3].y * scale);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // 4 manijas de esquina interactivas
  const colors = ['#4f46e5', '#4f46e5', '#4f46e5', '#4f46e5'];
  warpPoints.forEach(function(pt, idx) {
    const px = pt.x * scale;
    const py = pt.y * scale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fillStyle = colors[idx];
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(idx + 1), px, py);
    ctx.restore();
  });
}

function initWarpCanvasEvents() {
  const canvas = $('canvasWarpInteractive');
  if (!canvas) return;

  function getPointIndexAt(x, y, scale) {
    for (let i = 0; i < warpPoints.length; i++) {
      const px = warpPoints[i].x * scale;
      const py = warpPoints[i].y * scale;
      const dist = Math.hypot(x - px, y - py);
      if (dist <= 26) return i;
    }
    return -1;
  }

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const scale = canvas.width / (warpImage ? warpImage.naturalWidth : 1);
    return { cx, cy, scale };
  }

  canvas.addEventListener('pointerdown', function(e) {
    if (!warpImage) return;
    const { cx, cy, scale } = getCanvasCoords(e);
    warpDragIndex = getPointIndexAt(cx, cy, scale);
    if (warpDragIndex >= 0) {
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', function(e) {
    if (!warpImage) return;
    const { cx, cy, scale } = getCanvasCoords(e);
    if (warpDragIndex >= 0) {
      const nx = Math.max(0, Math.min(warpImage.naturalWidth, cx / scale));
      const ny = Math.max(0, Math.min(warpImage.naturalHeight, cy / scale));
      warpPoints[warpDragIndex].x = nx;
      warpPoints[warpDragIndex].y = ny;
      renderWarpCanvas();
    } else {
      const hoverIdx = getPointIndexAt(cx, cy, scale);
      canvas.style.cursor = (hoverIdx >= 0) ? 'grab' : 'crosshair';
    }
  });

  function stopDrag(e) {
    if (warpDragIndex >= 0) {
      warpDragIndex = -1;
      try { canvas.releasePointerCapture(e.pointerId); } catch(err) {}
    }
  }

  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);

  if ($('btnWarpResetCorners')) {
    on($('btnWarpResetCorners'), 'click', function() {
      resetWarpPointsToInset(0.00);
      renderWarpCanvas();
      showToast('Esquinas extendidas al borde total.', 'info');
    });
  }

  if ($('btnWarpAutoCorners')) {
    on($('btnWarpAutoCorners'), 'click', function() {
      resetWarpPointsToInset(0.08);
      renderWarpCanvas();
      showToast('Encuadre optimizado para credencial/tarjeta.', 'info');
    });
  }

  function isConvexQuad(pts) {
    if (!pts || pts.length !== 4) return false;
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % 4];
      const p3 = pts[(i + 2) % 4];
      const cross = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
      if (Math.abs(cross) < 1e-4) return false; // Colineales
      if (sign === 0) sign = cross > 0 ? 1 : -1;
      else if ((cross > 0 ? 1 : -1) !== sign) return false; // Cóncavo o auto-intersecante
    }
    return true;
  }

  if ($('btnApplyWarp')) {
    on($('btnApplyWarp'), 'click', function() {
      if (!warpImage || !window.RealScanEditor || !warpPoints || warpPoints.length !== 4) return;
      if (!isConvexQuad(warpPoints)) {
        showToast('⚠️ Las 4 esquinas están cruzadas o invertidas. Asegúrate de formar un cuadrilátero regular.', 'warning');
        return;
      }
      const side = activeWarpSide;
      const spec = getActiveSpec();
      const targetW = Math.round((spec.widthMm / 25.4) * window.TARGET_DPI);
      const targetH = Math.round((spec.heightMm / 25.4) * window.TARGET_DPI);

      window.RealScanEditor.recordSnapshot(side, state.images[side]);
      showToast('Calculando enderezado milimétrico a 300 DPI...', 'info');

      setTimeout(function() {
        const warpedDataUrl = window.RealScanEditor.warpPerspective(warpImage, warpPoints, targetW, targetH);
        if (warpedDataUrl) {
          state.images[side].croppedSrc = warpedDataUrl;
          state.images[side].originalSrc = warpedDataUrl;
          state.images[side].isCropApplied = true;
          state.images[side].perspectiveQuad = JSON.parse(JSON.stringify(warpPoints));
          state.images[side].fitMode = 'cover';
          state.images[side].panX = 0;
          state.images[side].panY = 0;
          state.images[side].rotation = 0;
          closeModal('perspectiveWarpModal');
          renderProcessedImage(side);
          showToast('📐 ¡Documento enderezado a 300 DPI con escala 1:1 verificada!', 'success');
        } else {
          showToast('No se pudo aplicar la corrección de perspectiva. Revisa que las esquinas formen un cuadrilátero válido.', 'warning');
        }
      }, 50);
    });
  }
}

/* ============================================================
   RECORTE MANUAL PRECISO (CROP & COMPARE) (M-23)
   ============================================================ */
let activeCropSide = 'front';
let cropImage = null;
let cropBox = { x: 0, y: 0, width: 100, height: 100 }; // Coordenadas nativas
let cropDragHandle = null; // 'all', 'tl', 'tr', 'br', 'bl'
let isComparingCropOriginal = false;

function openCropModal(side) {
  const imgData = state.images[side];
  const src = imgData ? (imgData.rawOriginalSrc || imgData.originalSrc) : null;
  if (!src) {
    showToast('Carga primero una foto para recortar.', 'warning');
    return;
  }
  activeCropSide = side;
  const title = $('cropModalTitle');
  if (title) title.textContent = 'Recorte Manual — ' + getSlotFriendlyName(side);

  const img = new Image();
  img.onload = function() {
    cropImage = img;
    isComparingCropOriginal = false;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (imgData.cropData && typeof imgData.cropData.width === 'number' && imgData.cropData.width > 10) {
      cropBox = Object.assign({}, imgData.cropData);
    } else {
      const mx = Math.round(w * 0.08);
      const my = Math.round(h * 0.08);
      cropBox = { x: mx, y: my, width: w - mx * 2, height: h - my * 2 };
    }
    openModal('cropModal');
    renderCropCanvas();
  };
  img.src = src;
}

function renderCropCanvas() {
  const canvas = $('canvasCropInteractive');
  if (!canvas || !cropImage) return;
  const maxW = 760;
  const maxH = 520;
  const scale = Math.min(maxW / cropImage.naturalWidth, maxH / cropImage.naturalHeight, 1.0);
  const w = Math.round(cropImage.naturalWidth * scale);
  const h = Math.round(cropImage.naturalHeight * scale);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(cropImage, 0, 0, w, h);

  // Si se está comparando contra el original, solo mostrar la imagen completa limpia
  if (isComparingCropOriginal) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('Mostrando imagen original completa (sin recorte)', 12, 24);
    ctx.restore();
    return;
  }

  const bx = cropBox.x * scale;
  const by = cropBox.y * scale;
  const bw = cropBox.width * scale;
  const bh = cropBox.height * scale;

  // Oscurecer exterior
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, w, h);

  // Hueco interior iluminado
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();

  // Borde y regla de tercios
  ctx.save();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);

  // Líneas de tercios
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx + bw / 3, by); ctx.lineTo(bx + bw / 3, by + bh);
  ctx.moveTo(bx + (bw * 2) / 3, by); ctx.lineTo(bx + (bw * 2) / 3, by + bh);
  ctx.moveTo(bx, by + bh / 3); ctx.lineTo(bx + bw, by + bh / 3);
  ctx.moveTo(bx, by + (bh * 2) / 3); ctx.lineTo(bx + bw, by + (bh * 2) / 3);
  ctx.stroke();

  // 4 Manijas de esquina
  const handles = [
    { x: bx, y: by },
    { x: bx + bw, y: by },
    { x: bx + bw, y: by + bh },
    { x: bx, y: by + bh }
  ];
  handles.forEach(function(pt) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pt.x - 6, pt.y - 6, 12, 12);
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.strokeRect(pt.x - 6, pt.y - 6, 12, 12);
  });
  ctx.restore();
}

function initCropCanvasEvents() {
  const canvas = $('canvasCropInteractive');
  if (!canvas) return;

  let dragStartX = 0, dragStartY = 0;
  let initialBox = null;

  function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const scale = canvas.width / (cropImage ? cropImage.naturalWidth : 1);
    return { cx, cy, scale };
  }

  function getHandleAt(cx, cy, scale) {
    const bx = cropBox.x * scale;
    const by = cropBox.y * scale;
    const bw = cropBox.width * scale;
    const bh = cropBox.height * scale;
    const d = 16;

    if (Math.hypot(cx - bx, cy - by) <= d) return 'tl';
    if (Math.hypot(cx - (bx + bw), cy - by) <= d) return 'tr';
    if (Math.hypot(cx - (bx + bw), cy - (by + bh)) <= d) return 'br';
    if (Math.hypot(cx - bx, cy - (by + bh)) <= d) return 'bl';
    if (cx >= bx && cx <= bx + bw && cy >= by && cy <= by + bh) return 'all';
    return null;
  }

  canvas.addEventListener('pointerdown', function(e) {
    if (!cropImage || isComparingCropOriginal) return;
    const { cx, cy, scale } = getCoords(e);
    cropDragHandle = getHandleAt(cx, cy, scale);
    if (cropDragHandle) {
      dragStartX = cx / scale;
      dragStartY = cy / scale;
      initialBox = Object.assign({}, cropBox);
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', function(e) {
    if (!cropImage || isComparingCropOriginal) return;
    const { cx, cy, scale } = getCoords(e);
    if (cropDragHandle && initialBox) {
      const curX = cx / scale;
      const curY = cy / scale;
      const dx = curX - dragStartX;
      const dy = curY - dragStartY;
      const imgW = cropImage.naturalWidth;
      const imgH = cropImage.naturalHeight;

      if (cropDragHandle === 'all') {
        cropBox.x = Math.max(0, Math.min(imgW - initialBox.width, initialBox.x + dx));
        cropBox.y = Math.max(0, Math.min(imgH - initialBox.height, initialBox.y + dy));
      } else if (cropDragHandle === 'tl') {
        const nx = Math.max(0, Math.min(initialBox.x + initialBox.width - 20, initialBox.x + dx));
        const ny = Math.max(0, Math.min(initialBox.y + initialBox.height - 20, initialBox.y + dy));
        cropBox.width = initialBox.width - (nx - initialBox.x);
        cropBox.height = initialBox.height - (ny - initialBox.y);
        cropBox.x = nx;
        cropBox.y = ny;
      } else if (cropDragHandle === 'br') {
        cropBox.width = Math.max(20, Math.min(imgW - initialBox.x, initialBox.width + dx));
        cropBox.height = Math.max(20, Math.min(imgH - initialBox.y, initialBox.height + dy));
      } else if (cropDragHandle === 'tr') {
        const ny = Math.max(0, Math.min(initialBox.y + initialBox.height - 20, initialBox.y + dy));
        cropBox.width = Math.max(20, Math.min(imgW - initialBox.x, initialBox.width + dx));
        cropBox.height = initialBox.height - (ny - initialBox.y);
        cropBox.y = ny;
      } else if (cropDragHandle === 'bl') {
        const nx = Math.max(0, Math.min(initialBox.x + initialBox.width - 20, initialBox.x + dx));
        cropBox.width = initialBox.width - (nx - initialBox.x);
        cropBox.height = Math.max(20, Math.min(imgH - initialBox.y, initialBox.height + dy));
        cropBox.x = nx;
      }
      renderCropCanvas();
    } else {
      const h = getHandleAt(cx, cy, scale);
      canvas.style.cursor = (h === 'all') ? 'move' : (h ? 'nwse-resize' : 'default');
    }
  });

  function stopCropDrag(e) {
    if (cropDragHandle) {
      cropDragHandle = null;
      initialBox = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch(err) {}
    }
  }

  canvas.addEventListener('pointerup', stopCropDrag);
  canvas.addEventListener('pointercancel', stopCropDrag);

  // Botón Comparar con original
  if ($('btnCropCompareOriginal')) {
    on($('btnCropCompareOriginal'), 'click', function() {
      isComparingCropOriginal = !isComparingCropOriginal;
      $('btnCropCompareOriginal').classList.toggle('bg-amber-200', isComparingCropOriginal);
      $('btnCropCompareOriginal').classList.toggle('dark:bg-amber-900', isComparingCropOriginal);
      renderCropCanvas();
    });
  }

  // Botón Restablecer
  if ($('btnCropResetBox')) {
    on($('btnCropResetBox'), 'click', function() {
      if (!cropImage) return;
      cropBox = { x: 0, y: 0, width: cropImage.naturalWidth, height: cropImage.naturalHeight };
      isComparingCropOriginal = false;
      renderCropCanvas();
      showToast('Recuadro de recorte restablecido al 100%.', 'info');
    });
  }

  // Botón Aplicar Recorte
  if ($('btnApplyCrop')) {
    on($('btnApplyCrop'), 'click', function() {
      if (!cropImage || !window.RealScanEditor) return;
      const side = activeCropSide;
      window.RealScanEditor.recordSnapshot(side, state.images[side]);

      const croppedUrl = window.RealScanEditor.cropImageRegion(cropImage, cropBox);
      if (croppedUrl) {
        state.images[side].croppedSrc = croppedUrl;
        state.images[side].originalSrc = croppedUrl;
        state.images[side].isCropApplied = true;
        state.images[side].cropData = Object.assign({}, cropBox);
        state.images[side].panX = 0;
        state.images[side].panY = 0;
        closeModal('cropModal');
        renderProcessedImage(side);
        showToast('✂️ Recorte aplicado con éxito.', 'success');
      } else {
        showToast('No se pudo aplicar el recorte.', 'warning');
      }
    });
  }
}

/* ============================================================
   SELECTOR DE PÁGINAS PDF CON MINIAUTURAS (M-24)
   ============================================================ */
let activePdfDoc = null;
let activePdfTargetSide = 'front';

async function openPdfPageSelector(pdfDoc, targetSide, onAssigned) {
  activePdfDoc = pdfDoc;
  activePdfTargetSide = targetSide || 'front';
  const grid = $('pdfThumbnailsGrid');
  const sub = $('pdfPageSelectorSubtitle');
  if (!grid || !pdfDoc) return;

  grid.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-slate-400">Generando miniaturas de las páginas del PDF...</div>';
  if (sub) sub.textContent = 'El archivo PDF contiene ' + pdfDoc.numPages + ' páginas. Asigna las que necesites.';
  openModal('pdfPageSelectorModal');

  grid.innerHTML = '';
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pageNum = i;
    const page = await pdfDoc.getPage(pageNum);
    const viewport = getSafePdfViewport(page, 0.6, 600);
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const card = document.createElement('div');
    card.className = 'p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex flex-col items-center gap-2 shadow-xs';

    const pLabel = document.createElement('span');
    pLabel.className = 'font-bold font-mono text-[11px] text-slate-700 dark:text-slate-300';
    pLabel.textContent = 'Página ' + pageNum;

    canvas.className = 'rounded border border-slate-200 dark:border-slate-700 max-h-[140px] w-auto shadow-xs';

    const btnGroup = document.createElement('div');
    btnGroup.className = 'flex flex-wrap items-center justify-center gap-1 w-full pt-1';

    const btnFront = document.createElement('button');
    btnFront.type = 'button';
    btnFront.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100';
    btnFront.textContent = 'Frente';
    btnFront.onclick = async function() {
      const fullPage = await pdfDoc.getPage(pageNum);
      const dataUrl = await renderPdfPageToDataUrl(fullPage);
      processRawDataUrl(dataUrl, 'front');
      if (!await waitForProcessingComplete()) return;
      if (onAssigned) onAssigned('front');
      closeModal('pdfPageSelectorModal');
      showToast('Página ' + pageNum + ' asignada al Frente.', 'success');
    };

    const btnBack = document.createElement('button');
    btnBack.type = 'button';
    btnBack.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100';
    btnBack.textContent = 'Reverso';
    btnBack.onclick = async function() {
      const fullPage = await pdfDoc.getPage(pageNum);
      const dataUrl = await renderPdfPageToDataUrl(fullPage);
      processRawDataUrl(dataUrl, 'back');
      if (!await waitForProcessingComplete()) return;
      if (onAssigned) onAssigned('back');
      closeModal('pdfPageSelectorModal');
      showToast('Página ' + pageNum + ' asignada al Reverso.', 'success');
    };

    btnGroup.appendChild(btnFront);
    btnGroup.appendChild(btnBack);
    if (state.activeCategory !== 'photos') for (const [side, count] of [['page3',3],['page4',4]]) {
      const button = document.createElement('button');button.type='button';button.className=btnFront.className;button.textContent='Página '+count;
      button.onclick=async function(){try{const full=await pdfDoc.getPage(pageNum);const data=await renderPdfPageToDataUrl(full);setDocumentPages(Math.max(state.documentPageCount||2,count));processRawDataUrl(data,side);if(!await waitForProcessingComplete())return;onAssigned?.(side);closeModal('pdfPageSelectorModal');showToast('Página '+pageNum+' asignada a Página '+count,'success');}catch(e){showToast('No se pudo cargar esta página.','error');}};btnGroup.appendChild(button);
    }

    card.appendChild(pLabel);
    card.appendChild(canvas);
    card.appendChild(btnGroup);
    grid.appendChild(card);
  }
}

/* ============================================================
   INTEGRACIÓN DE CÓDIGOS QR, RECEPCIÓN MÓVIL Y ENTREGA DIGITAL
   ============================================================ */
let receiveOpening = false;
let receiveOpenRevision = 0;
document.addEventListener('realscan:modal-closed', function(event) {
  if (event.detail.id === 'receiveFromPhoneModal') receiveOpenRevision++;
  if (event.detail.id === 'digitalDeliveryModal') deliveryDialogRevision++;
});
async function openReceiveFromPhoneModal(options) {
  if (receiveOpening || !window.RealScanQrSync) return false;
  receiveOpening = true;
  const revision = ++receiveOpenRevision, job = state._jobRevision || 0;
  const started = performance.now();
  const buttons = ['btnOpenReceiveModal','btnRenewReceiveSession'].map($).filter(Boolean);
  buttons.forEach(button => { button.disabled = true; });
  const status = $('receiveConnectionStatus');
  const canvas = $('canvasReceiveQr');
  const label = $('labelReceiveSessionId');
  const current = RealScanQrSync.getActiveReceiveSession();
  const reuse = !options?.renew && current && !['revoked','expired'].includes(current.status);
  if (status) status.textContent = reuse ? 'Recuperando el QR de esta sesión…' : 'Conectando… Puedes cerrar esta ventana sin bloquear tu trabajo.';
  if (label) label.textContent = 'Conectando…';
  if (canvas) canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
  ['btnCopyReceiveUrl','btnTestOpenReceiveUrl'].forEach(id => { if ($(id)) $(id).disabled = true; });
  openModal('receiveFromPhoneModal');
  window.RealScanDiagnostics?.record('receive.start');
  try {
    const session = reuse ? current : await RealScanQrSync.createReceiveSession();
    if (revision !== receiveOpenRevision || job !== (state._jobRevision || 0)) {
      if (!reuse) await RealScanQrSync.revokeReceiveSession();
      window.RealScanDiagnostics?.record('receive.cancelled');
      return false;
    }
    if (label) label.textContent = session.id;
    if (canvas) RealScanQrSync.renderQrToCanvas(session.url,canvas,5);
    if (status) status.textContent = 'Listo para recibir. Cierra esta ventana para continuar; puedes volver a abrir la misma sesión. Renovar cambia el QR.';
    ['btnCopyReceiveUrl','btnTestOpenReceiveUrl'].forEach(id => { if ($(id)) $(id).disabled = false; });
    updateQrInboxUI();
    window.RealScanDiagnostics?.record('receive.ready','info',{durationMs:performance.now()-started});
    return true;
  } catch (error) {
    window.RealScanDiagnostics?.record('receive.failed','error',{errorType:error.name,code:error.code});
    if (revision === receiveOpenRevision) {
      if (status) status.textContent = 'No se pudo conectar. Comprueba internet y pulsa Renovar QR para reintentar, o cierra para seguir trabajando.';
      if (label) label.textContent = 'Sin conexión';
      showToast(error.message || 'No se pudo abrir la recepción.','error');
    }
    return false;
  } finally { receiveOpening = false; buttons.forEach(button => { button.disabled = false; }); }
}

function updateQrInboxUI() {
  if (!window.RealScanQrSync) return;
  const files = window.RealScanQrSync.getInboxFiles();
  const listEl = $('qrInboxList');
  const countEl = $('inboxCountBadge');
  if (countEl) countEl.textContent = files.length;
  if (!listEl) return;

  if (files.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-center text-slate-400 py-6">Esperando que el cliente envíe archivos...</p>';
    return;
  }

  listEl.innerHTML = '';
  files.forEach(function(f) {
    const item = document.createElement('div');
    item.className = 'flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-2 text-xs';

    const assignedTag = f.assignedTo
      ? '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Asignado a ' + f.assignedTo.toUpperCase() + '</span>'
      : '<span class="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">Pendiente</span>';

    item.innerHTML = `
      <div class="flex items-center gap-2 truncate">
        <span class="text-xl">${f.type.includes('pdf') ? '📑' : '🖼️'}</span>
        <div class="truncate">
          <p class="qr-file-name font-bold text-slate-900 dark:text-white truncate"></p>
          <p class="text-[10px] text-slate-400 font-mono">${f.sizeKb} KB • ${f.receivedAt} • ${assignedTag}</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0 flex-wrap">
        <button type="button" data-assign-file="${f.id}" data-slot="front" class="px-2 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700">Frente</button>
        <button type="button" data-assign-file="${f.id}" data-slot="back" class="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-[11px] hover:bg-slate-300">Reverso</button>
        ${state.mixTwoPhotos ? `<button type="button" data-assign-file="${f.id}" data-slot="back" class="px-2 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700">Persona B</button>` : ''}
      </div>
    `;
    item.querySelector('.qr-file-name').textContent = f.name;
    listEl.appendChild(item);
  });

  listEl.querySelectorAll('[data-assign-file]').forEach(function(btn) {
    btn.onclick = function() {
      const fileId = this.getAttribute('data-assign-file');
      const targetSlot = this.getAttribute('data-slot');
      window.RealScanQrSync.assignFileToSlot(fileId, targetSlot);
    };
  });
}
window.updateQrInboxUI = updateQrInboxUI;

let deliveryDialogRevision = 0;
function openDigitalDeliveryModal() {
  if (!window.RealScanQrSync) return;
  deliveryDialogRevision++;
  const policy = getActiveSpec().digital;
  const formatSelect = $('selectDeliveryFormat');
  for(const option of formatSelect.options) option.disabled = !!policy && !policy.formats.includes(option.value);
  if(policy) {formatSelect.value='jpg';$('selectDeliveryMaxPx').value='600';}
  const resultBox = $('deliveryQrResultBox');
  if (resultBox) resultBox.classList.add('hidden');
  openModal('digitalDeliveryModal');
}

let deliveryGenerating = false;
async function handleGenerateDeliveryQr() {
  if (deliveryGenerating) return;
  deliveryGenerating = true;
  const button = $('btnGenerateDeliveryQr');
  if (button) button.disabled = true;
  const job = state._jobRevision || 0, dialogRevision = deliveryDialogRevision;
  window.RealScanDiagnostics?.record('delivery.start');
  try {
  if (!await waitForProcessingComplete(15000)) return;
  const format = $('selectDeliveryFormat')?.value || 'jpg';
  const maxPx = $('selectDeliveryMaxPx')?.value || '1920';
  if (!window.RealScanQrSync) return;
  const deliverPdf = $('checkDeliverPdfSheet') ? $('checkDeliverPdfSheet').checked : true;
  const deliverFront = $('checkDeliverFrontJpg') ? $('checkDeliverFrontJpg').checked : true;
  const deliverBack = $('checkDeliverBackJpg') ? $('checkDeliverBackJpg').checked : false;

  const files = [];

  for (const [side, selected] of [['front', deliverFront], ['back', deliverBack]]) {
    if (selected && state.images[side]?.processedDataUrl) files.push(await createDigitalFile(side, format, maxPx));
  }

  if (deliverPdf && typeof generatePdfDoc === 'function') {
    const preflight = runPreflightChecks();
    const fatal = preflight.issues.filter(x=>x.type==='error' && x.code!=='MISSING_SLOT');
    if(fatal.length) throw Error(fatal.map(x=>x.message).join(' '));
    const missing = preflight.issues.filter(x=>x.code==='MISSING_SLOT');
    if(missing.length && !confirm('Faltan caras para la hoja PDF. ¿Entregar solo las disponibles dejando vacíos los espacios faltantes?')) return;
    try {
      const doc = await generatePdfDoc(true);
      if (!doc) throw new Error('No se pudo generar la hoja solicitada.');
      if (doc) {
        const pdfDataUri = doc.output('datauristring');
        files.push({
          name: 'RealScan_Hoja_Impresion_' + Date.now() + '.pdf',
          type: 'application/pdf',
          dataUrl: 'data:application/pdf;base64,' + pdfDataUri.split(',')[1],
          size: Math.floor(pdfDataUri.split(',')[1].length * .75)
        });
      }
    } catch(e) {
      throw new Error('No se pudo preparar la hoja PDF. Reintenta o desmarca esa opción para entregar sólo las imágenes.');
    }
  }

  if (files.length === 0) {
    showToast('⚠️ No hay archivos procesados seleccionados para entregar.', 'warning');
    return;
  }


  if (job !== (state._jobRevision || 0) || dialogRevision !== deliveryDialogRevision || $('digitalDeliveryModal').classList.contains('hidden')) { window.RealScanDiagnostics?.record('delivery.cancelled'); return; }
  const session = await window.RealScanQrSync.createDeliverySession(files, { format: format, maxPx: maxPx });
  if (job !== (state._jobRevision || 0) || dialogRevision !== deliveryDialogRevision || $('digitalDeliveryModal').classList.contains('hidden')) { await RealScanQrSync.revokeDeliverySession(); window.RealScanDiagnostics?.record('delivery.cancelled'); return; }
  window.RealScanDiagnostics?.record('delivery.ready');
  const canvas = $('canvasDeliveryQr');
  if (canvas) {
    window.RealScanQrSync.renderQrToCanvas(session.url, canvas, 5);
  }

  const resultBox = $('deliveryQrResultBox');
  if (resultBox) resultBox.classList.remove('hidden');

  showToast('Entrega disponible durante 15 minutos mientras este puesto siga abierto.', 'success');
  } catch(e) { window.RealScanDiagnostics?.record('delivery.failed','error',{errorType:e.name,code:e.code}); showToast(e.message || 'No se pudo preparar la entrega.', 'error'); }
  finally { deliveryGenerating = false; if (button) button.disabled = false; }
}

function openFormatRequirementsModal() {
  const activeSpec = (typeof getActiveSpec === 'function') ? getActiveSpec() : (window.FORMAT_SPECS[state.format] || window.FORMAT_SPECS.card);
  const spec = Object.assign({}, window.FORMAT_SPECS[state.format] || {}, activeSpec);
  const nameEl = $('reqFormatName');
  const dimsEl = $('reqDimensionsMm');
  const sourceEl = $('reqOfficialSource');
  const dateEl = $('reqReviewDate');
  const physEl = $('reqPhysicalText');
  const digiEl = $('reqDigitalText');
  const restrEl = $('reqRestrictionsText');

  if (nameEl) nameEl.textContent = spec.name || spec.shortName;
  if (dimsEl) dimsEl.textContent = `${spec.widthMm.toFixed(2)} × ${spec.heightMm.toFixed(2)} mm`;
  if (sourceEl) {
    sourceEl.replaceChildren();
    if(spec.sourceUrl){const a=document.createElement('a');a.href=spec.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.className='underline';a.textContent=spec.officialSource;sourceEl.append(a);}
    else sourceEl.textContent='Plantilla orientativa; confirma con la institución';
  }
  if (dateEl) dateEl.textContent = spec.sourceUrl ? '14/10/2026; consulta la fuente vigente' : 'Sin verificación oficial';
  if (physEl) physEl.textContent = spec.reqsPhysical || 'Impresión al 100% de escala sin ajuste automático.';
  if (digiEl) digiEl.textContent = spec.reqsDigital || 'Resolución mínima 300 DPI nítida.';
  if (restrEl) restrEl.textContent = spec.editingRestrictions || 'No alterar rasgos anatómicos.';

  openModal('formatRequirementsModal');
}

function setPrintScale(scalePct) {
  scalePct = Math.max(25, Math.min(200, parseInt(scalePct, 10) || 100));
  state.outputScalePercent = scalePct;

  const warnEl = $('bannerScaleWarning');
  const lblEl = $('labelActiveScalePct');
  if (warnEl && lblEl) {
    if (scalePct === 100) {
      warnEl.classList.add('hidden');
    } else {
      lblEl.textContent = scalePct + '%';
      warnEl.classList.remove('hidden');
    }
  }

  savePreferences();
  updateUI();
  if (scalePct !== 100) {
    showToast('⚠️ Escala modificada al ' + scalePct + '%. Copia no calibrada a tamaño real.', 'warning');
  } else {
    showToast('Escala 1:1 Oficial restaurada al 100%.', 'info');
  }
}

function handleSlotUndo(side) {
  if (!window.RealScanEditor || !window.RealScanEditor.canUndo(side)) {
    showToast('No hay más cambios que deshacer en esta ranura.', 'info');
    return;
  }
  const prev = window.RealScanEditor.undo(side, state.images[side]);
  if (prev) {
    Object.assign(state.images[side], prev);
    renderProcessedImage(side);
    showToast('↩️ Última edición deshecha.', 'info');
  }
}

function handleSlotRedo(side) {
  if (!window.RealScanEditor || !window.RealScanEditor.canRedo(side)) {
    showToast('No hay cambios para rehacer.', 'info');
    return;
  }
  const next = window.RealScanEditor.redo(side, state.images[side]);
  if (next) {
    Object.assign(state.images[side], next);
    renderProcessedImage(side);
    showToast('↪️ Cambio rehecho.', 'info');
  }
}

function applyAdaptiveAutoLight(side) {
  if (getActiveSpec().noRetouch) {showToast('Este perfil requiere conservar el color y la apariencia originales.', 'warning');return;}
  const imgData = state.images[side];
  if (!imgData || !imgData.originalSrc || !window.RealScanEditor) {
    showToast('Carga primero una foto para compensar la iluminación.', 'warning');
    return;
  }
  const img = new Image();
  img.onload = function() {
    const analysis = window.RealScanEditor.computeAdaptiveLighting(img);
    window.RealScanEditor.recordSnapshot(side, imgData);
    imgData.brightness = analysis.brightness;
    imgData.contrast = analysis.contrast;
    renderProcessedImage(side);
    showToast('🪄 ' + analysis.advice, 'success');
  };
  img.src = imgData.originalSrc;
}

function handleSlotSwap(sideA, sideB) {
  const dataA = state.images[sideA];
  const dataB = state.images[sideB];
  if (!dataA || !dataB) return;
  if (!dataA.originalSrc && !dataB.originalSrc) {
    showToast('Ambas ranuras están vacías.', 'warning');
    return;
  }
  if (window.RealScanEditor) {
    window.RealScanEditor.recordSnapshot(sideA, dataA);
    window.RealScanEditor.recordSnapshot(sideB, dataB);
    window.RealScanEditor.swapSlotData(dataA, dataB);
  }
  renderProcessedImage(sideA);
  renderProcessedImage(sideB);
  showToast('⇄ ' + getSlotFriendlyName(sideA) + ' intercambiado con ' + getSlotFriendlyName(sideB), 'success');
}

/* ============================================================
   CATEGORÍAS / MODOS / FORMATOS
   ============================================================ */
function switchCategory(cat) {
  state.activeCategory = cat;

  $$('.cat-tab').forEach(function(t) {
    const active = t.getAttribute('data-cat') === cat;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  const catDocs = $('containerCatDocs');
  const catPhotos = $('containerCatPhotos');
  const catCustom = $('containerCatCustom');
  if (catDocs) catDocs.classList.toggle('hidden', cat !== 'docs');
  if (catPhotos) catPhotos.classList.toggle('hidden', cat !== 'photos');
  if (catCustom) catCustom.classList.toggle('hidden', cat !== 'custom');

  const step1DocsMode = $('step1DocsMode');
  const step1PhotosMode = $('step1PhotosMode');
  const step1Title = $('step1Title');
  const step1Subtitle = $('step1Subtitle');
  const slot1Title = $('slot1Title');
  const cardBackContainer = $('cardBackContainer');
  const slot2Title = $('slot2Title');

  if (cat === 'docs') {
    if (step1Title) step1Title.textContent = '¿Cómo deseas imprimir en la hoja A4?';
    if (step1Subtitle) step1Subtitle.textContent = 'Configuración de hoja';
    if (step1DocsMode) step1DocsMode.classList.remove('hidden');
    if (step1PhotosMode) step1PhotosMode.classList.add('hidden');
    if (slot1Title) slot1Title.textContent = '1. Frente (Delantera con Foto)';
    if (slot2Title) slot2Title.textContent = '2. Reverso (Atrás / Vuelta)';
    if (cardBackContainer) cardBackContainer.classList.toggle('hidden', state.printMode !== 'both');
    if (!FORMAT_SPECS[state.format] || FORMAT_SPECS[state.format].category !== 'docs') selectFormat('card');
  } else if (cat === 'photos') {
    if (step1Title) step1Title.textContent = 'Planilla de Fotos en Hoja A4';
    if (step1Subtitle) step1Subtitle.textContent = 'Copias por hoja';
    if (step1DocsMode) step1DocsMode.classList.add('hidden');
    if (step1PhotosMode) step1PhotosMode.classList.remove('hidden');
    if (slot1Title) slot1Title.textContent = state.mixTwoPhotos ? 'Foto 1 (Persona A / Trámite 1)' : 'Foto Oficial (Rostro / Credencial)';
    if (slot2Title) slot2Title.textContent = 'Foto 2 (Persona B / Trámite 2)';
    if (cardBackContainer) cardBackContainer.classList.toggle('hidden', !state.mixTwoPhotos);
    if (!FORMAT_SPECS[state.format] || FORMAT_SPECS[state.format].category !== 'photos') selectFormat('photo_infantil');
    updatePhotoGridStats();
  } else if (cat === 'custom') {
    if (step1Title) step1Title.textContent = 'Modo de Impresión A4';
    if (step1Subtitle) step1Subtitle.textContent = 'Escala 1:1 real';
    if (step1DocsMode) step1DocsMode.classList.remove('hidden');
    if (step1PhotosMode) step1PhotosMode.classList.add('hidden');
    if (slot1Title) slot1Title.textContent = 'Documento / Foto (Frente)';
    if (slot2Title) slot2Title.textContent = 'Reverso (Atrás / Vuelta)';
    if (cardBackContainer) cardBackContainer.classList.toggle('hidden', state.printMode !== 'both');
    state.format = 'custom';
    handleCustomInput();
  }
  savePreferences();
  updateUI();
}

function setMixTwoPhotos(val) {
  state.mixTwoPhotos = !!val;
  const cardBackContainer = $('cardBackContainer');
  const slot1Title = $('slot1Title');
  const slot2Title = $('slot2Title');
  const mixContainer = $('containerMixIndependentCopies');

  if (state.mixTwoPhotos) {
    if (typeof state.photoCopiesPersonA !== 'number' || typeof state.photoCopiesPersonB !== 'number') {
      state.photoCopiesPersonA = Math.ceil(state.photoCopies / 2);
      state.photoCopiesPersonB = Math.floor(state.photoCopies / 2);
    }
  }

  if (mixContainer) {
    mixContainer.classList.toggle('hidden', !state.mixTwoPhotos);
  }
  updateMixTwoPhotosUI();

  if (state.activeCategory === 'photos') {
    if (cardBackContainer) cardBackContainer.classList.toggle('hidden', !state.mixTwoPhotos);
    if (slot1Title) slot1Title.textContent = state.mixTwoPhotos ? 'Foto 1 (Persona A / Trámite 1)' : 'Foto Oficial (Rostro / Credencial)';
    if (slot2Title) slot2Title.textContent = 'Foto 2 (Persona B / Trámite 2)';
  }
  updatePhotoGridStats();
  updateUI();
  savePreferences();
  showToast(state.mixTwoPhotos ? ('👥 Modo 2 Fotos activado: ' + state.photoCopiesPersonA + ' Persona A + ' + state.photoCopiesPersonB + ' Persona B') : 'Modo 1 Foto activado', 'info');
}

function updateMixTwoPhotosUI() {
  const inpA = $('inputCopiesPersonA');
  const inpB = $('inputCopiesPersonB');
  const tagA = $('tagCopiesPersonA');
  const tagB = $('tagCopiesPersonB');
  const ratioTag = $('labelMixBadgeRatio');

  if (inpA && typeof state.photoCopiesPersonA === 'number') inpA.value = state.photoCopiesPersonA;
  if (inpB && typeof state.photoCopiesPersonB === 'number') inpB.value = state.photoCopiesPersonB;
  if (tagA && typeof state.photoCopiesPersonA === 'number') tagA.textContent = state.photoCopiesPersonA;
  if (tagB && typeof state.photoCopiesPersonB === 'number') tagB.textContent = state.photoCopiesPersonB;

  if (ratioTag && state.mixTwoPhotos) {
    ratioTag.textContent = (state.photoCopiesPersonA || 0) + 'A + ' + (state.photoCopiesPersonB || 0) + 'B';
  }
}

function setIndependentPhotoCopies(person, val) {
  val = Math.max(0, parseInt(val, 10) || 0);
  if (person === 'A') {
    state.photoCopiesPersonA = val;
  } else {
    state.photoCopiesPersonB = val;
  }
  const total = (state.photoCopiesPersonA || 0) + (state.photoCopiesPersonB || 0);
  state.photoCopies = Math.max(1, total);
  const mainInput = $('inputPhotoCopies');
  if (mainInput) mainInput.value = state.photoCopies;

  updateMixTwoPhotosUI();
  updatePhotoGridStats();
  updateUI();
  savePreferences();
}

function getPhotoLayoutInfo(targetW, targetH, copies) {
  const paper = (typeof getActivePaperSpec === 'function') ? getActivePaperSpec() : { widthMm: 210, heightMm: 297, shortName: 'A4' };
  
  // Margen horizontal de seguridad: 12 mm a cada lado
  const availW = paper.widthMm - 24;
  // Margen vertical: espacio para encabezado (20 mm) y regla al pie si está activa (38 mm) o margen inferior (14 mm)
  const footerH = (state.includeRulerFooter !== false) ? 38 : 14;
  const availH = paper.heightMm - 20 - footerH;

  const gap = targetW < 30 ? 3.5 : (targetW < 55 ? 4.5 : 6.0);

  const maxCols = Math.max(1, Math.floor((availW + gap) / (targetW + gap)));
  const maxRows = Math.max(1, Math.floor((availH + gap) / (targetH + gap)));
  const maxPerPage = Math.max(1, maxCols * maxRows);

  let cols = maxCols;
  if (copies === 1) cols = 1;
  else if (copies === 2) cols = Math.min(2, maxCols);
  else if (copies <= 4) cols = Math.min(2, maxCols);
  else if (copies <= 6) cols = Math.min(3, maxCols);
  else if (copies <= 8) cols = Math.min(4, maxCols);
  else cols = maxCols;

  const rows = Math.ceil(copies / cols);
  const pages = Math.ceil(copies / maxPerPage);

  return {
    gap: gap,
    maxCols: maxCols,
    maxRows: maxRows,
    maxPerPage: maxPerPage,
    cols: cols,
    rows: rows,
    pages: pages,
    paper: paper
  };
}

function updatePhotoPresetButtons(maxPerPage) {
  const presetButtons = $$('.photo-copies-btn');
  if (!presetButtons.length) return;

  // Lotes inteligentes adaptados estrictamente a la capacidad física de la hoja
  let presets = [4, 8, 12, 18, 24, 36];
  if (maxPerPage <= 4) {
    presets = [1, 2, 3, 4, 4, 4];
  } else if (maxPerPage <= 6) {
    presets = [1, 2, 3, 4, 5, 6];
  } else if (maxPerPage <= 8) {
    presets = [2, 4, 6, 8, 8, 8];
  } else if (maxPerPage <= 12) {
    presets = [2, 4, 6, 8, 10, 12];
  } else if (maxPerPage <= 24) {
    presets = [4, 8, 12, 16, 20, 24];
  }

  presetButtons.forEach(function(btn, idx) {
    const val = presets[idx] || presets[presets.length - 1];
    btn.setAttribute('data-copies', val);
    const pTitle = btn.querySelector('.title-main');
    if (pTitle) pTitle.textContent = val + ' ' + (val === 1 ? 'Foto' : 'Fotos');
    const pSub = btn.querySelector('p:last-child');
    if (pSub) {
      if (val === maxPerPage) pSub.textContent = 'Hoja Llena';
      else if (val === 1) pSub.textContent = 'Individual';
      else pSub.textContent = 'Lote ' + val;
    }
    // Deshabilitar botones redundantes si la capacidad de la hoja es pequeña
    const isRedundant = (idx > 0 && presets[idx] === presets[idx - 1] && val === maxPerPage);
    btn.classList.toggle('hidden', isRedundant);
    btn.classList.toggle('is-active', parseInt(btn.getAttribute('data-copies'), 10) === state.photoCopies);
  });
}

function updatePhotoGridStats() {
  const spec = getActiveSpec();
  const info = getPhotoLayoutInfo(spec.widthMm, spec.heightMm, state.photoCopies);
  const paper = info.paper || { shortName: 'A4', name: 'A4' };
  const maxSupportedPages = 2;
  const totalAllowed = info.maxPerPage * maxSupportedPages;

  if (state.photoCopies > totalAllowed) {
    state.photoCopies = totalAllowed;
  }

  const badgeMax = $('badgeMaxPhotosFit');
  if (badgeMax) {
    if (state.photoCopies > info.maxPerPage) {
      const pagesNeeded = Math.ceil(state.photoCopies / info.maxPerPage);
      badgeMax.textContent = state.photoCopies + ' fotos paginadas en ' + pagesNeeded + ' hojas ' + paper.shortName;
    } else {
      badgeMax.textContent = 'Caben ' + info.maxPerPage + ' en 1 hoja ' + paper.shortName;
    }
  }

  const badgeFill = $('badgeFillA4Count');
  if (badgeFill) {
    badgeFill.textContent = info.maxPerPage + ' fotos (' + paper.shortName + ')';
  }

  updatePhotoPresetButtons(info.maxPerPage);

  const inputCopies = $('inputPhotoCopies');
  if (inputCopies) {
    inputCopies.max = totalAllowed;
    inputCopies.value = state.photoCopies;
  }

  const labelEff = $('labelPhotoEfficiency');
  if (labelEff) {
    const pagesNeeded = Math.ceil(state.photoCopies / info.maxPerPage);
    if (pagesNeeded > 1) {
      labelEff.textContent = 'Distribución 1:1: ' + state.photoCopies + ' fotos en ' + pagesNeeded + ' hojas (' + info.cols + ' cols por hoja)';
    } else {
      labelEff.textContent = 'Distribución 1:1: ' + info.cols + ' cols × ' + Math.ceil(state.photoCopies / info.cols) + ' filas • ' + state.photoCopies + '/' + info.maxPerPage + ' en ' + paper.shortName;
    }
  }
}

function setPhotoCopies(num) {
  const spec = getActiveSpec();
  const info = getPhotoLayoutInfo(spec.widthMm, spec.heightMm, 1);
  const maxSupportedPages = 2;
  const totalAllowed = info.maxPerPage * maxSupportedPages;
  const paper = info.paper || { shortName: 'A4' };

  const parsed = parseInt(num, 10) || 1;
  if (parsed > totalAllowed) {
    showToast('⚠️ Cantidad máxima admitida: ' + totalAllowed + ' fotos en ' + maxSupportedPages + ' hojas ' + paper.shortName + '.', 'warning');
  }

  const clamped = Math.max(1, Math.min(totalAllowed, parsed));
  state.photoCopies = clamped;

  const inputCopies = $('inputPhotoCopies');
  if (inputCopies) inputCopies.value = clamped;

  $$('.photo-copies-btn').forEach(function(btn) {
    const active = parseInt(btn.getAttribute('data-copies'), 10) === clamped;
    btn.classList.toggle('is-active', active);
  });

  updatePhotoGridStats();
  updateUI();
  savePreferences();
}

function setDocumentPages(count) {
  const c = Math.max(1, Math.min(4, parseInt(count, 10) || 1));
  state.documentPageCount = c;
  if (c === 1) {
    state.printMode = 'single';
    state.sheetLayout = 'same_page';
  } else if (c === 2) {
    if (state.printMode !== 'both_separate') {
      state.printMode = 'both';
      state.sheetLayout = 'same_page';
    }
  } else {
    state.printMode = 'multi';
    state.sheetLayout = 'auto';
  }

  // Sincronizar botones de modo en Paso 1
  $$('.mode-btn').forEach(function(btn) {
    const m = btn.getAttribute('data-mode');
    btn.classList.toggle('is-active', m === state.printMode);
  });

  // Mostrar / ocultar ranuras en Paso 3
  const cardBack = $('cardBackContainer');
  const cardPage3 = $('cardPage3Container');
  const cardPage4 = $('cardPage4Container');

  if (state.activeCategory !== 'photos') {
    if (cardBack) cardBack.classList.toggle('hidden', c < 2);
    if (cardPage3) cardPage3.classList.toggle('hidden', c < 3);
    if (cardPage4) cardPage4.classList.toggle('hidden', c < 4);
  }

  // Mostrar / ocultar ranuras en el lienzo de vista previa A4 (Paso 4)
  const canvasBack = $('canvasDocBack');
  const canvasPage3 = $('canvasDocPage3');
  const canvasPage4 = $('canvasDocPage4');

  if (state.activeCategory !== 'photos') {
    if (canvasBack) canvasBack.classList.toggle('hidden', c < 2);
    if (canvasPage3) canvasPage3.classList.toggle('hidden', c < 3);
    if (canvasPage4) canvasPage4.classList.toggle('hidden', c < 4);
  }

  // Botón añadir más páginas: ocultar si ya hay 4
  const btnAdd = $('btnAddDocumentPage');
  const labelAdd = $('labelAddDocumentPage');
  if (btnAdd) {
    btnAdd.classList.toggle('hidden', c >= 4 || state.activeCategory === 'photos');
  }
  if (labelAdd) {
    if (c === 1) labelAdd.textContent = '➕ Añadir Reverso / Página 2';
    else if (c === 2) labelAdd.textContent = (state.format === 'passport') ? '➕ Añadir Página 3 (Visa o Sello)' : '➕ Añadir Página 3';
    else if (c === 3) labelAdd.textContent = (state.format === 'passport') ? '➕ Añadir Página 4 (Visa o Sello)' : '➕ Añadir Página 4';
  }

  updateSlotLabels();
  updateUI();
  savePreferences();
}

function updateSlotLabels() {
  const slot1 = $('slot1Title'), slot2 = $('slot2Title'), slot3 = $('slot3Title'), slot4 = $('slot4Title');
  const fmt = state.format;

  if (fmt === 'business_card') {
    if (slot1) slot1.textContent = 'Cara Frontal (Logo, Contacto y Nombre)';
    if (slot2) slot2.textContent = 'Cara Posterior (QR, Redes, Servicios o Mapa)';
    if (slot3) slot3.textContent = 'Tarjeta 2 (Frente)';
    if (slot4) slot4.textContent = 'Tarjeta 2 (Reverso)';
  } else if (fmt === 'passport') {
    if (slot1) slot1.textContent = 'Página 1 (Datos Biográficos y Fotografía)';
    if (slot2) slot2.textContent = 'Página 2 (Visa, Firma o Sellos)';
    if (slot3) slot3.textContent = 'Página 3 (Visa o Sello Adicional)';
    if (slot4) slot4.textContent = 'Página 4 (Visa o Sello Adicional)';
  } else if (fmt === 'card') {
    if (slot1) slot1.textContent = '1. Frente (Delantera con Foto)';
    if (slot2) slot2.textContent = '2. Reverso (Atrás / Vuelta)';
    if (slot3) slot3.textContent = 'Documento 2: Frente';
    if (slot4) slot4.textContent = 'Documento 2: Reverso';
  } else {
    if (slot1) slot1.textContent = 'Página 1 (Frente)';
    if (slot2) slot2.textContent = 'Página 2 (Reverso)';
    if (slot3) slot3.textContent = 'Página 3 (Adicional)';
    if (slot4) slot4.textContent = 'Página 4 (Adicional)';
  }

  // Nota explicativa en Paso 1
  const noteText = $('docsModeNoteText');
  if (noteText) {
    if (fmt === 'business_card') {
      noteText.innerHTML = '💡 <strong>Tarjetas de Visita:</strong> Elige <strong>"2 Caras en 1 Hoja"</strong> para imprimir Frente y Reverso con QR alineados juntos en la misma hoja A4 a tamaño real 1:1.';
    } else if (fmt === 'passport') {
      noteText.innerHTML = '💡 <strong>Pasaporte:</strong> Puedes imprimir la página de datos (1 Cara) o seleccionar <strong>"3 o 4 Páginas"</strong> para incluir visas y sellos consulares.';
    } else if (fmt === 'passport_open') {
      noteText.innerHTML = '💡 <strong>Pasaporte Abierto:</strong> La libreta abierta ocupa la hoja A4 completa en 1 sola toma.';
    } else {
      noteText.innerHTML = '💡 <strong>DNI / INE / Documentos:</strong> Elige <strong>"2 Caras en 1 Hoja"</strong> para tener Anverso y Reverso juntos en la misma hoja (ahorro de papel y trámites bancarios), o <strong>"2 Caras Separadas"</strong> para imprimir una cara por hoja.';
    }
  }
}

function setPrintMode(mode) {
  if (mode === 'single') {
    state.sheetLayout = 'same_page';
    setDocumentPages(1);
    showToast('📄 Modo 1 Cara activado (Solo Anverso)', 'info');
  } else if (mode === 'both') {
    state.printMode = 'both';
    state.sheetLayout = 'same_page';
    setDocumentPages(2);
    showToast('📋 Modo 2 Caras en 1 Hoja A4 activado (Anverso y Reverso juntos)', 'info');
  } else if (mode === 'both_separate') {
    state.printMode = 'both_separate';
    state.sheetLayout = 'separate_sheets';
    setDocumentPages(2);
    showToast('📑 Modo 2 Caras Separadas activado (Hoja 1: Frente, Hoja 2: Reverso)', 'info');
  } else if (mode === 'multi') {
    state.sheetLayout = 'auto';
    setDocumentPages(Math.max(3, state.documentPageCount || 3));
    showToast('📚 Modo 3 o 4 Páginas activado', 'info');
  }
}

function selectFormat(formatKey) {
  state.format = formatKey;
  $$('.format-btn').forEach(function(btn) {
    const active = btn.getAttribute('data-format') === formatKey;
    btn.classList.toggle('is-active', active);
  });

  // Adaptación automática según formato
  if (formatKey === 'business_card') {
    setDocumentPages(2);
  } else if (formatKey === 'passport_open') {
    setDocumentPages(1);
  } else {
    updateSlotLabels();
  }

  updatePassportOptionsUI();

  const msg = {
    business_card: 'Tarjetas de Visita / Presentación seleccionadas (2 Caras activas).',
    passport_open: 'Pasaporte ABIERTO seleccionado (' + (state.passportOpenOrientation === 'landscape' ? '17.6 × 12.5 cm' : '12.5 × 17.6 cm') + '). Modo 1 Cara activo.',
    passport: 'Pasaporte (Páginas individuales / Visas) seleccionado (' + (state.passportPageOrientation === 'portrait' ? '8.8 × 12.5 cm' : '12.5 × 8.8 cm') + ').',
    photo_infantil: 'Foto Infantil seleccionada (2.5 × 3.0 cm).',
    photo_carnet: 'Foto Carnet / DNI seleccionada (2.6 × 3.2 cm).',
    photo_passport: 'Foto Pasaporte OACI seleccionada (3.5 × 4.5 cm).',
    photo_visa_usa: 'Foto Visa USA 2"×2" seleccionada (5.1 × 5.1 cm).',
    photo_titulo: 'Foto Título seleccionada (6.0 × 9.0 cm). Caben 4 fotos a escala 1:1 real en 1 hoja.',
    photo_ovalo_titulo: 'Foto Óvalo Título Grande seleccionada (6.0 × 9.0 cm). Caben 4 fotos a escala 1:1 real en 1 hoja.',
    photo_ovalo_mignon: 'Foto Óvalo Mignon seleccionada (5.0 × 7.0 cm). Caben 6 fotos a escala 1:1 real en 1 hoja.',
    photo_ovalo_credencial: 'Foto Óvalo Credencial seleccionada (3.5 × 5.0 cm). Caben hasta 12 fotos a escala 1:1 real.'
  }[formatKey];
  if (msg) showToast(msg, 'info');

  if (state.activeCategory === 'photos') {
    const spec = getActiveSpec();
    const info = getPhotoLayoutInfo(spec.widthMm, spec.heightMm, state.photoCopies);
    const totalAllowed = info.maxPerPage * 2;
    if (state.photoCopies > totalAllowed) {
      state.photoCopies = totalAllowed;
    }
    updatePhotoGridStats();
  }

  ['front', 'back', 'page3', 'page4'].forEach(function(s) {
    if (state.images[s].originalSrc && typeof renderProcessedImage === 'function') renderProcessedImage(s);
  });
  updateUI();
}

function setPassportOrientation(type, orientation) {
  if (type === 'open') {
    state.passportOpenOrientation = orientation;
  } else {
    state.passportPageOrientation = orientation;
  }
  updatePassportOptionsUI();
  if (state.images.front.originalSrc && typeof renderProcessedImage === 'function') renderProcessedImage('front');
  if (state.images.back.originalSrc && typeof renderProcessedImage === 'function') renderProcessedImage('back');
  updateUI();
  savePreferences();
  const spec = getActiveSpec();
  showToast('Orientación cambiada: ' + spec.shortName, 'info');
}

function updatePassportOptionsUI() {
  const container = $('containerPassportOptions');
  if (!container) return;

  const isPassOpen = state.format === 'passport_open';
  const isPassPage = state.format === 'passport';

  if (!isPassOpen && !isPassPage) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  const groupOpen = $('optPassportOpenGroup');
  const groupPage = $('optPassportPageGroup');
  const subLabel = $('passportOptionsSubLabel');
  const note = $('passportOptionsNote');
  const badgeOpenDim = $('badgePassportOpenDim');
  const badgePageDim = $('badgePassportPageDim');

  if (isPassOpen) {
    if (groupOpen) groupOpen.classList.remove('hidden');
    if (groupPage) groupPage.classList.add('hidden');
    const isLand = state.passportOpenOrientation === 'landscape';
    if (subLabel) subLabel.textContent = isLand ? '17.6 × 12.5 cm (Horizontal)' : '12.5 × 17.6 cm (Vertical)';
    if (note) note.textContent = '💡 La libreta abierta incluye ambas páginas en 1 sola toma. Se imprime en 1 cara a escala 1:1 real.';
    if (badgeOpenDim) badgeOpenDim.textContent = isLand ? '17.6 × 12.5 cm (176 × 125 mm)' : '12.5 × 17.6 cm (125 × 176 mm)';

    const btnPort = $('btnPassOpenPortrait');
    const btnLand = $('btnPassOpenLandscape');
    if (btnPort) btnPort.classList.toggle('is-active', !isLand);
    if (btnLand) btnLand.classList.toggle('is-active', isLand);
  } else if (isPassPage) {
    if (groupOpen) groupOpen.classList.add('hidden');
    if (groupPage) groupPage.classList.remove('hidden');
    const isPort = state.passportPageOrientation === 'portrait';
    if (subLabel) subLabel.textContent = isPort ? '8.8 × 12.5 cm (Vertical)' : '12.5 × 8.8 cm (Horizontal)';
    if (note) note.textContent = '💡 Puedes imprimir solo la página de datos (' + (state.printMode === 'both' ? 'cambia a Solo 1 Cara' : 'Solo 1 Cara activo') + ') o añadir visa/portada en Anverso + Reverso.';
    if (badgePageDim) badgePageDim.textContent = isPort ? '8.8 × 12.5 cm (88 × 125 mm)' : '12.5 × 8.8 cm (125 × 88 mm)';

    const btnLand = $('btnPassPageLandscape');
    const btnPort = $('btnPassPagePortrait');
    if (btnLand) btnLand.classList.toggle('is-active', !isPort);
    if (btnPort) btnPort.classList.toggle('is-active', isPort);
  }
}

/* ============================================================
   MEDIDA PERSONALIZADA
   ============================================================ */
function setCustomUnit(unit) {
  if (state.customUnit === unit) return;
  const oldUnit = state.customUnit;
  state.customUnit = unit;

  const btnCm = $('btnUnitCm'), btnMm = $('btnUnitMm');
  if (btnCm && btnMm) {
    btnCm.classList.toggle('is-active', unit === 'cm');
    btnMm.classList.toggle('is-active', unit === 'mm');
    btnCm.setAttribute('aria-pressed', unit === 'cm' ? 'true' : 'false');
    btnMm.setAttribute('aria-pressed', unit === 'mm' ? 'true' : 'false');
  }

  const labelW = $('labelUnitW'), labelH = $('labelUnitH');
  const inputW = $('inputCustomWidth'), inputH = $('inputCustomHeight');

  if (unit === 'cm') {
    if (labelW && labelH) { labelW.textContent = 'cm'; labelH.textContent = 'cm'; }
    if (oldUnit === 'mm') {
      state.customWidth = parseFloat((state.customWidth / 10).toFixed(2));
      state.customHeight = parseFloat((state.customHeight / 10).toFixed(2));
    }
    if (inputW) { inputW.step = '0.1'; inputW.max = '28'; }
    if (inputH) { inputH.step = '0.1'; inputH.max = '28'; }
  } else {
    if (labelW && labelH) { labelW.textContent = 'mm'; labelH.textContent = 'mm'; }
    if (oldUnit === 'cm') {
      state.customWidth = Math.round(state.customWidth * 10);
      state.customHeight = Math.round(state.customHeight * 10);
    }
    if (inputW) { inputW.step = '1'; inputW.max = '280'; }
    if (inputH) { inputH.step = '1'; inputH.max = '280'; }
  }
  if (inputW) inputW.value = state.customWidth;
  if (inputH) inputH.value = state.customHeight;
  handleCustomInput();
}

function stepCustomDim(dim, dir) {
  const step = (state.customUnit === 'cm') ? 0.5 : 5;
  const input = $(dim === 'w' ? 'inputCustomWidth' : 'inputCustomHeight');
  if (!input) return;
  let v = parseFloat(input.value) || 0;
  v = Math.max(1, parseFloat((v + dir * step).toFixed(1)));
  input.value = v;
  handleCustomInput();
}

function handleCustomInput() {
  const inputW = $('inputCustomWidth'), inputH = $('inputCustomHeight');
  let w = parseFloat(inputW ? inputW.value : state.customWidth) || 1;
  let h = parseFloat(inputH ? inputH.value : state.customHeight) || 1;
  state.customWidth = w;
  state.customHeight = h;

  const wMm = (state.customUnit === 'cm') ? Math.round(w * 10) : Math.round(w);
  const hMm = (state.customUnit === 'cm') ? Math.round(h * 10) : Math.round(h);
  const wCm = (state.customUnit === 'cm') ? w : parseFloat((w / 10).toFixed(1));
  const hCm = (state.customUnit === 'cm') ? h : parseFloat((h / 10).toFixed(1));

  const summary = $('customSummaryTag');
  if (summary) summary.textContent = wMm + ' × ' + hMm + ' mm (' + wCm + ' × ' + hCm + ' cm)';

  if (state.images.front.originalSrc && typeof renderProcessedImage === 'function') renderProcessedImage('front');
  if (state.images.back.originalSrc && typeof renderProcessedImage === 'function') renderProcessedImage('back');
  updateUI();
}

function setCustomPreset(w, h, unit) {
  setCustomUnit(unit);
  state.customWidth = w;
  state.customHeight = h;
  if ($('inputCustomWidth')) $('inputCustomWidth').value = w;
  if ($('inputCustomHeight')) $('inputCustomHeight').value = h;
  handleCustomInput();
  showToast('Medida aplicada: ' + w + ' × ' + h + ' ' + unit, 'success');
}

/* ============================================================
   UI: ANOTACIONES, ENCABEZADOS Y REGLA EN VISTA PREVIA
   ============================================================ */
function updatePreviewAnnotations() {
  const spec = getActiveSpec();
  const ruler = $('footerCalibrationRuler');
  const badgeRuler = $('badgeRulerStatus');
  const badgeLabels = $('badgeDocLabelsStatus');
  const badgeTitle = $('badgeDocTitleState');
  const isRuler = state.includeRulerFooter !== false;
  const isLabels = state.includeDocLabels !== false;

  // 1. Sincronizar Regla
  if (ruler) {
    ruler.classList.toggle('hidden', !isRuler);
  }
  if (badgeRuler) {
    badgeRuler.textContent = isRuler ? 'Visible' : 'Oculta';
    badgeRuler.className = isRuler 
      ? 'text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded shrink-0'
      : 'text-[9.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded shrink-0';
  }

  // 2. Sincronizar Checkboxes
  const chkRuler = $('chkIncludeRulerFooter');
  if (chkRuler && chkRuler.checked !== isRuler) chkRuler.checked = isRuler;

  const chkLabels = $('chkIncludeDocLabels');
  if (chkLabels && chkLabels.checked !== isLabels) chkLabels.checked = isLabels;

  const isCutMarks = (state.includeCutMarks !== false);
  const chkCutMarks = $('chkIncludeCutMarks');
  if (chkCutMarks && chkCutMarks.checked !== isCutMarks) chkCutMarks.checked = isCutMarks;

  const badgeCutMarks = $('badgeCutMarksStatus');
  if (badgeCutMarks) {
    badgeCutMarks.textContent = isCutMarks ? 'Visible' : 'Ocultas';
    badgeCutMarks.className = isCutMarks 
      ? 'text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded shrink-0'
      : 'text-[9.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded shrink-0';
  }

  if (badgeLabels) {
    badgeLabels.textContent = isLabels ? 'Visible' : 'Oculto';
    badgeLabels.className = isLabels 
      ? 'text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded shrink-0'
      : 'text-[9.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded shrink-0';
  }

  // 3. Título personalizado
  const hasCustomTitle = Boolean((state.documentCustomTitle || '').trim());
  const chkTitle = $('chkEnableDocTitle');
  const containerTitle = $('containerDocTitleInput');
  if (chkTitle && chkTitle.checked !== hasCustomTitle) chkTitle.checked = hasCustomTitle;
  if (containerTitle) containerTitle.classList.toggle('hidden', !hasCustomTitle);
  if (badgeTitle) {
    badgeTitle.textContent = hasCustomTitle ? 'Activado' : 'Opcional';
    badgeTitle.className = hasCustomTitle ? 'text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono' : 'text-[10px] font-semibold text-slate-400 font-mono';
  }

  // 4. Header de la hoja
  const sheetTitle = $('previewSheetTitle');
  if (sheetTitle) {
    if (!isLabels && !isRuler && !isCutMarks) {
      sheetTitle.innerHTML = '<span class="text-amber-600 dark:text-amber-400 font-bold">🏛️ Hoja 100% Limpia</span> <span class="text-slate-400 font-normal text-[7.5px]">(Trámite Oficial)</span>';
    } else if (hasCustomTitle) {
      sheetTitle.textContent = state.documentCustomTitle;
    } else {
      sheetTitle.textContent = (state.activeCategory === 'photos') ? 'Planilla de Fotos Oficiales' : (spec.shortName + ' — Escala 1:1 Real');
    }
  }

  // 5. Encabezados de ranuras individuales en la vista previa
  const slots = [
    { key: 'front', headerId: 'previewHeaderFront', titleId: 'previewTitleFront', dimId: 'previewDimFront', fallback: 'ANVERSO' },
    { key: 'back', headerId: 'previewHeaderBack', titleId: 'previewTitleBack', dimId: 'previewDimBack', fallback: 'REVERSO' },
    { key: 'page3', headerId: 'previewHeaderPage3', titleId: 'previewTitlePage3', dimId: 'previewDimPage3', fallback: 'PÁGINA 3' },
    { key: 'page4', headerId: 'previewHeaderPage4', titleId: 'previewTitlePage4', dimId: 'previewDimPage4', fallback: 'PÁGINA 4' }
  ];

  const pageCount = state.documentPageCount || 2;
  const isPhotos = state.activeCategory === 'photos';

  slots.forEach(function(slot, idx) {
    const headerEl = $(slot.headerId);
    const titleEl = $(slot.titleId);
    const dimEl = $(slot.dimId);
    const isVisibleSlot = !isPhotos && (idx < pageCount);

    if (headerEl) {
      if (isVisibleSlot && isLabels) {
        headerEl.classList.remove('hidden');
      } else {
        headerEl.classList.add('hidden');
      }
    }

    if (titleEl && isVisibleSlot) {
      let label = slot.fallback;
      if (state.format === 'business_card') {
        label = (idx === 0) ? 'FRENTE (CONTACTO Y LOGO)' : (idx === 1 ? 'REVERSO (QR / SERVICIOS)' : ('TARJETA 2 (PÁG. ' + (idx - 1) + ')'));
      } else if (state.format === 'passport') {
        label = (idx === 0) ? 'PÁG. 1 (DATOS BIOGRÁFICOS / FOTO)' : (idx === 1 ? 'PÁG. 2 (VISA / FIRMA / SELLO)' : ('PÁGINA ' + (idx + 1)));
      } else if (state.format === 'card') {
        label = (idx === 0) ? 'ANVERSO (FRENTE CON FOTO)' : (idx === 1 ? 'REVERSO (VUELTA / CÓDIGO)' : ('DOCUMENTO 2 (PÁG. ' + (idx - 1) + ')'));
      }
      titleEl.textContent = hasCustomTitle ? (state.documentCustomTitle + ' • ' + label) : label;
    }

    if (dimEl && isVisibleSlot) {
      dimEl.textContent = spec.widthMm + ' × ' + spec.heightMm + ' mm';
    }
  });

  // 6. Rótulos dentro de las ranuras de la hoja A4
  $$('.preview-slot-label').forEach(function(lbl) {
    lbl.classList.toggle('hidden', !isLabels || isPhotos);
  });
}

/* ============================================================
   UI: VISTA PREVIA Y PAGINACIÓN BASADA EN LAYOUT ENGINE
   ============================================================ */
function setPreviewPageIndex(idx) {
  if (!window.RealScanLayout) return;
  const layout = window.RealScanLayout.computeDocumentLayout(state);
  const maxIdx = Math.max(0, layout.totalPages - 1);
  state.activePreviewPageIndex = Math.max(0, Math.min(maxIdx, idx));
  updateUI();
}

function nextPreviewPage() {
  setPreviewPageIndex((state.activePreviewPageIndex || 0) + 1);
}

function prevPreviewPage() {
  setPreviewPageIndex((state.activePreviewPageIndex || 0) - 1);
}

function updateUI() {
  const scale = Math.max(25, Math.min(200, Number(state.outputScalePercent) || 100));
  if ($('selectOutputScale')) $('selectOutputScale').value = String(scale);
  if ($('bannerScaleWarning')) $('bannerScaleWarning').classList.toggle('hidden', scale === 100);
  if ($('labelActiveScalePct')) $('labelActiveScalePct').textContent = scale + '%';
  const spec = getActiveSpec();
  const tag = $('previewDimensionsTag');
  const canvasFront = $('canvasDocFront');
  const canvasBack = $('canvasDocBack');
  const canvasPage3 = $('canvasDocPage3');
  const canvasPage4 = $('canvasDocPage4');
  const photosGridContainer = $('canvasDocPhotosGrid');
  const photosGridInner = $('photosGridInner');
  const previewSubtext = $('previewSubtext');

  // Obtener el plan de composición milimétrico
  const layout = (window.RealScanLayout && typeof window.RealScanLayout.computeDocumentLayout === 'function')
    ? window.RealScanLayout.computeDocumentLayout(state)
    : null;

  const paper = layout ? layout.paper : ((typeof getActivePaperSpec === 'function') ? getActivePaperSpec() : { widthMm: 210, heightMm: 297, shortName: 'A4' });

  // 1. Proporción física exacta de la hoja en pantalla
  const sheetEl = document.querySelector('.a4-sheet');
  if (sheetEl) {
    sheetEl.style.aspectRatio = paper.widthMm + ' / ' + paper.heightMm;
  }

  // 2. Control de Paginador de Vista Previa (Hoja 1 de N)
  const pagBar = $('previewSheetPaginationBar');
  const labelCount = $('labelPreviewPageCounter');
  const btnPrev = $('btnPreviewPrevPage');
  const btnNext = $('btnPreviewNextPage');
  const totalPages = layout ? layout.totalPages : 1;

  if (pagBar) {
    if (totalPages > 1) {
      pagBar.classList.remove('hidden');
      state.activePreviewPageIndex = Math.max(0, Math.min(totalPages - 1, state.activePreviewPageIndex || 0));
      if (labelCount) labelCount.textContent = 'Hoja ' + (state.activePreviewPageIndex + 1) + ' de ' + totalPages;
      if (btnPrev) btnPrev.disabled = (state.activePreviewPageIndex === 0);
      if (btnNext) btnNext.disabled = (state.activePreviewPageIndex >= totalPages - 1);
    } else {
      pagBar.classList.add('hidden');
      state.activePreviewPageIndex = 0;
    }
  }

  const activePage = (layout && layout.pages[state.activePreviewPageIndex || 0]) ? layout.pages[state.activePreviewPageIndex || 0] : null;

  // 3. Renderizado de Alta Fidelidad Fiel al Layout Engine (1:1 Proporcional al Papel)
  const faithfulLayer = $('faithfulSheetPlacements');
  const isPhotos = (state.activeCategory === 'photos');

  const outputSpec = layout?.spec || spec;
  if (tag) {
    if (isPhotos) {
      tag.textContent = outputSpec.widthMm + ' × ' + outputSpec.heightMm + ' mm (' + state.photoCopies + ' fotos)';
    } else {
      tag.textContent = spec.widthMm + ' × ' + spec.heightMm + ' mm' + (state.activeCategory === 'custom' ? ' (Personalizada)' : '');
    }
  }

  if (previewSubtext) {
    previewSubtext.textContent = (layout ? layout.summary : (spec.shortName + ' a escala 1:1 real')) + (totalPages > 1 ? (' • Viendo Hoja ' + (activePage ? activePage.pageNumber : 1) + ' de ' + totalPages) : '');
  }

  if (faithfulLayer && layout && activePage) {
    faithfulLayer.innerHTML = '';
    // Ocultar elementos fijos legados para evitar duplicación visual
    if (canvasFront) canvasFront.classList.add('hidden');
    if (canvasBack) canvasBack.classList.add('hidden');
    if (canvasPage3) canvasPage3.classList.add('hidden');
    if (canvasPage4) canvasPage4.classList.add('hidden');
    if (photosGridContainer) photosGridContainer.classList.add('hidden');

    ['previewHeaderFront', 'previewHeaderBack', 'previewHeaderPage3', 'previewHeaderPage4'].forEach(function(hId) {
      const h = $(hId);
      if (h) h.classList.add('hidden');
    });

    const isLabels = (state.includeDocLabels !== false);
    const hasCustomTitle = Boolean((state.documentCustomTitle || '').trim());
    const sheetHeader = $('previewSheetHeader');
    if (sheetHeader) {
      sheetHeader.classList.toggle('hidden', !isLabels && !hasCustomTitle);
      const sheetTitle = $('previewSheetTitle');
      if (sheetTitle) {
        sheetTitle.textContent = activePage.sheetTitle || (isPhotos ? 'Planilla de Fotos Oficiales' : (spec.shortName + ' — Escala 1:1 Real'));
      }
    }

    const rulerEl = $('footerCalibrationRuler');
    if (rulerEl) {
      rulerEl.classList.toggle('hidden', !activePage.hasRuler);
    }

    const placements = activePage.placements || [];
    placements.forEach(function(p, pIdx) {
      const pBox = document.createElement('div');
      pBox.className = 'absolute transition-all flex flex-col items-center justify-center pointer-events-auto select-none overflow-hidden';
      pBox.style.left = ((p.xMm / paper.widthMm) * 100) + '%';
      pBox.style.top = ((p.yMm / paper.heightMm) * 100) + '%';
      pBox.style.width = ((p.widthMm / paper.widthMm) * 100) + '%';
      pBox.style.height = ((p.heightMm / paper.heightMm) * 100) + '%';

      if (p.isOval) {
        pBox.style.borderRadius = '50%';
      } else {
        pBox.style.borderRadius = '2px';
      }

      // Marcas de corte y contorno
      if (state.includeCutMarks !== false) {
        if (p.isOval) {
          pBox.className += ' border-2 border-dashed border-amber-400 dark:border-amber-500 bg-amber-50/30';
        } else {
          pBox.className += ' border border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/20';
        }
      } else {
        pBox.className += ' border border-transparent bg-slate-50/40';
      }

      const imgData = state.images[p.slot];
      const imgSrc = (imgData && imgData.processedDataUrl) ? imgData.processedDataUrl : null;

      if (imgSrc) {
        const im = document.createElement('img');
        im.src = imgSrc;
        im.className = 'w-full h-full object-cover';
        if (p.isOval) im.style.borderRadius = '50%';
        im.alt = p.label || ('Elemento ' + (pIdx + 1));
        pBox.appendChild(im);
        if(imgData.showMmGrid){const grid=document.createElement('div');grid.className='preview-only absolute inset-0 pointer-events-none';grid.style.backgroundImage='linear-gradient(to right,rgba(79,70,229,.25) 1px,transparent 1px),linear-gradient(to bottom,rgba(79,70,229,.25) 1px,transparent 1px)';grid.style.backgroundSize=(500/p.widthMm)+'% '+(500/p.heightMm)+'%';pBox.appendChild(grid);}

        if (imgData.showOaciGuide) {
          const guide = document.createElement('div');
          guide.className = 'preview-only pointer-events-none absolute inset-0 flex items-center justify-center p-0.5';
          guide.innerHTML = '<svg class="w-full h-full max-w-[85%] max-h-[92%] text-indigo-600/90 drop-shadow-xs" viewBox="0 0 100 130" fill="none" stroke="currentColor"><ellipse cx="50" cy="56" rx="26" ry="38" stroke-width="2" stroke-dasharray="3,2" /><line x1="20" y1="52" x2="80" y2="52" stroke-width="1.5" stroke-dasharray="2,2" /><line x1="32" y1="94" x2="68" y2="94" stroke-width="2" /><line x1="32" y1="18" x2="68" y2="18" stroke-width="2" /></svg>';
          pBox.appendChild(guide);
        }

        if (isLabels) {
          const tag = document.createElement('span');
          tag.className = 'absolute bottom-0.5 right-0.5 text-[6.5px] font-mono text-indigo-800 bg-white/90 px-1 rounded shadow-xs font-bold leading-none';
          tag.textContent = p.tag ? (p.tag + '#' + p.slotNumber) : (p.label || (p.slot === 'front' ? 'FRENTE' : 'REVERSO'));
          pBox.appendChild(tag);
        }
      } else {
        pBox.className += ' bg-slate-50/90 dark:bg-slate-800/80';
        const ph = document.createElement('div');
        ph.className = 'text-center p-0.5 w-full';
        const labelText = p.tag ? ('FOTO ' + p.tag + '#' + p.slotNumber) : (p.label || (p.slot === 'front' ? '1. FRENTE' : '2. REVERSO'));
        ph.innerHTML = '<span class="text-[7.5px] font-bold text-indigo-700 dark:text-indigo-300 block truncate leading-tight">' + labelText + '</span><span class="text-[6.5px] font-mono text-slate-400 block">' + Math.round(p.widthMm) + '×' + Math.round(p.heightMm) + 'mm</span>';
        pBox.appendChild(ph);
      }

      setupDragToPan(pBox, p.slot);
      faithfulLayer.appendChild(pBox);
    });
  } else {
    // Fallback tradicional
    if (isPhotos) {
      if (photosGridContainer) photosGridContainer.classList.remove('hidden');
    } else {
      if (canvasFront) canvasFront.classList.remove('hidden');
      if (canvasBack) canvasBack.classList.toggle('hidden', state.printMode === 'single');
    }
  }

  updatePreviewAnnotations();
  updatePreFlightBar();
}

function setPaperSize(paperId, silent) {
  if (!window.PAPER_SPECS || !window.PAPER_SPECS[paperId]) paperId = 'a4';
  state.paperSize = paperId;
  const paper = window.PAPER_SPECS[paperId];

  // Actualizar botones de selección
  $$('.paper-size-btn').forEach(function(b) {
    b.classList.toggle('is-active', b.getAttribute('data-paper') === paperId);
  });

  // Actualizar etiqueta descriptiva
  const descEl = $('labelActivePaperDesc');
  if (descEl) descEl.textContent = paper.name;

  // Actualizar proporción física de la hoja interactiva en pantalla
  const sheetEl = document.querySelector('.a4-sheet');
  if (sheetEl) {
    sheetEl.style.aspectRatio = `${paper.widthMm} / ${paper.heightMm}`;
  }

  // Actualizar etiquetas en Paso 4
  const badgeTag = $('previewSheetBadgeTag');
  if (badgeTag) badgeTag.textContent = 'Hoja ' + paper.shortName + ' final';

  const mainTitle = $('previewMainTitle');
  if (mainTitle) mainTitle.textContent = 'Vista previa en 1 hoja ' + paper.shortName;

  if (state.activeCategory === 'photos') {
    updatePhotoGridStats();
    updateUI();
  }

  updatePreFlightBar();
  savePreferences();

  if (!silent) {
    showToast('📑 Tamaño de papel: ' + paper.name + '. Escala 1:1 física calibrada.', 'success');
  }
}

function updatePreFlightBar() {
  const docsEl = $('preFlightDocsStatus');
  const scaleEl = $('preFlightScaleStatus');
  const sheetEl = $('preFlightSheetStatus');
  if (!docsEl || !scaleEl || !sheetEl) return;

  const spec = getActiveSpec();
  const pCount = (state.activeCategory === 'photos') ? 1 : (state.documentPageCount || 2);
  let loaded = 0;
  if (state.images.front && state.images.front.processedDataUrl) loaded++;
  if (pCount >= 2 && state.images.back && state.images.back.processedDataUrl) loaded++;
  if (pCount >= 3 && state.images.page3 && state.images.page3.processedDataUrl) loaded++;
  if (pCount >= 4 && state.images.page4 && state.images.page4.processedDataUrl) loaded++;

  if (loaded >= pCount) {
    docsEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span class="font-bold text-emerald-700 dark:text-emerald-300">${loaded}/${pCount} caras listas</span>`;
  } else if (loaded > 0) {
    docsEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span><span class="font-bold text-amber-700 dark:text-amber-300">${loaded}/${pCount} caras cargadas</span>`;
  } else {
    docsEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span><span class="text-slate-500 dark:text-slate-400">0/${pCount} cargadas</span>`;
  }

  scaleEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-indigo-500"></span><span class="font-bold text-indigo-700 dark:text-indigo-300">1:1 Real (300 DPI)</span>`;

  if (!state.includeRulerFooter && !state.includeDocLabels) {
    sheetEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="font-bold text-emerald-700 dark:text-emerald-300">🏛️ Trámite Oficial (Limpia)</span>`;
  } else if (!state.includeRulerFooter) {
    sheetEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-indigo-500"></span><span class="font-bold text-indigo-700 dark:text-indigo-300">📄 Sin Regla al Pie</span>`;
  } else {
    sheetEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-indigo-500"></span><span class="font-bold text-indigo-700 dark:text-indigo-300">📐 Estándar con Regla</span>`;
  }

  const paperEl = $('preFlightPaperLabel');
  if (paperEl && typeof getActivePaperSpec === 'function') {
    const paper = getActivePaperSpec();
    paperEl.textContent = `${paper.icon} ${paper.shortName} (${Math.round(paper.widthMm)}×${Math.round(paper.heightMm)})`;
  }
}

/* ============================================================
   PERSISTENCIA LOCAL (localStorage)
   ============================================================ */
function savePreferences() {
  try {
    const prefs = {
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      activeCategory: state.activeCategory,
      paperSize: state.paperSize || 'a4',
      format: state.format,
      printMode: state.printMode,
      documentPageCount: state.documentPageCount || 2,
      photoCopies: state.photoCopies,
      photoCopiesPersonA: state.photoCopiesPersonA ?? Math.ceil((state.photoCopies || 4) / 2),
      photoCopiesPersonB: state.photoCopiesPersonB ?? Math.floor((state.photoCopies || 4) / 2),
      outputScalePercent: state.outputScalePercent || 100,
      customWidth: state.customWidth,
      customHeight: state.customHeight,
      customUnit: state.customUnit,
      mixTwoPhotos: state.mixTwoPhotos,
      includeRulerFooter: state.includeRulerFooter !== false,
      includeDocLabels: state.includeDocLabels !== false,
      includeCutMarks: state.includeCutMarks !== false,
      documentCustomTitle: state.documentCustomTitle || '',
      duplicateCard: !!state.duplicateCard
    };
    localStorage.setItem(window.PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {}
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem(window.PREFS_KEY);
    if (!raw) {
      if (typeof setPaperSize === 'function') setPaperSize('a4', true);
      return;
    }
    const p = JSON.parse(raw);
    if (p.theme) {
      const isDark = p.theme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      const meta = $('metaThemeColor');
      if (meta) meta.setAttribute('content', isDark ? '#0f172a' : '#4f46e5');
    }
    if (p.paperSize && typeof setPaperSize === 'function') {
      setPaperSize(p.paperSize, true);
    } else if (typeof setPaperSize === 'function') {
      setPaperSize('a4', true);
    }
    if (p.customWidth) state.customWidth = p.customWidth;
    if (p.customHeight) state.customHeight = p.customHeight;
    if (p.customUnit) {
      state.customUnit = p.customUnit;
      const btnCm = $('btnUnitCm'), btnMm = $('btnUnitMm');
      if (btnCm && btnMm) {
        btnCm.classList.toggle('is-active', p.customUnit === 'cm');
        btnMm.classList.toggle('is-active', p.customUnit === 'mm');
      }
    }
    if (p.photoCopies) state.photoCopies = p.photoCopies;
    state.photoCopiesPersonA = Number.isInteger(p.photoCopiesPersonA) ? p.photoCopiesPersonA : Math.ceil((p.photoCopies || 4) / 2);
    state.photoCopiesPersonB = Number.isInteger(p.photoCopiesPersonB) ? p.photoCopiesPersonB : Math.floor((p.photoCopies || 4) / 2);
    state.outputScalePercent = Math.max(25, Math.min(200, Number(p.outputScalePercent) || 100));
    if (p.documentPageCount) state.documentPageCount = p.documentPageCount;
    if (p.printMode) setPrintMode(p.printMode);
    if (p.mixTwoPhotos !== undefined) {
      state.mixTwoPhotos = p.mixTwoPhotos;
      const chk = $('chkMixTwoPhotos');
      if (chk) chk.checked = p.mixTwoPhotos;
    }
    if (p.includeRulerFooter !== undefined) {
      state.includeRulerFooter = p.includeRulerFooter;
      const chk = $('chkIncludeRulerFooter');
      if (chk) chk.checked = p.includeRulerFooter;
      const ruler = $('footerCalibrationRuler');
      if (ruler) ruler.classList.toggle('hidden', !p.includeRulerFooter);
    }
    if (p.includeDocLabels !== undefined) {
      state.includeDocLabels = p.includeDocLabels;
      const chk = $('chkIncludeDocLabels');
      if (chk) chk.checked = p.includeDocLabels;
    }
    if (p.includeCutMarks !== undefined) {
      state.includeCutMarks = p.includeCutMarks;
      const chk = $('chkIncludeCutMarks');
      if (chk) chk.checked = p.includeCutMarks;
    }
    if (p.duplicateCard !== undefined) {
      state.duplicateCard = !!p.duplicateCard;
      const chk = $('chkDuplicateCard');
      if (chk) chk.checked = state.duplicateCard;
      const b = $('badgeDuplicateStatus');
      if (b) {
        b.textContent = state.duplicateCard ? '2 Juegos' : '1 Juego';
        b.className = state.duplicateCard ? 'text-[9.5px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded shrink-0' : 'text-[9.5px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded shrink-0';
      }
    }
    if (p.documentCustomTitle !== undefined) {
      state.documentCustomTitle = p.documentCustomTitle;
      const inp = $('inputDocumentTitle');
      if (inp) inp.value = p.documentCustomTitle;
    }
    if (p.format && FORMAT_SPECS[p.format]) state.format = p.format;
    if (p.activeCategory) switchCategory(p.activeCategory);
  } catch (e) {}
}

/* ============================================================
   DRAG TO PAN INTERACTIVO
   ============================================================ */
function setupDragToPan(canvasTarget, side) {
  const el = (typeof canvasTarget === 'string') ? $(canvasTarget) : canvasTarget;
  if (!el) return;
  let startX = 0, startY = 0, isDragging = false;
  on(el, 'pointerdown', function(e) {
    if (!state.images[side].originalSrc) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    try { el.setPointerCapture(e.pointerId); } catch(err) {}
    el.style.cursor = 'grabbing';
  });
  on(el, 'pointermove', function(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      startX = e.clientX;
      startY = e.clientY;
      if (typeof adjustPan === 'function') {
        adjustPan(side, (dx / el.clientWidth) * 45, (dy / el.clientHeight) * 45);
      }
    }
  });
  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    try { el.releasePointerCapture(e.pointerId); } catch(err) {}
    el.style.cursor = '';
  }
  on(el, 'pointerup', endDrag);
  on(el, 'pointercancel', endDrag);
}

/* ============================================================
   BINDING DE EVENTOS
   ============================================================ */
function bindEvents() {
  // Quick Intent Selector (M-18)
  $$('.intent-card').forEach(function(card) {
    on(card, 'click', function() {
      const intent = card.getAttribute('data-intent');
      if (intent) switchIntent(intent);
    });
  });

  // Stage Zoom Buttons (M-19)
  $$('.sheet-zoom-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      const zoom = btn.getAttribute('data-sheet-zoom');
      if (zoom) setStageSheetZoom(zoom);
    });
  });

  // Mobile Stepper Navigation (M-20)
  $$('.mobile-step-tab').forEach(function(tab) {
    on(tab, 'click', function() {
      const step = tab.getAttribute('data-mob-step');
      if (step) setMobileStep(step);
    });
  });
  $$('.btn-mob-nav').forEach(function(btn) {
    on(btn, 'click', function() {
      const step = btn.getAttribute('data-mob-nav-step');
      if (step) setMobileStep(step);
    });
  });

  // Toggle Saved Scans Section
  if ($('btnToggleSavedScansSection')) {
    on($('btnToggleSavedScansSection'), 'click', toggleSavedScansSection);
  }

  // Herramientas avanzadas de edición (M-22 a M-26)
  initWarpCanvasEvents();
  initCropCanvasEvents();

  $$('.warp-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      const side = btn.getAttribute('data-warp');
      if (side) openPerspectiveWarpModal(side);
    });
  });

  $$('.crop-trigger-btn, [data-crop]').forEach(function(btn) {
    on(btn, 'click', function() {
      const side = btn.getAttribute('data-crop');
      if (side) openCropModal(side);
    });
  });

  $$('.autolight-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      const side = btn.getAttribute('data-autolight');
      if (side) applyAdaptiveAutoLight(side);
    });
  });

  $$('.swap-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      const parts = (btn.getAttribute('data-swap') || '').split(':');
      if (parts.length === 2) handleSlotSwap(parts[0], parts[1]);
    });
  });

  $$('.undo-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      const side = btn.getAttribute('data-undo');
      if (side) handleSlotUndo(side);
    });
  });

  $$('.redo-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      const side = btn.getAttribute('data-redo');
      if (side) handleSlotRedo(side);
    });
  });

  // Copias independientes Persona A y Persona B
  if ($('btnMinusCopiesA')) {
    on($('btnMinusCopiesA'), 'click', function() {
      setIndependentPhotoCopies('A', Math.max(0, (state.photoCopiesPersonA ?? 2) - 1));
    });
  }
  if ($('btnPlusCopiesA')) {
    on($('btnPlusCopiesA'), 'click', function() {
      setIndependentPhotoCopies('A', (state.photoCopiesPersonA ?? 2) + 1);
    });
  }
  if ($('inputCopiesPersonA')) {
    on($('inputCopiesPersonA'), 'change', function(e) {
      setIndependentPhotoCopies('A', e.target.value);
    });
  }
  if ($('btnMinusCopiesB')) {
    on($('btnMinusCopiesB'), 'click', function() {
      setIndependentPhotoCopies('B', Math.max(0, (state.photoCopiesPersonB ?? 2) - 1));
    });
  }
  if ($('btnPlusCopiesB')) {
    on($('btnPlusCopiesB'), 'click', function() {
      setIndependentPhotoCopies('B', (state.photoCopiesPersonB ?? 2) + 1);
    });
  }
  if ($('inputCopiesPersonB')) {
    on($('inputCopiesPersonB'), 'change', function(e) {
      setIndependentPhotoCopies('B', e.target.value);
    });
  }

  // Theme toggle
  on($('btnThemeToggle'), 'click', function(){
    toggleTheme();
    savePreferences();
  });

  // Ayuda modales
  on($('btnIphoneHelp'), 'click', function(){ openModal('iphoneHelpModal'); });
  on($('btnScannerHelp'), 'click', function(){ openModal('scannerHelpModal'); });

  // Cerrar modal haciendo clic en el backdrop oscuro
  $$('[role="dialog"]').forEach(function(modal) {
    on(modal, 'click', function(e) {
      if (e.target === modal) {
        if (modal.id === 'liveCameraModal' && typeof closeLiveCamera === 'function') closeLiveCamera();
        else closeModal(modal.id);
      }
    });
  });

  // Tabs categorías
  $$('.cat-tab').forEach(function(t) {
    on(t, 'click', function(){ switchCategory(t.getAttribute('data-cat')); });
  });

  // Modos both/single
  $$('.mode-btn').forEach(function(b) {
    on(b, 'click', function(){
      setPrintMode(b.getAttribute('data-mode'));
      savePreferences();
    });
  });

  // Photo copies presets
  $$('.photo-copies-btn').forEach(function(b) {
    on(b, 'click', function(){
      setPhotoCopies(parseInt(b.getAttribute('data-copies'), 10));
      savePreferences();
    });
  });

  // Llenar hoja al máximo sin desperdiciar papel
  if ($('btnFillA4Sheet')) {
    on($('btnFillA4Sheet'), 'click', function() {
      const spec = getActiveSpec();
      const info = getPhotoLayoutInfo(spec.widthMm, spec.heightMm, 36);
      setPhotoCopies(info.maxPerPage);
      savePreferences();
      showToast('Hoja optimizada: ' + info.maxPerPage + ' fotos (' + spec.name + ') sin desperdicio de papel.', 'success');
    });
  }

  // Stepper numérico de copias exactas
  if ($('btnMinusPhotoCopies')) {
    on($('btnMinusPhotoCopies'), 'click', function() {
      setPhotoCopies(state.photoCopies - 1);
      savePreferences();
    });
  }
  if ($('btnPlusPhotoCopies')) {
    on($('btnPlusPhotoCopies'), 'click', function() {
      setPhotoCopies(state.photoCopies + 1);
      savePreferences();
    });
  }
  if ($('inputPhotoCopies')) {
    on($('inputPhotoCopies'), 'change', function(e) {
      setPhotoCopies(parseInt(e.target.value, 10));
      savePreferences();
    });
    on($('inputPhotoCopies'), 'keyup', function(e) {
      if (e.key === 'Enter') {
        setPhotoCopies(parseInt(e.target.value, 10));
        savePreferences();
      }
    });
  }

  // Toggle mix 2 fotos
  if ($('chkMixTwoPhotos')) {
    on($('chkMixTwoPhotos'), 'change', function(e){ setMixTwoPhotos(e.target.checked); });
  }

  // Formatos
  $$('.format-btn').forEach(function(b) {
    on(b, 'click', function(){
      selectFormat(b.getAttribute('data-format'));
      savePreferences();
    });
  });

  // Orientación de Pasaporte
  if ($('btnPassOpenPortrait')) {
    on($('btnPassOpenPortrait'), 'click', function(){ setPassportOrientation('open', 'portrait'); });
  }
  if ($('btnPassOpenLandscape')) {
    on($('btnPassOpenLandscape'), 'click', function(){ setPassportOrientation('open', 'landscape'); });
  }
  if ($('btnPassPageLandscape')) {
    on($('btnPassPageLandscape'), 'click', function(){ setPassportOrientation('page', 'landscape'); });
  }
  if ($('btnPassPagePortrait')) {
    on($('btnPassPagePortrait'), 'click', function(){ setPassportOrientation('page', 'portrait'); });
  }

  // Unit toggle
  on($('btnUnitCm'), 'click', function(){ setCustomUnit('cm'); savePreferences(); });
  on($('btnUnitMm'), 'click', function(){ setCustomUnit('mm'); savePreferences(); });

  // Inputs custom
  on($('inputCustomWidth'), 'input', function(){ handleCustomInput(); savePreferences(); });
  on($('inputCustomHeight'), 'input', function(){ handleCustomInput(); savePreferences(); });

  // Step dims
  $$('.step-btn').forEach(function(b) {
    on(b, 'click', function() {
      const parts = b.getAttribute('data-step').split(':');
      stepCustomDim(parts[0], parseInt(parts[1], 10));
      savePreferences();
    });
  });

  // Presets
  $$('.preset-btn').forEach(function(b) {
    on(b, 'click', function() {
      const p = b.getAttribute('data-preset').split(',');
      setCustomPreset(parseFloat(p[0]), parseFloat(p[1]), p[2]);
      savePreferences();
    });
  });

  // Filtros de imagen
  $$('.filter-btn').forEach(function(b) {
    on(b, 'click', function() {
      const p = b.getAttribute('data-filter').split(':');
      if (typeof setFilter === 'function') setFilter(p[0], p[1]);
    });
  });

  // Pan Nudge / Centrado
  $$('.pan-btn').forEach(function(b) {
    on(b, 'click', function() {
      const p = b.getAttribute('data-pan').split(':');
      if (typeof adjustPan === 'function') adjustPan(p[0], parseFloat(p[1]), parseFloat(p[2]));
    });
  });
  $$('.pan-reset-btn').forEach(function(b) {
    on(b, 'click', function(){ if (typeof resetPan === 'function') resetPan(b.getAttribute('data-pan-reset')); });
  });

  // Guía OACI
  $$('.guide-btn').forEach(function(b) {
    on(b, 'click', function(){ if (typeof toggleOaciGuide === 'function') toggleOaciGuide(b.getAttribute('data-guide')); });
  });

  // File inputs para todas las 4 ranuras
  on($('fileInputFront'), 'change', function(e){ if (typeof handleImageFile === 'function') handleImageFile(e, 'front'); });
  on($('fileInputBack'), 'change', function(e){ if (typeof handleImageFile === 'function') handleImageFile(e, 'back'); });
  on($('fileInputPage3'), 'change', function(e){ if (typeof handleImageFile === 'function') handleImageFile(e, 'page3'); });
  on($('fileInputPage4'), 'change', function(e){ if (typeof handleImageFile === 'function') handleImageFile(e, 'page4'); });

  // Camera / Upload / Paste buttons
  $$('.cam-btn').forEach(function(b) { on(b, 'click', function(){ if (typeof handleCameraClick === 'function') handleCameraClick(b.getAttribute('data-camera')); }); });
  $$('.upload-btn').forEach(function(b) { on(b, 'click', function(){ if (typeof triggerNativeUpload === 'function') triggerNativeUpload(b.getAttribute('data-upload'), false); }); });
  $$('.paste-btn').forEach(function(b) { on(b, 'click', function(){ if (typeof pasteFromClipboard === 'function') pasteFromClipboard(b.getAttribute('data-paste')); }); });

  // Zoom / Rotate / Crop toggle
  $$('.zoom-btn').forEach(function(b) {
    on(b, 'click', function() {
      const p = b.getAttribute('data-zoom').split(':');
      if (typeof adjustZoom === 'function') adjustZoom(p[0], parseFloat(p[1]));
    });
  });
  $$('.rotate-btn').forEach(function(b) {
    on(b, 'click', function(){ if (typeof rotateImage === 'function') rotateImage(b.getAttribute('data-rotate')); });
  });
  $$('[data-crop]').forEach(function(b) {
    on(b, 'click', function(){ if (typeof toggleAutoCrop === 'function') toggleAutoCrop(b.getAttribute('data-crop')); });
  });

  // Auto-Fit / Rellenar Ranura 1:1
  $$('[data-autofit]').forEach(function(b) {
    on(b, 'click', function() {
      const side = b.getAttribute('data-autofit');
      if (typeof autoFitSlotToCard === 'function') autoFitSlotToCard(side);
    });
  });

  // Eliminar / Borrar Foto de Ranura
  $$('[data-delete]').forEach(function(b) {
    on(b, 'click', function() {
      const side = b.getAttribute('data-delete');
      if (confirm('¿Eliminar la foto cargada en ' + getSlotFriendlyName(side) + '? Podrás subir o capturar una nueva.')) {
        if (typeof clearSlot === 'function') clearSlot(side);
      }
    });
  });

  // Botón añadir más páginas a documentos (Pasaporte / Visas / Tarjetas)
  if ($('btnAddDocumentPage')) {
    on($('btnAddDocumentPage'), 'click', function() {
      const current = state.documentPageCount || 2;
      if (current < 4) {
        setDocumentPages(current + 1);
        showToast('Página ' + (current + 1) + ' añadida. Puedes capturarla o subir el archivo.', 'success');
      }
    });
  }

  // Botones quitar página 3 y 4
  if ($('btnRemovePage3')) {
    on($('btnRemovePage3'), 'click', function() {
      state.images.page3 = { rawOriginalSrc:null, croppedSrc:null, isCropApplied:true, originalSrc:null, processedDataUrl:null, naturalWidth:0, naturalHeight:0, rotation:0, zoom:1.0, filter:'color', panX:0, panY:0, showOaciGuide:false };
      if (state.images.page4 && state.images.page4.originalSrc) {
        state.images.page3 = Object.assign({}, state.images.page4);
        state.images.page4 = { rawOriginalSrc:null, croppedSrc:null, isCropApplied:true, originalSrc:null, processedDataUrl:null, naturalWidth:0, naturalHeight:0, rotation:0, zoom:1.0, filter:'color', panX:0, panY:0, showOaciGuide:false };
        if (typeof updateSidePreview === 'function') updateSidePreview('page3');
        setDocumentPages(3);
      } else {
        setDocumentPages(2);
      }
      showToast('Página 3 eliminada.', 'info');
    });
  }

  if ($('btnRemovePage4')) {
    on($('btnRemovePage4'), 'click', function() {
      state.images.page4 = { rawOriginalSrc:null, croppedSrc:null, isCropApplied:true, originalSrc:null, processedDataUrl:null, naturalWidth:0, naturalHeight:0, rotation:0, zoom:1.0, filter:'color', panX:0, panY:0, showOaciGuide:false };
      setDocumentPages(3);
      showToast('Página 4 eliminada.', 'info');
    });
  }

  // Historial Local Privado e IndexedDB
  if ($('btnOpenHistory')) {
    on($('btnOpenHistory'), 'click', function() {
      openModal('historyModal');
      if (typeof renderHistoryUI === 'function') renderHistoryUI();
    });
  }

  if ($('btnSaveToHistory')) {
    on($('btnSaveToHistory'), 'click', async function() {
      const sel = $('selectRetentionDays');
      const days = sel ? parseInt(sel.value, 10) : 3;
      if (typeof saveScanToStorage === 'function') {
        await saveScanToStorage(null, days);
      }
    });
  }

  if ($('btnClearAllHistory')) {
    on($('btnClearAllHistory'), 'click', async function() {
      if (confirm('¿Estás seguro de vaciar todos los escaneos guardados en este navegador?')) {
        if (typeof clearAllScansFromStorage === 'function') {
          await clearAllScansFromStorage();
          if (typeof renderHistoryUI === 'function') renderHistoryUI();
        }
      }
    });
  }

  if ($('btnExportHistoryJson')) {
    on($('btnExportHistoryJson'), 'click', function() {
      if (typeof exportAllScansAsJson === 'function') exportAllScansAsJson();
    });
  }

  if ($('btnImportHistoryTrigger') && $('fileInputImportHistory')) {
    on($('btnImportHistoryTrigger'), 'click', function() {
      $('fileInputImportHistory').click();
    });
    on($('fileInputImportHistory'), 'change', function(e) {
      if (e.target.files && e.target.files[0] && typeof importScansFromJson === 'function') {
        importScansFromJson(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  if ($('selectRetentionDays')) {
    const savedDays = localStorage.getItem('realscan_retention_days');
    if (savedDays !== null) $('selectRetentionDays').value = savedDays;
    on($('selectRetentionDays'), 'change', function(e) {
      const days = parseInt(e.target.value, 10);
      try { localStorage.setItem('realscan_retention_days', days); } catch(err) {}
      showToast('Preferencia de retención actualizada: ' + (days > 0 ? (days + ' días') : 'Permanente'), 'info');
    });
  }

  // Drag to pan interactivo en la vista previa del documento para las 4 ranuras
  setupDragToPan('canvasDocFront', 'front');
  setupDragToPan('canvasDocBack', 'back');
  setupDragToPan('canvasDocPage3', 'page3');
  setupDragToPan('canvasDocPage4', 'page4');

  // Dropzones
  ['dropzoneFront', 'cardBackContainer', 'cardPage3Container', 'cardPage4Container'].forEach(function(dzId) {
    const dz = $(dzId);
    const side = (dzId === 'dropzoneFront') ? 'front' : ((dzId === 'cardBackContainer') ? 'back' : ((dzId === 'cardPage3Container') ? 'page3' : 'page4'));
    if (dz && typeof handleDragOver === 'function') {
      on(dz, 'dragover', handleDragOver);
      on(dz, 'dragleave', handleDragLeave);
      on(dz, 'drop', function(e){ handleDrop(e, side); });
    }
  });

  // Evitar navegación accidental al arrastrar archivo fuera de la ranura
  on(window, 'dragover', function(e){ e.preventDefault(); });
  on(window, 'drop', function(e){ e.preventDefault(); });

  // Atajos de teclado: Ctrl + P (imprimir), Ctrl + Z (deshacer), Ctrl + Y (rehacer)
  on(window, 'keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      handlePrintDirect();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      const activeSide = state.activeCameraSide || 'front';
      if (e.shiftKey) {
        handleSlotRedo(activeSide);
      } else {
        handleSlotUndo(activeSide);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      const activeSide = state.activeCameraSide || 'front';
      handleSlotRedo(activeSide);
    } else if (e.key === 'Escape') {
      ['historyModal', 'settingsModal', 'userPresetsModal', 'perspectiveWarpModal', 'cropModal', 'helpModal', 'iphoneHelpModal', 'scannerHelpModal'].forEach(function(mId) {
        if (typeof closeModal === 'function') closeModal(mId);
      });
    }
  });

  // Nuevo Trabajo (M-28)
  if ($('btnNewProject')) {
    on($('btnNewProject'), 'click', resetWorkspaceToNewProject);
  }
  if ($('hudBtnNewProject')) {
    on($('hudBtnNewProject'), 'click', resetWorkspaceToNewProject);
  }

  // Presets de Usuario (M-29)
  if ($('btnOpenPresets')) {
    on($('btnOpenPresets'), 'click', function() {
      openModal('userPresetsModal');
      if (typeof renderUserPresetsUI === 'function') renderUserPresetsUI();
    });
  }
  if ($('btnSaveCurrentAsPreset')) {
    on($('btnSaveCurrentAsPreset'), 'click', function() {
      const input = $('inputNewPresetName');
      const name = input ? input.value : '';
      if (typeof saveUserPreset === 'function') {
        const res = saveUserPreset(name);
        if (res && input) input.value = '';
        if (typeof renderUserPresetsUI === 'function') renderUserPresetsUI();
      }
    });
  }

  // Búsqueda en Historial (M-30)
  if ($('inputSearchHistory')) {
    on($('inputSearchHistory'), 'input', function(e) {
      if (typeof renderHistoryUI === 'function') {
        renderHistoryUI(e.target.value);
      }
    });
  }

  // Restauración y Descarte de Borrador Activo (M-27)
  if ($('btnRestoreActiveDraft')) {
    on($('btnRestoreActiveDraft'), 'click', async function() {
      if (typeof restoreActiveDraft === 'function') {
        const ok = await restoreActiveDraft();
        if (ok) {
          const banner = $('bannerActiveDraftRecovery');
          if (banner) banner.classList.add('hidden');
          showToast('✅ Borrador restaurado exitosamente.', 'success');
        }
      }
    });
  }
  if ($('btnDiscardActiveDraft')) {
    on($('btnDiscardActiveDraft'), 'click', function() {
      if (typeof clearActiveDraft === 'function') clearActiveDraft();
      const banner = $('bannerActiveDraftRecovery');
      if (banner) banner.classList.add('hidden');
      showToast('Borrador descartado.', 'info');
    });
  }

  // Floating HUD Quick Actions
  if ($('hudBtnAutoEnhance')) {
    on($('hudBtnAutoEnhance'), 'click', function() {
      if (typeof autoEnhanceActiveSlots === 'function') autoEnhanceActiveSlots();
    });
  }
  if ($('hudBtnPrintDirect')) {
    on($('hudBtnPrintDirect'), 'click', handlePrintDirect);
  }
  if ($('hudBtnDownloadPdf')) {
    on($('hudBtnDownloadPdf'), 'click', function() { handleExportPDF(false); });
  }
  if ($('hudBtnHistory')) {
    on($('hudBtnHistory'), 'click', function() {
      openModal('historyModal');
      if (typeof renderHistoryUI === 'function') renderHistoryUI();
    });
  }
  if ($('hudBtnSettings')) {
    on($('hudBtnSettings'), 'click', openSettingsModal);
  }

  // Nombre / Titular del Documento
  // Nombre / Titular del Documento
  if ($('inputDocumentTitle')) {
    on($('inputDocumentTitle'), 'input', function(e) {
      state.documentCustomTitle = (e.target.value || '').trim();
      updatePreviewAnnotations();
      savePreferences();
    });
  }
  if ($('btnClearDocTitle')) {
    on($('btnClearDocTitle'), 'click', function() {
      if ($('inputDocumentTitle')) $('inputDocumentTitle').value = '';
      state.documentCustomTitle = '';
      updatePreviewAnnotations();
      savePreferences();
      showToast('Título del documento restablecido.', 'info');
    });
  }

  // Checklist: Activar / Desactivar Título
  if ($('chkEnableDocTitle')) {
    on($('chkEnableDocTitle'), 'change', function(e) {
      const container = $('containerDocTitleInput');
      if (container) container.classList.toggle('hidden', !e.target.checked);
      if (e.target.checked) {
        if ($('inputDocumentTitle')) $('inputDocumentTitle').focus();
      } else {
        if ($('inputDocumentTitle')) $('inputDocumentTitle').value = '';
        state.documentCustomTitle = '';
        updatePreviewAnnotations();
        savePreferences();
      }
    });
  }

  // Presets Rápidos de Limpieza / Acabado
  // Presets Rápidos de Limpieza / Acabado
  if ($('btnQuickOfficialClean')) {
    on($('btnQuickOfficialClean'), 'click', function() {
      state.includeRulerFooter = false;
      state.includeDocLabels = false;
      state.includeCutMarks = false;
      updatePreviewAnnotations();
      updateUI();
      savePreferences();
      showToast('🏛️ Hoja 100% Limpia activada (sin regla, rótulos ni marcas para trámites oficiales).', 'success');
    });
  }

  if ($('btnQuickStandardChecked')) {
    on($('btnQuickStandardChecked'), 'click', function() {
      state.includeRulerFooter = true;
      state.includeDocLabels = true;
      state.includeCutMarks = true;
      updatePreviewAnnotations();
      updateUI();
      savePreferences();
      showToast('📐 Acabado Estándar activado: Regla física de 5 cm, rótulos y guías de corte.', 'info');
    });
  }

  // Opciones Oficiales de Impresión (Regla, Rótulos y Guías de Corte)
  if ($('chkIncludeRulerFooter')) {
    on($('chkIncludeRulerFooter'), 'change', function(e) {
      state.includeRulerFooter = e.target.checked;
      updatePreviewAnnotations();
      updateUI();
      savePreferences();
      if (!state.includeRulerFooter) {
        showToast('Regla e instrucciones desactivadas: Hoja limpia para trámites oficiales.', 'success');
      } else {
        showToast('Regla de 5 cm e instrucciones activadas en el pie de página.', 'info');
      }
    });
  }

  if ($('chkIncludeDocLabels')) {
    on($('chkIncludeDocLabels'), 'change', function(e) {
      state.includeDocLabels = e.target.checked;
      updatePreviewAnnotations();
      updateUI();
      savePreferences();
      showToast(state.includeDocLabels ? 'Rótulos y medidas activados en la vista previa e impresión.' : 'Rótulos desactivados para máxima pulcritud.', 'info');
    });
  }

  if ($('chkIncludeCutMarks')) {
    on($('chkIncludeCutMarks'), 'change', function(e) {
      state.includeCutMarks = e.target.checked;
      updatePreviewAnnotations();
      updateUI();
      savePreferences();
      showToast(state.includeCutMarks ? 'Marcas y guías de corte visibles.' : 'Marcas de corte desactivadas.', 'info');
    });
  }

  // Paginador interactivo de vista previa
  if ($('btnPreviewPrevPage')) {
    on($('btnPreviewPrevPage'), 'click', prevPreviewPage);
  }
  if ($('btnPreviewNextPage')) {
    on($('btnPreviewNextPage'), 'click', nextPreviewPage);
  }

  // Checklist: Modo Duplicado (2 Juegos de Copias en la Misma Hoja)
  if ($('chkDuplicateCard')) {
    on($('chkDuplicateCard'), 'change', function(e) {
      state.duplicateCard = e.target.checked;
      const b = $('badgeDuplicateStatus');
      if (b) {
        b.textContent = state.duplicateCard ? '2 Juegos' : '1 Juego';
        b.className = state.duplicateCard 
          ? 'text-[9.5px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded shrink-0' 
          : 'text-[9.5px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded shrink-0';
      }
      savePreferences();
      updatePreviewAnnotations();
      showToast(state.duplicateCard 
        ? '👥 2 Juegos de copias activados: Frente y Reverso duplicados en 2 columnas en la misma hoja.' 
        : 'Modo 1 juego estándar.', 'info');
    });
  }

  // Selector de Tamaño de Hoja / Papel (A4, Carta, Oficio México, Legal)
  $$('.paper-size-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      const pid = btn.getAttribute('data-paper');
      if (pid && typeof setPaperSize === 'function') {
        setPaperSize(pid);
      }
    });
  });

  // Botones de Ampliación / Reducción Rápida (-25%, 100%, +25%, +50%)
  $$('.scale-preset-btn').forEach(function(b) {
    on(b, 'click', function() {
      const parts = b.getAttribute('data-scale-preset').split(':');
      const side = parts[0];
      const targetZoom = parseFloat(parts[1]) || 1.0;
      if (typeof setZoomScale === 'function') {
        setZoomScale(side, targetZoom);
      }
    });
  });

  // Control deslizante continuo de escala (Zoom Slider)
  $$('.zoom-slider').forEach(function(slider) {
    const side = slider.getAttribute('data-slider-side');
    on(slider, 'input', function(e) {
      const z = parseFloat(e.target.value) / 100;
      if (typeof setZoomScale === 'function') {
        setZoomScale(side, z);
      }
    });
  });

  // Botones de Modo de Ajuste: Encajar Todo ('fit') vs Llenar Ranura 1:1 ('cover')
  $$('.fit-mode-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      const parts = btn.getAttribute('data-fit-mode').split(':');
      const side = parts[0];
      const mode = parts[1];
      if (typeof setFitMode === 'function') {
        setFitMode(side, mode);
      }
    });
  });

  // Botón Regla Milimétrica Física Superpuesta (1:1 Grid)
  $$('.grid-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      const side = btn.getAttribute('data-grid');
      if (typeof toggleMmGrid === 'function') {
        toggleMmGrid(side);
      }
    });
  });

  // Botones de Corrección Rápida de Luz (+15%, -15%, Contraste, Reset)
  $$('.light-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      const parts = btn.getAttribute('data-light').split(':');
      const side = parts[0];
      const type = parts[1];
      const delta = parseInt(parts[2], 10) || 0;
      if (type === 'reset') {
        if (typeof resetSlotLight === 'function') resetSlotLight(side);
      } else {
        if (typeof adjustSlotLight === 'function') adjustSlotLight(side, type, delta);
      }
    });
  });

  // Zoom proactivo con la rueda del ratón (Mouse Wheel Zoom) sobre cada lienzo
  ['canvasDocFront', 'canvasDocBack', 'canvasDocPage3', 'canvasDocPage4'].forEach(function(cId) {
    const canvas = $(cId);
    if (!canvas) return;
    const side = (cId === 'canvasDocFront') ? 'front' : ((cId === 'canvasDocBack') ? 'back' : ((cId === 'canvasDocPage3') ? 'page3' : 'page4'));
    canvas.addEventListener('wheel', function(e) {
      if (!state.images[side] || !state.images[side].originalSrc) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      if (typeof adjustZoom === 'function') {
        adjustZoom(side, delta);
      }
    }, { passive: false });
  });

  // Acciones del Dashboard de Escaneos Guardados
  if ($('btnDashboardQuickSave')) {
    on($('btnDashboardQuickSave'), 'click', async function() {
      const sel = $('selectRetentionDays');
      const days = sel ? parseInt(sel.value, 10) : 3;
      if (typeof saveScanToStorage === 'function') {
        await saveScanToStorage(state.documentCustomTitle || null, days);
      }
    });
  }

  if ($('btnDashboardOpenModal')) {
    on($('btnDashboardOpenModal'), 'click', function() {
      openModal('historyModal');
      if (typeof renderHistoryUI === 'function') renderHistoryUI();
    });
  }

  // Live camera actions
  on($('btnSwitchCam'), 'click', switchCameraFacing);
  on($('btnCapture'), 'click', captureLivePhoto);

  // Export actions
  on($('btnPrintDirect'), 'click', handlePrintDirect);
  on($('btnShare'), 'click', function(){ handleExportPDF(true); });
  on($('btnDownload'), 'click', function(){ handleExportPDF(false); });
  if ($('btnDownloadImage')) {
    on($('btnDownloadImage'), 'click', downloadA4Image);
  }

  // Autenticación, Seguridad y Ajustes
  on($('loginForm'), 'submit', handleLoginSubmit);
  on($('btnToggleLoginPass'), 'click', toggleLoginPasswordVisibility);
  on($('btnLogout'), 'click', handleLogout);
  on($('btnOpenSettings'), 'click', openSettingsModal);
  on($('userBadge'), 'click', openSettingsModal);

  // Pestañas de Ajustes
  on($('tabBtnCreds'), 'click', function(){ switchSettingsTab('creds'); });
  on($('tabBtnLog'), 'click', function(){ switchSettingsTab('log'); });
  on($('tabBtnCloud'), 'click', function(){ switchSettingsTab('cloud'); });
  if ($('tabBtnStorage')) {
    on($('tabBtnStorage'), 'click', function(){ switchSettingsTab('storage'); });
  }

  // Refrescar Caché Offline (M-36)
  if ($('btnRefreshAppCache')) {
    on($('btnRefreshAppCache'), 'click', async function() {
      if ('caches' in window) {
        showToast('Verificando y renovando caché offline...', 'info');
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const r of regs) await r.update();
          }
          showToast('✅ Caché renovado con éxito. Todo el sistema está actualizado.', 'success');
          updateStorageTelemetryUI();
        } catch(e) {
          showToast('Caché verificado.', 'info');
        }
      } else {
        showToast('Modo sin conexión listo.', 'info');
      }
    });
  }

  // Guardar Credenciales, Usuarios y Bitácora
  on($('formAddUser'), 'submit', handleAddUser);
  on($('formUpdateCreds'), 'submit', handleUpdateCredentials);
  on($('btnExportLogCsv'), 'click', exportAuditLogCsv);
  on($('btnClearLog'), 'click', clearAuditLog);

  // Botones de Sincronización QR y Trámites Oficiales
  on($('btnOpenReceiveModal'), 'click', openReceiveFromPhoneModal);
  on($('btnOpenDeliveryModal'), 'click', openDigitalDeliveryModal);
  on($('btnOpenFormatRequirements'), 'click', openFormatRequirementsModal);
  on($('btnGenerateDeliveryQr'), 'click', handleGenerateDeliveryQr);

  // Acciones en modal de recepción
  on($('btnCopyReceiveUrl'), 'click', function() {
    if (window.RealScanQrSync) {
      const s = window.RealScanQrSync.getActiveReceiveSession();
      if (s && navigator.clipboard) {
        navigator.clipboard.writeText(s.url);
        showToast('📋 Enlace de carga copiado al portapapeles.', 'success');
      }
    }
  });

  on($('btnTestOpenReceiveUrl'), 'click', function() {
    if (window.RealScanQrSync) {
      const s = window.RealScanQrSync.getActiveReceiveSession();
      if (s) window.open(s.url, '_blank');
    }
  });

  on($('btnRenewReceiveSession'), 'click', function() {
    openReceiveFromPhoneModal({renew:true});
  });

  on($('btnClearQrInbox'), 'click', async function() {
    try {
    if (window.RealScanQrSync) {
      await window.RealScanQrSync.clearInbox();
      showToast('Bandeja de archivos vaciada.', 'info');
    }
    } catch(e){showToast('No se pudo vaciar la bandeja. Comprueba la conexión.', 'error');}
  });

  // Acciones en modal de entrega digital
  on($('btnCopyDeliveryUrl'), 'click', function() {
    if (window.RealScanQrSync) {
      const s = window.RealScanQrSync.getActiveDeliverySession();
      if (s && navigator.clipboard) {
        navigator.clipboard.writeText(s.url);
        showToast('📋 Enlace de descarga copiado al portapapeles.', 'success');
      }
    }
  });

  on($('btnRevokeDeliverySession'), 'click', async function() {
    try {
    if (window.RealScanQrSync) {
      await window.RealScanQrSync.revokeDeliverySession();
      const resultBox = $('deliveryQrResultBox');
      if (resultBox) resultBox.classList.add('hidden');
      showToast('🔒 Enlace de entrega revocado por seguridad.', 'warning');
    }
    } catch(e){showToast('No se confirmó la revocación. Comprueba la conexión.', 'error');}
  });

  // Pestaña y Controles de Sonido (Web Audio API)
  if ($('tabBtnAudio')) {
    on($('tabBtnAudio'), 'click', function(){ switchSettingsTab('audio'); });
  }
  if ($('checkAudioEnabled')) {
    on($('checkAudioEnabled'), 'change', function() {
      if (window.RealScanAudio) window.RealScanAudio.setEnabled(this.checked);
      showToast(this.checked ? '🔊 Alertas sonoras activadas' : '🔇 Alertas sonoras silenciadas', 'info');
    });
  }
  if ($('rangeAudioVolume')) {
    on($('rangeAudioVolume'), 'input', function() {
      const parsedVolume = parseInt(this.value, 10);
      const volPct = Number.isFinite(parsedVolume) ? Math.max(0, Math.min(100, parsedVolume)) : 70;
      const lbl = $('labelAudioVolume');
      if (lbl) lbl.textContent = volPct + '%';
      if (window.RealScanAudio) window.RealScanAudio.setVolume(volPct / 100);
    });
  }
  if ($('btnTestAudioFeedback')) {
    on($('btnTestAudioFeedback'), 'click', function() {
      if (window.RealScanAudio) window.RealScanAudio.testAudio();
    });
  }

  // Selector de Escala de Impresión (%)
  if ($('selectOutputScale')) {
    on($('selectOutputScale'), 'change', function() {
      setPrintScale(this.value);
    });
  }
}

async function updateStorageTelemetryUI() {
  const labelUsed = $('labelStorageUsed');
  const labelQuota = $('labelStorageQuota');
  const barUsage = $('barStorageUsage');
  const labelSw = $('labelSwStatus');

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedMb = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
      const quotaMb = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
      const pct = estimate.quota ? Math.min(100, Math.round(((estimate.usage || 0) / estimate.quota) * 100)) : 0;
      if (labelUsed) labelUsed.textContent = usedMb + ' MB';
      if (labelQuota) labelQuota.textContent = quotaMb + ' MB (' + pct + '% usado)';
      if (barUsage) barUsage.style.width = Math.max(3, pct) + '%';
    } catch(e) {
      if (labelUsed) labelUsed.textContent = 'Disponible';
    }
  } else {
    if (labelUsed) labelUsed.textContent = 'Almacenamiento Local Activo';
  }

  if (labelSw) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      labelSw.textContent = '● Activo y Calibrado (100% Offline)';
      labelSw.className = 'font-bold text-emerald-600 dark:text-emerald-400';
    } else {
      labelSw.textContent = '● Registrándose para soporte offline';
      labelSw.className = 'font-bold text-amber-600 dark:text-amber-400';
    }
  }
}
window.updateStorageTelemetryUI = updateStorageTelemetryUI;

/* ============================================================
   INIT & PWA OFFLINE-FIRST CAPABILITY
   ============================================================ */
let deferredInstallPrompt = null;

function setupPwaSupport() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('sw.js').then(function(reg) {
        console.log('[RealScan] Service Worker registrado exitosamente:', reg.scope);
      }).catch(function(err) {
        window.RealScanDiagnostics?.record('pwa.worker_failed','warning',{errorType:err.name,code:err.code});
      });
    });
  }

  const button = $('btnInstallPwa');
  if (button) button.onclick = async function() {
    window.RealScanDiagnostics?.record('pwa.request');
    const prompt = deferredInstallPrompt;
    if (!prompt) { window.RealScanDiagnostics?.record('pwa.fallback'); openModal('iphoneHelpModal'); return; }
    deferredInstallPrompt = null;
    button.disabled = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      window.RealScanDiagnostics?.record(choice?.outcome === 'accepted' ? 'pwa.accepted' : 'pwa.dismissed');
      showToast(choice?.outcome === 'accepted' ? 'Instalación aceptada por el navegador.' : 'Instalación cancelada. Puedes seguir usando la web.','info');
    } catch(error) {
      window.RealScanDiagnostics?.record('pwa.failed','error',{errorType:error.name,code:error.code});
      openModal('iphoneHelpModal');
      showToast('El navegador no pudo abrir la instalación. Consulta estas opciones.','warning');
    } finally { button.disabled = false; }
  };
  window.addEventListener('beforeinstallprompt',function(event) { event.preventDefault(); deferredInstallPrompt = event; });
  window.addEventListener('appinstalled',function() {
    deferredInstallPrompt = null;
    window.RealScanDiagnostics?.record('pwa.installed');
    showToast('RealScan se instaló como aplicación.','success');
  });
}

const APP_VERSION = window.APP_VERSION || 'v3.4.1';
window.APP_VERSION = APP_VERSION;

function syncAppVersion() {
  const version = window.APP_VERSION || 'v3.4.1';
  ['appVersionHeader', 'appVersionFooter', 'labelSwVersion', 'labelActiveVersionSettings'].forEach(function(id) {
    const el = $(id);
    if (el) {
      if (id === 'appVersionFooter') el.textContent = 'RealScan Pro ' + version;
      else el.textContent = version;
    }
  });
  $$('.app-version-label, [data-app-version]').forEach(function(el) {
    el.textContent = version;
  });
}

function init() {
  syncAppVersion();
  bindEvents();
  setupPwaSupport();
  setMobileStep(1);
  if (typeof checkAuthSession === 'function') checkAuthSession();
  loadPreferences();
  updatePhotoGridStats();
  updatePassportOptionsUI();
  updateMixTwoPhotosUI();
  updateUI();
  if (typeof renderSavedScansDashboard === 'function') renderSavedScansDashboard();

  // Detección de Borrador Activo (M-27)
  try {
    if (typeof getActiveDraft === 'function') {
      const draft = getActiveDraft();
      if (draft && draft.images && Object.values(draft.images).some(x => x && x.originalSrc)) {
        const banner = $('bannerActiveDraftRecovery');
        if (banner) banner.classList.remove('hidden');
      }
    }
  } catch(e) {}
  window.RealScanDiagnostics?.record('app.ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Technical errors are captured by diagnostics.js without customer content.
