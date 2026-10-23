# RealScan Pro v3.14.0 — Pasada de perfeccionamiento

**Fecha:** 23-oct-2026 · **Rama:** `fix/perfeccionamiento-3-14` · **Base:** snapshot `ff907f3` (estado desplegado v3.13.1, confirmado antes de tocar nada)

## Motivo

Feedback de Paco probando la v3.13.1 en su iPhone: «¿No ibas a hacer menús desplegables y demás cosas?», «déjalo todo perfecto y mejorado», «que visualmente se vea todo más fácil y mejor», y el refuerzo de acabado: profesional y moderno, «como un sistema perfecto y moderno», nivel SaaS / Genius Scan Pro.

## Criterio de diseño aplicado

Un solo lenguaje en toda la pantalla inicial: radio de 16 px en los bloques principales, la sombra media del sistema (`--rs-shadow-md`), el color de acento del tema como único color de marca, jerarquía clara con la siguiente acción obvia y estados de control inconfundibles. Profesional = sobrio: sin degradados de juguete ni un color por tarjeta. La simplicidad visual manda: profesional no significa recargado.

## Diagnóstico medido (sonda Playwright, 390×844, dist servido en local)

| Métrica | v3.13.1 | v3.14.0 |
|---|---|---|
| Altura de la cabecera en móvil | 159 px | **118 px** |
| Inicio del bloque «Servicio actual» | y ≈ 684 | **y ≈ 201** |
| Panel «Siguiente paso» | y ≈ 1285 | **y ≈ 802** |
| Altura total de scroll inicial | 5103 px | **4835 px** (−268) |
| Cabecera fija al hacer scroll | No (se iba) | **Sí, fija arriba** |
| Barra de pasos fija al hacer scroll | No (se iba) | **Sí, bajo la cabecera, sin solape** |
| Selector «Otros formatos» | Desplegado siempre | **Desplegable, recogido en móvil** |

Causa raíz de que nada se fijara: `css/styles.css` declara `html, body { overflow-x: hidden }`, y cualquier ancestro con `overflow: hidden` rompe `position: sticky` en toda la página.

## Cambios

### 1. Simplicidad visual y orden de la pantalla inicial
- **El panel «Hoy» baja detrás del trabajo**: se inserta tras el panel del recorrido (antes ocupaba el mejor sitio, entre la barra de pasos y el servicio actual). Sus avisos siguen accesibles al bajar un poco.
- **«Otros formatos» es por fin un menú desplegable de verdad** (`js/operator-journey.js`): tarjeta con el mismo patrón visual que los acordeones de ranura (borde, sombra, chevron que gira), recogido por defecto en pantallas < 1024 px y desplegado en pantallas anchas. Las tres acciones principales (Escanear documento, Foto para trámite, Recibir del cliente) quedan siempre visibles.
- **Cabecera móvil compacta** (`css/polish.css`): las cuatro acciones pasan a una sola fila de iconos (el nombre accesible se conserva) en vez de una rejilla de dos filas.

### 2. Fijos que por fin se fijan, sin solapes
- `overflow-x: clip` en `html`, `body` y `main` (con `@supports`; sin soporte se mantiene el comportamiento anterior): «clip» no crea contenedor de scroll y no rompe `sticky`, a diferencia de «hidden».
- La barra de pasos guiada se pega **justo debajo de la cabecera** (`js/guided-steps.js` calcula su altura y la reaplica al redimensionar) y publica `--rs-sticky-offset`; `scroll-padding-top/bottom` en `html` garantiza que ningún destino de scroll quede tapado ni por las barras fijas ni por la barra flotante de acciones (que además gana respiro con `pb-24` en `main`).
- **Guardia anti-solape de la barra flotante (HUD)**: la barra de acciones rápidas solo aparece en el paso de impresión; si los pasos del recorrido entran en la franja inferior de la pantalla, la barra se retira (IntersectionObserver en `js/polish.js` + clase `hud-yield`). Verificado en el peor estado (paso 3, inicio de la página): sin intersección con los pasos del recorrido ni con la barra guiada.

### 3. Estados de botón inconfundibles (revisión de captura)
- El botón «Preparar entrega digital» se leía como roto junto al primario. Ahora: secundario **activo** = superficie blanca, borde y sombra ligera; **deshabilitado** = gris plano, sin sombra, texto atenuado y cursor de no permitido (en mostrador, diálogos y recorrido; también en modo oscuro). Nunca dos grises parecidos.

### 4. Aviso de nube compacto, con salida dentro de la app (revisión de captura)
- La fila «La copia en la nube está sin vincular» deja de ser un banner con botón grande: pasa a una **línea de estado compacta** dentro del panel «Hoy» («Nube sin vincular · Los trabajos se guardan solo en este equipo»).
- Al tocar «Cómo activarla» se abre un **diálogo dentro de la app** con la lista breve de activación (4 pasos: crear el depósito de Storage en la consola del proyecto, publicar las reglas de Realtime Database y Storage, activar el acceso por correo/contraseña en Authentication, y vincular desde Ajustes). El diálogo reutiliza el sistema de modales del mostrador y ofrece «Abrir ajustes».

