/* 3.43 · Abrir una copia de Paperless en RealScan, sin muros.
   Un solo camino para las dos puertas (buscador clásico de Paperless y
   explorador §9 / bandeja «Por revisar»):
   - CERO confirm() nativos: abrir la copia NO destruye el trabajo en
     curso; lo actual se guarda solo en «Trabajos» antes de cambiar.
   - El origen se ve: la copia entra en la bandeja «Por revisar» como
     «En revisión» y el documento abierto lleva su banda de origen.
   - El aterrizaje es visual: al terminar, las páginas están en pantalla
     (miniaturas + vista previa grande), no un panel de opciones vacío.
   Mientras el PDF se lee, el progreso se ve en el propio documento
   («Leyendo página n de N…» de document-job) porque el diálogo de
   origen se cierra ANTES de procesar, no después. */
(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  const unlocked = () => $('loginOverlay')?.classList.contains('hidden') && (!$('setupOverlay') || $('setupOverlay').classList.contains('hidden'));
  let opening = false;
  let origin = null; // {title, sourceId, trayKey, jobRevision}

  function fileNameFor(title, blob) {
    const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' })[blob.type] || 'pdf';
    const base = (String(title || 'Documento de Paperless').replace(/[\x00-\x1f<>:"/\\|?*]/g, '').replace(/\.(pdf|png|jpe?g|webp)$/i, '').trim().slice(0, 80) || 'Documento de Paperless');
    return base + '.' + ext;
  }
  function occupied() {
    const doc = root.RealScanDocuments?.status();
    if (doc?.active && doc.count > 0) return 'document';
    if (Object.values(root.state?.images || {}).some(i => i.originalSrc || i.processedDataUrl || i._reading)) return 'slots';
    if (root.RealScanQrSync?.getInboxFiles?.().length) return 'inbox';
    return null;
  }
  // Guarda el trabajo en curso en «Trabajos» sin preguntar: es la red
  // que convierte «abrir copia» en un gesto sin miedo. Devuelve
  // 'libre' | 'guardado' | 'sin-guardar' (la cola no lo admitió).
  async function preserveCurrent() {
    const kind = occupied();
    if (!kind) return 'libre';
    if (kind === 'inbox') return 'libre'; // la bandeja de recepción QR no se toca al cambiar de servicio ya preparado
    const doc = root.RealScanDocuments?.status();
    if (doc?.busy || root.RealScanWorkflow?.describe().busy) throw Error('Espera a que termine el proceso actual y vuelve a intentarlo.');
    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      await root.RealScanJobQueue.saveCurrent((kind === 'document' ? 'Documento anterior' : 'Trabajo anterior') + ' · ' + hora);
      return 'guardado';
    } catch { return 'sin-guardar'; }
  }
  async function askDiscard() {
    if (typeof root.showConfirmDialog !== 'function') return false;
    return root.showConfirmDialog('Tu trabajo actual no cabe en la cola de «Trabajos» (máximo 12 trabajos o 80 MB) y no se ha podido guardar. Si abres la copia, el trabajo actual se perderá.', { title: 'El trabajo actual no se pudo guardar', confirmText: 'Abrir la copia igualmente', danger: true });
  }

  function banner() {
    const ws = $('documentWorkspace');
    if (!ws) return;
    const doc = root.RealScanDocuments?.status();
    const valid = origin && doc?.active && doc.count > 0 && (root.state?._jobRevision || 0) === origin.jobRevision;
    let el = $('paperlessOriginBanner');
    if (!valid) { if (el) el.remove(); if (origin && !doc?.active) origin = null; return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'paperlessOriginBanner'; el.className = 'paperless-origin-banner'; el.setAttribute('role', 'status');
      // Justo sobre la rejilla de páginas: dentro del área de trabajo
      // el panel de flujo del servicio ocupa la parte alta, y la banda
      // debe quedar pegada a lo que se está mirando — las páginas.
      const grid = ws.querySelector('.document-grid');
      if (grid) grid.before(el); else ws.prepend(el);
    }
    if (el.dataset.key !== origin.trayKey) {
      el.dataset.key = origin.trayKey;
      const text = document.createElement('p');
      text.innerHTML = '';
      const strong = document.createElement('strong'); strong.textContent = 'Copia de Paperless · ' + origin.title;
      const span = document.createElement('span');
      span.textContent = ' · Paperless #' + origin.sourceId + ' · está en tu bandeja «Por revisar» como En revisión. El original del NAS no se ha tocado: trabaja sobre esta copia y entrégala desde esta misma pantalla.';
      text.append(strong, span);
      const actions = document.createElement('div'); actions.className = 'paperless-origin-actions';
      const tray = document.createElement('button'); tray.type = 'button'; tray.textContent = 'Abrir la bandeja «Por revisar»';
      tray.onclick = () => root.RealScanPaperlessExplore?.openTray();
      const hide = document.createElement('button'); hide.type = 'button'; hide.textContent = 'Quitar aviso';
      hide.onclick = () => { origin = null; banner(); };
      actions.append(tray, hide);
      el.replaceChildren(text, actions);
    }
  }
  document.addEventListener('realscan:document-updated', banner);

  async function openCopy({ blob, title = '', sourceId = null, documentType = null, correspondent = null, tags = [], closeSource = null } = {}) {
    if (opening) return { opened: false, reason: 'busy' };
    if (!unlocked()) throw Error('Desbloquea el puesto.');
    if (!blob?.size) throw Error('La copia está vacía.');
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) throw Error('RealScan abre copias en PDF o imagen.');
    if (!root.RealScanCounter || !root.RealScanDocuments) throw Error('El módulo de documentos no está listo.');
    opening = true;
    try {
      const kept = await preserveCurrent();
      if (kept === 'sin-guardar') {
        const seguir = await askDiscard();
        if (!seguir) return { opened: false, reason: 'cancelled' };
      }
      closeSource?.();
      root.showToast?.(kept === 'guardado'
        ? 'Tu trabajo anterior quedó guardado en «Trabajos». Abriendo la copia de Paperless…'
        : 'Abriendo la copia de Paperless…', 'info');
      await root.RealScanCounter.startPrepared('document', true);
      // El progreso se mira donde ocurre: el documento ya está activo
      // y su estado («Leyendo página n de N…») se actualiza por página.
      $('documentWorkspace')?.scrollIntoView({ block: 'start', behavior: 'auto' });
      const name = fileNameFor(title, blob);
      const added = await root.RealScanDocuments.addFiles([new File([blob], name, { type: blob.type })]);
      if (!added) {
        root.showToast?.('No se pudo abrir la copia. El motivo está en el estado del documento, bajo las páginas.', 'warning');
        return { opened: false, reason: 'add-failed' };
      }
      // La copia queda registrada en la bandeja con su origen, y su
      // blob en la memoria de sesión para poder re-archivarla desde ahí.
      const explore = root.RealScanPaperlessExplore;
      let trayKey = null;
      if (explore && Number.isSafeInteger(sourceId) && sourceId > 0) {
        trayKey = explore.trayAdd({ origin: 'paperless', sourceId, title: name, documentType, correspondent, tags });
        explore.rememberCopy?.(trayKey, blob);
        explore.traySetStatus(trayKey, 'en-revision');
      }
      origin = { title: String(title || name), sourceId, trayKey: trayKey || '', jobRevision: root.state?._jobRevision || 0 };
      banner();
      // Aterrizaje visual: primero el recorrido normal (foco a las
      // páginas) y al final la mesa a la parte alta del documento, para
      // que lo primero que se vea sean las páginas y su vista previa.
      root.RealScanJourney?.go('review');
      const settle = () => {
        if (!unlocked() || !root.RealScanDocuments?.status().active) return;
        banner();
        // Escritorio: banda de origen + páginas caben juntas y manda la
        // banda. Móvil: la banda es alta y la barra fija de entrega
        // tapa el pie; manda la primera página (la banda queda a un
        // toque de scroll hacia arriba y el toast ya contó el origen).
        const target = innerWidth < 768
          ? (document.querySelector('#docPages .document-page') || $('paperlessOriginBanner') || $('documentWorkspace'))
          : ($('paperlessOriginBanner') || $('documentWorkspace'));
        target?.scrollIntoView({ block: 'start', behavior: 'auto' });
      };
      requestAnimationFrame(() => requestAnimationFrame(settle));
      setTimeout(settle, 120);
      // Segundo asiento tardío: fuentes e imágenes que terminan de
      // cargar pueden mover la rejilla unos píxeles tras el primero.
      setTimeout(settle, 650);
      const count = root.RealScanDocuments.status().count;
      root.showToast?.('Copia abierta: ' + count + ' página(s) de «' + String(title || name) + '». Revisa cada página y entrégala desde aquí.', 'success');
      return { opened: true, count, trayKey };
    } finally { opening = false; }
  }

  root.RealScanPaperlessImport = { openCopy, currentOrigin: () => origin };
})(window);
