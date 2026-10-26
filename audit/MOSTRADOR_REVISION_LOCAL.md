# Mostrador y publicación verificada — RealScan Pro

Versión conservada: **3.27.0**. La publicación autorizada exige verificación completa, build limpio, commit en main, tag v3.27.0 y CI verde antes de Firebase Hosting. Los resultados y la identidad definitiva del despliegue se registran al concluir la verificación en vivo.

## Implementación

| Solicitud | Resultado |
|---|---|
| Recepción inmediata | Cámara principal, Archivo y Recibir por QR arriba, fuera de los pasos de edición y del panel que se oculta al activar documentos. Conserva los manejadores de recepción originales. |
| Repetir trabajo | «Imprimir otra igual» y recientes. Guarda una copia inmutable de las hojas preparadas, incluyendo imágenes, anotaciones y geometría ya corregida. Reimprimir conserva el trabajo abierto. |
| Calibración | Asistente con nombre/perfil, reglas originales horizontal/vertical de 50 mm, medición por eje, cálculo y guardado de corrección. Segunda impresión corregida y confirmación física separada. No se certifica automáticamente ninguna impresora. |
| Cierre diario | Fecha local del dispositivo, desglose papel/formato, envíos confirmados, hojas y fotos/páginas, más CSV. Excluye pendientes, fallidas, canceladas, PDF y entrega digital. En doble cara manual se contabiliza cada pasada por separado. |
| Primera carga | El lector PDF pesado deja de bloquear DOMContentLoaded. La interfaz se inicializa con su cargador pequeño y el lector se prepara en tiempo ocioso; abrir un PDF espera a que esté listo y permite reintentar un fallo de descarga. |
| INE | Acceso directo a frente/reverso en Carta, 85.60 × 53.98 mm, escala 100 %. Usa el motor compartido; no deforma ni identifica automáticamente los bordes de una tarjeta que no haya sido encuadrada. |
| Infantil | Accesos 8/12 en una hoja 4×6, 25 × 30 mm, espacios blancos y marcas de corte. **16 usa dos hojas**: no reduce el tamaño para forzar 16 dentro de los márgenes de una impresora común. |
| Varias páginas | Conserva el flujo existente: añadir, revisar, girar, reordenar, deshacer y PDF único, incluido OCR local. |
| Enderezar | Nuevo control con vista previa de giro fino, botones de 0.5°, original conservado y deshacer. Acceso al detector de bordes/perspectiva existente. La IA de fondo blanco existente se conserva. |
| Cola | «Añadir a cola», pendientes, enviado al diálogo, comprobar, confirmado y fallido/cancelado; reintento de copias exactas. **No es la cola del controlador de Windows:** el navegador no puede saber que la impresora está apagada ni certificar la salida de papel. |
| Entrega al cliente | Conserva los flujos existentes de PDF/imagen y QR/enlace, recepción remota y Wi-Fi local. No se cambian permisos, servicios ni reglas de datos. |
| Diseño | Recepción con jerarquía clara, tarjetas y botones coherentes, diseño táctil a 390 px, diálogos compartidos, foco visible, modo oscuro y letra grande del modo mostrador. No añade pasos para recibir. |

## Correcciones adicionales

- Vistas previas móviles con espacio reservado antes de cargar anotaciones; recuperación si falla la imagen.
- Vista previa de PDF móvil carga el lector cuando lo necesita.
- Eliminación de una captura conserva anotaciones, nombre y configuración de las restantes.
- Posiciones Arriba/Compacta utilizan coordenadas xMm/yMm válidas.
- El pack infantil se conserva en preferencias, borradores, trabajos y respaldos.
- Guardar preferencias conserva el perfil de impresora activo; la recalibración conserva desplazamientos anteriores.
- Historial: hasta 12 copias / 80 MB / 48 horas; metadatos para cierre durante 31 días. Limpieza al abrir el historial o iniciar la app. Eliminar una copia elimina también su registro de cierre, con lo que el CSV sirve como cierre exportable, no como libro contable inmutable.
- Los scripts inline permanecen intactos. Se corrigió un hash CSP ya desincronizado con el contenido actual y se comprobaron los hashes normalizados que procesa el navegador en ambos archivos Firebase.

## Pruebas y límites

Los resultados finales y sus limitaciones se completan al terminar las pruebas locales. No se dará por verificada una operación física mediante una prueba de navegador.

Pendiente en impresora física:

1. Imprimir en A4 la referencia original al 100 %, sin ajustar a página; medir horizontal y vertical de 50 mm.
2. Guardar medidas por impresora/bandeja, imprimir la verificación corregida y medir nuevamente.
3. Medir INE (85.60 × 53.98 mm), infantil (25 × 30 mm) y papel 4×6 (101.60 × 152.40 mm). Revisar márgenes, cortes y que el controlador no amplíe automáticamente.
4. Probar impresión con la impresora apagada, cancelación, reintento y doble cara manual. Confirmar físicamente el resultado antes del cierre diario.

Pendiente en iPhone real:

- Cámara, permisos, giro, vista previa visible y ampliación, captura de frente/reverso y documentos grandes.
- Safari y PWA desde el icono, actualización sin perder borradores y PDF sin conexión después de preparar los recursos.
- Recepción QR, Wi-Fi local, subida real a la nube y entrega del enlace desde otro teléfono. Las pruebas con relay simulado no validan el servicio real.
- AirPrint y descarga/compartir PDF; el resultado depende de iOS y del controlador.

El usuario autorizó commit, tag, push y despliegue tras las pruebas automáticas. Las comprobaciones físicas anteriores se mantienen pendientes y no se sustituyen por un CI verde. No se cambió el número de versión.

## Reparaciones de la verificación

- Impresión: se registra el identificador de la copia antes de instalar afterprint; cerrar o cancelar no suma una impresión al cierre diario.
- Windows headless: las esperas del harness consultan el estado con temporizador y los clics siguen usando eventos reales del ratón, con controles visibles y habilitados. Esto evita depender de cuadros del compositor en sesiones sin escritorio. En Linux el runtime de Playwright se conserva.
- La verificación se detiene ante el primer fallo para impedir publicar una revisión con pruebas fallidas. Cada corrección requiere repetir la verificación antes de publicar.
