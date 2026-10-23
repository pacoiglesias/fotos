/* ============================================================
   RealScan Pro — Configuración Global y Estado
   Desarrollado por Paco Iglesias • Escala 1:1 Calibrada
   ============================================================ */

window.APP_VERSION = 'v3.17.0';
window.AUTH_STORAGE_KEY = 'realscan_auth_v2';
window.AUDIT_STORAGE_KEY = 'realscan_audit_log_v1';
window.PREFS_KEY = 'realscan_prefs_v2';
window.DEFAULT_USER = 'admin';
// Seguridad (v3.12.0): ya NO existe ninguna credencial por defecto en el código.
// En el primer uso la app exige crear la cuenta de administrador; las instalaciones
// que aún usan la clave de fábrica se detectan en auth.js y se fuerza su cambio.
window.AUTH_GUARD_KEY = 'realscan_auth_guard_v1';
window.AUTH_MAX_FAILED_ATTEMPTS = 5;
window.AUTH_LOCKOUT_MS = 5 * 60 * 1000; // bloqueo temporal tras 5 intentos fallidos
window.IDLE_LOCK_DEFAULT_MINUTES = 10; // bloqueo automático del mostrador por inactividad
window.CALIBRATION_LOG_KEY = 'realscan_calibration_log_v1';
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
  mixTwoPhotos: false,
  photoCopiesPersonA: 2,
  photoCopiesPersonB: 2,
  outputScalePercent: 100, // 100 = 1:1 Tamaño Real Oficial. Otros valores representan copias a escala explícitas.
  audioFeedbackEnabled: true, // Alertas sonoras sutiles con Web Audio API (offline)
  audioVolume: 0.7, // Volumen del sintetizador sonoro (0 a 1)
  digitalDeliveryConfig: {
    format: 'jpg', // 'jpg', 'png' o 'pdf'
    maxDimensionPx: 1920, // Dimensión máxima en píxeles (ancho o alto)
    targetMaxKb: 1024, // Peso máximo orientativo en KB (0 = sin límite estricto)
    quality: 0.9 // Calidad de compresión JPEG/Canvas
  }
};

// Catálogo de Tamaños de Hoja / Papel Físico Calibrados a 300 DPI
window.PAPER_SPECS = {
  a4:          { id:'a4',          name:'A4 Estándar (210 × 297 mm)',             shortName:'A4',         widthMm:210.0, heightMm:297.0, jsPdfFormat:'a4',             icon:'📄', desc:'Estándar Internacional ISO 216' },
  letter:      { id:'letter',      name:'Carta / Letter (215.9 × 279.4 mm)',       shortName:'Carta',      widthMm:215.9, heightMm:279.4, jsPdfFormat:'letter',         icon:'📄', desc:'Estándar México y Norteamérica' },
  oficio:      { id:'oficio',      name:'Oficio México (215.9 × 340 mm)',          shortName:'Oficio Mex', widthMm:215.9, heightMm:340.0, jsPdfFormat:[215.9, 340.0],   icon:'📜', desc:'Trámites Legales, Notarías y Juzgados Mex' },
  legal:       { id:'legal',       name:'Oficio Legal USA (215.9 × 355.6 mm)',      shortName:'Legal USA',  widthMm:215.9, heightMm:355.6, jsPdfFormat:'legal',          icon:'📜', desc:'Formato Legal Extendido (8.5 × 14 in)' },
  photo_10x15: { id:'photo_10x15', name:'Foto 10 × 15 cm Métrico (100.0 × 150.0 mm)', shortName:'10×15 cm', widthMm:100.0, heightMm:150.0, jsPdfFormat:[100.0, 150.0], icon:'🖼️', desc:'Papel Fotográfico Métrico 100 × 150 mm' },
  photo_4x6:   { id:'photo_4x6',   name:'Foto 4 × 6 Pulgadas (101.6 × 152.4 mm)',   shortName:'4×6 pulg',   widthMm:101.6, heightMm:152.4, jsPdfFormat:[101.6, 152.4], icon:'🖼️', desc:'Papel Fotográfico Imperial 4×6 in (101.6 × 152.4 mm)' }
};

function getActivePaperSpec(st) {
  st = st || (typeof state !== 'undefined' ? state : window.state) || {};
  const ps = window.PAPER_SPECS || {};
  return ps[st.paperSize] || ps.a4;
}

