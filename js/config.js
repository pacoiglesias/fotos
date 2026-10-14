/* ============================================================
   RealScan Pro — Configuración Global y Estado
   Desarrollado por Paco Iglesias • Escala 1:1 Calibrada
   ============================================================ */

window.APP_VERSION = 'v3.3.0-Enterprise';
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
  paperSize: 'a4', // 'a4', 'letter', 'oficio' (México 215.9x340mm), 'legal' (215.9x355.6mm)
  printMode: 'both', // 'both' (2 caras en 1 hoja), 'both_separate' (2 caras en hojas separadas), 'single' (1 cara) o 'multi' (3-4 páginas)
  sheetLayout: 'same_page', // 'same_page' (juntas en 1 hoja) o 'separate_pages' (1 por hoja)
  includeRulerFooter: true, // true (con regla de 5cm e instrucciones) o false (página 100% limpia para trámites oficiales)
  includeDocLabels: true, // true (con títulos y mm sobre cada cara) o false
  includeCutMarks: true, // true (con marcas y guías de corte en esquinas) o false (hoja 100% limpia)
  previewActivePage: 1, // Página activa en la vista previa interactiva
  documentCustomTitle: '', // Nombre o titular personalizado (ej: "DNI de Juan Pérez")
  duplicateCard: false, // true (2 juegos de copias en 1 hoja: Frente+Vuelta x2)
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
    front: { rawOriginalSrc:null, croppedSrc:null, isCropApplied:true, originalSrc:null, processedDataUrl:null, naturalWidth:0, naturalHeight:0, rotation:0, zoom:1.0, fitMode:'cover', showMmGrid:false, filter:'color', panX:0, panY:0, showOaciGuide:false, brightness:0, contrast:0 },
    back:  { rawOriginalSrc:null, croppedSrc:null, isCropApplied:true, originalSrc:null, processedDataUrl:null, naturalWidth:0, naturalHeight:0, rotation:0, zoom:1.0, fitMode:'cover', showMmGrid:false, filter:'color', panX:0, panY:0, showOaciGuide:false, brightness:0, contrast:0 },
    page3: { rawOriginalSrc:null, croppedSrc:null, isCropApplied:true, originalSrc:null, processedDataUrl:null, naturalWidth:0, naturalHeight:0, rotation:0, zoom:1.0, fitMode:'cover', showMmGrid:false, filter:'color', panX:0, panY:0, showOaciGuide:false, brightness:0, contrast:0 },
    page4: { rawOriginalSrc:null, croppedSrc:null, isCropApplied:true, originalSrc:null, processedDataUrl:null, naturalWidth:0, naturalHeight:0, rotation:0, zoom:1.0, fitMode:'cover', showMmGrid:false, filter:'color', panX:0, panY:0, showOaciGuide:false, brightness:0, contrast:0 }
  },
  mixTwoPhotos: false
};

// Catálogo de Tamaños de Hoja / Papel Físico Calibrados a 300 DPI
window.PAPER_SPECS = {
  a4:     { id:'a4',     name:'A4 Estándar (210 × 297 mm)',       shortName:'A4',         widthMm:210.0, heightMm:297.0, jsPdfFormat:'a4',            icon:'📄', desc:'Estándar Internacional ISO 216' },
  letter: { id:'letter', name:'Carta / Letter (215.9 × 279.4 mm)', shortName:'Carta',      widthMm:215.9, heightMm:279.4, jsPdfFormat:'letter',        icon:'📄', desc:'Estándar México y Norteamérica' },
  oficio: { id:'oficio', name:'Oficio México (215.9 × 340 mm)',    shortName:'Oficio Mex', widthMm:215.9, heightMm:340.0, jsPdfFormat:[215.9, 340.0],  icon:'📜', desc:'Trámites Legales, Notarías y Juzgados Mex' },
  legal:  { id:'legal',  name:'Oficio Legal USA (215.9 × 355.6 mm)',shortName:'Legal USA',  widthMm:215.9, heightMm:355.6, jsPdfFormat:'legal',         icon:'📜', desc:'Formato Legal Extendido (8.5 × 14 in)' }
};

function getActivePaperSpec(st) {
  st = st || (typeof state !== 'undefined' ? state : window.state) || {};
  const ps = window.PAPER_SPECS || {};
  return ps[st.paperSize] || ps.a4;
}

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
  photo_ovalo_titulo: { category:'photos', name:'Foto Óvalo Título / Diploma Grande (México - 6.0 × 9.0 cm)', shortName:'Óvalo Título (6×9cm)', fileName:'foto_ovalo_titulo_diploma', widthMm:60.0, heightMm:90.0, isOval:true },
  photo_ovalo_mignon: { category:'photos', name:'Foto Óvalo Mignon / Diploma Medio (México - 5.0 × 7.0 cm)', shortName:'Óvalo Mignon (5×7cm)', fileName:'foto_ovalo_mignon_diploma', widthMm:50.0, heightMm:70.0, isOval:true },
  photo_ovalo_credencial: { category:'photos', name:'Foto Óvalo Credencial (México - 3.5 × 5.0 cm)', shortName:'Óvalo Credencial (3.5×5cm)', fileName:'foto_ovalo_credencial', widthMm:35.0, heightMm:50.0, isOval:true },
  photo_credencial:{ category:'photos', name:'Foto Tamaño Credencial (3.5 × 5.0 cm)', shortName:'Foto Credencial (3.5×5cm)', fileName:'foto_credencial', widthMm:35.0, heightMm:50.0 },
  custom:          { category:'custom', name:'Medida Personalizada', shortName:'Personalizada', fileName:'documento_personalizado', widthMm:85.0, heightMm:55.0 }
};

