# Registro de mejoras y correcciones — RealScan 3.6.0

Fecha de revisión: 15 de octubre de 2026. Este documento describe el alcance de esta entrega; las pruebas del hardware del negocio se distinguen de las pruebas automatizadas.

## Fallos corregidos

### Borrador: «Espacio local insuficiente»

El borrador incluía originales, recortes e imágenes procesadas dentro de localStorage. Una sola fotografía podía aparecer varias veces y agotar la cuota pequeña de ese almacén, aunque el disco tuviera espacio libre.

Ahora se guarda en una base IndexedDB independiente. Los mismos datos de imagen se almacenan una sola vez dentro del borrador. Se migra el borrador anterior únicamente después de guardarlo correctamente. Las preferencias y credenciales quedan intactas. La interfaz distingue guardando, guardado y error; un fallo real conserva la recuperación anterior y el aviso no se repite en cada edición. Cambiar de trabajo cancela guardados anteriores pendientes.

### Imagen deformada, girada o recortada nuevamente

El editor anterior enviaba las cuatro esquinas directamente a las proporciones del formato activo, aunque el archivo fuera una fotografía con otra forma. Se sustituye ese recorrido por el editor compartido, con proporción automática de inicio y selección explícita de tarjeta, A4 o Carta. Se conserva el archivo original.

La recepción por QR asigna el encuadre completo, sin otro recorte automático de blancos ni giro automático. El ajuste al formato final conserva la proporción y encaja la imagen; no la estira para llenar el marco. Después de enderezar aparece una vista previa y se exige «Usar esta imagen» antes de aceptar. La impresión a tamaño físico requiere seleccionar el formato correcto y comprobar la escala de la impresora.

## Captura móvil y editor

- Cámara posterior preferida, enfoque continuo y linterna cuando el dispositivo los admite.
- Propuesta de contorno mediante contraste y geometría, seguimiento del documento y sombreado del exterior.
- Captura automática opcional después de varios análisis consecutivos estables, con condiciones de luz y nitidez. No confirma ni envía automáticamente el documento.
- Avisos orientativos de iluminación y enfoque; captura manual y revisión si no hay bordes fiables.
- Cuatro esquinas táctiles o ajustables con teclado; rechazo de cuadriláteros cruzados.
- Cámara y galería comparten revisión, giro, filtros de documento, restauración y confirmación del resultado.
- Fotografías de personas conservan color y encuadre completo de inicio, sin aplicar automáticamente perspectiva ni filtros de documento.
- Cierre, cancelación, cambio de cámara y página oculta liberan los recursos de captura. Una respuesta tardía de permisos no reabre la cámara.

## Recepción y envío del teléfono

- Miniaturas y revisión ampliada de la bandeja del mostrador.
- Edición reversible y descarga del original.
- Frente/foto A, reverso/foto B y páginas 3 y 4; confirmación antes de reemplazar una imagen existente.
- Asignaciones simultáneas del mismo archivo se agrupan; ampliar páginas no elimina otra página ya activada.
- Quitar de bandeja no borra las caras ya asignadas. Se confirma el vaciado completo.
- En el teléfono se revisan imágenes, se restauran originales y se ordena la selección antes de enviar.
- Hasta ocho archivos por sesión; la transferencia conserva sus límites de peso y validación.
- Caducidad visible y mensajes de confirmación o fallo. Las imágenes no se envían sólo por tomar una foto.

## Entrega profesional

- Resumen de caras, miniaturas, medidas físicas, escala, papel, hojas, formato, resolución y peso máximo.
- Advertencia de caras sin imagen y confirmación antes de imprimir.
- Límites opcionales de menos de 2 MB, 1 MB, 500 KB o 250 KB por archivo, expresados en bytes decimales.
- Compresión JPG con comprobación del peso real y protección de la resolución mínima de los perfiles configurados. Se conserva el original.
- PDF individual puede reducir su imagen dentro de límites; un PNG no se convierte silenciosamente a JPG. Si un archivo no cumple el peso elegido, se avisa antes de publicar la entrega.
- Una hoja PDF completa demasiado pesada requiere cambiar el límite o la selección; no se entrega un PDF solicitado incompleto ni se promete que cualquier documento pueda entrar en cualquier peso.
- Botón WhatsApp: abre el texto y el enlace temporal en WhatsApp, sin guardar el contacto. El operador elige destinatario y confirma el envío. No se configura ni se utiliza una API de envío automático.

