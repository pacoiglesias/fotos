(function(root) {
  "use strict";
  let connection;
  function open() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(new Error("Almacenamiento de borradores no disponible."));
      const request = indexedDB.open("realscan_recovery_v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("drafts");
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        connection = null;
        reject(request.error);
      };
      request.onblocked = () => {
        connection = null;
        reject(new Error("Cierra las otras pestañas para preparar la recuperación."));
      };
    });
    return connection;
  }
  async function transaction(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("drafts", mode), request = action(tx.objectStore("drafts"));
      tx.oncomplete = () => resolve(request?.result);
      tx.onabort = tx.onerror = () => reject(tx.error || request?.error || new Error("No se pudo guardar el borrador."));
    });
  }
  function pack(draft) {
    const copy = { ...draft, images: {} }, assets = [], lookup = /* @__PURE__ */ new Map();
    for (const [side, image] of Object.entries(draft.images || {})) {
      copy.images[side] = { ...image };
      for (const key of ["rawOriginalSrc", "originalSrc", "croppedSrc", "processedDataUrl"]) {
        const value = image[key];
        if (typeof value !== "string" || !value.startsWith("data:")) continue;
        if (!lookup.has(value)) {
          lookup.set(value, assets.length);
          assets.push(value);
        }
        copy.images[side][key] = { asset: lookup.get(value) };
      }
    }
    return { schema: 1, draft: copy, assets };
  }
  function unpack(record) {
    if (!record || record.schema !== 1 || !record.draft || !Array.isArray(record.assets)) return null;
    const draft = { ...record.draft, images: {} };
    for (const [side, image] of Object.entries(record.draft.images || {})) {
      draft.images[side] = { ...image };
      for (const key of ["rawOriginalSrc", "originalSrc", "croppedSrc", "processedDataUrl"]) {
        const value = image[key];
        if (value && typeof value === "object" && Number.isInteger(value.asset)) draft.images[side][key] = record.assets[value.asset] || null;
      }
    }
    return draft;
  }
  root.RealScanDraftStore = { read: async () => unpack(await transaction("readonly", (s) => s.get("active"))), write: (d) => transaction("readwrite", (s) => s.put(pack(d), "active")), remove: () => transaction("readwrite", (s) => s.delete("active")) };
})(window);
