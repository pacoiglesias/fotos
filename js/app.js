/* ============================================================
   RealScan Pro — Aplicación Principal, Layout e Inicialización
   Desarrollado por Paco Iglesias • Escala 1:1 Calibrada
   ============================================================ */

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
    if (slot1Title) slot1Title.textContent = 'Anverso (Frente)';
    if (slot2Title) slot2Title.textContent = 'Reverso (Atrás / Vuelta)';
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
  const availW = 190;
  const availH = 222;
  const gap = targetW < 30 ? 3.5 : (targetW < 55 ? 4.0 : 5.0);

  const maxCols = Math.max(1, Math.floor((availW + gap) / (targetW + gap)));
  const maxRows = Math.max(1, Math.floor((availH + gap) / (targetH + gap)));
  const maxPerPage = maxCols * maxRows;

  let cols = maxCols;
  if (copies === 1) cols = 1;
  else if (copies === 2) cols = Math.min(2, maxCols);
  else if (copies <= 4) cols = Math.min(2, maxCols);
  else if (copies <= 6) cols = Math.min(3, maxCols);
  else if (copies <= 8) cols = Math.min(4, maxCols);
  else if (copies <= 12 && maxCols >= 4) cols = 4;
  else if (copies <= 16 && maxCols >= 4) cols = 4;
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
    pages: pages
  };
}

function updatePhotoGridStats() {
  const spec = getActiveSpec();
  const info = getPhotoLayoutInfo(spec.widthMm, spec.heightMm, state.photoCopies);

  const badgeMax = $('badgeMaxPhotosFit');
  if (badgeMax) {
    badgeMax.textContent = 'Caben hasta ' + info.maxPerPage + ' fotos';
  }

  const badgeFill = $('badgeFillA4Count');
  if (badgeFill) {
    badgeFill.textContent = info.maxPerPage + ' fotos';
  }

  const btnPreset36 = $('btnPreset36');
  if (btnPreset36) {
    btnPreset36.setAttribute('data-copies', info.maxPerPage);
    const pTitle = btnPreset36.querySelector('.title-main');
    if (pTitle) pTitle.textContent = info.maxPerPage + ' Fotos';
  }

  const inputCopies = $('inputPhotoCopies');
  if (inputCopies && parseInt(inputCopies.value, 10) !== state.photoCopies) {
    inputCopies.value = state.photoCopies;
  }

  const labelEff = $('labelPhotoEfficiency');
  if (labelEff) {
    const pageText = info.pages === 1 ? '1 página A4' : (info.pages + ' páginas A4');
    labelEff.textContent = 'Distribución: ' + info.cols + ' cols × ' + info.rows + ' filas • ' + pageText;
  }
}

