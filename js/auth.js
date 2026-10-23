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

/* Hashes de las claves de fábrica que versiones anteriores traían publicadas.
   Se conservan SOLO como detector: si una instalación existente aún usa una de
   estas claves, se marca mustChangePassword y el acceso obliga a cambiarla antes
   de entrar. Nunca se usan para crear cuentas nuevas ni como credencial de
   respaldo: las instalaciones nuevas nacen sin usuarios y exigen crear la
   cuenta de administrador en el primer uso. El texto plano ya no existe en el
   código. */
const LEGACY_FACTORY_HASHES = [
  '1cfafff6d51a03662b85b93dc3417f51687034ba9a46682f5328257eff7133ed',
  '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab'
];
function isFactoryPasswordHash(hash) {
  return !!hash && LEGACY_FACTORY_HASHES.indexOf(hash) !== -1;
}

function getAuthData() {
  try {
    const raw = localStorage.getItem(window.AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
        // Migración: sin hash -> se asume clave de fábrica; con hash de fábrica ->
        // cambio obligatorio. NUNCA se reescribe el hash de una clave ya elegida
        // por el operador: su contraseña se respeta tal cual.
        let migrated = false;
        parsed.users.forEach(function(u) {
          if (!u.passwordHash) {
            u.passwordHash = LEGACY_FACTORY_HASHES[0];
            u.mustChangePassword = true;
            migrated = true;
          } else if (isFactoryPasswordHash(u.passwordHash) && u.mustChangePassword !== true) {
            u.mustChangePassword = true;
            migrated = true;
          }
        });
        if (migrated) {
          saveAuthData(parsed);
        }
        return parsed;
      }
    }
    // Migración automática desde v1 si existía
    const oldRaw = localStorage.getItem('realscan_auth_v1');
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      const oldHash = old.passwordHash || LEGACY_FACTORY_HASHES[0];
      const migrated = {
        users: [
          { username: old.username || window.DEFAULT_USER, passwordHash: oldHash, role: 'admin', mustChangePassword: isFactoryPasswordHash(oldHash) }
        ],
        currentUsername: old.username || window.DEFAULT_USER,
        sessionToken: old.sessionToken || null,
        sessionExpiry: old.sessionExpiry || 0
      };
      saveAuthData(migrated);
      return migrated;
    }
  } catch(e) {}
  // Instalación nueva: sin usuarios. La app exige crear la cuenta de
  // administrador en el primer uso (ver handleSetupSubmit); no hay ninguna
  // credencial por defecto.
  return {
    users: [],
    currentUsername: '',
    sessionToken: null,
    sessionExpiry: 0,
    needsSetup: true
  };
}

