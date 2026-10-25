# RealScan 3.24.0 — mostrador y documentos

Cambios incorporados el 25 de octubre de 2026 sobre release/3.23.0, conservando el código y la configuración local.

- Modo rápido con acceso explícito al modo completo, controles de tamaño/cantidad y acción principal fija.
- Cola local: hasta seis copias y 80 MB, caducidad de 48 horas y estados pendiente, revisión, listo y entregado. Cambiar de pedido guarda el trabajo abierto antes de sustituirlo. Entregado elimina las imágenes de esa copia, no las del trabajo abierto.
- Selección múltiple de páginas y lotes de giro, blanco y negro, restauración y eliminación. Cada lote genera un solo paso de deshacer y requiere revisar de nuevo las páginas modificadas.
- Encabezado plegable: activar, texto de hasta 48 caracteres y ejemplo visible. El nombre del pedido es independiente del texto impreso. Los documentos reservan 12 mm; la geometría se comparte entre vista, PDF e impresión.
- Distribución arriba, centrada y compacta. Compacta alinea al margen superior izquierdo y conserva las medidas; no cambia automáticamente la cantidad solicitada.
- Impresión directa de documentos con revisión, juegos completos y selección de pares/impares. El PDF continúa como alternativa. La preparación directa no ejecuta OCR.
- PDF de alta calidad conserva los PNG/JPEG admitidos y utiliza PNG sin pérdida para imágenes procesadas. Los originales de los PDF importados siguen disponibles: la versión editable es una conversión a imágenes.
- Los respaldos y borradores documentales conservan la selección de idioma y PDF buscable. El OCR abierto para otra imagen cancela el proceso anterior.
- Publicador Windows: captura stderr sin saltarse el control de errores, informa el paso detenido, distingue una publicación no iniciada de una posiblemente parcial y excluye el acceso interactivo del transcript.

Validación y límites

La versión se considera candidata hasta completar las pruebas automatizadas. Las evidencias se escriben en .audit/workbench-324 y la comprobación completa es npm run verify. Las pruebas del publicador simulan servicios externos: no demuestran una publicación real.

La comprobación real de Firebase en esta sesión devuelve credenciales caducadas. El despliegue necesita renovar la sesión mediante autenticar_y_desplegar.bat. No se debe anunciar publicado hasta verificar versión y commit en los cuatro dominios configurados.

El navegador no confirma la entrega física de papel. Deben comprobarse orientación, márgenes, escala 100 %, orden de doble cara y calidad real de la impresora. El OCR es automático y puede equivocarse con imágenes borrosas; revisar nombres y números.
