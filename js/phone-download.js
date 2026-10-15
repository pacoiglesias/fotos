(async function () {
  "use strict";
  const list = document.getElementById("deliveryFilesList");
  let urls = [];
  function clear() {
    urls.forEach(URL.revokeObjectURL);
    urls = [];
    list.replaceChildren();
  }
  function fail() {
    clear();
    const p = document.createElement("p");
    p.textContent =
      "La entrega no está disponible o ha caducado. Solicita un QR nuevo al operador.";
    p.setAttribute("role", "alert");
    list.append(p);
  }
  try {
    await RealScanRelay.watchDelivery((files) => {
      clear();
      for (const f of files) {
        const bytes = Uint8Array.from(atob(f.dataUrl.split(",")[1]), (c) =>
            c.charCodeAt(0),
          ),
          url = URL.createObjectURL(new Blob([bytes], { type: f.type }));
        urls.push(url);
        const row = document.createElement("div");
        row.className =
          "flex justify-between items-center gap-2 p-3 rounded-xl bg-slate-50 text-xs";
        const name = document.createElement("span");
        name.textContent = f.name;
        const a = document.createElement("a");
        a.href = url;
        a.download = f.name.replace(/[\\/\u0000-\u001f]/g, "_");
        a.textContent = "Descargar";
        a.className = "px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold";
        row.append(name, a);
        list.append(row);
      }
      document.getElementById("labelDeliveryId").textContent = "Entrega activa";
    }, fail);
  } catch (e) {
    fail();
  }
  addEventListener("pagehide", clear, { once: true });
})();
