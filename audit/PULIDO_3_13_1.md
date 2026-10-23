# Pulido, optimización y elevación visual/iPhone — v3.13.1

Pasada de pulido sobre la v3.13.0 (GitHub `main` = `dcae071`), a petición de
Paco (22-oct-2026): «Déjala súper pulida, mejorada y optimizada»,
«Visualmente y operativamente debe ser espectacular» y «Optimizada para el
iPhone». Alcance cerrado: sin funciones nuevas, sin tocar el login/deploy de
Firebase ni los PNG de `assets/icons/` en `main`.

## 1. Hallazgo de la pasada (bug corregido)

`scripts/build.cjs` **no copiaba `css/polish.css` a `dist/`**, aunque
`index.html` la enlaza. En producción, la hoja de los temas de color, el foco
visible global, las micro-animaciones y la marca de éxito (AÑADIDOS 11 y 12)
habría devuelto 404 y no se habría aplicado nada de esa capa visual. La sonda
613 que lo habría cazado nunca pudo ejecutarse (ver §6). Corregido: el build
copia `polish.css` y entra en `dist` y en el precaché (+7,490 B, asumidos:
es el coste de que la capa exista de verdad). Se comprobó el resto de la
lista del build contra todo lo referenciado por las 5 páginas HTML: es el
único fichero que faltaba.

## 2. Optimización (cifras antes/después)

Método: réplica exacta de la lista de ficheros que produce `build.cjs`
medida sobre las fuentes (la réplica suma 294 ficheros, los mismos que el
build real de la v3.13.0). No se incluyen la salida de Tailwind ni el bundle
de Firebase: se generan en el build y no cambian en esta pasada. El gzip se
midió fichero a fichero.

| Magnitud | Antes (v3.13.0) | Después (v3.13.1) | Delta |
| --- | ---: | ---: | ---: |
| Primera carga (HTML + CSS + JS enlazados) | 1,359,336 B | 1,105,216 B | **−254,120 B (−18.7 %)** |
| Primera carga en gzip (lo que viaja por la red) | 338,269 B | 281,868 B | **−56,401 B (−16.7 %)** |
| Precaché del service worker (instalación) | 6,232,185 B | 5,464,861 B | **−767,324 B (−12.3 %)** |
| Tamaño total de `dist/` | 59,415,361 B | 59,422,868 B | +7,507 B (+0.01 %) |
| Scripts síncronos al arrancar | 49 | 48 | −1 |

Cómo se consiguió:

- **jsQR (256,885 B) sale de la primera carga y del precaché.** Solo lo usa
  el botón «Leer QR de respuesta con cámara» de la transferencia local.
  Nuevo `ensureJsQR()` en `js/vendor-loader.js` (mismo patrón que
  `ensureJsPdf`/`ensureJSZip`) y carga previa en `scan()` de
  `js/local-transfer-ui.js`, con mensaje claro en español si la primera
  descarga falla. La etiqueta `<script src="vendor/jsqr.js">` desaparece de
  `index.html`.
- **jsPDF (420,165 B) y JSZip (97,781 B) salen del precaché.** Ya eran de
  carga diferida en la página; el filtro `__CORE_ASSETS__` de `build.cjs`
  los seguía precargando al instalar. Ahora el SW los cachea en el primer
  uso (su manejador de `fetch` ya cachea todo `/vendor/`), como el OCR.
- **Sin código muerto que retirar:** los 50 ficheros de `js/` están
  referenciados por alguna de las 5 páginas (comprobado uno a uno).
- `qrcode.js` (56,694 B) **se mantiene síncrono a propósito**: lo usa la
  ruta de emparejamiento P2P con una API síncrona; diferirlo exigiría
  reescribir ese flujo, fuera del alcance de una pasada de pulido.
- El total de `dist/` no baja (y no era el objetivo): el volumen es vendor
  diferido (OCR 45 MB, pdf.js) que no se descarga ni al instalar ni al
  arrancar; baja lo que sí se descarga en ambos momentos.

## 3. Pulido

