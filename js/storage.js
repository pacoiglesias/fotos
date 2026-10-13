/* ============================================================
   RealScan Pro — Historial Local Offline con Auto-Expiración (IndexedDB)
   Desarrollado por Paco Iglesias • Privacidad 100% en tu Dispositivo
   ============================================================ */

const DB_NAME = 'realscan_storage_v1';
const DB_VERSION = 1;
const STORE_NAME = 'scans';

let dbInstance = null;

function getDB() {
  return new Promise(function(resolve, reject) {
    if (dbInstance) return resolve(dbInstance);
    if (!window.indexedDB) return reject(new Error('IndexedDB no soportado en este navegador'));

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

/* Guardar escaneo en la base de datos local */
async function saveScanToStorage(customTitle, retentionDays) {
  try {
    const db = await getDB();
    const spec = getActiveSpec();

    // Recolectar páginas activas con imagen
    const activeSlots = ['front', 'back', 'page3', 'page4'].slice(0, state.documentPageCount || 2);
    const pages = [];
    let thumb = null;

    activeSlots.forEach(function(slotKey, idx) {
      const imgData = state.images[slotKey];
      if (imgData && imgData.processedDataUrl) {
        if (!thumb) thumb = imgData.processedDataUrl;
        let pageLabel = 'Página ' + (idx + 1);
        if (slotKey === 'front') pageLabel = 'Anverso / Pág. 1';
        else if (slotKey === 'back') pageLabel = 'Reverso / Pág. 2';
        else if (slotKey === 'page3') pageLabel = 'Página 3 / Visa 1';
        else if (slotKey === 'page4') pageLabel = 'Página 4 / Visa 2';

        pages.push({
          slot: slotKey,
          label: pageLabel,
          dataUrl: imgData.processedDataUrl,
          filter: imgData.filter || 'color',
          rotation: imgData.rotation || 0,
          zoom: imgData.zoom || 1.0
        });
      }
    });

    if (pages.length === 0) {
      showToast('No hay imágenes cargadas para guardar en el historial.', 'warning');
      return null;
    }

    const days = (typeof retentionDays === 'number') ? retentionDays : 3; // 3 días por defecto
    const now = Date.now();
    const expiresAt = days > 0 ? (now + days * 24 * 60 * 60 * 1000) : 0;

    const record = {
      id: 'scan_' + now,
      createdAt: now,
      createdFormatted: new Date(now).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
      title: customTitle || (spec.shortName + ' (' + pages.length + ' ' + (pages.length === 1 ? 'cara' : 'caras/págs') + ')'),
      format: state.format,
      formatName: spec.name,
      category: state.activeCategory,
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

/* Restaurar un escaneo al lienzo de trabajo */
async function restoreScanToApp(id) {
  try {
    const scans = await getAllScansFromStorage();
    const scan = scans.find(function(s) { return s.id === id; });
    if (!scan) {
      showToast('No se encontró el escaneo solicitado.', 'warning');
      return;
    }

    if (scan.format && FORMAT_SPECS[scan.format]) {
      selectFormat(scan.format);
    }

    // Configurar cantidad de páginas
    const numPages = Math.min(4, Math.max(1, scan.pages ? scan.pages.length : 1));
    if (typeof setDocumentPages === 'function') {
      setDocumentPages(numPages);
    } else {
      state.documentPageCount = numPages;
    }

    // Cargar cada página
    scan.pages.forEach(function(p) {
      const slot = p.slot || 'front';
      if (state.images[slot]) {
        state.images[slot].originalSrc = p.dataUrl;
        state.images[slot].rawOriginalSrc = p.dataUrl;
        state.images[slot].processedDataUrl = p.dataUrl;
        state.images[slot].filter = p.filter || 'color';
        state.images[slot].rotation = p.rotation || 0;
        state.images[slot].zoom = p.zoom || 1.0;
        if (typeof updateSidePreview === 'function') updateSidePreview(slot);
      }
    });

    closeModal('historyModal');
    updateUI();
    showToast('¡Escaneo restaurado con éxito al lienzo de trabajo!', 'success');
  } catch (err) {
    showToast('Error al restaurar escaneo: ' + err.message, 'warning');
  }
}

/* Actualizar contador visual en la cabecera */
async function updateHistoryBadge() {
  try {
    const scans = await getAllScansFromStorage();
    const badge = $('historyCountBadge');
    if (badge) {
      badge.textContent = scans.length;
      badge.classList.toggle('hidden', scans.length === 0);
    }
  } catch (e) {}
}

/* Renderizar la lista dentro del Modal de Historial */
async function renderHistoryUI() {
  const container = $('historyItemsContainer');
  const emptyState = $('historyEmptyState');
  if (!container) return;

  container.innerHTML = '';
  const scans = await getAllScansFromStorage();

  if (scans.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    container.classList.add('hidden');
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

    card.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
          ${s.thumbnail ? `<img src="${s.thumbnail}" class="w-full h-full object-cover" alt="Miniatura" />` : `<span class="text-xl">📄</span>`}
        </div>
        <div class="min-w-0">
          <p class="font-bold text-sm text-slate-900 dark:text-white truncate">${s.title}</p>
          <div class="flex flex-wrap items-center gap-1.5 mt-1">
            <span class="text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono">${s.createdFormatted}</span>
            <span class="text-slate-300 dark:text-slate-700">•</span>
            <span class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">${s.pages ? s.pages.length : 1} páginas</span>
          </div>
          <div class="mt-1.5">${expireBadgeHtml}</div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
        <button type="button" class="btn-restore-scan px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition-colors flex items-center gap-1" data-id="${s.id}" title="Restaurar escaneo para imprimir o editar">
          <span>🔄</span>
          <span>Cargar</span>
        </button>
        <button type="button" class="btn-delete-scan p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/60 text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 text-xs transition-colors" data-id="${s.id}" title="Eliminar este escaneo">
          🗑️
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  // Event bindings para la lista renderizada
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

// Inicialización de limpieza al cargar
document.addEventListener('DOMContentLoaded', function() {
  purgeExpiredScans();
});
