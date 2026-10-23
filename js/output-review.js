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
      modal.innerHTML = '<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"><h2 id="outputReviewTitle" class="text-lg font-bold">Revisa antes de imprimir</h2><div id="printReview"></div><div id="reviewPassportRow" class="hidden flex flex-wrap items-center gap-2"><span class="text-xs font-bold flex-1 min-w-[150px]">🪪 Hoja de fotos tamaño pasaporte (35 × 45 mm), escala real:</span><button type="button" data-passport-count="4" class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold min-h-[44px]">Hoja de 4</button><button type="button" data-passport-count="6" class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold min-h-[44px]">Hoja de 6</button></div><div class="flex flex-wrap gap-3"><button type="button" data-close-modal="outputReviewModal" class="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800">Volver a corregir</button><button type="button" id="confirmPrintReview" class="px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold min-h-[44px]">Continuar a imprimir</button></div><div class="flex flex-wrap gap-3"><button type="button" id="btnReviewClient" class="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold min-h-[44px]">👀 Mostrar al cliente</button><button type="button" id="btnReviewWhatsapp" class="px-4 py-2.5 rounded-xl border border-emerald-500 text-emerald-700 dark:text-emerald-300 text-xs font-bold min-h-[44px]">📲 Enviar por WhatsApp</button></div></div>';
      document.body.append(modal);
      wireReviewExtras(modal);
    }
    reviewMode = opts.mode || null;
    $("outputReviewTitle").textContent = opts.title || "Revisa antes de imprimir";
    $("confirmPrintReview").textContent = opts.confirmLabel || "Continuar a imprimir";
    render($("printReview"), false, opts.mode);
    const passportRow = $("reviewPassportRow");
    if (passportRow) passportRow.classList.toggle("hidden", state.activeCategory !== "photos");
    if (passportRow) passportRow.classList.toggle("flex", state.activeCategory === "photos");
    $("confirmPrintReview").onclick = () => {
      if (window.RealScanPolish) window.RealScanPolish.successCheck(opts.mode === "pdf" ? "Revisión completada: generando el PDF" : "Revisión completada");
      closeModal("outputReviewModal");
      callback();
    };
    openModal("outputReviewModal");
  };

  /* Extras v3.13.0: WhatsApp (9.3), aprobación del cliente (10.3) y hoja de
     fotos tamaño pasaporte (9.4). */
  let reviewMode = null;
  function wireReviewExtras(modal) {
    modal.querySelector("#btnReviewWhatsapp").addEventListener("click", () => {
      closeModal("outputReviewModal");
      if (window.RealScanShare) window.RealScanShare.shareCurrentJob();
    });
    modal.querySelector("#btnReviewClient").addEventListener("click", showClientApproval);
    modal.querySelectorAll("[data-passport-count]").forEach(btn => {
      btn.addEventListener("click", () => {
        preparePassportSheet(parseInt(btn.getAttribute("data-passport-count"), 10) || 6);
        render($("printReview"), false, reviewMode);
      });
    });
  }
  function showClientApproval() {
    let overlay = $("clientApproval");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "clientApproval";
      overlay.className = "hidden fixed inset-0 z-[70] bg-slate-950 flex flex-col items-center justify-center p-4 gap-4";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML = '<p class="text-white/80 text-sm font-semibold">Muestra esta foto al cliente para su aprobación</p><div id="clientApprovalSheet" class="client-approval-sheet w-full max-w-2xl max-h-[70vh] overflow-hidden flex items-start justify-center"></div><div class="flex flex-wrap gap-3 justify-center"><button type="button" id="btnClientRepeat" class="px-6 py-4 rounded-2xl bg-white/10 text-white border border-white/40 text-base font-bold min-h-[56px]">↺ Repetir foto</button><button type="button" id="btnClientApprove" class="px-6 py-4 rounded-2xl bg-emerald-500 text-white text-base font-black min-h-[56px]">✓ Aprobada</button></div>';
      document.body.append(overlay);
      overlay.querySelector("#btnClientApprove").addEventListener("click", () => {
        overlay.classList.add("hidden");
        if (window.RealScanPolish) window.RealScanPolish.successCheck("Foto aprobada por el cliente");
      });
      overlay.querySelector("#btnClientRepeat").addEventListener("click", () => {
        overlay.classList.add("hidden");
        closeModal("outputReviewModal");
        const card = document.querySelector('[id^="slotCard"], .slot-card, [data-slot-card]');
        const target = card || $("slotThumbWrapFront");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof showToast === "function") showToast("Repite la foto: ajusta luz y encuadre y vuelve a capturar.", "info");
      });
    }
    const holder = overlay.querySelector("#clientApprovalSheet");
    holder.replaceChildren();
    const sheet = document.querySelector(".a4-sheet");
    if (sheet) {
      const clone = sheet.cloneNode(true);
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
      holder.append(clone);
    } else if (state.images.front && state.images.front.processedDataUrl) {
      const img = document.createElement("img");
      img.src = state.images.front.processedDataUrl;
      img.alt = "Foto para aprobación del cliente";
      img.className = "max-h-[70vh] w-auto rounded-xl";
      holder.append(img);
    }
    overlay.classList.remove("hidden");
  }
  function preparePassportSheet(count) {
    if (typeof state === "undefined" || state.activeCategory !== "photos") return;
    if (state.format !== "photo_passport") {
      const btn = document.querySelector('[data-quick-format="photo_passport"], [data-format="photo_passport"]');
      if (btn) btn.click();
    }
    const spec = (typeof getActiveSpec === "function") ? getActiveSpec() : null;
    if (!spec || Math.abs(spec.widthMm - 35) > 0.6 || Math.abs(spec.heightMm - 45) > 0.6) {
      state.format = "custom";
      state.customWidth = 3.5;
      state.customHeight = 4.5;
      state.customUnit = "cm";
    }
    state.mixTwoPhotos = false;
    state.photoCopies = count;
    state.photoCopiesPersonA = count;
    state.photoCopiesPersonB = 0;
    state.includeCutMarks = true;
    if (typeof updateUI === "function") updateUI();
    if (typeof scheduleSaveDraft === "function") scheduleSaveDraft();
    if (typeof showToast === "function") showToast("🪪 Hoja de pasaporte preparada: " + count + " fotos de 35 × 45 mm a escala real, con guías de corte.", "success");
  }
  window.preparePassportSheet = preparePassportSheet;
  window.showClientApproval = showClientApproval;
  document.addEventListener("DOMContentLoaded", () => {
    for (const id of ["checkDeliverPdfSheet", "checkDeliverFrontJpg", "checkDeliverBackJpg", "selectDeliveryFormat", "selectDeliveryMaxPx", "selectDeliveryMaxBytes"]) $(id)?.addEventListener("change", window.updateDeliveryReview);
  });
})();
