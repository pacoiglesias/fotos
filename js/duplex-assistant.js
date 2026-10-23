(function(root) {
  "use strict";
  const key = "realscan_duplex_profiles_v1";
  let profiles = [];
  try {
    profiles = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(profiles)) profiles = [];
  } catch {
  }
  function open() {
    let modal = document.getElementById("duplexAssistantModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "duplexAssistantModal";
      modal.className = "hidden fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "duplexTitle");
      modal.innerHTML = '<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-5 max-w-xl w-full space-y-3 max-h-[90vh] overflow-y-auto"><h2 id="duplexTitle" class="font-bold text-lg">Doble cara manual, paso a paso</h2><p class="text-xs">Prueba primero con UNA hoja común. Usa la misma impresora, bandeja, tamaño y escala 100 %. El navegador no conoce cómo recoge o entrega el papel tu impresora.</p><label class="block">Perfil probado <select id="duplexProfiles" class="block w-full border p-2 rounded bg-white dark:bg-slate-800"></select></label><label class="block">Giro de la hoja <select id="duplexFlip" class="block w-full border p-2 rounded bg-white dark:bg-slate-800"><option value="book">Lateral: como una página de libro</option><option value="calendar">Arriba: como un calendario</option></select></label><div class="duplex-demo"><div id="duplexSheet" class="duplex-sheet"><span class="duplex-front">A<br>ARRIBA ↑</span><span class="duplex-back">B<br>ARRIBA ↑</span></div></div><p id="duplexInstruction" class="text-sm font-semibold"></p><label class="block text-xs">Impresora y bandeja <input id="duplexName" maxlength="80" class="block w-full border rounded p-2 bg-white dark:bg-slate-800" placeholder="Ejemplo: impresora del mostrador, bandeja trasera"></label><label class="block text-xs">Cómo la reinsertaste en la prueba <input id="duplexNotes" maxlength="180" class="block w-full border rounded p-2 bg-white dark:bg-slate-800" placeholder="Anota cara hacia arriba/abajo y borde que entra primero"></label><div class="flex flex-wrap gap-2"><button type="button" id="duplexTestA" class="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700">1. Descargar prueba A</button><button type="button" id="duplexTestB" class="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700">2. Descargar prueba B</button></div><label class="block text-xs"><input id="duplexVerified" type="checkbox"> He impreso ambas caras en la misma hoja común y comprobado cara, posición y orientación.</label><button type="button" id="duplexSave" class="px-3 py-2 rounded bg-indigo-600 text-white">Guardar perfil verificado</button><p class="text-xs">Con el perfil verificado, descarga e imprime primero el frente del trabajo. Recoloca UNA hoja siguiendo tu prueba y después imprime el reverso. Empieza siempre por una pieza de prueba.</p><div class="flex flex-wrap gap-2"><button type="button" id="duplexJobA" class="px-3 py-2 rounded bg-emerald-700 text-white">Descargar frente del trabajo</button><button type="button" id="duplexJobB" class="px-3 py-2 rounded bg-emerald-700 text-white">Descargar reverso del trabajo</button><button type="button" data-close-modal="duplexAssistantModal" class="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700">Cerrar</button></div><p id="duplexStatus" role="status" class="text-xs"></p></div>';
      document.body.append(modal);
      const $ = (id) => document.getElementById(id);
      $("duplexFlip").onchange = () => {
        $("duplexSheet").dataset.flip = $("duplexFlip").value;
        $("duplexInstruction").textContent = $("duplexFlip").value === "book" ? "Gira lateralmente, como una página de libro; no gires la hoja sobre la mesa." : "Gira de arriba hacia abajo, como una hoja de calendario; no la rotes sobre la mesa.";
        $("duplexVerified").checked = false;
      };
      $("duplexTestA").onclick = () => testPdf("A");
      $("duplexTestB").onclick = () => testPdf("B");
      $("duplexJobA").onclick = () => jobPdf(1);
      $("duplexJobB").onclick = () => jobPdf(2);
      $("duplexSave").onclick = () => {
        if (!$("duplexVerified").checked || !$("duplexName").value.trim() || !$("duplexNotes").value.trim()) {
          $("duplexStatus").textContent = "Completa el nombre, la colocación real y la comprobación de ambas caras.";
          return;
        }
        const profile = { name: $("duplexName").value.trim(), notes: $("duplexNotes").value.trim(), flip: $("duplexFlip").value, verifiedAt: Date.now() };
        profiles = profiles.filter((p) => p.name !== profile.name);
        profiles.push(profile);
        try {
          localStorage.setItem(key, JSON.stringify(profiles));
          refresh();
          $("duplexProfiles").value = profile.name;
          $("duplexStatus").textContent = "Perfil guardado para esta impresora y bandeja.";
        } catch {
          $("duplexStatus").textContent = "No se pudo guardar el perfil. Conserva las instrucciones por escrito.";
        }
      };
      $("duplexProfiles").onchange = () => {
        const p = profiles.find((p2) => p2.name === $("duplexProfiles").value);
        if (!p) return;
        $("duplexName").value = p.name;
        $("duplexNotes").value = p.notes;
        $("duplexFlip").value = p.flip;
        $("duplexFlip").onchange();
        $("duplexVerified").checked = true;
        $("duplexStatus").textContent = "Perfil previamente verificado. Repite la prueba si cambias impresora, bandeja o papel.";
      };
    }
    refresh();
    document.getElementById("duplexFlip").onchange();
    openModal("duplexAssistantModal");
  }
  function refresh() {
    const select = document.getElementById("duplexProfiles");
    select.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Nueva prueba de orientación";
    select.append(empty);
    for (const p of profiles) {
      const option = document.createElement("option");
      option.value = p.name;
      option.textContent = p.name;
      select.append(option);
    }
  }
  async function testPdf(face) {
    if (typeof ensureJsPdf === 'function') await ensureJsPdf();
    const paper = getActivePaperSpec(), doc = new jspdf.jsPDF({ unit: "mm", format: [paper.widthMm, paper.heightMm] });
    doc.setFontSize(26);
    doc.text("PRUEBA " + face, 25, 35);
    doc.text("ARRIBA / TOP", 25, 55);
    doc.line(70, 65, 70, 85);
    doc.line(70, 65, 65, 72);
    doc.line(70, 65, 75, 72);
    doc.rect((paper.widthMm - 85.6) / 2, 110, 85.6, 53.98);
    doc.setFontSize(12);
    doc.text("Papel comun - Escala 100% - Misma bandeja", 20, 185);
    downloadPdfBlob(doc, "RealScan_Prueba_Duplex_" + face + ".pdf");
  }
  async function jobPdf(face) {
    if (typeof ensureJsPdf === 'function') await ensureJsPdf();
    const status = document.getElementById("duplexStatus");
    if (!document.getElementById("duplexVerified").checked) {
      status.textContent = "Completa primero la prueba con papel común.";
      return;
    }
    if (state.activeCategory === "photos" || state.documentPageCount > 2 || !state.images.front.processedDataUrl || !state.images.back.processedDataUrl) {
      status.textContent = "Este asistente prepara un documento de frente y reverso. Carga ambas caras; usa el flujo habitual para fotos o más páginas.";
      return;
    }
    const old = { printMode: state.printMode, duplicateCard: state.duplicateCard, documentPageCount: state.documentPageCount };
    try {
      Object.assign(state, { printMode: "both_separate", duplicateCard: false, documentPageCount: 2 });
      const doc = generatePdfDoc();
      if (!doc) throw Error("Revisa las medidas y el papel.");
      if (doc.getNumberOfPages() !== 2) throw Error("El trabajo no se compone de dos caras separadas.");
      doc.deletePage(face === 1 ? 2 : 1);
      downloadPdfBlob(doc, "RealScan_Duplex_" + (face === 1 ? "Frente" : "Reverso") + ".pdf");
      status.textContent = "Imprime a tamaño real 100 %. " + document.getElementById("duplexNotes").value;
    } catch (e) {
      status.textContent = e.message;
    } finally {
      Object.assign(state, old);
    }
  }
  root.RealScanDuplex = { open };
})(window);
