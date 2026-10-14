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

    card.innerHTML = `
      <div class="flex items-start gap-3 min-w-0">
        <div class="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center cursor-pointer btn-dash-restore" data-id="${s.id}" title="Hacer clic para cargar en el lienzo">
          ${s.thumbnail ? `<img src="${s.thumbnail}" class="w-full h-full object-cover" alt="Miniatura" />` : `<span class="text-2xl">📄</span>`}
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-bold text-xs text-slate-900 dark:text-white truncate" title="${s.title}">${s.title}</p>
          <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded">${s.pages ? s.pages.length : 1} cara(s)</span>
            <span class="text-[9.5px] text-slate-400 font-mono">${s.createdFormatted}</span>
          </div>
          <div class="mt-1">${expireTag}</div>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
        <button type="button" class="btn-dash-restore py-1 px-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center gap-1 transition-colors" data-id="${s.id}" title="Cargar este documento en el lienzo de trabajo">
          <span>🔄</span><span class="hidden sm:inline">Cargar</span>
        </button>
        <button type="button" class="btn-dash-pdf py-1 px-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-1 transition-colors" data-id="${s.id}" title="Descargar PDF 1:1 directo">
          <span>📄</span><span class="hidden sm:inline">PDF</span>
        </button>
        <button type="button" class="btn-dash-print py-1 px-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-1 transition-colors" data-id="${s.id}" title="Imprimir directo a escala 100%">
          <span>🖨️</span><span class="hidden sm:inline">Imprimir</span>
        </button>
        <button type="button" class="btn-dash-delete py-1 px-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/60 text-slate-500 hover:text-red-600 font-semibold flex items-center justify-center transition-colors" data-id="${s.id}" title="Eliminar escaneo">
          <span>🗑️</span>
        </button>
      </div>
    `;

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
        <button type="button" class="btn-zip-scan px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1" data-id="${s.id}" title="Descargar paquete ZIP con todas las imágenes de este documento">
          <span>📦</span>
          <span>ZIP</span>
        </button>
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

/* Importar respaldo JSON */
async function importScansFromJson(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const items = Array.isArray(data) ? data : (data && Array.isArray(data.scans) ? data.scans : null);

    if (!items || items.length === 0) {
      showToast('El archivo seleccionado no contiene escaneos válidos.', 'warning');
      return;
    }

    const db = await getDB();
    let imported = 0;

    for (let i = 0; i < items.length; i++) {
      const s = items[i];
      if (s && s.id && s.pages) {
        await new Promise(function(resolve, reject) {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(s);
          req.onsuccess = function() { imported++; resolve(true); };
          req.onerror = function(e) { reject(e.target.error); };
        });
      }
    }

    updateHistoryBadge();
    renderHistoryUI();
    if (typeof logActivity === 'function') {
      logActivity('Importación de Respaldo', 'Importados ' + imported + ' escaneos desde JSON');
    }
    showToast('¡Se importaron ' + imported + ' escaneos al historial correctamente!', 'success');
  } catch (err) {
    showToast('Error leyendo archivo de respaldo: ' + err.message, 'warning');
  }
}

// Inicialización de limpieza al cargar
document.addEventListener('DOMContentLoaded', function() {
  purgeExpiredScans();
});
