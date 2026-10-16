/* ============================================================
   RealScan Pro — Módulo de Edición Avanzada, Recorte y Perspectiva
   Desarrollado por Paco Iglesias • Escala 1:1 Calibrada
   ============================================================ */

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RealScanEditor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  /* ============================================================
     1. HISTORIAL DE EDICIÓN (UNDO / REDO) POR RANURA
     ============================================================ */
  const slotHistories = {
    front: { past: [], future: [], maxLimit: 25 },
    back:  { past: [], future: [], maxLimit: 25 },
    page3: { past: [], future: [], maxLimit: 25 },
    page4: { past: [], future: [], maxLimit: 25 }
  };

  function cloneSlotState(imgState) {
    if (!imgState) return null;
    return {
      originalSrc: imgState.originalSrc || null,
      rawOriginalSrc: imgState.rawOriginalSrc || null,
      croppedSrc: imgState.croppedSrc || null,
      naturalWidth: imgState.naturalWidth || 0,
      naturalHeight: imgState.naturalHeight || 0,
      cropData: imgState.cropData ? JSON.parse(JSON.stringify(imgState.cropData)) : null,
      isCropApplied: imgState.isCropApplied !== false,
      rotation: imgState.rotation || 0,
      zoom: imgState.zoom || 1.0,
      fitMode: imgState.fitMode || 'cover',
      filter: imgState.filter || 'color',
      panX: imgState.panX || 0,
      panY: imgState.panY || 0,
      brightness: imgState.brightness || 0,
      contrast: imgState.contrast || 0,
      showMmGrid: !!imgState.showMmGrid,
      showOaciGuide: !!imgState.showOaciGuide,
      perspectiveQuad: imgState.perspectiveQuad ? JSON.parse(JSON.stringify(imgState.perspectiveQuad)) : null
    };
  }

  function recordSnapshot(side, imgState) {
    if (!slotHistories[side]) return;
    const snap = cloneSlotState(imgState);
    if (!snap || !snap.originalSrc) return;
    
    // Evitar registrar snapshots duplicados consecutivos
    const past = slotHistories[side].past;
    if (past.length > 0) {
      const prev = past[past.length - 1];
      if (JSON.stringify(prev) === JSON.stringify(snap)) return;
    }

    past.push(snap);
    if (past.length > slotHistories[side].maxLimit) {
      past.shift();
    }
    // Toda nueva acción invalida la pila futura (redo)
    slotHistories[side].future = [];
  }

  function undo(side, currentImgState) {
    if (!slotHistories[side] || slotHistories[side].past.length === 0) return null;
    const history = slotHistories[side];
    const previous = history.past.pop();
    if (currentImgState) {
      history.future.push(cloneSlotState(currentImgState));
    }
    return previous;
  }

  function redo(side, currentImgState) {
    if (!slotHistories[side] || slotHistories[side].future.length === 0) return null;
    const history = slotHistories[side];
    const next = history.future.pop();
    if (currentImgState) {
      history.past.push(cloneSlotState(currentImgState));
    }
    return next;
  }

  function canUndo(side) {
    return !!(slotHistories[side] && slotHistories[side].past.length > 0);
  }

  function canRedo(side) {
    return !!(slotHistories[side] && slotHistories[side].future.length > 0);
  }

  function clearHistory(side) {
    if (slotHistories[side]) {
      slotHistories[side].past = [];
      slotHistories[side].future = [];
    }
  }

  function clearAllHistory() {
    Object.keys(slotHistories).forEach(function(side) {
      clearHistory(side);
    });
  }

  /* ============================================================
     2. RECORTE RECTANGULAR PRECISO (CROP)
     ============================================================ */
  function cropImageRegion(sourceImg, cropBox) {
    // cropBox: { x, y, width, height } en coordenadas naturales de sourceImg
    const canvas = document.createElement('canvas');
    const x = Math.max(0, Math.min(sourceImg.naturalWidth - 1, Math.round(cropBox.x || 0)));
    const y = Math.max(0, Math.min(sourceImg.naturalHeight - 1, Math.round(cropBox.y || 0)));
    const w = Math.max(1, Math.min(sourceImg.naturalWidth - x, Math.round(cropBox.width || sourceImg.naturalWidth)));
    const h = Math.max(1, Math.min(sourceImg.naturalHeight - y, Math.round(cropBox.height || sourceImg.naturalHeight)));

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImg, x, y, w, h, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.96);
  }

  /* ============================================================
     3. CORRECCIÓN DE PERSPECTIVA (4 PUNTOS / HOMOGRAFÍA PROYECTIVA)
     ============================================================ */
  // Resuelve sistema 8x8 para encontrar matriz H de perspectiva (p1..p4 -> (0,0),(W,0),(W,H),(0,H))
  function getPerspectiveTransform(srcQuad, dstW, dstH) {
    // srcQuad: [{x,y}, {x,y}, {x,y}, {x,y}] (TL, TR, BR, BL)
    const dstQuad = [
      { x: 0, y: 0 },
      { x: dstW, y: 0 },
      { x: dstW, y: dstH },
      { x: 0, y: dstH }
    ];

    // Construcción del sistema lineal 8x8 A * h = b
    const A = [];
    const B = [];
    for (let i = 0; i < 4; i++) {
      const sx = srcQuad[i].x;
      const sy = srcQuad[i].y;
      const dx = dstQuad[i].x;
      const dy = dstQuad[i].y;

      A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
      B.push(dx);
      A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
      B.push(dy);
    }

    // Eliminación Gaussiana simple para 8 incógnitas
    const n = 8;
    for (let i = 0; i < n; i++) {
      let maxEl = Math.abs(A[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > maxEl) {
          maxEl = Math.abs(A[k][i]);
          maxRow = k;
        }
      }
      for (let k = i; k < n; k++) {
        const tmp = A[maxRow][k];
        A[maxRow][k] = A[i][k];
        A[i][k] = tmp;
      }
      const tmpB = B[maxRow];
      B[maxRow] = B[i];
      B[i] = tmpB;

      if (Math.abs(A[i][i]) < 1e-12) return null; // Matriz singular

      for (let k = i + 1; k < n; k++) {
        const c = -A[k][i] / A[i][i];
        for (let j = i; j < n; j++) {
          if (i === j) A[k][j] = 0;
          else A[k][j] += c * A[i][j];
        }
        B[k] += c * B[i];
      }
    }

    const h = new Array(9);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) sum += A[i][j] * h[j];
      h[i] = (B[i] - sum) / A[i][i];
    }
    h[8] = 1.0; // Normalización estándar

    return h;
  }

  // Invierte una matriz 3x3 para backward pixel mapping
  function invert3x3(m) {
    const a = m[0], b = m[1], c = m[2];
    const d = m[3], e = m[4], f = m[5];
    const g = m[6], h = m[7], k = m[8];

    const A = e * k - f * h;
    const B = -(d * k - f * g);
    const C = d * h - e * g;
    const D = -(b * k - c * h);
    const E = a * k - c * g;
    const F = -(a * h - b * g);
    const G = b * f - c * e;
    const H = -(a * f - c * d);
    const K = a * e - b * d;

    const det = a * A + b * B + c * C;
    if (Math.abs(det) < 1e-12) return null;

    const invDet = 1.0 / det;
    return [
      A * invDet, D * invDet, G * invDet,
      B * invDet, E * invDet, H * invDet,
      C * invDet, F * invDet, K * invDet
    ];
  }

  // Aplica corrección de perspectiva por mapeo inverso bilineal de alta fidelidad
  function warpPerspective(sourceImg, srcQuad, targetW, targetH) {
    const H = getPerspectiveTransform(srcQuad, targetW, targetH);
    if (!H) return null;
    const Hinv = invert3x3(H);
    if (!Hinv) return null;

    // Canvas origen
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = sourceImg.naturalWidth;
    srcCanvas.height = sourceImg.naturalHeight;
    const sCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    sCtx.drawImage(sourceImg, 0, 0);
    const sData = sCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const sPixels = sData.data;
    const sw = srcCanvas.width;
    const sh = srcCanvas.height;

    // Canvas destino
    const dstCanvas = document.createElement('canvas');
    dstCanvas.width = targetW;
    dstCanvas.height = targetH;
    const dCtx = dstCanvas.getContext('2d', { willReadFrequently: true });
    const dData = dCtx.createImageData(targetW, targetH);
    const dPixels = dData.data;

    // Backward mapping píxel a píxel con interpolación bilineal
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const dIdx = (y * targetW + x) * 4;

        // Proyección inversa: (x, y, 1) -> (sx', sy', sw')
        const wx = Hinv[0] * x + Hinv[1] * y + Hinv[2];
        const wy = Hinv[3] * x + Hinv[4] * y + Hinv[5];
        const w  = Hinv[6] * x + Hinv[7] * y + Hinv[8];

        if (Math.abs(w) < 1e-9) continue;
        const sx = wx / w;
        const sy = wy / w;

        if (sx >= 0 && sx < sw - 1 && sy >= 0 && sy < sh - 1) {
          const x0 = Math.floor(sx);
          const y0 = Math.floor(sy);
          const x1 = x0 + 1;
          const y1 = y0 + 1;
          const dx = sx - x0;
          const dy = sy - y0;

          const idx00 = (y0 * sw + x0) * 4;
          const idx10 = (y0 * sw + x1) * 4;
          const idx01 = (y1 * sw + x0) * 4;
          const idx11 = (y1 * sw + x1) * 4;

          for (let c = 0; c < 3; c++) {
            const val = (1 - dx) * (1 - dy) * sPixels[idx00 + c] +
                        dx * (1 - dy) * sPixels[idx10 + c] +
                        (1 - dx) * dy * sPixels[idx01 + c] +
                        dx * dy * sPixels[idx11 + c];
            dPixels[dIdx + c] = Math.round(val);
          }
          dPixels[dIdx + 3] = 255;
        } else {
          // Fondo blanco fuera de los límites del documento
          dPixels[dIdx] = 255;
          dPixels[dIdx + 1] = 255;
          dPixels[dIdx + 2] = 255;
          dPixels[dIdx + 3] = 255;
        }
      }
    }

    dCtx.putImageData(dData, 0, 0);
    return dstCanvas.toDataURL('image/jpeg', 0.96);
  }

  /* ============================================================
     4. COMPENSADOR ADAPTATIVO DE SOMBRA Y FLASH (AUTO-LIGHT)
     ============================================================ */
  function computeAdaptiveLighting(sourceImg) {
    try {
      const canvas = document.createElement('canvas');
      const sampleW = 200;
      const sampleH = Math.round((sourceImg.naturalHeight / sourceImg.naturalWidth) * sampleW) || 150;
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(sourceImg, 0, 0, sampleW, sampleH);
      const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
      const d = imgData.data;

      let sumLum = 0;
      const lums = [];
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        sumLum += lum;
        lums.push(lum);
      }

      const count = lums.length;
      if (count === 0) return { brightness: 0, contrast: 0, advice: 'Normal' };

      const meanLum = sumLum / count;
      lums.sort((a, b) => a - b);
      const p10 = lums[Math.floor(count * 0.10)];
      const p90 = lums[Math.floor(count * 0.90)];
      const dynamicRange = p90 - p10;

      let brightnessDelta = 0;
      let contrastDelta = 0;
      let advice = 'Iluminación balanceada';

      // 1. Imagen oscura / tomada en sombra
      if (meanLum < 110) {
        brightnessDelta = Math.min(35, Math.round((140 - meanLum) * 0.45));
        contrastDelta = 15;
        advice = '☀️ Sombra detectada: aclarado adaptativo +' + brightnessDelta + '%';
      }
      // 2. Imagen con flash quemado o sobreexpuesta
      else if (meanLum > 195) {
        brightnessDelta = Math.max(-25, Math.round((170 - meanLum) * 0.35));
        contrastDelta = 20;
        advice = '🌙 Reflejo/Flash detectado: compensación suave ' + brightnessDelta + '%';
      }
      // 3. Imagen lavada / bajo contraste
      else if (dynamicRange < 110) {
        contrastDelta = Math.min(30, Math.round((140 - dynamicRange) * 0.4));
        advice = '🔆 Bajo contraste detectado: realce de nitidez +' + contrastDelta + '%';
      }

      return {
        brightness: brightnessDelta,
        contrast: contrastDelta,
        meanLum: Math.round(meanLum),
        dynamicRange: Math.round(dynamicRange),
        advice: advice
      };
    } catch (e) {
      return { brightness: 0, contrast: 0, advice: 'Sin cambios' };
    }
  }

  /* ============================================================
     5. REORDENAMIENTO E INTERCAMBIO DE PÁGINAS (SWAP & REORDER)
     ============================================================ */
  function swapSlotData(slotA, slotB) {
    if (!slotA || !slotB) return false;
    const temp = JSON.parse(JSON.stringify(slotA));
    Object.assign(slotA, slotB);
    Object.assign(slotB, temp);
    return true;
  }

  return {
    recordSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    clearAllHistory,
    cropImageRegion,
    getPerspectiveTransform,
    invert3x3,
    warpPerspective,
    computeAdaptiveLighting,
    swapSlotData
  };
});
