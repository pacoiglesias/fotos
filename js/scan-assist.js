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
    const borderNoise = [];
    for(let x=0;x<w;x+=6) for(const y of [2,h-3]) borderNoise.push((Math.abs(p[(y*w+x)*4]-bg[0])+Math.abs(p[(y*w+x)*4+1]-bg[1])+Math.abs(p[(y*w+x)*4+2]-bg[2]))/3);
    borderNoise.sort((a,b)=>a-b);
    const threshold = Math.max(10,Math.min(35,10+4*(borderNoise[borderNoise.length>>1] || 0)));
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) mask[i] = (Math.abs(p[i * 4] - bg[0]) + Math.abs(p[i * 4 + 1] - bg[1]) + Math.abs(p[i * 4 + 2] - bg[2])) / 3 > threshold ? 1 : 0;
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
    let message = brightness < 55 ? "Añade luz sin reflejos." : brightness > 235 ? "Evita la luz directa y los reflejos." : sharpness < 35 ? "Mantén el teléfono quieto y deja que enfoque." : quad ? "Bordes encontrados. Revisa las cuatro esquinas al capturar." : "Deja un margen y usa un fondo que contraste con la página.";
    return { quad, brightness, sharpness, message, coverage:quad?area(quad):0 };
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
    dialog.innerHTML = `<div class="scan-head"><div><strong>${options.photoMode?'Fotografía sin deformaciones':'Escáner de documentos'}</strong><small>Captura privada · Revisión antes de usar</small></div><button type="button" data-act="close" aria-label="Cerrar cámara">×</button></div>
      <ol class="scan-steps" aria-label="Progreso de captura"><li data-phase="capture">1 · Capturar</li><li data-phase="review">2 · Revisar</li><li data-phase="confirm">3 · Confirmar</li></ol>
      <label class="scan-format">Forma del documento <select aria-label="Forma del documento"><option value="auto">Automática / Otro documento</option><option value="card">Tarjeta (INE / licencia)</option><option value="a4">Hoja A4</option><option value="letter">Hoja Carta</option></select></label>
      <label class="scan-filter">Aspecto <select aria-label="Aspecto de la imagen"><option value="color">Color original</option><option value="gray">Escala de grises</option><option value="document">Documento contrastado</option></select></label>
      <div class="scan-preview-area"><div class="scan-stage"><video autoplay playsinline webkit-playsinline muted></video><canvas class="scan-still" hidden></canvas><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="scan-shade" fill-rule="evenodd"/><polygon/></svg><div class="scan-corners" hidden></div></div></div>
      <p class="scan-status" role="status" aria-live="polite">Preparando la cámara…</p><p class="scan-help">Apoya el documento plano, deja sus cuatro bordes visibles y evita sombras. Elige el tamaño de salida. Para obtener más detalle, puedes usar Cámara del teléfono.</p>
      <div class="scan-quality" aria-label="Calidad estimada"><span data-quality="light">Luz: revisando</span><span data-quality="sharp">Nitidez: revisando</span><span data-quality="steady">Encuadre: revisando</span></div>
      <p class="scan-focus-info">El control de enfoque depende de la cámara y del navegador.</p>
      <label class="scan-auto"><input type="checkbox"> Capturar al mantener el documento estable</label>
      <div class="scan-actions"><button type="button" data-act="capture">Tomar foto</button><button type="button" data-act="focus">Reintentar enfoque</button><button type="button" data-act="switch">Cambiar cámara</button><button type="button" data-act="torch" hidden>Linterna</button><button type="button" data-act="native">Cámara del teléfono</button>
      <button type="button" data-act="left" hidden>Girar izquierda</button><button type="button" data-act="right" hidden>Girar derecha</button><button type="button" data-act="reset" hidden>Restaurar original</button><button type="button" data-act="confirm" hidden>Usar esta imagen</button><button type="button" data-act="edit" hidden>Volver a ajustar</button>
      <button type="button" data-act="retry" hidden>Repetir</button><button type="button" data-act="original" hidden>Usar completa</button><button type="button" data-act="accept" hidden>Enderezar y usar</button></div>`;
    const settings = document.createElement('details');
    settings.className = 'scan-settings';
    settings.innerHTML = '<summary>Opciones de captura y ayuda</summary><div class="scan-settings-content"></div>';
    for (const selector of ['.scan-format','.scan-filter','.scan-help','.scan-focus-info','.scan-auto']) settings.lastElementChild.append(dialog.querySelector(selector));
    dialog.querySelector('.scan-actions').before(settings);
    const guidance = document.createElement('p');guidance.className='scan-guidance';guidance.textContent=options.photoMode?'Coloca el rostro centrado y busca luz uniforme. Revisa el enfoque antes de confirmar.':'Documento plano, cuatro bordes visibles y sin reflejos. Tras capturar, ajusta las esquinas antes de confirmar.';dialog.querySelector('.scan-preview-area').before(guidance);
    document.body.append(dialog);
    const oldOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const $ = (s) => dialog.querySelector(s), video = $("video"), canvas = $("canvas"), svg = $("svg"), poly = $("polygon"), handles = $(".scan-corners"), status = $(".scan-status"), stage = $(".scan-stage");
    const format = $(".scan-format select"), filter = $(".scan-filter select");
    const magnifier = document.createElement('canvas');
    magnifier.className = 'scan-magnifier'; magnifier.width = magnifier.height = 160; magnifier.hidden = true;
    magnifier.setAttribute('aria-hidden','true'); $('.scan-preview-area').append(magnifier);
    let magnifierTimer;
    function magnify(point) {
      if (!captured || disposed) return;
      clearTimeout(magnifierTimer);
      const ctx = magnifier.getContext('2d'), span = Math.max(60, Math.min(canvas.width,canvas.height)*.12);
      ctx.fillStyle='#020617';ctx.fillRect(0,0,160,160);
      ctx.drawImage(canvas,point.x*canvas.width-span/2,point.y*canvas.height-span/2,span,span,0,0,160,160);
      ctx.strokeStyle='#34d399';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(66,80);ctx.lineTo(94,80);ctx.moveTo(80,66);ctx.lineTo(80,94);ctx.stroke();
      magnifier.style.left=point.x<.5?'auto':'8px';magnifier.style.right=point.x<.5?'8px':'auto';magnifier.hidden=false;
    }
    if (Number.isFinite(options.targetRatio) && options.targetRatio > 0) {
      const option = document.createElement("option");
      option.value = "target";
      option.textContent = "Formato elegido en el mostrador";
      format.prepend(option);
      if(!options.photoMode)format.value='target';
    }
    if (options.photoMode) {
      $(".scan-format").hidden = true;
      $(".scan-filter").hidden = true;
      $(".scan-help").textContent = "Busca luz uniforme, mantén el teléfono quieto y revisa la nitidez. El recorte del retrato se ajusta después en el mostrador.";
    }
    let stableFrames = 0, lastQuad = null;
    const autoCapture = $(".scan-auto input");
    if (options.sourceDataUrl) $(".scan-auto").hidden = true;
    let originalData = options.sourceDataUrl || null, pendingResult = null, savedQuad = null;
    const filters = { color: "none", gray: "grayscale(1)", document: "grayscale(1) contrast(1.25) brightness(1.08)" };
    filter.onchange = () => {
      canvas.style.filter = filters[filter.value] || "none";
    };
    let stream = null, timer = null, revision = 0, disposed = false, captured = null, quad = null, facing = "environment", busy = false, torch = false;
    const btn = (a) => $(`[data-act="${a}"]`);
    function phase(value) {
      dialog.dataset.phase=value;
      dialog.querySelectorAll('[data-phase]').forEach(step=>{if(step.dataset.phase===value)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');});
    }
    let focusBusy = false, focusRequest = 0;
    function fitStage() {
      if(disposed)return;
      dialog.style.setProperty('--scan-height', (root.visualViewport?.height || innerHeight) + 'px');
      dialog.style.setProperty('--scan-top', (root.visualViewport?.offsetTop || 0) + 'px');
      const source = captured ? canvas : video;
      const w = captured ? canvas.width : video.videoWidth, h = captured ? canvas.height : video.videoHeight;
      if(!w || !h)return;
      const area = $('.scan-preview-area');
      const padding = captured ? 48 : 16;
      const scale = Math.min(Math.max(1,area.clientWidth-padding)/w,Math.max(1,area.clientHeight-padding)/h);
      stage.style.width = (w*scale)+'px';
      stage.style.height = (h*scale)+'px';
      stage.style.aspectRatio = w+'/'+h;
      source.style.aspectRatio = w+'/'+h;
      paint();
    }
    const stageObserver = new ResizeObserver(fitStage);
    stageObserver.observe($('.scan-preview-area'));
    settings.addEventListener('toggle',fitStage);
    video.addEventListener('loadedmetadata',fitStage);
    video.addEventListener('resize',fitStage);
    function bounded(promise, milliseconds, message) {
      let timeout;
      return Promise.race([promise,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error(message)),milliseconds);})]).finally(()=>clearTimeout(timeout));
    }
    async function readyFrame(r) {
      const deadline=Date.now()+8000;
      while(!disposed && r===revision && Date.now()<deadline) {
        if(video.readyState>=2 && video.videoWidth>0 && video.videoHeight>0)return;
        await new Promise(resolve=>setTimeout(resolve,80));
      }
      throw Error('La cámara no está entregando imagen.');
    }
    async function requestFocus() {
      const track = stream?.getVideoTracks()[0], r = revision;
      if(!track || focusBusy)return;
      const request = ++focusRequest;
      focusBusy=true;btn('focus').disabled=true;
      let caps={};try{caps=track.getCapabilities?.()||{};}catch{}
      const mode = caps.focusMode?.includes('continuous')?'continuous':caps.focusMode?.includes('single-shot')?'single-shot':null;
      let applied=false;
      try {if(mode)applied=await new Promise(resolve=>{const timeout=setTimeout(()=>resolve(false),1800);Promise.resolve(track.applyConstraints({advanced:[{focusMode:mode}]})).then(()=>{clearTimeout(timeout);resolve(true);},()=>{clearTimeout(timeout);resolve(false);});});}catch{}
      if(disposed || r!==revision || request!==focusRequest)return;
      if(!disposed && r===revision){
        $('.scan-focus-info').textContent=applied?'Enfoque automático solicitado. Revisa que los detalles se vean nítidos.':'Este navegador no permite ajustar el enfoque. Usa Cámara del teléfono para ajustarlo.';
        btn('focus').textContent=applied?'Reintentar enfoque':'Ver ayuda de enfoque';
        stableFrames=0;lastQuad=null;
        root.RealScanDiagnostics?.record('camera.focus',applied?'info':'warning',{supported:!!mode,applied});
      }
      focusBusy=false;if(!disposed)btn('focus').disabled=false;
    }
    function showQuality(a) {
      if(!a)return;
      const light=a.brightness>=55&&a.brightness<=235, sharp=a.sharpness>=35;
      for(const [name,ok,text]of [['light',light,light?'Luz adecuada':a.brightness<55?'Falta luz':'Posibles reflejos'],['sharp',sharp,sharp?'Nitidez estimada adecuada':'Posible desenfoque'],['steady',options.photoMode?sharp:stableFrames>=3,options.photoMode?'Fotografía completa':captured?(quad?'Revisa los bordes propuestos':'Ajusta las esquinas'):!quad?'Busca los cuatro bordes':stableFrames>=3?'Documento estable':'Mantén quieto · '+Math.min(3,stableFrames)+'/3']]){
        const element=$('[data-quality="'+name+'"]');element.textContent=text;element.dataset.ok=String(ok);
      }
    }
    root.addEventListener('resize',fitStage);root.visualViewport?.addEventListener('resize',fitStage);root.visualViewport?.addEventListener('scroll',fitStage);
    function stop() {
      focusRequest++;focusBusy=false;
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
      clearTimeout(magnifierTimer);
      root.removeEventListener('resize',fitStage);root.visualViewport?.removeEventListener('resize',fitStage);root.visualViewport?.removeEventListener('scroll',fitStage);stageObserver.disconnect();
      dialog.close();
      dialog.remove();
      document.documentElement.style.overflow = oldOverflow;
      if (current === controller) current = null;
      root.RealScanDiagnostics?.record("camera.close");
    }
    const controller = { close: finish, suspend() {
      if(disposed || captured)return;
      revision++;stop();busy=false;btn('capture').disabled=true;
      btn('retry').hidden=false;btn('retry').textContent='Reanudar cámara';
      status.textContent='Cámara en pausa. Toca Reanudar cámara para continuar.';
      root.RealScanDiagnostics?.record('camera.suspended');
    } };
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
      const ratio = { card: 85.6 / 53.98, a4: 210 / 297, letter: 215.9 / 279.4, target: options.targetRatio }[format.value];
      const aspect = (video.videoWidth || canvas.width || 4) / (video.videoHeight || canvas.height || 3);
      let w = 0.8, h = ratio ? 0.8 * aspect / ratio : 0.7;
      if (h > 0.8) {
        w *= 0.8 / h;
        h = 0.8;
      }
      const x = (1 - w) / 2, y = (1 - h) / 2;
      poly.setAttribute("points", (quad || [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]).map((p) => `${p.x * 100},${p.y * 100}`).join(" "));
      svg.classList.toggle("scan-found", !!quad);
      const points = quad || [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
      $(".scan-shade").setAttribute("d", "M0 0H100V100H0Z M" + points.map((p) => p.x * 100 + " " + p.y * 100).join("L") + "Z");
      if(quad)handles.querySelectorAll("button").forEach((b, i) => {
        b.style.left = quad[i].x * 100 + "%";
        b.style.top = quad[i].y * 100 + "%";
      });
    }
    format.addEventListener("change", paint);
    function live() {
      if (disposed || captured) return;
      try {
        const a = analyze(video);
        if (a) {
          const rawQuad = options.photoMode ? null : a.quad;
          const motion = rawQuad && lastQuad ? Math.max(...rawQuad.map((p,i)=>Math.hypot(p.x-lastQuad[i].x,p.y-lastQuad[i].y))) : Infinity;
          quad = rawQuad && quad && motion<0.06 ? rawQuad.map((p,i)=>({x:quad[i].x*.55+p.x*.45,y:quad[i].y*.55+p.y*.45})) : rawQuad;
          status.textContent = options.photoMode ? 'Conserva el encuadre del retrato. Revisa luz y nitidez antes de tomar la foto.' : a.coverage>0&&a.coverage<.2?'Acerca el teléfono dejando visibles los cuatro bordes.':a.message;
          const stable = rawQuad && motion<0.012 && a.coverage>=.2 && a.coverage<=.9 && a.brightness > 60 && a.brightness < 235 && a.sharpness >= 35 && !focusBusy;
          stableFrames = stable ? stableFrames + 1 : 0;
          lastQuad = rawQuad?.map((p) => ({ ...p }));
          showQuality(a);
          paint();
          if (autoCapture.checked && !options.photoMode && stableFrames >= 3) {
            status.textContent = "Documento estable. Capturando…";
            take();
            return;
          }
        }
      } catch {
        status.textContent = "Captura y revisa el encuadre antes de usar la foto.";
      }
      timer = setTimeout(live, 650);
    }
    async function start() {
      phase('capture');
      settings.open=false;btn('retry').textContent='Repetir';
      for(const a of ['left','right','reset','confirm','edit'])btn(a).hidden=true;
      $('.scan-format').hidden=!!options.photoMode;
      $('.scan-filter').hidden=!!options.photoMode;
      svg.toggleAttribute('hidden',!!options.photoMode);
      const r = ++revision;
      stop();
      captured = null;
      stableFrames = 0;
      quad = null;
      lastQuad = null;
      $(".scan-auto").hidden = !!options.sourceDataUrl || !!options.photoMode;
      busy = false;
      torch = false;
      btn("torch").textContent = "Linterna";
      canvas.hidden = true;
      handles.hidden = true;
      video.hidden = false;
      for (const a of ["capture", "switch", "native", "focus"]) btn(a).hidden = false;
      for (const a of ["retry", "accept", "original", "torch"]) btn(a).hidden = true;
      btn("capture").disabled = true;
      status.textContent = "Preparando la cámara…";
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Error("unsupported");
        const portrait = innerWidth < innerHeight;
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: portrait ? 1920 : 2560 }, height: { ideal: portrait ? 2560 : 1920 } }, audio: false });
        if (disposed || r !== revision) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        video.srcObject = s;
        video.muted=true;video.playsInline=true;
        await bounded(video.play(),8000,"No se pudo iniciar el visor.");
        await readyFrame(r);
        if (disposed || r !== revision) return;
        const track = s.getVideoTracks()[0];
        let caps = {};
        try {
          caps = track.getCapabilities?.() || {};
        } catch {
        }
        await requestFocus();
        for(const name of ['exposureMode','whiteBalanceMode'])if(caps[name]?.includes('continuous'))Promise.resolve(track.applyConstraints({advanced:[{[name]:'continuous'}]})).catch(()=>{});
        if (disposed || r !== revision) return;
        fitStage();
        stage.style.marginInline = "auto";
        btn("torch").hidden = !caps.torch;
        btn("capture").disabled = false;
        root.RealScanDiagnostics?.record('camera.ready','info',{widthPx:video.videoWidth,heightPx:video.videoHeight});
        live();
      } catch (error) {
        if (disposed || r !== revision) return;
        stop();
        root.RealScanDiagnostics?.record("camera.failed", "warning", {code:error?.name,errorType:error?.name});
        btn('retry').hidden=false;btn('retry').textContent='Reintentar cámara';
        status.textContent = error?.name==='NotAllowedError' ? "No se pudo abrir la cámara. Permite su acceso en Safari o usa «Cámara del teléfono»." : "No se pudo abrir la cámara. Cierra otras aplicaciones que la usen, reintenta o usa «Cámara del teléfono».";
      }
    }
    async function take(supplied = null) {
      if (busy || !supplied && (!video.videoWidth || video.readyState<2 || !stream)) return;
      busy = true;
      btn("capture").disabled = true;
      clearTimeout(timer);
      const r = revision;
      try {
        let photo = null;
        const track = stream?.getVideoTracks()[0];
        if (!supplied && root.ImageCapture && track) try {
          const blob = await bounded(new ImageCapture(track).takePhoto(),3500,"Captura nativa sin respuesta");
          photo = await createImageBitmap(blob);
        } catch {
        }
        if (disposed || r !== revision) {
          photo?.close();
          return;
        }
        const source = supplied || photo || video, sw = source.naturalWidth || source.width || video.videoWidth, sh = source.naturalHeight || source.height || video.videoHeight, scale = Math.min(1, 4096 / Math.max(sw, sh));
        canvas.width = Math.round(sw * scale);
        canvas.height = Math.round(sh * scale);
        canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
        photo?.close();
        $(".scan-auto").hidden = true;
        captured = canvas.toDataURL("image/jpeg", 0.96);
        phase('review');
        settings.open=false;
        if (!originalData) originalData = captured;
        pendingResult = null;
        svg.toggleAttribute('hidden',!!options.photoMode);
        filter.closest("label").hidden = !!options.photoMode;
        for (const action of ["left", "right", "reset"]) btn(action).hidden = false;
        for (const action of ["confirm", "edit"]) btn(action).hidden = true;
        stop();
        video.hidden = true;
        canvas.hidden = false;
        fitStage();
        const a = analyze(canvas);
        root.RealScanDiagnostics?.record('camera.quality','info',{brightness:a?.brightness,sharpness:a?.sharpness,hasEdges:!!a?.quad,widthPx:canvas.width,heightPx:canvas.height});
        showQuality(a);
        quad = options.photoMode ? null : a?.quad;
        if (!quad) quad = [{ x: 0.04, y: 0.04 }, { x: 0.96, y: 0.04 }, { x: 0.96, y: 0.96 }, { x: 0.04, y: 0.96 }];
        status.textContent = options.photoMode ? "Revisa la nitidez. La fotografía se conserva completa." : (a?.quad ? "Bordes propuestos." : "No se detectaron bordes con suficiente confianza.") + " Ajusta las cuatro esquinas o usa la foto completa. " + (a?.sharpness < 35 ? "Puede faltar nitidez; considera repetir." : "");
        for (const a2 of ["capture", "switch", "native", "torch", "focus"]) btn(a2).hidden = true;
        for (const a2 of ["retry", "original"]) btn(a2).hidden = false;
        btn("retry").hidden = !!options.sourceDataUrl;
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
            magnify(quad[i]);
          }
          b.onpointerdown = (e) => {
            e.preventDefault();
            b.setPointerCapture(e.pointerId);
            magnify(quad[i]);
          };
          b.onpointerup = b.onpointercancel = () => { magnifier.hidden=true; };
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
              magnifierTimer=setTimeout(()=>{magnifier.hidden=true;},1200);
            }
          };
          handles.append(b);
        });
        paint();
      } catch {
        status.textContent = "No se pudo tomar la foto. Reintenta o usa la cámara del teléfono.";
        btn("capture").disabled = false;
        stableFrames = 0; lastQuad = null;
        live();
      } finally {
        busy = false;
      }
    }
    async function accept(crop) {
      if (busy || !captured) return;
      magnifier.hidden=true;
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
          let ratio = { card: 85.6 / 53.98, a4: 210 / 297, letter: 215.9 / 279.4, target: options.targetRatio }[format.value];
          if (ratio) {
            if (w > h !== ratio > 1) ratio = 1 / ratio;
            if (w / h > ratio) h = w / ratio;
            else w = h * ratio;
          }
          const limit = Math.min(1, 3508 / Math.max(w, h));
          result = root.RealScanEditor.warpPerspective(image, q, Math.max(1, Math.round(w * limit)), Math.max(1, Math.round(h * limit)));
          if (!result) throw Error("No se pudo enderezar. Ajusta las esquinas o usa la foto completa.");
        }
        if (filter.value !== "color" && !options.photoMode) {
          const image = new Image();
          image.src = result;
          await image.decode();
          if (disposed) return;
          const output = document.createElement("canvas");
          output.width = image.naturalWidth;
          output.height = image.naturalHeight;
          const ctx = output.getContext("2d");
          ctx.filter = filters[filter.value] || "none";
          ctx.drawImage(image, 0, 0);
          result = output.toDataURL("image/jpeg", 0.96);
        }
        if (disposed) return;
        pendingResult = result;
        phase('confirm');
        savedQuad = quad.map((p) => ({ ...p }));
        const preview = new Image();
        preview.src = result;
        await preview.decode();
        if (disposed) return;
        canvas.width = preview.naturalWidth;
        canvas.height = preview.naturalHeight;
        canvas.style.filter = "none";
        canvas.getContext("2d").drawImage(preview, 0, 0);
        fitStage();
        handles.hidden = true;
        svg.setAttribute('hidden','');
        $(".scan-filter").hidden = true;
        $(".scan-format").hidden = true;
        for (const action of ["left", "right", "reset", "retry", "original", "accept"]) btn(action).hidden = true;
        btn("confirm").hidden = btn("edit").hidden = false;
        status.textContent = "Vista previa del resultado. Comprueba que el contenido y sus proporciones sean correctos antes de usarlo.";
        return;
      } catch (e) {
        if (!disposed) status.textContent = e.message;
      } finally {
        busy = false;
        btn("accept").disabled = btn("original").disabled = false;
      }
    }
    btn("close").onclick = finish;
    btn("capture").onclick = () => take();
    btn("focus").onclick = requestFocus;
    async function loadImage(data) {
      const image = new Image();
      image.src = data;
      await image.decode();
      if (!disposed) await take(image);
    }
    btn("confirm").onclick = async () => {
      if (!pendingResult || disposed) return;
      const result = pendingResult;
      root.RealScanDiagnostics?.record("camera.corrected");
      finish();
      try {
        await options.onAccept?.(result);
      } catch (e) {
        options.onError?.(e);
      }
    };
    btn("edit").onclick = async () => {
      const points = savedQuad;
      $(".scan-format").hidden = !!options.photoMode;
      await loadImage(captured);
      if (points) {
        quad = points;
        paint();
      }
      canvas.style.filter = filters[filter.value] || "none";
    };
    btn("reset").onclick = async () => {
      filter.value = "color";
      canvas.style.filter = "none";
      await loadImage(originalData);
    };
    async function rotate(direction) {
      if (busy || !captured) return;
      const image = new Image();
      image.src = captured;
      await image.decode();
      if (disposed) return;
      const output = document.createElement("canvas");
      output.width = image.naturalHeight;
      output.height = image.naturalWidth;
      const ctx = output.getContext("2d");
      ctx.translate(output.width / 2, output.height / 2);
      ctx.rotate(direction * Math.PI / 2);
      ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
      await take(output);
    }
    btn("left").onclick = () => rotate(-1);
    btn("right").onclick = () => rotate(1);
    btn("retry").onclick = () => {
      originalData = null;
      canvas.style.filter = "none";
      filter.value = "color";
      start();
    };
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
    fitStage();
    if (options.sourceDataUrl) {
      btn("capture").hidden = btn("switch").hidden = btn("native").hidden = btn("focus").hidden = true;
      loadImage(options.sourceDataUrl).catch(() => {
        status.textContent = "No se pudo abrir la imagen. Cierra y selecciona otra.";
      });
    } else start();
    return controller;
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) current?.suspend();
  });
  root.addEventListener("pagehide", close);
  root.RealScanCapture = { open, close, analyze, validQuad };
})(window);
