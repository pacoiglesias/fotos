# Arreglos de la auditoría del 22-oct-2026 — RealScan Pro v3.12.0

Paquete completo aplicado sobre el estado de producción v3.11.1 (rama
`codex/mejora-integral-realscan`). Un solo despliegue: **v3.12.0**.

## 1. Orden del repositorio
- El código que corre en producción (v3.11.1, rama `codex/mejora-integral-realscan`)
  queda como base oficial en `main` y etiquetado `v3.11.1`.
- Todos los arreglos van sobre esa base. Versión resultante: **v3.12.0**.

## 2. Seguridad (hallazgos altos)
- **PIN de fábrica eliminado.** `js/config.js` ya no publica `DEFAULT_PIN`,
  `DEFAULT_PIN_HASH` ni `LEGACY_PIN_HASH`. El pie del login ya no anuncia
  «admin / PIN: 1313».
- **Primer uso = crear contraseña.** Una instalación nueva arranca sin usuarios
  y con el panel «Configura el acceso» (usuario + contraseña de 6+ caracteres).
- **Cambio forzado real.** Si una instalación existente sigue con la clave de
  fábrica publicada, el primer inicio de sesión exige cambiarla antes de entrar
  (panel no descartable). Un hash elegido por el operador nunca se reescribe.
- **Límite de intentos.** 5 fallos → bloqueo temporal de 5 minutos (persistido).
- **Bloqueo por inactividad configurable** (Ajustes → Credenciales: Nunca /
  5 / 10 / 20 / 30 min; por defecto 10). Temporizador que se rearma con la
  actividad y respeta el modo «sesión larga» (Nunca).
- La bitácora exportada a CSV neutraliza la inyección de fórmulas (=, +, -, @).

## 3. Medios de la auditoría
- **CSP estricta** en `firebase.json` y `firebase.secondary.json` (default-src
  'self'; scripts solo propios + los 2 inline por hash SHA-256; sin objetos ni
  marcos; connect-src limitado a Firebase/Google). Verificada con humo local.
- **`@page` dinámico** en la ruta de respaldo `window.print()` de `js/pdf.js`:
  tamaño del papel activo y margen 0, para no perder la escala 1:1.
- **Primera carga ligera:** jsPDF y JSZip ya no bloquean el `<head>`; se cargan
  bajo demanda (`js/vendor-loader.js`, funciones globales `ensureJsPdf()` /
  `ensureJSZip()`). El service worker ya **no precachea** el volumen de
  pdf.js/OCR (cmaps, wasm y OCR ≈ 250 archivos y 52 MB): se cachean en tiempo
  de ejecución al primer uso. Sí quedan precacheados el núcleo de pdf.js
  (pdf.mjs + worker) y las fuentes estándar (816 KB), porque la app los
  necesita desde el arranque y también sin conexión (verificado con sonda de
  arranque offline).
- **Diálogos propios** en lugar de `confirm()` nativos en los flujos auditados
  (exportar/imprimir, historial, respaldo, usuarios, bitácora). Quedan
  `confirm()` en módulos ajenos a la auditoría (lista en el informe).
- Respaldos del historial **opcionales en claro** (ver §4a), cabeceras de
  seguridad previas conservadas, `robots.txt` (la app de mostrador no se
  indexa), meta description y Open Graph.

## 4. Funciones nuevas
- **(a) Respaldo cifrado del historial** — AES-GCM-256 con clave derivada
  PBKDF2-SHA-256 (210 000 iteraciones) vía WebCrypto, con contraseña propia.
  La importación detecta el sobre cifrado y pide la contraseña; el respaldo en
  claro sigue funcionando como hasta ahora. El respaldo diario puede cifrarse
  (casilla marcada por defecto).
- **(b) Hoja de prueba de calibración** reforzada: marco completo a 10 mm,
  reglas de 100 mm en ambos ejes y de 50 mm, tarjeta 85.6 × 53.98 mm y foto
  35 × 45 mm; **registro de mediciones** con veredicto ±1 % guardado en el
  equipo.
- **(c) JPG a 300 DPI** reales en los metadatos JFIF de las entregas.
- **(d) Bloqueo por inactividad** (ver §2).

## AÑADIDO 1 — Quejas reales de uso (iPhone)
- **La foto se ve dentro de la tarjeta de cada cara** en cuanto se captura o se
  sube (miniatura que se actualiza con rotar/recorte/enderezar/filtros). Tocar
  la miniatura lleva a la vista previa completa de la hoja.
- **Botón de cambio de cámara grande y flotante** sobre el video (76 × 76 px,
  esquina inferior derecha, con la cámara activa: «Trasera»/«Frontal»). La
  elección se recuerda durante la sesión. Sirve también en el escaneo móvil.

## AÑADIDO 2 — Tarjetas limpias con desplegables
- Siempre visible: foto, estado, Cámara/Subir/Pegar y Rotar + Enderezar 4
  Esquinas + Deshacer.
- El resto en 3 acordeones cerrados: «Ajuste y zoom», «Mejoras de imagen» y
  «Herramientas», con **pista de estado** en el encabezado cuando un ajuste
  está activo (p. ej. «· B/N», «· 120 %», «· Girada 90°»).
- Sin textos truncados (banner del inspector), objetivos táctiles ≥ 44 px.

## AÑADIDO 3 — Selector de tipo de documento compacto
- Barra «Tipo elegido: … · 85.6 × 54.0 mm» + botón «Cambiar», **frecuentes**
  siempre visibles (documentos: ID-1, Pasaporte abierto, Pasaporte 1 pág.;
  fotos: Infantil, Carnet/DNI, Pasaporte) y panel plegable con **buscador**
  (insensible a acentos) y la rejilla completa por grupos. Al elegir, se cierra.
