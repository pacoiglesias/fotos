/* ============================================================
   RealScan Pro — Carga diferida de librerías pesadas
   jsPDF y JSZip ya no se descargan en la primera carga: se inyectan
   la primera vez que una función los necesita (exportar, imprimir,
   respaldo ZIP). El service worker los cachea en ese primer uso,
   así que después también funcionan sin conexión.
   ============================================================ */
(function () {
  const pending = {};

  function ensureVendorScript(src, isReady) {
    if (isReady()) return Promise.resolve(true);
    if (pending[src]) return pending[src];
    pending[src] = new Promise(function (resolve) {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = function () { resolve(isReady()); };
      script.onerror = function () { delete pending[src]; resolve(false); };
      document.head.appendChild(script);
    });
    return pending[src];
  }

  window.ensureJsPdf = function () {
    if (window.jspdf) return Promise.resolve(true);
    return ensureVendorScript('vendor/jspdf.umd.min.js', function () { return !!window.jspdf; });
  };

  window.ensureJSZip = function () {
    if (window.JSZip) return Promise.resolve(true);
    return ensureVendorScript('vendor/jszip.min.js', function () { return !!window.JSZip; });
  };
})();
