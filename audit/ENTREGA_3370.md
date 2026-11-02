# RealScan Pro 3.37.0

Estado: implementación local; validación y publicación pendientes.

## Cambios y alcance

1. Impresora: perfil seleccionado visible sin confundirlo con calibración. El asistente permite usar una impresora al 100 % y medir después. Conserva perfiles y correcciones existentes; nunca registra una medición por elegir el modelo. Si hay dos perfiles con nombre HP idéntico, el acceso rápido conserva el activo en lugar de tomar el primero de la lista.
2. Un recorrido Cargar → Ajustar → Entregar, con una acción principal contextual cuyo destino puedes cambiar a imprimir, PDF, QR o NAS, y destinos agrupados; se conservan los controles y manejadores originales.
3. Detalle ampliado en la revisión, alternancia entre original y resultado y hoja de referencia. Las firmas y sellos se comprueban en esa hoja.
4. Mapa de la primera hoja con posiciones seguras (arriba, centro, junto al margen), arrastre con ajuste a anclajes, teclado y margen visual de 0–25 mm. Se mantienen las entradas numéricas y la validación de geometría. No se permite desplazar piezas fuera del papel ni cambiar su medida por arrastrarlas.
5. Diseño coherente para cabecera, recepción, pasos, destinos, controles y diálogos; adaptación móvil y tema oscuro. Solo pantalla: no modifica CSS de impresión.
6. Centro Paperless con carga, archivo y configuración; explica dónde queda cada copia y que procesamiento no equivale a archivado.
7. Rapidez de sesión: promedios por servicio desde la primera imagen recibida hasta trabajo listo; tiempos y acciones agregados en memoria. No persiste imágenes, nombres, títulos, firmas ni datos de clientes. La sesión se vacía al bloquear o abandonar la página.

## Validación prevista

- npm ci, npm run verify (incluye check, compilación, check-build y regresiones Chromium/WebKit), npm run publish con fuente comprometida.
- Regresión integrada: selección HP sin calibración ficticia, cambio y recarga, original/resultado, mapa con teclado/margen, PDF e impresión sin duplicados, acceso NAS, tres servicios, cinco anchuras y ambos temas.
- Comprobar version.json, CSP y contenido servido en ambos Firebase y dominio antes de declarar entrega.

## Pendientes humanos

Medición física HP de 50 mm, alimentación dúplex e iPhone real; comparación de tiempos con operador nuevo. No bloquean las pruebas de software ni se presentan como realizadas.

## Limpieza

Se retiraron 47,058 archivos generados en 14 destinos explícitos; 1924.02 MiB recuperados. Incluye dos ZIP antiguos de CI, instantáneas temporales de versiones previas y derivados de casos privados en .audit. Se comprobaron rutas absolutas y ausencia de enlaces antes de eliminar. Se conservaron documentos originales en Downloads, backups, historial de Git, configuración Firebase y evidencia de la entrega anterior. Los compilados actuales, dependencias y resultados de pruebas se mantienen fuera de Git. Manifiesto local ignorado: .audit/cleanup3370.json.
