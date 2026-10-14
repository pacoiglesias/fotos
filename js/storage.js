/* ============================================================
   RealScan Pro — Historial Local Offline con Auto-Expiración (IndexedDB)
   Desarrollado por Paco Iglesias • Privacidad 100% en tu Dispositivo
   ============================================================ */

const DB_NAME = 'realscan_storage_v1';
const DB_VERSION = 1;
const STORE_NAME = 'scans';
const SCHEMA_VERSION = 2;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let dbInstance = null;

function getDB() {
  return new Promise(function(resolve, reject) {
    if (dbInstance) return resolve(dbInstance);
    if (typeof window === 'undefined' || !window.indexedDB) return reject(new Error('IndexedDB no soportado en este entorno'));

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
    };
    req.onsuccess = function(e) {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };
    req.onerror = function(e) {
      reject(e.target.error);
    };
  });
}

/* ============================================================
   OPERACIÓN CENTRALIZADA: LIMPIEZA Y REINICIO DE TRABAJO (M-28/C02)
   Limpia ranuras, historial de edición, recortes huérfanos, orientaciones y cancela asincronía.
   ============================================================ */
function prepareWorkspaceForJobSwitch(options) {
  options = options || {};
  if (typeof state !== 'undefined') {
    state._jobRevision = (state._jobRevision || 0) + 1;
    state._processingPending = 0;
  }

  // 1. Limpieza rigurosa de todas las ranuras de imagen
  ['front', 'back', 'page3', 'page4'].forEach(function(side) {
    if (typeof state !== 'undefined' && state.images && state.images[side]) {
      const imgData = state.images[side];
      imgData.rawOriginalSrc = null;
      imgData.croppedSrc = null;
      imgData.isCropApplied = false;
      imgData.cropData = null;
      imgData.warpQuad = null;
      imgData.originalSrc = null;
      imgData.processedDataUrl = null;
      imgData.filter = 'color';
      imgData.rotation = 0;
      imgData.zoom = 1.0;
      imgData.fitMode = 'cover';
      imgData.brightness = 0;
      imgData.contrast = 0;
      imgData.panX = 0;
      imgData.panY = 0;
      imgData.naturalWidth = 0;
      imgData.naturalHeight = 0;
      imgData.showMmGrid = false;
      imgData.showOaciGuide = false;
    }
    if (typeof clearSlot === 'function') {
      clearSlot(side);
    } else if (typeof updateSidePreview === 'function') {
      updateSidePreview(side);
    }
  });

  // 2. Limpiar todo el historial Undo/Redo del editor
  const editor = (typeof RealScanEditor !== 'undefined') ? RealScanEditor : ((typeof window !== 'undefined' && window.RealScanEditor) ? window.RealScanEditor : null);
  if (editor && typeof editor.clearAllHistory === 'function') {
    editor.clearAllHistory();
  }
  if (editor && typeof editor.closeEditor === 'function') {
    editor.closeEditor();
  }

  // 3. Limpiar borrador si se pide explícitamente
  if (options.clearDraft && typeof clearActiveDraft === 'function') {
    clearActiveDraft();
  }

  // 4. Limpiar título personalizado si no se conserva
  if (typeof state !== 'undefined' && !options.keepTitle) {
    state.documentCustomTitle = '';
    const inputTitle = (typeof $ === 'function') ? $('inputDocumentTitle') : null;
    if (inputTitle) inputTitle.value = '';
  }

  // 5. Restablecer banderas transitorias de trabajo
  if (typeof state !== 'undefined') {
    state.mixTwoPhotos = false;
    state.duplicateCard = false;
  }
}
if (typeof window !== 'undefined') {
  window.prepareWorkspaceForJobSwitch = prepareWorkspaceForJobSwitch;
}

/* Guardar escaneo en la base de datos local (Esquema RealScanProject v2) */
async function saveScanToStorage(customTitle, retentionDays) {
  try {
    const db = await getDB();
    const spec = (typeof getActiveSpec === 'function') ? getActiveSpec() : { shortName: 'Documento', name: 'Documento Oficial' };

    // Recolectar páginas activas con imagen
    // Si es categoría fotos y mixTwoPhotos está activo o back tiene imagen cargada, asegurar slotLimit >= 2
    let slotLimit = state.documentPageCount || 2;
    if (state.activeCategory === 'photos' && (state.mixTwoPhotos || (state.images.back && (state.images.back.originalSrc || state.images.back.rawOriginalSrc)))) {
      slotLimit = Math.max(slotLimit, 2);
    }
    const activeSlots = ['front', 'back', 'page3', 'page4'].slice(0, slotLimit);
    const pages = [];
    let thumb = null;

    activeSlots.forEach(function(slotKey, idx) {
      const imgData = state.images[slotKey];
      if (imgData && (imgData.processedDataUrl || imgData.originalSrc || imgData.rawOriginalSrc)) {
        const currentData = imgData.processedDataUrl || imgData.originalSrc || imgData.rawOriginalSrc;
        if (!thumb) thumb = currentData;
        let pageLabel = 'Página ' + (idx + 1);
        if (slotKey === 'front') pageLabel = 'Anverso / Pág. 1';
        else if (slotKey === 'back') pageLabel = 'Reverso / Pág. 2';
        else if (slotKey === 'page3') pageLabel = 'Página 3 / Visa 1';
        else if (slotKey === 'page4') pageLabel = 'Página 4 / Visa 2';

        pages.push({
          slot: slotKey,
          label: pageLabel,
          rawOriginalSrc: imgData.rawOriginalSrc || imgData.originalSrc || currentData,
          originalSrc: imgData.originalSrc || imgData.rawOriginalSrc || currentData,
          croppedSrc: imgData.croppedSrc || null,
          isCropApplied: !!imgData.isCropApplied,
          cropData: imgData.cropData || null,
          warpQuad: imgData.warpQuad || null,
          dataUrl: currentData,
          filter: imgData.filter || 'color',
          rotation: imgData.rotation || 0,
          zoom: imgData.zoom || 1.0,
          fitMode: imgData.fitMode || 'cover',
          brightness: imgData.brightness || 0,
          contrast: imgData.contrast || 0,
          panX: imgData.panX || 0,
          panY: imgData.panY || 0,
          naturalWidth: imgData.naturalWidth || 0,
          naturalHeight: imgData.naturalHeight || 0
        });
      }
    });

    if (pages.length === 0) {
      showToast('No hay imágenes cargadas para guardar en el historial.', 'warning');
      return null;
    }

    const days = (typeof retentionDays === 'number') ? retentionDays : 3;
    const now = Date.now();
    const expiresAt = days > 0 ? (now + days * 24 * 60 * 60 * 1000) : 0;
    const projectTitle = (customTitle || '').trim() || (spec.shortName + ' (' + pages.length + ' ' + (pages.length === 1 ? 'cara' : 'caras/págs') + ')');
    const printedSheetTitle = (state.documentCustomTitle || '').trim();

    const record = {
      schemaVersion: SCHEMA_VERSION,
      id: 'scan_' + now,
      createdAt: now,
      createdFormatted: new Date(now).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
      title: projectTitle,
      projectTitle: projectTitle,
      printedSheetTitle: printedSheetTitle,
      category: state.activeCategory || 'docs',
      format: state.format || 'card',
      formatName: spec.name || 'Documento Oficial',
      paperSize: state.paperSize || 'a4',
      printMode: state.printMode || 'both',
      sheetLayout: state.sheetLayout || 'same_page',
      documentPageCount: state.documentPageCount || 2,
      duplicateCard: !!state.duplicateCard,
      includeRulerFooter: state.includeRulerFooter !== false,
      includeDocLabels: state.includeDocLabels !== false,
      includeCutMarks: state.includeCutMarks !== false,
      customWidth: state.customWidth,
      customHeight: state.customHeight,
      customUnit: state.customUnit || 'cm',
      photoCopies: state.photoCopies || 4,
      mixTwoPhotos: !!state.mixTwoPhotos,
      passportOpenOrientation: state.passportOpenOrientation || 'portrait',
      passportPageOrientation: state.passportPageOrientation || 'landscape',
      retentionDays: days,
      expiresAt: expiresAt,
      pages: pages,
      thumbnail: thumb
    };

    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = function() {
        showToast('💾 Escaneo guardado en tu historial local (' + (days > 0 ? ('Auto-elimina en ' + days + ' días') : 'Permanente') + ').', 'success');
        updateHistoryBadge();
        if (typeof renderSavedScansDashboard === 'function') renderSavedScansDashboard();
        resolve(record);
      };
      req.onerror = function(e) {
        reject(e.target.error);
      };
    });
  } catch (err) {
    console.error('Error al guardar en IndexedDB:', err);
    showToast('No se pudo guardar el escaneo localmente: ' + err.message, 'warning');
    return null;
  }
}

