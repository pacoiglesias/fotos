# Empaquetar el JS propio (E2, auditoría 2026-10-30)

## Medición en memoria (30-oct-2026, sin build de despliegue)

- 77 scripts propios de `index.html` concatenados en su orden de carga:
  **1.146.969 bytes** en crudo → **809.552 bytes** minificados con esbuild
  (−29,4 %, −337 KB).
- El tag número 78, `js/firebase-transfer.js`, **no existe en el repo**: lo
  genera esbuild en el build desde `src/firebase-transfer.js` y solo existe
  en `dist/`. En el build real debe concatenarse desde `dist/` en su
  posición de `index.html`, después del paso esbuild y antes del
  fingerprint de URLs.

## Pruebas en memoria (sin ejecutar, sin escribir)

- El concatenado crudo compila (`vm.Script`) sin errores: no hay
  colisiones de `let`/`const`/`class` de nivel superior entre archivos.
- El minificado también compila.
- Ningún archivo tiene prólogo `'use strict'` de nivel superior (no hay
  riesgo de que el bundle entero se vuelva estricto).
- Solo `js/image-enhance.js` usa `document.currentScript` (para resolver
  `image-enhance-worker.js`): desde un bundle en `js/` la resolución
  relativa sigue cayendo en `js/image-enhance-worker.js`, así que es seguro.
- `qrcode()` solo se usa dentro de funciones (tiempo de ejecución) en
  `counter-operations.js`, `local-transfer.js` y `qr-sync.js`: el orden
  relativo con `vendor/qrcode.js` (tag estático entre los propios) no
  afecta a la carga.
- Carga perezosa intacta por diseño: `duplex-assistant.js`,
  `calibration-wizard.js` y `photo-finish.js` no son tags de `index.html`
  y quedarían fuera del bundle, igual que todo `vendor/`.

## Implementado en la oleada 2 (6-nov-2026, B4)

1. En `scripts/build.cjs`, después del esbuild de `firebase-transfer.js`
   y del versionado B5, antes del fingerprint: se lee `dist/index.html`,
   se concatenan los `dist/js/*.js` en orden (excluyendo `.mjs`), se
   minifican con esbuild `transform`, se escribe `dist/js/bundle.js` y se
   sustituyen los 84 tags por uno solo en la posición del primero,
   manteniendo `pdf-loader.mjs` y `vendor/qrcode.js` en su sitio. El
   fingerprint existente le pone `?v=<hash>` automáticamente.
2. Atribución del diagnóstico resuelta con lista de basenames: el tag del
   bundle lleva `data-bundle-files` con los 84 nombres originales y
   `js/diagnostics.js` (`cleanDetails()`) lo consulta además de
   `document.scripts`, así que `navigation-regression.cjs` sigue viendo
   `file: 'app.js'` en su error sintético. `scripts/check-build.cjs`
   verifica que `index.html` tenga exactamente un tag `js/bundle.js`
   con `data-bundle-files` y ningún otro `js/*.js`.
3. **Los ficheros individuales se quedan en `dist/`**: las páginas del
   teléfono (`phone-upload/download/local`, `mobile-scan`) cargan
   directamente muchos de esos `js/*.js`; borrarlos las rompería. El
   bundle se precachea junto a ellos. El precaché pasa de 8,97 MB a
   7,25 MB: B6 quita 3,24 MB (worker de pdf.js 2,42 + fuentes estándar
   0,82) y B4 añade ~1,22 MB de bundle; el núcleo pdf.mjs (1,07 MB) se
   queda precacheado en su forma versionada (ver B6 revisado abajo). El
   arranque de `index.html` pasa de 86 peticiones de scripts a 3 (bundle
   + `pdf-loader.mjs` + `qrcode.js`).
4. `verify.cjs` completo en verde contra el `dist` con bundle, antes de
   la revisión y el despliegue con OK.

## B6 revisado (tras el verify de la oleada 2)

