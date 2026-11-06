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