/* Obtener todos los escaneos */
async function getAllScansFromStorage() {
  try {
    const db = await getDB();
    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = function() {
        const list = req.result || [];
        list.sort(function(a, b) { return b.createdAt - a.createdAt; });
        resolve(list);
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  } catch (err) {
    return [];
  }
}

/* Eliminar un escaneo específico */
async function deleteScanFromStorage(id) {
  try {
    const db = await getDB();
    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = function() {
        showToast('Escaneo eliminado del historial.', 'info');
        updateHistoryBadge();
        resolve(true);
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  } catch (err) {
    return false;
  }
}

/* Vaciar todo el historial */
async function clearAllScansFromStorage() {
  try {
    const db = await getDB();
    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = function() {
        showToast('Historial local vaciado por completo.', 'info');
        updateHistoryBadge();
        if (typeof renderSavedScansDashboard === 'function') renderSavedScansDashboard();
        resolve(true);
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  } catch (err) {
    return false;
  }
}

/* Purgar escaneos vencidos automáticamente según la retención */
async function purgeExpiredScans() {
  try {
    const scans = await getAllScansFromStorage();
    const now = Date.now();
    let purgedCount = 0;
    for (let i = 0; i < scans.length; i++) {
      const s = scans[i];
      if (s.expiresAt > 0 && s.expiresAt < now) {
        await deleteScanFromStorage(s.id);
        purgedCount++;
      }
    }
    if (purgedCount > 0) {
      console.log('RealScan: Auto-eliminados ' + purgedCount + ' escaneos vencidos por privacidad.');
    }
    updateHistoryBadge();
  } catch (e) {
    console.warn('Error purgando escaneos vencidos:', e);
  }
}

async function restoreScanToApp(id) {
  try {
    const scans = await getAllScansFromStorage();
    const scan = scans.find(function(s) { return s.id === id; });
    if (!scan) {
      showToast('No se encontró el escaneo solicitado.', 'warning');
      return;
    }

    // 1. Limpieza rigurosa y centralizada del espacio de trabajo
    prepareWorkspaceForJobSwitch({ clearDraft: false, keepTitle: true });

    // 2. Restauración de configuración integral del proyecto
    if (scan.paperSize) {
      state.paperSize = scan.paperSize;
      if (typeof setPaperSize === 'function') setPaperSize(scan.paperSize, true);
    }
    if (scan.category) {
      state.activeCategory = scan.category;
      if (typeof switchCategory === 'function') switchCategory(scan.category);
    }
    if (scan.format) {
      state.format = scan.format;
      if (window.FORMAT_SPECS && window.FORMAT_SPECS[scan.format] && typeof selectFormat === 'function') selectFormat(scan.format);
    }
    if (scan.printMode) {
      state.printMode = scan.printMode;
      if (typeof setPrintMode === 'function') setPrintMode(scan.printMode);
    }

    state.duplicateCard = !!scan.duplicateCard;
    if (scan.includeRulerFooter !== undefined) state.includeRulerFooter = scan.includeRulerFooter;
    if (scan.includeDocLabels !== undefined) state.includeDocLabels = scan.includeDocLabels;
    if (scan.includeCutMarks !== undefined) state.includeCutMarks = scan.includeCutMarks;
    if (scan.customWidth) state.customWidth = scan.customWidth;
    if (scan.customHeight) state.customHeight = scan.customHeight;
    if (scan.customUnit) state.customUnit = scan.customUnit;
    if (scan.photoCopies) state.photoCopies = scan.photoCopies;
    if (scan.mixTwoPhotos !== undefined) state.mixTwoPhotos = scan.mixTwoPhotos;

    if (scan.passportOpenOrientation) {
      state.passportOpenOrientation = scan.passportOpenOrientation;
      if (typeof setPassportOpenOrientation === 'function') setPassportOpenOrientation(scan.passportOpenOrientation);
    }
    if (scan.passportPageOrientation) {
      state.passportPageOrientation = scan.passportPageOrientation;
      if (typeof setPassportPageOrientation === 'function') setPassportPageOrientation(scan.passportPageOrientation);
    }
    if (typeof updatePassportOptionsUI === 'function') updatePassportOptionsUI();

    if (scan.printedSheetTitle !== undefined) {
      state.documentCustomTitle = scan.printedSheetTitle;
    } else if (scan.title && scan.title !== scan.formatName && scan.title !== scan.shortName) {
      state.documentCustomTitle = scan.title;
    }
    const inputTitle = (typeof $ === 'function') ? $('inputDocumentTitle') : null;
    if (inputTitle) inputTitle.value = state.documentCustomTitle || '';

    // Configurar cantidad de páginas
    const numPages = Math.min(4, Math.max(1, scan.documentPageCount || (scan.pages ? scan.pages.length : 1)));
    if (typeof setDocumentPages === 'function') {
      setDocumentPages(numPages);
    } else {
      state.documentPageCount = numPages;
    }

    // 3. Restaurar imágenes: prevenir degradación acumulativa de filtros y preservar recortes
    const isV2 = (scan.schemaVersion >= 2);
    if (Array.isArray(scan.pages)) {
      scan.pages.forEach(function(p) {
        const slot = p.slot || 'front';
        if (state.images[slot]) {
          if (isV2 && p.rawOriginalSrc) {
            // Proyecto v2: original puro preservado
            state.images[slot].rawOriginalSrc = p.rawOriginalSrc;
            state.images[slot].croppedSrc = p.croppedSrc || null;
            state.images[slot].isCropApplied = !!p.isCropApplied;
            state.images[slot].cropData = p.cropData || null;
            state.images[slot].warpQuad = p.warpQuad || null;
            state.images[slot].originalSrc = p.originalSrc || p.rawOriginalSrc;
            state.images[slot].processedDataUrl = p.dataUrl || p.originalSrc;
            state.images[slot].filter = p.filter || 'color';
            state.images[slot].rotation = p.rotation || 0;
            state.images[slot].zoom = p.zoom || 1.0;
            state.images[slot].fitMode = p.fitMode || 'cover';
            state.images[slot].brightness = p.brightness || 0;
            state.images[slot].contrast = p.contrast || 0;
            state.images[slot].panX = p.panX || 0;
            state.images[slot].panY = p.panY || 0;
            state.images[slot].naturalWidth = p.naturalWidth || 0;
            state.images[slot].naturalHeight = p.naturalHeight || 0;
          } else {
            // Migración v1: el bitmap procesado guardado se convierte en el nuevo original neutro
            state.images[slot].rawOriginalSrc = p.dataUrl;
            state.images[slot].croppedSrc = null;
            state.images[slot].isCropApplied = false;
            state.images[slot].cropData = null;
            state.images[slot].warpQuad = null;
            state.images[slot].originalSrc = p.dataUrl;
            state.images[slot].processedDataUrl = p.dataUrl;
            state.images[slot].filter = 'color';
            state.images[slot].rotation = 0;
            state.images[slot].zoom = 1.0;
            state.images[slot].fitMode = 'cover';
            state.images[slot].brightness = 0;
            state.images[slot].contrast = 0;
            state.images[slot].panX = 0;
            state.images[slot].panY = 0;
          }
          if (typeof updateSidePreview === 'function') updateSidePreview(slot);
        }
      });
    }

    if (typeof closeModal === 'function') closeModal('historyModal');
    if (typeof updatePreviewAnnotations === 'function') updatePreviewAnnotations();
    if (typeof updateUI === 'function') updateUI();
    if (typeof savePreferences === 'function') savePreferences();
    showToast('¡Proyecto restaurado con éxito al lienzo de trabajo!', 'success');
  } catch (err) {
    showToast('Error al restaurar escaneo: ' + err.message, 'warning');
  }
}

/* Actualizar contador visual en la cabecera y en el panel visible */
async function updateHistoryBadge() {
  try {
    const scans = await getAllScansFromStorage();
    const badge = $('historyCountBadge');
    if (badge) {
      badge.textContent = scans.length;
      badge.classList.toggle('hidden', scans.length === 0);
    }
    const tag = $('savedScansCountTag');
    if (tag) {
      tag.textContent = scans.length + (scans.length === 1 ? ' guardado' : ' guardados');
    }
  } catch (e) {}
}

/* Renderizar el Dashboard Principal de Escaneos Guardados en la Página */
async function renderSavedScansDashboard() {
  const grid = $('mainSavedScansGrid');
  const tag = $('savedScansCountTag');
  if (!grid) return;

  const scans = await getAllScansFromStorage();
  if (tag) {
    tag.textContent = scans.length + (scans.length === 1 ? ' guardado' : ' guardados');
  }

  grid.innerHTML = '';
  if (scans.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-8 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-2">
        <div class="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center text-xl">
          📂
        </div>
        <p class="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">No tienes escaneos guardados en este equipo todavía</p>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Cuando captures o subas un documento, presiona <strong>"💾 Guardar Escaneo Actual"</strong> para tenerlo siempre a mano y volverlo a imprimir con 1 clic.
        </p>
      </div>
    `;
    return;
  }

  const now = Date.now();
  scans.forEach(function(s) {
    const card = document.createElement('div');
    card.className = 'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-indigo-300 dark:hover:border-indigo-700';

    let expireTag = '';
    if (s.expiresAt > 0) {
      const diffMs = s.expiresAt - now;
      if (diffMs <= 0) {
        expireTag = '<span class="text-[9.5px] font-bold text-red-600 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.2 rounded border border-red-200 dark:border-red-900">Expirado</span>';
      } else {
        const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        expireTag = '<span class="text-[9.5px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">⏳ ' + daysLeft + (daysLeft === 1 ? ' día' : ' días') + '</span>';
      }
    } else {
      expireTag = '<span class="text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">♾️ Permanente</span>';
    }

    const safeTitle = escapeHtml(s.title || 'Sin Título');
    const safeCreatedFormatted = escapeHtml(s.createdFormatted || '');
    const safeId = escapeHtml(s.id);
    const pagesCount = (s.pages && Array.isArray(s.pages)) ? s.pages.length : 1;

    card.innerHTML = `
      <div class="flex items-start gap-3 min-w-0">
        <div class="thumb-slot-dashboard w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center cursor-pointer btn-dash-restore" data-id="${safeId}" title="Hacer clic para cargar en el lienzo">
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-bold text-xs text-slate-900 dark:text-white truncate" title="${safeTitle}">${safeTitle}</p>
          <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded">${pagesCount} cara(s)</span>
            <span class="text-[9.5px] text-slate-400 font-mono">${safeCreatedFormatted}</span>
          </div>
          <div class="mt-1">${expireTag}</div>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
        <button type="button" class="btn-dash-restore py-1 px-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center gap-1 transition-colors" data-id="${safeId}" title="Cargar este documento en el lienzo de trabajo">
          <span>🔄</span><span class="hidden sm:inline">Cargar</span>
        </button>
        <button type="button" class="btn-dash-pdf py-1 px-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-1 transition-colors" data-id="${safeId}" title="Descargar PDF 1:1 directo">
          <span>📄</span><span class="hidden sm:inline">PDF</span>
        </button>
        <button type="button" class="btn-dash-print py-1 px-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-1 transition-colors" data-id="${safeId}" title="Imprimir directo a escala 100%">
          <span>🖨️</span><span class="hidden sm:inline">Imprimir</span>
        </button>
        <button type="button" class="btn-dash-delete py-1 px-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/60 text-slate-500 hover:text-red-600 font-semibold flex items-center justify-center transition-colors" data-id="${safeId}" title="Eliminar escaneo">
          <span>🗑️</span>
        </button>
      </div>
    `;

    const thumbSlot = (typeof card.querySelector === 'function') ? card.querySelector('.thumb-slot-dashboard') : null;
    if (thumbSlot) {
      if (s.thumbnail && typeof s.thumbnail === 'string' && (s.thumbnail.startsWith('data:image/') || s.thumbnail.startsWith('blob:') || s.thumbnail.startsWith('https://'))) {
        const img = document.createElement('img');
        img.src = s.thumbnail;
        img.className = 'w-full h-full object-cover';
        img.alt = 'Miniatura';
        thumbSlot.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.className = 'text-2xl';
        span.textContent = '📄';
        thumbSlot.appendChild(span);
      }
    }

    grid.appendChild(card);
  });

  // Bindings del Dashboard
  grid.querySelectorAll('.btn-dash-restore').forEach(function(btn) {
    btn.addEventListener('click', function() {
      restoreScanToApp(btn.getAttribute('data-id'));
    });
  });

  grid.querySelectorAll('.btn-dash-pdf').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      await restoreScanToApp(btn.getAttribute('data-id'));
      if (typeof handleExportPDF === 'function') handleExportPDF(false);
    });
  });

  grid.querySelectorAll('.btn-dash-print').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      await restoreScanToApp(btn.getAttribute('data-id'));
      if (typeof handlePrintDirect === 'function') handlePrintDirect();
    });
  });

  grid.querySelectorAll('.btn-dash-delete').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      if (confirm('¿Deseas eliminar este escaneo guardado?')) {
        await deleteScanFromStorage(btn.getAttribute('data-id'));
        renderSavedScansDashboard();
        renderHistoryUI();
      }
    });
  });
}
window.renderSavedScansDashboard = renderSavedScansDashboard;

/* Renderizar la lista dentro del Modal de Historial con Búsqueda (M-30) */
async function renderHistoryUI(filterQuery) {
  const container = $('historyItemsContainer');
  const emptyState = $('historyEmptyState');
  if (!container) return;

  container.innerHTML = '';
  const fetchScans = (typeof window !== 'undefined' && window.getAllScansFromStorage) ? window.getAllScansFromStorage : getAllScansFromStorage;
  let scans = await fetchScans();

  if (scans.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    container.classList.add('hidden');
    return;
  }

  const query = (typeof filterQuery === 'string' ? filterQuery : ($('inputSearchHistory') ? $('inputSearchHistory').value : '')).trim().toLowerCase();
  if (query) {
    scans = scans.filter(function(s) {
      const titleMatch = (s.title || '').toLowerCase().includes(query);
      const dateMatch = (s.createdFormatted || '').toLowerCase().includes(query);
      const idMatch = (s.id || '').toLowerCase().includes(query);
      return titleMatch || dateMatch || idMatch;
    });
  }

  if (scans.length === 0) {
    if (emptyState) emptyState.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="text-center py-8 px-4 text-slate-500 dark:text-slate-400">
        <span class="text-2xl block mb-1">🔍</span>
        <p class="text-xs font-semibold">No se encontraron escaneos que coincidan con "${escapeHtml(query)}"</p>
      </div>
    `;
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  container.classList.remove('hidden');

  const now = Date.now();

  scans.forEach(function(s) {
    const card = document.createElement('div');
    card.className = 'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors';

    // Cálculo de tiempo restante de expiración
    let expireBadgeHtml = '';
    if (s.expiresAt > 0) {
      const diffMs = s.expiresAt - now;
      if (diffMs <= 0) {
        expireBadgeHtml = '<span class="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-200 dark:border-red-900">Expirado (Se eliminará pronto)</span>';
      } else {
        const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        const color = daysLeft <= 1 ? 'amber' : 'indigo';
        expireBadgeHtml = '<span class="text-[10px] font-semibold text-' + color + '-700 dark:text-' + color + '-300 bg-' + color + '-50 dark:bg-' + color + '-950/60 px-2 py-0.5 rounded border border-' + color + '-200 dark:border-' + color + '-800">⏳ Caduca en ' + daysLeft + (daysLeft === 1 ? ' día' : ' días') + '</span>';
      }
    } else {
      expireBadgeHtml = '<span class="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">♾️ Conservación Permanente</span>';
    }

    const safeTitle = escapeHtml(s.title || 'Sin Título');
    const safeCreatedFormatted = escapeHtml(s.createdFormatted || '');
    const safeId = escapeHtml(s.id);
    const pagesCount = (s.pages && Array.isArray(s.pages)) ? s.pages.length : 1;

    card.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <div class="thumb-slot-history w-14 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
        </div>
        <div class="min-w-0">
          <p class="font-bold text-sm text-slate-900 dark:text-white truncate">${safeTitle}</p>
          <div class="flex flex-wrap items-center gap-1.5 mt-1">
            <span class="text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono">${safeCreatedFormatted}</span>
            <span class="text-slate-300 dark:text-slate-700">•</span>
            <span class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">${pagesCount} páginas</span>
          </div>
          <div class="mt-1.5">${expireBadgeHtml}</div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
        <button type="button" class="btn-zip-scan px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1" data-id="${safeId}" title="Descargar paquete ZIP con todas las imágenes de este documento">
          <span>📦</span>
          <span>ZIP</span>
        </button>
        <button type="button" class="btn-restore-scan px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition-colors flex items-center gap-1" data-id="${safeId}" title="Restaurar escaneo para imprimir o editar">
          <span>🔄</span>
          <span>Cargar</span>
        </button>
        <button type="button" class="btn-delete-scan p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/60 text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 text-xs transition-colors" data-id="${safeId}" title="Eliminar este escaneo">
          🗑️
        </button>
      </div>
    `;

    const thumbSlot = (typeof card.querySelector === 'function') ? card.querySelector('.thumb-slot-history') : null;
    if (thumbSlot) {
      if (s.thumbnail && typeof s.thumbnail === 'string' && (s.thumbnail.startsWith('data:image/') || s.thumbnail.startsWith('blob:') || s.thumbnail.startsWith('https://'))) {
        const img = document.createElement('img');
        img.src = s.thumbnail;
        img.className = 'w-full h-full object-cover';
        img.alt = 'Miniatura';
        thumbSlot.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.className = 'text-xl';
        span.textContent = '📄';
        thumbSlot.appendChild(span);
      }
    }

    container.appendChild(card);
  });

  // Event bindings para la lista renderizada
  container.querySelectorAll('.btn-zip-scan').forEach(function(btn) {
    btn.addEventListener('click', function() {
      exportScanAsZip(btn.getAttribute('data-id'));
    });
  });

  container.querySelectorAll('.btn-restore-scan').forEach(function(btn) {
    btn.addEventListener('click', function() {
      restoreScanToApp(btn.getAttribute('data-id'));
    });
  });

  container.querySelectorAll('.btn-delete-scan').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      if (confirm('¿Deseas eliminar este escaneo del historial?')) {
        await deleteScanFromStorage(btn.getAttribute('data-id'));
        renderHistoryUI();
      }
    });
  });
}

/* Exportar un escaneo en ZIP (imágenes de cada página + metadata) */
async function exportScanAsZip(id) {
  try {
    const scans = await getAllScansFromStorage();
    const scan = scans.find(function(s) { return s.id === id; });
    if (!scan) {
      showToast('No se encontró el escaneo a exportar.', 'warning');
      return;
    }

    if (!window.JSZip) {
      showToast('Descargando imágenes individuales...', 'info');
      scan.pages.forEach(function(p, i) {
        const a = document.createElement('a');
        a.href = p.dataUrl;
        a.download = (scan.format || 'documento') + '_pag_' + (i + 1) + '.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
      return;
    }

    showToast('Generando paquete ZIP...', 'info');
    const zip = new JSZip();
    const folder = zip.folder(scan.title.replace(/[^a-zA-Z0-9_\-]/g, '_'));

    scan.pages.forEach(function(p, idx) {
      const base64Data = p.dataUrl.split(',')[1];
      const ext = p.dataUrl.indexOf('image/png') >= 0 ? 'png' : 'jpg';
      const slotName = p.slot || ('pagina_' + (idx + 1));
      folder.file((idx + 1) + '_' + slotName + '.' + ext, base64Data, { base64: true });
    });

    const metaTxt = 'REALSCAN PRO — FICHA DE ESCANEO\n' +
      'Desarrollado por Paco Iglesias\n' +
      '--------------------------------------------------\n' +
      'Título: ' + scan.title + '\n' +
      'Formato: ' + scan.formatName + ' (' + scan.format + ')\n' +
      'Fecha: ' + scan.createdFormatted + '\n' +
      'Total de páginas: ' + (scan.pages ? scan.pages.length : 1) + '\n' +
      'Retención: ' + (scan.retentionDays > 0 ? (scan.retentionDays + ' días') : 'Permanente') + '\n';
    folder.file('detalles_escaneo.txt', metaTxt);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RealScan_' + (scan.format || 'documento') + '_' + scan.id + '.zip';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);

    if (typeof logActivity === 'function') {
      logActivity('Exportación ZIP', 'Escaneo: ' + scan.title);
    }
    showToast('¡Paquete ZIP descargado exitosamente!', 'success');
  } catch (err) {
    console.error('Error exportando ZIP:', err);
    showToast('Error al generar ZIP: ' + err.message, 'warning');
  }
}

/* Exportar todo el historial en formato JSON */
async function exportAllScansAsJson() {
  try {
    const scans = await getAllScansFromStorage();
    if (scans.length === 0) {
      showToast('No hay escaneos para exportar en el historial.', 'warning');
      return;
    }

    const payload = {
      app: 'RealScan Pro',
      version: window.APP_VERSION,
      author: 'Paco Iglesias',
      exportedAt: new Date().toISOString(),
      count: scans.length,
      scans: scans
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RealScan_Respaldo_Historial_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);

    if (typeof logActivity === 'function') {
      logActivity('Respaldo de Historial', 'Exportación JSON de ' + scans.length + ' escaneos');
    }
    showToast('¡Respaldo JSON descargado con éxito!', 'success');
  } catch (err) {
    showToast('Error exportando respaldo JSON: ' + err.message, 'warning');
  }
}

/* Importar respaldo JSON con validación estricta de tamaño, esquema y resolución de colisiones */
async function importScansFromJson(file) {
  if (!file) return;
  try {
    // 1. Límite estricto de tamaño para evitar desbordamiento de memoria (máx 50 MB)
    if (file.size > 50 * 1024 * 1024) {
      showToast('El archivo supera el tamaño máximo de respaldo permitido (50 MB).', 'warning');
      return;
    }

    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      showToast('El archivo no tiene un formato JSON válido.', 'warning');
      return;
    }

    const items = Array.isArray(data) ? data : (data && Array.isArray(data.scans) ? data.scans : null);
    if (!items || items.length === 0) {
      showToast('El archivo seleccionado no contiene escaneos o proyectos válidos.', 'warning');
      return;
    }

    const db = await getDB();
    const existingScans = await getAllScansFromStorage();
    const existingIds = new Set(existingScans.map(function(s) { return s.id; }));
    let imported = 0;

    for (let i = 0; i < items.length; i++) {
      const s = items[i];
      // Validación estricta de estructura
      if (!s || typeof s !== 'object' || !Array.isArray(s.pages) || s.pages.length === 0) {
        continue;
      }

      // Validar que las páginas contengan datos de imagen válidos
      const validPages = s.pages.filter(function(p) {
        return p && typeof p === 'object' && typeof p.dataUrl === 'string' && (p.dataUrl.startsWith('data:image/') || p.dataUrl.startsWith('blob:'));
      });
      if (validPages.length === 0) continue;

      // Resolución de conflictos de ID: si ya existe, generar un ID nuevo único
      let scanId = (typeof s.id === 'string' && s.id.trim()) ? s.id.trim() : ('scan_' + Date.now() + '_' + i);
      if (existingIds.has(scanId)) {
        scanId = 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      }
      existingIds.add(scanId);

      // Migración hacia esquema v2
      const isV2 = (s.schemaVersion >= 2);
      const now = Date.now();
      const sanitizedRecord = {
        schemaVersion: SCHEMA_VERSION,
        id: scanId,
        createdAt: typeof s.createdAt === 'number' ? s.createdAt : now,
        createdFormatted: s.createdFormatted || new Date(now).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
        title: (s.title && typeof s.title === 'string') ? s.title.slice(0, 150) : 'Documento Importado',
        category: s.category || 'docs',
        format: s.format || 'card',
        formatName: s.formatName || 'Documento Oficial',
        paperSize: s.paperSize || 'a4',
        printMode: s.printMode || (validPages.length === 1 ? 'single' : 'both'),
        sheetLayout: s.sheetLayout || 'same_page',
        documentPageCount: s.documentPageCount || validPages.length,
        duplicateCard: !!s.duplicateCard,
        includeRulerFooter: s.includeRulerFooter !== false,
        includeDocLabels: s.includeDocLabels !== false,
        includeCutMarks: s.includeCutMarks !== false,
        customWidth: s.customWidth,
        customHeight: s.customHeight,
        customUnit: s.customUnit || 'cm',
        photoCopies: s.photoCopies || 4,
        mixTwoPhotos: !!s.mixTwoPhotos,
        passportOpenOrientation: s.passportOpenOrientation || 'portrait',
        passportPageOrientation: s.passportPageOrientation || 'landscape',
        retentionDays: typeof s.retentionDays === 'number' ? s.retentionDays : 0,
        expiresAt: typeof s.expiresAt === 'number' ? s.expiresAt : 0,
        thumbnail: (s.thumbnail && typeof s.thumbnail === 'string') ? s.thumbnail : validPages[0].dataUrl,
        pages: validPages.map(function(p, pIdx) {
          return {
            slot: p.slot || (pIdx === 0 ? 'front' : (pIdx === 1 ? 'back' : (pIdx === 2 ? 'page3' : 'page4'))),
            label: p.label || ('Página ' + (pIdx + 1)),
            rawOriginalSrc: (isV2 && p.rawOriginalSrc) ? p.rawOriginalSrc : p.dataUrl,
            originalSrc: (isV2 && p.originalSrc) ? p.originalSrc : p.dataUrl,
            dataUrl: p.dataUrl,
            filter: isV2 ? (p.filter || 'color') : 'color',
            rotation: isV2 ? (p.rotation || 0) : 0,
            zoom: isV2 ? (p.zoom || 1.0) : 1.0,
            fitMode: p.fitMode || 'cover',
            brightness: isV2 ? (p.brightness || 0) : 0,
            contrast: isV2 ? (p.contrast || 0) : 0,
            panX: isV2 ? (p.panX || 0) : 0,
            panY: isV2 ? (p.panY || 0) : 0,
            naturalWidth: p.naturalWidth || 0,
            naturalHeight: p.naturalHeight || 0
          };
        })
      };

      await new Promise(function(resolve, reject) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(sanitizedRecord);
        req.onsuccess = function() { imported++; resolve(true); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    }

    updateHistoryBadge();
    renderHistoryUI();
    if (typeof renderSavedScansDashboard === 'function') renderSavedScansDashboard();
    if (typeof logActivity === 'function') {
      logActivity('Importación de Respaldo', 'Importados ' + imported + ' escaneos validados desde JSON');
    }
    showToast('¡Se importaron ' + imported + ' escaneos válidos al historial correctamente!', 'success');
  } catch (err) {
    showToast('Error procesando archivo de respaldo: ' + err.message, 'warning');
  }
}

/* ============================================================
   AUTOGUARDADO SILENCIOSO Y RECUPERACIÓN DE BORRADOR ACTIVO (M-27)
   ============================================================ */
const DRAFT_STORAGE_KEY = 'realscan_draft_session_v2';
let draftDebounceTimer = null;

async function saveActiveDraft() {
  clearTimeout(draftDebounceTimer);
  draftDebounceTimer = setTimeout(async function() {
    try {
      if (typeof state === 'undefined') return;
      const activeSlots = ['front', 'back', 'page3', 'page4'];
      let hasAnyImage = false;
      const draftImages = {};

      activeSlots.forEach(function(slotKey) {
        const imgData = state.images[slotKey];
        if (imgData && (imgData.originalSrc || imgData.rawOriginalSrc)) {
          hasAnyImage = true;
          draftImages[slotKey] = {
            rawOriginalSrc: imgData.rawOriginalSrc || imgData.originalSrc,
            originalSrc: imgData.originalSrc,
            croppedSrc: imgData.croppedSrc || null,
            isCropApplied: !!imgData.isCropApplied,
            cropData: imgData.cropData || null,
            warpQuad: imgData.warpQuad || null,
            processedDataUrl: imgData.processedDataUrl,
            naturalWidth: imgData.naturalWidth,
            naturalHeight: imgData.naturalHeight,
            rotation: imgData.rotation,
            zoom: imgData.zoom,
            fitMode: imgData.fitMode,
            filter: imgData.filter,
            brightness: imgData.brightness,
            contrast: imgData.contrast,
            panX: imgData.panX,
            panY: imgData.panY,
            showMmGrid: imgData.showMmGrid,
            showOaciGuide: imgData.showOaciGuide
          };
        }
      });

      if (!hasAnyImage) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }

      const draftState = {
        updatedAt: Date.now(),
        activeCategory: state.activeCategory,
        format: state.format,
        paperSize: state.paperSize,
        printMode: state.printMode,
        sheetLayout: state.sheetLayout,
        documentPageCount: state.documentPageCount,
        documentCustomTitle: state.documentCustomTitle,
        printedSheetTitle: (state.documentCustomTitle || '').trim(),
        duplicateCard: state.duplicateCard,
        includeRulerFooter: state.includeRulerFooter,
        includeDocLabels: state.includeDocLabels,
        includeCutMarks: state.includeCutMarks,
        customWidth: state.customWidth,
        customHeight: state.customHeight,
        customUnit: state.customUnit,
        photoCopies: state.photoCopies,
        mixTwoPhotos: !!state.mixTwoPhotos,
        passportOpenOrientation: state.passportOpenOrientation || 'portrait',
        passportPageOrientation: state.passportPageOrientation || 'landscape',
        images: draftImages
      };

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftState));
      state._draftQuotaError = false;
      state._lastDraftSavedAt = Date.now();
    } catch(err) {
      if (typeof state !== 'undefined') state._draftQuotaError = true;
      console.warn('RealScan: Error al persistir borrador en localStorage:', err);
      if (typeof showToast === 'function') {
        showToast('⚠️ Espacio local insuficiente para autoguardar borrador.', 'warning');
      }
    }
  }, 750);
}

function getActiveDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.updatedAt && (Date.now() - parsed.updatedAt < 48 * 3600 * 1000)) {
      return parsed;
    }
  } catch(e) {}
  return null;
}

function clearActiveDraft() {
  clearTimeout(draftDebounceTimer);
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch(e) {}
}

async function restoreActiveDraft() {
  const draft = getActiveDraft();
  if (!draft || !draft.images) return false;

  // 1. Limpieza rigurosa previa: un borrador de 1 cara NO debe conservar el reverso del trabajo anterior
  prepareWorkspaceForJobSwitch({ clearDraft: false, keepTitle: true });

  state.activeCategory = draft.activeCategory || 'docs';
  state.format = draft.format || 'card';
  state.paperSize = draft.paperSize || 'a4';
  state.printMode = draft.printMode || 'both';
  state.sheetLayout = draft.sheetLayout || 'same_page';
  state.documentPageCount = draft.documentPageCount || 2;
  state.documentCustomTitle = draft.printedSheetTitle !== undefined ? draft.printedSheetTitle : (draft.documentCustomTitle || '');
  const inputTitle = (typeof $ === 'function') ? $('inputDocumentTitle') : null;
  if (inputTitle) inputTitle.value = state.documentCustomTitle || '';

  state.duplicateCard = !!draft.duplicateCard;
  state.includeRulerFooter = draft.includeRulerFooter !== false;
  state.includeDocLabels = draft.includeDocLabels !== false;
  state.includeCutMarks = draft.includeCutMarks !== false;
  state.customWidth = draft.customWidth || 8.5;
  state.customHeight = draft.customHeight || 5.5;
  state.customUnit = draft.customUnit || 'cm';
  state.photoCopies = draft.photoCopies || 4;
  state.mixTwoPhotos = !!draft.mixTwoPhotos;

  if (draft.passportOpenOrientation) {
    state.passportOpenOrientation = draft.passportOpenOrientation;
    if (typeof setPassportOpenOrientation === 'function') setPassportOpenOrientation(draft.passportOpenOrientation);
  }
  if (draft.passportPageOrientation) {
    state.passportPageOrientation = draft.passportPageOrientation;
    if (typeof setPassportPageOrientation === 'function') setPassportPageOrientation(draft.passportPageOrientation);
  }
  if (typeof updatePassportOptionsUI === 'function') updatePassportOptionsUI();

  ['front', 'back', 'page3', 'page4'].forEach(function(side) {
    if (draft.images[side]) {
      Object.assign(state.images[side], draft.images[side]);
      if (typeof updateSidePreview === 'function') updateSidePreview(side);
    }
  });

  if (typeof updateUI === 'function') updateUI();
  if (typeof updatePreviewAnnotations === 'function') updatePreviewAnnotations();
  return true;
}

/* ============================================================
   PRESETS PERSONALIZADOS DE USUARIO (M-29)
   ============================================================ */
const PRESETS_STORAGE_KEY = 'realscan_user_presets_v1';

function getUserPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return [];
}

function saveUserPreset(presetName) {
  const name = (presetName || '').trim();
  if (!name) {
    if (typeof showToast === 'function') showToast('Ingresa un nombre para tu configuración predefinida.', 'warning');
    return null;
  }
  const presets = getUserPresets();
  const id = 'preset_' + Date.now();
  const spec = (typeof getActiveSpec === 'function') ? getActiveSpec() : {};
  const newPreset = {
    id: id,
    name: name,
    createdAt: Date.now(),
    category: state.activeCategory,
    format: state.format,
    formatName: spec.name || 'Personalizado',
    paperSize: state.paperSize,
    printMode: state.printMode,
    sheetLayout: state.sheetLayout,
    documentPageCount: state.documentPageCount || 2,
    duplicateCard: state.duplicateCard,
    includeRulerFooter: state.includeRulerFooter,
    includeDocLabels: state.includeDocLabels,
    includeCutMarks: state.includeCutMarks,
    customWidth: state.customWidth,
    customHeight: state.customHeight,
    customUnit: state.customUnit,
    photoCopies: state.photoCopies || 4,
    mixTwoPhotos: !!state.mixTwoPhotos,
    passportOpenOrientation: state.passportOpenOrientation || 'portrait',
    passportPageOrientation: state.passportPageOrientation || 'landscape'
  };
  presets.push(newPreset);
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch(e) {}
  if (typeof showToast === 'function') showToast('⭐ Preset "' + name + '" guardado exitosamente.', 'success');
  return newPreset;
}

function applyUserPreset(presetId) {
  const presets = getUserPresets();
  const p = presets.find(x => x.id === presetId);
  if (!p) return false;

  if (p.category) {
    state.activeCategory = p.category;
    if (typeof switchCategory === 'function') switchCategory(p.category);
  }
  if (p.format) {
    state.format = p.format;
    if (typeof selectFormat === 'function') selectFormat(p.format);
  }
  if (p.paperSize) {
    state.paperSize = p.paperSize;
    if (typeof setPaperSize === 'function') setPaperSize(p.paperSize);
  }
  if (p.printMode) {
    state.printMode = p.printMode;
    if (typeof setPrintMode === 'function') setPrintMode(p.printMode);
  }
  if (p.sheetLayout) state.sheetLayout = p.sheetLayout;
  if (p.documentPageCount && typeof setDocumentPages === 'function') setDocumentPages(p.documentPageCount);
  if (typeof p.duplicateCard === 'boolean') state.duplicateCard = p.duplicateCard;
  if (typeof p.includeRulerFooter === 'boolean') state.includeRulerFooter = p.includeRulerFooter;
  if (typeof p.includeDocLabels === 'boolean') state.includeDocLabels = p.includeDocLabels;
  if (typeof p.includeCutMarks === 'boolean') state.includeCutMarks = p.includeCutMarks;
  if (p.customWidth) state.customWidth = p.customWidth;
  if (p.customHeight) state.customHeight = p.customHeight;
  if (p.customUnit) state.customUnit = p.customUnit;
  if (p.photoCopies) state.photoCopies = p.photoCopies;
  if (p.mixTwoPhotos !== undefined) state.mixTwoPhotos = !!p.mixTwoPhotos;

  if (p.passportOpenOrientation) {
    state.passportOpenOrientation = p.passportOpenOrientation;
    if (typeof setPassportOpenOrientation === 'function') setPassportOpenOrientation(p.passportOpenOrientation);
  }
  if (p.passportPageOrientation) {
    state.passportPageOrientation = p.passportPageOrientation;
    if (typeof setPassportPageOrientation === 'function') setPassportPageOrientation(p.passportPageOrientation);
  }
  if (typeof updatePassportOptionsUI === 'function') updatePassportOptionsUI();

  if (typeof updateUI === 'function') updateUI();
  if (typeof updatePreviewAnnotations === 'function') updatePreviewAnnotations();
  if (typeof showToast === 'function') showToast('⭐ Configuración "' + p.name + '" aplicada.', 'success');
  return true;
}

function deleteUserPreset(presetId) {
  let presets = getUserPresets();
  presets = presets.filter(x => x.id !== presetId);
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch(e) {}
  if (typeof showToast === 'function') showToast('Preset eliminado.', 'info');
}

function renderUserPresetsUI() {
  const container = $('userPresetsListContainer');
  const emptyState = $('userPresetsEmptyState');
  if (!container) return;

  container.innerHTML = '';
  const presets = getUserPresets();

  if (presets.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    container.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  container.classList.remove('hidden');

  presets.forEach(function(p) {
    const card = document.createElement('div');
    card.className = 'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between gap-3';
    const safeName = escapeHtml(p.name);
    const safeFormat = escapeHtml(p.formatName || p.format || 'Personalizado');
    const safePaper = escapeHtml((p.paperSize || 'a4').toUpperCase());
    card.innerHTML = `
      <div class="min-w-0">
        <p class="font-bold text-xs text-slate-900 dark:text-white truncate">${safeName}</p>
        <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">${safeFormat} • Papel ${safePaper}</p>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button type="button" class="btn-apply-preset px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-700 dark:text-amber-300 font-bold text-xs transition-colors" data-id="${escapeHtml(p.id)}">
          Aplicar
        </button>
        <button type="button" class="btn-delete-preset p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/60 text-slate-400 hover:text-red-600 text-xs transition-colors" data-id="${escapeHtml(p.id)}" title="Eliminar preset">
          🗑️
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.btn-apply-preset').forEach(function(btn) {
    btn.addEventListener('click', function() {
      applyUserPreset(btn.getAttribute('data-id'));
      if (typeof closeModal === 'function') closeModal('userPresetsModal');
    });
  });

  container.querySelectorAll('.btn-delete-preset').forEach(function(btn) {
    btn.addEventListener('click', function() {
      deleteUserPreset(btn.getAttribute('data-id'));
      renderUserPresetsUI();
    });
  });
}
window.renderUserPresetsUI = renderUserPresetsUI;

/* ============================================================
   NUEVO TRABAJO / RESET CON CONFIRMACIÓN (M-28)
   ============================================================ */
function resetWorkspaceToNewProject() {
  if (confirm('¿Comenzar un Nuevo Trabajo? Se limpiarán las fotos actuales del lienzo. Asegúrate de haber guardado o impreso tu documento si lo necesitas.')) {
    prepareWorkspaceForJobSwitch({ clearDraft: true, keepTitle: false });
    if (typeof updatePreviewAnnotations === 'function') updatePreviewAnnotations();
    if (typeof updateUI === 'function') updateUI();
    if (typeof showToast === 'function') showToast('✨ Lienzo limpio. ¡Listo para comenzar un nuevo trabajo!', 'success');
  }
}

/* ============================================================
   VALIDACIONES DE PRE-VUELO ESTRICTAS (M-31)
   ============================================================ */
function runPreflightChecks() {
  const issues = [];
  const spec = (typeof getActiveSpec === 'function') ? getActiveSpec() : { widthMm: 85.6, heightMm: 54, shortName: 'Documento' };
  const paper = (typeof getActivePaperSpec === 'function') ? getActivePaperSpec() : { widthMm: 210, heightMm: 297, shortName: 'A4' };

  const engine = (typeof RealScanLayout !== 'undefined') ? RealScanLayout : ((typeof window !== 'undefined' && window.RealScanLayout) ? window.RealScanLayout : null);

  // 1. Obtener composición activa del Layout Engine
  const layout = (engine && typeof engine.computeDocumentLayout === 'function')
    ? engine.computeDocumentLayout(state)
    : { pages: [], errors: [], warnings: [] };

  // 2. Validación geométrica común centralizada
  const geomValidation = (engine && typeof engine.validateDocumentGeometry === 'function')
    ? engine.validateDocumentGeometry(layout, spec, paper)
    : { valid: true, errors: [], warnings: [] };

  if (geomValidation.errors && geomValidation.errors.length > 0) {
    geomValidation.errors.forEach(function(errMsg) {
      issues.push({
        type: 'error',
        code: 'GEOMETRY_ERROR',
        message: errMsg.startsWith('❌') ? errMsg : ('❌ ' + errMsg)
      });
    });
  }

  if (spec.widthMm > paper.widthMm || spec.heightMm > paper.heightMm) {
    const oversizedMsg = '❌ El tamaño del documento (' + spec.widthMm + ' × ' + spec.heightMm + ' mm) supera el papel (' + paper.widthMm + ' × ' + paper.heightMm + ' mm).';
    if (!issues.some(function(x) { return x.type === 'error' && x.message.includes('supera el papel'); })) {
      issues.push({
        type: 'error',
        code: 'GEOMETRY_ERROR',
        message: oversizedMsg
      });
    }
  }

  if (geomValidation.warnings && geomValidation.warnings.length > 0) {
    geomValidation.warnings.forEach(function(warnMsg) {
      issues.push({
        type: 'warning',
        code: 'GEOMETRY_WARNING',
        message: warnMsg.startsWith('⚠️') ? warnMsg : ('⚠️ ' + warnMsg)
      });
    });
  }

  // 3. Determinar ranuras requeridas por la composición activa
  let requiredSlots = [];
  if (layout.pages && layout.pages.length > 0) {
    const slotsSet = new Set();
    layout.pages.forEach(function(p) {
      (p.placements || []).forEach(function(item) {
        if (item && item.slot) slotsSet.add(item.slot);
      });
    });
    requiredSlots = Array.from(slotsSet);
  }
  if (requiredSlots.length === 0) {
    requiredSlots = ['front', 'back', 'page3', 'page4'].slice(0, state.documentPageCount || 2);
  }

  let loadedCount = 0;
  const missingSlots = [];

  function resolveSlotName(s) {
    if (typeof getSlotFriendlyName === 'function') return getSlotFriendlyName(s);
    if (s === 'front') return 'Frente';
    if (s === 'back') return 'Reverso';
    if (s === 'page3') return 'Página 3';
    if (s === 'page4') return 'Página 4';
    return s || 'Elemento';
  }

  requiredSlots.forEach(function(side) {
    const imgData = state.images && state.images[side];
    const hasImage = !!(imgData && (imgData.processedDataUrl || imgData.originalSrc));
    if (hasImage) {
      loadedCount++;
      const minDpiPixels = Math.round((Math.min(spec.widthMm, spec.heightMm) / 25.4) * 150);
      const minImgDim = Math.min(imgData.naturalWidth || 0, imgData.naturalHeight || 0);
      if (minImgDim > 0 && minImgDim < minDpiPixels) {
        issues.push({
          type: 'warning',
          slot: side,
          message: '⚠️ ' + resolveSlotName(side) + ': Resolución baja (' + minImgDim + ' px). La impresión física podría verse pixelada.'
        });
      }
    } else {
      missingSlots.push(side);
    }
  });

  // Si ninguna cara está cargada en todo el documento
  const totalAnyLoaded = Object.keys(state.images || {}).filter(function(k) {
    return !!(state.images[k] && (state.images[k].processedDataUrl || state.images[k].originalSrc));
  }).length;

  if (totalAnyLoaded === 0) {
    issues.push({
      type: 'error',
      code: 'NO_IMAGES',
      message: '❌ No hay ninguna foto cargada en el documento para imprimir o exportar.'
    });
  } else if (missingSlots.length > 0) {
    missingSlots.forEach(function(side) {
      issues.push({
        type: 'error',
        code: 'MISSING_SLOT',
        slot: side,
        message: '❌ Falta la imagen para: ' + resolveSlotName(side) + '. La composición activa (' + requiredSlots.length + ' caras) requiere ambas caras.'
      });
    });
  }

  return {
    valid: issues.filter(function(x) { return x.type === 'error'; }).length === 0,
    issues: issues
  };
}

// Inicialización de limpieza al cargar
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    purgeExpiredScans();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveScanToStorage,
    getAllScansFromStorage,
    deleteScanFromStorage,
    clearAllScansFromStorage,
    saveActiveDraft,
    getActiveDraft,
    clearActiveDraft,
    restoreActiveDraft,
    getUserPresets,
    saveUserPreset,
    applyUserPreset,
    deleteUserPreset,
    renderUserPresetsUI,
    prepareWorkspaceForJobSwitch,
    resetWorkspaceToNewProject,
    runPreflightChecks
  };
}
