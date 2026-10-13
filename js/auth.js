/* ============================================================
   RealScan Pro — Módulo de Seguridad, Autenticación y Auditoría (SHA-256)
   Desarrollado por Paco Iglesias • Escala 1:1 Calibrada
   ============================================================ */

async function computeSha256(str) {
  if (!window.crypto || !window.crypto.subtle) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return 'fb_' + Math.abs(h);
  }
  const enc = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuf)).map(function(b){ return b.toString(16).padStart(2, '0'); }).join('');
}

function getAuthData() {
  try {
    const raw = localStorage.getItem(window.AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) return parsed;
    }
    // Migración automática desde v1 si existía
    const oldRaw = localStorage.getItem('realscan_auth_v1');
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      const migrated = {
        users: [
          { username: old.username || window.DEFAULT_USER, passwordHash: old.passwordHash || window.DEFAULT_PIN_HASH, role: 'admin' }
        ],
        currentUsername: old.username || window.DEFAULT_USER,
        sessionToken: old.sessionToken || null,
        sessionExpiry: old.sessionExpiry || 0
      };
      saveAuthData(migrated);
      return migrated;
    }
  } catch(e) {}
  return {
    users: [
      { username: window.DEFAULT_USER, passwordHash: window.DEFAULT_PIN_HASH, role: 'admin' }
    ],
    currentUsername: window.DEFAULT_USER,
    sessionToken: null,
    sessionExpiry: 0
  };
}

