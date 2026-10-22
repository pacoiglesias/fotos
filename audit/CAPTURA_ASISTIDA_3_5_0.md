# Captura asistida y revisión visual — 3.5.0

## Cambios

- Resumen antes de imprimir: miniaturas de las caras utilizadas, tamaño en milímetros, escala aplicada, papel, hojas, copias y destino. Confirmación explícita antes de abrir la impresión.
- Resumen de entrega actualizado con los selectores de formato, límite de píxeles, caras y hoja PDF. Sólo muestra imágenes que forman parte de esa entrega.
- Cámara asistida compartida entre mostrador y portal del teléfono. Prefiere cámara trasera y resolución alta; solicita enfoque continuo y ofrece linterna únicamente si el dispositivo declara esas capacidades.
- Propuesta de bordes basada en contraste con el fondo y geometría de una región conectada. Analiza una imagen reducida y separa las propuestas de la aceptación del usuario.
- Revisión de las cuatro esquinas, ajuste táctil o con flechas y corrección de perspectiva con el motor local existente. Se rechazan esquinas cruzadas, degeneradas o fuera de la imagen.
- Alternativas de repetir, conservar foto completa o usar cámara nativa. Los perfiles de fotografía conservan la toma completa, sin aplicar el recorte de documento.
- Tras aceptar una captura del mostrador, se conserva ese encuadre sin aplicar un segundo recorte automático de blancos.
- La proporción se puede elegir como tarjeta, A4, Carta u otro documento; el mostrador parte de su formato activo. La guía y la corrección respetan esa elección. La captura aceptada se encaja completa en el formato final, sin rellenar cortando bordes.
- Avisos orientativos sobre luz y nitidez. La cámara se detiene al capturar, cerrar, cambiar de cámara, ocultar o abandonar la página; una autorización tardía no reabre la ventana ni deja la cámara encendida.
- Diagnóstico local de apertura, cierre, indisponibilidad y aceptación de captura, sin fotografías ni mensajes privados. Recuperación por Alt+Shift+R también desde el visor.
- El teléfono muestra miniaturas y nunca transmite la captura hasta pulsar «Enviar». Se bloquean operaciones concurrentes durante la preparación y el envío; se copia la selección de archivos antes de reiniciar el control nativo.
- Pruebas de versión consultan package.json; se corrige el uso de response.ok en la verificación de publicación.

## Verificación

La revisión completa incluye sintaxis, compilación, autenticación, edición, medidas físicas en PDF, respaldo/restauración, navegación, QR reales de recepción y entrega, recuperación de caché y las doce suites anteriores.

`npm run test:capture`, incluido también en `npm run verify`, comprueba:

1. Detección de página inclinada sobre fondo contrastante; rechazo de escena vacía y cuadrilátero cruzado.
2. Solicitud de enfoque continuo cuando está disponible, linterna, captura de alta resolución y perspectiva corregida.
3. Botón real de impresión con resumen y resumen de entrega actualizado al cambiar formato y píxeles.
4. Conservación de fotografía completa, captura alternativa desde vídeo, repetir y cambiar cámara, cierre y recuperación sin cámaras abiertas.
5. Permiso pendiente o denegado y alternativa nativa.
6. Flujo del portal a 390 px: encuadre visible, miniatura y envío exclusivamente después de confirmación.

La cámara de estas pruebas es sintética; sirve para verificar geometría, controles, estados y liberación de recursos. La recepción y descarga por Firebase se prueban por separado con sesiones reales y navegadores independientes. Evidencias locales en `.audit/capture-evidence` y `.audit/delivery-evidence`.

## Límites y comprobación práctica

La detección funciona mejor sobre una mesa uniforme que contraste con el documento. Un fondo parecido, sombras fuertes, reflejos o varios objetos pueden impedir o confundir la propuesta; por eso siempre se revisan las esquinas y existe la opción de conservar la foto completa. Los avisos de nitidez son estimaciones, no una certificación de legibilidad. No se promete reconstruir texto desenfocado.

El enfoque físico, la resolución de fotografía y la linterna dependen del dispositivo y del navegador. No se necesitan servicios externos de IA ni permisos de micrófono. El navegador no controla un escáner físico: sus archivos se importan mediante el flujo existente.

Una fotografía no revela por sí sola el tamaño físico del papel. En el mostrador debe elegirse el formato correcto; para imprimir a tamaño real hay que usar 100 % sin ajuste a página y comprobar la calibración de la impresora. Queda pendiente validar el hardware específico del negocio con Android, iPhone e impresora reales; no se confunde esa prueba física con la automatizada.
