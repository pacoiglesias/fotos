// 3.41 §9 + Pack 1 §10: bandeja persistente con estados, enlace con el
// documento de origen y ficha propuesta al re-archivar.
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
  vm.runInContext(fs.readFileSync('js/paperless-explore.js', 'utf8'), context);
  const api = root.RealScanPaperlessExplore;
  assert(api, 'módulo explorador cargado');
  assert.deepEqual(api.STATUSES, ['traido', 'en-revision', 'mejorado', 'impreso', 'rearchivado']);
  console.log('PASS Review tray states follow Traído → En revisión → Mejorado → Impreso / Re-archivado');

  // Traer conserva la referencia al documento de origen y no duplica en bandeja.
  const key = api.trayAdd({ origin: 'paperless', sourceId: 1334, title: 'Contrato.pdf', documentType: 3, correspondent: 2, tags: [5] });
  assert.equal(key, 'paperless:1334');
  api.trayAdd({ origin: 'paperless', sourceId: 1334, title: 'Contrato.pdf' });
  let tray = api.loadTray();
  assert.equal(tray.length, 1);
  assert.equal(tray[0].status, 'traido');
  assert.equal(tray[0].sourceId, 1334);
  console.log('PASS Bringing a document keeps its origin reference and does not duplicate tray entries');

  // Transiciones de estado válidas; estado inventado rechazado.
  api.traySetStatus(key, 'en-revision');
  api.traySetStatus(key, 'mejorado');
  api.traySetStatus(key, 'rearchivado');
  assert.equal(api.loadTray()[0].status, 'rearchivado');
  assert.throws(() => api.traySetStatus(key, 'borrado'), /no válido/);
  assert.equal(api.loadTray().length, 1, 'ningún estado borra el documento de origen');
  console.log('PASS Tray status transitions are bounded and never delete the origin document');

  // Ficha propuesta: título enlazado al origen, tipo/corresponsal/etiquetas heredados.
  const proposal = api.proposeMetadata({ origin: 'paperless', sourceId: 1334, title: 'Contrato.pdf', documentType: 3, correspondent: 2, tags: [5, 7] });
  assert.equal(proposal.title, 'Contrato · sustituye a Paperless #1334');
  assert.equal(proposal.documentType, 3);
  assert.equal(proposal.correspondent, 2);
  assert.deepEqual(proposal.tags, [5, 7]);
  const nasProposal = api.proposeMetadata({ origin: 'nas', sourceId: 'carpeta/x.pdf', title: 'x.pdf' });
  assert(!/sustituye a Paperless/.test(nasProposal.title), 'lo del NAS no se enlaza como sustitución de Paperless');
  console.log('PASS Re-archive proposal links the improved copy to its Paperless origin and inherits its record');
})().catch(e => { console.error(e); process.exitCode = 1; });
