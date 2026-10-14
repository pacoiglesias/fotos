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

  if ($('btnApplyWarp')) {
    on($('btnApplyWarp'), 'click', function() {
      if (!warpImage || !window.RealScanEditor || !warpPoints || warpPoints.length !== 4) return;
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
          showToast('No se pudo aplicar la corrección de perspectiva. Revisa que las 4 esquinas formen un cuadrilátero convexo.', 'warning');
        }
      }, 50);
    });
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
  if (state.activeCategory === 'photos') {
    if (cardBackContainer) cardBackContainer.classList.toggle('hidden', !state.mixTwoPhotos);
    if (slot1Title) slot1Title.textContent = state.mixTwoPhotos ? 'Foto 1 (Persona A / Trámite 1)' : 'Foto Oficial (Rostro / Credencial)';
    if (slot2Title) slot2Title.textContent = 'Foto 2 (Persona B / Trámite 2)';
  }
  updateUI();
  savePreferences();
  showToast(state.mixTwoPhotos ? '👥 Modo 2 Fotos activado: 50% Persona A y 50% Persona B' : 'Modo 1 Foto activado', 'info');
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

  // AUDITORÍA ESTRICTA: El sistema limita automáticamente al máximo físico real que cabe en 1 hoja
  if (state.photoCopies > info.maxPerPage) {
    state.photoCopies = info.maxPerPage;
  }

  const badgeMax = $('badgeMaxPhotosFit');
  if (badgeMax) {
    badgeMax.textContent = 'Caben máximo ' + info.maxPerPage + ' en 1 hoja ' + paper.shortName;
  }

  const badgeFill = $('badgeFillA4Count');
  if (badgeFill) {
    badgeFill.textContent = info.maxPerPage + ' fotos (' + paper.shortName + ')';
  }

  updatePhotoPresetButtons(info.maxPerPage);

  const inputCopies = $('inputPhotoCopies');
  if (inputCopies) {
    inputCopies.max = info.maxPerPage;
    inputCopies.value = state.photoCopies;
  }

  const labelEff = $('labelPhotoEfficiency');
  if (labelEff) {
    labelEff.textContent = 'Distribución 1:1: ' + info.cols + ' cols × ' + Math.ceil(state.photoCopies / info.cols) + ' filas • ' + state.photoCopies + '/' + info.maxPerPage + ' en ' + paper.shortName;
  }
}

