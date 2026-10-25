# RealScan 3.26 - cambios de interfaz y orientación de papel

## Entrega

La versión reúne los motores existentes de captura, trabajos, OCR, PDF e impresión con una presentación más clara. Los cambios de pantalla no modifican el tamaño de la hoja impresa.

| Necesidad | Implementación |
| --- | --- |
| Elegir el servicio con claridad | Tarjetas de identificación, fotografía y documentos con ilustración, texto legible y estados existentes. |
| Configurar un pedido sin recorrer menús | Se conservan formato, cantidad, juegos y revisión en el panel; nuevos botones para A4, Carta y 10 × 15 enlazados al control real. |
| Preferencias habituales | Se conservan los formatos guardados y la recuperación del borrador; sin almacenar imágenes dentro de las preferencias. |
| Encabezados prácticos | Tres bases con miniatura: sin encabezado, copia para archivo y copia para trámite; texto personalizable y ejemplo de la salida real. |
| Capturar y revisar | Se conservan captura guiada, ajuste de esquinas, repetición de una cara y revisión de páginas. Las advertencias de imagen no sustituyen la revisión humana. |
| PDF y OCR | Se conserva revisión por página, preflight y OCR local. Esta entrega no cambia el reconocimiento ni promete resultados perfectos. |
| Retomar y limpiar | Se conservan borradores, cola, nuevo servicio con confirmación y cancelación de operaciones disponibles. |
| Doble cara manual | Prueba A/B con borde naranja, selección explícita de cara y borde de entrada, lectura libro/calendario, perfiles por impresora/bandeja/papel y dibujo recuperado. |
| Evitar usar una colocación equivocada | Cambiar cara, borde o giro invalida la confirmación; un perfil sin datos estructurados o de otro papel exige repetir la prueba. |
| Evitar reversos de otro trabajo | La descarga del reverso de una identificación requiere frente preparado, confirmación de recolocación y la misma revisión e imágenes. |
| Documentos de varias páginas | Se conserva impares/pares y la confirmación de primera pasada; ahora se incluye el dibujo guardado o una indicación explícita de hacer la prueba. |
| Usar desde iPhone | Tarjetas más grandes, contraste y controles táctiles; se mantienen borrador local y acciones inferiores dentro del área segura. |

## Validación

`modern-regression.cjs` comprueba papel real, encabezado real, migración de perfiles, restauración, prueba PDF, cambio de papel, cambios entre pasadas y tamaños de pantalla. Se integra en la suite completa y conserva evidencia visual en `.audit/modern-326` en el trabajo de CI.

Las pruebas automatizadas no verifican una impresora física. La cara y el borde correctos solo se guardan después de la confirmación del usuario en la prueba de una hoja. La descarga de un PDF nunca se interpreta como impresión completada.
