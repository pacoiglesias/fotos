(function(root) {
  "use strict";
  function area(q) {
    return Math.abs(q.reduce((s, p, i) => s + p.x * q[(i + 1) % 4].y - p.y * q[(i + 1) % 4].x, 0)) / 2;
  }
  function validQuad(q, w, h) {
    if (!q || q.length !== 4 || q.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0 || p.x > w || p.y > h)) return false;
    const crosses = q.map((p, i) => {
      const b = q[(i + 1) % 4], c = q[(i + 2) % 4];
      return (b.x - p.x) * (c.y - b.y) - (b.y - p.y) * (c.x - b.x);
    });
    return crosses.every((v) => v > 1) && area(q) > w * h * 0.04;
  }
  function analyze(source) {
    const sw = source.videoWidth || source.naturalWidth || source.width, sh = source.videoHeight || source.naturalHeight || source.height;
    if (!sw || !sh || sw < 16 || sh < 16) return null;
    const c = document.createElement("canvas"), scale = Math.min(1, 360 / Math.max(sw, sh));
    c.width = Math.round(sw * scale);
    c.height = Math.round(sh * scale);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, c.width, c.height);
    const { width: w, height: h } = c, p = ctx.getImageData(0, 0, w, h).data, gray = new Float32Array(w * h);
    let light = 0, lap = 0, lap2 = 0, count = 0;
    for (let i = 0; i < gray.length; i++) gray[i] = p[i * 4] * 0.299 + p[i * 4 + 1] * 0.587 + p[i * 4 + 2] * 0.114;
    for (let y = Math.round(h * 0.2); y < h * 0.8; y++) for (let x = Math.round(w * 0.2); x < w * 0.8; x++) {
      const i = y * w + x, v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      light += gray[i];
      lap += v;
      lap2 += v * v;
      count++;
    }
    const brightness = light / count, sharpness = lap2 / count - (lap / count) ** 2;
    const bg = [0, 1, 2].map((ch) => {
      const values = [];
      for (let x = 0; x < w; x += 6) {
        values.push(p[(2 * w + x) * 4 + ch], p[((h - 3) * w + x) * 4 + ch]);
      }
      for (let y = 0; y < h; y += 6) {
        values.push(p[(y * w + 2) * 4 + ch], p[(y * w + w - 3) * 4 + ch]);
      }
      values.sort((a, b) => a - b);
      return values[values.length >> 1];
    });
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) mask[i] = (Math.abs(p[i * 4] - bg[0]) + Math.abs(p[i * 4 + 1] - bg[1]) + Math.abs(p[i * 4 + 2] - bg[2])) / 3 > 35 ? 1 : 0;
    const work = new Int32Array(w * h);
    let best = null, bestSize = 0;
    for (let start = w + 1; start < mask.length - w - 1; start++) {
      if (!mask[start]) continue;
      let head = 0, tail = 1;
      work[0] = start;
      mask[start] = 0;
      let tl = null, tr = null, br = null, bl = null, minSum = Infinity, maxSum = -Infinity, minDiff = Infinity, maxDiff = -Infinity;
      while (head < tail) {
        const i = work[head++], x = i % w, y = i / w | 0, s = x + y, d = x - y;
        if (s < minSum) {
          minSum = s;
          tl = { x, y };
        }
        if (s > maxSum) {
          maxSum = s;
          br = { x, y };
        }
        if (d < minDiff) {
          minDiff = d;
          bl = { x, y };
        }
        if (d > maxDiff) {
          maxDiff = d;
          tr = { x, y };
        }
        for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (n >= 0 && mask[n]) {
          mask[n] = 0;
          work[tail++] = n;
        }
      }
      const q = [tl, tr, br, bl];
      if (tail > bestSize && validQuad(q, w, h) && tail / area(q) > 0.78 && area(q) > w * h * 0.12 && q.every((v) => v.x > 3 && v.x < w - 4 && v.y > 3 && v.y < h - 4)) {
        best = q;
        bestSize = tail;
      }
    }
    const quad = best?.map((p2) => ({ x: p2.x / w, y: p2.y / h })) || null;
    let message = brightness < 55 ? "A\xF1ade luz sin reflejos." : brightness > 235 ? "Evita la luz directa y los reflejos." : sharpness < 35 ? "Mant\xE9n el tel\xE9fono quieto y deja que enfoque." : quad ? "Bordes encontrados. Revisa las cuatro esquinas al capturar." : "Deja un margen y usa un fondo que contraste con la p\xE1gina.";
    return { quad, brightness, sharpness, message };
  }
  let current = null;
  function close() {
    current?.close();
  }
  function open(options = {}) {
    close();
    root.RealScanDiagnostics?.record("camera.open");
    const dialog = document.createElement("dialog");
    dialog.className = "scan-dialog";
    dialog.setAttribute("aria-label", "Captura y encuadre de documento");
    dialog.innerHTML = `<div class="scan-head"><div><strong>Captura asistida</strong><small>Encuadra, revisa y confirma</small></div><button type="button" data-act="close" aria-label="Cerrar c\xE1mara">\xD7</button></div>
      <label class="scan-format">Forma del documento <select aria-label="Forma del documento"><option value="auto">Automática / Otro documento</option><option value="card">Tarjeta (INE / licencia)</option><option value="a4">Hoja A4</option><option value="letter">Hoja Carta</option></select></label>
      <div class="scan-stage"><video autoplay playsinline muted></video><canvas class="scan-still" hidden></canvas><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon/></svg><div class="scan-corners" hidden></div></div>
      <p class="scan-status" role="status" aria-live="polite">Preparando la c\xE1mara\u2026</p><p class="scan-help">Apoya el documento plano, deja sus cuatro bordes visibles y evita sombras. Las medidas reales se eligen en el mostrador.</p>
      <div class="scan-actions"><button type="button" data-act="capture">Tomar foto</button><button type="button" data-act="switch">Girar c\xE1mara</button><button type="button" data-act="torch" hidden>Linterna</button><button type="button" data-act="native">C\xE1mara del tel\xE9fono</button>
      <button type="button" data-act="retry" hidden>Repetir</button><button type="button" data-act="original" hidden>Usar completa</button><button type="button" data-act="accept" hidden>Enderezar y usar</button></div>`;
    document.body.append(dialog);
    const $ = (s) => dialog.querySelector(s), video = $("video"), canvas = $("canvas"), svg = $("svg"), poly = $("polygon"), handles = $(".scan-corners"), status = $(".scan-status"), stage = $(".scan-stage");
    const format = $('select');
    if (Number.isFinite(options.targetRatio) && options.targetRatio > 0) {
      const option = document.createElement('option'); option.value = 'target';
      option.textContent = 'Formato elegido en el mostrador'; format.prepend(option); format.value = 'target';
    }
    if (options.photoMode) {
      $('.scan-format').hidden = true;
      $('.scan-help').textContent = 'Busca luz uniforme, mantén el teléfono quieto y revisa la nitidez. El recorte del retrato se ajusta después en el mostrador.';
    }
    let stream = null, timer = null, revision = 0, disposed = false, captured = null, quad = null, facing = "environment", busy = false, torch = false;
    const btn = (a) => $(`[data-act="${a}"]`);
    function stop() {
      clearTimeout(timer);
      timer = null;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      video.srcObject = null;
    }
    function finish() {
      if (disposed) return;
      disposed = true;
      revision++;
      stop();
      dialog.close();
      dialog.remove();
      if (current === controller) current = null;
      root.RealScanDiagnostics?.record("camera.close");
    }
    const controller = { close: finish };
    current = controller;
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      finish();
    });
    dialog.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      } else if (e.altKey && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        finish();
        root.RealScanDiagnostics?.recover();
      }
    });
    function paint() {
      const ratio = {card:85.6/53.98,a4:210/297,letter:215.9/279.4,target:options.targetRatio}[format.value];
      const aspect = (video.videoWidth || canvas.width || 4) / (video.videoHeight || canvas.height || 3);
      let w = .8, h = ratio ? .8 * aspect / ratio : .7;
      if (h > .8) { w *= .8 / h; h = .8; }
      const x = (1-w)/2, y = (1-h)/2;
      poly.setAttribute("points", (quad || [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]).map((p) => `${p.x * 100},${p.y * 100}`).join(" "));
      svg.classList.toggle("scan-found", !!quad);
      handles.querySelectorAll("button").forEach((b, i) => {
        b.style.left = quad[i].x * 100 + "%";
        b.style.top = quad[i].y * 100 + "%";
      });
    }
    format.addEventListener('change', paint);
    function live() {
      if (disposed || captured) return;
      try {
        const a = analyze(video);
        if (a) {
          quad = options.photoMode ? null : a.quad;
          status.textContent = a.message;
          paint();
        }
      } catch {
        status.textContent = "Captura y revisa el encuadre antes de usar la foto.";
      }
      timer = setTimeout(live, 650);
    }
    async function start() {
      const r = ++revision;
      stop();
      captured = null;
      busy = false;
      torch = false;
      btn("torch").textContent = "Linterna";
      canvas.hidden = true;
      handles.hidden = true;
      video.hidden = false;
      for (const a of ["capture", "switch", "native"]) btn(a).hidden = false;
      for (const a of ["retry", "accept", "original", "torch"]) btn(a).hidden = true;
      btn("capture").disabled = true;
      status.textContent = "Preparando la c\xE1mara\u2026";
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Error("unsupported");
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 2560 }, height: { ideal: 1920 } }, audio: false });
        if (disposed || r !== revision) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        video.srcObject = s;
        await video.play();
        if (disposed || r !== revision) return;
        const track = s.getVideoTracks()[0];
        let caps = {};
        try { caps = track.getCapabilities?.() || {}; } catch { /* Optional camera controls must not prevent capture. */ }
        if (caps.focusMode?.includes("continuous")) await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {
        });
        if (disposed || r !== revision) return;
        stage.style.width = Math.min(dialog.clientWidth - 24, innerHeight * 0.53 * video.videoWidth / video.videoHeight) + "px";
        stage.style.marginInline = "auto";
        btn("torch").hidden = !caps.torch;
        btn("capture").disabled = false;
        live();
      } catch {
        if (disposed || r !== revision) return;
        stop();
        root.RealScanDiagnostics?.record("camera.failed", "warning");
        status.textContent = "No se pudo abrir la c\xE1mara. Permite el acceso o usa \xABC\xE1mara del tel\xE9fono\xBB.";
      }
    }
    async function take() {
      if (busy || !video.videoWidth) return;
      busy = true;
      btn("capture").disabled = true;
      clearTimeout(timer);
      const r = revision;
      try {
        let photo = null;
        const track = stream?.getVideoTracks()[0];
        if (root.ImageCapture && track) try {
          const blob = await new ImageCapture(track).takePhoto();
          photo = await createImageBitmap(blob);
        } catch {
        }
        if (disposed || r !== revision) {
          photo?.close();
          return;
        }
        const source = photo || video, sw = source.width || video.videoWidth, sh = source.height || video.videoHeight, scale = Math.min(1, 3e3 / Math.max(sw, sh));
        canvas.width = Math.round(sw * scale);
        canvas.height = Math.round(sh * scale);
        canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
        photo?.close();
        captured = canvas.toDataURL("image/jpeg", 0.96);
        stop();
        video.hidden = true;
        canvas.hidden = false;
        stage.style.width = Math.min(dialog.clientWidth - 24, innerHeight * 0.53 * canvas.width / canvas.height) + "px";
        const a = analyze(canvas);
        quad = options.photoMode ? null : a?.quad;
        if (!quad) quad = [{ x: 0.04, y: 0.04 }, { x: 0.96, y: 0.04 }, { x: 0.96, y: 0.96 }, { x: 0.04, y: 0.96 }];
        status.textContent = options.photoMode ? "Revisa la nitidez. La fotograf\xEDa se conserva completa." : (a?.quad ? "Bordes propuestos." : "No se detectaron bordes con suficiente confianza.") + " Ajusta las cuatro esquinas o usa la foto completa. " + (a?.sharpness < 35 ? "Puede faltar nitidez; considera repetir." : "");
        for (const a2 of ["capture", "switch", "native", "torch"]) btn(a2).hidden = true;
        for (const a2 of ["retry", "original"]) btn(a2).hidden = false;
        btn("accept").hidden = !!options.photoMode;
        handles.replaceChildren();
        handles.hidden = !!options.photoMode;
        if (!options.photoMode) quad.forEach((p, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "scan-corner";
          b.setAttribute("aria-label", "Esquina " + (i + 1) + ". Usa las flechas para ajustar.");
          b.textContent = i + 1;
          function move(x, y) {
            quad[i] = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
            paint();
          }
          b.onpointerdown = (e) => {
            e.preventDefault();
            b.setPointerCapture(e.pointerId);
          };
          b.onpointermove = (e) => {
            if (!b.hasPointerCapture(e.pointerId)) return;
            const box = handles.getBoundingClientRect();
            move((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
          };
          b.onkeydown = (e) => {
            const d = e.shiftKey ? 0.02 : 5e-3;
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
              e.preventDefault();
              move(quad[i].x + (e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0), quad[i].y + (e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0));
            }
          };
          handles.append(b);
        });
        paint();
      } catch {
        status.textContent = "No se pudo tomar la foto. Reintenta o usa la c\xE1mara del tel\xE9fono.";
        btn("capture").disabled = false;
        live();
      } finally {
        busy = false;
      }
    }
    async function accept(crop) {
      if (busy || !captured) return;
      busy = true;
      btn("accept").disabled = btn("original").disabled = true;
      try {
        let result = captured;
        if (crop) {
          const q = quad.map((p) => ({ x: p.x * canvas.width, y: p.y * canvas.height }));
          if (!validQuad(q, canvas.width, canvas.height)) throw Error("Las esquinas deben rodear el documento sin cruzarse.");
          const image = new Image();
          image.src = captured;
          await image.decode();
          if (disposed) return;
          const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
          let w = Math.max(distance(q[0], q[1]), distance(q[3], q[2])), h = Math.max(distance(q[0], q[3]), distance(q[1], q[2]));
          let ratio = {card:85.6/53.98,a4:210/297,letter:215.9/279.4,target:options.targetRatio}[format.value];
          if (ratio) {
            if ((w > h) !== (ratio > 1)) ratio = 1 / ratio;
            // Keep the chosen paper/card proportion; never infer physical centimetres from pixels.
            if (w / h > ratio) h = w / ratio; else w = h * ratio;
          }
          const limit = Math.min(1, 2400 / Math.max(w, h));
          result = root.RealScanEditor.warpPerspective(image, q, Math.max(1, Math.round(w * limit)), Math.max(1, Math.round(h * limit)));
          if (!result) throw Error("No se pudo enderezar. Ajusta las esquinas o usa la foto completa.");
        }
        if (disposed) return;
        root.RealScanDiagnostics?.record(crop ? "camera.corrected" : "camera.full_frame");
        finish();
        try {
          await options.onAccept?.(result);
        } catch (error) {
          options.onError?.(error);
        }
      } catch (e) {
        if (!disposed) status.textContent = e.message;
      } finally {
        busy = false;
        btn("accept").disabled = btn("original").disabled = false;
      }
    }
    btn("close").onclick = finish;
    btn("capture").onclick = take;
    btn("retry").onclick = start;
    btn("accept").onclick = () => accept(true);
    btn("original").onclick = () => accept(false);
    btn("switch").onclick = () => {
      facing = facing === "environment" ? "user" : "environment";
      start();
    };
    btn("native").onclick = () => {
      finish();
      options.onNative?.();
    };
    btn("torch").onclick = async () => {
      try {
        const track = stream?.getVideoTracks()[0];
        if (!track) return;
        await track.applyConstraints({ advanced: [{ torch: !torch }] });
        torch = !torch;
        btn("torch").textContent = torch ? "Apagar linterna" : "Linterna";
      } catch {
        status.textContent = "Este dispositivo no permite cambiar la linterna.";
      }
    };
    dialog.showModal();
    start();
    return controller;
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) close();
  });
  root.addEventListener("pagehide", close);
  root.RealScanCapture = { open, close, analyze, validQuad };
})(window);
