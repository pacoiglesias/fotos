# RealScan 3.28.0 — auditoría y mejoras desde 3.27.0

Base: main 396015856742a3145361638e1ddeda2c71ab187a. Se conserva el desarrollo de mostrador, firmas, anotaciones, calibración, impresión y flujo móvil de 3.27.0. La carpeta original se conserva durante el trabajo aislado.

## Fallos reproducidos y reparaciones

1. El publicador del usuario se detuvo en mobile-workflow-regression al perder el arrastre. La prueba nueva fuerza updateUI durante un gesto real por CDP y reproduce el fallo. El render de la hoja conserva los nodos de colocación mientras existe un arrastre; el resultado final se vuelve a renderizar al soltar. No se quita ni relaja la aserción.
2. La recuperación de nube podía guardar solo las páginas descargadas y anunciar éxito. Ahora valida todas las páginas antes de guardar el trabajo; una página ausente, imagen inválida, falta de espacio o cambio de metadatos conserva el trabajo pendiente. Las solicitudes dobles se agrupan.
3. Las copias nuevas tienen huella SHA-256 por imagen y estado en proceso/lista. Solo se anuncian listas después de subir todas las imágenes. Se revisan de nuevo los metadatos antes de guardar la recuperación. Las copias antiguas siguen siendo legibles, pero no tienen esa comprobación de huella.
4. El publicador obtiene la versión desde package.json, conserva el rechazo de un main no aprobado y la comprobación del commit. Sus escenarios de Windows usan la versión de la aplicación sin fijar una entrega antigua.

## Acabado visual y operativo

- Panel común para cámara, móvil, mostrador y páginas de documentos. Comparación antes/después, intensidad graduable, cancelar, aplicar y original conservado.
- Mejora conservadora de contraste, reducción suave de ruido en zonas planas y nitidez limitada. Corre en un Worker local, con cancelación, límite de tamaño y tiempo. Las proporciones y las dimensiones no cambian; la confirmación final usa la resolución completa.
- Fotografías transparentes conservan transparencia; no se convierten silenciosamente en un JPEG con fondo negro. Los formatos del mostrador que requieren no retocar la foto mantienen esta mejora desactivada.
- El movimiento del control no acumula filtros: cada vista previa se calcula desde la misma base del panel. Una edición aplicada puede deshacerse en mostrador; el móvil conserva el original incluso después de recargar.
- El procesamiento admite cancelación. La escritura final es atómica: sus controles de cancelación se desactivan brevemente al guardar.
- La mejora funciona sin internet después de preparar la app; no envía fotos a servicios externos ni utiliza generación de rostros o texto.
- Se registran solo eventos permitidos y cantidades técnicas; no se registra el contenido, nombre o identificación del cliente.

## Evidencia reproducible

- scripts/mobile-workflow-regression.cjs: gesto real con actualización de interfaz, captura y recepción móvil.
- scripts/cloud-recovery-regression.cjs: página faltante, reintento, falta de espacio y fallo parcial de subida. Respuestas de Firebase simuladas, imágenes sintéticas.
- scripts/image-enhance-regression.cjs: ruido medido, copia intacta, transparencia, cancelación, deshacer, resolución y perfiles sin retoque; Chromium/WebKit y geometría móvil/PC.
- scripts/mobile-local-regression.cjs: arranque del acabado sin conexión, OCR, PDF a tamaño real, vista previa y borradores en ambos motores.
- scripts/windows-publish-regression.ps1: dieciséis escenarios con Node y Windows PowerShell reales, servicios externos simulados.
- npm run verify: conjunto completo antes de publicar. El resultado efectivo, commit, huella, sitios y respaldos se registran en el acta final; este documento no anticipa aprobación.

## Límites

No se puede recuperar con certeza detalle que la cámara no registró. El desenfoque fuerte, roturas y zonas faltantes de fotos pueden necesitar restauración manual. El acabado no cambia el contenido ni certifica la validez oficial de una foto.

Las pruebas de navegador no sustituyen cámara física de iPhone, AirPrint, calibración de la impresora ni recepción de Paperless. Su error eng/spa requiere reparar la instalación que procesa los PDF. No se han cambiado DNS, facturación ni reglas del backend como parte de esta entrega.