// Catálogo de plantillas de tamaño; requisitos sujetos a verificación y sus Especificaciones de Trámite
window.FORMAT_SPECS = {
  card: {
    category: 'docs',
    name: 'Tarjetas Estándar (DNI, INE, Licencias, Bancarias)',
    shortName: 'DNI / INE / Licencia',
    fileName: 'tarjeta_identificacion_a4',
    widthMm: 85.6,
    heightMm: 53.98,
    officialSource: 'ISO/IEC 7810 ID-1 • Instituto Nacional Electoral (INE)',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Impresión en tarjeta plástica o papel de alta densidad al 100% de escala (85.60 × 53.98 mm).',
    reqsDigital: 'Resolución de escaneo mínima de 300 DPI sin deformación de código de barras ni elementos OCR.',
    editingRestrictions: 'Estricto: No alterar textos, sellos, firmas ni fotografías originales.'
  },
  passport_open: {
    category: 'docs',
    name: 'Pasaporte ABIERTO (Doble Página / Libreta Completa)',
    shortName: 'Pasaporte Abierto',
    fileName: 'pasaporte_abierto_a4',
    widthMm: 125.0,
    heightMm: 176.0,
    officialSource: 'OACI Doc 9303 • Formato Estándar de Libreta Abierta',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Libreta desplegada completa incluyendo zona MRZ de lectura mecánica.',
    reqsDigital: 'Captura plana nítida sin curvatura en el lomo.',
    editingRestrictions: 'Prohibido recortar la zona inferior de lectura automática MRZ.'
  },
  passport: {
    category: 'docs',
    name: 'Pasaporte (Página de Datos, Visas y Sellos)',
    shortName: 'Pasaporte (1 Pág)',
    fileName: 'pasaporte_paginas_a4',
    widthMm: 125.0,
    heightMm: 88.0,
    officialSource: 'OACI Doc 9303 • Formato MRP Básico (88 × 125 mm)',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Página individual a tamaño real 88 × 125 mm.',
    reqsDigital: 'Contraste óptico claro en caracteres OCR.',
    editingRestrictions: 'Sin filtros de belleza ni saturación artificial.'
  },
  document_a6: {
    category: 'docs',
    name: 'Documento A6 / Cuartilla',
    shortName: 'Documento A6',
    fileName: 'documento_a6_a4',
    widthMm: 148.0,
    heightMm: 105.0,
    officialSource: 'ISO 216 Formato A6',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Cuartilla 105 × 148 mm a escala completa.',
    reqsDigital: 'Legibilidad completa de párrafos y sellos.',
    editingRestrictions: 'Conservar márgenes originales.'
  },
  business_card: {
    category: 'docs',
    name: 'Tarjetas de Visita / Presentación',
    shortName: 'Tarjeta de Visita',
    fileName: 'tarjeta_visita_a4',
    widthMm: 90.0,
    heightMm: 50.0,
    officialSource: 'Estándar Comercial de Tarjetas de Presentación',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Corte limpio en 90 × 50 mm con guías milimétricas.',
    reqsDigital: 'QR y textos de contacto de alta nitidez.',
    editingRestrictions: 'Libre para diseño publicitario.'
  },
  photo_infantil: {
    category: 'photos',
    name: 'Foto Infantil (México - 2.5 × 3.0 cm)',
    shortName: 'Foto Infantil (2.5×3cm)',
    fileName: 'foto_infantil_mexico',
    widthMm: 25.0,
    heightMm: 30.0,
    officialSource: 'SEP • Trámites Escolares e Institucionales México',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Papel mate o brillante sin brillo excesivo, fondo blanco liso, cabeza centrada.',
    reqsDigital: 'Resolución mínima 300 DPI (aprox. 295 × 354 px).',
    editingRestrictions: 'No alterar fisonomía, manchas permanentes ni cicatrices.'
  },
  photo_carnet: {
    category: 'photos',
    name: 'Foto Carnet / DNI (España / UE - 2.6 × 3.2 cm)',
    shortName: 'Foto Carnet / DNI (2.6×3.2cm)',
    fileName: 'foto_carnet_espana',
    widthMm: 26.0,
    heightMm: 32.0,
    officialSource: 'Ministerio del Interior España • DNI 4.0',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Fondo blanco uniforme, cabeza despejada sin gafas de sol ni prendas que oculten rasgos.',
    reqsDigital: '300 DPI reales, iluminación homogénea sin sombras en rostro.',
    editingRestrictions: 'Prohibida la edición digital de ojos, cabello o piel.'
  },
  photo_passport: {
    category: 'photos',
    name: 'Foto Pasaporte / Cartilla (OACI/ICAO - 3.5 × 4.5 cm)',
    shortName: 'Foto Pasaporte (3.5×4.5cm)',
    fileName: 'foto_pasaporte_oaci',
    widthMm: 35.0,
    heightMm: 45.0,
    officialSource: 'ICAO Doc 9303 • Pasaportes Biométricos',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Rostro entre 31 mm y 36 mm (70-80% de la altura total). Expresión neutra, boca cerrada.',
    reqsDigital: 'Mínimo 600 DPI para trámite consular o 300 DPI impreso.',
    editingRestrictions: 'Estricto: No se admiten filtros, retoques de ojos rojos ni fondos artificiales.'
  },
  photo_visa_usa: {
    category: 'photos',
    name: 'Foto Visa EE.UU. (2×2 pulgadas / 50.8 × 50.8 mm)',
    shortName: 'Foto Visa USA (5.1×5.1cm)',
    fileName: 'foto_visa_usa',
    widthMm: 50.8,
    heightMm: 50.8,
    officialSource: 'U.S. Department of State • Travel.state.gov',
    reviewDate: 'Octubre 2026',
    reqsPhysical: '2 × 2 pulgadas cuadradas. Cabeza entre 1 pulgada y 1 3/8 pulgadas (25 a 35 mm).',
    reqsDigital: 'Cuadrada: mínimo 600 × 600 px, máximo 1200 × 1200 px, sRGB de 24 bits.',
    editingRestrictions: 'Cero anteojos/gafas (incluso graduadas), fondo blanco o blanquecino puro.'
  },
  photo_titulo: {
    category: 'photos',
    name: 'Foto Título / Diploma (México - 6.0 × 9.0 cm)',
    shortName: 'Foto Título (6×9cm)',
    fileName: 'foto_titulo_diploma',
    widthMm: 60.0,
    heightMm: 90.0,
    officialSource: 'Dirección General de Profesiones • SEP México',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Fondo gris claro o blanco según institución, vestimenta formal oscura.',
    reqsDigital: 'Alto detalle en rostro y vestimenta a 300 DPI.',
    editingRestrictions: 'Respetar peinado formal y frente despejada según reglamento.'
  },
  photo_ovalo_titulo: {
    category: 'photos',
    name: 'Foto Óvalo Título Grande (México - 6.0 × 9.0 cm)',
    shortName: 'Óvalo Título (6×9cm)',
    fileName: 'foto_ovalo_titulo_diploma',
    widthMm: 60.0,
    heightMm: 90.0,
    isOval: true,
    officialSource: 'Universidades y Colegios Profesionales México',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Óvalo de corte oficial con esquinas exteriores blancas.',
    reqsDigital: 'Encuadre oval simétrico.',
    editingRestrictions: 'No desplazar el óvalo fuera del eje facial.'
  },
  photo_ovalo_mignon: {
    category: 'photos',
    name: 'Foto Óvalo Mignon / Diploma Medio (México - 5.0 × 7.0 cm)',
    shortName: 'Óvalo Mignon (5×7cm)',
    fileName: 'foto_ovalo_mignon_diploma',
    widthMm: 50.0,
    heightMm: 70.0,
    isOval: true,
    officialSource: 'Trámites Universitarios México',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Corte ovalado oficial 50 × 70 mm.',
    reqsDigital: 'Ajuste elíptico proporcional.',
    editingRestrictions: 'Conservar proporciones naturales de la fisonomía.'
  },
  photo_ovalo_credencial: {
    category: 'photos',
    name: 'Foto Óvalo Credencial (México - 3.5 × 5.0 cm)',
    shortName: 'Óvalo Credencial (3.5×5cm)',
    fileName: 'foto_ovalo_credencial',
    widthMm: 35.0,
    heightMm: 50.0,
    isOval: true,
    officialSource: 'Credenciales Institucionales México',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Óvalo recortable 35 × 50 mm.',
    reqsDigital: 'Resolución de retrato centrada.',
    editingRestrictions: 'Sin modificaciones anatómicas.'
  },
  photo_credencial: {
    category: 'photos',
    name: 'Foto Tamaño Credencial (3.5 × 5.0 cm)',
    shortName: 'Foto Credencial (3.5×5cm)',
    fileName: 'foto_credencial',
    widthMm: 35.0,
    heightMm: 50.0,
    officialSource: 'Credencialización General',
    reviewDate: 'Octubre 2026',
    reqsPhysical: 'Rectángulo 35 × 50 mm con guías punteadas.',
    reqsDigital: 'Retrato nítido a 300 DPI.',
    editingRestrictions: 'Sin filtros de distorsión.'
  },
  custom: {
    category: 'custom',
    name: 'Medida Personalizada',
    shortName: 'Personalizada',
    fileName: 'documento_personalizado',
    widthMm: 85.0,
    heightMm: 55.0,
    officialSource: 'Definido por el Usuario',
    reviewDate: 'Dinámico',
    reqsPhysical: 'Dimensiones libres introducidas en milímetros o centímetros.',
    reqsDigital: 'Verificación geométrica contra los límites del papel elegido.',
    editingRestrictions: 'Sujeto al criterio del trámite específico.'
  }
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
  const activeModal = typeof getTopModal === 'function' ? getTopModal() : null;
  if (activeModal) {
    let feedback = activeModal.querySelector('[data-modal-feedback]');
    if (!feedback) { feedback = document.createElement('p'); feedback.setAttribute('data-modal-feedback', ''); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); feedback.className = 'text-xs p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 shrink-0'; activeModal.firstElementChild?.appendChild(feedback); }
    feedback.textContent = message;
  }
  if (type === 'error' || type === 'warning') window.RealScanDiagnostics?.record('ui.feedback', type === 'error' ? 'error' : 'warning', { modal: activeModal?.id });
  
  // Feedback sonoro accesible diferenciado (Web Audio API)
  if (typeof window !== 'undefined' && window.RealScanAudio) {
    if (type === 'success') window.RealScanAudio.playSuccess();
    else if (type === 'warning') window.RealScanAudio.playWarning();
    else if (type === 'error') window.RealScanAudio.playError();
  }

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
  const children = Array.from(document.body.children);
  // Restore the baseline first, including the dialog which becomes active next.
  children.forEach(function(child) {
    const previous = child.getAttribute('data-prev-inert');
    if (previous === null) return;
    if (previous === '0') child.removeAttribute('inert');
    else child.setAttribute('inert', '');
    const aria = child.getAttribute('data-prev-aria-hidden');
    if (aria === 'none') child.removeAttribute('aria-hidden');
    else if (aria !== null) child.setAttribute('aria-hidden', aria);
    child.removeAttribute('data-prev-inert');
    child.removeAttribute('data-prev-aria-hidden');
  });
  if (!isInert || !activeModal) return;
  children.forEach(function(child) {
    if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return;
    child.setAttribute('data-prev-inert', child.hasAttribute('inert') ? '1' : '0');
    child.setAttribute('data-prev-aria-hidden', child.getAttribute('aria-hidden') === null ? 'none' : child.getAttribute('aria-hidden'));
    if (child === activeModal || child.contains(activeModal)) {
      child.removeAttribute('inert');
      child.removeAttribute('aria-hidden');
    } else {
      child.setAttribute('inert', '');
      child.setAttribute('aria-hidden', 'true');
    }
  });
}