## OCR en el navegador

Reconocimiento con Tesseract.js y modelos de español e inglés alojados en el mismo sitio. Las imágenes se procesan en un trabajador local del navegador y no se envían a un proveedor de OCR. Los recursos grandes se cargan al solicitar la función y se pueden reutilizar sin conexión después de prepararse; no bloquean la instalación inicial del editor.

El resultado es texto editable, copiable y descargable como TXT. Se muestra una confianza estimada y se recuerda contrastar nombres, cifras y datos de identificación. No se promete exactitud total, OCR de escritura a mano ni PDF con capa de texto buscable. Cambiar de trabajo elimina el texto OCR del trabajo anterior.

## Asistente dúplex manual

Guía visual de giro lateral o vertical, pruebas A/B para imprimir en una hoja común y perfiles de impresora/bandeja con las instrucciones reales de reinserción. El operador confirma que comprobó las dos caras antes de preparar material caro.

Para un documento de frente y reverso genera dos PDF separados, conserva el proyecto y permite imprimir cada pasada al 100 %. No adivina cómo alimenta papel una impresora desconocida ni garantiza alineación mecánica. Cambiar impresora, bandeja, papel o controlador requiere repetir la prueba. Para fotos y documentos de más de dos caras continúa disponible el flujo general.

## Transferencia local P2P

WebRTC DataChannel con servidores ICE vacíos: no usa Firebase, STUN, TURN ni un servidor de señalización para transferir archivos. Un QR lleva la oferta al móvil y otro devuelve la respuesta al mostrador. El mostrador puede leerla con cámara o pegarla si hay otro medio para trasladarla.

Se validan emparejamiento, caducidad, tipos, tamaños, cantidad de archivos, fragmentos y confirmación de recepción. Una desconexión no se informa como envío completado. Los archivos aceptados llegan a la misma bandeja del mostrador.

**Condiciones necesarias:** páginas ya abiertas o preparadas en cada navegador antes de perder internet, navegadores compatibles y una red que permita conexión entre equipos. Un teléfono nuevo no puede abrir por primera vez una web pública mientras está sin internet. Las redes de invitados, aislamiento de clientes, VPN o cortafuegos pueden impedir P2P. Sin cámara en el mostrador hace falta otro medio local para introducir la respuesta. No se instala un servidor LAN ni se cambia la red del negocio.

## Pruebas y evidencias

`npm run verify` incluye las pruebas anteriores y dos suites nuevas:

- `test:capture`: detección de página inclinada, permisos, enfoque compatible, giro de cámara, perspectiva, proporciones, revisión visual, envío explícito y liberación de pistas.
- `test:practical`: borrador grande con cuota localStorage forzada, recuperación tras recargar, fallo IndexedDB y reintento, compresión contra bytes reales, preparación del enlace WhatsApp sin envío, PDF dúplex, OCR real con recursos del mismo origen, WebRTC real con HTTP desconectado, disparo automático estable y edición reversible de la bandeja.

También se mantienen autenticación, medidas físicas de PDF, respaldo/restauración, navegación, pruebas reales de Firebase, QR consecutivos, JPG/PNG/PDF, actualización de caché y suites de etapas anteriores. Evidencia local en `.audit/practical-evidence`, `.audit/capture-evidence`, `.audit/delivery-evidence` y `.audit/repair-evidence`.

Las pruebas WebRTC conectan dos contextos de navegador; no sustituyen una comprobación de la red Wi-Fi y los dispositivos físicos del negocio. Las cámaras de las pruebas son sintéticas; el OCR y los canales WebRTC sí ejecutan sus motores reales. El asistente dúplex genera PDF de prueba, pero la alimentación real de papel sólo puede verificarse en la impresora.

## Referencias consultadas

- [Genius Scan: recortar, girar, filtros y recuperar encuadre](https://help.geniusscan.com/document-management/viewing-and-editing-documents/edit-crop-and-rotate-a-scan).
- [Genius Scan: detección de documentos](https://help.geniusscan.com/other-topics/troubleshooting-and-faq/troubleshoot-scanning/better-automatic-document-detection).
- [Tesseract.js: instalación de recursos locales](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md).
- [WebRTC: canales de datos](https://webrtc.org/getting-started/data-channels).
- [MDN: señalización WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling).

Se toma como referencia el flujo de trabajo, sin copiar recursos propietarios ni afirmar equivalencia completa con una aplicación nativa.
