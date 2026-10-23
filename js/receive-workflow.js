(function(root) {
  "use strict";
  function button(label, action) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "px-2 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold";
    b.textContent = label;
    b.onclick = action;
    return b;
  }
  function render() {
    const api = root.RealScanQrSync, list = document.getElementById("qrInboxList");
    if (!api || !list) return;
    const files = api.getInboxFiles();
    document.getElementById("inboxCountBadge").textContent = files.length;
    list.replaceChildren();
    if (!files.length) {
      const p = document.createElement("p");
      p.className = "text-xs text-center text-slate-500 py-6";
      p.textContent = "Esperando archivos. Puedes cerrar la ventana y volver a la misma sesión.";
      list.append(p);
      return;
    }
    for (const file of files) {
      const card = document.createElement("article");
      card.className = "p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-2";
      const title = document.createElement("strong");
      title.className = "block text-xs break-all";
      title.textContent = file.name;
      card.append(title);
      const info = document.createElement("p");
      info.className = "text-xs text-slate-500";
      info.textContent = Math.round(file.size / 1024) + " KB · " + (file.assigning ? "Asignando…" : file.assignedTo ? "Asignado: " + { front: "Frente", back: "Reverso", page3: "Página 3", page4: "Página 4" }[file.assignedTo] : "Pendiente") + (file.editedDataUrl ? " · Con ajuste reversible" : " · Original");
      card.append(info);
      if (file.type.startsWith("image/")) {
        const thumb = button("Revisar y ajustar", () => api.editReceivedFile(file.id)), image = document.createElement("img");
        image.src = file.editedDataUrl || file.dataUrl;
        image.alt = "Vista previa de " + file.name;
        image.style.cssText = "width:100%;height:100px;object-fit:contain;display:block;margin-bottom:6px";
        thumb.prepend(image);
        thumb.style.width = "100%";
        card.append(thumb);
      }
      const actions = document.createElement("div");
      actions.className = "flex flex-wrap gap-2";
      const photos=root.state?.activeCategory==='photos';
      const used=new Set(root.RealScanLayout.computeDocumentLayout(root.state).pages.flatMap(page=>page.placements.map(piece=>piece.slot)));
      const documentJob=root.RealScanDocuments?.status().active;
      if(documentJob){const add=button(file.documentAddedJob===(root.state._jobRevision||0)?'Ya añadido al documento':'Añadir páginas al documento',()=>root.RealScanDocuments.fromInbox(file));add.disabled=!!file.assigning||!!root.RealScanDocuments.status().busy||file.documentAddedJob===(root.state._jobRevision||0);actions.append(add);}
      const destinations=documentJob?[]:photos ? [['front',root.state.mixTwoPhotos?'Persona A':'Usar fotografía'],['back','Persona B']].filter(([side])=>used.has(side)) : [['front','Frente'],['back',used.has('back')?'Reverso':'Añadir reverso'],['page3',used.has('page3')?'Página 3':'Añadir página 3'],['page4',used.has('page4')?'Página 4':'Añadir página 4']];
      for (const [side, label] of destinations) {
        const b = button(label, () => {if(!photos&&side==='back'&&!used.has(side))root.setDocumentPages(2);return api.assignFileToSlot(file.id, side,{review:true});});
        b.dataset.assignFile = file.id;
        b.dataset.slot = side;
        b.disabled = !!file.assigning;
        actions.append(b);
      }
      if(!documentJob&&photos&&!root.state.mixTwoPhotos)actions.append(button('Añadir segunda persona',()=>{root.state.photoCopiesPersonA=Math.max(1,Math.ceil(root.state.photoCopies/2));root.state.photoCopiesPersonB=Math.max(1,Math.floor(root.state.photoCopies/2));root.setMixTwoPhotos(true);}));
      actions.append(button("Descargar archivo recibido", () => api.downloadOriginal(file.id)));
      if (file.editedDataUrl) actions.append(button("Restaurar original", () => api.restoreReceivedFile(file.id)));
      actions.append(button("Quitar de bandeja", () => api.removeReceivedFile(file.id)));
      card.append(actions);
      list.append(card);
    }
    if (typeof setDraftStatus === "function" && root.state?._draftStatus) setDraftStatus(root.state._draftStatus);
  }
  root.RealScanReceiveUI = { render };
  setInterval(() => {
    const session = root.RealScanQrSync?.getActiveReceiveSession();
    if (!session) return;
    const label = document.getElementById("receiveSessionRemaining");
    if (label) {
      const seconds = Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1e3));
      label.textContent = session.status === "revoked" ? "Sesión cerrada" : seconds ? Math.ceil(seconds / 60) + " min restantes" : "QR caducado: renueva para recibir más archivos";
    }
  }, 1e4);
})(window);