function getTopModal() {
  for (let i = modalFocusStack.length - 1; i >= 0; i--) {
    const modal = $(modalFocusStack[i].id);
    if (modal && !modal.classList.contains('hidden') && modal.isConnected !== false) return modal;
  }
  return null;
}

function syncModalState() {
  modalFocusStack = modalFocusStack.filter(function(entry) {
    const modal = $(entry.id);
    return modal && !modal.classList.contains('hidden') && modal.isConnected !== false;
  });
  const active = getTopModal();
  setBackgroundInert(!!active, active);
  modalFocusStack.forEach(function(entry, index) {
    const modal = $(entry.id);
    if (modal.style) modal.style.zIndex = String(100 + index);
    modal.setAttribute('aria-modal', modal === active ? 'true' : 'false');
  });
  const login = $('loginOverlay');
  if (active || (login && !login.classList.contains('hidden'))) document.body.classList.add('modal-open');
  else document.body.classList.remove('modal-open');
  return active;
}

function focusModal(modal) {
  const controls = getModalFocusableElements(modal);
  if (controls.length) controls[0].focus();
  else { modal.setAttribute('tabindex', '-1'); modal.focus(); }
}

function openModal(id) {
  const modal = $(id);
  if (!modal) return;
  const previous = modalFocusStack.find(function(entry) { return entry.id === id; });
  // Reopening or renewing a dialog is idempotent: one entry per dialog.
  modalFocusStack = modalFocusStack.filter(function(entry) { return entry.id !== id; });
  modalFocusStack.push(previous || { id: id, triggerEl: document.activeElement, zIndex: modal.style ? modal.style.zIndex : '' });
  modal.classList.remove('hidden');
  if (!modal.getAttribute('role')) modal.setAttribute('role', 'dialog');
  syncModalState();
  focusModal(modal);
  window.RealScanDiagnostics?.record('modal.open', 'info', { modal: id, depth: modalFocusStack.length });
}

