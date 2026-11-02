# RealScan Pro 3.37.0

Estado: **publicada y verificada en ambos Firebase y en el dominio habitual**.

## Cambios y alcance

1. Impresora: perfil seleccionado visible sin confundirlo con calibración. El asistente permite usar una impresora al 100 % y medir después. Conserva perfiles y correcciones existentes; nunca registra una medición por elegir el modelo. Si hay dos perfiles con nombre HP idéntico, el acceso rápido conserva el activo en lugar de tomar el primero de la lista.
2. Un recorrido Cargar → Ajustar → Entregar, con una acción principal contextual cuyo destino puedes cambiar a imprimir, PDF, QR o NAS, y destinos agrupados; se conservan los controles y manejadores originales.
3. Detalle ampliado en la revisión, alternancia entre original y resultado y hoja de referencia. Las firmas y sellos se comprueban en esa hoja.
   La prueba de recolección con WeakRef reprodujo una retención del objeto preparado en los manejadores del visor. Se retira ese argumento innecesario: los controles consultan el trabajo actual y no conservan la entrada anterior ni su iframe. Se comprueba con recolección forzada en Chromium; WebKit comprueba el cierre y limpieza de las imágenes, sin afirmar una medición de heap que no ofrece.
4. Mapa de la primera hoja con posiciones seguras (arriba, centro, junto al margen), arrastre con ajuste a anclajes, teclado y margen visual de 0–25 mm. Se mantienen las entradas numéricas y la validación de geometría. No se permite desplazar piezas fuera del papel ni cambiar su medida por arrastrarlas.
5. Diseño coherente para cabecera, recepción, pasos, destinos, controles y diálogos; adaptación móvil y tema oscuro. Solo pantalla: no modifica CSS de impresión.
6. Centro Paperless con carga, archivo y configuración; explica dónde queda cada copia y que procesamiento no equivale a archivado.
7. Rapidez de sesión: promedios por servicio desde la primera imagen recibida hasta trabajo listo; tiempos y acciones agregados en memoria. No persiste imágenes, nombres, títulos, firmas ni datos de clientes. La sesión se vacía al bloquear o abandonar la página.

## Validación ejecutada

- npm ci, npm run verify (incluye check, compilación, check-build y regresiones Chromium/WebKit), npm run publish con fuente comprometida.
- Regresión integrada: selección HP sin calibración ficticia, cambio y recarga, original/resultado, mapa con teclado/margen, PDF e impresión sin duplicados, acceso NAS, tres servicios, cinco anchuras y ambos temas.
- Comprobados version.json, CSP y contenido servido en ambos Firebase y el dominio, incluida la portada sin parámetros.

## Publicación comprobada

- Verificación: 2 de noviembre de 2026, 4:29 p.m., hora de Ciudad de México.
- Fuente publicada: `f13b46be3b3f18284f67a9e8e483ae45c937aeca`. Contenido: `realscan-781411c417b9da3e`.
- npm ci: 101 paquetes instalados; 0 vulnerabilidades informadas. npm run publish terminó con código 0 tras verificar y desplegar los dos sitios.
- 450 marcas PASS y 0 FAIL en el publicador; incluye comprobaciones repetidas, no equivale a casos únicos.
- [PR #17](https://github.com/pacoiglesias/fotos/pull/17) integrado. [CI de la fuente publicada](https://github.com/pacoiglesias/fotos/actions/runs/41533436459): aprobado.
- En cada dirección se comprobaron también la portada / y version.json sin parámetros para detectar una publicación antigua en la dirección habitual. Se compararon appVersion, versión de contenido, sourceCommit, CSP y huellas de archivos: 330 comparaciones de archivos en total.

| Dirección | Archivos comprobados | Versión |
| --- | ---: | --- |
| https://fotos-cobertores-pro.web.app | 66 | 3.37.0 |
| https://fotos-cobertores-pro.firebaseapp.com | 66 | 3.37.0 |
| https://fotos-cobertores.web.app | 66 | 3.37.0 |
| https://fotos-cobertores.firebaseapp.com | 66 | 3.37.0 |
| https://fotos.cobertores.com | 66 | 3.37.0 |

Las regresiones de la nueva revisión probaron tres servicios en Chromium y WebKit. Los tiempos sintéticos hasta vista preparada constan en .audit/counter-evolution/results.json; no son una evaluación de rapidez de un operador. El publicador repite también la simulación de uso continuado de la suite.

Evidencia local ignorada: .audit/publish3370.log, .audit/publicacion-3370-verificada.json, .audit/ci3370-publication.json y .audit/cleanup3370.json. El cierre de estos documentos no modifica el compilado ni constituye otro despliegue.

## Pendientes humanos

Medición física HP de 50 mm, alimentación dúplex e iPhone real; comparación de tiempos con operador nuevo. No bloquean las pruebas de software ni se presentan como realizadas.

## Limpieza

Se retiraron 47,058 archivos generados en 14 destinos explícitos; 1924.02 MiB recuperados. Incluye dos ZIP antiguos de CI, instantáneas temporales de versiones previas y derivados de casos privados en .audit. Se comprobaron rutas absolutas y ausencia de enlaces antes de eliminar. Se conservaron documentos originales en Downloads, backups, historial de Git, configuración Firebase y evidencia de la entrega anterior. Los compilados actuales, dependencias y resultados de pruebas se mantienen fuera de Git. Manifiesto local ignorado: .audit/cleanup3370.json.

La rama temporal codex/mostrador-integrado-3370 se retiró del remoto y del equipo después de comprobar su integración y que conservaba la punta esperada. No se retiraron otras ramas, etiquetas ni copias de seguridad.
