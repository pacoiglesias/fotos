(function(root) {
  "use strict";
  let pc = null, channel = null, identity = null, expiresAt = 0, onFile = null, received = 0, pending = null, incoming = null, expiry = null;
  const MAX = 8388700, CHUNK = 24e3, report = (text) => {
    const el = document.getElementById("localTransferStatus");
    if (el) el.textContent = text;
  };
  function close() {
    clearTimeout(expiry);
    if(pending)clearTimeout(pending.timer);
    pending?.reject(new Error("Conexión cerrada."));
    pending = null;
    incoming = null;
    channel?.close();
    pc?.close();
    channel = pc = null;
    report("Conexión local cerrada. Los archivos ya recibidos se conservan.");
  }
  async function encode(value) {
    const stream = new Blob([JSON.stringify(value)]).stream().pipeThrough(new CompressionStream("deflate")), data = new Uint8Array(await new Response(stream).arrayBuffer());
    return "RSP1." + btoa(String.fromCharCode(...data)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  }
  async function decode(value) {
    value = String(value).trim();
    if (value.includes("#o=")) value = new URL(value).hash.slice(3);
    if (!/^RSP1\.[A-Za-z0-9_-]{30,12000}$/.test(value)) throw Error("Código local inválido.");
    const bytes = Uint8Array.from(atob(value.slice(5).replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0)), reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate")).getReader();
    let size = 0, chunks = [];
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > 2e4) {
        await reader.cancel();
        throw Error("Código demasiado grande.");
      }
      chunks.push(r.value);
    }
    const result = JSON.parse(await new Blob(chunks).text());
    if (!/^[a-f0-9]{32}$/.test(result.id) || !["offer", "answer"].includes(result.type) || typeof result.sdp !== "string" || result.sdp.length > 18e3 || !Number.isFinite(result.expiresAt) || result.expiresAt < Date.now() || result.expiresAt > Date.now() + 16 * 6e4) throw Error("Código caducado o no válido.");
    return result;
  }
  async function gather() {
    if (pc.iceGatheringState === "complete") return;
    await new Promise((resolve, reject) => {
      const current = pc, timer = setTimeout(() => {
        current.removeEventListener("icegatheringstatechange", listener);
        reject(Error("No se pudo preparar la red local. Reintenta."));
      }, 1e4);
      function listener() {
        if (current.iceGatheringState === "complete") {
          clearTimeout(timer);
          current.removeEventListener("icegatheringstatechange", listener);
          resolve();
        }
      }
      current.addEventListener("icegatheringstatechange", listener);
    });
  }
  function setup() {
    close();
    if (!root.RTCPeerConnection || !root.CompressionStream) throw Error("Este navegador no admite el modo local. Usa una versión actual de Chrome, Edge o Safari.");
    received = 0;
    pc = new RTCPeerConnection({ iceServers: [], iceTransportPolicy: "all" });
    pc.onconnectionstatechange = () => {
      if (pc) report(pc.connectionState === "connected" ? "Conectado directamente por la red local." : pc.connectionState === "failed" ? "No se pudo conectar. Comprueba misma red Wi-Fi y aislamiento de clientes." : "Estado local: " + pc.connectionState);
    };
    pc.ondatachannel = (e) => bind(e.channel);
  }
  function bind(ch) {
    channel = ch;
    ch.onopen = () => report("Conexión local lista. No se usan servidores para enviar los archivos.");
    ch.onclose = () => {
      pending?.reject(Error("La conexión se interrumpió; no se confirmó el envío."));
      pending = null;
    };
    ch.onmessage = async (e) => {
      try {
        if (typeof e.data !== "string" || e.data.length > 35e3) throw Error("Mensaje inválido.");
        const m = JSON.parse(e.data);
        if (m.kind === "ack") {
          if (pending && m.id === pending.id) {
            clearTimeout(pending.timer);
            m.ok ? pending.resolve() : pending.reject(Error("El mostrador no aceptó el archivo."));
            pending = null;
          }
          return;
        }
        if (Date.now() > expiresAt) throw Error("La sesión local caducó.");
        if (m.kind === "meta") {
          if (incoming || received >= 8 || typeof m.name !== "string" || m.name.length > 180 || !["image/jpeg", "image/png", "application/pdf"].includes(m.type) || !Number.isInteger(m.length) || m.length < 1 || m.length > MAX || !/^local_[a-f0-9]{24}$/.test(m.id)) throw Error("Archivo no permitido o bandeja llena.");
          incoming = { ...m, chunks: [], actual: 0 };
          return;
        }
        if (m.kind === "chunk") {
          if (!incoming || m.id !== incoming.id || typeof m.data !== "string" || m.data.length > CHUNK || incoming.actual + m.data.length > incoming.length) throw Error("Fragmento inválido.");
          incoming.chunks.push(m.data);
          incoming.actual += m.data.length;
          return;
        }
        if (m.kind === "end") {
          const file = incoming;
          incoming = null;
          if (!file || file.id !== m.id || file.actual !== file.length) throw Error("Archivo incompleto.");
          const dataUrl = file.chunks.join("");
          if (!dataUrl.startsWith("data:" + file.type + ";base64,") || !/^data:[^;]+;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)) throw Error("Formato inválido.");
          const size = Math.floor(dataUrl.split(",")[1].length * 0.75);
          if (size > 6 * 1024 * 1024) throw Error("Archivo mayor a 6 MB.");
          await onFile?.({ id: file.id, name: file.name, type: file.type, dataUrl, size });
          received++;
          ch.send(JSON.stringify({ kind: "ack", id: file.id, ok: true }));
          report("Archivo recibido por red local (" + received + "/8).");
        }
      } catch {
        incoming = null;
        try {
          ch.send(JSON.stringify({ kind: "ack", id: JSON.parse(e.data).id, ok: false }));
        } catch {
        }
        report("No se aceptó el archivo. Revisa tamaño, formato y sesión.");
      }
    };
  }
  async function offer(handler) {
    setup();
    identity = Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) => x.toString(16).padStart(2, "0")).join("");
    expiresAt = Date.now() + 15 * 6e4;
    onFile = handler;
    expiry = setTimeout(close, 15 * 6e4);
    bind(pc.createDataChannel("realscan-files", { ordered: true }));
    await pc.setLocalDescription(await pc.createOffer());
    await gather();
    return encode({ id: identity, expiresAt, type: pc.localDescription.type, sdp: pc.localDescription.sdp });
  }
  async function answer(code) {
    const remote = await decode(code);
    if (remote.type !== "offer") throw Error("Necesitas el QR del mostrador.");
    setup();
    identity = remote.id;
    expiresAt = remote.expiresAt;
    expiry = setTimeout(close, expiresAt - Date.now());
    await pc.setRemoteDescription({ type: remote.type, sdp: remote.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await gather();
    return encode({ id: identity, expiresAt, type: pc.localDescription.type, sdp: pc.localDescription.sdp });
  }
  async function accept(code) {
    const remote = await decode(code);
    if (!pc || remote.type !== "answer" || remote.id !== identity) throw Error("La respuesta no corresponde al QR activo.");
    await pc.setRemoteDescription({ type: remote.type, sdp: remote.sdp });
  }
  async function send(file) {
    if (!channel || channel.readyState !== "open" || pending) throw Error("Conecta el mostrador o espera la confirmación anterior.");
    if (typeof file.dataUrl !== "string" || file.dataUrl.length > MAX) throw Error("El archivo supera 6 MB.");
    const id = "local_" + Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(16).padStart(2, "0")).join("");
    const ack = new Promise((resolve, reject) => {
      pending = { id, resolve, reject, timer: setTimeout(() => {
        pending = null;
        reject(Error("No se confirmó la recepción. Revisa el mostrador."));
      }, 3e4) };
    });
    ack.catch(() => {
    });
    try {
      channel.send(JSON.stringify({ kind: "meta", id, name: file.name, type: file.type, length: file.dataUrl.length }));
      for (let offset = 0; offset < file.dataUrl.length; offset += CHUNK) {
        while (channel && channel.bufferedAmount > 262144) await new Promise((r) => setTimeout(r, 20));
        if (channel?.readyState !== "open") throw Error("Conexión local interrumpida.");
        channel.send(JSON.stringify({ kind: "chunk", id, data: file.dataUrl.slice(offset, offset + CHUNK) }));
      }
      channel.send(JSON.stringify({ kind: "end", id }));
      return await ack;
    } catch (error) {
      if (pending) {
        clearTimeout(pending.timer);
        pending = null;
      }
      throw error;
    }
  }
  function qr(code, canvas) {
    const q = qrcode(0, "L");
    q.addData(code);
    q.make();
    const n = q.getModuleCount(), scale = 4;
    canvas.width = canvas.height = (n + 8) * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) ctx.fillRect((x + 4) * scale, (y + 4) * scale, scale, scale);
  }
  root.RealScanP2P = { offer, answer, accept, send, close, qr, connected: () => channel?.readyState === "open" };
  root.addEventListener("pagehide", close);
})(window);
