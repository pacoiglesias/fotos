(function(root) {
  "use strict";
  function bytes(data) {
    return Math.floor(data.split(",")[1].length * 0.75) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
  }
  root.getDeliveryByteLimit = () => {
    const n = Number(document.getElementById("selectDeliveryMaxBytes")?.value) || 0;
    return n ? Math.max(1, n - 1) : 0;
  };
  const original = root.createDigitalFile;
  root.createDigitalFile = async function(side, format, maxPx, maxBytes = getDeliveryByteLimit()) {
    const first = await original(side, format, maxPx);
    first.size = bytes(first.dataUrl);
    const policy = getActiveSpec().digital, cap = Math.min(maxBytes || Infinity, policy?.maxBytes || Infinity);
    if (first.size <= cap) return first;
    if (format === "png") throw Error("El PNG supera el peso elegido. Elige JPG para comprimir o aumenta el límite; no se cambiará el formato automáticamente.");
    if (format === "pdf") {
      let limit = maxPx === "original" ? Math.max(state.images[side].naturalWidth, state.images[side].naturalHeight) : Number(maxPx);
      for (let attempt = 0; attempt < 12; attempt++) {
        limit = Math.floor(limit * 0.85);
        if (limit < 600) break;
        const file = await original(side, format, String(limit));
        file.size = bytes(file.dataUrl);
        if (file.size <= cap) return file;
      }
      throw Error("No se pudo reducir este PDF al peso elegido conservando resolución suficiente. Aumenta el límite o entrega una imagen JPG.");
    }
    const image = new Image();
    image.src = first.dataUrl;
    await image.decode();
    const canvas = document.createElement("canvas"), min = policy?.minPixels || 300;
    for (let factor = 1; factor > 0.1; factor *= 0.85) {
      canvas.width = Math.floor(image.naturalWidth * factor);
      canvas.height = Math.floor(image.naturalHeight * factor);
      if (Math.min(canvas.width, canvas.height) < min) break;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55]) {
        const dataUrl = canvas.toDataURL("image/jpeg", quality), size = bytes(dataUrl);
        if (size <= cap) return { ...first, dataUrl, size };
      }
    }
    throw Error("No se pudo cumplir el peso sin reducir demasiado la resolución. Elige un límite mayor. El original se conserva.");
  };
  root.shareDeliveryWhatsapp = function() {
    const session = root.RealScanQrSync?.getActiveDeliverySession();
    if (!session || session.status === "revoked" || Date.now() >= session.expiresAt) {
      showToast("Genera una entrega vigente antes de compartir.", "warning");
      return;
    }
    root.open("https://wa.me/?text=" + encodeURIComponent("Tu entrega de RealScan está lista. Descarga tus archivos antes de que caduque el enlace: " + session.url), "_blank", "noopener,noreferrer");
  };
  document.addEventListener("DOMContentLoaded", () => document.getElementById("btnShareDeliveryWhatsapp")?.addEventListener("click", shareDeliveryWhatsapp));
})(window);