/* Especificación Activa según Estado */
function getActiveSpec(st) {
  st = st || (typeof state !== 'undefined' ? state : window.state) || {};
  if (st.activeCategory === 'custom') {
    const w = (st.customUnit === 'cm') ? st.customWidth * 10 : st.customWidth;
    const h = (st.customUnit === 'cm') ? st.customHeight * 10 : st.customHeight;
    return {
      category: 'custom',
      name: 'Medida Personalizada (' + st.customWidth + ' × ' + st.customHeight + ' ' + (st.customUnit || 'cm') + ')',
      shortName: 'Personalizada ' + st.customWidth + '×' + st.customHeight + (st.customUnit || 'cm'),
      fileName: 'documento_personalizado',
      widthMm: Math.round(w * 10) / 10,
      heightMm: Math.round(h * 10) / 10
    };
  }
  if (st.format === 'passport_open') {
    const isLandscape = st.passportOpenOrientation === 'landscape';
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
  if (st.format === 'passport') {
    const isPortrait = st.passportPageOrientation === 'portrait';
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
  const formats = window.FORMAT_SPECS || {};
  return formats[st.format] || formats.card;
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
   MODALES (con focus trap estricto + fondo inerte + Escape + ARIA)
   ============================================================ */
let modalFocusStack = [];

function getModalFocusableElements(container) {
  if (!container) return [];
  const selector = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector)).filter(el => {
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  });
}

function setBackgroundInert(isInert, activeModal) {
  if (typeof document === 'undefined') return;
  const bodyChildren = Array.from(document.body.children);
  bodyChildren.forEach(child => {
    if (child === activeModal || child.contains(activeModal)) return;
    if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return;
    if (isInert) {
      if (!child.hasAttribute('data-prev-inert')) {
        child.setAttribute('data-prev-inert', child.hasAttribute('inert') ? '1' : '0');
        child.setAttribute('data-prev-aria-hidden', child.getAttribute('aria-hidden') || 'none');
      }
      child.setAttribute('inert', '');
      child.setAttribute('aria-hidden', 'true');
    } else {
      const prevInert = child.getAttribute('data-prev-inert');
      const prevAria = child.getAttribute('data-prev-aria-hidden');
      if (prevInert === '0') child.removeAttribute('inert');
      if (prevAria === 'none') child.removeAttribute('aria-hidden');
      else if (prevAria) child.setAttribute('aria-hidden', prevAria);
      child.removeAttribute('data-prev-inert');
      child.removeAttribute('data-prev-aria-hidden');
    }
  });
}

function openModal(id) {
  const m = $(id);
  if (!m) return;
  const currentActive = document.activeElement;
  modalFocusStack.push({ id, triggerEl: currentActive });
  
  m.classList.remove('hidden');
  document.body.classList.add('modal-open');
  setBackgroundInert(true, m);

  if (!m.getAttribute('role')) m.setAttribute('role', 'dialog');
  m.setAttribute('aria-modal', 'true');

  const focusables = getModalFocusableElements(m);
  if (focusables.length > 0) {
    focusables[0].focus();
  } else {
    m.setAttribute('tabindex', '-1');
    m.focus();
  }
}

function closeModal(id) {
  const m = $(id);
  if (!m) return;
  m.classList.add('hidden');
  m.removeAttribute('aria-modal');

  let triggerEl = null;
  const idx = modalFocusStack.findIndex(entry => entry.id === id);
  if (idx !== -1) {
    triggerEl = modalFocusStack[idx].triggerEl;
    modalFocusStack.splice(idx, 1);
  }

  if (modalFocusStack.length === 0) {
    document.body.classList.remove('modal-open');
    setBackgroundInert(false);
  } else {
    const topEntry = modalFocusStack[modalFocusStack.length - 1];
    const topModal = $(topEntry.id);
    if (topModal) setBackgroundInert(true, topModal);
  }

  if (triggerEl && typeof triggerEl.focus === 'function') {
    try { triggerEl.focus(); } catch (e) {}
  }
}

function anyModalOpen() {
  return !!document.querySelector('[role="dialog"]:not(.hidden), .modal:not(.hidden)');
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && anyModalOpen()) {
      e.preventDefault();
      const openModals = Array.from(document.querySelectorAll('[role="dialog"]:not(.hidden), .modal:not(.hidden)'));
      const activeModal = openModals[openModals.length - 1];
      if (activeModal) {
        if (activeModal.id === 'liveCameraModal' && typeof closeLiveCamera === 'function') {
          closeLiveCamera();
        } else {
          closeModal(activeModal.id);
        }
      }
      return;
    }

    if (e.key === 'Tab') {
      const openModals = Array.from(document.querySelectorAll('[role="dialog"]:not(.hidden), .modal:not(.hidden)'));
      if (openModals.length === 0) return;
      const activeModal = openModals[openModals.length - 1];
      const focusables = getModalFocusableElements(activeModal);
      if (focusables.length === 0) {
        e.preventDefault();
        activeModal.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !activeModal.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !activeModal.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });

  document.addEventListener('click', function(e) {
    const t = e.target.closest('[data-close-modal]');
    if (!t) return;
    const id = t.getAttribute('data-close-modal');
    if (id === 'liveCameraModal' && typeof closeLiveCamera === 'function') closeLiveCamera();
    else closeModal(id);
  });
}
