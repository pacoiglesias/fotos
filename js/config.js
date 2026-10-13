/* ============================================================
   RealScan Pro — Configuración Global y Estado
   Desarrollado por Paco Iglesias • Escala 1:1 Calibrada
   ============================================================ */

window.APP_VERSION = 'v2.6.0-Enterprise';
window.AUTH_STORAGE_KEY = 'realscan_auth_v2';
window.AUDIT_STORAGE_KEY = 'realscan_audit_log_v1';
window.PREFS_KEY = 'realscan_prefs_v2';
window.DEFAULT_USER = 'admin';
window.DEFAULT_PIN = '1313';
window.DEFAULT_PIN_HASH = '1cfafff6d51a03662b85b93dc3417f51687034ba9a46682f5328257eff7133ed'; // sha256('1313')
window.LEGACY_PIN_HASH = '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab'; // sha256('2026')
window.TARGET_DPI = 300;
window.MAX_OUT_PX = 4000;

// Estado Global de la Aplicación
window.state = {
  activeCategory: 'docs',
  printMode: 'both', // 'both' (2 caras en 1 hoja), 'both_separate' (2 caras en hojas separadas), 'single' (1 cara) o 'multi' (3-4 páginas)
  sheetLayout: 'same_page', // 'same_page' (juntas en 1 hoja A4) o 'separate_pages' (1 por hoja)
  format: 'card',
  photoCopies: 4,
  customWidth: 8.5,
  customHeight: 5.5,
  customUnit: 'cm',
  activeCameraSide: 'front',
  cameraStream: null,
  facingMode: 'environment',
  passportOpenOrientation: 'portrait', // 'portrait' (125 x 176 mm) o 'landscape' (176 x 125 mm)
  passportPageOrientation: 'landscape', // 'landscape' (125 x 88 mm) o 'portrait' (88 x 125 mm)
  documentPageCount: 2, // 1, 2, 3 o 4 páginas/caras
  images: {
    front: { rawOriginalSrc:null, croppedSrc:null, isCropApplied:true, originalSrc:null, processedDataUrl:null, naturalWidth:0, naturalHeight:0, rotation:0, zoom:1.0, filter:'color', panX:0, panY:0, showOaciGuide:false },
    back:  { rawOriginalSrc:null, croppedSrc:null, isCropApplied:true, originalSrc:null, processedDataUrl:null, naturalWidth:0, naturalHeight:0, rotation:0, zoom:1.0, filter:'color', panX:0, panY:0, showOaciGuide:false },
    page3: { rawOriginalSrc:null, croppedSrc:null, isCropApplied:true, originalSrc:null, processedDataUrl:null, naturalWidth:0, naturalHeight:0, rotation:0, zoom:1.0, filter:'color', panX:0, panY:0, showOaciGuide:false },
    page4: { rawOriginalSrc:null, croppedSrc:null, isCropApplied:true, originalSrc:null, processedDataUrl:null, naturalWidth:0, naturalHeight:0, rotation:0, zoom:1.0, filter:'color', panX:0, panY:0, showOaciGuide:false }
  },
  mixTwoPhotos: false
};

// Catálogo de Formatos Oficiales Calibrados
window.FORMAT_SPECS = {
  card:            { category:'docs',   name:'Tarjetas Estándar (DNI, INE, Licencias Puebla/España, Bancarias)', shortName:'DNI / INE / Licencia', fileName:'tarjeta_identificacion_a4', widthMm:85.6, heightMm:53.98 },
  passport_open:   { category:'docs',   name:'Pasaporte ABIERTO (Doble Página / Libreta Completa)', shortName:'Pasaporte Abierto', fileName:'pasaporte_abierto_a4', widthMm:125.0, heightMm:176.0 },
  passport:        { category:'docs',   name:'Pasaporte (Páginas Individuales, Visas y Sellos)', shortName:'Pasaporte (1-4 Págs)', fileName:'pasaporte_paginas_a4', widthMm:125.0, heightMm:88.0 },
  document_a6:     { category:'docs',   name:'Documento A6 / Cuartilla', shortName:'Documento A6', fileName:'documento_a6_a4', widthMm:148.0, heightMm:105.0 },
  business_card:   { category:'docs',   name:'Tarjetas de Visita / Presentación (1 Cara o 2 Caras)', shortName:'Tarjeta de Visita (1-2 Caras)', fileName:'tarjeta_visita_a4', widthMm:90.0, heightMm:50.0 },
  photo_infantil:  { category:'photos', name:'Foto Infantil (México - 2.5 × 3.0 cm)', shortName:'Foto Infantil (2.5×3cm)', fileName:'foto_infantil_mexico', widthMm:25.0, heightMm:30.0 },
  photo_carnet:    { category:'photos', name:'Foto Carnet / DNI (España / UE - 2.6 × 3.2 cm)', shortName:'Foto Carnet / DNI (2.6×3.2cm)', fileName:'foto_carnet_espana', widthMm:26.0, heightMm:32.0 },
  photo_passport:  { category:'photos', name:'Foto Pasaporte / Cartilla (OACI/ICAO - 3.5 × 4.5 cm)', shortName:'Foto Pasaporte (3.5×4.5cm)', fileName:'foto_pasaporte_oaci', widthMm:35.0, heightMm:45.0 },
  photo_visa_usa:  { category:'photos', name:'Foto Visa EE.UU. (2×2 pulgadas / 5.1 × 5.1 cm)', shortName:'Foto Visa USA (5.1×5.1cm)', fileName:'foto_visa_usa', widthMm:50.8, heightMm:50.8 },
  photo_titulo:    { category:'photos', name:'Foto Título / Diploma (México - 6.0 × 9.0 cm)', shortName:'Foto Título (6×9cm)', fileName:'foto_titulo_diploma', widthMm:60.0, heightMm:90.0 },
  photo_credencial:{ category:'photos', name:'Foto Tamaño Credencial (3.5 × 5.0 cm)', shortName:'Foto Credencial (3.5×5cm)', fileName:'foto_credencial', widthMm:35.0, heightMm:50.0 },
  custom:          { category:'custom', name:'Medida Personalizada', shortName:'Personalizada', fileName:'documento_personalizado', widthMm:85.0, heightMm:55.0 }
};