function closeModal(id) {
  if(id==="localOcrModal")window.RealScanOcr?.cancel();
  if(id==="localTransferModal")window.RealScanLocalTransfer?.stopCamera();
  const modal = $(id);
  if (!modal) return;
  const entries = modalFocusStack.filter(function(entry) { return entry.id === id; });
  modalFocusStack = modalFocusStack.filter(function(entry) { return entry.id !== id; });
  modal.classList.add('hidden');
  modal.removeAttribute('aria-modal');
  if (modal.style && entries.length) modal.style.zIndex = entries[0].zIndex || '';
  const active = syncModalState();
  const trigger = entries[0]?.triggerEl;
  if (active) {
    if (trigger && active.contains(trigger)) trigger.focus();
    else focusModal(active);
  } else if (trigger && trigger.isConnected !== false && typeof trigger.focus === 'function') {
    try { trigger.focus(); } catch (_) {}
  }
  window.RealScanDiagnostics?.record('modal.close', 'info', { modal: id, depth: modalFocusStack.length });
  if (typeof CustomEvent !== 'undefined') document.dispatchEvent(new CustomEvent('realscan:modal-closed', { detail: { id: id } }));
}

function closeAllModals() {
  window.RealScanReview?.cancel();
  window.RealScanCapture?.close();
  window.RealScanLocalTransfer?.stopCamera();window.RealScanOcr?.cancel();
  if (typeof closeLiveCamera === 'function' && window.state?.cameraStream) closeLiveCamera();
  const ids = Array.from(document.querySelectorAll('[role="dialog"]')).map(function(modal) { return modal.id; });
  ids.forEach(closeModal);
  modalFocusStack = [];
  syncModalState();
}

