/* Expose the small loader immediately; parse the PDF reader after the counter is usable. */
let pending;
window.ensurePdfReader = function () {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pending) pending = import('../vendor/pdf.mjs').then(library => {
    library.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdf.worker.mjs', import.meta.url).href;
    window.pdfjsLib = library;
    return library;
  }).catch(error => { pending = null; throw error; });
  return pending;
};
function warmReader() { window.ensurePdfReader().catch(() => {}); }
function scheduleReader() {
  if (window.requestIdleCallback) window.requestIdleCallback(warmReader, { timeout: 2500 });
  else setTimeout(warmReader, 1500);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleReader, { once: true });
else scheduleReader();
