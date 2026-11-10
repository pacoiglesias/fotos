/* Explorador «Traer de Paperless / NAS» 3.41 (§9) + Pack 1 (§10):
   bandeja «Por revisar», «Dejar perfecto», re-archivo con ficha propuesta
   y buscador único. El NAS documental de Fotos ES Paperless (la conexión
   que ya existe en producción): la pestaña NAS lo presenta por carpetas
   (tipos de documento) y la Paperless como rejilla con miniaturas. */
(function (root) {
  'use strict';
  const TRAY_KEY = 'realscan_review_tray_v1';
  const STATUSES = ['traido', 'en-revision', 'mejorado', 'impreso', 'rearchivado'];
  const STATUS_LABEL = { traido: 'Traído', 'en-revision': 'En revisión', mejorado: 'Mejorado', impreso: 'Impreso', rearchivado: 'Re-archivado' };
  const blobs = new Map(); // sesión: key -> {blob, enhancedDataUrl}

  function loadTray() { try { const t = JSON.parse(localStorage.getItem(TRAY_KEY) || '[]'); return Array.isArray(t) ? t : []; } catch { return []; } }
  function saveTray(t) { try { localStorage.setItem(TRAY_KEY, JSON.stringify(t.slice(0, 100))); } catch {} }
  function trayAdd(item) {
    const t = loadTray();
    const key = item.origin + ':' + item.sourceId;
    if (!t.some(x => x.key === key)) { t.unshift({ key, status: 'traido', addedAt: new Date().toISOString(), ...item }); saveTray(t); }
    return key;
  }
  function traySetStatus(key, status) {
    if (!STATUSES.includes(status)) throw Error('Estado no válido.');
    const t = loadTray(); const it = t.find(x => x.key === key);
    if (it) { it.status = status; it.updatedAt = new Date().toISOString(); saveTray(t); }
    return it;
  }
  // Propuesta de ficha (§10.3): parte de la ficha de origen y del OCR local
  // si lo hay; nunca se aplica sin la confirmación del diálogo de metadatos.
  function proposeMetadata(origin) {
    const base = String(origin.title || 'Documento').replace(/\.[a-z0-9]{2,5}$/i, '');
    const linked = origin.origin === 'paperless' && origin.sourceId ? base + ' · sustituye a Paperless #' + origin.sourceId : base;
    return { title: linked.slice(0, 200), documentType: origin.documentType || null, correspondent: origin.correspondent || null, tags: Array.isArray(origin.tags) ? origin.tags.slice(0, 12) : [] };
  }

  function openTray() {
    document.getElementById('reviewTray')?.close();
    const d = document.createElement('dialog');
    d.id = 'reviewTray'; d.className = 'desk-dialog review-tray';
    d.setAttribute('aria-label', 'Bandeja por revisar');
    d.innerHTML = '<header><div><small>PACK 1 · TRANSPARENCIA</small><h2>Bandeja «Por revisar»</h2></div><button type="button" data-a="close">Cerrar</button></header>'
      + '<p>Todo lo traído de Paperless / NAS, con su estado: qué se hizo y qué falta.</p>'
      + '<div data-a="items"></div><p class="paperless-status" role="status" data-state="idle" data-a="status"></p>';
    document.body.append(d);
    const q = s => d.querySelector('[data-a="' + s + '"]');
    const status = (s, t) => { const el = q('status'); el.dataset.state = s; el.textContent = t; };
    function render() {
      const t = loadTray(); const box = q('items'); box.replaceChildren();
      if (!t.length) { box.innerHTML = '<p>La bandeja está vacía. Trae un documento desde el explorador.</p>'; return; }
      for (const it of t) {
        const card = document.createElement('article'); card.dataset.status = it.status;
        const head = document.createElement('h3'); head.textContent = it.title;
        const meta = document.createElement('p');
        meta.textContent = (it.origin === 'paperless' ? 'Paperless #' + it.sourceId : 'NAS · ' + (it.sourceId || '')) + ' · ' + STATUS_LABEL[it.status] + ' · traído el ' + String(it.addedAt || '').slice(0, 10);
        card.append(head, meta);
        const actions = document.createElement('div');
        const mk = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = fn; actions.append(b); };
        mk('Abrir en Fotos', () => openInRealScan(it, status));
        mk('Dejar perfecto', () => dejarPerfecto(it, status, render));
        mk('Marcar impreso', () => { traySetStatus(it.key, 'impreso'); render(); });
        mk('Re-archivar mejorado', () => rearchive(it, status, render));
        card.append(actions); box.append(card);
      }
    }
    async function openInRealScan(it, statusFn) {
      const entry = blobs.get(it.key);
      if (!entry) { statusFn('error', 'La copia vive en esta sesión: vuelve a traer el documento desde el explorador para abrirlo.'); return; }
      if (!root.RealScanCounter || !root.RealScanDocuments) { statusFn('error', 'El módulo de documentos no está listo.'); return; }
      if (!confirm('Se abrirá como un trabajo nuevo. Guarda primero el trabajo actual. ¿Continuar?')) return;
      try {
        await root.RealScanCounter.startPrepared('document', true);
        const blob = entry.enhancedBlob || entry.blob;
        const added = await root.RealScanDocuments.addFiles([new File([blob], it.title, { type: blob.type })]);
        if (!added) throw Error('No se pudo abrir la copia.');
        traySetStatus(it.key, 'en-revision'); d.close(); root.RealScanJourney?.go('review');
      } catch (e) { statusFn('error', e.message); }
    }
    render();
    q('close').onclick = () => d.close();
    d.addEventListener('close', () => d.remove());
    d.showModal();
  }

  async function dejarPerfecto(it, statusFn, render) {
    const entry = blobs.get(it.key);
    if (!entry) { statusFn('error', 'Vuelve a traer el documento en esta sesión para mejorarlo.'); return; }
    if (!entry.blob.type.startsWith('image/')) { statusFn('idle', '«Dejar perfecto» directo es para imágenes. Para un PDF, ábrelo en Fotos y mejora página a página.'); return; }
    traySetStatus(it.key, 'en-revision'); render?.();
    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(entry.blob); });
    try {
      await root.RealScanEnhance.open({
        sourceDataUrl: dataUrl, photoMode: false,
        onAccept: async data => {
          if (data === dataUrl) return;
          const blob = await (await fetch(data)).blob();
          entry.enhancedBlob = blob; entry.enhancedDataUrl = data;
          traySetStatus(it.key, 'mejorado'); render?.();
          statusFn('ok', 'Mejora aceptada tras la comparativa. El original traído se conserva.');
        }
      });
    } catch (e) { statusFn('error', e.message); }
  }

  async function rearchive(it, statusFn, render) {
    const P = root.RealScanPaperless; const entry = blobs.get(it.key);
    if (!entry) { statusFn('error', 'Vuelve a traer el documento en esta sesión para re-archivarlo.'); return; }
    const proposal = proposeMetadata(it);
    statusFn('idle', 'Ficha propuesta: «' + proposal.title + '». Confírmala o corrígela en el diálogo de metadatos.');
    const meta = await root.RealScanPaperlessMetadata.review(proposal.title, {});
    if (!meta) { statusFn('idle', 'Re-archivo cancelado: no se envió nada.'); return; }
    const blob = entry.enhancedBlob || entry.blob;
    try {
      const receipt = await P.send(blob, meta.title, m => statusFn('checking', m), { metadata: meta, operationId: 'rearchive-' + it.key + '-' + Date.now() });
      if (receipt?.status === 'archived') { traySetStatus(it.key, 'rearchivado'); render?.(); statusFn('ok', 'Re-archivado como documento NUEVO #' + (receipt.documentId || '') + ', enlazado al de origen. El original no se ha tocado.'); }
      else statusFn('idle', 'Paperless lo está procesando o no lo confirmó: compruébalo en la bandeja de envíos antes de repetir.');
    } catch (e) { statusFn('error', e.message); }
  }

  function openExplore() {
    const P = root.RealScanPaperless;
    if (!P?.hasToken()) { P?.openSettings('Configura el acceso para explorar Paperless.'); return; }
    document.getElementById('paperlessExplore')?.close();
    const d = document.createElement('dialog');
    d.id = 'paperlessExplore'; d.className = 'desk-dialog paperless-explore';
    d.setAttribute('aria-label', 'Traer de Paperless o NAS');
    d.innerHTML = '<header><div><small>ARCHIVO DEL NAS</small><h2>Traer de Paperless / NAS</h2></div><button type="button" data-a="close">Cerrar</button></header>'
      + '<nav class="explore-tabs"><button type="button" data-tab="paperless" class="active">Paperless · rejilla</button><button type="button" data-tab="nas">NAS · carpetas</button><button type="button" data-tab="search">Buscador único</button></nav>'
      + '<form data-a="form"><label>Buscar título o contenido<input data-a="query" type="search" maxlength="160" placeholder="Nombre, referencia o texto del OCR"></label>'
      + '<div class="explore-filters"><label>Tipo<select data-a="type"><option value="">Todos</option></select></label><label>Etiqueta<select data-a="tag"><option value="">Todas</option></select></label><label>Corresponsal<select data-a="corr"><option value="">Todos</option></select></label><label>Desde<input data-a="from" type="date"></label><label>Hasta<input data-a="to" type="date"></label></div>'
      + '<button type="submit">Buscar</button></form>'
      + '<div data-a="folders" hidden></div><div class="explore-grid" data-a="grid"></div>'
      + '<nav aria-label="Páginas"><button type="button" data-a="prev">Anterior</button><button type="button" data-a="next">Siguiente</button></nav>'
      + '<p class="paperless-status" role="status" data-state="idle" data-a="status"></p>'
      + '<section data-a="detail" hidden></section>';
    document.body.append(d);
    const q = s => d.querySelector('[data-a="' + s + '"]');
    const status = (s, t) => { const el = q('status'); el.dataset.state = s; el.textContent = t; };
    let page = 1, tab = 'paperless', catalogData = { tags: [], documentTypes: [], correspondents: [] }, urls = [];
    const nameOf = (list, id) => list.find(x => x.id === id)?.name || '';
    function clearUrls() { for (const u of urls) URL.revokeObjectURL(u); urls = []; }

    async function loadCatalog() {
      try {
        catalogData = await P.catalog();
        for (const [sel, list] of [[q('type'), catalogData.documentTypes], [q('tag'), catalogData.tags], [q('corr'), catalogData.correspondents]]) {
          const cur = sel.value; sel.replaceChildren(new Option(sel === q('type') ? 'Todos' : sel === q('tag') ? 'Todas' : 'Todos', ''));
          for (const v of list) sel.append(new Option(v.name, String(v.id)));
          sel.value = cur;
        }
        renderFolders();
      } catch { status('error', 'No se pudieron cargar los catálogos del NAS.'); }
    }
    function renderFolders() {
      const box = q('folders'); box.replaceChildren();
      if (tab !== 'nas') { box.hidden = true; return; }
      box.hidden = false;
      const all = document.createElement('button'); all.type = 'button'; all.textContent = '📁 Todos los documentos';
      all.onclick = () => { q('type').value = ''; page = 1; list(); };
      box.append(all);
      for (const t of catalogData.documentTypes) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = '📁 ' + t.name;
        b.onclick = () => { q('type').value = String(t.id); page = 1; list(); };
        box.append(b);
      }
    }
    async function list() {
      clearUrls(); q('detail').hidden = true; q('grid').replaceChildren();
      status('checking', tab === 'search' ? 'Buscando en Fotos, Paperless y NAS…' : 'Buscando en tu NAS…');
      try {
        const filters = { query: q('query').value, page, documentType: q('type').value ? Number(q('type').value) : null, tag: q('tag').value ? Number(q('tag').value) : null, correspondent: q('corr').value ? Number(q('corr').value) : null, createdFrom: q('from').value, createdTo: q('to').value };
        const data = await P.browse(filters);
        if (tab === 'search') renderUnified(data); else renderGrid(data);
        q('prev').disabled = page <= 1; q('next').disabled = !data.next;
        status(data.count ? 'ok' : 'idle', data.count ? data.count + ' documentos · página ' + page : 'No se encontraron documentos.');
      } catch (e) { status('error', e.message); }
    }
    function card(row, originLabel) {
      const el = document.createElement('article'); el.className = 'explore-card';
      const img = document.createElement('img'); img.alt = 'Miniatura de ' + row.title; img.loading = 'lazy';
      P.asset(row.id, 'thumb').then(async blob => { const u = URL.createObjectURL(blob); urls.push(u); img.src = u; }).catch(() => { img.alt = 'Sin miniatura'; });
      const h = document.createElement('h3'); h.textContent = row.title;
      const m = document.createElement('p'); m.textContent = originLabel + ' · ' + String(row.created || '').slice(0, 10) + ' · ' + (nameOf(catalogData.documentTypes, row.documentType) || 'Sin tipo');
      el.append(img, h, m);
      el.onclick = () => detail(row);
      return el;
    }
    function renderGrid(data) { for (const row of data.results) q('grid').append(card(row, 'Paperless')); }
    function renderUnified(data) {
      const grid = q('grid');
      const trayMatches = loadTray().filter(it => (it.title || '').toLowerCase().includes(q('query').value.toLowerCase()));
      if (trayMatches.length) {
        const h = document.createElement('h3'); h.textContent = 'En Fotos · bandeja por revisar'; grid.append(h);
        for (const it of trayMatches) { const p = document.createElement('p'); p.textContent = '🖥 ' + it.title + ' — ' + it.status; grid.append(p); }
      }
      const h2 = document.createElement('h3'); h2.textContent = 'En Paperless · NAS'; grid.append(h2);
      for (const row of data.results) grid.append(card(row, 'Paperless · NAS'));
    }
    async function detail(row) {
      const box = q('detail'); box.hidden = false; box.replaceChildren();
      const h = document.createElement('h3'); h.textContent = row.title;
      const ficha = document.createElement('p');
      ficha.textContent = 'Fecha: ' + String(row.created || '').slice(0, 10) + ' · Corresponsal: ' + (nameOf(catalogData.correspondents, row.correspondent) || '—') + ' · Tipo: ' + (nameOf(catalogData.documentTypes, row.documentType) || '—') + ' · Etiquetas: ' + (row.tags.map(t => nameOf(catalogData.tags, t)).filter(Boolean).join(', ') || '—');
      const snippet = document.createElement('p'); snippet.textContent = row.snippet || '';
      box.append(h, ficha, snippet);
      status('checking', 'Cargando vista previa…');
      try {
        const blob = await P.asset(row.id, 'preview');
        const u = URL.createObjectURL(blob); urls.push(u);
        const view = document.createElement(blob.type === 'application/pdf' ? 'iframe' : 'img');
        view.src = u; view.className = 'explore-preview'; if (view.tagName === 'IMG') view.alt = 'Vista previa';
        box.append(view); status('ok', 'Vista previa dentro de Fotos.');
      } catch { status('idle', 'Sin vista previa para este documento; puedes traerlo igualmente.'); }
      const bring = document.createElement('button'); bring.type = 'button'; bring.textContent = 'Traer a Fotos';
      bring.onclick = async () => {
        bring.disabled = true; status('checking', 'Trayendo el original…');
        try {
          const blob = await P.retrieve(row.id);
          const origin = { origin: 'paperless', sourceId: row.id, title: row.title, documentType: row.documentType, correspondent: row.correspondent, tags: row.tags };
          const key = trayAdd(origin);
          blobs.set(key, { blob });
          status('ok', 'Traído a la bandeja «Por revisar» conservando su referencia: Paperless #' + row.id + '. El original del NAS no se ha tocado.');
        } catch (e) { status('error', e.message); } finally { bring.disabled = false; }
      };
      box.append(bring);
      box.scrollIntoView({ block: 'nearest' });
    }
    d.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
      tab = b.dataset.tab;
      d.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('active', x === b));
      page = 1; renderFolders(); list();
    });
    q('form').onsubmit = e => { e.preventDefault(); page = 1; list(); };
    q('prev').onclick = () => { page = Math.max(1, page - 1); list(); };
    q('next').onclick = () => { page++; list(); };
    q('close').onclick = () => d.close();
    d.addEventListener('close', () => { clearUrls(); d.remove(); });
    d.showModal(); loadCatalog(); list();
  }

  function mount() {
    const anchor = document.getElementById('headerNas');
    if (!anchor) return;
    if (!document.getElementById('headerExplore')) {
      const b = document.createElement('button');
      b.id = 'headerExplore'; b.type = 'button'; b.className = 'header-explore';
      b.setAttribute('aria-label', 'Traer de Paperless o NAS');
      b.innerHTML = '<span>⬇ Traer</span>'; b.onclick = openExplore;
      anchor.after(b);
    }
    if (!document.getElementById('headerTray')) {
      const b = document.createElement('button');
      b.id = 'headerTray'; b.type = 'button'; b.className = 'header-tray';
      b.setAttribute('aria-label', 'Bandeja por revisar');
      b.innerHTML = '<span>📥 Por revisar</span>'; b.onclick = openTray;
      document.getElementById('headerExplore').after(b);
    }
  }
  document.addEventListener('DOMContentLoaded', mount);
  root.RealScanPaperlessExplore = { openExplore, openTray, trayAdd, traySetStatus, loadTray, proposeMetadata, STATUSES };
})(window);
