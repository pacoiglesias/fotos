/* ============================================================
   RealScan Pro — Respaldo del historial CIFRADO con contraseña
   AES-256-GCM vía WebCrypto; la clave se deriva con PBKDF2-SHA256
   (210 000 iteraciones) y sal aleatoria por archivo. El sobre del
   archivo es JSON, así que la importación lo distingue del respaldo
   en claro de siempre y pide la contraseña solo si hace falta.
   ============================================================ */
(function () {
  const FORMAT = 'realscan-backup';
  const KIND = 'encrypted-history';
  const FORMAT_VERSION = 1;
  const PBKDF2_ITERATIONS = 210000;

  function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }
  function base64ToBytes(b64) {
    const binary = atob(String(b64 || ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function deriveKey(password, saltBytes, iterations) {
    const material = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: iterations, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']);
  }

  async function encryptText(plainText, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(plainText));
    return {
      app: 'RealScan Pro',
      format: FORMAT,
      kind: KIND,
      version: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS, salt: bytesToBase64(salt) },
      cipher: { name: 'AES-GCM', iv: bytesToBase64(iv) },
      data: bytesToBase64(new Uint8Array(cipher))
    };
  }

  async function decryptText(envelope, password) {
    const salt = base64ToBytes(envelope.kdf && envelope.kdf.salt);
    const iv = base64ToBytes(envelope.cipher && envelope.cipher.iv);
    const iterations = (envelope.kdf && envelope.kdf.iterations) || PBKDF2_ITERATIONS;
    const key = await deriveKey(password, salt, iterations);
    let plain;
    try {
      plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv }, key, base64ToBytes(envelope.data));
    } catch (e) {
      throw new Error('Contraseña incorrecta o respaldo dañado.');
    }
    return new TextDecoder().decode(plain);
  }

  function isEncryptedBackupObject(obj) {
    return !!obj && obj.format === FORMAT && obj.kind === KIND && typeof obj.data === 'string';
  }

  /* Modal propio para pedir la contraseña (exportar: con confirmación;
     importar: una sola vez). Devuelve la contraseña o null si se cancela. */
  function promptBackupPassword(options) {
    const opts = options || {};
    const withConfirm = !!opts.confirm;
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
      overlay.innerHTML =
        '<div role="dialog" aria-modal="true" class="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xl p-5 space-y-4">' +
        '<h3 class="text-base font-black leading-tight">' + (opts.title || 'Respaldo cifrado') + '</h3>' +
        '<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">' + (opts.message || '') + '</p>' +
        '<input type="password" id="rsBackupPass1" autocomplete="new-password" placeholder="Contraseña del respaldo" ' +
        'class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold" />' +
        (withConfirm
          ? '<input type="password" id="rsBackupPass2" autocomplete="new-password" placeholder="Confirma la contraseña" ' +
            'class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold" />'
          : '') +
        '<p id="rsBackupPassError" class="hidden text-xs font-bold text-red-600 dark:text-red-400"></p>' +
        '<div class="flex gap-2 justify-end">' +
        '<button type="button" id="rsBackupPassCancel" class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>' +
        '<button type="button" id="rsBackupPassOk" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">' + (opts.confirmText || 'Aceptar') + '</button>' +
        '</div></div>';
      document.body.appendChild(overlay);
      const input1 = overlay.querySelector('#rsBackupPass1');
      const input2 = overlay.querySelector('#rsBackupPass2');
      const errorEl = overlay.querySelector('#rsBackupPassError');
      function cleanup(value) {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        resolve(value);
      }
      function fail(msg) {
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
      }
      function submit() {
        const pass = input1.value || '';
        if (withConfirm) {
          if (pass.length < 6) { fail('La contraseña debe tener al menos 6 caracteres.'); return; }
          if (input2 && pass !== input2.value) { fail('La contraseña y su confirmación no coinciden.'); return; }
        } else if (!pass) {
          fail('Ingresa la contraseña del respaldo.');
          return;
        }
        cleanup(pass);
      }
      function onKey(ev) {
        if (ev.key === 'Escape') cleanup(null);
        if (ev.key === 'Enter' && overlay.contains(document.activeElement)) { ev.preventDefault(); submit(); }
      }
      overlay.querySelector('#rsBackupPassCancel').addEventListener('click', function () { cleanup(null); });
      overlay.querySelector('#rsBackupPassOk').addEventListener('click', submit);
      overlay.addEventListener('click', function (ev) { if (ev.target === overlay) cleanup(null); });
      document.addEventListener('keydown', onKey, true);
      setTimeout(function () { try { input1.focus(); } catch (e) {} }, 50);
    });
  }

  window.RealScanBackupCrypto = {
    encryptText: encryptText,
    decryptText: decryptText,
    isEncryptedBackupObject: isEncryptedBackupObject,
    promptBackupPassword: promptBackupPassword
  };
})();