function saveAuthData(data) {
  try {
    localStorage.setItem(window.AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch(e) {}
}

/* ============================================================
   Bitácora de Auditoría (Log)
   ============================================================ */
function getAuditLogs() {
  try {
    const raw = localStorage.getItem(window.AUDIT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return [];
}

function logActivity(action, details) {
  try {
    const logs = getAuditLogs();
    const auth = getAuthData();
    const entry = {
      id: 'log_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      timestamp: new Date().toISOString(),
      user: auth.currentUsername || 'invitado',
      action: action,
      details: details || ''
    };
    logs.unshift(entry);
    if (logs.length > 300) logs.length = 300;
    localStorage.setItem(window.AUDIT_STORAGE_KEY, JSON.stringify(logs));
    renderAuditLogs();
  } catch(e) {}
}

function formatLogDate(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' +
           d.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  } catch(e) { return isoStr; }
}

function renderAuditLogs() {
  const listEl = $('auditLogList');
  const counterEl = $('logCounter');
  if (!listEl) return;
  const logs = getAuditLogs();
  if (counterEl) counterEl.textContent = logs.length;
  if (logs.length === 0) {
    listEl.innerHTML = '<div class="p-4 text-center text-slate-400 dark:text-slate-500 italic">No hay registros aún en la bitácora.</div>';
    return;
  }
  let html = '';
  logs.forEach(function(l) {
    html += '<div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-start justify-between gap-2">' +
      '<div class="min-w-0">' +
        '<div class="flex items-center gap-1.5 flex-wrap">' +
          '<span class="font-bold text-slate-900 dark:text-white">' + escapeHtml(l.action) + '</span>' +
          '<span class="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-[10px]">👤 ' + escapeHtml(l.user) + '</span>' +
        '</div>' +
        (l.details ? '<p class="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5 break-words">' + escapeHtml(l.details) + '</p>' : '') +
      '</div>' +
      '<span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">' + formatLogDate(l.timestamp) + '</span>' +
    '</div>';
  });
  listEl.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function exportAuditLogCsv() {
  const logs = getAuditLogs();
  if (logs.length === 0) {
    showToast('La bitácora está vacía', 'warning');
    return;
  }
  let csv = '\uFEFF"ID","Fecha","Hora","Usuario","Acción","Detalles"\n';
  logs.forEach(function(l) {
    const d = new Date(l.timestamp);
    const fDate = d.toLocaleDateString('es-MX');
    const fTime = d.toLocaleTimeString('es-MX');
    csv += '"' + l.id + '","' + fDate + '","' + fTime + '","' + (l.user||'').replace(/"/g, '""') + '","' + (l.action||'').replace(/"/g, '""') + '","' + (l.details||'').replace(/"/g, '""') + '"\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bitacora_realscan_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  logActivity('Exportación de Bitácora', 'Descarga de archivo CSV (' + logs.length + ' registros)');
  showToast('Bitácora descargada en formato CSV', 'success');
}

function clearAuditLog() {
  if (!confirm('¿Estás seguro de que deseas vaciar la bitácora de auditoría? Esta acción no se puede deshacer.')) return;
  localStorage.removeItem(window.AUDIT_STORAGE_KEY);
  renderAuditLogs();
  logActivity('Bitácora Vaciada', 'El historial fue reiniciado manualmente');
  showToast('Bitácora limpiada', 'info');
}

/* ============================================================
   Gestión de Usuarios y Roles
   ============================================================ */
function renderUsersList() {
  const container = $('usersListContainer');
  const badge = $('usersCounterBadge');
  if (!container) return;
  const auth = getAuthData();
  if (badge) badge.textContent = auth.users.length + (auth.users.length === 1 ? ' usuario' : ' usuarios');

  let html = '';
  auth.users.forEach(function(u) {
    const isCurrent = u.username.toLowerCase() === (auth.currentUsername || '').toLowerCase();
    const roleLabel = u.role === 'admin' ? 'Administrador' : 'Operador';
    const roleBadgeClass = u.role === 'admin' ?
      'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' :
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

    html += '<div class="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-sm">' +
      '<div class="flex items-center gap-2 min-w-0">' +
        '<span class="text-base">👤</span>' +
        '<div class="min-w-0">' +
          '<div class="flex items-center gap-1.5">' +
            '<strong class="text-xs text-slate-900 dark:text-white font-bold truncate">' + escapeHtml(u.username) + '</strong>' +
            (isCurrent ? '<span class="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 rounded border border-emerald-200 dark:border-emerald-800">(Tú)</span>' : '') +
          '</div>' +
          '<span class="text-[10px] px-1.5 py-0.2 rounded border font-medium ' + roleBadgeClass + '">' + roleLabel + '</span>' +
        '</div>' +
      '</div>';

    if (!isCurrent && auth.users.length > 1) {
      html += '<button type="button" class="btn-delete-user px-2 py-1 rounded-lg text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 transition-colors" data-delete-user="' + escapeHtml(u.username) + '" title="Eliminar usuario">🗑️ Eliminar</button>';
    } else {
      html += '<span class="text-[10px] text-slate-400 italic">Activo</span>';
    }
    html += '</div>';
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-delete-user').forEach(function(btn) {
    on(btn, 'click', function() {
      handleDeleteUser(btn.getAttribute('data-delete-user'));
    });
  });
}

async function handleAddUser(e) {
  if (e) e.preventDefault();
  const userNameInput = $('inputAddUserName');
  const userPassInput = $('inputAddUserPass');
  const userRoleSelect = $('selectAddUserRole');
  if (!userNameInput || !userPassInput) return;

  const newName = (userNameInput.value || '').trim();
  const newPass = (userPassInput.value || '').trim();
  const newRole = userRoleSelect ? userRoleSelect.value : 'operador';

  if (!newName || !newPass) {
    showToast('Ingresa nombre de usuario y contraseña o PIN', 'warning');
    return;
  }

  const auth = getAuthData();
  const exists = auth.users.some(function(u) { return u.username.toLowerCase() === newName.toLowerCase(); });
  if (exists) {
    showToast('Ya existe un usuario con el nombre "' + newName + '"', 'warning');
    return;
  }

  const hash = await computeSha256(newPass);
  auth.users.push({
    username: newName,
    passwordHash: hash,
    role: newRole
  });
  saveAuthData(auth);

  userNameInput.value = '';
  userPassInput.value = '';

  renderUsersList();
  logActivity('Creación de Usuario', 'Nuevo usuario registrado: ' + newName + ' (' + newRole + ')');
  showToast('¡Usuario "' + newName + '" creado con éxito!', 'success');
}

function handleDeleteUser(usernameToDelete) {
  if (!usernameToDelete) return;
  if (!confirm('¿Estás seguro de que deseas eliminar al usuario "' + usernameToDelete + '"?')) return;

  const auth = getAuthData();
  auth.users = auth.users.filter(function(u) {
    return u.username.toLowerCase() !== usernameToDelete.toLowerCase();
  });
  saveAuthData(auth);

  renderUsersList();
  logActivity('Eliminación de Usuario', 'Usuario eliminado: ' + usernameToDelete);
  showToast('Usuario eliminado', 'info');
}

/* ============================================================
   Control de Sesión / Bloqueo y Login
   ============================================================ */
function checkAuthSession() {
  const auth = getAuthData();
  const now = Date.now();
  const label = $('currentUserLabel');
  if (label) label.textContent = auth.currentUsername || window.DEFAULT_USER;

  const overlay = $('loginOverlay');
  if (!overlay) return;

  if (auth.sessionToken && auth.sessionExpiry && now < auth.sessionExpiry) {
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
  } else {
    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    const userInput = $('loginUserInput');
    if (userInput) userInput.value = auth.currentUsername || window.DEFAULT_USER;
    const passInput = $('loginPassInput');
    if (passInput) setTimeout(function(){ passInput.focus(); }, 100);
  }
}

async function handleLoginSubmit(e) {
  if (e) e.preventDefault();
  const user = ($('loginUserInput').value || '').trim();
  const pass = ($('loginPassInput').value || '').trim();
  const remember = $('chkRememberMe') ? $('chkRememberMe').checked : true;
  const errorBox = $('loginErrorMsg');

  if (!user || !pass) {
    if (errorBox) {
      errorBox.textContent = 'Por favor ingresa tu usuario y contraseña o PIN';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  const auth = getAuthData();
  const passHash = await computeSha256(pass);

  const matched = auth.users.find(function(u) {
    return u.username.toLowerCase() === user.toLowerCase() && u.passwordHash === passHash;
  });

  if (matched) {
    auth.currentUsername = matched.username;
    auth.sessionToken = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    auth.sessionExpiry = remember ? (Date.now() + 30 * 24 * 60 * 60 * 1000) : (Date.now() + 12 * 60 * 60 * 1000);
    saveAuthData(auth);

    if (errorBox) errorBox.classList.add('hidden');
    $('loginPassInput').value = '';
    $('loginOverlay').classList.add('hidden');
    document.body.classList.remove('modal-open');

    const label = $('currentUserLabel');
    if (label) label.textContent = matched.username;

    logActivity('Inicio de Sesión', 'Acceso correcto con usuario: ' + matched.username + ' (' + matched.role + ')');
    showToast('¡Bienvenido al sistema, ' + matched.username + '!', 'success');
  } else {
    if (errorBox) {
      errorBox.textContent = 'Usuario o contraseña/PIN incorrectos';
      errorBox.classList.remove('hidden');
      errorBox.classList.remove('animate-shake');
      void errorBox.offsetWidth;
      errorBox.classList.add('animate-shake');
    }
    logActivity('Acceso Fallido', 'Intento incorrecto con usuario: ' + user);
  }
}

function handleLogout() {
  const auth = getAuthData();
  const prevUser = auth.currentUsername || 'admin';
  auth.sessionToken = null;
  auth.sessionExpiry = 0;
  saveAuthData(auth);

  logActivity('Cierre de Sesión', 'Usuario ' + prevUser + ' cerró sesión');
  showToast('Sesión cerrada correctamente', 'info');
  checkAuthSession();
}

async function handleUpdateCredentials(e) {
  if (e) e.preventDefault();
  const currentPass = ($('inputCurrentPass').value || '').trim();
  const newPass = ($('inputNewPass').value || '').trim();
  const confirmPass = ($('inputConfirmPass').value || '').trim();
  const alertBox = $('credsAlertMsg');

  function showAlert(msg, isSuccess) {
    if (!alertBox) return;
    alertBox.className = 'p-2 rounded-xl text-center font-semibold text-xs ' +
      (isSuccess ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-200 border border-emerald-200' :
                   'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-200 border border-red-200');
    alertBox.textContent = msg;
    alertBox.classList.remove('hidden');
  }

  if (!currentPass) { showAlert('Debes ingresar la contraseña actual para autorizar cambios', false); return; }
  if (!newPass) { showAlert('Ingresa una nueva contraseña o PIN', false); return; }
  if (newPass !== confirmPass) { showAlert('La nueva contraseña y su confirmación no coinciden', false); return; }

  const auth = getAuthData();
  const currentHash = await computeSha256(currentPass);
  const activeUser = auth.users.find(function(u) {
    return u.username.toLowerCase() === (auth.currentUsername || window.DEFAULT_USER).toLowerCase();
  });

  if (!activeUser || currentHash !== activeUser.passwordHash) {
    showAlert('La contraseña actual es incorrecta', false);
    return;
  }

  const newHash = await computeSha256(newPass);
  activeUser.passwordHash = newHash;
  saveAuthData(auth);

  $('inputCurrentPass').value = '';
  $('inputNewPass').value = '';
  $('inputConfirmPass').value = '';

  logActivity('Cambio de Contraseña', 'Contraseña actualizada para el usuario: ' + activeUser.username);
  showAlert('¡Contraseña actualizada exitosamente!', true);
  showToast('Contraseña actualizada con éxito', 'success');
}

function openSettingsModal() {
  const auth = getAuthData();
  const labelUser = $('labelPassChangeUser');
  if (labelUser) labelUser.textContent = auth.currentUsername || window.DEFAULT_USER;
  const alertBox = $('credsAlertMsg');
  if (alertBox) alertBox.classList.add('hidden');
  renderUsersList();
  switchSettingsTab('creds');
  renderAuditLogs();
  openModal('settingsModal');
}

function switchSettingsTab(tabKey) {
  const tabs = { creds: $('tabContentCreds'), log: $('tabContentLog'), cloud: $('tabContentCloud') };
  const btns = { creds: $('tabBtnCreds'), log: $('tabBtnLog'), cloud: $('tabBtnCloud') };
  Object.keys(tabs).forEach(function(k) {
    if (tabs[k]) {
      if (k === tabKey) tabs[k].classList.remove('hidden'); else tabs[k].classList.add('hidden');
    }
    if (btns[k]) {
      if (k === tabKey) btns[k].classList.add('is-active'); else btns[k].classList.remove('is-active');
    }
  });
  if (tabKey === 'log') renderAuditLogs();
  if (tabKey === 'creds') renderUsersList();
}

function toggleLoginPasswordVisibility() {
  const input = $('loginPassInput');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if ($('btnToggleLoginPass')) $('btnToggleLoginPass').textContent = '🙈';
  } else {
    input.type = 'password';
    if ($('btnToggleLoginPass')) $('btnToggleLoginPass').textContent = '👁️';
  }
}

