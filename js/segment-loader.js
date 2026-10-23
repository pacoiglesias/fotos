/* ============================================================
   RealScan Pro — Fondo blanco con IA en el dispositivo
   Segmentación de persona con MediaPipe Tasks Vision
   (ImageSegmenter + modelo selfie_segmenter float16). Todo se
   sirve desde el propio dist (vendor/segment/): bundle JS, WASM
   y modelo .tflite. Sin servidores de terceros en tiempo de
   ejecución y sin enviar la foto a ningún sitio: la inferencia
   ocurre en este navegador. Se carga de forma diferida, con el
   mismo espíritu que js/vendor-loader.js, la primera vez que se
   pulsa «Fondo blanco»; el service worker cachea /vendor/ bajo
   demanda y la preparación sin conexión puede precachearlo
   (grupo SEGMENT de js/offline-setup.js).
   ============================================================ */
(function (root) {
  'use strict';

  var BUNDLE_PATH = 'vendor/segment/vision_bundle.mjs';
  var WASM_PATH = 'vendor/segment/wasm';
  var MODEL_PATH = 'vendor/segment/selfie_segmenter.tflite';
  var MAX_WORK_DIM = 1024;

  var segmenterPromise = null;
  var segmenterInstance = null;
  var lastStats = null;

  function localUrl(path) {
    return new URL(path, document.baseURI).href;
  }

  /* Carga (una sola vez) el bundle como módulo ES, resuelve el
     WASM desde vendor/segment/wasm y crea el segmentador con el
     modelo local. Rechaza si algo falla para que el llamador use
     el respaldo por inundación. */
  function ensureSegmenter() {
    if (segmenterInstance) return Promise.resolve(segmenterInstance);
    if (segmenterPromise) return segmenterPromise;
    segmenterPromise = (async function () {
      const mod = await import(localUrl(BUNDLE_PATH));
      const vision = await mod.FilesetResolver.forVisionTasks(localUrl(WASM_PATH));
      const segmenter = await mod.ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: localUrl(MODEL_PATH),
          delegate: 'CPU'
        },
        runningMode: 'IMAGE',
        // El modelo selfie_segmenter tiene una sola categoría («selfie»):
        // su máscara de categorías marca 0 en la persona y 255 en el
        // fondo, así que la señal útil es la máscara de confianza de la
        // categoría 0 (probabilidad de persona por píxel, 0..1), que
        // además ya trae el borde suave del propio modelo.
        outputCategoryMask: false,
        outputConfidenceMasks: true
      });
      segmenterInstance = segmenter;
      return segmenter;
    })().catch(function (err) {
      segmenterPromise = null;
      throw err;
    });
    return segmenterPromise;
  }

  function loadImage(source) {
    if (source && typeof source === 'object' && (source.naturalWidth || source.width)) {
      return Promise.resolve(source);
    }
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('No se pudo leer la foto para la IA.')); };
      img.src = source;
    });
  }

  /* Desenfoque de caja separable sobre el alfa: borde suave sin
     depender de ctx.filter (no disponible en todos los WebKit). */
  function boxBlurAlpha(src, w, h, radius) {
    const tmp = new Float32Array(src.length);
    const out = new Float32Array(src.length);
    const win = radius * 2 + 1;
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -radius; x <= radius; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / win;
        const xa = Math.max(0, x - radius), xb = Math.min(w - 1, x + radius + 1);
        acc += src[row + xb] - src[row + xa];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -radius; y <= radius; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / win;
        const ya = Math.max(0, y - radius), yb = Math.min(h - 1, y + radius + 1);
        acc += tmp[yb * w + x] - tmp[ya * w + x];
      }
    }
    return out;
  }

  /* Segmenta la foto y compone fondo blanco puro con borde suave.
     Devuelve un dataURL JPEG con la persona sobre blanco, o rechaza
     si la IA no está disponible o la máscara no es creíble. */
  async function createWhiteBackground(source) {
    const segmenter = await ensureSegmenter();
    const img = await loadImage(source);
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) throw new Error('Foto sin dimensiones para la IA.');
    const scale = Math.min(1, MAX_WORK_DIM / Math.max(iw, ih));
    const W = Math.max(2, Math.round(iw * scale)), H = Math.max(2, Math.round(ih * scale));

    const work = document.createElement('canvas');
    work.width = W; work.height = H;
    const wctx = work.getContext('2d', { willReadFrequently: true });
    wctx.drawImage(img, 0, 0, W, H);
    const original = wctx.getImageData(0, 0, W, H);

    const result = segmenter.segment(work);
    const mask = result && result.confidenceMasks && result.confidenceMasks[0];
    if (!mask) throw new Error('La IA no devolvió máscara.');
    const mw = mask.width, mh = mask.height;
    const values = mask.getAsFloat32Array();
    if (!mw || !mh || !values || values.length < mw * mh) throw new Error('Máscara de IA incompleta.');

    // Máscara a lienzo en su resolución nativa (probabilidad de persona).
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = mw; maskCanvas.height = mh;
    const mctx = maskCanvas.getContext('2d');
    const maskImg = mctx.createImageData(mw, mh);
    let fgNative = 0;
    for (let i = 0; i < mw * mh; i++) {
      const fg = Math.max(0, Math.min(255, Math.round(values[i] * 255)));
      if (values[i] > 0.5) fgNative++;
      maskImg.data[i * 4] = fg; maskImg.data[i * 4 + 1] = fg; maskImg.data[i * 4 + 2] = fg; maskImg.data[i * 4 + 3] = 255;
    }
    const fgRatioNative = fgNative / (mw * mh);
    if (fgRatioNative < 0.02 || fgRatioNative > 0.98) {
      throw new Error('La IA no encontró una persona clara en la foto.');
    }
    mctx.putImageData(maskImg, 0, 0);

    // Escalar la máscara a la resolución de trabajo y leer su alfa.
    const scaled = document.createElement('canvas');
    scaled.width = W; scaled.height = H;
    const sctx = scaled.getContext('2d', { willReadFrequently: true });
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(maskCanvas, 0, 0, W, H);
    const scaledData = sctx.getImageData(0, 0, W, H).data;
    let alpha = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) alpha[i] = scaledData[i * 4] / 255;

    // Borde suave: desenfoque corto y reasignación con ligera
    // contracción para que el color del fondo no deje halo.
    const radius = Math.max(1, Math.round(Math.min(W, H) / 220));
    alpha = boxBlurAlpha(alpha, W, H, radius);
    const out = wctx.createImageData(W, H);
    const d = original.data, o = out.data;
    let fgOut = 0;
    for (let i = 0; i < W * H; i++) {
      let a = (alpha[i] - 0.12) / 0.76;
      a = a < 0 ? 0 : (a > 1 ? 1 : a);
      if (a > 0.5) fgOut++;
      const j = i * 4, ia = 1 - a;
      o[j] = d[j] * a + 255 * ia;
      o[j + 1] = d[j + 1] * a + 255 * ia;
      o[j + 2] = d[j + 2] * a + 255 * ia;
      o[j + 3] = 255;
    }
    const fgRatio = fgOut / (W * H);
    if (fgRatio < 0.02 || fgRatio > 0.98) throw new Error('La composición con IA no es fiable.');
    lastStats = { maskWidth: mw, maskHeight: mh, workWidth: W, workHeight: H, foregroundRatio: Math.round(fgRatio * 1000) / 1000 };
    wctx.putImageData(out, 0, 0);
    return work.toDataURL('image/jpeg', 0.92);
  }

  root.ensureSegmenter = ensureSegmenter;
  root.createAiWhiteBackground = createWhiteBackground;
  root.RealScanSegmenter = {
    ensureSegmenter: ensureSegmenter,
    createWhiteBackground: createWhiteBackground,
    isReady: function () { return !!segmenterInstance; },
    lastStats: function () { return lastStats; }
  };
})(window);
