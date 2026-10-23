/* ============================================================
   RealScan Pro — Densidad 300 DPI en los metadatos JPEG
   Los canvas exportan JPEG sin cabecera de densidad (JFIF), y las
   imprentas/impresoras entonces asumen 72/96 DPI y la escala 1:1
   se pierde. Este parche escribe la densidad en el segmento APP0
   (unidades = puntos por pulgada) sin recomprimir la imagen.
   ============================================================ */
(function () {
  const DEFAULT_DPI = (typeof window !== 'undefined' && window.TARGET_DPI) || 300;

  function patchJpegDensity(bytes, dpi) {
    const density = Math.max(1, Math.round(dpi || DEFAULT_DPI));
    if (!bytes || bytes.length < 2 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) return bytes; // no es JPEG
    const hi = (density >> 8) & 0xFF;
    const lo = density & 0xFF;
    // ¿Ya trae un segmento APP0 JFIF tras el SOI?
    if (bytes.length > 21 && bytes[2] === 0xFF && bytes[3] === 0xE0) {
      const segLen = (bytes[4] << 8) | bytes[5];
      const isJfif = segLen >= 16 &&
        bytes[6] === 0x4A && bytes[7] === 0x46 && bytes[8] === 0x49 && bytes[9] === 0x46 && bytes[10] === 0x00;
      if (isJfif) {
        const out = bytes.slice();
        out[13] = 1; // unidades: puntos por pulgada
        out[14] = hi; out[15] = lo; // densidad X
        out[16] = hi; out[17] = lo; // densidad Y
        return out;
      }
    }
    // Sin APP0: se inserta uno nuevo justo después del SOI (FF D8).
    const app0 = new Uint8Array([
      0xFF, 0xE0, 0x00, 0x10, // marcador + longitud (16)
      0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
      0x01, 0x01, // versión 1.1
      0x01, hi, lo, hi, lo, // unidades=pulgadas, densidad X e Y
      0x00, 0x00 // sin miniatura
    ]);
    const out = new Uint8Array(bytes.length + app0.length);
    out.set(bytes.subarray(0, 2), 0);
    out.set(app0, 2);
    out.set(bytes.subarray(2), 2 + app0.length);
    return out;
  }

  async function blobWithDpi(blob, dpi) {
    if (!blob || (blob.type && blob.type !== 'image/jpeg')) return blob;
    const buffer = await blob.arrayBuffer();
    const patched = patchJpegDensity(new Uint8Array(buffer), dpi);
    return new Blob([patched], { type: 'image/jpeg' });
  }

  function dataUrlWithDpi(dataUrl, dpi) {
    if (typeof dataUrl !== 'string' || dataUrl.indexOf('data:image/jpeg') !== 0) return dataUrl;
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return dataUrl;
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const patched = patchJpegDensity(bytes, dpi);
    let out = '';
    const chunk = 0x8000;
    for (let i = 0; i < patched.length; i += chunk) {
      out += String.fromCharCode.apply(null, patched.subarray(i, i + chunk));
    }
    return 'data:image/jpeg;base64,' + btoa(out);
  }

  window.RealScanJpeg = {
    patchJpegDensity: patchJpegDensity,
    blobWithDpi: blobWithDpi,
    dataUrlWithDpi: dataUrlWithDpi
  };
})();
