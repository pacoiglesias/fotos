// 3.41 §3: filtro del manifiesto, recorrido recursivo de carpetas e informe.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
(async () => {
  const values = new Map();
  const root = { addEventListener() {} };
  const context = vm.createContext({
    window: root,
    document: { addEventListener() {}, getElementById: () => null },
    localStorage: { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) },
    setTimeout, clearTimeout,
  });
  vm.runInContext(fs.readFileSync('js/paperless-ingest.js', 'utf8'), context);
  const api = root.RealScanPaperlessIngest;
  assert(api, 'módulo de ingesta cargado');

  // Filtro de tipos: entra lo consumible, queda fuera código/subtítulos/ejecutables.
  for (const n of ['a.pdf', 'foto.JPG', 'doc.docx', 'hoja.xlsx', 'nota.txt', 'correo.eml', 'presentacion.odp'])
    assert.equal(api.classify({ name: n, size: 100 }).ok, true, n + ' debe entrar');
  for (const n of ['codigo.c', 'subs.srt', 'programa.exe', 'lista.m3u', 'sinextension', 'script.js'])
    assert.deepEqual(api.classify({ name: n, size: 100 }), { ok: false, reason: 'tipo' }, n + ' debe omitirse por tipo');
  console.log('PASS Ingest manifest filters non-consumable types and admits PDF/image/Office/text');

  // Filtro de tamaño: tope 30 MB por defecto.
  assert.equal(api.classify({ name: 'grande.pdf', size: 30 * 1024 * 1024 }).ok, true);
  assert.deepEqual(api.classify({ name: 'grande.pdf', size: 30 * 1024 * 1024 + 1 }), { ok: false, reason: 'tamano' });
  console.log('PASS Ingest enforces the 30 MB per-file cap');

  // Recorrido recursivo conservando la ruta relativa.
  const file = (name, size) => ({ kind: 'file', name, getFile: async () => ({ name, size }) });
  const dir = (name, entries) => ({ kind: 'directory', name, values: async function* () { for (const e of entries) yield e; } });
  const tree = dir('Lote', [file('uno.pdf', 10), dir('sub', [file('dos.png', 20), dir('deep', [file('tres.txt', 30)])]), file('fuera.srt', 5)]);
  const out = [];
  await api._walkDirectory(tree, tree.name, out);
  assert.deepEqual(out.map(x => x.path), ['Lote/uno.pdf', 'Lote/sub/dos.png', 'Lote/sub/deep/tres.txt', 'Lote/fuera.srt']);
  console.log('PASS Ingest walks folders recursively keeping relative paths');

  // Informe: entrados/duplicados/fallidos/omitidos con sus campos.
  const csv = api.reportCsv({ startedAt: '2026-11-09T10:00:00Z', finishedAt: '2026-11-09T10:05:00Z', items: [
    { status: 'archived', path: 'Lote/uno.pdf', size: 10, documentId: 42 },
    { status: 'duplicate', path: 'Lote/dos.png', size: 20, message: 'Ya estaba en Paperless' },
    { status: 'failed', path: 'Lote/tres.txt', size: 30, message: 'Error de red' },
    { status: 'omitted', path: 'Lote/fuera.srt', size: 5, omitReason: 'Tipo no consumible por Paperless' },
  ] });
  assert(csv.includes('"archived","Lote/uno.pdf","10","42"'));
  assert(csv.includes('"duplicate","Lote/dos.png"'));
  assert(csv.includes('"failed","Lote/tres.txt","30","","Error de red"'));
  assert(csv.includes('"omitted","Lote/fuera.srt"'));
  console.log('PASS Ingest report lists archived/duplicates/failed/omitted with ids and reasons');
})().catch(e => { console.error(e); process.exitCode = 1; });