- **Versión alineada a 3.13.1** en `package.json`, `package-lock.json` y
  `window.APP_VERSION` (`js/config.js`). La suite `test_entrega3_preview`
  exige que paquete y `APP_VERSION` coincidan: detectó el desfase durante
  esta pasada y quedó corregido y reverificado (14/14).
- **Textos:** barrido de las etiquetas visibles de `index.html`: ortografía
  y acentos consistentes, sin correcciones necesarias. Las cadenas
  dinámicas no se tocaron (las afirman las suites).
- **Estados de control uniformes:** `:disabled` con opacidad y cursor
  coherentes en toda la app; el foco de campos (input/select/textarea)
  tiñe el borde con el acento del tema, a juego con el anillo
  `:focus-visible` ya existente.
- **Historial:** botones de acción a ≥44 px en pantallas táctiles (estaban
  a ~30 px) y `content-visibility: auto` en los trabajos para que las
  listas largas deslicen fluidas en el iPhone.

## 4. Elevación visual y operativa

Todo en la capa `css/polish.css` (la última hoja en cargarse), sin tocar la
arquitectura ni los componentes:

- **Escala de sombras única** `--rs-shadow-sm/md/lg`: tarjetas y hoja en
  `md`, paneles de modal en `lg`, coherente en los 5 temas y en oscuro.
- **Ritmo tipográfico:** titulares con `letter-spacing` uniforme y
  `text-wrap: balance` (sin líneas huérfanas en pantallas estrechas).
- **Confirmaciones con presencia:** la tarjeta de éxito ✓ gana un borde
  fino que la separa del fondo en ambos modos.
- **Sin callejones:** los modales contienen su propio scroll
  (`overscroll-behavior: contain`): el fondo ya no se mueve al llegar al
  final de una lista dentro de un diálogo.
- **Movimiento sobrio:** las animaciones siguen usando solo
  `transform`/`opacity` (60 fps) y ahora se apagan de verdad cuando el
  sistema pide `prefers-reduced-motion: reduce` (antes solo se contenían
  las que nacieron con esa guarda).
- **Arranque sin destello blanco:** el fondo del documento es ya el de la
  app antes del primer pintado, en claro (`#f8fafc`) y en oscuro
  (`#020617`).

## 5. Optimización iPhone (frente propio)

- **Áreas seguras:** ya existían `env(safe-area-inset-*)` en la barra HUD,
  las acciones de escaneo y los diálogos. Se añade la barra de pasos
  guiados (`top: env(safe-area-inset-top)`, no queda bajo el notch) y el
  `padding-top` del cuerpo en `display-mode: standalone`. El botón de
  cámara del diálogo de escaneo ya quedaba sobre el área segura por el
  relleno del propio diálogo (verificado en su CSS).
- **Alturas dinámicas (dvh):** `min-h-screen` del cuerpo y los techos de
  los modales (`max-h` 60/62/90/92/95 vh) pasan a `dvh` tras
  `@supports (min-height: 100dvh)`: se acabaron los saltos cuando la
  barra de Safari aparece y desaparece.
- **Barra de estado con el tema:** `js/theme.js` ahora actualiza el
  `meta theme-color` con el acento del tema elegido (en modo oscuro manda
  el fondo oscuro, como ya hacía el script de arranque). La PWA instalada
  se ve de una pieza en los 5 temas. Manifest e iconos, correctos y sin
  cambios; `apple-touch-icon` 180 presente.
- **Toque:** `touch-action: manipulation` en todos los controles
  (respuesta inmediata, sin zoom por doble toque accidental); campos a
  16 px en puntero grueso para que iOS no haga zoom al enfocar un campo;
  objetivos ≥44 px también en el historial.
- **Cámara en iOS:** la lógica de captura y el fix de cámara de la
  auditoría quedan intactos. La carga diferida de jsQR no toca
  `getUserMedia`: el lector se descarga antes de abrir la cámara y solo
  en el flujo de emparejamiento local.
- **Peso iPhone:** la primera carga queda en ~282 KB gzip (ver §2),
  pensada para la red móvil de la tienda.
- **Revisión visual:** ESTÁTICA (CSS), sin capturas — ver §6.
...[truncated 2783 chars]