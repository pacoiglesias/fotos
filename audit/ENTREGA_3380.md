# RealScan Pro 3.38.0

Estado: implementación local; pruebas y publicación pendientes.

## Alcance

1. Entrega PDF con anterior/siguiente, contador y lupa 150/200 %. Navega el archivo generado, incluidas las selecciones de páginas. La ampliación solo afecta a la vista. Cambiar ajustes cancela el render anterior; cerrar libera canvas, tarea PDF e historial temporal.
2. Deshacer/Rehacer para los ajustes de revisión de INE/fotos. Hasta 20 pasos en memoria, con papel, caras, juegos, cantidades, márgenes, posición, encabezado y escala. Conserva imágenes y anotaciones. Al cerrar, cambiar de trabajo o bloquear se vacía el historial; no va a localStorage ni a presets.
3. Revisión compacta: papel, caras, cantidad, márgenes, corte y posición accesibles. Encabezado, rótulos, regla y escala en Opciones avanzadas; mantiene los selectores originales y el estado de apertura durante la edición.
4. Comparador de perfiles con el mismo nombre: ninguna retirada automática, elección de cuál conservar, selección explícita y confirmación de los restantes. Conserva exclusivamente la corrección y verificación del perfil elegido. Recuperación durante cinco minutos mientras no haya otros cambios; bloqueo borra esa recuperación temporal. Rechaza selecciones antiguas y revierte escrituras parciales fallidas.
5. Métricas agregadas solo en memoria, por servicio, desde la primera imagen recibida hasta salida/confirmación, con preparación, revisión/espera y operación separados. PDF cuenta entrega al navegador; compartir, aceptación por el sistema; NAS solo archivo confirmado. QR listo se cuenta aparte y su recepción requiere confirmación del operador. Impresión distingue confirmada de entregada. No es contabilidad de producción ni prueba de impresión física.
6. Guía de tres casos y archivos sintéticos de prueba para evaluar con un operador nuevo. La regresión automatizada no equivale a esa prueba humana.

## Validación y publicación

Pendientes de registrar después de ejecutar npm ci, verificación completa, compilación, CI y publicador oficial. Se comprobarán appVersion, sourceCommit, CSP, archivos y portada sin parámetros en ambos Firebase y el dominio.

## Pendientes humanos

Prueba con operador nuevo siguiendo [la guía](PRUEBA_MOSTRADOR_3380.md); medición HP de 50 mm, reinserción dúplex e iPhone real. No se presentan como realizadas ni se inventa calibración.