function setPhotoCopies(num) {
  const clamped = Math.max(1, Math.min(48, parseInt(num, 10) || 4));
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
    if (slot1) slot1.textContent = 'Anverso (Frente con Foto)';
    if (slot2) slot2.textContent = 'Reverso (Atrás / Huella / Código)';
    if (slot3) slot3.textContent = 'Documento 2: Anverso';
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
    photo_visa_usa: 'Foto Visa USA 2"×2" seleccionada (5.1 × 5.1 cm).'
  }[formatKey];
  if (msg) showToast(msg, 'info');

  if (state.activeCategory === 'photos') {
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
   UI: VISTA PREVIA A4
   ============================================================ */
function updateUI() {
  const spec = getActiveSpec();
  const tag = $('previewDimensionsTag');
  const canvasFront = $('canvasDocFront');
  const canvasBack = $('canvasDocBack');
  const photosGridContainer = $('canvasDocPhotosGrid');
  const photosGridInner = $('photosGridInner');
  const previewSubtext = $('previewSubtext');

  if (state.activeCategory === 'photos') {
    const info = getPhotoLayoutInfo(spec.widthMm, spec.heightMm, state.photoCopies);
    if (tag) tag.textContent = spec.widthMm + ' × ' + spec.heightMm + ' mm (' + state.photoCopies + ' fotos)';
    if (previewSubtext) previewSubtext.textContent = 'Planilla de ' + state.photoCopies + ' fotos (' + spec.shortName + ') con guías de corte';
    if (canvasFront) canvasFront.classList.add('hidden');
    if (canvasBack) canvasBack.classList.add('hidden');
    if (photosGridContainer) photosGridContainer.classList.remove('hidden');

    if (photosGridInner) {
      photosGridInner.innerHTML = '';
      const cols = info.cols;
      photosGridInner.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';

      const totalMmW = cols * spec.widthMm + (cols - 1) * info.gap;
      const totalWidthPercent = Math.min(96, Math.max(34, (totalMmW / 210) * 100));
      if (photosGridContainer) photosGridContainer.style.width = totalWidthPercent + '%';
      const ratio = spec.widthMm + ' / ' + spec.heightMm;
      const frontImgSrc = state.images.front.processedDataUrl;
      const backImgSrc = (state.mixTwoPhotos && state.images.back.processedDataUrl) ? state.images.back.processedDataUrl : null;
      const halfCopies = Math.floor(state.photoCopies / 2);

      let minH = '48px';
      if (state.photoCopies > 24) minH = '24px';
      else if (state.photoCopies > 12) minH = '32px';
      else if (state.photoCopies > 6) minH = '38px';

      for (let i = 0; i < state.photoCopies; i++) {
        const useBack = (state.mixTwoPhotos && i >= halfCopies);
        const currentImgSrc = useBack ? backImgSrc : frontImgSrc;
        const photoNum = useBack ? (i - halfCopies + 1) : (i + 1);
        const personTag = state.mixTwoPhotos ? (useBack ? 'B' : 'A') : '';

        const cell = document.createElement('div');
        cell.className = 'border border-dashed border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 rounded flex items-center justify-center relative overflow-hidden transition-all shadow-xs';
        cell.style.aspectRatio = ratio;
        cell.style.minHeight = minH;

        if (currentImgSrc) {
          const im = document.createElement('img');
          im.src = currentImgSrc;
          im.className = 'w-full h-full object-cover rounded-[1px]';
          im.alt = 'Foto ' + (i+1);
          cell.appendChild(im);
          if (state.photoCopies <= 24) {
            const b = document.createElement('span');
            b.className = 'absolute bottom-0.5 right-0.5 text-[6.5px] font-mono text-indigo-700 bg-white/90 px-0.5 rounded shadow-xs font-bold leading-none';
            b.textContent = personTag ? (personTag + '#' + photoNum) : ('#' + (i+1));
            cell.appendChild(b);
          }
        } else {
          const slotName = personTag ? ('FOTO ' + personTag + '#' + photoNum) : ('#' + (i+1));
          cell.innerHTML = '<div class="text-center p-0.5"><span class="text-[8px] font-bold text-indigo-700 dark:text-indigo-300">' + slotName + '</span></div>';
        }
        photosGridInner.appendChild(cell);
      }
    }
  } else {
    if (photosGridContainer) photosGridContainer.classList.add('hidden');
    if (canvasFront) canvasFront.classList.remove('hidden');

    if (state.activeCategory === 'custom') {
      if (tag) tag.textContent = spec.widthMm + ' × ' + spec.heightMm + ' mm (Personalizada)';
      if (previewSubtext) previewSubtext.textContent = 'Medida personalizada (' + spec.widthMm + ' × ' + spec.heightMm + ' mm) a escala 1:1 real en 1 hoja A4';
    } else {
      if (tag) tag.textContent = spec.widthMm + ' × ' + spec.heightMm + ' mm';
      const pCount = state.documentPageCount || 2;
      if (pCount === 1) {
        if (previewSubtext) previewSubtext.textContent = 'Solo 1 Cara centrada en 1 hoja A4 a escala 1:1 real';
      } else if (pCount === 2) {
        if (previewSubtext) previewSubtext.textContent = 'Anverso y Reverso alineados en 1 sola hoja A4 a escala 1:1 real';
      } else {
        if (previewSubtext) previewSubtext.textContent = pCount + ' páginas a escala 1:1 real (Págs 1-2 en Hoja 1 • Págs 3-4 en Hoja 2)';
      }
    }
    if (canvasBack) canvasBack.classList.toggle('hidden', state.printMode === 'single');

    const scalePercent = Math.max(38, Math.min(94, (spec.widthMm / 210) * 100));
    const ratio = spec.widthMm + ' / ' + spec.heightMm;
    ['canvasDocFront', 'canvasDocBack', 'canvasDocPage3', 'canvasDocPage4'].forEach(function(cId) {
      const cEl = $(cId);
      if (cEl) {
        cEl.style.width = scalePercent + '%';
        cEl.style.aspectRatio = ratio;
        cEl.style.minHeight = 'auto';
      }
    });
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
      documentCustomTitle: state.documentCustomTitle || ''
    };
    localStorage.setItem(window.PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {}
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem(window.PREFS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p.theme) {
      const isDark = p.theme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      const meta = $('metaThemeColor');
      if (meta) meta.setAttribute('content', isDark ? '#0f172a' : '#4f46e5');
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

  // Atajo de teclado: Ctrl + P para imprimir directo a escala 100%
  on(window, 'keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      handlePrintDirect();
    }
  });

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
  if ($('inputDocumentTitle')) {
    on($('inputDocumentTitle'), 'input', function(e) {
      state.documentCustomTitle = (e.target.value || '').trim();
      savePreferences();
    });
  }
  if ($('btnClearDocTitle')) {
    on($('btnClearDocTitle'), 'click', function() {
      if ($('inputDocumentTitle')) $('inputDocumentTitle').value = '';
      state.documentCustomTitle = '';
      savePreferences();
      showToast('Título del documento restablecido.', 'info');
    });
  }

  // Opciones Oficiales de Impresión (Regla e Instrucciones Opcionales)
  if ($('chkIncludeRulerFooter')) {
    on($('chkIncludeRulerFooter'), 'change', function(e) {
      state.includeRulerFooter = e.target.checked;
      const ruler = $('footerCalibrationRuler');
      if (ruler) {
        ruler.classList.toggle('hidden', !state.includeRulerFooter);
      }
      savePreferences();
      if (!state.includeRulerFooter) {
        showToast('Regla e instrucciones desactivadas: Hoja 100% limpia para trámites oficiales.', 'success');
      } else {
        showToast('Regla de 5 cm e instrucciones activadas en el pie de página.', 'info');
      }
    });
  }

  if ($('chkIncludeDocLabels')) {
    on($('chkIncludeDocLabels'), 'change', function(e) {
      state.includeDocLabels = e.target.checked;
      savePreferences();
      showToast(state.includeDocLabels ? 'Rótulos superiores activados.' : 'Rótulos desactivados para máxima pulcritud.', 'info');
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

  // Guardar Credenciales, Usuarios y Bitácora
  on($('formAddUser'), 'submit', handleAddUser);
  on($('formUpdateCreds'), 'submit', handleUpdateCredentials);
  on($('btnExportLogCsv'), 'click', exportAuditLogCsv);
  on($('btnClearLog'), 'click', clearAuditLog);
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  const vEl = $('appVersionHeader');
  if (vEl && window.APP_VERSION) vEl.textContent = window.APP_VERSION;
  bindEvents();
  if (typeof checkAuthSession === 'function') checkAuthSession();
  loadPreferences();
  updatePhotoGridStats();
  updatePassportOptionsUI();
  updateUI();
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
