/* Daily operations: portable backups and an independent physical print reference. */
const BACKUP_MAX_BYTES = 50 * 1024 * 1024;
function isPortableBackupImage(value) {
  return typeof value === 'string' && /^data:image\/(?:jpeg|jpg|png|webp|gif|bmp|x-ms-bmp|avif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
async function validateBackupRecords(items) {
  if (!Array.isArray(items) || !items.length) throw new Error('El respaldo no contiene trabajos.');
  let pages = 0;
  const checked = new Set();
  for (const [index, record] of items.entries()) {
    if (!record || !Array.isArray(record.pages) || !record.pages.length || record.pages.length > 4)
      throw new Error('Trabajo ' + (index + 1) + ': debe contener de 1 a 4 páginas.');
    const slots = new Set();
    for (const [pageIndex, page] of record.pages.entries()) {
      if (!page || !isPortableBackupImage(page.dataUrl)) throw new Error('Trabajo ' + (index + 1) + ': imagen ausente o no portable.');
      const slot = page.slot || ['front', 'back', 'page3', 'page4'][pageIndex];
      if (!['front', 'back', 'page3', 'page4'].includes(slot) || slots.has(slot)) throw new Error('Trabajo ' + (index + 1) + ': páginas repetidas o desconocidas.');
      slots.add(slot);
      for (const key of ['dataUrl', 'rawOriginalSrc', 'originalSrc', 'croppedSrc']) {
        const value = page[key];
        if (value == null || value === '') continue;
        if (!isPortableBackupImage(value)) throw new Error('Trabajo ' + (index + 1) + ': imagen ' + key + ' no portable.');
        if (!checked.has(value)) {
          const image = new Image();
          image.src = value;
          try { await image.decode(); } catch (_) { throw new Error('Trabajo ' + (index + 1) + ': imagen dañada.'); }
          if (!image.naturalWidth || !image.naturalHeight) throw new Error('Imagen sin dimensiones.');
          checked.add(value);
        }
      }
      pages++;
    }
  }
  return { jobs: items.length, pages: pages };
}
async function inspectBackupFile(file) {
  if (!file || file.size > BACKUP_MAX_BYTES) throw new Error('Selecciona un respaldo JSON de hasta 50 MB.');
  let data;
  try { data = JSON.parse(await file.text()); } catch (_) { throw new Error('El archivo no tiene un formato JSON válido.'); }
  let encrypted = false;
  if (window.RealScanBackupCrypto && window.RealScanBackupCrypto.isEncryptedBackupObject(data)) {
    const password = await window.RealScanBackupCrypto.promptBackupPassword({
      title: '🔒 Respaldo cifrado',
      message: 'Este respaldo está cifrado. Ingresa su contraseña solo para verificarlo (no se importa nada).',
      confirm: false,
      confirmText: 'Verificar'
    });
    if (!password) throw new Error('Verificación cancelada: no se ingresó la contraseña.');
    data = JSON.parse(await window.RealScanBackupCrypto.decryptText(data, password));
    encrypted = true;
  }
  if (!Array.isArray(data) && data && data.count !== undefined && data.count !== data.scans?.length)
    throw new Error('El número de trabajos no coincide con el contenido del respaldo.');
  const result = await validateBackupRecords(Array.isArray(data) ? data : data?.scans);
  result.encrypted = encrypted;
  return result;
}
function createCalibrationDocument(paperId) {
  if (!window.jspdf) throw new Error('El generador PDF todavía no está disponible.');
  const paper = window.PAPER_SPECS[['a4', 'letter', 'oficio', 'legal'].includes(paperId || state.paperSize) ? (paperId || state.paperSize) : 'a4'];
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: paper.jsPdfFormat, orientation: 'portrait' });
  const pageW = paper.widthMm, pageH = paper.heightMm;
  doc.setFontSize(17);
  doc.text('RealScan - Prueba de tamaño real', 20, 22);
  doc.setFontSize(11);
  doc.text('Papel: ' + paper.shortName + ' (' + pageW + ' x ' + pageH + ' mm). Imprimir al 100%, sin ajustar a página.', 20, 32);
  doc.text('Mide con una regla física y registra el resultado en la app.', 20, 40);

  // Marco completo de la hoja a 10 mm del borde: comprueba escala Y márgenes.
  doc.setLineWidth(0.3);
  doc.rect(10, 10, pageW - 20, pageH - 20);
  doc.setFontSize(9);
  doc.text('Marco de la hoja: debe medir ' + (pageW - 20) + ' x ' + (pageH - 20) + ' mm (a 10 mm de cada borde)', 12, pageH - 5);

  // Regla horizontal de 100 mm (marcas cada 1 mm, largas cada 10 mm).
  doc.setLineWidth(0.2);
  const rulerY = 58;
  doc.line(20, rulerY, 120, rulerY);
  for (let i = 0; i <= 100; i++) doc.line(20 + i, rulerY, 20 + i, rulerY - (i % 10 === 0 ? 5 : 2));
  doc.text('Regla horizontal: 100 mm', 20, rulerY + 8);

  // Regla vertical de 100 mm para el eje contrario.
  const rulerX = pageW - 25;
  doc.line(rulerX, 48, rulerX, 148);
  for (let j = 0; j <= 100; j++) doc.line(rulerX, 48 + j, rulerX + (j % 10 === 0 ? 5 : 2), 48 + j);
  doc.text('Regla vertical: 100 mm', rulerX - 42, 155);

  // Regla corta de 50 mm (la de siempre, para el registro rápido).
  doc.line(25, 78, 75, 78);
  for (let k = 0; k <= 50; k++) doc.line(25 + k, 78, 25 + k, 78 - (k % 10 === 0 ? 5 : 2));
  doc.text('50 mm / 5 cm', 25, 87);

  doc.rect(25, 100, 85.6, 53.98);
  doc.text('Referencia de tarjeta: 85.60 x 53.98 mm', 25, 163);
  doc.rect(130, 100, 35, 45);
  doc.text('Foto: 35 x 45 mm', 125, 163);
  doc.text(['Mide las dos reglas de 100 mm, la de 50 mm y ambos recuadros.', 'Anota las medidas en «Registro de calibración física» de la app:', 'ahí se calcula la desviación de escala en cada eje.', 'Si no coinciden, revisa papel y escala en el controlador de impresión.', 'Esta hoja no cambia el proyecto ni certifica tu impresora.', 'Repite la prueba al cambiar de impresora, papel o configuración.'], 20, 182);
  return doc;
}

