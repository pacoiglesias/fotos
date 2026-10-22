(async function() {
  "use strict";
  const $ = (id) => document.getElementById(id), queue = [];
  let busy = false;
  function render() {
    $("localQueue").replaceChildren();
    queue.forEach((file, index) => {
      const row = document.createElement("li");
      row.textContent = file.name + " · " + Math.round(file.size / 1024) + " KB ";
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "Quitar";
      b.disabled = busy;
      b.onclick = () => {
        queue.splice(index, 1);
        render();
      };
      row.append(b);
      $("localQueue").append(row);
    });
    $("localSendFiles").disabled = busy || !queue.length || !RealScanP2P.connected();
    $("localFiles").disabled = $("localScanDocument").disabled = busy || queue.length >= 8;
  }
  async function prepare(file) {
    if (queue.length >= 8) throw Error("Hasta 8 archivos por conexión.");
    if (file.size > 30 * 1024 * 1024) throw Error("Selecciona archivos de hasta 30 MB.");
    let dataUrl, type = file.type, name = file.name;
    if (type === "application/pdf") {
      dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    } else {
      const image = await createImageBitmap(file);
      if (image.width * image.height > 6e7) {
        image.close();
        throw Error("La imagen supera 60 megapíxeles.");
      }
      const canvas = document.createElement("canvas"), scale = Math.min(1, 3e3 / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      dataUrl = canvas.toDataURL("image/jpeg", 0.94);
      type = "image/jpeg";
      name = name.replace(/\.[^.]*$/, "") + ".jpg";
    }
    const size = Math.floor(dataUrl.split(",")[1].length * 0.75);
    if (size > 6 * 1024 * 1024) throw Error("El archivo supera 6 MB después de prepararlo. Reduce su tamaño.");
    queue.push({ name, type, dataUrl, size });
    render();
  }
  $("localFiles").onchange = async function() {
    const files = Array.from(this.files);
    this.value = "";
    busy = true;
    render();
    try {
      for (const f of files) await prepare(f);
    } catch (e) {
      $("localTransferStatus").textContent = e.message;
    } finally {
      busy = false;
      render();
    }
  };
  $("localScanDocument").onclick = () => RealScanCapture.open({ onNative: () => $("localFiles").click(), onAccept: async (result) => {
    try {
      const blob = await (await fetch(result)).blob();
      await prepare(new File([blob], "Escaneo_local.jpg", { type: "image/jpeg" }));
    } catch (e) {
      $("localTransferStatus").textContent = e.message;
    }
  } });
  $("localSendFiles").onclick = async () => {
    if (busy) return;
    busy = true;
    render();
    try {
      while (queue.length) {
        $("localTransferStatus").textContent = "Enviando directamente y esperando confirmación…";
        await RealScanP2P.send(queue[0]);
        queue.shift();
        render();
      }
      $("localTransferStatus").textContent = "Recepción confirmada por el mostrador.";
    } catch (e) {
      $("localTransferStatus").textContent = e.message;
    } finally {
      busy = false;
      render();
    }
  };
  $("localPhoneDisconnect").onclick = () => {
    RealScanP2P.close();
    render();
  };
  $("copyLocalAnswer").onclick = async () => {
    try {
      await navigator.clipboard.writeText($("localPhoneAnswer").value);
    } catch {
      $("localPhoneAnswer").select();
    }
  };
  $("prepareLocalOffline").onclick = async () => {
    try {
      await navigator.serviceWorker.register("sw.js");
      await navigator.serviceWorker.ready;
      $("localPreparedStatus").textContent = "Recursos preparados en este navegador. Conserva la aplicación y úsala antes de perder internet.";
    } catch {
      $("localPreparedStatus").textContent = "Se necesita conexión para preparar este navegador por primera vez.";
    }
  };
  try {
    const offer = new URLSearchParams(location.hash.slice(1)).get("o");
    if (!offer) throw Error("Abre el QR local del mostrador.");
    const answer = await RealScanP2P.answer(offer);
    $("localPhoneAnswer").value = answer;
    RealScanP2P.qr(answer, $("localAnswerQr"));
    $("localTransferStatus").textContent = "Muestra este QR al mostrador para conectar.";
  } catch (e) {
    $("localTransferStatus").textContent = e.message;
  }
  setInterval(render, 1e3);
  render();
})();
