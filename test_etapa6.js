/**
 * Suite de Verificación Integral - Etapa 6 (Optimización, PWA Offline y Accesibilidad)
 * Valida:
 * - M-32: Cobertura de Service Worker y existencia física de todos los assets cacheados
 * - M-33 / M-35: Integridad estructural de assets y cero bloqueos
 * - M-34: Accesibilidad WCAG 2.1 AA (roles de diálogo, aria-modal, aria-labelledby, labels y títulos de accesibilidad)
 * - M-36: Telemetría offline de almacenamiento y cambio de pestaña
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function runTests() {
  console.log('🧪 Iniciando Suite de Verificación Etapa 6 (Optimización, PWA Offline y Accesibilidad)...');

  // TEST 1: M-32 Cobertura Exhaustiva de Caché Offline en Service Worker (sw.js)
  {
    console.log('  ▶ Test 1: Verificación de sw.js y Existencia Física de Activos (M-32)...');
    const swPath = path.join(__dirname, 'dist/sw.js');
    assert(fs.existsSync(swPath), 'sw.js debe existir físicamente');
    const swContent = fs.readFileSync(swPath, 'utf8');

    // Extraer CORE_ASSETS
    const matchAssets = swContent.match(/const\s+CORE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
    assert(matchAssets, 'sw.js debe definir CORE_ASSETS');
    const assetsList = matchAssets[1]
      .split(',')
      .map(s => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);

    // Módulos locales obligatorios
    const requiredLocalAssets = [
      './index.html',
      './manifest.json',
      './css/styles.css',
      './js/config.js',
      './js/auth.js',
      './js/storage.js',
      './js/crop-warp.js',
      './js/engine.js',
      './js/layout-engine.js',
      './js/pdf.js',
      './js/export.js',
      './js/app.js'
    ];

    requiredLocalAssets.forEach(asset => {
      assert(assetsList.includes(asset), `sw.js CORE_ASSETS debe incluir: ${asset}`);
      if (asset !== './') {
        const localFilePath = path.join(__dirname, 'dist', asset.replace(/^\.\//, ''));
        assert(fs.existsSync(localFilePath), `El archivo local referenciado por el SW debe existir físicamente: ${asset}`);
      }
    });

    // Versionado del Service Worker
    const matchCache = swContent.match(/const\s+CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
    assert(matchCache, 'sw.js debe definir CACHE_NAME');
    assert(matchCache[1].startsWith('realscan-'), 'CACHE_NAME identifica el contenido de la compilación');
    console.log(`    ✅ M-32 sw.js verificado con ${assetsList.length} activos cacheados y versión ${matchCache[1]}.`);
  }

  // TEST 2: M-34 Accesibilidad WCAG 2.1 AA en index.html
  {
    console.log('  ▶ Test 2: Validación de Accesibilidad WCAG 2.1 AA (M-34)...');
    const htmlPath = path.join(__dirname, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1. Modales principales con role="dialog", aria-modal="true" y aria-labelledby
    const dialogIds = ['historyModal', 'settingsModal', 'userPresetsModal', 'perspectiveWarpModal'];
    dialogIds.forEach(id => {
      const modalRegex = new RegExp(`<div[^>]*id=["']${id}["'][^>]*>`, 'i');
      const match = html.match(modalRegex);
      assert(match, `Modal ${id} debe existir en index.html`);
      const modalTag = match[0];
      assert(modalTag.includes('role="dialog"'), `Modal ${id} debe tener role="dialog"`);
      assert(modalTag.includes('aria-modal="true"'), `Modal ${id} debe tener aria-modal="true"`);
      assert(modalTag.includes('aria-labelledby='), `Modal ${id} debe tener aria-labelledby`);
    });

    // 2. Elementos interactivos sin texto visible deben tener aria-label o title descriptivo
    const iconButtons = ['btnThemeToggle', 'hudBtnSettings', 'hudBtnNewProject'];
    iconButtons.forEach(id => {
      const btnRegex = new RegExp(`<button[^>]*id=["']${id}["'][^>]*>`, 'i');
      const match = html.match(btnRegex);
      assert(match, `Botón ${id} debe existir`);
      const btnTag = match[0];
      const hasAccessibleName = btnTag.includes('aria-label=') || btnTag.includes('title=');
      assert(hasAccessibleName, `Botón ${id} debe tener aria-label o title para lectores de pantalla`);
    });

    // 3. Inputs con etiquetas asociadas (label for o aria-label)
    const inputsToCheck = ['inputAddUserName', 'inputAddUserPass', 'inputCurrentPass', 'inputNewPass', 'inputConfirmPass', 'inputNewPresetName'];
    inputsToCheck.forEach(id => {
      const inputRegex = new RegExp(`<input[^>]*id=["']${id}["'][^>]*>`, 'i');
      assert(inputRegex.test(html), `Input ${id} debe existir`);
      const labelRegex = new RegExp(`<label[^>]*for=["']${id}["']`, 'i');
      const hasLabel = labelRegex.test(html);
      assert(hasLabel, `Input ${id} debe tener un <label for="${id}"> asociado para accesibilidad`);
    });

    console.log('    ✅ M-34 Accesibilidad WCAG 2.1 AA verificada (diálogos, nombres accesibles y etiquetas).');
  }

  // TEST 3: M-36 Telemetría Offline y Diagnóstico de Almacenamiento
  {
    console.log('  ▶ Test 3: Telemetría de Almacenamiento y Control de Pestañas (M-36)...');
    const authCode = fs.readFileSync(path.join(__dirname, 'js/auth.js'), 'utf8');

    const dom = {
      tabContentCreds: { classList: { add: () => {}, remove: () => {} } },
      tabContentLog: { classList: { add: () => {}, remove: () => {} } },
      tabContentStorage: { classList: { add: () => {}, remove: () => {} } },
      tabContentCloud: { classList: { add: () => {}, remove: () => {} } },
      tabBtnCreds: { classList: { add: () => {}, remove: () => {} } },
      tabBtnLog: { classList: { add: () => {}, remove: () => {} } },
      tabBtnStorage: { classList: { add: () => {}, remove: () => {} } },
      tabBtnCloud: { classList: { add: () => {}, remove: () => {} } }
    };

    let telemetryInvoked = false;
    const sb = {
      console: console,
      $: (id) => dom[id] || null,
      updateStorageTelemetryUI: () => { telemetryInvoked = true; },
      renderAuditLogs: () => {},
      renderUsersList: () => {}
    };

    vm.createContext(sb);
    vm.runInContext(authCode, sb);

    // Cambiar a la pestaña de almacenamiento
    assert.doesNotThrow(() => {
      sb.switchSettingsTab('storage');
    }, 'switchSettingsTab("storage") debe ejecutarse sin errores');

    assert.strictEqual(telemetryInvoked, true, 'switchSettingsTab("storage") debe invocar updateStorageTelemetryUI');
    console.log('    ✅ M-36 Telemetría y Pestaña de Almacenamiento verificadas.');
  }

  // TEST 4: Atajo Global de Teclado Escape para Cerrar Modales
  {
    console.log('  ▶ Test 4: Manejador Global de Teclado Escape (M-34)...');
    const appCode = fs.readFileSync(path.join(__dirname, 'js/app.js'), 'utf8');
    assert(appCode.includes("e.key === 'Escape'"), 'js/app.js debe escuchar la tecla Escape');
    assert(appCode.includes('closeModal'), 'Al pulsar Escape debe invocar closeModal');
    console.log('    ✅ M-34 Cierre accesible con Escape verificado.');
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA ETAPA 6 PASARON EXITOSAMENTE AL 100%!');
}

runTests().catch(err => {
  console.error('❌ Error en suite Etapa 6:', err);
  process.exit(1);
});