function setPhotoCopies(num) {
  const spec = getActiveSpec();
  const info = getPhotoLayoutInfo(spec.widthMm, spec.heightMm, 1);
  const maxAllowed = info.maxPerPage;
  const paper = info.paper || { shortName: 'A4' };

  const parsed = parseInt(num, 10) || 1;
  if (parsed > maxAllowed) {
    showToast('⚠️ No es posible: En papel ' + paper.shortName + ' caben máximo ' + maxAllowed + ' fotos (' + spec.shortName + ') a escala 1:1 real.', 'warning');
  }

  const clamped = Math.max(1, Math.min(maxAllowed, parsed));
  state.photoCopies = clamped;

  const inputCopies = $('inputPhotoCopies');
  if (inputCopies) inputCopies.value = clamped;

  $$('.photo-copies-btn').forEach(function(btn) {
    const active = parseInt(btn.getAttribute('data-copies'), 10) === clamped;
    btn.classList.toggle('is-active', active);
  });

  updatePhotoGridStats();
  updateUI();
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
    if (state.photoCopies > info.maxPerPage) {
      state.photoCopies = info.maxPerPage;
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

  // 3. Renderizado según Categoría
  if (state.activeCategory === 'photos') {
    if (tag) tag.textContent = spec.widthMm + ' × ' + spec.heightMm + ' mm (' + state.photoCopies + ' fotos)';
    if (previewSubtext) {
      previewSubtext.textContent = (layout ? layout.summary : ('Planilla de ' + state.photoCopies + ' fotos')) + (totalPages > 1 ? (' • Viendo Hoja ' + (activePage ? activePage.pageNumber : 1) + ' de ' + totalPages) : '');
    }
    if (canvasFront) canvasFront.classList.add('hidden');
    if (canvasBack) canvasBack.classList.add('hidden');
    if (canvasPage3) canvasPage3.classList.add('hidden');
    if (canvasPage4) canvasPage4.classList.add('hidden');
    if (photosGridContainer) photosGridContainer.classList.remove('hidden');

    if (photosGridInner && activePage) {
      photosGridInner.innerHTML = '';
      const placements = activePage.placements || [];
      const cols = (placements.length <= 2) ? Math.min(2, placements.length) : ((placements.length <= 6) ? 3 : 4);
      photosGridInner.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';

      const ratio = spec.widthMm + ' / ' + spec.heightMm;
      let minH = '44px';
      if (placements.length > 20) minH = '24px';
      else if (placements.length > 12) minH = '30px';
      else if (placements.length > 6) minH = '36px';

      placements.forEach(function(item) {
        const currentImgSrc = (state.images[item.slot] && state.images[item.slot].processedDataUrl)
          ? state.images[item.slot].processedDataUrl
          : null;

        const cell = document.createElement('div');
        if (item.isOval) {
          cell.className = 'border-2 border-dashed border-amber-400 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-950/30 rounded-full flex items-center justify-center relative overflow-hidden transition-all shadow-xs';
          cell.style.borderRadius = '50%';
        } else {
          cell.className = (state.includeCutMarks !== false)
            ? 'border border-dashed border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 rounded flex items-center justify-center relative overflow-hidden transition-all shadow-xs'
            : 'border border-transparent bg-slate-50 dark:bg-slate-900 rounded flex items-center justify-center relative overflow-hidden transition-all';
        }
        cell.style.aspectRatio = ratio;
        cell.style.minHeight = minH;

        if (currentImgSrc) {
          const im = document.createElement('img');
          im.src = currentImgSrc;
          im.className = item.isOval ? 'w-full h-full object-cover rounded-full' : 'w-full h-full object-cover rounded-[1px]';
          if (item.isOval) im.style.borderRadius = '50%';
          im.alt = 'Foto ' + item.slotNumber;
          cell.appendChild(im);
          if (placements.length <= 24) {
            const b = document.createElement('span');
            b.className = 'absolute bottom-0.5 right-0.5 text-[6.5px] font-mono text-indigo-700 bg-white/90 px-0.5 rounded shadow-xs font-bold leading-none';
            b.textContent = item.tag ? (item.tag + '#' + item.slotNumber) : ('#' + item.slotNumber);
            cell.appendChild(b);
          }
        } else {
          const slotName = item.tag ? ('FOTO ' + item.tag + '#' + item.slotNumber) : ('#' + item.slotNumber);
          cell.innerHTML = '<div class="text-center p-0.5"><span class="text-[8px] font-bold text-indigo-700 dark:text-indigo-300">' + slotName + '</span></div>';
        }
        photosGridInner.appendChild(cell);
      });
    }
  } else {
    // Modo Documentos y Medidas Personalizadas
    if (photosGridContainer) photosGridContainer.classList.add('hidden');

    if (tag) tag.textContent = spec.widthMm + ' × ' + spec.heightMm + ' mm' + (state.activeCategory === 'custom' ? ' (Personalizada)' : '');
    if (previewSubtext) {
      previewSubtext.textContent = (layout ? layout.summary : (spec.shortName + ' a escala 1:1 real')) + (totalPages > 1 ? (' • Viendo Hoja ' + (activePage ? activePage.pageNumber : 1) + ' de ' + totalPages) : '');
    }

    const visibleSlots = (activePage && activePage.placements) ? activePage.placements.map(function(p){ return p.slot; }) : ['front'];

    if (canvasFront) canvasFront.classList.toggle('hidden', !visibleSlots.includes('front'));
    if (canvasBack) canvasBack.classList.toggle('hidden', !visibleSlots.includes('back'));
    if (canvasPage3) canvasPage3.classList.toggle('hidden', !visibleSlots.includes('page3'));
    if (canvasPage4) canvasPage4.classList.toggle('hidden', !visibleSlots.includes('page4'));

    // Escala geométrica milimétrica rigurosa respecto al ancho del papel activo
    const scalePercent = Math.max(38, Math.min(94, (spec.widthMm / paper.widthMm) * 100));
    const ratio = spec.widthMm + ' / ' + spec.heightMm;

    ['canvasDocFront', 'canvasDocBack', 'canvasDocPage3', 'canvasDocPage4'].forEach(function(cId) {
      const cEl = $(cId);
      if (cEl) {
        cEl.style.width = scalePercent + '%';
        cEl.style.aspectRatio = ratio;
        cEl.style.minHeight = 'auto';

        // Silueta limpia si las marcas de corte están desactivadas
        if (state.includeCutMarks === false && state.includeDocLabels === false && state.includeRulerFooter === false) {
          cEl.classList.remove('border-dashed', 'border-indigo-400', 'border-amber-400', 'border-purple-400', 'border-teal-400');
          cEl.classList.add('border-slate-200/40');
        }
      }
    });
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
function setupDragToPan(canvasId, side) {
  const el = $(canvasId);
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

  // Etapa 4: Herramientas avanzadas de edición (M-22 a M-26)
  initWarpCanvasEvents();

  $$('.warp-btn').forEach(function(btn) {
    on(btn, 'click', function() {
      const side = btn.getAttribute('data-warp');
      if (side) openPerspectiveWarpModal(side);
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
        console.warn('[RealScan] Registro de Service Worker omitido:', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = $('btnInstallPwa');
    if (btn) {
      btn.classList.remove('hidden');
      btn.onclick = async function() {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          showToast('¡Gracias por instalar RealScan! Ahora disponible 100% offline.', 'success');
        }
        deferredInstallPrompt = null;
        btn.classList.add('hidden');
      };
    }
  });

  window.addEventListener('appinstalled', function() {
    showToast('¡RealScan instalado como aplicación de escritorio/móvil!', 'success');
    const btn = $('btnInstallPwa');
    if (btn) btn.classList.add('hidden');
  });
}

function init() {
  const vEl = $('appVersionHeader');
  if (vEl && window.APP_VERSION) vEl.textContent = window.APP_VERSION;
  bindEvents();
  setupPwaSupport();
  if (typeof checkAuthSession === 'function') checkAuthSession();
  loadPreferences();
  updatePhotoGridStats();
  updatePassportOptionsUI();
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Red de seguridad: log de errores no capturados
window.addEventListener('error', function(ev) {
  console.warn('[RealScan] Error capturado:', ev.message);
});
