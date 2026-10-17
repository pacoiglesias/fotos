/* Temporary authenticated transfers; no documents in localStorage. */
(function (global) {
  "use strict";
  let receive = null,
    delivery = null,
    inbox = [];
  const notify = () => global.updateQrInboxUI?.();
  const api = {
    async createReceiveSession() {
      await global.state?._jobSwitchCleanup;
      const revision = global.state?._jobRevision || 0;
      inbox = [];
      notify();
      receive = await global.RealScanRelay.create("receive", [], (file) => {
        if ((global.state?._jobRevision || 0) !== revision)
          throw Error("El trabajo cambió. Genera otro QR.");
        return api.addReceivedFile(file);
      });
      // A presentation hint only; the secret and all server authorization remain unchanged.
      if(typeof receive?.url==='string'){
        try {const url=new URL(receive.url,location.href),hint=new URLSearchParams(url.hash.slice(1));hint.set('mode',global.state?.activeCategory==='photos'?'photo':'document');url.hash=hint.toString();receive.url=url.href;}catch{}
      }
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
      inbox = [];
      notify();
      await global.RealScanRelay.clearFiles("receive");
    },
    async assignFileToSlot(id, side) {
      if (!["front", "back", "page3", "page4"].includes(side)) return false;
      if(global.state?.activeCategory==='photos') {
        const used=new Set(global.RealScanLayout.computeDocumentLayout(global.state).pages.flatMap(page=>page.placements.map(piece=>piece.slot)));
        if(!used.has(side)){global.showToast?.('Ese destino no forma parte de la planilla. Activa la segunda persona y sus copias si la necesitas.','warning');return false;}
      }
      const file = inbox.find((x) => x.id === id);
      if (!file) return false;
      if(file.assigning)return false;
      if(global.state?.images?.[side]?.originalSrc && !confirm('Esta cara ya tiene una imagen. ¿Quieres sustituirla?'))return false;
      if(['page3','page4'].includes(side)&&typeof setDocumentPages==='function')setDocumentPages(Math.max(global.state?.documentPageCount||2,side==='page4'?4:3));
      file.assigning=true;notify();
      try {
        const result = await global.handleLoadedFile(
          side,
          file.editedDataUrl || file.dataUrl,
          file.name,
          (actualSide) => {
            file.assignedTo = actualSide;
            notify();
          },
          {preserveFrame:true},
        );
        if(result?.cancelled || result?.loaded===false)return false;
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
      } finally {file.assigning=false;notify();}
    },
    editReceivedFile(id) {
      const file=inbox.find(f=>f.id===id);if(!file||file.type==='application/pdf')return;
      const revision=global.state?._jobRevision||0;
      global.RealScanCapture.open({sourceDataUrl:file.dataUrl,photoMode:global.state?.activeCategory==='photos',onAccept:result=>{if((global.state?._jobRevision||0)!==revision||!inbox.includes(file))return;file.editedDataUrl=result;file.assignedTo=null;notify();}});
    },
    restoreReceivedFile(id) {const file=inbox.find(f=>f.id===id);if(file){file.editedDataUrl=null;file.assignedTo=null;notify();}},
    removeReceivedFile(id) {if(!confirm('¿Quitar este archivo de la bandeja? Las caras ya asignadas se conservan.'))return;inbox=inbox.filter(f=>f.id!==id);notify();},
    downloadOriginal(id) {const file=inbox.find(f=>f.id===id);if(!file)return;const a=document.createElement('a');a.href=file.dataUrl;a.download=file.name;document.body.append(a);a.click();a.remove();},
    async createDeliverySession(files, config) {
      await global.state?._jobSwitchCleanup;
      delivery = await global.RealScanRelay.create("delivery", files);
      delivery.files = files;
      delivery.config = config;
      delivery.jobRevision = global.state?._jobRevision || 0;
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
