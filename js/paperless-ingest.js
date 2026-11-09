/* Ingesta a Paperless 3.41 (§3): selección de archivos/carpetas, manifiesto
   con filtro de tipos y tamaño, cola secuencial uno a uno con sondeo de
   tareas, informe descargable y reanudación sin reenviar lo archivado. */
(function (root) {
  'use strict';
  const MAX_BYTES = 30 * 1024 * 1024; // §6/decisión: tope de 30 MB por defecto (reversible)
  const BATCH_TAG_NAME = 'Ingesta Fotos';
  const STORE_KEY = 'realscan_paperless_ingest_v1';
  const ALLOWED = new Set(['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'tif', 'tiff', 'txt', 'md', 'csv', 'html', 'htm', 'eml', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp']);
  const POLL_MS = 2000, POLL_MAX = 30, RECONCILE_AFTER_MS = 5 * 60 * 1000;

  const extOf = name => { const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ''; };
  function classify(file) {
    if (!ALLOWED.has(extOf(file.name))) return { ok: false, reason: 'tipo' };
    if (file.size > MAX_BYTES) return { ok: false, reason: 'tamano' };
    if (!file.size) return { ok: false, reason: 'tipo' };
    return { ok: true };
  }
  function estimateMinutes(count) { return count * 2; } // OCR en el NAS: ~2 min/documento (dato del diseño)
  function saveManifest(m) { try { localStorage.setItem(STORE_KEY, JSON.stringify(m)); } catch {} }
  function loadManifest() { try { const m = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); return m && Array.isArray(m.items) ? m : null; } catch { return null; } }
  function clearManifest() { try { localStorage.removeItem(STORE_KEY); } catch {} }

  // Recorrido recursivo de un directorio FSA conservando la ruta relativa.
  async function walkDirectory(handle, prefix, out) {
    for await (const entry of handle.values()) {
      const path = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.kind === 'file') { const f = await entry.getFile(); out.push({ file: f, path }); }
      else if (entry.kind === 'directory') await walkDirectory(entry, path, out);
    }
    return out;
  }
  async function pickFiles() {
    if (typeof root.showOpenFilePicker === 'function') {
      const handles = await root.showOpenFilePicker({ multiple: true });
      const out = [];
      for (const h of handles) { const f = await h.getFile(); out.push({ file: f, path: f.name }); }
      return out;
    }
    return pickViaInput(false);
  }
  async function pickFolder() {
    if (typeof root.showDirectoryPicker === 'function') {
      const dir = await root.showDirectoryPicker();
      return walkDirectory(dir, dir.name, []);
    }
    return pickViaInput(true);
  }
  function pickViaInput(folder) {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file'; input.multiple = true;
      if (folder) input.setAttribute('webkitdirectory', '');
      input.onchange = () => {
        const out = [...input.files].map(f => ({ file: f, path: f.webkitRelativePath || f.name }));
        resolve(out);
      };
      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  function reportCsv(m) {
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = ['estado,ruta,tamano_bytes,id_paperless,motivo'];
    for (const it of m.items) lines.push([it.status, it.path, it.file?.size ?? it.size ?? '', it.documentId || '', it.message || it.omitReason || ''].map(esc).join(','));
    lines.push(['total', m.items.length, '', '', 'inicio ' + (m.startedAt || '') + ' · fin ' + (m.finishedAt || '')].map(esc).join(','));
    return lines.join('\n');
  }

  function open() {
    const P = root.RealScanPaperless;
    if (!P?.hasToken()) { P?.openSettings('Configura el acceso para la ingesta a Paperless.'); return; }
    document.getElementById('paperlessIngest')?.close();
    const d = document.createElement('dialog');
    d.id = 'paperlessIngest'; d.className = 'desk-dialog paperless-ingest';
    d.setAttribute('aria-label', 'Ingesta a Paperless');
    d.innerHTML = '<header><div><small>INGESTA · NAS</small><h2>Ingesta a Paperless</h2></div><button type="button" data-a="close">Cerrar</button></header>'
      + '<p>Elige archivos o carpetas enteras del PC. Antes de subir nada verás el manifiesto: lo que Paperless no puede consumir no se envía. La subida va <strong>uno a uno</strong>, al ritmo del NAS.</p>'
      + '<p class="paperless-ingest-warn">No uses esta vía para las carpetas que ya están en la carpeta <em>consume</em> del NAS: entrarían duplicadas por dos vías.</p>'
      + '<div class="paperless-ingest-actions"><button type="button" data-a="files">Elegir archivos</button><button type="button" data-a="folder">Elegir carpeta</button>'
      + '<label class="paperless-ingest-tag"><input type="checkbox" data-a="tag" checked> Etiquetar el lote como «Ingesta Fotos»</label></div>'
      + '<section data-a="manifest" hidden></section>'
      + '<div class="paperless-ingest-progress" hidden><progress max="100" value="0"></progress><p data-a="progressText" role="status"></p></div>'
      + '<ul class="paperless-ingest-list" data-a="list"></ul>'
      + '<p class="paperless-status" role="status" data-state="idle" data-a="status"></p>'
      + '<footer><button type="button" data-a="start" disabled>Empezar ingesta</button><button type="button" data-a="pause" hidden>Pausar</button><button type="button" data-a="cancel" hidden>Cancelar</button><button type="button" data-a="resume" hidden>Reanudar lote anterior</button><button type="button" data-a="retry" hidden>Reintentar solo los fallidos</button><button type="button" data-a="report" hidden>Descargar informe</button></footer>';
    document.body.append(d);
    const q = s => d.querySelector('[data-a="' + s + '"]');
    const status = (state, text) => { const el = q('status'); el.dataset.state = state; el.textContent = text; };
    let picked = [], manifest = null, running = false, paused = false, cancelled = false;

    function renderManifest() {
      const items = picked.map(p => { const c = classify(p.file); return { path: p.path, size: p.file.size, status: c.ok ? 'queued' : 'omitted', omitReason: c.ok ? '' : (c.reason === 'tamano' ? 'Supera 30 MB' : 'Tipo no consumible por Paperless'), file: p.file }; });
      manifest = { startedAt: '', finishedAt: '', items };
      const byType = {};
      for (const it of items) { const e = extOf(it.path) || '(sin extensión)'; byType[e] = (byType[e] || 0) + 1; }
      const totalBytes = items.reduce((a, i) => a + (i.size || 0), 0);
      const sendable = items.filter(i => i.status === 'queued').length, omitted = items.length - sendable;
      q('manifest').hidden = false;
      q('manifest').innerHTML = '<h3>Manifiesto del lote</h3><p>' + items.length + ' archivos · ' + (totalBytes / 1048576).toFixed(1) + ' MB · '
        + Object.entries(byType).map(([k, v]) => k + ': ' + v).join(' · ') + '</p><p>' + sendable + ' para subir · ' + omitted + ' omitidos (tipo o tamaño).'
        + ' Estimación honesta: el procesamiento en el NAS puede tardar ~' + estimateMinutes(sendable) + ' min en total; la app lo irá confirmando por partes.</p>';
      q('start').disabled = !sendable;
      renderList();
    }
    function renderList() {
      const ul = q('list'); ul.replaceChildren();
      for (const it of (manifest?.items || [])) {
        const li = document.createElement('li');
        li.dataset.status = it.status;
        li.textContent = it.path + ' — ' + ({ queued: 'en cola', uploading: 'subiendo', processing: 'procesando en Paperless', pending: 'recibido, procesamiento pendiente', archived: 'archivado' + (it.documentId ? ' #' + it.documentId : ''), duplicate: 'duplicado', failed: 'fallido: ' + (it.message || ''), unknown: 'sin confirmar — comprobar en Paperless', omitted: 'omitido: ' + it.omitReason })[it.status] || it.status;
        ul.append(li);
      }
    }
    async function resolveBatchTag() {
      if (!q('tag').checked) return [];
      try {
        const cat = await P.catalog();
        const found = cat.tags.find(t => t.name === BATCH_TAG_NAME);
        return found ? [found.id] : [];
      } catch { return []; }
    }
    async function pollTask(it) {
      const started = Date.now();
      for (let i = 0; i < POLL_MAX; i++) {
        if (cancelled) return 'cancelled';
        while (paused && !cancelled) await new Promise(r => setTimeout(r, 300));
        let res;
        try { res = await P.checkTaskDetailed(it.taskId); } catch { return 'unknown'; }
        if (res.status !== 'processing') { Object.assign(it, res); return res.status; }
        if (Date.now() - started > RECONCILE_AFTER_MS) { it.status = 'pending'; return 'pending'; }
        await new Promise(r => setTimeout(r, POLL_MS));
      }
      it.status = 'pending'; return 'pending';
    }
    async function runQueue(onlyFailed) {
      if (running || !manifest) return;
      running = true; cancelled = false; paused = false;
      q('start').hidden = true; q('retry').hidden = true; q('pause').hidden = false; q('cancel').hidden = false;
      manifest.startedAt = manifest.startedAt || new Date().toISOString();
      const tags = await resolveBatchTag();
      const queue = manifest.items.filter(it => onlyFailed ? it.status === 'failed' : it.status === 'queued');
      let doneBytes = 0; const totalBytes = queue.reduce((a, i) => a + (i.size || 0), 0) || 1;
      for (const it of queue) {
        if (cancelled) break;
        while (paused && !cancelled) await new Promise(r => setTimeout(r, 300));
        // Reanudación: lo ya archivado con la misma huella no se reenvía.
        try { it.fingerprint = it.fingerprint || await P.fingerprint(it.file); } catch {}
        it.attempts = (it.attempts || 0);
        let uploaded = false;
        for (let attempt = 0; attempt <= 2 && !uploaded && !cancelled; attempt++) {
          try {
            it.status = 'uploading'; renderList();
            const { taskId } = await P.uploadBatch(it.file, { title: it.file.name, tags, onProgress: m => { q('progressText').textContent = it.path + ' — ' + m; } });
            it.taskId = taskId; uploaded = true;
          } catch (e) {
            if (e.status === 401 || e.status === 403) { status('error', 'Paperless rechazó el acceso: se detiene todo el lote. Revisa el token.'); cancelled = true; it.status = 'failed'; it.message = e.message; break; }
            if (e.status === 400) { it.status = 'failed'; it.message = e.message; break; }
            if (e.unknown) { it.status = 'unknown'; it.message = e.message; break; }
            if (attempt === 2) { it.status = 'failed'; it.message = e.message || 'Error de red al subir.'; }
            else await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
        if (uploaded) { it.status = 'processing'; renderList(); await pollTask(it); }
        doneBytes += it.size || 0;
        const bar = q('progress'); // contenedor
        d.querySelector('.paperless-ingest-progress').hidden = false;
        d.querySelector('progress').value = Math.round(doneBytes / totalBytes * 100);
        renderList(); persist();
      }
      // Conciliación final de los pendientes.
      for (const it of manifest.items.filter(i => i.status === 'pending')) {
        try { const res = await P.checkTaskDetailed(it.taskId); if (res.status !== 'processing') Object.assign(it, res); } catch {}
      }
      manifest.finishedAt = new Date().toISOString(); persist(); renderList();
      running = false; q('pause').hidden = true; q('cancel').hidden = true;
      q('retry').hidden = !manifest.items.some(i => i.status === 'failed');
      q('report').hidden = false;
      const ok = manifest.items.filter(i => i.status === 'archived').length;
      status('ok', 'Ingesta terminada: ' + ok + ' archivados de ' + manifest.items.length + '. Descarga el informe para el detalle.');
    }
    function persist() { if (manifest) saveManifest({ startedAt: manifest.startedAt, finishedAt: manifest.finishedAt, items: manifest.items.map(({ file, ...rest }) => rest) }); }

    q('files').onclick = async () => { try { picked = picked.concat(await pickFiles()); if (picked.length) renderManifest(); } catch { /* cancelado */ } };
    q('folder').onclick = async () => { try { picked = picked.concat(await pickFolder()); if (picked.length) renderManifest(); } catch { /* cancelado */ } };
    q('start').onclick = () => runQueue(false);
    q('retry').onclick = () => runQueue(true);
    q('pause').onclick = () => { paused = !paused; q('pause').textContent = paused ? 'Continuar' : 'Pausar'; };
    q('cancel').onclick = () => { cancelled = true; status('idle', 'Ingesta cancelada. Lo ya archivado se conserva.'); };
    q('report').onclick = () => {
      const blob = new Blob([reportCsv(manifest)], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'informe-ingesta-paperless.csv'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
    const previous = loadManifest();
    if (previous && previous.items.some(i => ['queued', 'uploading', 'processing', 'pending'].includes(i.status))) {
      q('resume').hidden = false;
      q('resume').onclick = () => {
        status('idle', 'Lote anterior recuperado: vuelve a elegir los mismos archivos/carpetas y pulsa «Empezar ingesta»; lo ya archivado no se reenviará.');
        q('resume').hidden = true;
      };
    }
    d.addEventListener('close', () => d.remove());
    d.showModal();
  }

  function mount() {
    const anchor = document.getElementById('headerNas');
    if (!anchor || document.getElementById('headerIngest')) return;
    const b = document.createElement('button');
    b.id = 'headerIngest'; b.type = 'button'; b.className = 'header-ingest';
    b.setAttribute('aria-label', 'Ingesta a Paperless');
    b.innerHTML = '<span>⬆ Paperless</span>';
    b.onclick = open;
    anchor.after(b);
  }
  document.addEventListener('DOMContentLoaded', mount);
  root.RealScanPaperlessIngest = { open, classify, reportCsv, loadManifest, clearManifest, ALLOWED, MAX_BYTES, _walkDirectory: walkDirectory };
})(window);
