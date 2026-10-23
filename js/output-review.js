(function() {
  "use strict";
  function render(target, delivery = false, mode) {
    if (!target) return;
    target.replaceChildren();
    target.className = "output-review";
    const layout = RealScanLayout.computeDocumentLayout(state), spec = getActiveSpec(), facts = document.createElement("div");
    facts.className = "output-review-facts";
    const scale = (Number(state.outputScalePercent) || 100) / 100;
    const pairs = [["Tama\xF1o de cada pieza", (spec.widthMm * scale).toFixed(2) + " \xD7 " + (spec.heightMm * scale).toFixed(2) + " mm"], ["Papel y hojas", layout.paper.shortName + " \xB7 " + layout.pages.length + " hoja(s)"], ["Contenido", layout.summary || spec.shortName], ["Destino", delivery ? "Descarga privada por QR" : (mode === "pdf" ? "Descarga de PDF a escala real" : "Impresora \xB7 PDF a escala real")]];
    pairs.push(['Guías de corte',layout.includeCutMarks ? 'Visibles en la hoja' : 'Sin marcas'], ['Acabado',layout.isCleanSheet ? 'Hoja limpia' : 'Con anotaciones activas']);
    if (!delivery) {
      if (state.activeCategory === 'photos') {
        pairs.push(["Copias", state.mixTwoPhotos ? ((state.photoCopiesPersonA || 0) + " de la persona A + " + (state.photoCopiesPersonB || 0) + " de la persona B") : String(state.photoCopies || 1)]);
      } else {
        pairs.push(["Copias", "1 juego \xB7 más copias en el diálogo de impresión"]);
      }
      const activeProfile = window.RealScanPrinterProfiles?.getActive();
      pairs.push(["Perfil de impresora", activeProfile ? activeProfile.name : "Sin corrección"]);
    }
    if (delivery) {
      const format = $("selectDeliveryFormat").value.toUpperCase(), max = $("selectDeliveryMaxPx").value;
      pairs.push(["Peso máximo por archivo", Number($("selectDeliveryMaxBytes")?.value)?(Number($("selectDeliveryMaxBytes").value)/1000000)+" MB":"Sin límite adicional"]);
      pairs.push(["Archivos individuales", format + " \xB7 " + (max === "original" ? "Resoluci\xF3n original" : max + " px m\xE1ximo")], ["Hoja completa", $("checkDeliverPdfSheet").checked ? "Incluida como PDF" : "No incluida"]);
    }
    if(delivery&&!$('checkDeliverPdfSheet').checked)pairs.splice(0,3);
    for (const [label, value] of pairs) {
      const box = document.createElement("div"), small = document.createElement("small"), strong = document.createElement("strong");
      box.className = "output-review-fact";
      small.textContent = label;
      strong.textContent = value;
      box.append(small, strong);
      facts.append(box);
    }
    target.append(facts);
    if (!delivery) {
      // Vista previa de la hoja tal como saldrá (clon a escala de la hoja real).
      const sheet = document.querySelector('.a4-sheet');
      if (sheet) {
        const sheetWrap = document.createElement('div');
        sheetWrap.className = 'output-review-sheet';
        const clone = sheet.cloneNode(true);
        clone.removeAttribute('id');
        clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        sheetWrap.append(clone);
        target.append(sheetWrap);
      }
      // Perfil de impresora aplicable a esta salida (corrección de geometría).
      if (window.RealScanPrinterProfiles) {
        const profileRow = document.createElement('label');
        profileRow.className = 'output-review-profile';
        const profileText = document.createElement('span');
        profileText.textContent = '🖨️ Perfil:';
        const profileSelect = document.createElement('select');
        profileSelect.setAttribute('aria-label', 'Perfil de calibración de impresora');
        const noneOpt = document.createElement('option');
        noneOpt.value = '';
        noneOpt.textContent = 'Sin corrección';
        profileSelect.append(noneOpt);
        for (const p of window.RealScanPrinterProfiles.list()) {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          profileSelect.append(opt);
        }
        profileSelect.value = window.RealScanPrinterProfiles.getActiveId() || '';
        profileSelect.addEventListener('change', () => {
          window.RealScanPrinterProfiles.setActive(profileSelect.value || null);
          render(target, false, mode);
        });
        profileRow.append(profileText, profileSelect);
        target.append(profileRow);
      }
    }
    const sheetSlots = new Set(layout.pages.flatMap(page => page.placements.map(placement => placement.slot)));
    const wanted = delivery ? new Set([
      ...($("checkDeliverPdfSheet").checked ? sheetSlots : []),
      ...($("checkDeliverFrontJpg").checked ? ['front'] : []),
      ...($("checkDeliverBackJpg").checked ? ['back'] : []),...($("checkDeliverPage3").checked ? ['page3'] : []),...($("checkDeliverPage4").checked ? ['page4'] : [])
    ]) : sheetSlots;
    const names = {front:'Frente',back:'Reverso',page3:'Página 3',page4:'Página 4'};
    const missing = [...wanted].filter(side => !state.images[side]?.processedDataUrl);
    if (missing.length) {
      const warning = document.createElement('p');
      warning.className = 'output-review-warning';
      warning.textContent = 'Sin imagen: ' + missing.map(side => names[side]).join(', ') + '. Revisa las caras necesarias antes de continuar.';
      target.append(warning);
    }
    const thumbs = document.createElement("div");
    thumbs.className = "output-review-thumbs";
    for (const [side, label] of [["front", "Frente"], ["back", "Reverso"], ["page3", "P\xE1gina 3"], ["page4", "P\xE1gina 4"]]) {
      const src = state.images[side]?.processedDataUrl;
      if (!src) continue;
      if (!delivery && !sheetSlots.has(side)) continue;
      if (delivery && !($("checkDeliverPdfSheet").checked && sheetSlots.has(side)) && !(side === "front" && $("checkDeliverFrontJpg").checked) && !(side === "back" && $("checkDeliverBackJpg").checked) && !(side === "page3" && $("checkDeliverPage3").checked) && !(side === "page4" && $("checkDeliverPage4").checked)) continue;
      const figure = document.createElement("figure"), image = document.createElement("img"), caption = document.createElement("figcaption");
      image.src = src;
      image.alt = label + " preparado";
      caption.textContent = label;
      figure.append(image, caption);
      thumbs.append(figure);
    }
    target.append(thumbs);
    const note = document.createElement("p");
    note.className = "output-review-note";
    note.textContent = delivery ? "Comprueba las caras seleccionadas y el formato antes de generar el enlace. Las medidas f\xEDsicas se conservan en el PDF; los archivos de imagen se entregan en p\xEDxeles." : "Comprueba recortes y copias. En la impresora selecciona \xABTama\xF1o real / 100 %\xBB, sin ajustar a p\xE1gina. " + ((Number(state.outputScalePercent) || 100) !== 100 ? "Atenci\xF3n: has aplicado una escala de " + state.outputScalePercent + " % dentro del proyecto." : "");
    target.append(note);
    const checklist=document.createElement('ul');checklist.className='operator-checklist';checklist.setAttribute('aria-label','Revisión del operador');for(const value of ['Todas las caras necesarias y en el orden correcto','Orientación correcta y bordes completos','Texto o rostro nítido al ampliar la imagen']){const li=document.createElement('li');li.textContent=value;checklist.append(li);}target.append(checklist);
  }
  window.updateDeliveryReview = () => render($("deliveryReview"), true);
  window.showPrintReview = (callback, options) => {
    const opts = options || {};
    let modal = $("outputReviewModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "outputReviewModal";
      modal.className = "hidden fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "outputReviewTitle");
      modal.innerHTML = '<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"><h2 id="outputReviewTitle" class="text-lg font-bold">Revisa antes de imprimir</h2><div id="printReview"></div><div class="flex flex-wrap gap-3"><button type="button" data-close-modal="outputReviewModal" class="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800">Volver a corregir</button><button type="button" id="confirmPrintReview" class="px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold min-h-[44px]">Continuar a imprimir</button></div></div>';
      document.body.append(modal);
    }
    $("outputReviewTitle").textContent = opts.title || "Revisa antes de imprimir";
    $("confirmPrintReview").textContent = opts.confirmLabel || "Continuar a imprimir";
    render($("printReview"), false, opts.mode);
    $("confirmPrintReview").onclick = () => {
      closeModal("outputReviewModal");
      callback();
    };
    openModal("outputReviewModal");
  };
  document.addEventListener("DOMContentLoaded", () => {
    for (const id of ["checkDeliverPdfSheet", "checkDeliverFrontJpg", "checkDeliverBackJpg", "selectDeliveryFormat", "selectDeliveryMaxPx", "selectDeliveryMaxBytes"]) $(id)?.addEventListener("change", window.updateDeliveryReview);
  });
})();