/* Especificación Activa según Estado */
function getActiveSpec() {
  if (state.activeCategory === 'custom') {
    const w = (state.customUnit === 'cm') ? state.customWidth * 10 : state.customWidth;
    const h = (state.customUnit === 'cm') ? state.customHeight * 10 : state.customHeight;
    return {
      category: 'custom',
      name: 'Medida Personalizada (' + state.customWidth + ' × ' + state.customHeight + ' ' + state.customUnit + ')',
      shortName: 'Personalizada ' + state.customWidth + '×' + state.customHeight + state.customUnit,
      fileName: 'documento_personalizado',
      widthMm: Math.round(w * 10) / 10,
      heightMm: Math.round(h * 10) / 10
    };
  }
  if (state.format === 'passport_open') {
    const isLandscape = state.passportOpenOrientation === 'landscape';
    return {
      category: 'docs',
      name: 'Pasaporte ABIERTO (' + (isLandscape ? 'Doble Pág. Horizontal 17.6 × 12.5 cm' : 'Doble Pág. Vertical 12.5 × 17.6 cm') + ')',
      shortName: 'Pasaporte Abierto (' + (isLandscape ? '17.6×12.5cm' : '12.5×17.6cm') + ')',
      fileName: 'pasaporte_abierto_a4',
      widthMm: isLandscape ? 176.0 : 125.0,
      heightMm: isLandscape ? 125.0 : 176.0,
      orientation: isLandscape ? 'landscape' : 'portrait'
    };
  }
  if (state.format === 'passport') {
    const isPortrait = state.passportPageOrientation === 'portrait';
    return {
      category: 'docs',
      name: 'Pasaporte 1 Página (' + (isPortrait ? 'Vertical 8.8 × 12.5 cm' : 'Horizontal 12.5 × 8.8 cm') + ')',
      shortName: 'Pasaporte 1 Pág (' + (isPortrait ? '8.8×12.5cm' : '12.5×8.8cm') + ')',
      fileName: 'pasaporte_1_pagina_a4',
      widthMm: isPortrait ? 88.0 : 125.0,
      heightMm: isPortrait ? 125.0 : 88.0,
      orientation: isPortrait ? 'portrait' : 'landscape'
    };
  }
  return FORMAT_SPECS[state.format] || FORMAT_SPECS.card;
}

/* ============================================================
   UTILIDADES DOM Y NOTIFICACIONES
   ============================================================ */
function $(id) { return document.getElementById(id); }
function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts || false); }

function showToast(message, type) {
  type = type || 'info';
  const toast = $('statusToast');
  if (!toast) return;
  toast.className = 'text-xs py-2 px-3 rounded-lg text-center font-medium block transition-all ';
  if (type === 'success') toast.className += 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800';
  else if (type === 'warning') toast.className += 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800';
  else toast.className += 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800';
  toast.textContent = message;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function(){ toast.classList.add('hidden'); }, 5000);
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  try { localStorage.setItem('realscan_theme', isDark ? 'dark' : 'light'); } catch(e) {}
  const meta = $('metaThemeColor');
  if (meta) meta.setAttribute('content', isDark ? '#0f172a' : '#4f46e5');
  showToast(isDark ? '🌙 Modo Oscuro activado' : '☀️ Modo Claro activado', 'info');
}

/* ============================================================
   MODALES (con focus trap básico + Escape + ARIA)
   ============================================================ */
let lastFocusedEl = null;

function openModal(id) {
  const m = $(id);
  if (!m) return;
  lastFocusedEl = document.activeElement;
  m.classList.remove('hidden');
  document.body.classList.add('modal-open');
  const focusable = m.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable) focusable.focus(); else m.focus();
}

function closeModal(id) {
  const m = $(id);
  if (!m) return;
  m.classList.add('hidden');
  document.body.classList.remove('modal-open');
  if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
}

function anyModalOpen() {
  return !!document.querySelector('[role="dialog"]:not(.hidden)');
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && anyModalOpen()) {
    $$('[role="dialog"]:not(.hidden)').forEach(function(m){
      if (m.id === 'liveCameraModal' && typeof closeLiveCamera === 'function') closeLiveCamera();
      else closeModal(m.id);
    });
  }
});

document.addEventListener('click', function(e) {
  const t = e.target.closest('[data-close-modal]');
  if (!t) return;
  const id = t.getAttribute('data-close-modal');
  if (id === 'liveCameraModal' && typeof closeLiveCamera === 'function') closeLiveCamera();
  else closeModal(id);
});
