/* Temporary authenticated transfers; no documents in localStorage. */
(function (global) {
  "use strict";
  let receive = null,
    delivery = null,
    inbox = [];
  const notify = () => global.updateQrInboxUI?.();
  const api = {
    async createReceiveSession() {
      const revision = global.state?._jobRevision || 0;
      inbox = [];
      notify();
      receive = await global.RealScanRelay.create("receive", [], (file) => {
        if ((global.state?._jobRevision || 0) !== revision)
          throw Error("El trabajo cambió. Genera otro QR.");
        return api.addReceivedFile(file);
      });
      return receive;
    },
    getActiveReceiveSession() {
      if (receive && Date.now() >= receive.expiresAt)
        receive.status = "expired";
      return receive;
    },
    async revokeReceiveSession() {
      if (receive) receive.status = "revoked";
      await global.RealScanRelay.revoke("receive");
    },
    addReceivedFile(file) {
      global.RealScanRelay.validate(file);
      const old = inbox.find((x) => x.id === file.id);
      if (old) return old;
      if (inbox.length >= 8) throw Error("La bandeja admite hasta 8 archivos.");
      const item = {
        ...file,
        sizeKb: Math.round(file.size / 1024),
        receivedAt: new Date().toLocaleTimeString(),
        assignedTo: null,
      };
      inbox.push(item);
      notify();
      global.showToast?.("Archivo recibido: " + item.name, "success");
      return item;
    },
    getInboxFiles() {
      return inbox.slice();
    },
    async clearInbox() {
      await global.RealScanRelay.clearFiles("receive");
      inbox = [];
      notify();
    },
    async assignFileToSlot(id, side) {
      if (!["front", "back", "page3", "page4"].includes(side)) return false;
      const file = inbox.find((x) => x.id === id);
      if (!file) return false;
      try {
        const result = await global.handleLoadedFile(
          side,
          file.dataUrl,
          file.name,
          (actualSide) => {
            file.assignedTo = actualSide;
            notify();
          },
        );
        if (result?.pendingSelection)
          global.showToast?.(
            "Selecciona la página del PDF y su destino.",
            "info",
          );
        else global.showToast?.("Archivo procesado: " + file.name, "success");
        return true;
      } catch (e) {
        global.showToast?.(e.message, "error");
        return false;
      }
    },
    async createDeliverySession(files, config) {
      delivery = await global.RealScanRelay.create("delivery", files);
      delivery.files = files;
      delivery.config = config;
      return delivery;
    },
    getActiveDeliverySession() {
      if (delivery && Date.now() >= delivery.expiresAt)
        delivery.status = "expired";
      return delivery;
    },
    async revokeDeliverySession() {
      if (delivery) delivery.status = "revoked";
      await global.RealScanRelay.revoke("delivery");
    },
    renderQrToCanvas(text, canvas, moduleSize = 6) {
      if (!canvas || typeof global.qrcode !== "function")
        throw Error("No se pudo cargar el generador QR.");
      const qr = global.qrcode(0, "M");
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount(),
        margin = 4;
      canvas.width = canvas.height = (n + margin * 2) * moduleSize;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000";
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if (qr.isDark(r, c))
            ctx.fillRect(
              (c + margin) * moduleSize,
              (r + margin) * moduleSize,
              moduleSize,
              moduleSize,
            );
    },
  };
  global.RealScanQrSync = api;
})(window);
