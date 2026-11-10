/* 3.42 · Un solo botón «Archivo» en cabecera (auditoría §8.3): Traer,
   Ingerir y Bandeja viven tras una única puerta con pestañas y el estado
   de conexión se cuenta una sola vez, arriba. Desaparecen como botones
   sueltos NAS / ⬆ Paperless / ⬇ Traer / 📥 Por revisar; sus módulos
   (explorador, ingesta, bandeja y el buscador clásico) no cambian: el
   centro «Archivo» los abre desde su pestaña. Este módulo también
   unifica la entrada al historial (Trabajos con pestañas Pedidos /
   Impresiones / Escaneos) y rescata la fila de atajos del mostrador. */
(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  const unlocked = () => $('loginOverlay')?.classList.contains('hidden') && (!$('setupOverlay') || $('setupOverlay').classList.contains('hidden'));
  let hub = null, mounted = false, tries = 0;

  function openArchivo(tab = 'traer') {
    if (!unlocked()) return;
    if (!hub) {
      hub = document.createElement('dialog');
      hub.id = 'archivoHub'; hub.className = 'desk-dialog archivo-hub';
      hub.setAttribute('aria-label', 'Archivo: traer, ingerir y bandeja');
      hub.innerHTML = '<header><div><small>TU ARCHIVO EN EL NAS</small><h2>Archivo</h2></div><button type="button" data-a="close">Cerrar</button></header>'
        + '<p data-a="conn" role="status"></p>'
        + '<div class="archivo-conn-actions"><button type="button" data-a="settings">Conectar / revisar acceso</button></div>'
        + '<nav class="archivo-tabs" aria-label="Qué quieres hacer con tu archivo">'
        + '<button type="button" data-tab="traer" class="active">Traer</button>'
        + '<button type="button" data-tab="ingerir">Ingerir</button>'
        + '<button type="button" data-tab="bandeja">Bandeja</button></nav>'
        + '<section data-panel="traer"><p>Busca en Paperless por título, contenido, tipo o fecha, mira la vista previa y trae una copia a Fotos. El original del NAS no se toca.</p>'
        + '<div class="archivo-actions"><button type="button" data-a="explore">Buscar y traer documentos</button><button type="button" data-a="browser">Cargar una copia para trabajar</button></div></section>'
        + '<section data-panel="ingerir" hidden><p>Sube archivos sueltos o una carpeta entera a Paperless: primero verás el manifiesto con lo que entra y lo que no, y al final un informe por archivo.</p>'
        + '<div class="archivo-actions"><button type="button" data-a="ingest">Elegir archivos o una carpeta</button></div></section>'
        + '<section data-panel="bandeja" hidden><p>Lo que trajiste, con su estado: qué se hizo y qué falta. Desde ahí lo dejas perfecto y lo re-archivas en un solo paso.</p>'
        + '<p data-a="traycount"></p><div class="archivo-actions"><button type="button" data-a="tray">Abrir la bandeja «Por revisar»</button></div></section>'
        + '<dl class="archivo-notes"><dt>Pedido guardado</dt><dd>Queda en este navegador para continuar el trabajo. No es una copia en el NAS.</dd>'
        + '<dt>Descargar PDF</dt><dd>El navegador entrega un archivo a tu equipo. Paperless no lo recibe automáticamente.</dd>'
        + '<dt>Archivar en NAS</dt><dd>Se envía una copia a Paperless. Espera la confirmación de archivado; «Procesando» todavía no confirma el archivo.</dd></dl>';
      document.body.append(hub);
      const q = s => hub.querySelector('[data-a="' + s + '"]');
      const show = name => {
        for (const b of hub.querySelectorAll('[data-tab]')) b.classList.toggle('active', b.dataset.tab === name);
        for (const p of hub.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== name;
        if (name === 'bandeja') {
          const n = root.RealScanPaperlessExplore?.loadTray?.().length || 0;
          q('traycount').textContent = n ? 'Ahora mismo hay ' + n + ' documento(s) en la bandeja.' : 'La bandeja está vacía: trae un documento desde la pestaña Traer.';
        }
      };
      for (const b of hub.querySelectorAll('[data-tab]')) b.onclick = () => show(b.dataset.tab);
      hub._showTab = show;
      const go = fn => { hub.close(); fn?.(); };
      q('close').onclick = () => hub.close();
      q('settings').onclick = () => go(() => root.RealScanPaperless?.openSettings('Conecta tu NAS una sola vez en este navegador. Vale para Traer, Ingerir y la Bandeja.'));
      q('explore').onclick = () => go(() => root.RealScanPaperlessExplore?.openExplore());
      q('browser').onclick = () => go(() => root.RealScanPaperless?.openBrowser());
      q('ingest').onclick = () => go(() => root.RealScanPaperlessIngest?.open());
      q('tray').onclick = () => go(() => root.RealScanPaperlessExplore?.openTray());
      hub.addEventListener('close', () => hub.remove ? null : null);
    }
    const conn = hub.querySelector('[data-a="conn"]');
    conn.textContent = root.RealScanPaperless?.hasToken()
      ? 'Paperless está conectado en este navegador. Este mismo acceso vale para las tres pestañas.'
      : 'Paperless no está conectado en este navegador. Conéctalo una sola vez y valdrá para Traer, Ingerir y la Bandeja.';
    hub._showTab(tab);
    if (!hub.open) hub.showModal();
  }

  function paintArchiveState() {
    const b = $('headerArchive');
    if (b) b.dataset.state = root.RealScanPaperless?.hasToken() ? 'ok' : 'idle';
  }

  function mount() {
    if (mounted) return;
    const anchor = $('btnOpenReceiveModal');
    if (!anchor) { if (tries++ < 60) setTimeout(mount, 250); return; }
    // Fuera las puertas sueltas: queda una sola, «Archivo».
    for (const id of ['headerNas', 'headerExplore', 'headerTray', 'headerIngest']) $(id)?.remove();
    if (!$('headerArchive')) {
      const b = document.createElement('button');
      b.id = 'headerArchive'; b.type = 'button'; b.className = 'header-nas header-archive';
      b.setAttribute('aria-label', 'Archivo · traer, ingerir y bandeja por revisar');
      b.title = 'Traer de Paperless, ingerir archivos o abrir la bandeja por revisar';
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 4h16v16H4zM4 9h16M9 13h6M9 17h4"/></svg><span>Archivo</span>';
      b.onclick = () => openArchivo('traer');
      anchor.before(b);
    }
    paintArchiveState();
    // «Cargar desde NAS» del paso de recepción NO se toca: sigue abriendo
    // el buscador clásico (o la configuración si falta el acceso), que es
    // su camino corto de siempre. La unificación es de la cabecera.
    // La fila de atajos del mostrador, fuera del cajón cerrado y con sus
    // textos: botones reales, legibles y de tamaño táctil (CSS final-342).
    const shortcuts = document.querySelector('#deskTools .desk-shortcuts');
    const desk = $('deskStart');
    if (shortcuts && desk && shortcuts.parentElement !== desk) {
      desk.append(shortcuts);
      for (const b of shortcuts.querySelectorAll('button')) if (!b.getAttribute('aria-label') && b.textContent.trim()) b.setAttribute('aria-label', b.textContent.trim());
    }
    mounted = true;
  }

  // Un solo historial: las entradas antiguas de «Historial» abren Trabajos
  // en su pestaña de Escaneos, el mismo sitio que pedidos e impresiones.
  document.addEventListener('click', async e => {
    const t = e.target?.closest?.('#btnOpenHistory, #hudBtnHistory, #btnDashboardOpenModal');
    if (!t || !unlocked()) return;
    e.preventDefault(); e.stopPropagation();
    try {
      await root.RealScanWorkspacePolish?.openJobs('orders');
      document.querySelector('[data-jobs-tab="scans"]')?.click();
    } catch { /* Si Trabajos no está listo, no se abre el modal antiguo. */ }
  }, true);

  document.addEventListener('realscan:paperless-changed', paintArchiveState);
  document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 320));
  root.RealScanArchivo = { open: openArchivo };
})(window);
