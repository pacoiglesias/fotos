(function(root) {
  "use strict";
  let camera = null, timer = null;
  function stopCamera() {
    clearTimeout(timer);
    camera?.getTracks().forEach((t) => t.stop());
    camera = null;
    const video = document.getElementById("localAnswerVideo");
    if (video) {
      video.srcObject = null;
      video.hidden = true;
    }
  }
  async function open() {
    let modal = document.getElementById("localTransferModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "localTransferModal";
      modal.className = "hidden fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "localTransferTitle");
      modal.innerHTML = '<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-5 max-w-xl w-full space-y-3 max-h-[90vh] overflow-y-auto"><h2 id="localTransferTitle" class="font-bold text-lg">Recibir por Wi-Fi local · P2P</h2><p class="text-xs">Ambos equipos deben estar en la misma red y tener las páginas preparadas o abiertas antes de perder internet. El Wi-Fi debe permitir conexión entre clientes. No necesita Firebase ni servidores para enviar las imágenes.</p><p class="text-xs">1. El móvil abre este QR. 2. El móvil muestra un QR de respuesta. 3. Escanéalo aquí con la cámara del mostrador o pega el código de respuesta. Si este equipo no tiene cámara, necesitarás otro medio local para copiar la respuesta.</p><canvas id="localOfferQr" style="max-width:100%;width:280px;height:auto;margin:auto;background:white"></canvas><p id="localTransferStatus" role="status" class="text-xs">Preparando…</p><textarea id="localAnswerCode" aria-label="Código de respuesta del teléfono" rows="2" class="w-full p-2 border rounded bg-white dark:bg-slate-800" placeholder="Respuesta RSP1…"></textarea><div class="flex gap-2 flex-wrap"><button type="button" id="localAcceptAnswer" class="px-3 py-2 rounded bg-indigo-600 text-white">Conectar respuesta</button><button type="button" id="localScanAnswer" class="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700">Leer QR de respuesta con cámara</button><button type="button" id="localRenew" class="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700">Nuevo emparejamiento</button><button type="button" id="localDisconnect" class="px-3 py-2 rounded bg-red-700 text-white">Desconectar</button><button type="button" data-close-modal="localTransferModal" class="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700">Volver al trabajo</button></div><video id="localAnswerVideo" autoplay playsinline muted hidden style="width:100%;max-height:260px;object-fit:contain"></video><p class="text-xs">Los archivos llegan a la misma bandeja de recepción. Emparejamiento válido durante 15 minutos. Cerrar esta ventana conserva la conexión; «Desconectar» la termina.</p></div>';
      document.body.append(modal);
      document.getElementById("localAcceptAnswer").onclick = accept;
      document.getElementById("localScanAnswer").onclick = scan;
      document.getElementById("localRenew").onclick = create;
      document.getElementById("localDisconnect").onclick = () => {
        stopCamera();
        RealScanP2P.close();
      };
    }
    openModal("localTransferModal");
    if (!RealScanP2P.connected()) await create();
  }
  async function create() {
    stopCamera();
    const revision = state._jobRevision || 0;
    try {
      const code = await RealScanP2P.offer((file) => {
        if ((state._jobRevision || 0) !== revision) throw Error("El trabajo cambió.");
        return RealScanQrSync.addReceivedFile(file);
      });
      const url = new URL("phone-local.html", location.href);
      url.hash = "o=" + code;
      RealScanP2P.qr(url.href, document.getElementById("localOfferQr"));
      document.getElementById("localTransferStatus").textContent = "QR listo. Abre el móvil y devuelve su QR de respuesta.";
      root.__localOfferUrl = url.href;
    } catch {
      document.getElementById("localTransferStatus").textContent = "No se pudo preparar P2P. Comprueba que el navegador admita WebRTC y reintenta.";
    }
  }
  async function accept() {
    try {
      await RealScanP2P.accept(document.getElementById("localAnswerCode").value);
      stopCamera();
    } catch (e) {
      document.getElementById("localTransferStatus").textContent = e.message;
    }
  }
  async function scan() {
    stopCamera();
    if (typeof window.jsQR !== "function") {
      const loaded = window.ensureJsQR ? await window.ensureJsQR() : false;
      if (!loaded) {
        document.getElementById("localTransferStatus").textContent = "No se pudo cargar el lector de códigos QR. Comprueba la conexión la primera vez o pega el código de respuesta.";
        return;
      }
    }
    try {
      let read = function() {
        if (!camera) return;
        if (document.getElementById("localTransferModal").classList.contains("hidden")) {
          stopCamera();
          return;
        }
        if (video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(video, 0, 0);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height), qr = jsQR(image.data, canvas.width, canvas.height);
          if (qr) {
            document.getElementById("localAnswerCode").value = qr.data;
            accept();
            return;
          }
        }
        timer = setTimeout(read, 200);
      };
      camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 800 } }, audio: false });
      const video = document.getElementById("localAnswerVideo");
      video.hidden = false;
      video.srcObject = camera;
      await video.play();
      const canvas = document.createElement("canvas");
      read();
    } catch {
      stopCamera();
      document.getElementById("localTransferStatus").textContent = "No se pudo abrir la cámara. Permite el acceso o pega el código de respuesta.";
    }
  }
  root.RealScanLocalTransfer = { open, stopCamera };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopCamera();
  });
})(window);
