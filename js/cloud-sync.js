/* RealScan — Copia en la nube con Firebase (AÑADIDO 8, v3.13.0).
   Diseño (documentado en el informe): local-first siempre. El historial
   vive en IndexedDB y la app funciona sin conexión; la nube es una COPIA
   asociada a la cuenta del operador en SU proyecto fotos-cobertores-pro.
   - Identidad: la cuenta local se espeja en Firebase Auth con correo
     <usuario>@realscan.local. La vinculación es explícita y por equipo
     (botón en Ajustes): se pide la contraseña una sola vez para vincular;
     nunca se guarda la contraseña, solo el token de refresco de Firebase.
   - Datos: metadatos en Realtime Database (users/<uid>/scans/<id>) y las
     fotos en Firebase Storage (users/<uid>/scans/<id>/<cara>.jpg), por
     REST con el token de la sesión. Las reglas (database.rules.json y
     storage.rules, en el repo) limitan cada cuenta a lo suyo.
   - Si el proyecto aún no tiene Storage o las reglas publicadas (pasos de
     consola del propietario), la sincronización marca error visible y la
     app sigue trabajando en local: nunca bloquea el mostrador. */
(function () {
  'use strict';

  const LINK_KEY = 'realscan_cloud_link_v1';
  const ENABLED_KEY = 'realscan_cloud_enabled_v1';
  const STATE_KEY = 'realscan_cloud_state_v1';
  let idToken = null, idTokenExpiry = 0, syncing = false, restoring = false, pendingTimer = null, cloudOnlyIds = [];

  function cfg() { return window.REALSCAN_FIREBASE_CONFIG || null; }
  function bucketName() {
    const c = cfg();
    if (c && c.storageBucket) return c.storageBucket;
    throw new Error('Falta storageBucket en la configuración de Firebase. Revisa js/firebase-config.js; nunca se usa un bucket inventado.');
  }
  function enabled() { try { return localStorage.getItem(ENABLED_KEY) !== '0'; } catch (e) { return true; } }
  function link() { try { return JSON.parse(localStorage.getItem(LINK_KEY) || 'null'); } catch (e) { return null; } }
  function setLink(value) { try { value ? localStorage.setItem(LINK_KEY, JSON.stringify(value)) : localStorage.removeItem(LINK_KEY); } catch (e) {} }
  function stateMap() { try { return JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); } catch (e) { return {}; } }
  function setState(id, value) {
    try { const map = stateMap(); if (value) map[id] = value; else delete map[id]; localStorage.setItem(STATE_KEY, JSON.stringify(map)); } catch (e) {}
  }
  function currentUsername() {
    try { const d = (typeof getAuthData === 'function') ? getAuthData() : null; return (d && d.currentUsername) || 'operador'; } catch (e) { return 'operador'; }
  }
  function setStatus(text) {
    const line = document.getElementById('cloudStatusLine');
    if (line) line.textContent = 'Nube: ' + text;
    const hist = document.getElementById('historyCloudStatus');
    if (hist) hist.textContent = enabled() ? ('☁️ ' + text) : '☁️ Copia en la nube desactivada';
  }

  async function authRequest(path, body) {
    const c = cfg();
    if (!c || !c.apiKey) throw new Error('Falta la configuración de Firebase.');
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/' + path + '?key=' + encodeURIComponent(c.apiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) { const err = new Error((data.error && data.error.message) || ('HTTP ' + res.status)); err.code = data.error && data.error.message; throw err; }
    return data;
  }

  async function refreshSession() {
    const l = link();
    if (!l || !l.refreshToken) return false;
    const c = cfg();
    const res = await fetch('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(c.apiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(l.refreshToken)
    });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.id_token) return false;
    idToken = data.id_token;
    idTokenExpiry = Date.now() + (parseInt(data.expires_in, 10) || 3600) * 1000 - 60000;
    if (data.refresh_token && data.refresh_token !== l.refreshToken) setLink({ email: l.email, uid: l.uid, refreshToken: data.refresh_token });
    return true;
  }

  async function ensureToken() {
    if (idToken && Date.now() < idTokenExpiry) return idToken;
    if (await refreshSession()) return idToken;
    return null;
  }

  async function linkWithPassword(password) {
    const email = currentUsername().toLowerCase().replace(/[^a-z0-9._-]/g, '') + '@realscan.local';
    let data;
    try {
      data = await authRequest('accounts:signInWithPassword', { email: email, password: password, returnSecureToken: true });
    } catch (e) {
      if (e.code === 'EMAIL_NOT_FOUND' || e.code === 'INVALID_LOGIN_CREDENTIALS') {
        try { data = await authRequest('accounts:signUp', { email: email, password: password, returnSecureToken: true }); }
        catch (e2) {
          if (e2.code === 'EMAIL_EXISTS') throw new Error('La cuenta de nube ya existe con otra contraseña (¿cambiaste tu contraseña local?). Vincula con la contraseña anterior o pide restablecer el enlace.');
          throw e2;
        }
      } else throw e;
    }
    idToken = data.idToken;
    idTokenExpiry = Date.now() + (parseInt(data.expiresIn, 10) || 3600) * 1000 - 60000;
    setLink({ email: email, uid: data.localId, refreshToken: data.refreshToken });
    return data.localId;
  }

  function metadataFor(scan) {
    const meta = {};
    Object.keys(scan).forEach(function (k) {
      if (k === 'pages' || k === 'thumbnail') return;
      const v = scan[k];
      if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) meta[k] = v;
    });
    meta.pagesMeta = (scan.pages || []).map(function (p) {
      const pm = {};
      Object.keys(p).forEach(function (k) {
        if (k === 'dataUrl' || k === 'originalSrc' || k === 'rawOriginalSrc' || k === 'croppedSrc') return;
        const v = p[k];
        if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) pm[k] = v;
      });
      return pm;
    });
    meta.thumbnail = (scan.thumbnail && scan.thumbnail.length < 120000) ? scan.thumbnail : null;
    return meta;
  }

  function dataUrlToBlob(dataUrl) {
    return fetch(dataUrl).then(function (r) { return r.blob(); });
  }

  async function rtdb(path, method, body) {
    const token = await ensureToken();
    if (!token) throw new Error('Sin sesión de nube.');
    const c = cfg();
    const res = await fetch(c.databaseURL + path + '.json?auth=' + encodeURIComponent(token), {
      method: method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error('RTDB HTTP ' + res.status);
    return res.status === 204 ? null : res.json().catch(function () { return null; });
  }

  async function storageUpload(path, blob) {
    const token = await ensureToken();
    if (!token) throw new Error('Sin sesión de nube.');
    const res = await fetch('https://firebasestorage.googleapis.com/v0/b/' + encodeURIComponent(bucketName()) + '/o?uploadType=media&name=' + encodeURIComponent(path), {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': blob.type || 'image/jpeg' }, body: blob
    });
    if (!res.ok) throw new Error('Storage HTTP ' + res.status + ' (¿está creado el bucket en la consola?)');
    return res.json().catch(function () { return {}; });
  }

  async function storageDownload(path) {
    const token = await ensureToken();
    if (!token) throw new Error('Sin sesión de nube.');
    const res = await fetch('https://firebasestorage.googleapis.com/v0/b/' + encodeURIComponent(bucketName()) + '/o/' + encodeURIComponent(path) + '?alt=media', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Storage HTTP ' + res.status);
    return res.blob();
  }

  async function storageDelete(path) {
    const token = await ensureToken();
    if (!token) return;
    await fetch('https://firebasestorage.googleapis.com/v0/b/' + encodeURIComponent(bucketName()) + '/o/' + encodeURIComponent(path), {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
    }).catch(function () {});
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function digest(blob){const bytes=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
  async function uploadScan(scan,uid){
    if(!Array.isArray(scan.pages)||!scan.pages.length||scan.pages.length>40)throw Error('El trabajo no tiene páginas válidas.');
    const meta=metadataFor(scan),files=[],slots=new Set();
    for(let index=0;index<scan.pages.length;index++){
      const page=scan.pages[index],source=page.dataUrl||page.originalSrc||page.rawOriginalSrc,slot=page.slot||'front';
      if(!source||slots.has(slot))throw Error('Falta una imagen o hay caras repetidas.');slots.add(slot);
      const blob=await dataUrlToBlob(source);if(!blob.size||!/^image\/(png|jpeg|webp)$/.test(blob.type))throw Error('Imagen de respaldo no válida.');
      meta.pagesMeta[index].cloudHash=await digest(blob);files.push({slot,blob});
    }
    setState(scan.id,{s:'uploading',at:scan.updatedAt||scan.createdAt||0});meta.cloudState='uploading';
    await rtdb('/users/'+uid+'/scans/'+scan.id,'PUT',meta);
    for(const file of files)await storageUpload('users/'+uid+'/scans/'+scan.id+'/'+file.slot+'.jpg',file.blob);
    meta.cloudState='ready';await rtdb('/users/'+uid+'/scans/'+scan.id,'PUT',meta);
    setState(scan.id,{s:'synced',at:scan.updatedAt||scan.createdAt||0});
  }

  async function syncNow() {
    if (syncing) return;
    if (!enabled()) { setStatus('desactivada en Ajustes'); return; }
    const l = link();
    if (!l) { setStatus('Respaldo en NAS: sin conectar. Conéctalo en Ajustes'); renderRestoreBanner(); return; }
    syncing = true;
    setStatus('sincronizando…');
    try {
      const token = await ensureToken();
      if (!token) { setStatus('la sesión de nube caducó — vuelve a vincular en Ajustes'); syncing = false; return; }
      const scans = await getAllScansFromStorage();
      const localIds = new Set(scans.map(function (s) { return s.id; }));
      const map = stateMap();
      for (const scan of scans) {
        const st = map[scan.id];
        if (!st || st.at !== (scan.updatedAt || scan.createdAt || 0) || st.s === 'error') {
          try { await uploadScan(scan, l.uid); }
          catch (e) { setState(scan.id, { s: 'error', at: scan.updatedAt || scan.createdAt || 0 }); }
        }
      }
      for (const id of Object.keys(stateMap())) {
        const st = stateMap()[id];
        if (st && st.s === 'deleted' && !localIds.has(id)) {
          try { await rtdb('/users/' + l.uid + '/scans/' + id, 'DELETE'); } catch (e) {}
          for (const slot of st.slots || []) await storageDelete('users/' + l.uid + '/scans/' + id + '/' + slot + '.jpg');
          setState(id, null);
        }
      }
      await checkCloudOnly(l.uid);
      const failed = Object.values(stateMap()).some(function (v) { return v && v.s === 'error'; });
      setStatus(failed ? 'con errores — revisa que Storage y las reglas estén activos en la consola' : 'guardado en la nube ✓ ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      if (typeof renderHistoryUI === 'function') renderHistoryUI();
    } catch (e) {
      setStatus('sin conexión o nube no disponible (el trabajo local está a salvo)');
    }
    syncing = false;
  }

  async function checkCloudOnly(uid) {
    try {
      const index = await rtdb('/users/' + uid + '/scans', 'GET');
      const cloudIds = index ? Object.keys(index) : [];
      const local = await getAllScansFromStorage();
      const localIds = new Set(local.map(function (s) { return s.id; }));
      cloudOnlyIds = cloudIds.filter(function (id) { return !localIds.has(id); });
    } catch (e) { cloudOnlyIds = []; }
    renderRestoreBanner();
  }

  function renderRestoreBanner() {
    const banner = document.getElementById('cloudRestoreBanner');
    const text = document.getElementById('cloudRestoreText');
    if (!banner || !text) return;
    if (cloudOnlyIds.length && enabled() && link()) {
      text.textContent = '☁️ Hay ' + cloudOnlyIds.length + ' trabajo(s) en tu nube que no están en este equipo. ¿Recuperarlos?';
      banner.classList.remove('hidden');
    } else banner.classList.add('hidden');
  }

  async function restoreCloudOnly() {
    const l = link();
    if (restoring || !enabled() || !l || !cloudOnlyIds.length) return;
    const ids=cloudOnlyIds.slice(),pending=new Set(ids),btn=document.getElementById('btnCloudRestoreNow');
    restoring=true;if(btn)btn.disabled=true;let restored=0;
    try {
      for (const id of ids) {
        try {
          const meta=await rtdb('/users/'+l.uid+'/scans/'+id,'GET');
          if(meta?.cloudState&&meta.cloudState!=='ready')throw Error('La copia de nube sigue en proceso.');
          if(!meta||!Array.isArray(meta.pagesMeta)||!meta.pagesMeta.length||meta.pagesMeta.length>40)throw Error('El respaldo no tiene una lista de páginas válida.');
          const pages=[],slots=new Set();
          for(const pm of meta.pagesMeta){
            if(!pm||typeof pm!=='object')throw Error('Página de respaldo no válida.');
            const slot=pm.slot||'front';if(typeof slot!=='string'||slots.has(slot))throw Error('Páginas repetidas en el respaldo.');slots.add(slot);
            const blob=await storageDownload('users/'+l.uid+'/scans/'+id+'/'+slot+'.jpg');
            if(!/^image\/(png|jpeg|webp)$/.test(blob.type)||!blob.size)throw Error('La página descargada no es una imagen válida.');
            if(pm.cloudHash&&(!/^[a-f0-9]{64}$/.test(pm.cloudHash)||await digest(blob)!==pm.cloudHash))throw Error('La página no coincide con el respaldo.');
            const dataUrl=await blobToDataUrl(blob),image=new Image();image.src=dataUrl;await image.decode();
            if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>60000000)throw Error('Dimensiones de respaldo no válidas.');
            pages.push(Object.assign({},pm,{dataUrl,originalSrc:dataUrl,rawOriginalSrc:dataUrl,croppedSrc:null}));
          }
          if(!enabled()||link()?.uid!==l.uid)throw Error('La cuenta de nube cambió.');
          const latest=await rtdb('/users/'+l.uid+'/scans/'+id,'GET');if(JSON.stringify(latest)!==JSON.stringify(meta))throw Error('La copia de nube cambió durante la descarga.');
          const existing=await getAllScansFromStorage();
          if(existing.some(record=>record.id===id)){pending.delete(id);continue;}
          if(typeof window.putScanRecord!=='function')throw Error('El almacenamiento local no está disponible.');
          const record={};Object.keys(meta).forEach(k=>{if(k!=='pagesMeta')record[k]=meta[k];});
          record.id=id;record.pages=pages;record.schemaVersion=record.schemaVersion||1;
          await window.putScanRecord(record);
          setState(id,{s:'synced',at:record.updatedAt||record.createdAt||0});pending.delete(id);restored++;
        } catch(e) { window.RealScanDiagnostics?.record('cloud.restore.failed','warning'); }
      }
      cloudOnlyIds=[...pending];renderRestoreBanner();
      if(typeof renderHistoryUI==='function')renderHistoryUI();if(typeof updateHistoryBadge==='function')updateHistoryBadge();
      const remaining=pending.size;window.RealScanDiagnostics?.record('cloud.restore',remaining?'warning':'info',{count:restored});
      setStatus(remaining?'recuperación incompleta: '+remaining+' trabajo(s) pendientes; vuelve a intentar':'recuperación completa');
      showToast(restored+' trabajo(s) recuperados completos.'+(remaining?' '+remaining+' siguen pendientes; no se guardaron documentos incompletos. Vuelve a intentar.':''),remaining?'warning':'success');
    } finally { restoring=false;if(btn)btn.disabled=false; }
  }

  function badgeFor(scan) {
    if (!enabled()) return null;
    if (!link()) return { text: 'Solo en este equipo', cls: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' };
    const st = stateMap()[scan.id];
    if (!st) return { text: 'Solo en este equipo', cls: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' };
    if (st.s === 'synced') return { text: 'Guardado en la nube ✓', cls: 'text-sky-700 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-200' };
    if (st.s === 'uploading') return { text: 'Subiendo…', cls: 'text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300' };
    if (st.s === 'error') return { text: 'Error de nube', cls: 'text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-300' };
    return { text: 'Solo en este equipo', cls: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' };
  }

  function notifyChanged() {
    if (!enabled() || !link()) return;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(syncNow, 1500);
  }

  function onScanDeleted(id, slots) {
    const st = stateMap()[id];
    if (st && st.s === 'synced') setState(id, { s: 'deleted', at: 0, slots: slots || ['front', 'back', 'page3', 'page4'] });
    else setState(id, null);
    notifyChanged();
  }

  async function linkFlow() {
    if (!window.RealScanBackupCrypto || typeof window.RealScanBackupCrypto.promptBackupPassword !== 'function') {
      showToast('El módulo de seguridad no está listo. Recarga la página.', 'error'); return;
    }
    const password = await window.RealScanBackupCrypto.promptBackupPassword({
      title: 'Vincular la copia en la nube',
      message: 'Escribe tu contraseña de RealScan para vincular este equipo con tu nube de Firebase. Se pide solo al vincular: después la copia es automática y tu contraseña no se guarda.',
      confirm: false, confirmText: 'Vincular'
    });
    if (!password) return;
    setStatus('vinculando…');
    try {
      await linkWithPassword(password);
      showToast('☁️ Equipo vinculado. Sincronizando tu historial…', 'success');
      await syncNow();
    } catch (e) {
      console.error('Error al vincular la nube:', e);
      setStatus('no se pudo vincular');
      const code = (e && e.code) || '';
      let friendly = 'No se pudo vincular la nube. Revisa tu conexión a internet e inténtalo de nuevo.';
      if (code === 'INVALID_PASSWORD' || code === 'INVALID_LOGIN_CREDENTIALS') friendly = 'La contraseña no coincide con la de tu cuenta de nube. Si cambiaste tu contraseña de RealScan, vincula primero con la anterior o pide ayuda para restablecer el enlace.';
      else if (code === 'WEAK_PASSWORD') friendly = 'Tu contraseña es demasiado corta para la nube (mínimo 6 caracteres). Cámbiala en Ajustes y vuelve a vincular.';
      else if (code === 'TOO_MANY_ATTEMPTS_TRY_LATER') friendly = 'Demasiados intentos seguidos: espera unos minutos y vuelve a intentarlo.';
      else if (code === 'EMAIL_EXISTS') friendly = 'Tu cuenta de nube ya existe con otra contraseña. Vincula con la contraseña anterior.';
      showToast(friendly, 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('cloudEnableToggle');
    if (toggle) {
      toggle.checked = enabled();
      toggle.addEventListener('change', function () {
        try { localStorage.setItem(ENABLED_KEY, toggle.checked ? '1' : '0'); } catch (e) {}
        if (toggle.checked) syncNow(); else setStatus('desactivada en Ajustes');
      });
    }
    const linkBtn = document.getElementById('btnCloudLink');
    if (linkBtn) linkBtn.addEventListener('click', function () { link() ? syncNow() : linkFlow(); });
    const unlinkBtn = document.getElementById('btnCloudUnlink');
    if (unlinkBtn) unlinkBtn.addEventListener('click', function () {
      setLink(null); idToken = null;
      try { localStorage.removeItem(STATE_KEY); } catch (e) {}
      setStatus('sin vincular — este equipo ya no copia a la nube (lo ya guardado en la nube no se borra)');
      renderRestoreBanner();
      if (typeof renderHistoryUI === 'function') renderHistoryUI();
    });
    const restoreBtn = document.getElementById('btnCloudRestoreNow');
    if (restoreBtn) restoreBtn.addEventListener('click', restoreCloudOnly);
    const dismissBtn = document.getElementById('btnCloudRestoreDismiss');
    if (dismissBtn) dismissBtn.addEventListener('click', function () { cloudOnlyIds = []; renderRestoreBanner(); });
    setStatus(link() ? 'vinculada (' + (link().email || '') + ')' : 'Respaldo en NAS: sin conectar. Conéctalo en Ajustes');
    if (link() && enabled()) setTimeout(syncNow, 2500);
  });

  window.addEventListener('online', function () { notifyChanged(); });

  window.RealScanCloudSync = {
    syncNow: syncNow, badgeFor: badgeFor, notifyChanged: notifyChanged,
    onScanDeleted: onScanDeleted, linkFlow: linkFlow, restoreCloudOnly: restoreCloudOnly,
    isLinked: function () { return !!link(); }, isEnabled: enabled
  };
})();
