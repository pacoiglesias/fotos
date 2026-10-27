# Estado vigente del seguimiento — 27/10/2026

Consultar [la referencia técnica](SISTEMA_REALSCAN.md) antes de retomar. Producción confirmada: 3.29.0, build `realscan-787bec0e2079b7f7`, commit `89da339a365340c3a4cfc57d769d73f9a74c1c86`, tag `v3.29.0+git.89da339a3653`. El `version.json` público volvió a responder 200 con esos metadatos.

3.29.1 permanece en el PR #8, sin integrar ni publicar. El CI del PR 40508687899 aprobó el commit `c3667ca432b286f62363d89f71704361b7537fdf`; cambios posteriores deben validar su propio commit. No hay mediciones nuevas de rendimiento ni validación física de iPhone, regla o NAS.

Las secciones antiguas de este archivo describen su fecha de creación: las menciones de 3.29.0 «sin publicar» quedaron superadas por el despliegue registrado arriba. Las propuestas de optimización integral y recuperación desde Paperless siguen pendientes.

---

## 3.29.1 — Revisión de acceso y preparación; pendiente de publicar

La 3.29.0 se publicó con build realscan-787bec0e2079b7f7, commit 89da339a3653 y tag v3.29.0+git.89da339a3653. El operador reportó poca visibilidad de Paperless y dificultad con sellos y firmas.

En 3.29.1: acceso Paperless en recepción; conexión visible; sellos y firma fuera del panel cerrado, junto a la hoja tanto para documentos como para fotos; COPIA precargado en un editor con confirmación; sellos frecuentes de un toque y controles secundarios agrupados. No se envían archivos automáticamente ni se guardan firmas sin elección del operador.

Validación pendiente: pruebas de navegador del nuevo recorrido; iPhone físico, impresión de la regla de 50 mm y NAS real. Esta revisión no equivale a haber validado físicamente la escala.

# Seguimiento de RealScan Pro

## 3.29.0 — En desarrollo, sin publicar

Fecha de actualización: 2026-10-26 (America/Mexico_City).
Base revisada: 3.28.1, commit `78db4226a9a3f866c7f4d30f294b4df13c501524`.
Primer respaldo de implementación: `d8b577fe0cbb734de0aaa07366ff90566c6deb69`, rama `codex/realscan-329`.

### Programado, sujeto a regresión completa

- Recepción directa, servicios compactos y organización común de preparación y entrega.
- Cambio de servicio conservando capturas, opción de deshacer y preferencias por servicio.
- Vista de trabajos que reúne pedidos e impresiones anteriores.
- Paperless opcional para fotografía individual o PDF; archivo de hojas completas con medidas y capas.
- Recibos de tareas de Paperless, consulta de estado y protección frente al doble envío.
- Propuesta de separación de INE con confirmación, intercambio y deshacer.
- Diseño adaptable para móvil y mostrador, resumen de cantidades y perfil de impresora.

### Evidencia comprobada

CI: https://github.com/pacoiglesias/fotos/actions/runs/40445282427

- Publicador Windows: aprobado.
- Regresión completa: **falló**. No autoriza publicación.
- Dentro de esa ejecución pasaron la regresión principal, las pruebas unitarias de Paperless y detección de INE, y las comprobaciones de impresión de medidas y número de hojas.
- La prueba nueva en Chromium comprobó conservación de la captura al cambiar servicio, PDF de historial 4×6 con ocho fotos visibles, prevención de doble envío y entrega de foto individual a Paperless mediante servidor simulado.
- Fallaron pruebas de presentación y navegación, captura y recepción local, entre otras; la prueba nueva se detuvo antes de completar INE y WebKit.

### Segundo checkpoint de correcciones

Respaldo `c7014a3ddd5329684358181ec85fa68b410e4584`. CI: https://github.com/pacoiglesias/fotos/actions/runs/40447371712 (Windows aprobado; regresión completa falló en tres grupos: acabado, archivo en WebKit y conteo de documentos). Se corrigió la apertura de paneles al navegar a una captura, el tamaño de la hoja, el selector de servicio en móvil y la revisión de INE tras cambiar de servicio. Las pruebas usan los controles visibles correspondientes al flujo actualizado.

Se añadió comprobación automática de versiones; la siguiente corrección agrupa también los botones existentes de documentos en la misma zona de entrega, conserva sus motores de PDF/QR/impresión y agrupa alternativas de exportación, añade iconos con texto, lleva OCR y doble cara a las herramientas, y comprueba metadatos, CSP y exclusión de archivos de trabajo en el build.

### Tercer checkpoint de pruebas

