# RealScan Pro 3.38.0

Estado: **publicada y verificada en ambos Firebase y en el dominio habitual**.

## Alcance

1. Entrega PDF con anterior/siguiente, contador y lupa 150/200 %. Navega el archivo generado, incluidas las selecciones de páginas. La ampliación solo afecta a la vista. Cambiar ajustes cancela el render anterior; cerrar libera canvas, tarea PDF e historial temporal.
2. Deshacer/Rehacer para los ajustes de revisión de INE/fotos. Hasta 20 pasos en memoria, con papel, caras, juegos, cantidades, márgenes, posición, encabezado y escala. Conserva imágenes y anotaciones. Al cerrar, cambiar de trabajo o bloquear se vacía el historial; no va a localStorage ni a presets.
3. Revisión compacta: papel, caras, cantidad, márgenes, corte y posición accesibles. Encabezado, rótulos, regla y escala en Opciones avanzadas; mantiene los selectores originales y el estado de apertura durante la edición.
4. Comparador de perfiles con el mismo nombre: ninguna retirada automática, elección de cuál conservar, selección explícita y confirmación de los restantes. Conserva exclusivamente la corrección y verificación del perfil elegido. Recuperación durante cinco minutos mientras no haya otros cambios; bloqueo borra esa recuperación temporal. Rechaza selecciones antiguas y revierte escrituras parciales fallidas.
5. Métricas agregadas solo en memoria, por servicio, desde la primera imagen recibida hasta salida/confirmación, con preparación, revisión/espera y operación separados. PDF cuenta entrega al navegador; compartir, aceptación por el sistema; NAS solo archivo confirmado. QR listo se cuenta aparte y su recepción requiere confirmación del operador. Impresión distingue confirmada de entregada. No es contabilidad de producción ni prueba de impresión física.
6. Guía de tres casos y archivos sintéticos de prueba para evaluar con un operador nuevo. La regresión automatizada no equivale a esa prueba humana.

## Validación y publicación

Publicada y verificada el 3 de noviembre de 2026, 7:16 a.m., hora de Ciudad de México.

- Fuente: `78354907c481a5a4ab6ca6ce53183d50e33c00d1`; contenido: `realscan-9536e5ccaa108f44`.
- npm ci completado: 101 paquetes instalados, 0 vulnerabilidades informadas.
- npm run publish terminó con código 0: verificación completa, build, comprobación de CSP/versión y despliegue de los dos Firebase. 460 marcas PASS, 0 FAIL; las marcas incluyen comprobaciones repetidas y no equivalen a casos únicos.
- [PR #18](https://github.com/pacoiglesias/fotos/pull/18) integrado; [CI de la fuente publicada](https://github.com/pacoiglesias/fotos/actions/runs/41571144415) aprobado, incluida la comprobación del publicador Windows.
- Regresión nueva: 10 grupos aprobados entre Chromium y WebKit. Prueba PDF real con selección 1,3, navegación, lupa, encaje completo en cuatro anchos, cancelación de render, cierre, ajuste reversible, perfiles, reimpresión, archivado y compartir. El archivo descargado conserva los mismos bytes al navegar o ampliar.
- Portada / y version.json sin parámetros, appVersion, sourceCommit, CSP y huellas de archivos coinciden en cinco direcciones. Se compararon 95 archivos en total.

| Dirección | Archivos comprobados | Versión |
| --- | ---: | --- |
| https://fotos-cobertores-pro.web.app | 19 | 3.38.0 |
| https://fotos-cobertores-pro.firebaseapp.com | 19 | 3.38.0 |
| https://fotos-cobertores.web.app | 19 | 3.38.0 |
| https://fotos-cobertores.firebaseapp.com | 19 | 3.38.0 |
| https://fotos.cobertores.com | 19 | 3.38.0 |

Dos ejecuciones locales se interrumpieron durante las pruebas, antes de desplegar: se corrigieron el encaje completo y una superposición con el QR, y se adaptó el escenario de fallo de generación a un cambio real de calidad. La ejecución final corresponde a la fuente y resultados anteriores. Las pruebas de Paperless usan archivos sintéticos y respuestas controladas; no certifican el acceso actual de cada navegador al NAS real.

Evidencia local ignorada: .audit/publish3380.log, .audit/publicacion-3380-verificada.json, .audit/ci3380-publication.json y .audit/review-complete/results.json. No se publica material privado de clientes. El cierre de documentos no modifica el compilado ni constituye otro despliegue.

## Pendientes humanos

Prueba con operador nuevo siguiendo [la guía](PRUEBA_MOSTRADOR_3380.md); medición HP de 50 mm, reinserción dúplex e iPhone real. No se presentan como realizadas ni se inventa calibración.
