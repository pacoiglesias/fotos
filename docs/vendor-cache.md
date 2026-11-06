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

## Caché HTTP: immutable solo para los archivos versionables (desde oleada 2, 6-nov-2026)

- `scripts/build.cjs` (B5) versiona las URLs dinámicas de `/vendor/` con
  `?v=<hash de contenido>` en el build, igual que `versionAsset` hace con
  las estáticas: `js/vendor-loader.js` (jsPDF, JSZip, jsQR),
  `js/segment-loader.js` (bundle MediaPipe y modelo `.tflite`),
  `js/pdf-loader.mjs` + `js/document-tools.js` + `js/pdf-delivery.js`
  (`pdf.mjs` y `pdf.worker.mjs`), `js/local-ocr.js`,
  `js/searchable-pdf.js` y `js/doc-identify.js` (`tesseract.min.js` y
  `worker.min.js`), y `js/offline-setup.js` (sus grupos OCR/EXPORT/SEGMENT
  usan las mismas URLs versionadas que los cargadores: la clave de caché
  debe ser idéntica en ambos, si no el modo sin conexión falla).
- `firebase.json` (y `firebase.secondary.json`, mismo `dist/`) añaden
  reglas `Cache-Control: public, max-age=31536000, immutable` **antes**
  de la regla global, acotadas a los archivos versionables:
  `/vendor/*.@(js|mjs)`, `/vendor/segment/*.@(mjs|tflite)` y
  `/vendor/ocr/*.js`. La regla global `no-cache` sigue aplicando al resto.
- **Desviación del plan E3 (deliberada):** el plan decía una regla
  `/vendor/**`. No se aplica a todo `/vendor/` porque las bases de
  directorio no pueden llevar `?v=`: las librerías construyen las rutas
  de `vendor/segment/wasm/`, `vendor/ocr/core/`, `vendor/ocr/lang/`,
  `vendor/cmaps/` y `vendor/standard_fonts/` a partir de una ruta base,
  y un `?v=` en la base se pierde al resolver la URL. Con `immutable`
  sobre esas rutas, un cambio de versión de npm (tesseract.js, pdfjs-dist,
  tasks-vision) serviría los ficheros viejos hasta un año. Esos
  directorios quedan bajo `no-cache` + caché versionado del SW, como
  antes. Solo cambian al subir la versión del paquete npm que los genera.
- `scripts/check-build.cjs` verifica el versionado: cada URL de la lista
  B5 debe aparecer versionada en `dist/` y ninguna sin versionar.
- **B6 revisado:** `pdf.mjs` sí se precachea, en su forma versionada
  (`./vendor/pdf.mjs?v=<hash>`): el lector debe existir sin conexión
  desde el arranque y el calentamiento perezoso puede correr antes de que
  el SW tome el control. El worker (`pdf.worker.mjs`) y las fuentes
  estándar no se precachean (bajo demanda, como el OCR).
- **Grupo PDF en la preparación offline:** la fuente del PDF buscable
  (`vendor/standard_fonts/LiberationSans-Regular.ttf`, 136 KB) se descarga
  con «Preparar sin conexión» (`js/offline-setup.js`, grupo `PDF`,
  obligatorio como OCR y EXPORT). Sin ella, guardar un PDF buscable sin
  conexión fallaba sin descarga. La cadena es idéntica a la que pide
  `searchable-pdf.js`, así que preparación y uso comparten clave de caché.
- **Regla de oro del versionado:** una URL se versiona solo si el runtime
  la pide con esa misma cadena. `worker.min.js` de Tesseract se versiona
  en `local-ocr.js`, `doc-identify.js`, `searchable-pdf.js` (su
  `workerPath`) y en el grupo OCR de `offline-setup.js`: si un solo sitio
  quedara sin versionar, su petición sin `?v=` no encontraría la copia
  versionada de la preparación y el OCR fallaría sin conexión (pasó con
  `searchable-pdf.js` y se corrigió). Los ficheros que las librerías
  cargan desde una ruta base (core/lang de OCR, wasm de segment, cmaps,
  resto de standard_fonts) quedan sin versionar por diseño.

## Por qué no se pone `immutable` en `/vendor/**` (todo el árbol)

Las cargas dinámicas (vendor-loader, segment-loader, OCR, pdf.js) usan rutas
estables **sin** `?v=` para los ficheros que las librerías resuelven desde
una ruta base (ver arriba). Un `immutable` HTTP sobreviviría al cambio de
versión del SW: el `fetch` que hace el SW pasa por la caché HTTP, así que
tras actualizar una librería de vendor el navegador podría seguir sirviendo
la versión vieja hasta un año aunque el caché del SW ya sea nuevo. Por eso
`immutable` solo cubre los archivos con URL versionada por contenido.
