/* RealScan Pro 3.33.0 — rediseño del mostrador.
   Solo presentación, orden y jerarquía: mueve nodos, añade envoltorios y
   estados visibles. No cambia lógica de negocio ni manejadores: mover un
   nodo conserva sus listeners. No toca el init del mostrador. */
(function(){
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const onReady = fn => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); };

  /* ---------- G3: semáforo fijo, visible y con puntos grandes ---------- */
  function dots(sem){
    $$('.desk-light', sem).forEach(light => {
      if (light.querySelector('.rs-dot')) return;
      const text = light.textContent.replace(/^●\s*/, '').trim();
      light.textContent = '';
      const dot = document.createElement('span'); dot.className = 'rs-dot';
      const label = document.createElement('span'); label.textContent = text;
      light.append(dot, label);
    });
  }
  function placeSemaphore(){
    const sem = $('#deskSemaphore'); if (!sem) return;
    const bar = $('#workbenchBar'), intake = $('#counterIntake');
    if (bar && sem.previousElementSibling !== bar) bar.after(sem);
    else if (!bar && intake && sem.nextElementSibling !== intake) intake.before(sem);
    dots(sem);
  }

  /* ---------- V5: estado visible en la bandeja del mostrador ---------- */
  function trayStatus(){
    const tray = $('#studioImageTray'); if (!tray) return;
    $$('.studio-slot', tray).forEach(slot => {
      let st = slot.querySelector('.rs-slot-status');
      if (!st) { st = document.createElement('span'); st.className = 'rs-slot-status'; slot.append(st); }
      /* La bandeja solo distingue dos estados estables: con imagen
         procesada ("Lista") o sin ella ("Por agregar"). */
      const text = slot.querySelector('img') ? '✓ Lista' : 'Por agregar';
      if (st.textContent !== text) st.textContent = text;
    });
  }

  /* ---------- O2: mostrador por secciones ----------
     Corrección tras verify 3.33.0 (9 fallos): plegar TODOS los bloques de
     formato rompía flujos verificados (tamaños, caras, cantidades, papel
     y sellos deben seguir a un toque: los afirman las suites de regresión
     y son la decisión central del trabajo). Solo se pliega lo avanzado:
     acabado e impresión (flowDocumentOptions) y exportaciones antiguas.
     El resto —tamaños, caras, cantidades, papel y herramientas— queda
     visible. El objetivo de 2–3 pantallas queda, por tanto, parcial:
     el trabajo mismo y los formatos directos ocupan esa altura. */
  let o2Open = false;
  function syncO2State(){
    const det = document.querySelector('details.rs-o2-details[data-rs-wrap="serviceFlow"]');
    if (!det) return;
    // These controls belong to multipage documents, not to an ID's faces.
    det.hidden = !!$('#flowDocumentOptions')?.hidden;
    const state = det.querySelector('.rs-o2-state');
    if (state) {
      const color = $('#flowDocColor');
      const duplex = $('#flowDocDuplex');
      const text = [
        color ? (color.options[color.selectedIndex] || {}).text : null,
        duplex ? (duplex.options[duplex.selectedIndex] || {}).text : null
      ].filter(Boolean).join(' · ');
      if (text && state.textContent !== text) state.textContent = text;
    }
    const duplexActions = $('#flowDuplexActions');
    if (duplexActions && !duplexActions.hidden && !det.open) det.open = true;
  }
  function wrapServiceFlow(){
    const block = $('#flowDocumentOptions'); if (!block) return;
    if (block.parentElement && block.parentElement.dataset.rsWrap === 'serviceFlow') { syncO2State(); return; }
    const det = document.createElement('details');
    det.className = 'rs-o2-details'; det.dataset.rsWrap = 'serviceFlow'; det.open = o2Open;
    const sum = document.createElement('summary');
    const state = document.createElement('span'); state.className = 'rs-o2-state';
    sum.append(document.createTextNode('Acabado e impresión'), state);
    det.append(sum);
    det.addEventListener('toggle', () => { o2Open = det.open; });
    block.before(det);
    det.append(block);
    syncO2State();
  }
  function moveLegacyExports(){
    const legacy = $('#workspaceLegacyExports'), target = $('#workspaceExportOptions');
    if (legacy && target && legacy.parentElement !== target) target.append(legacy);
  }

  /* ---------- O3: Recorte fuera del acordeón también si la fila se oculta ---------- */
  function moveSlotDirectRows(){
    $$('.slot-direct-tools').forEach(row => {
      const tools = row.parentElement;
      if (tools && tools.id && tools.id.indexOf('tools') === 0 && tools.parentElement) {
        tools.parentElement.insertBefore(row, tools);
      }
    });
  }

  /* ---------- O8: aviso de perfil en el dock ---------- */
  function hasActiveProfile(){
    try { if (window.RealScanPrinterProfiles && window.RealScanPrinterProfiles.getActiveId && window.RealScanPrinterProfiles.getActiveId()) return true; } catch (e) {}
    const st = $('#printerProfileStatus');
    return !!(st && st.textContent.indexOf('Perfil activo:') !== -1);
  }
  function syncProfileWarning(){
    const dock = $('#flowDock > div'); if (!dock) return;
    let warn = dock.querySelector('.rs-profile-warning');
    if (hasActiveProfile()) { if (warn) warn.remove(); return; }
    if (!warn) {
      warn = document.createElement('p');
      warn.className = 'rs-profile-warning';
      warn.textContent = '⚠ Sin perfil activo: la impresión sale sin corrección de impresora.';
      const hint = $('#flowOrderHint');
      if (hint && hint.parentElement === dock) hint.after(warn); else dock.append(warn);
    }
  }

  /* ---------- O1 + V10/G5: revisión con pie fijo, avisos arriba y kicker ---------- */
  function wrapReview(){
    const modal = $('#outputReviewModal'); if (!modal) return;
    const inner = modal.firstElementChild; if (!inner) return;
    const h2 = $('#outputReviewTitle', inner);
    if (h2 && !inner.querySelector(':scope > .rs-kicker')) {
      const kick = document.createElement('p'); kick.className = 'rs-kicker'; kick.textContent = 'Revisión';
      h2.before(kick);
    }
    const row1 = inner.querySelector('.print-review-actions'); if (!row1) return;
    let footer = inner.querySelector(':scope > .rs-review-footer');
    if (!footer) {
      footer = document.createElement('div'); footer.className = 'rs-review-footer';
      row1.before(footer); footer.append(row1);
      const row2 = footer.nextElementSibling;
      if (row2 && row2.querySelector('#btnReviewClient')) footer.append(row2);
    }
    /* Avisos encima de la acción: el aviso de borrosa y el feedback suben
       justo tras el titular, para que se vean antes de tocar Imprimir. */
    const feedbackEl = $('#printReviewIssues');
    const feedback = feedbackEl ? feedbackEl.parentElement : null;
    if (feedback && feedback.parentElement === inner) {
      const warn = inner.querySelector('.output-review-warnings');
      const atTop = feedback.previousElementSibling === h2 ||
        (warn && feedback.previousElementSibling === warn);
      if (!atTop) h2.after(feedback);
    }
    const warn = inner.querySelector('.output-review-warnings');
    if (warn && h2) {
      $$('.output-review-warnings[data-rs-moved="1"]', inner).forEach(old => { if (old !== warn) old.remove(); });
      if (warn.previousElementSibling !== h2) {
        warn.dataset.rsMoved = '1';
        h2.after(warn);
      }
    }
  }

  /* ---------- V10/G5: kickers en cola y par INE ---------- */
  function addKicker(dialogId, text){
    const dialog = document.getElementById(dialogId); if (!dialog) return;
    if (dialog.querySelector('.rs-kicker')) return;
    const h2 = dialog.querySelector('h2'); if (!h2) return;
    const kick = document.createElement('p'); kick.className = 'rs-kicker'; kick.textContent = text;
    h2.before(kick);
  }

  /* ---------- G1: ilustraciones de vacío (SVG en línea, sin red) ---------- */
  function art(cls, inner){
    const t = document.createElement('template');
    t.innerHTML = '<svg class="' + cls + '" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
    return t.content.firstElementChild;
  }
  const ART_HISTORY = '<rect x="14" y="30" width="68" height="42" rx="8"/><path d="M14 40h68"/><path d="M34 30v-10h28v10"/><path d="M28 54h40M28 63h24"/>';
  const ART_STACK = '<rect x="20" y="22" width="48" height="56" rx="8"/><path d="M28 14h40a8 8 0 018 8v48" opacity=".45"/><path d="M30 38h28M30 50h20"/>';
  const ART_SHEETS = '<rect x="24" y="14" width="48" height="68" rx="8"/><path d="M34 30h28M34 42h28M34 54h18"/>';
  function emptyArt(){
    $$('p').forEach(p => {
      if (p.textContent.indexOf('No hay escaneos guardados aún') === -1) return;
      const box = p.parentElement; if (!box || box.querySelector('.rs-empty-art')) return;
      const old = box.querySelector('span');
      const svg = art('rs-empty-art', ART_HISTORY);
      if (old) old.replaceWith(svg); else box.prepend(svg);
    });
    const queue = $('#jobQueueList');
    if (queue && !queue.querySelector('.queue-card') && !queue.querySelector('.rs-empty-art') && queue.textContent.trim()) {
      queue.insertBefore(art('rs-empty-art', ART_STACK), queue.firstChild);
    }
    const rows = $('#workspaceJobsRows');
    if (rows && !rows.querySelector('.kanban-card') && !rows.querySelector('.kanban-board') && !rows.querySelector('.rs-empty-art') && rows.textContent.trim()) {
      rows.insertBefore(art('rs-empty-art', ART_SHEETS), rows.firstChild);
    }
    $$('p.kanban-empty').forEach(p => {
      if (!p.querySelector('.rs-empty-art-sm')) p.prepend(art('rs-empty-art-sm', ART_SHEETS));
    });
  }

  /* ---------- G4: zoom a toque en la vista previa de revisión ---------- */
  function openZoom(src){
    closeZoom();
    const zoom = document.createElement('div'); zoom.id = 'rsSheetZoom';
    const img = document.createElement('img'); img.src = src; img.alt = 'Vista ampliada de la hoja';
    zoom.append(img);
    zoom.addEventListener('click', closeZoom);
    document.body.append(zoom);
  }
  function closeZoom(){
    const zoom = $('#rsSheetZoom'); if (zoom) zoom.remove();
  }
  document.addEventListener('click', e => {
    const target = e.target;
    if (!target || !target.closest) return;
    if (!target.closest('#printSheetPreview')) return;
    let src = null;
    if (target.tagName === 'image') {
      src = target.getAttribute('href') || target.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    }
    if (!src) {
      const figure = target.closest('figure');
      const svg = figure ? figure.querySelector('svg') : null;
      if (svg) src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    }
    if (src) openZoom(src);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeZoom(); });

  /* ---------- Barrido ---------- */
  function sweep(){
    try {
      placeSemaphore();
      trayStatus();
      wrapServiceFlow();
      moveLegacyExports();
      moveSlotDirectRows();
      syncProfileWarning();
      wrapReview();
      addKicker('jobQueueModal', 'Trabajos guardados');
      addKicker('inePairSplitDialog', 'Dos caras en una foto');
      emptyArt();
    } catch (e) { /* No romper la app por un adorno: el resto sigue. */ }
  }
  let queued = false;
  function scheduleSweep(){
    if (queued) return; queued = true;
    queueMicrotask(() => { queued = false; sweep(); });
  }
  onReady(() => {
    sweep();
    new MutationObserver(scheduleSweep).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
