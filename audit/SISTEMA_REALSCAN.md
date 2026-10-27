# RealScan Pro — referencia técnica y seguimiento

Última revisión: **27 de octubre de 2026**, zona America/Mexico_City.
Repositorio: [pacoiglesias/fotos](https://github.com/pacoiglesias/fotos).

Este documento es el punto de entrada técnico. Describe capacidades comprobadas en el código y separa publicación, pruebas y propuestas. No garantiza que una integración externa esté configurada en cada dispositivo. Cuando cambie el sistema, actualizarlo junto con el registro de avances y el changelog.

## 1. Estado verificable

| Elemento | Estado y evidencia |
| --- | --- |
| Producción | **3.29.0**, comprobada de nuevo el 27/10/2026 en `https://fotos.cobertores.com/version.json`, HTTP 200 |
| Build publicado | `realscan-787bec0e2079b7f7` |
| Commit publicado | `89da339a365340c3a4cfc57d769d73f9a74c1c86` |
| Respaldo publicado | Tag `v3.29.0+git.89da339a3653` |
| CI de la versión publicada | [Run 40455244916](https://github.com/pacoiglesias/fotos/actions/runs/40455244916): regresión, Windows y tag aprobados |
| Revisión de interfaz | **3.29.1**, [PR #8](https://github.com/pacoiglesias/fotos/pull/8), borrador, sin integrar ni desplegar |
| Commit de la revisión | `c3667ca432b286f62363d89f71704361b7537fdf` |
| CI del PR al revisar este documento | [Run 40508687899](https://github.com/pacoiglesias/fotos/actions/runs/40508687899): aprobado para ese commit; las modificaciones posteriores requieren comprobar su propio CI |
| Pruebas físicas | iPhone real, medición de 50 mm, doble cara y NAS real: pendientes de acta de prueba |

Un push, un build o CI en verde no significan que se haya publicado. El número de versión por sí solo tampoco identifica el contenido: registrar siempre commit y hash del build. Estos datos son una fotografía de la fecha indicada; comprobar GitHub y producción al retomar el trabajo.

## 2. Finalidad y flujo operativo

Aplicación web de mostrador para recibir fotos y documentos, prepararlos e imprimirlos con dimensiones físicas definidas. Funciona en escritorio y dispone de recorridos móviles. No tiene acceso directo al estado físico de una impresora desde el navegador.

1. **Recibir:** cámara, archivo, QR por internet o transferencia Wi-Fi local. La captura inicial puede clasificarse después, conservando la imagen hasta confirmar.
2. **Preparar:** identificación, fotografía o documento; revisar las imágenes, elegir formato, papel, cantidad y acabado. Confirmar propuestas automáticas y revisar la hoja.
3. **Entregar:** revisión de impresión, archivo PDF, entrega temporal al celular o archivado opcional en Paperless.
4. **Cerrar o repetir:** guardar/reanudar trabajos, reimprimir y consultar el cierre diario.

## 3. Inventario funcional y límites

| Área | Implementado en la base publicada | Límites y pendientes |
| --- | --- | --- |
| Recepción | Cámara, archivo, portapapeles, QR y Wi-Fi local; captura primero | Cámara y permisos dependen del dispositivo; Wi-Fi local requiere emparejamiento y red compatible |
| INE/DNI | Frente y reverso en hoja, formato de tarjeta; propuesta de separación cuando se detectan dos caras juntas | Confirmar la detección, el recorte y las medidas; no convertir cualquier proporción en una tarjeta sin revisar |
| Fotos | Formatos físicos, cantidades, packs, guías, marco y retoques locales | Las cantidades se distribuyen según el espacio real: 16 infantiles pueden requerir más de una hoja |
| Documentos | Varias páginas, selección, orden, giro, acciones por lotes y PDF único | El tamaño y el número de páginas afectan memoria y tiempo; no prometer PDF idéntico al original si se rasteriza |
| Impresión | Hoja en milímetros, revisión, perfiles por impresora y calibración guiada | Medir regla de 50 mm al 100 %; el software no mide la hoja impresa |
| Doble cara | Asistente manual y prueba de orientación | Reinsertado y orientación deben probarse con la impresora concreta |
| OCR | Reconocimiento local y salida PDF con texto mediante sus recorridos disponibles | Revisar reconocimiento: no garantiza transcripción perfecta, especialmente con imagen borrosa o manuscritos |
| Sellos y firmas | Capas de COPIA y otros sellos, texto, fecha, firma dibujada/importada y copia identificada | Firma visual, sin firma criptográfica por certificado; un folio no revela quién fotocopió |
| Historial y trabajos | Guardado/reanudación local, reimpresión, estados y cierre por formatos/cantidades | El navegador no confirma tinta, papel o éxito físico; confirmar el resultado con el operador |
| Recuperación y nube | Borradores, respaldo/exportación e integración de copia en nube | Historial y ajustes pertenecen al navegador/origen; comprobar restauración y configuración |
| PWA y sin conexión | Recursos locales, caché, actualización y PDF local | El uso sin conexión requiere haber preparado la caché; QR en internet, nube y Paperless necesitan conexión |
| Paperless: escritura | Enviar foto individual o PDF revisado; seguimiento de tarea, recibo y prevención de duplicados | Requiere token, permisos y CORS del NAS; las pruebas automáticas utilizan respuestas simuladas |
| Paperless: lectura | Comprobar acceso y consultar el estado del archivado | **No hay todavía búsqueda, listado ni recuperación de documentos del NAS en RealScan** |
| Móvil y modo mostrador | Diseño adaptable, controles táctiles y modo de letra grande | Pruebas Chromium/WebKit no equivalen a probar cámara/PWA en un iPhone real |

## 4. Mapa del código

Aplicación web de HTML/CSS/JavaScript; compilación y verificación con Node.js 24. No es una app nativa ni un ejecutable de Windows.

| Responsabilidad | Archivos principales |
| --- | --- |
| Entradas | `index.html`, `mobile-scan.html`, `phone-upload.html` |
| Versión y formatos | `package.json`, `package-lock.json`, `js/config.js` |
| Flujo y distribución de paneles | `js/workspace-polish.js`, `js/service-flow.js`, `js/studio.js`, `css/counter-workspace.css` |
| Hoja y geometría | `js/layout-engine.js`, `js/engine.js` |
| Preparación e impresión | `js/print-experience.js`, `js/document-print.js`, `js/printer-profiles.js`, `js/print-archive.js` |
| Documentos y OCR | `js/document-job.js`, `js/local-ocr.js`, `js/searchable-pdf.js` |
| Sellos y firmas | `js/annotations.js`, `js/annotation-workflow.js`, `css/annotations.css` |
| Entrega de archivos y QR | `js/pdf-delivery.js`, `js/qr-sync.js`, `js/share-delivery.js` |
| Paperless | `js/paperless.js` |
| Historial, cola y nube | `js/counter-desk.js`, `js/job-queue.js`, `js/storage.js`, `js/cloud-sync.js` |
| Acceso y diagnóstico | `js/auth.js`, `js/diagnostics.js` |
| PWA | `sw.js`, `js/pwa-update.js`, `js/offline-setup.js` |
| Build y auditoría | `scripts/build.cjs`, `scripts/verify.cjs`, `scripts/check-version.cjs`, `scripts/check-build.cjs`, `scripts/check-release.cjs` |
| Publicación y respaldo | `scripts/firebase-runner.cjs`, `scripts/publish.cjs`, `scripts/backup-tag.cjs`, `.github/workflows/check.yml`, `desplegar.ps1` |

Los originales y las capas de anotación se mantienen separados. No introducir nuevos cambios de disposición en un segundo módulo sin revisar el propietario del layout; mantener el comportamiento de impresión separado del CSS de pantalla.

## 5. Servicios, datos y credenciales

- Firebase Hosting sirve `dist/`; configuración principal `firebase.json`, proyecto/sitio `fotos-cobertores-pro`. Hay configuración secundaria en `firebase.secondary.json`; no asumir que publicar un proyecto actualiza el otro.
- Firebase Realtime Database y autenticación anónima sostienen transferencias QR temporales. Una entrega QR no es un respaldo permanente.
- Paperless permite únicamente el origen HTTPS autorizado en el módulo y en la CSP. El token se configura por administración en el navegador; no escribirlo en documentación, logs ni Git. Su acceso desde JavaScript/localStorage no equivale a un almacén de secretos de servidor.
- Firmas reutilizables solo se guardan si lo elige el operador. No incluir documentos, firmas, texto OCR, códigos de acceso ni tokens reales en fixtures o evidencias públicas.
- Credenciales de Firebase para desplegar y token de Paperless son accesos distintos. No asumir que persisten entre entornos o sesiones.

## 6. Mejoras por versión y estado

### 3.29.0 — publicada

Recepción directa, servicio conservando capturas, preferencias por servicio, disposición centralizada, resumen de cantidades, trabajos e impresiones reunidos, revisión de entrega y Paperless opcional. Se reforzaron archivado de hojas completas, control de tareas/duplicados, propuesta de INE y comprobaciones de versión/CSP/build.

**Incidencia reportada después de publicar:** interfaz todavía recargada; Paperless poco visible; sellos y firmas poco accesibles; falta medir la agilidad cotidiana. La publicación no cierra esa revisión de usabilidad.

### 3.29.1 — implementada en PR, sin publicar

Paperless pasa a recepción con mensaje de configuración; Sello COPIA y Añadir firma se muestran junto a la hoja. COPIA abre una revisión con la marca preparada, sin confirmar automáticamente. Sellos frecuentes de un toque, pestaña activa y ajustes de precisión agrupados. Se conservan los motores de PDF e impresión.

**Pendiente:** revisión visual comparativa, aceptación del operador, comprobación del CI del commit final y pruebas físicas. No incluye buscador de Paperless ni una optimización integral de rendimiento ya medida.

### Propuestas todavía no terminadas

| Prioridad | Propuesta | Cómo demostrar que está terminada |
| --- | --- | --- |
| Alta | Flujo integral más corto para INE, fotos y documentos | Recorridos completos con pasos/toques antes y después, sin perder capturas o ajustes |
| Alta | Menos controles repetidos y una preparación coherente | Capturas comparables en escritorio/móvil, botones esenciales visibles y teclado/tacto funcionales |
| Alta | Medir y reducir esperas | Medir carga, captura, cambio de cantidad y apertura de revisión/impresión con las mismas muestras y dispositivo; registrar resultados reales |
| Alta | Cambio seguro al siguiente cliente | Guardar o cerrar el trabajo y no reutilizar capturas, firmas, sellos o destinatarios del anterior |
| Media | Buscar y recuperar desde Paperless | Búsqueda paginada, vista previa y recuperación sin sobrescribir documentos del NAS; probar errores y permisos |
| Media | Encabezados y firmas más visuales | Plantillas/miniaturas, vista previa, aplicar/deshacer y conservación en PDF e impresión |

No asignar porcentajes de avance ni declarar «perfecto» sin criterios de aceptación y evidencia.

## 7. Verificación y publicación

En un entorno con Node.js 24 y capacidad de ejecutar navegadores:

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm run verify
```

`verify` ejecuta la lista real de suites de `scripts/verify.cjs`; no mantener aquí un número fijo de suites que pueda quedar obsoleto. CI añade la prueba del publicador en Windows. La prueba opcional de transferencia real y la prueba de reglas tienen requisitos de conexión propios; no presentarlas como ejecutadas si no lo fueron.

Antes de publicar: todas las pruebas requeridas aprobadas para el commit exacto; build de producción; coherencia de versiones y CSP; revisión de código; respaldo Git con tag comprobado. Si cambia un script inline, actualizar los hashes en las configuraciones de Hosting y ejecutar `check-build`. No publicar `audit/`, scripts de mantenimiento, documentación ni credenciales en `dist/`.

El workflow de `main`, después de las pruebas, genera el tag inmutable `vVERSION+git.COMMIT12` y promueve `release/VERSION`. Verificar el resultado; nunca sobrescribir un tag existente para aparentar el mismo respaldo.

Después de desplegar: comprobar `version.json`, portada HTTP 200, coincidencia de commit/build y recursos/CSP; probar recepción, preparación y entrega. Registrar cualquier parte bloqueada por autenticación o falta de hardware. Medición de 50 mm y doble cara solo pueden cerrarse con la impresora real.

## 8. Ficha obligatoria de seguimiento

Copiar esta ficha a [AVANCES.md](AVANCES.md) para cada entrega:

```text
Versión y fecha:
Estado: propuesta / implementada / en prueba / publicada
Problema del operador y criterio de aceptación:
Cambios visibles y operativos:
Módulos modificados:
Commit / rama / PR:
Pruebas ejecutadas y resultado:
CI del commit exacto:
Capturas o mediciones comparables:
Build / tag verificado:
Deploy: proyecto, sitio, fecha y resultado:
URLs y metadatos comprobados:
Pendientes de iPhone, impresora, NAS y aceptación del operador:
```

Mantener responsabilidades claras: [CHANGELOG.md](../CHANGELOG.md) resume qué cambió; [AVANCES.md](AVANCES.md) registra ejecución y evidencia; este documento explica qué tiene el sistema y sus límites. Las auditorías históricas conservan su contexto de fecha y no sustituyen el estado actual.