### 5. Corrección de infraestructura: bucket de Storage (añadido en la pasada)
- La nube quedó encendida y el bucket real creado es `fotos-cobertores-pro.firebasestorage.app`, pero `js/firebase-config.js` no traía `storageBucket` y `js/cloud-sync.js` caía al nombre antiguo `<proyecto>.appspot.com`, inexistente: las subidas de fotos habrían fallado. **Corregido**: añadido `storageBucket: "fotos-cobertores-pro.firebasestorage.app"` a `window.REALSCAN_FIREBASE_CONFIG`. La lógica de reserva de `cloud-sync.js` queda intacta.

### 6. Acabado profesional (refuerzo aplicado)
- Bloques iniciales unificados: radio 16, borde sobrio y sombra del sistema; la guía de flujo pierde su degradado y usa superficie plana (blanco / slate-900 en oscuro).
- Selector de intenciones con **un solo color de acento** (el del tema, también en oscuro vía `color-mix`): se acabó el arcoíris de fichas (índigo/esmeralda/morado/ámbar) y de etiquetas.
- Icono de «Nuevo» en cabecera: ✨ → ＋, en línea con el «＋ Nuevo servicio» del mostrador (un solo significado por símbolo).
- Sin `confirm()` nativos nuevos; textos en español humano, tono profesional.

### 7. Versión 3.14.0 en todas las superficies
Cabecera, pie ×2, ajustes, `meta application-version` de `mobile-scan.html` y `phone-upload.html`, `package.json` y `window.APP_VERSION` (`js/config.js`), que las suites contrastan entre sí.

## Verificación

- `npm run check`: **en verde** (sintaxis y dependencias locales).
- `npm run build`: en verde (295 archivos; build final `realscan-46ee4def1ca4fc36`).
- `npm run verify`: **89 PASS acumulados** y suites en verde en orden — auth, regression, photo-layout, mobile-workflow, functional-audit, counter, journey, navigation, capture, iphone (Chromium **y WebKit**), document — hasta detenerse en `mobile-local` por el fallo preexistente descrito abajo (verify aborta en la primera suite roja). Completadas por separado sobre el build final: **upgrade-regression EXIT=0** y **legacy EXIT=0** (12 PASS).
- Configuración de Firebase: sonda sobre el dist final — `REALSCAN_FIREBASE_CONFIG.storageBucket === "fotos-cobertores-pro.firebasestorage.app"`, `RealScanCloudSync` cargado y sin errores JS.
- Sondas propias (`.audit/probe-314*.cjs`, `.audit/probe-hud*.cjs`, `.audit/probe-bucket.cjs`) sobre el dist final, a 390×844 y 375×667: geometría de la vista inicial, fijos sin solape en scroll, desplegable de formatos (cerrado → abierto → intención visible), panel «Hoy» tras el recorrido, fila de nube compacta y su diálogo de pasos (abre con 4 pasos y cierra), HUD despejado al final de la página y retirado ante los pasos. Sin errores JS.

## Fuera de alcance / notas

- **Fallos preexistentes (no causados por esta pasada), probados por A/B contra el snapshot v3.13.1** (`git stash` + build + suite, sin tocar `dist` a mitad de corrida):
  - `mobile-local-regression`: falla igual en snapshot y en v3.14. Punto de fallo: el guardado de PDF con OCR tras recargar **sin conexión**; el estado de la página muestra «jspdf is not defined». Causa probable: `scripts/build.cjs` excluye `vendor/jspdf.umd.min.js` de la precarga del service worker (línea 144; se cachea «bajo demanda en el primer uso») y la preparación sin conexión de `mobile-scan.html` no llega a capturarlo, así que tras la recarga offline el global `jspdf` no existe. En línea (primera carga) `window.jspdf` carga bien — comprobado con sonda. Se recomienda tratarlo como arreglo propio (precargar el vendor de jsPDF en la preparación offline de la página móvil o incluirlo en su manifiesto de preparación); no se ha tocado el subsistema offline en esta pasada.
  - `mobile-webkit-regression`: es la misma suite `mobile-local` bajo WebKit; cae por el mismo fallo anterior.
  - `practical-regression`: EXIT=1 con 8 PASS **idénticos en snapshot y en v3.14**; el corte está en `RealScanP2P.connected()` (conexión WebRTC entre dos contextos headless, que en esta VM no llega a establecerse). Ajeno por completo a los archivos tocados en esta pasada.
- Sin cambios funcionales en el flujo guiado (Tipo → Fotos → Imprimir/Entregar), ni en captura, exportación, nube (salvo la corrección del bucket) o reglas.
- Nada de push, PR ni despliegue: la revisión y el deploy quedan para el agente principal con Paco.
