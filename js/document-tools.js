(function(root) {
  "use strict";
  const MAX_PAGES = 80, MAX_BYTES = 100 * 1024 * 1024;
  let active = null;
  function unlocked() {
    return !!root.RealScanMobile || document.getElementById("loginOverlay")?.classList.contains("hidden") && (!document.getElementById("setupOverlay") || document.getElementById("setupOverlay").classList.contains("hidden"));
  }
  function check(current) {
    if (!unlocked() || !current()) throw Error("La sesión o el trabajo cambió. Vuelve a preparar la copia.");
  }
  async function reader() {
    if (!root.pdfjsLib) {
      const lib = await import("../vendor/pdf.mjs");
      lib.GlobalWorkerOptions.workerSrc = new URL("vendor/pdf.worker.mjs", document.baseURI).href;
      root.pdfjsLib = lib;
    }
    return root.pdfjsLib;
  }
  function select(scope, text, count) {
    if (!Number.isInteger(count) || count < 1 || count > MAX_PAGES) throw Error("Número de páginas no válido.");
    const all = Array.from({ length: count }, (_, i) => i);
    if (scope === "all") return all;
    if (scope === "odd") return all.filter((i) => i % 2 === 0);
    if (scope === "even") {
      const result = all.filter((i) => i % 2 === 1);
      if (!result.length) throw Error("Este archivo no tiene páginas pares.");
      return result;
    }
    if (scope === "range") return root.RealScanAnnotations.parseRange(text, count);
    throw Error("Selección de páginas no válida.");
  }
  function groups(mode, scope, text, ranges, count) {
    const chosen = select(scope, text, count);
    if (mode === "single") return [chosen];
    if (mode === "pages") return chosen.map((i) => [i]);
    if (mode !== "groups") throw Error("División no válida.");
    const result = String(ranges).split(";").map((v) => root.RealScanAnnotations.parseRange(v, count)), seen = /* @__PURE__ */ new Set();
    if (result.length > 40) throw Error("Máximo 40 archivos por entrega.");
    for (const row of result) for (const i of row) {
      if (!chosen.includes(i) || seen.has(i)) throw Error("Los grupos deben usar páginas elegidas, sin repetirlas.");
      seen.add(i);
    }
    if (seen.size !== chosen.length) throw Error("Faltan páginas elegidas en los grupos.");
    return result;
  }
  function cleanMarks(list, count) {
    if (!Array.isArray(list) || list.length > 80) throw Error("Máximo 80 zonas por copia.");
    return list.map((m) => {
      if (!m || !Number.isInteger(m.page) || m.page < 0 || m.page >= count || ![m.x, m.y, m.w, m.h].every(Number.isFinite) || m.x < 0 || m.y < 0 || m.w <= 0 || m.h <= 0 || m.x + m.w > 1.000001 || m.y + m.h > 1.000001) throw Error("Zona fuera de la página.");
      return { page: m.page, x: m.x, y: m.y, w: m.w, h: m.h };
    });
  }
  async function inspectDocument(pdf, { expectedPages = pdf.numPages, isCurrent = () => true, onProgress = () => {
  } } = {}) {
    if (!Number.isInteger(pdf.numPages) || pdf.numPages < 1 || pdf.numPages > MAX_PAGES || pdf.numPages !== expectedPages) throw Error("El PDF está vacío o no contiene todas las páginas solicitadas.");
    const warnings = [], sizes = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      check(isCurrent);
      onProgress("Comprobando página " + i + " de " + pdf.numPages + "…");
      const page = await pdf.getPage(i), base = page.getViewport({ scale: 1 });
      if (![base.width, base.height].every((v) => Number.isFinite(v) && v > 0 && v < 15e3)) throw Error("La página " + i + " tiene medidas no válidas.");
      sizes.push({ width: base.width * 25.4 / 72, height: base.height * 25.4 / 72 });
      const view = page.getViewport({ scale: 96 / Math.max(base.width, base.height) }), canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(view.width));
      canvas.height = Math.max(1, Math.ceil(view.height));
      try {
        const x = canvas.getContext("2d", { willReadFrequently: true });
        await page.render({ canvasContext: x, viewport: view, background: "white" }).promise;
        check(isCurrent);
        const data = x.getImageData(0, 0, canvas.width, canvas.height).data;
        let ink = 0;
        for (let n = 0; n < data.length; n += 4) if (Math.min(data[n], data[n + 1], data[n + 2]) < 240) ink++;
        if (ink < 2) warnings.push("Página " + i + ": parece vacía o tiene contenido muy tenue. Revísala.");
      } finally {
        canvas.width = canvas.height = 0;
        page.cleanup();
      }
    }
    return { pages: pdf.numPages, sizes, warnings };
  }
  function layoutWarnings(pages, annotations = []) {
    const warnings = [];
    for (const [i, p] of pages.entries()) {
      const g = p.geometry;
      if (g && [g.x, g.y, g.width, g.height, g.paperWidth, g.paperHeight].every(Number.isFinite) && (g.x < -0.01 || g.y < -0.01 || g.x + g.width > g.paperWidth + 0.01 || g.y + g.height > g.paperHeight + 0.01)) warnings.push("Página " + (i + 1) + ": hay contenido fuera del papel.");
      for (const a of annotations.filter((a2) => a2.pages.includes(p.key))) {
        const angle = a.angle * Math.PI / 180, w = p.w, h = p.h;
        if (!w || !h) continue;
        const dx = (Math.abs(Math.cos(angle)) * a.w * w + Math.abs(Math.sin(angle)) * a.h * h) / 2, dy = (Math.abs(Math.sin(angle)) * a.w * w + Math.abs(Math.cos(angle)) * a.h * h) / 2;
        if (a.x * w - dx < 0 || a.y * h - dy < 0 || a.x * w + dx > w || a.y * h + dy > h) warnings.push("Página " + (i + 1) + ": una firma o marca queda parcialmente fuera del papel.");
      }
    }
    return [...new Set(warnings)];
  }
  async function inspect(blob, options = {}) {
    if (!blob?.size || blob.size > MAX_BYTES) throw Error("Archivo vacío o superior a 100 MB.");
    const lib = await reader(), task = lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false });
    try {
      return await inspectDocument(await task.promise, options);
    } finally {
      await task.destroy();
    }
  }
  async function rasterPdf(pdf, indices, marks, dpi, quality, current, progress) {
    if (root.ensureJsPdf) await root.ensureJsPdf();
    check(current);
    let output, encodedBytes = 0;
    for (const [n, index] of indices.entries()) {
      check(current);
      progress("Preparando copia: página " + (n + 1) + " de " + indices.length + "…");
      const page = await pdf.getPage(index + 1), base = page.getViewport({ scale: 1 }), w = base.width * 25.4 / 72, h = base.height * 25.4 / 72, scale = Math.min(dpi / 72, 3508 / Math.max(base.width, base.height), Math.sqrt(12e6 / (base.width * base.height))), view = page.getViewport({ scale }), canvas = document.createElement("canvas");
      canvas.width = Math.ceil(view.width);
      canvas.height = Math.ceil(view.height);
      try {
        const x = canvas.getContext("2d");
        await page.render({ canvasContext: x, viewport: view, background: "white" }).promise;
        check(current);
        x.fillStyle = "#000";
        for (const m of marks.filter((m2) => m2.page === index)) {
          const left = Math.floor(m.x * canvas.width), top = Math.floor(m.y * canvas.height), right = Math.ceil((m.x + m.w) * canvas.width), bottom = Math.ceil((m.y + m.h) * canvas.height);
          x.fillRect(left, top, right - left, bottom - top);
        }
        const orientation = w > h ? "landscape" : "portrait";
        if (!output) output = new jspdf.jsPDF({ unit: "mm", format: [w, h], orientation, compress: true });
        else output.addPage([w, h], orientation);
        const masked = marks.some((m) => m.page === index);
        const data = quality === 1 || masked ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality);
        encodedBytes += Math.ceil(data.length * 3 / 4);
        if (encodedBytes > MAX_BYTES) throw Object.assign(Error("La copia renderizada supera 100 MB. Divide el documento o elige un peso máximo."), { code: "COPY_LIMIT" });
        output.addImage(data, quality === 1 || masked ? "PNG" : "JPEG", 0, 0, w, h);
      } finally {
        canvas.width = canvas.height = 0;
        page.cleanup();
      }
    }
    check(current);
    return output.output("blob");
  }
  async function transform(blob, { sets, marks = [], maxBytes = null, isCurrent = () => true, onProgress = () => {
  } } = {}) {
    check(isCurrent);
    if (!blob?.size || blob.size > MAX_BYTES) throw Error("Archivo vacío o superior a 100 MB.");
    if (maxBytes !== null && (!Number.isFinite(maxBytes) || maxBytes < 1024 || maxBytes > 30 * 1024 * 1024)) throw Error("El límite debe estar entre 1 KB y 30 MB por PDF.");
    const lib = await reader(), task = lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false });
    try {
      const pdf = await task.promise;
      check(isCurrent);
      if (pdf.numPages < 1 || pdf.numPages > MAX_PAGES || !Array.isArray(sets) || !sets.length || sets.length > 80 || sets.some((row) => !Array.isArray(row) || !row.length || row.some((i) => !Number.isInteger(i) || i < 0 || i >= pdf.numPages))) throw Error("Páginas de salida no válidas.");
      const safe = cleanMarks(marks, pdf.numPages), files = [];
      if (maxBytes && blob.size <= maxBytes && !safe.length && sets.length === 1 && sets[0].length === pdf.numPages && sets[0].every((value, index) => value === index)) {
        const report = await inspectDocument(pdf, { expectedPages: pdf.numPages, isCurrent, onProgress });
        return [{ blob, pages: pdf.numPages, indices: sets[0].slice(), report, profile: { original: true }, name: "RealScan_Copia_01.pdf" }];
      }
      let total = 0;
      for (const [index, indices] of sets.entries()) {
        let result = null, profile = null;
        const attempts = maxBytes ? [[220, 0.88], [170, 0.8], [130, 0.72], [100, 0.62], [72, 0.52]] : [[220, 0.96]];
        for (const [dpi, quality] of attempts) {
          check(isCurrent);
          try {
            result = await rasterPdf(pdf, indices, safe, dpi, quality, isCurrent, onProgress);
          } catch (error) {
            if (maxBytes && error.code === "COPY_LIMIT") continue;
            throw error;
          }
          profile = { dpi, quality };
          if (maxBytes === null || result.size <= maxBytes) break;
          result = null;
        }
        if (!result) throw Error("No se alcanzó el peso máximo sin bajar de 72 ppp. Aumenta el límite o divide el documento. No se ha entregado una copia fuera del límite.");
        const report = await inspect(result, { expectedPages: indices.length, isCurrent, onProgress });
        total += result.size;
        if (total > MAX_BYTES) throw Error("Las copias superan 100 MB. Divide la entrega en varios grupos.");
        files.push({ blob: result, pages: indices.length, indices: indices.slice(), report, profile, name: "RealScan_Copia_" + String(index + 1).padStart(2, "0") + ".pdf" });
      }
      return files;
    } finally {
      await task.destroy();
    }
  }
  function save(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3e4);
  }
  async function open({ blob, isCurrent = () => true } = {}) {
    if (active || !blob) return;
    if (!blob.size || blob.size > MAX_BYTES) throw Error("Archivo vacío o superior a 100 MB.");
    check(isCurrent);
    const dialog = document.createElement("dialog");
    dialog.id = "documentCopyTools";
    dialog.className = "desk-dialog document-copy-tools";
    dialog.setAttribute("aria-labelledby", "copyToolsTitle");
    dialog.innerHTML = '<header><small>HERRAMIENTAS DEL DOCUMENTO</small><h2 id="copyToolsTitle">Prepara una copia para entregar</h2><p>Trabajamos sobre el PDF preparado. Conservamos sus medidas y tu trabajo original. Las copias modificadas se aplanan: no conservan texto seleccionable, formularios ni firmas digitales. Si solo eliges un peso que ya cumple, conservamos el archivo sin reducir su calidad.</p></header><div class="copy-tools-layout"><section><label>Páginas del PDF preparado<select data-copy="scope"><option value="all">Todas</option><option value="odd">Impares</option><option value="even">Pares</option><option value="range">Intervalo</option></select></label><label data-copy="range-row" hidden>Intervalo<input data-copy="range" placeholder="1, 3-5"></label><label>Cómo guardar<select data-copy="mode"><option value="single">Un solo PDF</option><option value="pages">Un PDF por página · ZIP</option><option value="groups">Dividir por grupos · ZIP</option></select></label><label data-copy="groups-row" hidden>Grupos sin repetir páginas<input data-copy="groups" placeholder="1-2; 3-5"></label><label class="copy-check"><input type="checkbox" data-copy="limit"> Reducir a un peso máximo por PDF</label><label data-copy="mb-row" hidden>Máximo por PDF (MB)<input type="number" data-copy="mb" min="0.1" max="30" step="0.1" value="2"></label><p>La reducción puede perder detalle. Revisa letras pequeñas antes de entregar. Las zonas ocultas se guardan sin pérdidas para mantener el negro opaco.</p><details data-copy="redaction"><summary>Ocultar datos en esta copia</summary><p>Arrastra sobre la página o introduce porcentajes. Las zonas negras se incorporan a los píxeles de la copia, sin texto OCR ni archivos originales ocultos. Comprueba que cubren todos los datos.</p><div class="copy-rect-fields"></div><button type="button" data-copy="add">Añadir zona</button><button type="button" data-copy="undo">Deshacer última zona</button><p data-copy="marks"></p><label class="copy-check"><input type="checkbox" data-copy="confirm"> Revisé todas las zonas y quiero generar la copia ocultada</label></details></section><section><nav class="copy-page-nav"><button type="button" data-copy="previous">← Anterior</button><span data-copy="page"></span><button type="button" data-copy="next">Siguiente →</button></nav><label>Ampliar vista · no cambia el archivo<select data-copy="zoom"><option value="1">Encajar</option><option value="1.5">150 %</option><option value="2">200 %</option><option value="3">300 %</option></select></label><p data-copy="view-label">Original preparado · dibuja las zonas negras sobre esta vista</p><div class="copy-canvas-wrap"><canvas data-copy="canvas" aria-label="Página para ocultar datos"></canvas></div><label data-copy="result-row" hidden>Archivo comprobado<select data-copy="result"></select></label><button type="button" data-copy="edit" hidden>Volver a editar las zonas</button></section></div><p data-copy="status" role="status">Abriendo el PDF…</p><footer><button type="button" data-copy="close">Volver</button><button type="button" data-copy="build" disabled>Generar y comprobar copia</button><button type="button" data-copy="download" disabled>Descargar copia</button></footer>';
    const q = (key) => dialog.querySelector('[data-copy="' + key + '"]');
    let disposed = false, busy = false, task = null, pdf = null, pageIndex = 0, marks = [], results = [], resultTask = null, resultPdf = null, renderTask = null, serial = 0, drag = null, dragPreview = null;
    const current = () => !disposed && unlocked() && isCurrent();
    const stop = () => {
      serial++;
      renderTask?.cancel();
      renderTask = null;
      dragPreview?.remove();
      dragPreview = null;
      drag = null;
    };
    function close() {
      if (disposed) return;
      disposed = true;
      stop();
      task?.destroy().catch(() => {
      });
      resultTask?.destroy().catch(() => {
      });
      results = [];
      marks = [];
      q("canvas").width = q("canvas").height = 0;
      document.removeEventListener("realscan:auth-lock", close);
      for (const event of changeEvents) document.removeEventListener(event, jobChanged);
      active = null;
      dialog.close();
      dialog.remove();
    }
    const changeEvents = ["realscan:studio-updated", "realscan:document-updated", "realscan:mobile-updated"];
    function jobChanged() {
      if (!current()) close();
    }
    for (const event of changeEvents) document.addEventListener(event, jobChanged);
    document.addEventListener("realscan:auth-lock", close);
    active = { close };
    q("close").onclick = close;
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    function buttons() {
      const count = (resultPdf || pdf)?.numPages || 0;
      for (const input of dialog.querySelectorAll("input,select,button")) if (input !== q("close")) input.disabled = busy || !pdf || !current();
      q("previous").disabled = busy || pageIndex <= 0;
      q("next").disabled = busy || pageIndex >= count - 1;
      q("download").disabled = busy || !results.length || !current();
      q("undo").disabled = busy || !marks.length || !!resultPdf;
      q("add").disabled = busy || !pdf || !current() || !!resultPdf;
      q("confirm").disabled = busy || !pdf || !current() || !!resultPdf;
      q("page").textContent = "Página " + (pageIndex + 1) + " de " + count;
      q("marks").textContent = marks.length + " zona(s) · solo en esta copia";
    }
    async function draw() {
      if (!pdf || !current()) return;
      const token = ++serial, old = renderTask;
      old?.cancel();
      await old?.promise.catch(() => {
      });
      if (token !== serial || !current()) return;
      try {
        const doc = resultPdf || pdf, page = await doc.getPage(pageIndex + 1);
        if (token !== serial || !current()) return;
        const zoom = Number(q("zoom").value) || 1, base = page.getViewport({ scale: 1 }), view = page.getViewport({ scale: Math.min(1e3 * zoom / base.width, 1400 * zoom / base.height, 2e3 / base.width, 2800 / base.height) }), c = q("canvas");
        c.style.width = Math.max(120, dialog.querySelector(".copy-canvas-wrap").clientWidth - 20) * zoom + "px";
        c.style.maxWidth = zoom === 1 ? "100%" : "none";
        drawingMode();
        c.width = Math.ceil(view.width);
        c.height = Math.ceil(view.height);
        const x = c.getContext("2d");
        renderTask = page.render({ canvasContext: x, viewport: view, background: "white" });
        await renderTask.promise;
        if (token !== serial || !current()) return;
        if (!resultPdf) {
          x.fillStyle = "#000";
          for (const m of marks.filter((m2) => m2.page === pageIndex)) x.fillRect(m.x * c.width, m.y * c.height, m.w * c.width, m.h * c.height);
        }
        buttons();
      } catch (e) {
        if (current() && token === serial) q("status").textContent = e.message;
      } finally {
        if (token === serial) renderTask = null;
      }
    }
    function invalidate() {
      stop();
      results = [];
      resultPdf = null;
      resultTask?.destroy().catch(() => {
      });
      resultTask = null;
      q("download").disabled = true;
      q("result-row").hidden = true;
      q("edit").hidden = true;
      q("confirm").checked = false;
      q("view-label").textContent = "Original preparado · dibuja las zonas negras sobre esta vista";
      pageIndex = Math.min(pageIndex, (pdf?.numPages || 1) - 1);
      buttons();
      draw();
    }
    for (const [name, label, value] of [["x", "Izquierda (%)", 10], ["y", "Arriba (%)", 10], ["w", "Ancho (%)", 30], ["h", "Alto (%)", 10]]) {
      const row = document.createElement("label"), input = document.createElement("input");
      row.textContent = label;
      input.type = "number";
      input.min = 0;
      input.max = 100;
      input.step = 0.1;
      input.value = value;
      input.dataset.copy = name;
      row.append(input);
      dialog.querySelector(".copy-rect-fields").append(row);
    }
    function addMark(m) {
      if (busy || resultPdf || !current()) return;
      try {
        marks = cleanMarks([...marks, m], pdf.numPages);
        invalidate();
      } catch (e) {
        q("status").textContent = e.message;
      }
    }
    q("add").onclick = () => addMark({ page: pageIndex, ...Object.fromEntries(["x", "y", "w", "h"].map((k) => [k, Number(q(k).value) / 100])) });
    q("undo").onclick = () => {
      if (!busy && !resultPdf) {
        marks.pop();
        invalidate();
      }
    };
    const point = (e) => {
      const r = q("canvas").getBoundingClientRect();
      return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
    };
    q("canvas").onpointerdown = (e) => {
      if (busy || resultPdf || !pdf || !current() || !q("redaction").open || e.button !== 0) return;
      drag = { ...point(e), id: e.pointerId };
      dragPreview = document.createElement("div");
      dragPreview.className = "copy-drag-preview";
      dragPreview.setAttribute("aria-hidden", "true");
      dialog.querySelector(".copy-canvas-wrap").append(dragPreview);
      q("canvas").setPointerCapture(e.pointerId);
    };
    q("canvas").onpointerup = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const start = drag;
      dragPreview?.remove();
      dragPreview = null;
      drag = null;
      const end = point(e), w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y);
      if (w > 2e-3 && h > 2e-3) addMark({ page: pageIndex, x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), w, h });
    };
    q("canvas").onpointercancel = () => {
      dragPreview?.remove();
      dragPreview = null;
      drag = null;
    };
    function drawingMode() {
      const enabled = !resultPdf && q("redaction").open;
      q("canvas").style.touchAction = enabled ? "none" : "pan-x pan-y";
      q("canvas").style.cursor = enabled ? "crosshair" : "default";
    }
    q("redaction").ontoggle = drawingMode;
    q("zoom").onchange = () => {
      if (!busy) draw();
    };
    q("canvas").onpointermove = (e) => {
      if (!drag || drag.id !== e.pointerId || !dragPreview) return;
      const p = point(e), wrap = dialog.querySelector(".copy-canvas-wrap"), r = q("canvas").getBoundingClientRect(), w = wrap.getBoundingClientRect();
      Object.assign(dragPreview.style, { left: r.left - w.left + wrap.scrollLeft + Math.min(drag.x, p.x) * r.width + "px", top: r.top - w.top + wrap.scrollTop + Math.min(drag.y, p.y) * r.height + "px", width: Math.abs(p.x - drag.x) * r.width + "px", height: Math.abs(p.y - drag.y) * r.height + "px" });
    };
    q("previous").onclick = () => {
      if (pageIndex > 0 && !busy) {
        pageIndex--;
        draw();
      }
    };
    q("next").onclick = () => {
      if (pageIndex < (resultPdf || pdf).numPages - 1 && !busy) {
        pageIndex++;
        draw();
      }
    };
    for (const name of ["scope", "range", "mode", "groups", "limit", "mb"]) q(name).onchange = () => {
      if (busy) return;
      q("range-row").hidden = q("scope").value !== "range";
      q("groups-row").hidden = q("mode").value !== "groups";
      q("mb-row").hidden = !q("limit").checked;
      invalidate();
    };
    async function showResult() {
      stop();
      await resultTask?.destroy();
      resultPdf = null;
      const file = results[Number(q("result").value) || 0];
      if (!file || !current()) return;
      const lib = await reader(), data = new Uint8Array(await file.blob.arrayBuffer());
      if (!current()) return;
      const owned = lib.getDocument({ data, isEvalSupported: false });
      resultTask = owned;
      const shown = await owned.promise;
      if (!current()) {
        await owned.destroy();
        return;
      }
      resultPdf = shown;
      pageIndex = 0;
      q("result-row").hidden = false;
      q("edit").hidden = false;
      q("view-label").textContent = "Resultado comprobado · " + file.pages + " página(s) · " + (file.blob.size / 1024 / 1024).toFixed(2) + " MB";
      await draw();
    }
    q("result").onchange = async () => {
      if (busy) return;
      busy = true;
      buttons();
      try {
        await showResult();
      } catch (e) {
        if (current()) q("status").textContent = e.message;
      } finally {
        busy = false;
        if (current()) buttons();
      }
    };
    q("edit").onclick = invalidate;
    q("build").onclick = async () => {
      if (busy || !pdf || !current()) return;
      busy = true;
      results = [];
      buttons();
      try {
        if (marks.length && !q("confirm").checked) throw Error("Revisa las zonas y confirma que quieres ocultarlas en la copia.");
        const sets = groups(q("mode").value, q("scope").value, q("range").value, q("groups").value, pdf.numPages), maxBytes = q("limit").checked ? Number(q("mb").value) * 1024 * 1024 : null;
        const files = await transform(blob, { sets, marks, maxBytes, isCurrent: current, onProgress: (m) => {
          if (current()) q("status").textContent = m;
        } });
        check(current);
        results = files;
        q("result").replaceChildren(...files.map((f, i) => new Option(f.name, String(i))));
        await showResult();
        check(current);
        const warnings = files.flatMap((f) => f.report.warnings);
        q("status").textContent = files.length + " archivo(s) comprobado(s). " + (maxBytes ? "Todos cumplen el peso máximo. " : "") + (files.every((f) => f.profile.original) ? "El archivo ya cumplía el límite y conserva su calidad original. " : maxBytes ? "Calidad reducida: revisa el texto ampliando la vista. " : "") + warnings.join(" ");
      } catch (e) {
        results = [];
        if (current()) q("status").textContent = e.message;
      } finally {
        busy = false;
        if (current()) buttons();
      }
    };
    q("download").onclick = async () => {
      if (busy || !results.length || !current()) return;
      busy = true;
      buttons();
      try {
        const measurement = root.RealScanCounterEvolution?.beginDelivery?.("pdf");
        if (results.length === 1 && q("mode").value === "single") save(results[0].blob, results[0].name);
        else {
          if (root.ensureJSZip) await root.ensureJSZip();
          check(current);
          const zip = new JSZip();
          for (const f of results) zip.file(f.name, f.blob);
          const archive = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
          check(current);
          save(archive, "RealScan_Paginas.zip");
        }
        root.RealScanCounterEvolution?.finishDelivery?.(measurement);
      } catch (e) {
        if (current()) q("status").textContent = e.message;
      } finally {
        busy = false;
        if (current()) buttons();
      }
    };
    document.body.append(dialog);
    dialog.showModal();
    const heading = dialog.querySelector("#copyToolsTitle");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    dialog.scrollTop = 0;
    buttons();
    try {
      const lib = await reader(), data = new Uint8Array(await blob.arrayBuffer());
      check(current);
      task = lib.getDocument({ data, isEvalSupported: false });
      pdf = await task.promise;
      check(current);
      if (pdf.numPages < 1 || pdf.numPages > MAX_PAGES) throw Error("Máximo 80 páginas por copia.");
      await draw();
      q("status").textContent = "Elige páginas, división, peso o zonas a ocultar. Tu original se conserva.";
    } catch (e) {
      if (current()) q("status").textContent = e.message;
    }
    buttons();
  }
  function mountRepeat() {
    const tools = document.getElementById("deskTools");
    if (!tools) {
      setTimeout(mountRepeat, 160);
      return;
    }
    if (document.getElementById("repeatLastSettings")) return;
    const repeat = document.createElement("button");
    repeat.type = "button";
    repeat.id = "repeatLastSettings";
    repeat.textContent = "Repetir ajustes · cliente nuevo";
    repeat.onclick = () => {
      if (root.RealScanAnnotationWorkflow.adapter().allowed()) root.RealScanCounter.openNewService("repeat", "choose", true);
    };
    tools.append(repeat);
  }
  function init() {
    if (root.RealScanMobile) return;
    const mount = () => {
      const parent = document.getElementById("docImport")?.parentElement;
      if (!parent || !root.RealScanCounter) {
        setTimeout(mount, 160);
        return;
      }
      if (document.getElementById("docMergeFiles")) return;
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = ".pdf,image/jpeg,image/png,image/webp";
      input.hidden = true;
      input.id = "docMergeFiles";
      const b = document.createElement("button");
      b.type = "button";
      b.id = "docMerge";
      b.textContent = "Unir archivos";
      b.onclick = () => {
        const adapter = root.RealScanAnnotationWorkflow.adapter();
        if (adapter.allowed() && !RealScanDocuments.status().busy) input.click();
      };
      input.onchange = async () => {
        const files = [...input.files];
        input.value = "";
        if (files.length && root.RealScanAnnotationWorkflow.adapter().allowed()) {
          await RealScanDocuments.addFiles(files, { skipIdentity: true });
        }
      };
      parent.append(b, input);
      mountRepeat();
    };
    setTimeout(mount, 300);
  }
  root.RealScanDocumentTools = { select, groups, cleanMarks, layoutWarnings, inspect, inspectDocument, transform, open, close: () => active?.close() };
  root.addEventListener("pagehide", () => active?.close());
  document.addEventListener("DOMContentLoaded", init);
})(window);