function saveAuthData(data) {
  try {
    localStorage.setItem(window.AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch(e) {}
}

/* Política mínima para claves nuevas: 6+ caracteres y nunca una clave de fábrica. */
async function validateNewPassword(newPass) {
  if (!newPass || newPass.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  const hash = await computeSha256(newPass);
  if (isFactoryPasswordHash(hash)) return 'Esa es la clave de fábrica antigua. Elige una contraseña distinta.';
  return null;
}

/* Confirmación con el diálogo propio de la app; degrada a confirm() nativo solo
   si el módulo de diálogos no está cargado (p. ej. pruebas unitarias). */
async function askConfirmDialog(message, options) {
  if (typeof showConfirmDialog === 'function') return showConfirmDialog(message, options);
  if (typeof confirm === 'function') return confirm(message);
  return false;
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
  // Neutraliza celdas que una hoja de cálculo interpretaría como fórmula (=, +, -, @).
  function csvCell(value) {
    let v = String(value == null ? '' : value);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return '"' + v.replace(/"/g, '""') + '"';
  }
  let csv = '\uFEFF"ID","Fecha","Hora","Usuario","Acción","Detalles"\n';
  logs.forEach(function(l) {
    const d = new Date(l.timestamp);
    const fDate = d.toLocaleDateString('es-MX');
    const fTime = d.toLocaleTimeString('es-MX');
    csv += csvCell(l.id) + ',' + csvCell(fDate) + ',' + csvCell(fTime) + ',' + csvCell(l.user || '') + ',' + csvCell(l.action || '') + ',' + csvCell(l.details || '') + '\n';
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

async function clearAuditLog() {
  const ok = await askConfirmDialog('¿Estás seguro de que deseas vaciar la bitácora de auditoría? Esta acción no se puede deshacer.', { danger: true, confirmText: 'Vaciar bitácora' });
  if (!ok) return;
  localStorage.removeItem(window.AUDIT_STORAGE_KEY);
  renderAuditLogs();
  logActivity('Bitácora Vaciada', 'El historial fue reiniciado manualmente');
  showToast('Bitácora limpiada', 'info');
}

/* ============================================================
   Gestión de Usuarios, Roles y Permisos
   ============================================================ */
function getCurrentUserRole() {
  const auth = getAuthData();
  const currentName = (auth.currentUsername || window.DEFAULT_USER || '').toLowerCase();
  const found = auth.users.find(function(u) {
    return u.username.toLowerCase() === currentName;
  });
  return found ? (found.role || 'operador') : 'operador';
}

function isCurrentUserAdmin() {
  return getCurrentUserRole() === 'admin';
}

function renderUsersList() {
  const container = $('usersListContainer');
  const badge = $('usersCounterBadge');
  if (!container) return;
  const auth = getAuthData();
  const isAdmin = isCurrentUserAdmin();

  if (badge) badge.textContent = auth.users.length + (auth.users.length === 1 ? ' usuario' : ' usuarios');

  // Reflejar permisos en el formulario de creación de usuario
  const formAdd = $('formAddUser');
  const btnAdd = $('btnAddUserSubmit');
  const roleSelect = $('selectAddUserRole');
  const nameInput = $('inputAddUserName');
  const passInput = $('inputAddUserPass');

  if (formAdd) {
    let permNotice = $('addUserPermissionNotice');
    if (!isAdmin) {
      if (btnAdd) btnAdd.disabled = true;
      if (roleSelect) roleSelect.disabled = true;
      if (nameInput) nameInput.disabled = true;
      if (passInput) passInput.disabled = true;
      if (!permNotice) {
        permNotice = document.createElement('p');
        permNotice.id = 'addUserPermissionNotice';
        permNotice.className = 'text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-800';
        permNotice.textContent = '🔒 Modo Operador: solo los administradores tienen permiso para crear o eliminar usuarios.';
        formAdd.appendChild(permNotice);
      }
    } else {
      if (btnAdd) btnAdd.disabled = false;
      if (roleSelect) roleSelect.disabled = false;
      if (nameInput) nameInput.disabled = false;
      if (passInput) passInput.disabled = false;
      if (permNotice && permNotice.parentNode) {
        permNotice.parentNode.removeChild(permNotice);
      }
    }
  }

  const adminCount = auth.users.filter(function(u) { return u.role === 'admin'; }).length;

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

    // Botón de eliminar solo visible y habilitado si el usuario activo es admin
    if (isAdmin && !isCurrent && auth.users.length > 1) {
      const isSoleAdmin = (u.role === 'admin' && adminCount <= 1);
      if (isSoleAdmin) {
        html += '<span class="text-[10px] text-amber-500 font-medium" title="No se puede eliminar el único administrador">Único Admin</span>';
      } else {
        html += '<button type="button" class="btn-delete-user px-2 py-1 rounded-lg text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 transition-colors" data-delete-user="' + escapeHtml(u.username) + '" title="Eliminar usuario">🗑️ Eliminar</button>';
      }
    } else if (isCurrent) {
      html += '<span class="text-[10px] text-slate-400 italic">Sesión activa</span>';
    } else {
      html += '<span class="text-[10px] text-slate-400 italic">Protegido</span>';
    }
    html += '</div>';
  });

  container.innerHTML = html;

  if (isAdmin) {
    container.querySelectorAll('.btn-delete-user').forEach(function(btn) {
      on(btn, 'click', function() {
        handleDeleteUser(btn.getAttribute('data-delete-user'));
      });
    });
  }
}

async function handleAddUser(e) {
  if (e) e.preventDefault();

  if (!isCurrentUserAdmin()) {
    showToast('Acceso denegado: solo administradores pueden crear usuarios', 'error');
    if (typeof alert === 'function') alert('Operación no permitida: solo los administradores tienen permiso para registrar nuevos usuarios.');
    return;
  }

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

  const policyError = await validateNewPassword(newPass);
  if (policyError) {
    showToast(policyError, 'warning');
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

async function handleDeleteUser(usernameToDelete) {
  if (!usernameToDelete) return;

  if (!isCurrentUserAdmin()) {
    showToast('Acceso denegado: solo administradores pueden eliminar usuarios', 'error');
    if (typeof alert === 'function') alert('Operación no permitida: solo los administradores tienen permiso para eliminar usuarios.');
    return;
  }

  const auth = getAuthData();
  const targetUser = auth.users.find(function(u) {
    return u.username.toLowerCase() === usernameToDelete.toLowerCase();
  });

  if (!targetUser) {
    showToast('El usuario no existe', 'warning');
    return;
  }

  // Protección de continuidad: al menos un administrador activo
  if (targetUser.role === 'admin') {
    const adminCount = auth.users.filter(function(u) { return u.role === 'admin'; }).length;
    if (adminCount <= 1) {
      showToast('No se puede eliminar al único administrador del sistema', 'error');
      if (typeof alert === 'function') alert('Operación bloqueada: debe existir al menos un administrador activo en el sistema para garantizar el acceso.');
      return;
    }
  }

  const confirmedDelete = await askConfirmDialog('¿Estás seguro de que deseas eliminar al usuario "' + usernameToDelete + '"?', { danger: true, confirmText: 'Eliminar usuario' });
  if (!confirmedDelete) return;

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
/* Muestra uno de los tres paneles del overlay de acceso:
   'login' (acceso normal), 'setup' (primer uso, crear administrador) o
   'change' (cambio de contraseña obligatorio). */
function showLoginPanel(panel) {
  const panels = { login: $('loginForm'), setup: $('setupForm'), change: $('forcedChangeForm') };
  Object.keys(panels).forEach(function(key) {
    if (panels[key]) panels[key].classList.toggle('hidden', key !== panel);
  });
  const hint = $('loginFooterHint');
  if (hint) hint.textContent = panel === 'setup'
    ? 'Primer uso: crea la cuenta de administrador. Sin ella no se puede entrar.'
    : 'Acceso protegido por usuario y contraseña.';
}

function checkAuthSession() {
  const auth = getAuthData();
  const now = Date.now();
  const label = $('currentUserLabel');
  if (label) label.textContent = auth.currentUsername || window.DEFAULT_USER;

  const overlay = $('loginOverlay');
  if (!overlay) return;

  // Sin usuarios: primer uso obligatorio (crear administrador).
  if (!auth.users || auth.users.length === 0) {
    if (typeof closeAllModals === 'function') closeAllModals();
    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    showLoginPanel('setup');
    const setupUser = $('setupUserInput');
    if (setupUser && !setupUser.value) setupUser.value = window.DEFAULT_USER;
    const setupPass = $('setupPassInput');
    if (setupPass && setupPass.focus) setTimeout(function(){ setupPass.focus(); }, 100);
    return;
  }

  if (auth.sessionToken && auth.sessionExpiry && now < auth.sessionExpiry) {
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    armIdleLockTimer();
  } else {
    if (typeof closeAllModals === 'function') closeAllModals();
    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    showLoginPanel(pendingForcedChangeUser ? 'change' : 'login');
    const userInput = $('loginUserInput');
    if (userInput) userInput.value = auth.currentUsername || window.DEFAULT_USER;
    const passInput = $('loginPassInput');
    if (passInput && passInput.focus) setTimeout(function(){ passInput.focus(); }, 100);
  }
}

/* ---------- Configuración inicial (primer uso, sin credencial por defecto) ---------- */
async function createInitialAdmin(username, password) {
  const auth = getAuthData();
  if (auth.users && auth.users.length > 0) throw new Error('Ya existe una cuenta configurada.');
  const name = (username || '').trim();
  if (!name) throw new Error('Ingresa un nombre de usuario.');
  const policyError = await validateNewPassword(password);
  if (policyError) throw new Error(policyError);
  const hash = await computeSha256(password);
  const data = {
    users: [{ username: name, passwordHash: hash, role: 'admin', mustChangePassword: false }],
    currentUsername: name,
    sessionToken: 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2),
    sessionExpiry: Date.now() + 12 * 60 * 60 * 1000
  };
  saveAuthData(data);
  return data;
}

async function handleSetupSubmit(e) {
  if (e) e.preventDefault();
  const errorBox = $('setupErrorMsg');
  function fail(msg) {
    if (errorBox) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); }
  }
  const user = ($('setupUserInput').value || '').trim();
  const pass = $('setupPassInput').value || '';
  const confirmPass = $('setupPassConfirmInput').value || '';
  if (pass !== confirmPass) { fail('La contraseña y su confirmación no coinciden.'); return; }
  try {
    const data = await createInitialAdmin(user, pass);
    if (errorBox) errorBox.classList.add('hidden');
    $('setupPassInput').value = '';
    $('setupPassConfirmInput').value = '';
    $('loginOverlay').classList.add('hidden');
    document.body.classList.remove('modal-open');
    const label = $('currentUserLabel');
    if (label) label.textContent = data.currentUsername;
    logActivity('Configuración Inicial', 'Cuenta de administrador creada: ' + data.currentUsername);
    showToast('Cuenta creada. ¡Bienvenido a RealScan Pro, ' + data.currentUsername + '!', 'success');
    armIdleLockTimer();
  } catch (err) {
    fail(err.message || 'No se pudo crear la cuenta.');
  }
}

/* ---------- Límite de intentos de acceso ---------- */
function getAuthGuard() {
  try {
    return JSON.parse(localStorage.getItem(window.AUTH_GUARD_KEY || 'realscan_auth_guard_v1') || '{}') || {};
  } catch (e) { return {}; }
}
function saveAuthGuard(guard) {
  try { localStorage.setItem(window.AUTH_GUARD_KEY || 'realscan_auth_guard_v1', JSON.stringify(guard)); } catch (e) {}
}
function loginLockRemainingMs(username) {
  const entry = getAuthGuard()[(username || '').toLowerCase()];
  if (!entry || !entry.lockedUntil) return 0;
  return Math.max(0, entry.lockedUntil - Date.now());
}
function registerLoginFailure(username) {
  const guard = getAuthGuard();
  const key = (username || '').toLowerCase();
  const maxAttempts = window.AUTH_MAX_FAILED_ATTEMPTS || 5;
  const lockoutMs = window.AUTH_LOCKOUT_MS || 5 * 60 * 1000;
  const entry = guard[key] || { fails: 0, lockedUntil: 0 };
  entry.fails = (entry.fails || 0) + 1;
  if (entry.fails >= maxAttempts) {
    entry.lockedUntil = Date.now() + lockoutMs;
    entry.fails = 0;
  }
  guard[key] = entry;
  saveAuthGuard(guard);
  return entry.lockedUntil > Date.now() ? entry.lockedUntil : 0;
}
function clearLoginFailures(username) {
  const guard = getAuthGuard();
  delete guard[(username || '').toLowerCase()];
  saveAuthGuard(guard);
}

/* ---------- Entrada con sesión (compartido por login y cambio forzado) ---------- */
let pendingForcedChangeUser = null;
function grantSession(auth, matched, remember) {
  auth.currentUsername = matched.username;
  auth.sessionToken = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2);
  auth.sessionExpiry = remember ? (Date.now() + 30 * 24 * 60 * 60 * 1000) : (Date.now() + 12 * 60 * 60 * 1000);
  saveAuthData(auth);
  const overlay = $('loginOverlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.classList.remove('modal-open');
  const label = $('currentUserLabel');
  if (label) label.textContent = matched.username;
  armIdleLockTimer();
}

async function handleLoginSubmit(e) {
  if (e) e.preventDefault();
  const user = ($('loginUserInput').value || '').trim();
  const pass = ($('loginPassInput').value || '').trim();
  const remember = $('chkRememberMe') ? $('chkRememberMe').checked : true;
  const errorBox = $('loginErrorMsg');

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.classList.remove('hidden');
      errorBox.classList.remove('animate-shake');
      void errorBox.offsetWidth;
      errorBox.classList.add('animate-shake');
    }
  }

  if (!user || !pass) {
    showError('Por favor ingresa tu usuario y contraseña o PIN');
    return;
  }

  const auth = getAuthData();
  if (!auth.users || auth.users.length === 0) {
    showLoginPanel('setup');
    return;
  }

  const lockMs = loginLockRemainingMs(user);
  if (lockMs > 0) {
    showError('Demasiados intentos fallidos. Espera ' + Math.ceil(lockMs / 60000) + ' minuto(s) antes de volver a intentarlo.');
    return;
  }

  const passHash = await computeSha256(pass);
  const matched = auth.users.find(function(u) {
    return u.username.toLowerCase() === user.toLowerCase() && u.passwordHash === passHash;
  });

  if (matched) {
    clearLoginFailures(user);
    if (errorBox) errorBox.classList.add('hidden');
    $('loginPassInput').value = '';

    // Cambio obligatorio: la sesión NO se concede hasta fijar una clave nueva.
    if (matched.mustChangePassword === true) {
      pendingForcedChangeUser = matched.username;
      showLoginPanel('change');
      const newPassInput = $('forcedNewPassInput');
      if (newPassInput && newPassInput.focus) setTimeout(function(){ newPassInput.focus(); }, 100);
      logActivity('Cambio Obligatorio Pendiente', 'El usuario ' + matched.username + ' debe cambiar la clave de fábrica antes de entrar');
      return;
    }

    grantSession(auth, matched, remember);
    logActivity('Inicio de Sesión', 'Acceso correcto con usuario: ' + matched.username + ' (' + matched.role + ')');
    showToast('¡Bienvenido al sistema, ' + matched.username + '!', 'success');
  } else {
    const lockedUntil = registerLoginFailure(user);
    if (lockedUntil) {
      showError('Demasiados intentos fallidos. Acceso bloqueado temporalmente por seguridad.');
    } else {
      showError('Usuario o contraseña/PIN incorrectos');
    }
    logActivity('Acceso Fallido', 'Intento incorrecto con usuario: ' + user);
  }
}

/* ---------- Cambio de contraseña obligatorio (clave de fábrica) ---------- */
async function handleForcedChangeSubmit(e) {
  if (e) e.preventDefault();
  const errorBox = $('forcedErrorMsg');
  function fail(msg) {
    if (errorBox) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); }
  }
  const newPass = $('forcedNewPassInput').value || '';
  const confirmPass = $('forcedConfirmPassInput').value || '';
  if (newPass !== confirmPass) { fail('La nueva contraseña y su confirmación no coinciden.'); return; }
  const policyError = await validateNewPassword(newPass);
  if (policyError) { fail(policyError); return; }

  const auth = getAuthData();
  const targetName = pendingForcedChangeUser || auth.currentUsername || '';
  const target = auth.users.find(function(u) {
    return u.username.toLowerCase() === targetName.toLowerCase();
  });
  if (!target) { fail('No se encontró el usuario. Vuelve a iniciar sesión.'); showLoginPanel('login'); return; }

  target.passwordHash = await computeSha256(newPass);
  target.mustChangePassword = false;
  pendingForcedChangeUser = null;
  $('forcedNewPassInput').value = '';
  $('forcedConfirmPassInput').value = '';
  if (errorBox) errorBox.classList.add('hidden');

  const remember = $('chkRememberMe') ? $('chkRememberMe').checked : false;
  grantSession(auth, target, remember);
  logActivity('Cambio de Contraseña Obligatorio', 'Clave de fábrica reemplazada para el usuario: ' + target.username);
  showToast('Contraseña actualizada. ¡Bienvenido, ' + target.username + '!', 'success');
}

/* ---------- Bloqueo automático del mostrador por inactividad ---------- */
let idleLockTimer = null;
let lastIdleRearm = 0;
function getIdleLockMinutes() {
  try {
    const prefs = JSON.parse(localStorage.getItem(window.PREFS_KEY || 'realscan_prefs_v2') || '{}');
    if (typeof prefs.idleLockMinutes === 'number' && isFinite(prefs.idleLockMinutes)) {
      return Math.max(0, prefs.idleLockMinutes);
    }
  } catch (e) {}
  return (typeof window.IDLE_LOCK_DEFAULT_MINUTES === 'number') ? window.IDLE_LOCK_DEFAULT_MINUTES : 10;
}
function setIdleLockMinutes(minutes) {
  try {
    const key = window.PREFS_KEY || 'realscan_prefs_v2';
    const prefs = JSON.parse(localStorage.getItem(key) || '{}');
    prefs.idleLockMinutes = Math.max(0, Number(minutes) || 0);
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch (e) {}
}
function armIdleLockTimer() {
  if (idleLockTimer) { clearTimeout(idleLockTimer); idleLockTimer = null; }
  const minutes = getIdleLockMinutes();
  if (!minutes || minutes <= 0) return;
  const auth = getAuthData();
  if (!auth.sessionToken) return;
  idleLockTimer = setTimeout(lockScreenForInactivity, minutes * 60 * 1000);
  // En entornos Node (suites de regresión) el temporizador no debe retener el
  // proceso; en el navegador setTimeout devuelve un número y esto no actúa.
  if (idleLockTimer && typeof idleLockTimer.unref === 'function') idleLockTimer.unref();
}
function lockScreenForInactivity() {
  const auth = getAuthData();
  if (!auth.sessionToken) return;
  auth.sessionToken = null;
  auth.sessionExpiry = 0;
  saveAuthData(auth);
  logActivity('Bloqueo Automático', 'Sesión bloqueada por inactividad');
  showToast('Sesión bloqueada por inactividad. Ingresa de nuevo para continuar.', 'info');
  checkAuthSession();
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  ['pointerdown', 'keydown', 'touchstart'].forEach(function(evt) {
    document.addEventListener(evt, function() {
      const now = Date.now();
      if (now - lastIdleRearm < 5000) return;
      lastIdleRearm = now;
      armIdleLockTimer();
    }, { passive: true });
  });
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

  const isAuthorized = activeUser && (currentHash === activeUser.passwordHash);
  if (!isAuthorized) {
    showAlert('La contraseña actual es incorrecta', false);
    return;
  }

  const factoryError = await validateNewPassword(newPass);
  if (factoryError) {
    showAlert(factoryError, false);
    return;
  }

  const newHash = await computeSha256(newPass);
  activeUser.passwordHash = newHash;
  activeUser.mustChangePassword = false;
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
  const activeUser = auth.users.find(function(u) { return u.username.toLowerCase() === (auth.currentUsername || window.DEFAULT_USER).toLowerCase(); });
  if (alertBox) {
    if (activeUser && activeUser.mustChangePassword) {
      alertBox.textContent = '⚠️ Estás usando la clave inicial. Por seguridad, cámbiala ahora.';
      alertBox.className = 'p-2 rounded-xl text-center font-semibold text-xs bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-200 border border-amber-200';
      alertBox.classList.remove('hidden');
    } else {
      alertBox.classList.add('hidden');
    }
  }
  renderUsersList();
  switchSettingsTab('creds');
  renderAuditLogs();
  openModal('settingsModal');
  const idleSelect = $('selectIdleLockMinutes');
  if (idleSelect) {
    idleSelect.value = String(getIdleLockMinutes());
    if (!idleSelect.dataset.bound) {
      idleSelect.dataset.bound = '1';
      idleSelect.addEventListener('change', function() {
        setIdleLockMinutes(parseInt(idleSelect.value, 10));
        armIdleLockTimer();
        showToast(idleSelect.value === '0'
          ? 'Bloqueo por inactividad desactivado.'
          : 'La pantalla se bloqueará tras ' + idleSelect.value + ' min sin uso.', 'success');
      });
    }
  }
}

function switchSettingsTab(tabKey) {
  const tabs = { creds: $('tabContentCreds'), log: $('tabContentLog'), storage: $('tabContentStorage'), audio: $('tabContentAudio'), cloud: $('tabContentCloud') };
  const btns = { creds: $('tabBtnCreds'), log: $('tabBtnLog'), storage: $('tabBtnStorage'), audio: $('tabBtnAudio'), cloud: $('tabBtnCloud') };
  Object.keys(tabs).forEach(function(k) {
    if (tabs[k]) {
      if (k === tabKey) tabs[k].classList.remove('hidden'); else tabs[k].classList.add('hidden');
    }
    if (btns[k]) {
      if (k === tabKey) btns[k].classList.add('is-active'); else btns[k].classList.remove('is-active');
    }
  });
  if (tabKey === 'log') { renderAuditLogs(); window.RealScanDiagnostics?.render(); }
  if (tabKey === 'creds') renderUsersList();
  if (tabKey === 'storage' && typeof updateStorageTelemetryUI === 'function') updateStorageTelemetryUI();
  if (tabKey === 'audio') {
    const chk = $('checkAudioEnabled');
    const rng = $('rangeAudioVolume');
    const lbl = $('labelAudioVolume');
    if (chk && window.state) chk.checked = !!window.state.audioFeedbackEnabled;
    if (rng && window.state) {
      const volPct = Math.round((Number.isFinite(window.state.audioVolume) ? window.state.audioVolume : 0.7) * 100);
      rng.value = volPct;
      if (lbl) lbl.textContent = volPct + '%';
    }
  }
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

if (typeof window !== 'undefined') {
  window.getCurrentUserRole = getCurrentUserRole;
  window.isCurrentUserAdmin = isCurrentUserAdmin;
  window.handleAddUser = handleAddUser;
  window.handleDeleteUser = handleDeleteUser;
  window.renderUsersList = renderUsersList;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeSha256,
    getAuthData,
    saveAuthData,
    getCurrentUserRole,
    isCurrentUserAdmin,
    handleAddUser,
    handleDeleteUser,
    renderUsersList,
    handleLoginSubmit,
    handleLogout
  };
}

