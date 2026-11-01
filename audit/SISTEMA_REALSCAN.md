# Referencia técnica de RealScan Pro · 3.36.0

Esta guía describe el código de la nueva entrega. El estado publicado se comprueba en `version.json`; no se deduce del número de versión escrito en un documento.

## Base y estado de la revisión

- Repositorio: `pacoiglesias/fotos`.
- Base auditada: main 3.35.1, merge `dda394d1cf195b42c1d183fca29962145070f3f0` (PR #14).
- CI de esa base: [41245814131](https://github.com/pacoiglesias/fotos/actions/runs/41245814131), Windows y regresión aprobados.
- Publicación anterior comprobada: aplicación 3.35.1, build `realscan-d012696a631430aa`, fuente `6a9fd1ee422ed2a9e4c500273c9dc7d459355072`. Ambos Firebase y el dominio propio coincidieron en versión, fuente, CSP y 57 archivos por origen.
- Nueva entrega 3.36.0: rama `codex/identificacion-simple-336`. Su validación y publicación se registran en el PR y en las evidencias de entrega. Durante el desarrollo no se presenta como publicada.

## Responsabilidades

| Componente | Función |
| --- | --- |
| `js/desk-experience.js`, `css/desk-experience.css` | Configuración permitida para favoritos, visor compartido, atajos, retorno de foco y estado de transferencias; sin otro motor de medida o impresión |
| `js/workspace-polish.js`, `css/counter-workspace.css` | Composición única del mostrador, recepción persistente, acción contextual y tablero de trabajos |
| `js/engine.js`, `js/image-processing.js` | Captura, edición y materialización de imágenes conservando originales |
| `js/layout-engine.js`, `js/print-sheet.js`, `js/document-print.js` | Geometría en milímetros y revisión previa a la impresión |
| `js/document-job.js`, `js/mobile-scan.js` | Documentos multipágina, edición reversible y PDF móvil |
| `js/annotations.js`, `js/annotation-workflow.js` | Sellos, firmas y capas de salida |
| `js/paperless.js`, `js/paperless-metadata.js` | Acceso de origen fijo al NAS y revisión de metadatos antes de enviar |
| `js/local-ocr.js`, `js/searchable-pdf.js` | OCR local, texto revisable y PDF buscable |
| `js/job-queue.js`, `js/counter-desk.js` | Pedidos e historial local; estado y confirmación física separados |
| `js/counter-operations.js` | Tickets, folios, cierre firmado y preparación sin conexión |
| `js/draft-store.js`, `js/storage.js` | Recuperación y presets, con borradores gráficos en IndexedDB |
| `js/config.js`, `assets/dialogs/` | Modales compartidos y ayuda secundaria diferida |
| `js/pwa-update.js`, `sw.js` | Actualización explícita, caché por build y limpieza de versiones antiguas |
| `scripts/build.cjs`, `scripts/check-build.cjs` | Build limpio, identificadores por contenido, CSP y lista de publicación |
| `scripts/verify.cjs`, `scripts/publish.cjs` | Verificación completa y publicación controlada en ambos Firebase |

## Invariantes

1. El tamaño físico se calcula en milímetros. La impresión usa papel y escala correctos y necesita medición física del operador.
2. Un fallo, cancelación o cambio de sesión no confirma una entrega ni borra el trabajo actual.
3. Un ticket o movimiento de tarjeta Kanban no incrementa producción. Los totales cuentan impresiones confirmadas.
4. Cambiar de cliente limpia las capturas y anotaciones del espacio nuevo; guardar una copia es una acción explícita.
5. Los presets no contienen imágenes. Los borradores gráficos no se escriben en localStorage. El guardado reutilizable de firmas se ha retirado y su clave antigua se limpia.
6. Las descargas y envíos Paperless tienen límite de 30 MB, origen HTTPS fijo, redirecciones prohibidas y comprobación de sesión. Un resultado de otra tarea no confirma el documento enviado.
7. Las etiquetas y tipos se eligen entre IDs del catálogo real. Las sugerencias locales no crean objetos ni archivan automáticamente.
8. El QR del ticket es una referencia, no un servicio de seguimiento remoto. No incluye nombre, imagen ni firma del cliente.
9. El cierre JSON firma totales agregados con una clave ECDSA P-256 no exportable guardada en IndexedDB. La clave pública acompaña el archivo. La firma verifica integridad; para confiar en la identidad se contrasta su huella.
10. `dist` se reconstruye; sus archivos no se editan. El build genera version.json y verifica las referencias y las políticas CSP.

## Actualización y limpieza

El reporte del usuario de ver versiones y paneles distintos se contrastó con los archivos públicos: los hosts sirvieron los mismos bytes, pero cada origen conserva su estado local. El worker anterior obtenía HTML de red mientras podía servir JS antiguo desde caché.

La nueva entrega identifica scripts y estilos por contenido y precachea también esas URLs. El worker consulta únicamente su caché activa. Al activarse retira cachés de versiones RealScan anteriores y conserva otras cachés y almacenamiento de trabajos. La comprobación de actualización compara además la versión remota con la que ejecuta la página. La preparación offline valida que los recursos existan, no solo una marca de estado.

La ayuda de instalación y escáner se carga al abrirla y se incluye en el precaché. Sus IDs y cierre con teclado se mantienen. Se cancelan aperturas pendientes si el usuario cierra antes de finalizar la carga.

## Memoria y privacidad

Se liberan canvas temporales después de materializar su imagen o PDF, también en rutas fallidas de render PDF. Los recursos compartidos de vista previa permanecen mientras se necesitan. Se mantienen los límites de imágenes y páginas y se conservan originales de trabajo para deshacer.

Las fotos y anotaciones de un borrador siguen existiendo en IndexedDB para recuperación; esta función no se describe como ausencia total de almacenamiento. El cierre exportado contiene exclusivamente métricas. El token de Paperless se configura explícitamente y no se imprime ni se expone a través de la API pública del módulo.

## Pruebas y evidencia

`npm run verify` ejecuta chequeo de versiones, sintaxis, build, CSP, autenticación, impresión, recuperación, Paperless, recorrido móvil, OCR sin conexión, actualización y pruebas heredadas.

`operations330-regression.cjs` añade recorridos en Chromium y WebKit para NAS visible, ayuda diferida, ticket estable y PDF real, firma íntegra y alterada, estados Kanban, privacidad local, metadatos confirmados y liberación de canvas tras éxito y error. Las capturas y resultados se guardan en `.audit/operations330/` y en artefactos del CI.

La regresión de actualización siembra configuración y aplicación obsoletas, comprueba la versión nueva y la retirada de su caché, y exige conservar un marcador de usuario y una caché ajena a RealScan.

Referencia de campos de subida y tareas: [API oficial de Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx/blob/dev/docs/api.md).

## Pendientes físicos

Cámara y PWA de iPhone real; medición de regla de 50 mm e impresora; reinserción dúplex; acceso, CORS y archivo real en el NAS. Las pruebas automatizadas usan documentos sintéticos y respuestas simuladas y no se presentan como validación física.
