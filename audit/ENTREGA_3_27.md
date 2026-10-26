# RealScan 3.27.0 · Revisión de entrega

## Cambios
- Entrada «Escanear primero»: captura en memoria, clasificación posterior y confirmación explícita para sustituir un trabajo abierto. Cancelar conserva el servicio anterior.
- Identificaciones: revisión de bordes antes de asignar la captura; formato ID-1 de 85,60 × 53,98 mm. Conservar proporciones no garantiza tamaño físico si se conserva fondo alrededor o la impresora aplica ajuste de página.
- Interfaz: tarjetas de servicio, controles táctiles, vista previa destacada, colores coherentes, foco de teclado y movimiento reducido. Pantalla independiente de las medidas de impresión.
- Sellos COPIA, RECIBIDO y fecha, REVISADO, ANULADO, CONFIDENCIAL y texto propio. Selección de páginas/rangos, posición, intensidad, color, deshacer y quitar.
- Firma manuscrita: dibujo o imagen, eliminación opcional de fondo blanco, conservación de proporciones y almacenamiento reutilizable solo a petición.
- Copias identificadas: destinatario y folio; registro local de la preparación/descarga y huella SHA-256 del PDF. No detecta fotografías ni fotocopias posteriores.
- Entrega PDF: páginas seleccionadas, calidad alta/ligera, tamaño real del archivo y vista previa. Cambiar opciones invalida la entrega preparada.
- Comparación original/resultado con deslizador y lupa; opciones visuales de acabado en la captura.
- Anotaciones separadas de las imágenes originales y comunes al PDF y la hoja de impresión. Persistencia en borradores de mostrador, documentos y móvil.

## Límites de validación
La firma con certificado queda fuera por decisión del usuario. Una firma dibujada o marca visible no equivale a firma criptográfica ni a certificación legal. El registro vive en este navegador y no acredita quién hizo una copia física. La orientación de alimentación y el tamaño físico final requieren una prueba en la impresora real.

## Verificación
El proceso de entrega ejecuta `npm run verify` en GitHub Actions (Chromium, WebKit y pruebas del publicador en Windows), revisión de dependencias, build desde el commit y verificación posterior de versión/commit en los cuatro dominios. Los resultados efectivos de ejecución y publicación se conservan en el registro de entrega; este documento describe el alcance, no anticipa resultados.
