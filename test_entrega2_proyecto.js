/**
 * RealScan Pro — Suite de Validación para Entrega 2
 * Ciclo de vida de proyecto, separación de trabajos, borrador, presets y Undo.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createSandbox() {
  const mockStorage = {};

  const sandbox = {
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    window: {},
    Image: function() {
      this.naturalWidth = 1000;
      this.naturalHeight = 600;
      this.src = '';
      this.onload = null;
      this.onerror = null;
    },
    document: {
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        style: {}
      }),
      body: { appendChild: () => {}, removeChild: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    localStorage: {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = String(v); },
      removeItem: (k) => { delete mockStorage[k]; },
      clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
    },
    $: (id) => null,
    $$: (sel) => [],
    showToast: (msg, type) => {},
    closeModal: (id) => {},
    updateUI: () => {},
    updatePreviewAnnotations: () => {},
    savePreferences: () => {},
    confirm: (msg) => true,
    state: {
      activeCategory: 'docs',
      format: 'card',
      paperSize: 'a4',
      printMode: 'both',
      sheetLayout: 'same_page',
      documentPageCount: 2,
      documentCustomTitle: '',
      duplicateCard: false,
      includeRulerFooter: true,
      includeDocLabels: true,
      includeCutMarks: true,
      customWidth: 85.6,
      customHeight: 54.0,
      customUnit: 'mm',
      photoCopies: 4,
      mixTwoPhotos: false,
      passportOpenOrientation: 'portrait',
      passportPageOrientation: 'landscape',
      _jobRevision: 1,
      _processingPending: 0,
      images: {
        front: { rawOriginalSrc: null, croppedSrc: null, isCropApplied: false, cropData: null, warpQuad: null, originalSrc: null, processedDataUrl: null, naturalWidth: 1000, naturalHeight: 600, rotation: 0, zoom: 1.0, fitMode: 'cover', filter: 'color', brightness: 0, contrast: 0, panX: 0, panY: 0, showMmGrid: false, showOaciGuide: false },
        back:  { rawOriginalSrc: null, croppedSrc: null, isCropApplied: false, cropData: null, warpQuad: null, originalSrc: null, processedDataUrl: null, naturalWidth: 1000, naturalHeight: 600, rotation: 0, zoom: 1.0, fitMode: 'cover', filter: 'color', brightness: 0, contrast: 0, panX: 0, panY: 0, showMmGrid: false, showOaciGuide: false },
        page3: { rawOriginalSrc: null, croppedSrc: null, isCropApplied: false, cropData: null, warpQuad: null, originalSrc: null, processedDataUrl: null, naturalWidth: 1000, naturalHeight: 600, rotation: 0, zoom: 1.0, fitMode: 'cover', filter: 'color', brightness: 0, contrast: 0, panX: 0, panY: 0, showMmGrid: false, showOaciGuide: false },
        page4: { rawOriginalSrc: null, croppedSrc: null, isCropApplied: false, cropData: null, warpQuad: null, originalSrc: null, processedDataUrl: null, naturalWidth: 1000, naturalHeight: 600, rotation: 0, zoom: 1.0, fitMode: 'cover', filter: 'color', brightness: 0, contrast: 0, panX: 0, panY: 0, showMmGrid: false, showOaciGuide: false }
      }
    },
    getActiveSpec: () => ({ name: 'Credencial INE / DNI', shortName: 'Credencial', widthMm: 85.6, heightMm: 54.0, isCard: true }),
    getActivePaperSpec: () => ({ name: 'A4 Estándar', shortName: 'A4', widthMm: 210, heightMm: 297, jsPdfFormat: 'a4' })
  };

  sandbox.window = sandbox;
  return sandbox;
}

async function runEntrega2Tests() {
  console.log('🧪 Iniciando Suite de Verificación: Entrega 2 (Ciclo de Vida y Proyectos)...');

  // Cargar módulos
  const cropWarpCode = fs.readFileSync(path.join(__dirname, 'js/crop-warp.js'), 'utf8');
  const engineCode = fs.readFileSync(path.join(__dirname, 'js/engine.js'), 'utf8');
  const storageCode = fs.readFileSync(path.join(__dirname, 'js/storage.js'), 'utf8');

  // TEST 1: Aislamiento estricto Proyecto A -> Proyecto B -> Deshacer/Recorte
  {
    console.log('  ▶ Test 1: Aislamiento estricto entre proyectos (C02)...');
    const sb = createSandbox();
    vm.createContext(sb);
    vm.runInContext(cropWarpCode, sb);
    vm.runInContext(engineCode, sb);
    vm.runInContext(storageCode, sb);

    // Cargar datos en Proyecto A
    sb.state.images.front.rawOriginalSrc = 'data:image/jpeg;base64,PROYECTO_A_RAW';
    sb.state.images.front.originalSrc = 'data:image/jpeg;base64,PROYECTO_A_ORIG';
    sb.state.images.front.croppedSrc = 'data:image/jpeg;base64,PROYECTO_A_CROP';
    sb.state.images.front.isCropApplied = true;
    sb.state.images.front.processedDataUrl = 'data:image/jpeg;base64,PROYECTO_A_PROC';
    
    // Registrar snapshots en historial de edición de A
    sb.RealScanEditor.recordSnapshot('front', sb.state.images.front);
    sb.state.images.front.rotation = 90;
    sb.RealScanEditor.recordSnapshot('front', sb.state.images.front);
    assert.strictEqual(sb.RealScanEditor.canUndo('front'), true, 'Debe haber historial Undo en proyecto A');

    // Cambiar a Proyecto B usando prepareWorkspaceForJobSwitch
    sb.prepareWorkspaceForJobSwitch({ clearDraft: true, keepTitle: false });

    // Verificar limpieza total de Proyecto A
    assert.strictEqual(sb.state.images.front.originalSrc, null, 'originalSrc de A debe ser null');
    assert.strictEqual(sb.state.images.front.croppedSrc, null, 'croppedSrc de A NO debe sobrevivir');
    assert.strictEqual(sb.state.images.front.isCropApplied, false, 'isCropApplied debe ser false');
    assert.strictEqual(sb.RealScanEditor.canUndo('front'), false, 'Historial de Undo debe estar vacío; no debe recuperar contenido de A');

    // Cargar imagen de Proyecto B
    sb.state.images.front.rawOriginalSrc = 'data:image/jpeg;base64,PROYECTO_B_RAW';
    sb.state.images.front.originalSrc = 'data:image/jpeg;base64,PROYECTO_B_RAW';
    
    // Deshacer no debe traer datos de Proyecto A
    const undone = sb.RealScanEditor.undo('front', sb.state.images.front);
    assert.strictEqual(undone, null, 'Undo en proyecto B nuevo debe retornar null sin revivir datos de A');
    console.log('    ✅ C02: Aislamiento entre proyectos y eliminación de recortes huérfanos verificado.');
  }

  // TEST 2: Recuperación de borrador de 1 cara no conserva el reverso del trabajo anterior
  {
    console.log('  ▶ Test 2: Borrador de una cara no hereda reverso de trabajo previo...');
    const sb = createSandbox();
    vm.createContext(sb);
    vm.runInContext(cropWarpCode, sb);
    vm.runInContext(engineCode, sb);
    vm.runInContext(storageCode, sb);

    // Guardar borrador que solo contiene cara 'front'
    const draftSoloFront = {
      updatedAt: Date.now(),
      activeCategory: 'docs',
      format: 'card',
      paperSize: 'a4',
      printMode: 'single',
      documentPageCount: 1,
      documentCustomTitle: 'Borrador 1 Cara',
      images: {
        front: {
          originalSrc: 'data:image/jpeg;base64,FRENTE_BORRADOR',
          processedDataUrl: 'data:image/jpeg;base64,FRENTE_BORRADOR_PROC'
        }
      }
    };
    sb.localStorage.setItem('realscan_draft_session_v2', JSON.stringify(draftSoloFront));

    // El lienzo actual tiene frente Y reverso de un trabajo previo
    sb.state.images.front.originalSrc = 'data:image/jpeg;base64,FRENTE_VIEJO';
    sb.state.images.back.originalSrc = 'data:image/jpeg;base64,REVERSO_VIEJO';
    sb.state.images.back.processedDataUrl = 'data:image/jpeg;base64,REVERSO_VIEJO_PROC';

    // Restaurar borrador de 1 cara
    const ok = await sb.restoreActiveDraft();
    assert.strictEqual(ok, true, 'Borrador debe restaurarse');
    assert.strictEqual(sb.state.images.front.originalSrc, 'data:image/jpeg;base64,FRENTE_BORRADOR');
    assert.strictEqual(sb.state.images.back.originalSrc, null, 'El reverso del trabajo previo debe limpiarse completamente');
    assert.strictEqual(sb.state.images.back.processedDataUrl, null, 'processedDataUrl del reverso debe ser null');
    console.log('    ✅ Aislamiento de reverso en borrador de 1 cara verificado.');
  }

  // TEST 3: Guardar fotos de dos personas preserva ambas fotos
  {
    console.log('  ▶ Test 3: Guardar fotos de dos personas preserva ambas caras...');
    const sb = createSandbox();
    vm.createContext(sb);
    vm.runInContext(cropWarpCode, sb);
    vm.runInContext(engineCode, sb);
    vm.runInContext(storageCode, sb);

    sb.state.activeCategory = 'photos';
    sb.state.format = 'infantil';
    sb.state.mixTwoPhotos = true;
    sb.state.documentPageCount = 1; // Para fotos comúnmente es 1 página
    sb.state.images.front.originalSrc = 'data:image/jpeg;base64,FOTO_PERSONA_1';
    sb.state.images.front.processedDataUrl = 'data:image/jpeg;base64,FOTO_PERSONA_1_PROC';
    sb.state.images.back.originalSrc = 'data:image/jpeg;base64,FOTO_PERSONA_2';
    sb.state.images.back.processedDataUrl = 'data:image/jpeg;base64,FOTO_PERSONA_2_PROC';

    // Mock IndexedDB
    let savedRecord = null;
    sb.getDB = async () => ({
      transaction: () => ({
        objectStore: () => ({
          put: (rec) => {
            savedRecord = rec;
            const req = { onsuccess: null, onerror: null };
            setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 5);
            return req;
          }
        })
      })
    });

    await sb.saveScanToStorage('Fotos Pareja', 3);
    assert.notStrictEqual(savedRecord, null, 'Debe guardar el registro');
    assert.strictEqual(savedRecord.pages.length, 2, 'Debe guardar AMBAS fotos (front y back), no omitir la segunda');
    assert.strictEqual(savedRecord.pages[0].slot, 'front');
    assert.strictEqual(savedRecord.pages[1].slot, 'back');
    assert.strictEqual(savedRecord.mixTwoPhotos, true, 'Debe persistir mixTwoPhotos = true');
    console.log('    ✅ Guardado íntegro de fotos de dos personas verificado.');
  }

  // TEST 4: Restaurar pasaporte horizontal respeta orientación guardada
  {
    console.log('  ▶ Test 4: Restauración de orientación de pasaporte...');
    const sb = createSandbox();
    vm.createContext(sb);
    vm.runInContext(cropWarpCode, sb);
    vm.runInContext(engineCode, sb);
    vm.runInContext(storageCode, sb);

    let orientationApplied = null;
    sb.setPassportOpenOrientation = (ori) => { orientationApplied = ori; };

    const mockScan = {
      id: 'scan_123',
      schemaVersion: 2,
      format: 'passport_open',
      passportOpenOrientation: 'landscape',
      passportPageOrientation: 'portrait',
      pages: [
        { slot: 'front', rawOriginalSrc: 'data:image/jpeg;base64,PASSPORT_IMG', dataUrl: 'data:image/jpeg;base64,PASSPORT_IMG' }
      ]
    };

    sb.getAllScansFromStorage = async () => [mockScan];

    // Estado antes de restaurar es portrait
    sb.state.passportOpenOrientation = 'portrait';
    await sb.restoreScanToApp('scan_123');

    assert.strictEqual(sb.state.passportOpenOrientation, 'landscape', 'Debe restaurar passportOpenOrientation a landscape');
    assert.strictEqual(orientationApplied, 'landscape', 'Debe invocar setPassportOpenOrientation con landscape');
    console.log('    ✅ Restauración de orientación de pasaporte horizontal verificada.');
  }

  // TEST 5: Zoom y sliders registran Undo y agrupan movimientos continuos
  {
    console.log('  ▶ Test 5: Zoom y sliders registran Undo con agrupación continua...');
    const sb = createSandbox();
    vm.createContext(sb);
    vm.runInContext(cropWarpCode, sb);
    vm.runInContext(engineCode, sb);
    vm.runInContext(storageCode, sb);

    sb.state.images.front.originalSrc = 'data:image/jpeg;base64,TEST_IMG';
    sb.state.images.front.zoom = 1.0;

    // Primer movimiento de zoom
    sb.setZoomScale('front', 1.25);
    assert.strictEqual(sb.RealScanEditor.canUndo('front'), true, 'Zoom debe habilitar Undo');

    // Movimiento rápido inmediato (dentro de 100ms): debe agruparse
    sb.setZoomScale('front', 1.50);
    sb.setZoomScale('front', 1.75);

    // Al hacer Undo, debe regresar al valor original inicial (1.0), no a 1.50
    const restoredState = sb.RealScanEditor.undo('front', sb.state.images.front);
    assert.notStrictEqual(restoredState, null, 'Undo debe retornar estado restaurado');
    assert.strictEqual(restoredState.zoom, 1.0, 'Undo debe recuperar el zoom original previo a la ráfaga (1.0)');
    console.log('    ✅ Undo de zoom con agrupación continua verificado.');
  }

  // TEST 6: Presets guardan configuración sin imágenes y restauran parámetros completos
  {
    console.log('  ▶ Test 6: Presets de configuración completos sin imágenes...');
    const sb = createSandbox();
    vm.createContext(sb);
    vm.runInContext(cropWarpCode, sb);
    vm.runInContext(engineCode, sb);
    vm.runInContext(storageCode, sb);

    sb.state.activeCategory = 'photos';
    sb.state.format = 'infantil';
    sb.state.paperSize = 'letter';
    sb.state.photoCopies = 6;
    sb.state.mixTwoPhotos = true;
    sb.state.images.front.originalSrc = 'data:image/jpeg;base64,IMAGEN_PRIVADA';

    const p = sb.saveUserPreset('Preset Fotos 6 Copias');
    assert.notStrictEqual(p, null);
    assert.strictEqual(p.images, undefined, 'Los presets NUNCA deben incluir imágenes');
    assert.strictEqual(p.photoCopies, 6, 'Debe incluir photoCopies');
    assert.strictEqual(p.mixTwoPhotos, true, 'Debe incluir mixTwoPhotos');
    assert.strictEqual(p.paperSize, 'letter');

    // Cambiar estado
    sb.state.paperSize = 'a4';
    sb.state.photoCopies = 4;
    sb.state.mixTwoPhotos = false;

    // Aplicar preset
    const ok = sb.applyUserPreset(p.id);
    assert.strictEqual(ok, true);
    assert.strictEqual(sb.state.paperSize, 'letter');
    assert.strictEqual(sb.state.photoCopies, 6);
    assert.strictEqual(sb.state.mixTwoPhotos, true);
    console.log('    ✅ Presets completos sin imágenes verificados.');
  }

  // TEST 7: Títulos de proyecto y título impreso como campos separados
  {
    console.log('  ▶ Test 7: Título de proyecto y título impreso separados...');
    const sb = createSandbox();
    vm.createContext(sb);
    vm.runInContext(cropWarpCode, sb);
    vm.runInContext(engineCode, sb);
    vm.runInContext(storageCode, sb);

    sb.state.documentCustomTitle = 'DOCUMENTO OFICIAL PARA TRÁMITE';
    sb.state.images.front.originalSrc = 'data:image/jpeg;base64,DOC_IMG';

    let savedRecord = null;
    sb.getDB = async () => ({
      transaction: () => ({
        objectStore: () => ({
          put: (rec) => {
            savedRecord = rec;
            const req = { onsuccess: null, onerror: null };
            setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 5);
            return req;
          }
        })
      })
    });

    await sb.saveScanToStorage('Expediente Cliente 2026', 3);
    assert.strictEqual(savedRecord.projectTitle, 'Expediente Cliente 2026', 'projectTitle debe ser el título del proyecto');
    assert.strictEqual(savedRecord.printedSheetTitle, 'DOCUMENTO OFICIAL PARA TRÁMITE', 'printedSheetTitle debe ser el título impreso');
    console.log('    ✅ Separación de títulos verificada.');
  }

  console.log('\n========================================');
  console.log('🎉 TODAS LAS PRUEBAS DE LA ENTREGA 2 PASARON AL 100%');
  console.log('========================================\n');
}

runEntrega2Tests().catch(err => {
  console.error('❌ Error en suite Entrega 2:', err);
  process.exit(1);
});