El plan pedía sacar del precaché `pdf.mjs`, `pdf.worker.mjs` y las
fuentes estándar. El verify demostró que sin `pdf.mjs` precacheado el
lector no existe sin conexión en una instalación nueva
(`regression.cjs`: `window.pdfjsLib` tras recargar sin red): el
calentamiento perezoso de `pdf-loader.mjs` puede correr antes de que el
SW tome el control, así que su descarga en línea no llega al caché del
SW. Por eso `pdf.mjs` **sí** se precachea, pero en su forma versionada
(`./vendor/pdf.mjs?v=<hash>`, la URL que piden los cargadores B5): la
forma sin versionar no se precachea porque nada en la app la pide ya.
El worker y las fuentes siguen bajo demanda (primer uso sin conexión de
dibujar un PDF o de un PDF buscable necesita un uso previo en línea;
después el SW los sirve sin conexión). `scripts/check-build.cjs`
verifica que el SW precachee `pdf.mjs` versionado y que no precachee el
worker ni las fuentes.

## B6 segunda revisión (tras el verify: PDF buscable sin conexión)

El verify, ya con B1 corregido, mostró que el PDF buscable sin conexión
tampoco se descargaba (`mobile-local-regression.cjs`: espera de descarga
de 120 s). Dos causas encadenadas, ambas de claves de caché:

1. La fuente `LiberationSans-Regular.ttf` (136 KB) no estaba ni en el
   precaché (B6 la sacó) ni en la preparación offline (no había grupo
   PDF en `offline-setup.js`). Solución: grupo `PDF` obligatorio en
   `offline-setup.js` (se descarga con «Preparar sin conexión», como OCR
   y EXPORT); la fila aparece en el diálogo de escritorio y la condición
   de «preparado» la incluye en escritorio y en `mobile-scan.js`.
2. `worker.min.js` de Tesseract: B5 lo versionó en `offline-setup.js`,
   `local-ocr.js` y `doc-identify.js`, pero no en `searchable-pdf.js`,
   que lo pedía sin `?v=` mientras la preparación guardaba la forma
   versionada. Solución: versionarlo también en `searchable-pdf.js`.
   Regla: una URL se versiona solo si el runtime la pide con esa misma
   cadena en todos los sitios.

## Por qué NO se conmuta `index.html` al bundle todavía

1. **Sin verificación real**: el build borra `dist/` antes de escribir y
   está prohibido durante la oleada EPERM; sin un build real no se puede
   probar que la app arranque con el bundle.
2. **Atribución del diagnóstico**: `navigation-regression.cjs` comprueba
   un error sintético con `file: 'app.js'` y `line: 777`. Con bundle,
   `document.scripts` ya no incluye `app.js` y `cleanDetails()` descartaría
   el campo `file` (y las líneas reales cambiarían). Exige un cambio
   acompañante: o una lista de basenames del bundle en `cleanDetails()`,
   o actualizar el test. No se hace a ciegas.
3. **Beneficio modesto**: el SW ya precachea todo tras la primera visita;
   el bundle solo ahorra peticiones en la primera carga.
4. **Riesgo del árbol**: un cambio de arquitectura sin verificar en el
   árbol de trabajo lo recogería el próximo publish.

## Plan exacto cuando levante la oleada

1. En `scripts/build.cjs`, después del esbuild de `firebase-transfer.js` y
   antes del fingerprint: leer `dist/index.html`, concatenar los
   `dist/js/*.js` en orden (excluyendo `.mjs`), minificar con esbuild
   `transform`, escribir `dist/js/bundle.js` y sustituir los 78 tags por
   uno solo en la posición del primero, manteniendo `pdf-loader.mjs` y
   `vendor/qrcode.js` en su sitio. El fingerprint existente le pondrá
   `?v=<hash>` automáticamente.
2. Resolver el punto 2 de arriba (cleanDetails o test).
3. `verify.cjs` completo en verde contra el `dist` con bundle.
4. Solo entonces, revisión y despliegue con OK.
