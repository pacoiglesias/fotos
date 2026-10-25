# RealScan: tres etapas de usabilidad

## Etapa 1 — 3.21.0
Panel por servicio, tamaños ilustrados, cantidades rápidas, juegos separados de fotos por juego y resumen permanente. Ajustes avanzados recogidos. Documentos con salida en color o gris, juegos para impresión y guía de doble cara manual. El PDF digital mantiene una copia del documento.

Las medidas permanecen en el motor compartido. Los juegos de fotos/identificaciones se reflejan en vista previa, PDF e impresión. Límite de diez juegos. No se cambia el papel ni la medida solicitada automáticamente.

Validación: build y regresión service-flow (formatos, cantidades, hojas reales, opciones de documentos, bloqueo y tamaños de pantalla).

Las etapas siguientes añaden edición y recuperación, y después asistencia y rendimiento.

## Etapa 2 — 3.22.0
Edición de foto/identificación seleccionada con deshacer, rehacer y reemplazar; repetición del servicio con confirmación de limpieza. Documentos con historial de ocho acciones y hasta 24 MB adicionales de imágenes históricas, selección por miniatura y teclado, reordenación arrastrando o por botones, reemplazo de imagen y edición tocando la página de salida. El historial se limpia al terminar el servicio. Se conservan los originales y la recuperación local existente.

## Etapa 3 — 3.23.0
Avisos con solución explícita cuando no caben las fotos y al detectar resolución baja. Revisión solicitada por el operador de páginas posiblemente vacías, duplicados exactos y nitidez; nunca se elimina contenido automáticamente. Orientación/encuadre se revisan visualmente, sin inferir el sentido del texto. Preparación anticipada y caché de hojas de impresión; caché del PDF de documento invalidada por cambios. OCR y herramientas pesadas mantienen carga diferida. Navegación guiada y recorrido comparten eventos de actualización en lugar de dos temporizadores. Al cerrar el diálogo de impresión se pide comprobar el papel, sin dar por realizada la impresión.

Doble cara de documentos: PDFs separados de impares y pares, con reverso vacío al final de cada juego impar. No se configura automáticamente la impresora. Se conserva una copia del documento en la entrega digital. Vista previa en gris cuando se solicita ese acabado.

Validación: regresiones de flujo, impresión, composición, documentos y suite de GitHub Actions. Los controles de impresión física requieren la impresora real. La conexión al entorno Windows se perdió durante el cierre; GitHub conserva las tres etapas, y las correcciones finales se comprueban en CI. El despliegue exige checkout limpio de release/3.23.0 y verificación de ambos sitios.
