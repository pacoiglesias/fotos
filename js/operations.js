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
  if (!Array.isArray(data) && data && data.count !== undefined && data.count !== data.scans?.length)
    throw new Error('El número de trabajos no coincide con el contenido del respaldo.');
  return validateBackupRecords(Array.isArray(data) ? data : data?.scans);
}
function createCalibrationDocument(paperId) {
  if (!window.jspdf) throw new Error('El generador PDF todavía no está disponible.');
  const paper = window.PAPER_SPECS[['a4', 'letter', 'oficio', 'legal'].includes(paperId || state.paperSize) ? (paperId || state.paperSize) : 'a4'];
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: paper.jsPdfFormat, orientation: 'portrait' });
  doc.setFontSize(17);
  doc.text('RealScan - Prueba de tamaño real', 20, 25);
  doc.setFontSize(11);
  doc.text('Papel: ' + paper.shortName + '. Imprimir al 100%, sin ajustar a página.', 20, 36);
  doc.text('Mide entre los centros de las marcas. La regla debe medir 50 mm.', 20, 44);
  doc.setLineWidth(0.2);
  doc.line(25, 65, 75, 65);
  for (let i = 0; i <= 50; i++) doc.line(25 + i, 65, 25 + i, 65 - (i % 10 === 0 ? 5 : 2));
  doc.text('50 mm / 5 cm', 25, 74);
  doc.rect(25, 90, 85.6, 53.98);
  doc.text('Referencia de tarjeta: 85.60 x 53.98 mm', 25, 153);
  doc.rect(130, 90, 35, 45);
  doc.text('Foto: 35 x 45 mm', 125, 153);
  doc.text(['Mide el ancho y el alto de ambos recuadros.', 'Si no coinciden, revisa papel y escala en el controlador de impresión.', 'Esta hoja no cambia el proyecto ni certifica tu impresora.', 'Repite la prueba al cambiar de impresora, papel o configuración.'], 20, 178);
  return doc;
}
document.addEventListener('DOMContentLoaded', function() {
  const status = document.getElementById('dailyCareStatus');
  const input = document.getElementById('dailyBackupFile');
  document.getElementById('dailyBackup').addEventListener('click', async function() {
    this.disabled = true;
    status.textContent = 'Preparando el respaldo de los trabajos guardados…';
    try {
      const result = await exportAllScansAsJson();
      status.textContent = result ? 'Descarga solicitada: ' + result.count + ' trabajos. Verifica el archivo descargado y conserva una copia en otra unidad.' : 'No se generó un respaldo. Revisa el aviso y los trabajos guardados.';
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
      status.textContent = 'Respaldo verificado: ' + result.jobs + ' trabajos y ' + result.pages + ' páginas legibles. No se ha importado ni cambiado ningún trabajo. Conserva el archivo en otra unidad.';
    } catch (err) { status.textContent = 'No se pudo verificar: ' + err.message; }
    finally { input.value = ''; button.disabled = false; }
  });
  document.getElementById('dailyCalibration').addEventListener('click', function() {
    try {
      createCalibrationDocument(document.getElementById('dailyCalibrationPaper').value).save('RealScan_Prueba_Tamano_Real.pdf');
      status.textContent = 'Hoja de prueba preparada. Imprime al 100 % y mide las referencias con una regla física.';
    } catch (err) { status.textContent = err.message; }
  });
});
