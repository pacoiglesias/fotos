# Registro de cambios de RealScan

Este registro describe los avances del código. Un build o un push no acreditan una publicación: el deploy se confirma comprobando el mismo commit y build en los dominios de ambos sitios. Las pruebas físicas de papel, giro y calidad se realizan con la impresora del establecimiento.

## 3.27.0 - Firmas, sellos y entrega visual

- Firmas manuscritas dibujadas o importadas; eliminación de fondo blanco y guardado opcional en este navegador.
- Sellos COPIA, RECIBIDO con fecha, REVISADO, ANULADO, CONFIDENCIAL y texto personalizado; tamaño, intensidad, color, posición y marca de agua diagonal.
- Selección de páginas, deshacer y quitar anotaciones, conservando imágenes originales y capa independiente en PDF, JPG e impresión.
- Copias identificadas por destinatario y folio; registro local de preparación/descarga y comprobación de coincidencia exacta por SHA-256. No detecta fotocopias ni acredita quién las realizó.
- Entrega de PDF por páginas o rangos, calidad alta/ligera, nombre y tamaño real del archivo, con vista previa del PDF preparado.
- Comparador deslizante y lupa; accesos visuales a los acabados de captura y cuenta regresiva para captura automática estable.
- Firma criptográfica con certificado aplazada por decisión del usuario al priorizar estas mejoras. La firma manuscrita y las marcas no se anuncian como certificación.

## 3.26.0 - Mostrador visual y doble cara guiada

- Interfaz coherente de mostrador y móvil: tarjetas de servicio, contraste, controles táctiles y vista previa de la hoja.
- Botones de papel frecuente conectados a las medidas reales y plantillas de encabezado editables con miniaturas.
- Prueba A/B con borde naranja ARRIBA, selección explícita de cara y borde de entrada y dibujo que cambia con esas respuestas.
- Perfiles de impresora, bandeja y papel comprobados por el usuario; se recuperan al abrir la guía. Los perfiles antiguos conservan notas y requieren completar la colocación.
- El dibujo guardado aparece al reinsertar papel en documentos. En identificaciones se confirma la recolocación antes de preparar el reverso; cambios del trabajo invalidan la primera pasada.
- Las medidas de impresión y los motores de captura, PDF y OCR se mantienen compartidos. La orientación física requiere la prueba en la impresora real.

## Ajuste del BAT - 25 de octubre de 2026

- Los mensajes de progreso nativos se muestran como texto sin bloques NativeCommandError de PowerShell. Se conservan stderr y los codigos de salida reales; pruebas con procesos reales que terminan en 0 y 7.

## 3.25.1 — corrección del publicador

- La autenticación, la comprobación de acceso y el deploy usan la API oficial de firebase-tools.
- Se evita el manejador de cierre de la CLI que intentaba escribir lastError en el perfil local después de completar la operación.
- Las credenciales y los permisos se conservan. Los errores reales de autenticación, red y despliegue siguen dando salida no exitosa.
- Se mantiene la comprobación del mismo commit y build en los cuatro dominios.
- Pruebas del adaptador y del BAT para que una operación rechazada nunca se anuncie como completada.

## 3.25.0 — 25 de octubre de 2026

### Escaneo más claro para cada servicio
- Tarjetas visuales de identificación, documento y fotografía en el móvil.
- Frente y reverso con estados y acceso a la captura confirmada; encabezados que indican qué cara o página se revisa.
- La fotografía conserva sus proporciones; los documentos conservan su recorrido de ajuste de bordes y revisión.
- Acción inferior accesible que cambia entre capturar, añadir, guardar o revisar; opciones especiales agrupadas.
- Repetir mediante la cámara nativa sustituye la captura elegida, con protección frente a selecciones tardías de otro servicio.

### PDF y entrega desde el teléfono
- Nombre de archivo, idioma y selección OCR conservados en el borrador.
- Compartir PDF mediante el menú del dispositivo cuando se admite, con descarga alternativa y cancelación que conserva el trabajo.
- Conservación de PNG/JPEG normalizados en el PDF para evitar una recompresión adicional.
- Recepción por QR con imágenes mayores y botón de envío fijo. La confirmación sigue dependiendo de la recepción real del mostrador.

### Mostrador e impresión
- Dibujos y explicaciones que distinguen ambas caras de una identificación juntas en una página de la impresión física por los dos lados del papel.
- Fotografías: separación entre fotos por juego, juegos completos, total de fotos y una copia en el controlador cuando los juegos ya están incluidos.
- Accesos de impresión de documentos dirigidos a una misma revisión, conservando la alternativa PDF.
- Doble cara manual: primera pasada, confirmación de que el papel se ha recolocado y continuación a reversos. Un cambio del trabajo bloquea una continuación obsoleta.
- Prueba de giro accesible, sin suponer cómo alimenta o entrega papel cada impresora.

Validación: batería completa `npm run verify`, pruebas del publicador Windows y recorridos adicionales de móvil en Chromium y WebKit. Véase [la auditoría de esta versión](audit/MOVIL_3_25.md) y [GitHub Actions](https://github.com/pacoiglesias/fotos/actions). Las pruebas de compartir simulan la API nativa; no acreditan el envío a aplicaciones externas ni sustituyen una prueba en teléfonos físicos.

## 3.24.0
- Modo rápido del mostrador y cola local con estados, guardado de pedidos y protección al cambiar de trabajo.
- Actualización del pedido activo sin crear copias duplicadas; entrega que elimina las imágenes de la copia conservando el trabajo abierto.
- Selección de páginas y edición por lotes con un paso de deshacer, incluida la recuperación de la selección.
- Encabezado configurable, ejemplo visual y espacio reservado en documentos; nombre del pedido independiente del texto impreso.
- Distribución arriba, centrada y compacta sin modificar las medidas solicitadas.
- Impresión directa de documentos con juegos y caras impares/pares; PDF como alternativa.
- PDF de alta calidad y respaldo de los ajustes OCR; mejoras de cancelación del lector.
- Publicador que comprueba versión y commit, informa el paso fallido y distingue una publicación no iniciada de una posiblemente parcial.

Detalle: [auditoría 3.24](audit/MEJORAS_MOSTRADOR_3_24.md).

## 3.23.0
- Avisos con acciones correctivas cuando las cantidades no caben, sin reducir silenciosamente el pedido.
- Revisión solicitada por el operador de posibles páginas vacías, duplicados exactos y calidad estimada.
- Preparación anticipada de impresión y cachés invalidadas cuando cambia el contenido.
- Separación de impares/pares y reversos vacíos entre juegos con número impar de páginas.
- Confirmación del papel después de cerrar la ventana, sin suponer una impresión realizada.

## 3.22.0
- Deshacer, rehacer, reemplazo de imágenes y repetición del servicio con confirmación.
- Historial de documentos, selección por miniaturas, orden por arrastre o botones y conservación de originales.

## 3.21.0
- Panel por servicio con tamaños, cantidades rápidas y juegos completos.
- Resumen del pedido y controles de documentos reunidos; ajustes avanzados agrupados.

Detalle de 3.21–3.23: [mejoras en tres etapas](audit/MEJORAS_TRES_ETAPAS.md).

## 3.20.0
- Estudio visual con tarjetas de servicio, hoja en vivo y herramientas de edición próximas a la imagen.
- Comparación original/resultado, formatos frecuentes guardados sin fotos y revisión del cliente.

Detalle: [estudio visual 3.20](audit/ESTUDIO_3_20_0.md).