/* ---------- Registro de calibración física (medición con regla real) ---------- */
function getCalibrationLog() {
  try {
    const raw = localStorage.getItem(window.CALIBRATION_LOG_KEY || 'realscan_calibration_log_v1');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}
function saveCalibrationMeasurement(ruleMm, cardMm, paperShortName) {
  const ruleDevPct = Math.round(((ruleMm - 50) / 50) * 1000) / 10;
  const cardDevPct = Math.round(((cardMm - 85.6) / 85.6) * 1000) / 10;
  const ok = Math.abs(ruleDevPct) <= 1 && Math.abs(cardDevPct) <= 1;
  const entry = {
    at: new Date().toISOString(),
    paper: paperShortName || '',
    ruleMm: ruleMm,
    cardMm: cardMm,
    ruleDevPct: ruleDevPct,
    cardDevPct: cardDevPct,
    ok: ok
  };
  const log = getCalibrationLog();
  log.unshift(entry);
  try {
    localStorage.setItem(window.CALIBRATION_LOG_KEY || 'realscan_calibration_log_v1', JSON.stringify(log.slice(0, 50)));
  } catch (e) {}
  if (typeof logActivity === 'function') {
    logActivity('Calibración Física', 'Regla 50 mm midió ' + ruleMm + ' mm (' + (ruleDevPct >= 0 ? '+' : '') + ruleDevPct + '%); tarjeta 85.6 mm midió ' + cardMm + ' mm (' + (cardDevPct >= 0 ? '+' : '') + cardDevPct + '%); ' + (ok ? 'escala correcta' : 'REVISAR escala'));
  }
  return entry;
}
function renderCalibrationStatus() {
  const el = document.getElementById('calibrationLogStatus');
  if (!el) return;
  const log = getCalibrationLog();
  if (!log.length) {
    el.textContent = 'Sin mediciones registradas en este equipo.';
    return;
  }
  const last = log[0];
  const when = new Date(last.at).toLocaleString('es-MX');
  el.textContent = (last.ok ? '✅ Última medición (' + when + '): escala correcta. ' : '⚠️ Última medición (' + when + '): desviación fuera del ±1 %. ') +
    'Regla: ' + last.ruleMm + ' mm (' + (last.ruleDevPct >= 0 ? '+' : '') + last.ruleDevPct + '%). Tarjeta: ' + last.cardMm + ' mm (' + (last.cardDevPct >= 0 ? '+' : '') + last.cardDevPct + '%). Total registradas: ' + log.length + '.';
}
document.addEventListener('DOMContentLoaded', function() {
  const status = document.getElementById('dailyCareStatus');
  const input = document.getElementById('dailyBackupFile');
  document.getElementById('dailyBackup').addEventListener('click', async function() {
    this.disabled = true;
    status.textContent = 'Preparando el respaldo de los trabajos guardados…';
    try {
      const encryptCheckbox = document.getElementById('dailyBackupEncrypt');
      const result = await exportAllScansAsJson({ encrypt: !!(encryptCheckbox && encryptCheckbox.checked) });
      status.textContent = result ? 'Descarga solicitada: ' + result.count + ' trabajos' + (result.encrypted ? ' (respaldo CIFRADO: guarda bien la contraseña)' : '') + '. Verifica el archivo descargado y conserva una copia en otra unidad.' : 'No se generó un respaldo. Revisa el aviso y los trabajos guardados.';
    } finally { this.disabled = false; }
  });
  document.getElementById('dailyVerify').addEventListener('click', function() { input.click(); });
  input.addEventListener('change', async function() {
    const file = input.files[0];
    if (!file) return;
    const button = document.getElementById('dailyVerify');
    button.disabled = true;
    status.textContent = 'Verificando todas las imágenes del respaldo…';
    try {
      const result = await inspectBackupFile(file);
      status.textContent = 'Respaldo verificado' + (result.encrypted ? ' (cifrado, contraseña correcta)' : '') + ': ' + result.jobs + ' trabajos y ' + result.pages + ' páginas legibles. No se ha importado ni cambiado ningún trabajo. Conserva el archivo en otra unidad.';
    } catch (err) { status.textContent = 'No se pudo verificar: ' + err.message; }
    finally { input.value = ''; button.disabled = false; }
  });
  // Recordatorio de respaldo (AÑADIDO 6): discreto, descartable y con el
  // umbral configurable. El respaldo cifrado es la copia completa; el
  // archivado a Paperless y la nube son complementos distintos.
  const LAST_BACKUP_KEY = 'realscan_last_backup_at_v1';
  const DISMISS_KEY = 'realscan_backup_reminder_dismissed_at_v1';
  const DAYS_KEY = 'realscan_backup_reminder_days_v1';
  function reminderThreshold() {
    const sel = document.getElementById('backupReminderDays');
    const v = parseInt((sel && sel.value) || (function() { try { return localStorage.getItem(DAYS_KEY); } catch (e) { return null; } })() || '7', 10);
    return [3, 7, 14, 30].includes(v) ? v : 7;
  }
  async function renderBackupReminder() {
    const info = document.getElementById('lastBackupInfo');
    const banner = document.getElementById('backupReminderBanner');
    if (!info) return;
    let last = 0;
    try { last = parseInt(localStorage.getItem(LAST_BACKUP_KEY) || '0', 10) || 0; } catch (e) {}
    const days = reminderThreshold();
    if (!last) info.textContent = 'Último respaldo: nunca. Tu historial vive solo en este equipo.';
    else {
      const d = Math.floor((Date.now() - last) / 86400000);
      info.textContent = 'Último respaldo: ' + (d <= 0 ? 'hoy' : (d === 1 ? 'ayer' : 'hace ' + d + ' días')) + ' (' + new Date(last).toLocaleDateString('es-ES') + ').';
    }
    let count = 0;
    try { if (typeof getAllScansFromStorage === 'function') count = (await getAllScansFromStorage()).length; } catch (e) {}
    let dismissedAt = 0;
    try { dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10) || 0; } catch (e) {}
    const due = count > 0 && (!last || (Date.now() - last) >= days * 86400000);
    const recentlyDismissed = !!dismissedAt && (Date.now() - dismissedAt) < days * 86400000;
    if (banner) banner.classList.toggle('hidden', !(due && !recentlyDismissed));
  }
  window.RealScanBackupReminder = { render: renderBackupReminder };
  const daysSel = document.getElementById('backupReminderDays');
  if (daysSel) {
    try { daysSel.value = localStorage.getItem(DAYS_KEY) || '7'; } catch (e) {}
    daysSel.addEventListener('change', function() { try { localStorage.setItem(DAYS_KEY, daysSel.value); } catch (e) {} renderBackupReminder(); });
  }
  const backupNowBtn = document.getElementById('btnBackupNowReminder');
  if (backupNowBtn) backupNowBtn.addEventListener('click', function() { const b = document.getElementById('dailyBackup'); if (b) b.click(); });
  const dismissBackupBtn = document.getElementById('btnDismissBackupReminder');
  if (dismissBackupBtn) dismissBackupBtn.addEventListener('click', function() { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {} renderBackupReminder(); });
  renderBackupReminder();

  // Marca del negocio y próximo folio (AÑADIDO 10.4)
  const brandInput = document.getElementById('shopBrandInput');
  if (brandInput) {
    try { brandInput.value = localStorage.getItem('realscan_shop_brand_v1') || ''; } catch (e) {}
    brandInput.addEventListener('change', function() {
      try { localStorage.setItem('realscan_shop_brand_v1', brandInput.value.trim()); } catch (e) {}
      showToast('🏷️ Nombre del negocio guardado: aparecerá en el pie de tus entregas digitales.', 'success');
    });
  }
  const folioLabel = document.getElementById('folioNextLabel');
  if (folioLabel && window.RealScanFolio) folioLabel.textContent = window.RealScanFolio.peek();

  document.getElementById('dailyCalibration').addEventListener('click', async function() {
    try {
      if (typeof ensureJsPdf === 'function') await ensureJsPdf();
      createCalibrationDocument(document.getElementById('dailyCalibrationPaper').value).save('RealScan_Prueba_Tamano_Real.pdf');
      status.textContent = 'Hoja de prueba preparada. Imprime al 100 % y mide las referencias con una regla física. Después registra las medidas aquí abajo.';
    } catch (err) { status.textContent = err.message; }
  });
  const calSave = document.getElementById('dailyCalibrationSave');
  if (calSave) {
    renderCalibrationStatus();
    calSave.addEventListener('click', function() {
      const ruleVal = parseFloat(document.getElementById('calRuleInput').value);
      const cardVal = parseFloat(document.getElementById('calCardInput').value);
      if (!isFinite(ruleVal) || ruleVal <= 0 || !isFinite(cardVal) || cardVal <= 0) {
        status.textContent = 'Para registrar la calibración, escribe cuánto midieron la regla de 50 mm y la tarjeta de 85.6 mm.';
        return;
      }
      const paperSel = document.getElementById('dailyCalibrationPaper');
      const paperName = paperSel && paperSel.options[paperSel.selectedIndex] ? paperSel.options[paperSel.selectedIndex].textContent : '';
      const entry = saveCalibrationMeasurement(ruleVal, cardVal, paperName);
      renderCalibrationStatus();
      status.textContent = entry.ok
        ? '✅ Calibración registrada: la escala está dentro del ±1 %. La impresión respeta el tamaño real.'
        : '⚠️ Calibración registrada con desviación mayor al ±1 %. Revisa que la impresora esté al 100 % (sin «ajustar a página») y repite la prueba.';
    });
  }

  /* ---------- Perfiles de calibración por impresora ---------- */
  const ppApi = window.RealScanPrinterProfiles;
  const ppListEl = document.getElementById('printerProfilesList');
  if (ppApi && ppListEl) {
    const ppStatus = document.getElementById('printerProfileStatus');
    let ppEditingId = null;
    const ppField = function(id) { return document.getElementById(id); };
    function ppRender() {
      const profiles = ppApi.list();
      const activeId = ppApi.getActiveId();
      ppListEl.innerHTML = '';
      profiles.forEach(function(p) {
        const row = document.createElement('div');
        row.className = 'flex flex-wrap items-center gap-2 px-2.5 py-2 rounded-lg border ' +
          (p.id === activeId ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700');
        const info = document.createElement('span');
        info.className = 'text-xs font-semibold flex-1 min-w-[180px]';
        info.textContent = (p.id === activeId ? '✅ Activo · ' : '') + ppApi.describe(p);
        row.appendChild(info);
        [['Aplicar', function() { ppApi.setActive(p.id); ppRender(); ppSay('Perfil activo: ' + p.name + '. Se aplicará al imprimir y al descargar el PDF.'); }],
         ['Editar', function() {
            ppEditingId = p.id;
            ppField('printerProfileName').value = p.name;
            ppField('printerScaleX').value = p.scaleX;
            ppField('printerScaleY').value = p.scaleY;
            ppField('printerOffsetX').value = p.offsetX;
            ppField('printerOffsetY').value = p.offsetY;
            ppSay('Editando el perfil «' + p.name + '». Ajusta los valores y pulsa «Guardar perfil».');
          }],
         ['Borrar', async function() {
            const ok = (typeof showConfirmDialog === 'function')
              ? await showConfirmDialog('¿Borrar el perfil de impresora «' + p.name + '»?', { danger: true, confirmText: 'Borrar perfil' })
              : true;
            if (!ok) return;
            ppApi.remove(p.id);
            if (ppEditingId === p.id) ppEditingId = null;
            ppRender();
            ppSay('Perfil borrado.');
          }]].forEach(function(pair) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[11px] font-bold';
          b.textContent = pair[0];
          b.addEventListener('click', pair[1]);
          row.appendChild(b);
        });
        ppListEl.appendChild(row);
      });
      const active = ppApi.getActive();
      ppStatus.textContent = active
        ? 'Perfil activo: ' + ppApi.describe(active) + '. La corrección se aplica a la geometría del PDF al imprimir/exportar.'
        : 'Sin perfil activo: la impresión sale sin corrección de impresora.';
    }
    function ppSay(msg) { ppStatus.textContent = msg; if (status) status.textContent = msg; }
    ppField('btnPrinterProfileSave').addEventListener('click', function() {
      const name = (ppField('printerProfileName').value || '').trim();
      if (!name) { ppSay('Escribe primero el nombre de la impresora (ej. «HP del mostrador»).'); return; }
      const saved = ppApi.upsert({
        id: ppEditingId || undefined,
        name: name,
        scaleX: parseFloat(ppField('printerScaleX').value),
        scaleY: parseFloat(ppField('printerScaleY').value),
        offsetX: parseFloat(ppField('printerOffsetX').value),
        offsetY: parseFloat(ppField('printerOffsetY').value)
      });
      ppApi.setActive(saved.id);
      ppEditingId = null;
      if (typeof logActivity === 'function') logActivity('Perfil de Impresora', 'Guardado y activado: ' + ppApi.describe(saved));
      ppRender();
      ppSay('✅ Perfil «' + saved.name + '» guardado y activo. Imprime la hoja de prueba para comprobar la corrección.');
    });
    ppField('btnPrinterProfileFromMeasurement').addEventListener('click', function() {
      const log = getCalibrationLog();
      if (!log.length) { ppSay('Todavía no hay mediciones registradas. Imprime la hoja de prueba, mide y registra la medición primero.'); return; }
      const last = log[0];
      const corr = ppApi.correctionFromMeasurement(last.ruleMm, 100);
      ppField('printerScaleX').value = corr;
      ppField('printerScaleY').value = corr;
      ppSay('Corrección sugerida desde la última medición (la regla de 50 mm salió a ' + last.ruleMm + ' mm): escala ' + corr + ' % en X e Y. Ponle nombre a la impresora y guarda el perfil. Si también mediste el eje vertical, ajusta Y a mano.');
    });
    ppRender();
  }
});
