# RealScan 3.7.0 — auditoría del flujo móvil y captura

Fecha: 15 de octubre de 2026. Origen: movimiento inesperado y aparente deformación al cargar y revisar fotos, tanto en el sistema principal desde móvil como en la recepción por QR.

## Hallazgos

1. La carga restablecía el zoom, pero conservaba el desplazamiento de la imagen anterior. Las fotografías además podían girarse y rellenar el marco con recorte automáticamente.
2. Arrastrar la vista previa estaba habilitado de forma implícita. Un gesto destinado a desplazar la página podía cambiar el encuadre. Cada procesamiento reconstruía los elementos de la hoja y destruía el nodo que retenía el puntero durante el gesto.
3. El control visual de «Encajar Todo» podía indicar otro modo al que realmente se estaba aplicando.
4. La cámara solicitaba enfoque continuo al abrir, sin una acción clara para reintentarlo o una explicación de los equipos que no lo permiten. La presentación no distinguía suficientemente captura, revisión y confirmación.
5. La capa SVG se intentaba ocultar con una propiedad que no añadía el atributo `hidden`; podía seguir mostrando un marco de documento en fotografías y sobre la confirmación final.
6. La geometría del visor no se reajustaba al cambiar el tamaño de pantalla. La detección utilizaba un umbral fijo que descartaba algunos documentos claros sobre fondos claros uniformes.
7. La recepción móvil trataba la edición como documento por defecto, también para retratos. El diagnóstico del sistema principal no permitía conocer por sí solo lo sucedido en otro teléfono.
8. El inspector afirmaba «300 DPI óptimo» por el ancho de la imagen, sin considerar su tamaño de impresión, y presentaba la escala como verificada sin una medición física.

## Correcciones y mejoras

- Fotografías importadas completas, centradas y sin giro automático. El relleno con recorte se mantiene como elección explícita. Se sincronizan los controles de ajuste con el estado real.
- Vista de hoja bloqueada inicialmente. «Ajustar encuadre» habilita el desplazamiento y «Terminar ajuste» vuelve a bloquearlo. Las imágenes no permiten el arrastre nativo del navegador.
- Los gestos se agrupan por fotograma; la actualización conserva los nodos y la captura del puntero. Se reduce la resolución sólo durante el ajuste y se genera de nuevo la salida completa al terminar. Cargar otra imagen bloquea de nuevo el encuadre.
- Selector móvil de Documento/Fotografía; en fotografía no se aplica enderezado de documento. El QR lleva una indicación de modo basada en el trabajo del mostrador. Es una preferencia de presentación y no cambia las credenciales ni las reglas del servidor.
- Nuevo diseño de cámara con pasos visibles, indicadores de luz, nitidez estimada y estabilidad, acciones de tamaño táctil y bandeja de acciones accesible al desplazar el diálogo.
- Reintento de enfoque mediante las capacidades declaradas por el dispositivo. Una solicitud sin respuesta tiene un límite de espera; no debe bloquear indefinidamente la cámara. Exposición y balance de blancos automáticos se solicitan sólo si están soportados. La alternativa de cámara nativa permanece disponible.
- El marco de documento se oculta de verdad en fotografía y en la confirmación final. El visor recalcula sus dimensiones al cambiar la pantalla y conserva la proporción de la fuente. El fondo de la página queda bloqueado mientras está abierto el diálogo y recupera su estado al cerrarlo.
- Detector con umbral adaptable al fondo uniforme, estabilización visual del contorno y condiciones de tamaño, luz, nitidez y movimiento para la captura automática opcional. El formato seleccionado por el operador se propone en la cámara del sistema principal.
- Inspector con resolución estimada según píxeles y milímetros, orientación efectiva y mensajes de revisión, sin afirmar una calibración física inexistente.
- Diagnóstico descargable también en el teléfono de recepción. Registra solicitudes de enfoque, dimensiones capturadas y medidas de calidad permitidas; excluye imágenes, nombres de clientes, tokens y enlaces de sesión.

## Pruebas y evidencias

`scripts/mobile-workflow-regression.cjs` reproduce el flujo con un navegador Chromium configurado como móvil y eventos táctiles reales del navegador: entrada de archivo, sustitución, orientación conservada, gesto con encuadre bloqueado, arrastre explícito sin perder el nodo, confirmación de cámara, cambios de pantalla, enfoque soportado/no soportado, modo fotografía del remitente, revisión antes de enviar y descarga de diagnóstico. El transporte de esta prueba de interfaz se simula; las pruebas generales de QR utilizan Firebase real.

`scripts/capture-regression.cjs` verifica además documentos inclinados, fondos uniformes con poco contraste, estimación de desenfoque, capacidades de enfoque y linterna, liberación de cámara, permisos tardíos, alternativa nativa y revisión en el remitente. `scripts/photo-layout-regression.cjs` conserva las pruebas de proporción, marcas y 1.248 distribuciones.

Evidencias locales: `.audit/mobile-workflow/`, `.audit/capture-evidence/` y `.audit/photo-layout/`. La verificación general y las comprobaciones de publicación y respaldo se ejecutan antes de cerrar la entrega; el manifiesto de `backups/` identifica el commit y los archivos publicados.

Resultado local: `npm run verify` completo aprobado con `REALSCAN_TEST_RELAY=1`, incluida la descarga real de JPG, PNG y PDF y su revocación, recuperación de borrador con cuota insuficiente, OCR local, WebRTC sin acceso HTTP, actualización desde caché antigua y las pruebas de regresión anteriores. Las nueve comprobaciones del nuevo recorrido móvil finalizaron sin errores JavaScript no controlados. El visor mantuvo una relación de 1,33339 frente a 1,33333 de la fuente al cambiar la pantalla. También se verificó que exportar espera a que termine el gesto y que una petición de enfoque sin respuesta no bloquea la captura. Estos resultados no representan una prueba del objetivo físico del teléfono del usuario.

## Referencias y límites prácticos

Se revisó la [guía oficial de calidad de Genius Scan](https://blog.thegrizzlylabs.com/2022/10/how-to-improve-scan-quality.html) y la documentación de [capacidades y restricciones de cámara del navegador](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Constraints). La superficie plana, el margen visible, la luz uniforme y la ausencia de objetos que interfieran siguen siendo necesarios. No se ha incorporado el SDK comercial de Genius Scan ni se afirma equivalencia con su aplicación nativa.

La nitidez es una estimación; una solicitud de enfoque aceptada no prueba que el objetivo físico haya enfocado. Las capacidades dependen del teléfono y del navegador. Las pruebas de cámara utilizan imágenes y cámaras simuladas, no el teléfono físico del usuario. En casos difíciles, usa la cámara nativa o corrige manualmente las esquinas y comprueba el resultado. Para preservar la forma al enderezar, selecciona el formato conocido y revisa la confirmación. El original se conserva para repetir el ajuste.

El tamaño final en papel requiere imprimir al 100 % y comprobarlo físicamente. No se promete la ausencia de cualquier error futuro.
