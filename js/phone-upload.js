(async function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    queue = [];
  let sending = false, sessionReady = false, preparing = false;
  const status = document.createElement("p");
  status.id = "transferStatus";
  status.setAttribute("role", "status");
  status.className = "text-xs text-center text-slate-600";
  $("btnSendFiles").after(status);
  function report(message, error = false) {
    status.textContent = message;
    status.classList.toggle("text-red-600", error);
  }
  function render() {
    $("selectedFilesContainer").classList.toggle("hidden", !queue.length);
    $("filesCount").textContent = queue.length;
    $("btnSendFiles").disabled = !sessionReady || sending || preparing || !queue.length;
    $("btnSmartScan").disabled = !sessionReady || sending || preparing;
    $("fileInput").disabled = $("cameraInput").disabled = !sessionReady || sending || preparing;
    $("thumbnailsList").replaceChildren();
    queue.forEach((f, index) => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between gap-2 p-2 text-xs";
      const name = document.createElement("span");
      name.textContent = f.name + " · " + Math.round(f.size / 1024) + " KB";
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "Quitar";
      b.disabled = sending || preparing;
      b.onclick = () => {
        queue.splice(index, 1);
        render();
      };
      if (f.type.startsWith('image/')) {
        const thumb = document.createElement('img');
        thumb.src = f.dataUrl; thumb.alt = 'Vista previa del archivo '+(index+1);
        thumb.width = 56; thumb.height = 52;
        thumb.style.cssText = 'width:56px;height:52px;object-fit:contain;border-radius:8px;background:#e2e8f0;flex-shrink:0';
        row.append(thumb);
      }
      row.append(name, b);
      $("thumbnailsList").append(row);
    });
  }
  async function prepare(file) {
    if (file.size <= 0 || file.size > 30 * 1024 * 1024)
      throw Error("Elige un archivo de hasta 30 MB.");
    let type = file.type,
      dataUrl,
      name = file.name;
    if (type === "application/pdf" || /\.pdf$/i.test(name)) {
      type = "application/pdf";
      dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(Error("No se pudo leer el PDF."));
        r.readAsDataURL(new Blob([file], { type }));
      });
    } else {
      const image = await createImageBitmap(file).catch(() => {
        throw Error(
          "No se pudo abrir la imagen. Si es HEIC, expórtala como JPG.",
        );
      });
      if (image.width * image.height > 60000000) {
        image.close();
        throw Error("La imagen supera 60 megapíxeles. Reduce su resolución.");
      }
      const scale = Math.min(1, 3000 / Math.max(image.width, image.height)),
        c = document.createElement("canvas");
      c.width = Math.round(image.width * scale);
      c.height = Math.round(image.height * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(image, 0, 0, c.width, c.height);
      image.close();
      type = "image/jpeg";
      name = name.replace(/\.[^.]*$/, "") + ".jpg";
      dataUrl = c.toDataURL(type, 0.94);
    }
    const f = {
      name: name.slice(0, 180),
      type,
      dataUrl,
      size: Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75),
    };
    RealScanRelay.validate(f);
    return f;
  }
  async function choose(files) {
    if (sending || preparing || !sessionReady) return;
    preparing = true; render();
    try {
      for (const f of files) {
        if (queue.length >= 8)
          throw Error("Puedes enviar hasta 8 archivos por sesión.");
        queue.push(await prepare(f));
      }
      report(
        "Listo para enviar. Las fotos se orientan y se eliminan sus metadatos de ubicación.",
      );
    } catch (e) {
      report(e.message, true);
    }
    preparing = false; render();
  }
  $("btnSmartScan").onclick = () => {
    if (!sessionReady || sending || preparing) return;
    RealScanCapture.open({onNative: () => $("cameraInput").click(), onAccept: async dataUrl => {
      const blob = await (await fetch(dataUrl)).blob();
      await choose([new File([blob], "Escaneo.jpg", {type: "image/jpeg"})]);
    }});
  };
  for (const id of ["fileInput", "cameraInput"])
    $(id).addEventListener("change", function () {
      choose(Array.from(this.files));
      this.value = "";
    });
  $("btnClearFiles").onclick = () => {
    if (!sending && !preparing) {
      queue.length = 0;
      render();
    }
  };
  $("btnSendMore").onclick = () => {
    $("successBox").classList.add("hidden");
    render();
  };
  $("btnSendFiles").onclick = async () => {
    if (!sessionReady || sending || preparing || !queue.length) return;
    sending = true;
    render();
    $("successBox").classList.add("hidden");
    $("progressContainer").classList.remove("hidden");
    const total = queue.length;
    let sent = 0;
    try {
      while (queue.length) {
        report("Esperando confirmación del mostrador…");
        await RealScanRelay.send(queue[0]);
        queue.shift();
        sent++;
        const pct = Math.round((sent / total) * 100);
        $("progressBar").style.width = pct + "%";
        $("progressPercent").textContent = pct + "%";
      }
      report("Recepción confirmada por el mostrador.");
      $("successBox").classList.remove("hidden");
    } catch (e) {
      report(
        e.message ||
          "No se confirmó el envío. Reintenta con el mostrador abierto.",
        true,
      );
    } finally {
      sending = false;
      $("progressContainer").classList.add("hidden");
      render();
    }
  };
  render();
  try {
    const s = await RealScanRelay.readSession("receive");
    sessionReady = true; render();
    $("labelSessionId").textContent = "RS-" + s.token.slice(0, 8).toUpperCase();
    report("Sesión activa durante 15 minutos. Mantén abierto el mostrador.");
  } catch (e) {
    report(
      "No se pudo abrir esta sesión. Solicita un QR nuevo al operador.",
      true,
    );
    $("btnSendFiles").disabled = true;
    $("fileInput").disabled = true;
    $("cameraInput").disabled = true;
  }
})();
