import { initializeApp } from "@firebase/app";
import {
  initializeAuth,
  inMemoryPersistence,
  signInAnonymously,
} from "@firebase/auth";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  onChildAdded,
  onDisconnect,
  serverTimestamp,
} from "@firebase/database";

const TTL = 15 * 60 * 1000,
  MAX_FILE = 6 * 1024 * 1024,
  MAX_FILES = 8;
let auth,
  db,
  readyPromise,
  offset = 0;
const owned = new Map();
const timeout = (promise, ms = 25000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            Error(
              "No se confirmó la conexión. Comprueba internet y vuelve a intentar.",
            ),
          ),
        ms,
      ),
    ),
  ]);
async function ready() {
  if (!navigator.onLine)
    throw Error("Esta función requiere conexión a internet.");
  if (!readyPromise)
    readyPromise = (async () => {
      if (!auth) {
        const app = initializeApp(window.REALSCAN_FIREBASE_CONFIG);
        auth = initializeAuth(app, { persistence: inMemoryPersistence });
        db = getDatabase(app);
      }
      await signInAnonymously(auth).catch((e) => {
        throw Error("Autenticación de transferencia: " + e.message);
      });
      onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
        offset = snap.val() || 0;
      });
      await timeout(
        new Promise((resolve, reject) => {
          let stop;
          stop = onValue(
            ref(db, ".info/connected"),
            (snap) => {
              if (snap.val() === true) {
                stop?.();
                resolve();
              }
            },
            reject,
          );
        }),
      );
    })().catch((e) => {
      readyPromise = null;
      throw e;
    });
  await timeout(readyPromise);
  return auth.currentUser;
}
function secret() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
const now = () => Date.now() + offset;
function locationInfo(kind) {
  const p = new URLSearchParams(location.hash.slice(1));
  const owner = p.get("o"),
    token = p.get("s");
  if (
    !owner ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(owner) ||
    !token ||
    !/^[a-f0-9]{64}$/.test(token)
  )
    throw Error("El enlace no es válido. Solicita un QR nuevo.");
  return { owner, token, path: `transfers/${owner}/${kind}/sessions/${token}` };
}
function validate(file) {
  if (
    !file ||
    typeof file.name !== "string" ||
    !file.name.length ||
    file.name.length > 180 ||
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      file.type,
    ) ||
    typeof file.dataUrl !== "string" ||
    !Number.isFinite(file.size) ||
    file.size <= 0 ||
    file.size > MAX_FILE ||
    file.dataUrl.length > 8388700
  )
    throw Error("Archivo no admitido. Usa JPG, PNG, WebP o PDF de hasta 6 MB.");
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(file.dataUrl);
  if (!match || match[1] !== file.type)
    throw Error("El contenido del archivo no coincide con su formato.");
  const b = atob(match[2].slice(0, 32));
  const valid =
    file.type === "application/pdf"
      ? b.startsWith("%PDF-")
      : file.type === "image/jpeg"
        ? b.charCodeAt(0) === 255 && b.charCodeAt(1) === 216
        : file.type === "image/png"
          ? b.startsWith("\x89PNG\r\n\x1a\n")
          : b.startsWith("RIFF") && b.slice(8, 12) === "WEBP";
  if (!valid)
    throw Error("El archivo está dañado o no coincide con su extensión.");
  return file;
}
async function digest(text) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(bytes), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
async function revoke(kind) {
  const s = owned.get(kind);
  if (!s) return;
  s.status = "revoked";
  s.stop?.();
  clearTimeout(s.timer);
  owned.delete(kind);
  await timeout(remove(ref(db, s.containerPath)));
}
async function create(kind, files = [], onFile) {
  const user = await ready();
  await revoke(kind);
  const token = secret(),
    containerPath = `transfers/${user.uid}/${kind}`,
    path = containerPath + "/sessions/" + token,
    expiresAt = now() + TTL;
  const session = {
    id: (kind === "receive" ? "RS-" : "DL-") + token.slice(0, 8).toUpperCase(),
    path,
    containerPath,
    expiresAt,
    status: "waiting",
    url:
      new URL(
        kind === "receive" ? "phone-upload.html" : "phone-download.html",
        location.href,
      ).href +
      "#o=" +
      user.uid +
      "&s=" +
      token,
  };
  const payload = {
    ownerUid: user.uid,
    kind,
    createdAt: serverTimestamp(),
    expiresAt,
  };
  if (files.length > MAX_FILES)
    throw Error("La entrega admite hasta 8 archivos.");
  if (files.length) {
    payload.files = {};
    for (const [index, file] of files.entries()) {
      validate(file);
      payload.files[index] = {
        ...file,
        hash: await digest(file.dataUrl),
        name: file.name.slice(0, 180),
        senderUid: user.uid,
        createdAt: serverTimestamp(),
        accepted: true,
      };
    }
  }
  // Deletion registered on the server, including when this browser closes.
  await timeout(onDisconnect(ref(db, containerPath)).remove());
  await timeout(
    set(ref(db, containerPath), { token, sessions: { [token]: payload } }),
  );
  owned.set(kind, session);
  session.timer = setTimeout(() => {
    revoke(kind).catch(console.warn);
  }, TTL + 500);
  if (onFile)
    session.stop = onChildAdded(ref(db, path + "/files"), async (snap) => {
      try {
        if (session.status === "revoked" || now() >= expiresAt) return;
        const file = snap.val();
        validate(file);
        await onFile({ ...file, id: snap.key });
        await update(ref(db, path + "/files/" + snap.key), { accepted: true });
      } catch (e) {
        console.warn("Archivo no recibido:", e);
      }
    });
  return session;
}
async function readSession(kind) {
  const info = locationInfo(kind);
  await ready();
  const snapshot = await timeout(get(ref(db, info.path)));
  const data = snapshot.val();
  if (!data || data.kind !== kind || now() >= data.expiresAt)
    throw Error("La sesión terminó. Solicita un QR nuevo al operador.");
  return { ...info, ...data };
}
async function send(file) {
  validate(file);
  let s = await readSession("receive");
  const hash = await digest(file.dataUrl);
  let id, target;
  for (let attempt = 0; attempt < 8; attempt++) {
    const prior = Object.entries(s.files || {}).find(
      ([, f]) => f.hash === hash,
    );
    id = prior
      ? prior[0]
      : Array.from({ length: MAX_FILES }, (_, i) => String(i)).find(
          (i) => !s.files?.[i],
        );
    if (id === undefined)
      throw Error(
        "Esta sesión ya contiene 8 archivos. Pide al operador un QR nuevo.",
      );
    target = ref(db, s.path + "/files/" + id);
    if (prior) break;
    try {
      await timeout(
        set(target, {
          name: file.name.slice(0, 180),
          type: file.type,
          dataUrl: file.dataUrl,
          size: file.size,
          hash,
          senderUid: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          accepted: false,
        }),
      );
      break;
    } catch (e) {
      if (attempt === 7) throw e;
      s = await readSession("receive");
    }
  }
  await timeout(
    new Promise((resolve, reject) => {
      let stop;
      const timer = setTimeout(() => {
        stop?.();
        reject(
          Error(
            "El puesto aún no confirmó la recepción. Mantén esta pantalla abierta y reintenta.",
          ),
        );
      }, 20000);
      stop = onValue(
        target,
        (snap) => {
          if (snap.val()?.accepted) {
            clearTimeout(timer);
            stop?.();
            resolve();
          }
        },
        (e) => {
          clearTimeout(timer);
          reject(e);
        },
      );
    }),
    22000,
  );
  return id;
}
async function watchDelivery(callback, onError) {
  const s = await readSession("delivery");
  const timer = setTimeout(
    () => onError(Error("La entrega ha caducado.")),
    Math.max(0, s.expiresAt - now()),
  );
  const stop = onValue(
    ref(db, s.path),
    (snap) => {
      const data = snap.val();
      if (!data || now() >= data.expiresAt) {
        onError(Error("La entrega terminó o fue revocada."));
        return;
      }
      try {
        Object.values(data.files || {}).forEach(validate);
        callback(Object.values(data.files || {}));
      } catch (e) {
        onError(e);
      }
    },
    onError,
  );
  return () => {
    clearTimeout(timer);
    stop();
  };
}
async function clearFiles(kind) {
  const session = owned.get(kind);
  if (session) await timeout(remove(ref(db, session.path + "/files")));
}
window.RealScanRelay = {
  ready,
  create,
  revoke,
  clearFiles,
  readSession,
  send,
  watchDelivery,
  validate,
  MAX_FILE,
  MAX_FILES,
};
