/* ============================================================
   RealScan Pro — Perfiles de calibración por impresora (v3.12.0)
   Cada impresora imprime con un error de escala/desplazamiento
   propio. El perfil guarda la CORRECCIÓN a aplicar (escala X/Y en %
   y desplazamiento X/Y en mm) y se aplica a la geometría del PDF
   al imprimir o exportar: la impresora física la sigue eligiendo
   el usuario en el diálogo de impresión del navegador, pero el
   documento ya sale corregido para esa impresora.
   Persistencia local: localStorage realscan_printer_profiles_v1
   y el perfil activo dentro de las preferencias (PREFS_KEY).
   ============================================================ */
(function () {
  const PROFILES_KEY = 'realscan_printer_profiles_v1';

  function list() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }
  function saveAll(profiles) {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch (e) {}
  }
  function get(id) {
    return list().find(function (p) { return p.id === id; }) || null;
  }
  function getActiveId() {
    try {
      const prefs = JSON.parse(localStorage.getItem(window.PREFS_KEY || 'realscan_prefs_v2') || '{}');
      return prefs.printerProfileId || null;
    } catch (e) { return null; }
  }
  function getActive() {
    const id = getActiveId();
    return id ? get(id) : null;
  }
  function setActive(id) {
    try {
      const key = window.PREFS_KEY || 'realscan_prefs_v2';
      const prefs = JSON.parse(localStorage.getItem(key) || '{}');
      if (id) prefs.printerProfileId = id; else delete prefs.printerProfileId;
      localStorage.setItem(key, JSON.stringify(prefs));
    } catch (e) {}
  }
  function upsert(profile) {
    const profiles = list();
    const clean = {
      id: profile.id || ('printer_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
      name: String(profile.name || 'Impresora').slice(0, 60),
      scaleX: Number(profile.scaleX) || 100,
      scaleY: Number(profile.scaleY) || 100,
      offsetX: Number(profile.offsetX) || 0,
      offsetY: Number(profile.offsetY) || 0,
      updatedAt: new Date().toISOString()
    };
    const idx = profiles.findIndex(function (p) { return p.id === clean.id; });
    if (idx >= 0) profiles[idx] = clean; else profiles.push(clean);
    saveAll(profiles);
    return clean;
  }
  function remove(id) {
    saveAll(list().filter(function (p) { return p.id !== id; }));
    if (getActiveId() === id) setActive(null);
  }
  /* A12: única fuente de verdad de «impresora verificada»: la marca que el
     asistente de calibración deja tras medir la regla de 50 mm, con las
     escalas que coinciden con el perfil actual. Si el perfil cambia, la
     verificación caduca y hay que volver a medir. */
  function isVerified(profile) {
    try {
      const p = profile || getActive();
      if (!p) return false;
      const v = JSON.parse(localStorage.getItem('realscan_calibration_verified_' + p.id) || 'null');
      return !!v && v.scaleX === p.scaleX && v.scaleY === p.scaleY;
    } catch (e) { return false; }
  }
  function isIdentity(p) {
    return !p || (Math.abs(p.scaleX - 100) < 0.001 && Math.abs(p.scaleY - 100) < 0.001 &&
      Math.abs(p.offsetX) < 0.001 && Math.abs(p.offsetY) < 0.001);
  }
  /* Devuelve la función que corrige una colocación (xMm/yMm/widthMm/heightMm)
     del motor de composición, o null si no hay perfil activo útil. */
  function getTransform() {
    const p = getActive();
    if (isIdentity(p)) return null;
    const sx = p.scaleX / 100, sy = p.scaleY / 100, ox = p.offsetX, oy = p.offsetY;
    return function (item) {
      return Object.assign({}, item, {
        xMm: item.xMm * sx + ox,
        yMm: item.yMm * sy + oy,
        widthMm: item.widthMm * sx,
        heightMm: item.heightMm * sy
      });
    };
  }
  /* Corrección sugerida desde una medición de calibración: si la regla de
     50 mm salió impresa a `measuredMm`, la corrección es 50/measured. */
  function correctionFromMeasurement(measuredMm, currentPct) {
    if (!measuredMm || measuredMm <= 0) return currentPct || 100;
    return Math.round((50 / measuredMm) * 1000) / 10;
  }
  function describe(p) {
    if (!p) return 'Sin corrección de impresora';
    return p.name + ' · Escala X ' + p.scaleX + ' % · Y ' + p.scaleY + ' % · Desplazamiento ' +
      p.offsetX + ' / ' + p.offsetY + ' mm';
  }

  window.RealScanPrinterProfiles = {
    list: list,
    get: get,
    getActive: getActive,
    getActiveId: getActiveId,
    setActive: setActive,
    upsert: upsert,
    remove: remove,
    isVerified: isVerified,
    isIdentity: isIdentity,
    getTransform: getTransform,
    correctionFromMeasurement: correctionFromMeasurement,
    describe: describe
  };
})();
