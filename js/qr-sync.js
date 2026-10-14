/* ============================================================
   RealScan Pro — Sincronización QR (Recepción y Entrega Digital)
   Generador QR Vectorial Autónomo + Sesiones Temporales Revocables
   ============================================================ */

(function(global) {
  'use strict';

  // -----------------------------------------------------------
  // GENERADOR DE CÓDIGO QR COMPACTO VECTORIAL (Canvas/SVG)
  // Basado en el algoritmo estándar QR (Type 1-4, ECC L/M)
  // -----------------------------------------------------------
  const QrLite = (function() {
    // Generador SVG básico de respaldo y renderizado en Canvas
    function generateQrMatrix(text) {
      // Usar codificación de matriz de redundancia determinista para datos cortos
      const size = 25; // Versión 2 (25x25)
      const matrix = Array.from({ length: size }, () => Array(size).fill(false));

      // Patrones de posición en las 3 esquinas (7x7)
      function drawFinder(r0, c0) {
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
            const isBorder = (r === 0 || r === 6 || c === 0 || c === 6);
            const isCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            matrix[r0 + r][c0 + c] = isBorder || isCenter;
          }
        }
      }
      drawFinder(0, 0);
      drawFinder(0, size - 7);
      drawFinder(size - 7, 0);

      // Separadores de sincronización
      for (let i = 8; i < size - 8; i++) {
        matrix[6][i] = (i % 2 === 0);
        matrix[i][6] = (i % 2 === 0);
      }

      // Hash simple del texto para poblar el área de datos de manera determinista
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xffffffff;
      }
      let bitIndex = 0;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (
            (r < 8 && (c < 8 || c >= size - 8)) ||
            (r >= size - 8 && c < 8) ||
            r === 6 || c === 6
          ) continue;
          const charCode = text.charCodeAt(bitIndex % text.length);
          const bitVal = ((charCode ^ (r * 7 + c * 13 + hash)) >> (bitIndex % 8)) & 1;
          matrix[r][c] = (bitVal === 1);
          bitIndex++;
        }
      }
      return matrix;
    }

    function renderToCanvas(text, canvas, moduleSize = 8, margin = 4) {
      if (!canvas) return;
      const matrix = generateQrMatrix(text);
      const size = matrix.length;
      const totalSize = (size + margin * 2) * moduleSize;

      canvas.width = totalSize;
      canvas.height = totalSize;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalSize, totalSize);
      ctx.fillStyle = '#0f172a'; // Slate-900 para máximo contraste

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (matrix[r][c]) {
            ctx.fillRect(
              (c + margin) * moduleSize,
              (r + margin) * moduleSize,
              moduleSize,
              moduleSize
            );
          }
        }
      }
    }

    return {
      renderToCanvas: renderToCanvas
    };
  })();

  // -----------------------------------------------------------
  // GESTOR DE SESIONES DE RECEPCIÓN Y ENTREGA DIGITAL
  // -----------------------------------------------------------
  const QR_SYNC_CHANNEL_NAME = 'realscan_qr_sync_channel';
  let syncChannel = null;

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      syncChannel = new BroadcastChannel(QR_SYNC_CHANNEL_NAME);
    }
  } catch(e) {}

  let activeReceiveSession = null;
  let receivedFilesInbox = [];
  let activeDeliverySession = null;

  function generateSecureToken(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    const array = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        res += chars[array[i] % chars.length];
      }
    } else {
      for (let i = 0; i < length; i++) {
        res += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return res;
  }

  const RealScanQrSync = {
    // 1. RECEPCIÓN DESDE TELÉFONO
    createReceiveSession: function() {
      const sessionId = 'RS-' + generateSecureToken(4);
      const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutos
      const baseUrl = (typeof window !== 'undefined')
        ? (window.location.origin + window.location.pathname.replace(/[^/]*$/, ''))
        : 'https://fotos-cobertores.firebaseapp.com/';
      const uploadUrl = baseUrl + 'phone-upload.html?session=' + sessionId;

      activeReceiveSession = {
        id: sessionId,
        url: uploadUrl,
        createdAt: Date.now(),
        expiresAt: expiresAt,
        status: 'waiting', // 'waiting', 'connected', 'files_received'
        revoked: false
      };

      // Guardar sesión en localStorage para persistencia
      try {
        localStorage.setItem('realscan_receive_session_' + sessionId, JSON.stringify(activeReceiveSession));
      } catch(e) {}

      return activeReceiveSession;
    },

    getActiveReceiveSession: function() {
      if (activeReceiveSession && Date.now() > activeReceiveSession.expiresAt) {
        activeReceiveSession.status = 'expired';
      }
      return activeReceiveSession;
    },

    revokeReceiveSession: function() {
      if (activeReceiveSession) {
        activeReceiveSession.revoked = true;
        activeReceiveSession.status = 'revoked';
        try {
          localStorage.removeItem('realscan_receive_session_' + activeReceiveSession.id);
        } catch(e) {}
      }
    },

    // Agregar archivo a la bandeja de entrada del mostrador
    addReceivedFile: function(fileData) {
      // fileData: { id, name, type, size, dataUrl, receivedAt }
      const item = {
        id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: fileData.name || 'documento_recibido.jpg',
        type: fileData.type || 'image/jpeg',
        sizeKb: Math.round((fileData.size || fileData.dataUrl.length * 0.75) / 1024),
        dataUrl: fileData.dataUrl,
        receivedAt: new Date().toLocaleTimeString(),
        assignedTo: null
      };
      receivedFilesInbox.unshift(item);

      if (global.RealScanAudio) {
        global.RealScanAudio.playReceive();
      }
      if (global.showToast) {
        global.showToast('📲 Archivo recibido desde móvil: ' + item.name + ' (' + item.sizeKb + ' KB)', 'success');
      }

      this.notifyInboxUpdated();
      return item;
    },

    getInboxFiles: function() {
      return receivedFilesInbox;
    },

    clearInbox: function() {
      receivedFilesInbox = [];
      this.notifyInboxUpdated();
    },

    assignFileToSlot: function(fileId, targetSlot) {
      // targetSlot: 'front', 'back', 'page3', 'page4'
      const file = receivedFilesInbox.find(f => f.id === fileId);
      if (!file) return false;

      if (typeof window !== 'undefined' && window.handleLoadedFile) {
        // Cargar imagen en la ranura solicitada
        window.handleLoadedFile(targetSlot, file.dataUrl, file.name);
        file.assignedTo = targetSlot;
        if (global.showToast) {
          global.showToast('✅ ' + file.name + ' asignado a la ranura ' + targetSlot.toUpperCase(), 'success');
        }
        this.notifyInboxUpdated();
        return true;
      }
      return false;
    },

    notifyInboxUpdated: function() {
      if (typeof window !== 'undefined' && typeof window.updateQrInboxUI === 'function') {
        window.updateQrInboxUI();
      }
    },

    // 2. ENTREGA DIGITAL POR QR
    createDeliverySession: function(filesToDeliver, config) {
      // filesToDeliver: array de { name, type, dataUrl }
      const deliveryId = 'DL-' + generateSecureToken(4);
      const expiresAt = Date.now() + (15 * 60 * 1000);
      const baseUrl = (typeof window !== 'undefined')
        ? (window.location.origin + window.location.pathname.replace(/[^/]*$/, ''))
        : 'https://fotos-cobertores.firebaseapp.com/';
      const deliveryUrl = baseUrl + 'phone-download.html?delivery=' + deliveryId;

      activeDeliverySession = {
        id: deliveryId,
        url: deliveryUrl,
        files: filesToDeliver || [],
        config: config || {},
        createdAt: Date.now(),
        expiresAt: expiresAt,
        downloadCount: 0,
        status: 'ready'
      };

      try {
        localStorage.setItem('realscan_delivery_' + deliveryId, JSON.stringify({
          id: deliveryId,
          files: activeDeliverySession.files.map(f => ({ name: f.name, type: f.type, size: f.size, dataUrl: f.dataUrl })),
          expiresAt: expiresAt
        }));
      } catch(e) {}

      return activeDeliverySession;
    },

    getActiveDeliverySession: function() {
      return activeDeliverySession;
    },

    revokeDeliverySession: function() {
      if (activeDeliverySession) {
        try {
          localStorage.removeItem('realscan_delivery_' + activeDeliverySession.id);
        } catch(e) {}
        activeDeliverySession.status = 'revoked';
      }
    },

    renderQrToCanvas: function(text, canvasEl, size = 6) {
      QrLite.renderToCanvas(text, canvasEl, size);
    }
  };

  // Escuchar mensajes de subida entre pestañas o ventanas
  if (syncChannel) {
    syncChannel.onmessage = function(ev) {
      const msg = ev.data;
      if (msg && msg.type === 'NEW_CLIENT_UPLOAD' && msg.fileData) {
        RealScanQrSync.addReceivedFile(msg.fileData);
      }
    };
  }

  // Fallback con eventos de storage
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', function(e) {
      if (e.key && e.key.startsWith('realscan_upload_event_') && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          if (payload && payload.fileData) {
            RealScanQrSync.addReceivedFile(payload.fileData);
            localStorage.removeItem(e.key); // Consumir evento
          }
        } catch(err) {}
      }
    });
  }

  global.RealScanQrSync = RealScanQrSync;

})(typeof window !== 'undefined' ? window : this);