- El **último tipo usado** por categoría se recuerda y se precarga.

## AÑADIDO 4 — Cinco mejoras de mostrador
- **4.1 Semáforo de calidad** por foto, siempre visible: 🟢 nítida / 🟡 justa /
  🔴 borrosa a ese tamaño, con los ppp estimados y la medida.
- **4.2 Perfiles de calibración por impresora:** escala X/Y en % y
  desplazamiento X/Y en mm por impresora; se aplican a la geometría del PDF al
  imprimir/exportar (la impresora física la elige el diálogo del navegador).
  Botón «Usar última medición» desde el registro de calibración. Alcance: PDF
  principal (no el JPG por lienzo ni trabajos documentales programados).
- **4.3 Flujo guiado en 3 pasos:** barra pegajosa «1 Tipo → 2 Fotos →
  3 Imprimir/Entregar» que refleja el paso actual y permite saltar/volver. No
  sustituye a la navegación libre.
- **4.4 Resumen antes de imprimir/entregar** (extiende la revisión existente):
  tipo, caras, papel, **copias**, **perfil de impresora** (con selector),
  **vista previa de la hoja** y avisos de caras faltantes. También se aplica a
  la **descarga de PDF**.
- **4.5 Repetir trabajo:** botón «🔁 Repetir» en el historial y en el panel de
  guardados: carga tipo, caras y ajustes como trabajo nuevo listo para
  imprimir, sin recapturar; el registro original queda intacto.

## AÑADIDO 5 — Listón «nivel Genius Scan»
- **Detección en vivo del documento** (ya existía el motor por análisis de
  intervalos sobre el video, compatible con iOS Safari): ahora el **botón de
  captura anuncia la detección** («✓ Documento detectado — Tomar foto» y se
  ilumina) y el interruptor **«Capturar al mantener el documento estable» queda
  visible** en la vista de cámara (antes estaba dentro de Opciones). La
  autocaptura al estabilizar ya funcionaba y se mantiene.
- **Filtro «Escáner» nivel escáner real:** corrección de campo plano — estima
  el fondo (papel + sombras) y divide la imagen entre él: fondo blanco limpio
  sin sombras, texto reforzado con umbral suave. Sustituye al umbral fijo.
- **Antes/después en la tarjeta:** mantener pulsada la miniatura muestra la
  foto original mientras se mantiene pulsada.
- La ventaja propia de RealScan se mantiene y brilla: **impresión 1:1 con
  calibración por impresora** (§4b y §4.2).

## Decisiones y límites (honestidad de la auditoría)
- **Mejora #8 de la auditoría (caché inmutable de `/vendor/`) NO aplicada:**
  derrotaría el versionado por hash del service worker (un vendor actualizado
  quedaría atrapado un año tras el HTML viejo). Se mantiene `max-age=3600`.
- El hash débil `fb_` de respaldo (sin WebCrypto) se deja: producción es HTTPS
  y WebCrypto está disponible; el camino débil solo actúa en contextos no
  seguros heredados.
- Quedan `confirm()` nativos en módulos fuera del alcance auditado
  (reinicio total de operations.js, duplex-assistant, document-batch,
  calendar-sync, local-transfer-ui, document-job, digital-workflow,
  print-calibration de páginas). Los flujos auditados usan diálogos propios.

## Verificación (22–23 oct 2026, en local sobre `dist/`)

- `npm run check` y `npm run build`: OK (288 archivos en dist).
- **Suites en verde** (cada una ejecutada contra el código final):
  autenticación (4/4, incl. rechazo de las claves de fábrica 1313/2026 tras el
  cambio y no-reseteo de contraseñas guardadas), regresión principal completa,
  photo-layout (1.248 layouts; círculo raster/PDF = 1), flujo móvil,
  auditoría funcional (14), mostrador, journey, navegación, captura, iPhone
  en Chromium **y WebKit** (geometría y revisión), documentos (PDF buscable de
  6 páginas con OCR), móvil-local, móvil-webkit, actualización desde caché
  rota, y el paquete legacy completo (entregas 1–4, etapas 1–7 y maestro
  integral: 12/12).
- **Prueba de humo CSP:** sirviendo `dist/` con la Content-Security-Policy
  exacta de `firebase.json`, el login, la barra guiada y el selector de tipos
  funcionan con **cero violaciones** y cero errores de consola.
- **Arranque sin conexión** verificado con sonda: app + `pdfjsLib` disponibles
  offline tras la corrección del precaché.
- **Única sección no ejecutable en esta VM:** la conexión local P2P
  (WebRTC) de `practical-regression` — 8 de sus secciones pasan; la de P2P
  agota el tiempo porque el WebRTC en bucle local no establece conexión en
  esta máquina virtual (probado con una sonda cruda, sin código de la app:
  Chromium no genera candidatos ICE y WebKit se queda en «checking», también
  con el Chromium completo). El paquete **no modifica** el módulo P2P; la
  sección queda pendiente de correr en una máquina con red normal.
- `delivery-regression` solo corre con `REALSCAN_TEST_RELAY=1` (relé externo),
  como ya preveía el propio `verify` del repo; no se ejecutó.
- **Mantenimiento de suites** (sin tocar lógica de la app): las suites siembran
  la cuenta de prueba de forma idempotente (la recarga ya no pisa la sesión),
  cargan jsPDF bajo demanda antes de llamarlo directo, responden a los nuevos
  prompts de contraseña del respaldo cifrado, abren los desplegables antes de
  pulsar sus controles y cuentan las imágenes de la revisión previa sin la
  nueva vista de la hoja. Las suites legacy de seguridad/etapa 5 se
  actualizaron a los contratos nuevos (sin admin precreado; reseteo con
  diálogo asíncrono).
