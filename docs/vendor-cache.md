# Caché de `/vendor/` y carga bajo demanda (E3, auditoría 2026-10-30)

Verificado en código el 30-oct-2026. No se cambió ningún header: lo que sigue
es el estado real y por qué no se aplica `immutable` todavía.

## Carga bajo demanda: confirmada

- `js/vendor-loader.js` inyecta `vendor/jspdf.umd.min.js`, `vendor/jszip.min.js`
  y `vendor/jsqr.js` solo cuando una función las necesita (PDF, ZIP, lector QR).
- `js/segment-loader.js` hace lo mismo con el bundle MediaPipe
  (`vendor/segment/`).
- `scripts/build.cjs` excluye del precaché inicial del service worker:
  `vendor/ocr/`, `vendor/cmaps/`, `vendor/wasm/`, `vendor/segment/`,
  `vendor/jspdf.umd.min.js`, `vendor/jszip.min.js` y `vendor/jsqr.js`.
  Esos archivos se descargan en su primer uso y el SW los cachea entonces.
- `sw.js` cachea bajo demanda toda ruta `/vendor/` en un caché versionado:
  `CACHE_NAME` es el hash de versión del build y en `activate` se borran
  los cachés viejos que empiezan por `realscan-`. Cada build, por tanto,
  tiene su propio caché y no hay fugas entre versiones por esa vía.

## Caché HTTP: no inmutable (estado actual)

- `firebase.json` aplica `Cache-Control: no-cache` global (`**`), también a
  `/vendor/`. El navegador revalida en cada uso; no hay `max-age` largo ni
  `immutable` para vendor.
- Excepción: `vendor/qrcode.js` sí es una referencia estática en
  `index.html` y el build le añade `?v=<hash>` (versionAsset), así que esa
  URL sí está versionada por contenido.

## Por qué no se pone `immutable` en `/vendor/**` todavía

Las cargas dinámicas (vendor-loader, segment-loader, OCR, pdf.js) usan rutas
estables **sin** `?v=`. Un `immutable` HTTP sobreviviría al cambio de
versión del SW: el `fetch` que hace el SW pasa por la caché HTTP, así que
tras actualizar una librería de vendor el navegador podría seguir sirviendo
la versión vieja hasta un año aunque el caché del SW ya sea nuevo.

Camino seguro, pendiente: versionar las URLs dinámicas en el build
(por ejemplo, que vendor-loader reciba el `?v=` del build) y entonces sí
añadir en `firebase.json` una regla `/vendor/**` con
`Cache-Control: public, max-age=31536000, immutable` antes de la regla
global. Hasta entonces, `no-cache` + caché versionado del SW es la
combinación correcta: frescura sin riesgo de servir vendor obsoleto.