function anyModalOpen() { return !!getTopModal(); }

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && anyModalOpen()) {
      e.preventDefault();
      const activeModal = getTopModal();
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
      const activeModal = getTopModal();
      if (!activeModal) return;
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

// These sources were checked on 2026-10-14. Other templates remain explicitly indicative.
Object.assign(window.FORMAT_SPECS.photo_visa_usa, {
  sourceUrl:'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/digital-image-requirements.html',
  noRetouch:true, digital:{formats:['jpg'],minPixels:600,maxPixels:1200,maxBytes:240000},
  reqsDigital:'JPG en color sRGB; imagen cuadrada de 600 a 1200 px, máximo 240 KB. Confirma el portal y trámite específico.',
  reqsPhysical:'2 × 2 pulgadas (50.8 × 50.8 mm), fondo blanco o blanquecino; comprobar la guía de composición oficial.'
});
Object.assign(window.FORMAT_SPECS.photo_carnet, {
  sourceUrl:'https://www.dnielectronico.es/PDFs/Politicas_de_certificacion_v3.2.pdf',noRetouch:true,
  reqsPhysical:'Fotografía reciente en color, 26 mm de ancho × 32 mm de alto, de frente y fondo blanco uniforme. Confirma los requisitos al solicitar la cita.'
});
window.FORMAT_SPECS.photo_passport.noRetouch = true;