CI https://github.com/pacoiglesias/fotos/actions/runs/40448538690, commit `ff42bd5a1bb3b5a1bea5dc4584ac8c54a3dbc7db`: Windows aprobado. Pasaron los nuevos flujos de INE y archivo completo a Paperless en Chromium y WebKit, OCR/PDF sin conexión y navegación. La regresión completa señaló tres pendientes: sincronización del resumen de acabado, acceso a revisión de impresión con una sola cara y prueba de PDF alternativo dentro del nuevo desplegable. Se corrigen en el siguiente checkpoint, junto con tamaños de controles en modo mostrador y campos de iPhone. No se declara aprobada la entrega mientras no pase la ejecución completa.

### Cuarto checkpoint de pruebas

CI https://github.com/pacoiglesias/fotos/actions/runs/40449435150, commit `374c16c6d2e1889914c0eda0678798fed07ff715`: Windows aprobado; pasaron la sincronización del acabado, la revisión de captura incompleta, el PDF alternativo y el modo mostrador a 390 px en Chromium. La ejecución completa señaló tres comprobaciones a ajustar: la entrega de un documento vacío está oculta y deshabilitada por diseño, WebKit debe esperar a que termine la separación antes de buscar Deshacer, y la actualización PWA debe esperar al nuevo service worker activo antes de verificar limpieza de cachés. Se conserva la exigencia de todas las comprobaciones, incluidos medidas, archivos reales y borrado de la caché antigua. Se añadió también protección para que deshacer INE no vuelva a proponer el mismo recorte.

### Quinto checkpoint: regresión completa aprobada

Commit `4575e2745d4777660d9b4952912602c39e5d28b0`, build `realscan-ba51ae01c6098914`. Aprobados `npm run verify` y publicador Windows tanto en la rama (https://github.com/pacoiglesias/fotos/actions/runs/40450223052) como en el PR (https://github.com/pacoiglesias/fotos/actions/runs/40450296772). La ejecución de la rama registró 317 resultados PASS y ningún FAIL. Se revisaron las capturas de escritorio, WebKit móvil y modo mostrador.

El repaso visual final lleva las herramientas detrás de la hoja también en móvil, compacta la miniatura, conserva oculto el panel de fotos al trabajar documentos en móvil y oculta la ayuda repetida de la vista del cliente hasta que haya aprobación. El acceso secundario se muestra como Más, conservando Más opciones como nombre accesible; las miniaturas se limitan a 52 px en móvil y se conserva un único mensaje principal de estado. Se comprueba que el texto no se recorte y que la miniatura permanezca compacta. Estos ajustes se someten de nuevo al CI antes de cerrar el PR. Revisión: https://github.com/pacoiglesias/fotos/pull/7.

### Pendientes para cerrar esta entrega

1. Corregir y repetir todas las regresiones fallidas, distinguiendo cambios intencionados de interfaz de fallos reales.
2. Revisar capturas de pantalla en móvil, escritorio, modo mostrador y tema oscuro.
3. Generar el build final y comprobar CSP, versión, commit y contenido permitido en dist.
4. Respaldar las correcciones y abrir la revisión con CI completo aprobado.
5. Probar en iPhone real la cámara, miniaturas, permisos y PWA.
6. Imprimir y medir la regla de 50 mm; comprobar la reinserción manual en impresora física.
7. Probar acceso, CORS y recepción real en el NAS/Paperless con un archivo de prueba autorizado.

### Criterio de aceptación para iPhone

La entrega debe ser una web adaptable, con recepción y cambio de servicio accesibles incluso después de capturar. Revisar a 320, 390 y 430 píxeles y en horizontal: sin desbordamiento, controles táctiles legibles, miniaturas reales visibles y acciones fuera del área del indicador de inicio. Comprobar teclado y formularios, apertura/cierre y denegación de cámara, captura repetida, PDF, recepción QR y funcionamiento desde el icono PWA. Registrar modelo de iPhone y versión de iOS al realizar la prueba física. La emulación y WebKit no sustituyen esa prueba.

No se ha desplegado 3.29.0. No se ha verificado aún un build final de esta versión en producción.

## Cómo registrar los próximos avances

- Cada nueva entrega actualiza la versión semántica en package, lock, interfaz y metadatos, junto con CHANGELOG y este registro.
- Las correcciones de una entrega aún no publicada mantienen su versión y se distinguen por commit y hash de build.
- `npm run verify` comprueba la coherencia de versiones antes del resto de pruebas.
- `dist/version.json` identifica `appVersion`, hash de build, commit de origen y fecha de generación.
- Cada cierre registra pruebas aprobadas y fallidas, pendientes físicos, commit, tag si existe, CI y despliegue real. No se marca publicado ni aprobado sin evidencia.
- El build excluye audit y documentación mediante la lista de archivos permitidos; este registro pertenece al repositorio.
