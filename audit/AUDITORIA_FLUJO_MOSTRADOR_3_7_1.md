# Auditoría de atención de mostrador — RealScan 3.7.1

Fecha: 16 de octubre de 2026. Código revisado: `a9a60a707de7bcf703c2d7be4431526369d2d12f`. Compilación: `realscan-9b3849a819b9ba9b`.

## Dictamen

La publicación y los respaldos de la entrega anterior quedaron verificados. La atención cotidiana todavía tiene fricciones y dos fallos de navegación/asignación reproducibles. Aprobar las pruebas de una entrega no certifica todos los recorridos posibles de varios clientes consecutivos. Conviene corregir primero los hallazgos operativos y después simplificar el recorrido alrededor del servicio solicitado.

Alcance de esta intervención: lectura del código y auditoría con navegador y archivos sintéticos sobre la compilación local idéntica a la publicada. No se han aplicado estas propuestas al programa ni publicado cambios como parte de esta auditoría. No se utilizaron fotos, documentos ni sesiones reales de clientes.

Evidencia: `.audit/counter-workflow/results.json`, con cinco escenarios reproducidos, sin errores JavaScript no controlados. Guion local: `.audit/counter-workflow-audit.cjs`. Capturas en la misma carpeta de evidencias. Los métodos de revocación se observaron mediante sustituciones temporales en un navegador aislado; no se creó ni revocó una entrega de un cliente.

## Hallazgos reproducidos

| Prioridad | Caso y resultado observado | Consecuencia diaria | Corrección propuesta |
| --- | --- | --- | --- |
| Alta | Seleccionar dos caras separadas, pasar a Fotos y regresar a Identificaciones mediante la pestaña deja `printMode=both_separate`, dos caras requeridas y el panel del reverso oculto. | La guía pide una cara cuya zona de carga no se puede usar. | Derivar la visibilidad de las caras del diseño activo; revisar todas las transiciones, no sólo la selección inicial. |
| Alta | La bandeja QR ofrece Foto A, Foto B, Página 3 y Página 4 en modo Fotos. Asignar Página 3 procesa la imagen y anuncia éxito; la planilla sigue utilizando sólo Frente y el panel de Página 3 permanece oculto. | El operador puede creer que incluyó una foto que no aparece en la salida. | Ofrecer únicamente destinos válidos; habilitar expresamente la segunda persona cuando se necesite y confirmar sustituciones. Comprobar también el destino en la API de asignación. |
| Alta | «Nuevo trabajo» llama a revocar la recepción, revocar la entrega y vaciar la bandeja. | El cliente puede perder su enlace cuando el operador ya comienza a atender al siguiente. | Cierre de entrega explícito y aviso de entrega pendiente. Si se permite conservarla hasta caducidad, separar su ciclo de vida del trabajo y conservar controles de revocación y privacidad. |
| Media | Un PNG sintético de 4000 × 2000 se envió desde la galería como JPG de 3000 × 1500 sin abrir la revisión. | El archivo recibido no es el original del dispositivo; se cambia formato, resolución y compresión. «Descargar original» recupera el archivo transferido, no los bytes previos a esa conversión. | Diferenciar «Conservar archivo» y «Optimizar para enviar», mostrar dimensiones/peso antes y después y distinguir archivo recibido de copia editada. Tratar límites y privacidad explícitamente. |
| Media | Tras preparar fotos con papel 10 × 15, ocho copias y guías/rótulos desactivados, «Nuevo trabajo» conservó esos cuatro valores. | Otro servicio puede heredar cantidades o acabado del cliente anterior. | Distinguir configuración del puesto de opciones de cada servicio. Elegir «Repetir configuración» o «Nuevo servicio» y mostrar un resumen antes de gastar papel. |

Referencias: `js/app.js:974` y `:1005`; `js/receive-workflow.js:46`; `js/qr-sync.js:57`; `js/storage.js:51` y `:1338`; `js/phone-upload.js:57`, `:81`, `:92` y `:104`.

## Limitaciones y fricciones adicionales observadas en el código

- El inicio pregunta principalmente qué imprimir. «Sólo escanear y entregar PDF» necesita un recorrido propio que evite configurar una planilla y sus guías innecesariamente.
- Tipo de trabajo, categorías y formatos se seleccionan en varios lugares. El acceso «Multipágina / Visas» configura un pasaporte abierto con dos caras separadas; no representa por sí mismo un escaneo general de varias hojas.
- La composición de documentos utiliza hasta cuatro ranuras. Poder abrir un PDF de hasta 40 páginas no significa poder organizar sus 40 páginas en un mismo trabajo. Para documentos largos se necesita una lista ordenada de páginas, con añadir, quitar, girar, sustituir y reordenar.
- La cámara nativa y el botón de captura asistida son caminos diferentes en el teléfono. El archivo elegido por `cameraInput` o `fileInput` puede enviarse sin pasar por el editor de revisión. La asistencia actual incluye análisis de luz, nitidez estimada y estabilidad, revisión y reintento de enfoque; no hace falta reconstruir esas funciones, sino ordenar el acceso y la confirmación.
- La entrega individual ofrece Frente y Reverso; la selección no expresa el servicio ni cada página de un documento largo. Los estados de recepción, asignación, revisión y entrega deberían verse en un mismo resumen.
- La integración actual de escáner físico consiste en importar, arrastrar o pegar lo producido por su software. No se encontró un puente TWAIN/WIA implementado. Conviene guiar esa importación y no presentar una ayuda como si fuese un control del escáner.
- Además del reinicio, crear otra entrega reemplaza la anterior: `src/firebase-transfer.js:150` revoca la sesión del mismo tipo y utiliza un contenedor por propietario y tipo. Mantener entregas de varios clientes requiere revisar el modelo y sus reglas; no basta con cambiar el texto de un botón.
- «Nuevo trabajo» limpia las imágenes y restablece escala al 100 %, mezcla de personas y duplicación; el hallazgo no implica que conserve fotos de otro cliente ni que mantenga la escala modificada.

## Recorrido propuesto

1. **Servicio solicitado:** copiar una identificación; escanear a PDF; preparar fotografías para un formato; imprimir un archivo recibido. Indicar impresión, archivo digital o ambos.
2. **Cómo llega el material:** documento físico con cámara/escáner; archivo en este equipo; envío del cliente por QR. Elegir el material antes de pedir todos los detalles del papel.
3. **Captura y revisión:** una lista visible de fotos/páginas; destino válido, orden, giro y recorte. Conservar la proporción. En identificación, guiar Frente → girar documento → Reverso; en fotos, evitar aplicarles perspectiva de documento.
4. **Preparación de salida:** mostrar únicamente tamaño, copias y papel cuando se imprime; formato, dimensiones y peso cuando se entrega digitalmente. Mantener el resto en «Más opciones».
5. **Entregar y finalizar:** comprobar contenido, generar la entrega, mostrar caducidad y permitir al cliente confirmar que el archivo abre. «Finalizar y siguiente cliente» debe distinguir limpieza del material entrante y cierre de la entrega saliente.

Menú principal sugerido: **Nuevo servicio · Recibir/Capturar · Revisar · Entregar · Más**. En «Más»: historial, favoritos, configuración, diagnóstico, OCR y ayudas. Los accesos de cámara y QR deben conservar nombres visibles en móvil, no depender únicamente de iconos.

No se propone agregar cobros, CRM, cuentas de clientes ni módulos comerciales ajenos a la operación solicitada.

## Captura que conviene unificar

Un botón principal según el material: «Escanear documento» o «Tomar fotografía». Mantener «Usar cámara del teléfono» como alternativa clara cuando la cámara web asistida no permita un enfoque adecuado. Ambas rutas deben volver al mismo paso de revisar y confirmar; la galería puede ofrecer revisión rápida y conservación del archivo, sin transformar silenciosamente todas las imágenes.

La elección de cámara nativa mediante `capture` depende del navegador/dispositivo, según [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture). El estándar [MediaStream Image Capture de W3C](https://www.w3.org/TR/image-capture/) define capacidades y controles de cámara, incluidos modos de enfoque; su disponibilidad real debe comprobarse en el equipo. Esta revisión no demuestra equivalencia con Genius Scan ni certifica el enfoque de un teléfono físico.

## Orden de implementación y aceptación

**Primero, fiabilidad operativa:** corregir reverso oculto y destinos inválidos; advertir y gestionar entregas pendientes; definir conservación/optimización del archivo. Repetir los cinco escenarios reproducidos y las regresiones de QR, geometría y cancelación.

**Después, flujo y menús:** introducir servicio y origen, revisión común y opciones contextuales. Mantener los motores de composición, captura y exportación ya probados. Evitar añadir otra capa de navegación paralela a las existentes.

**A continuación, documentos y cierre:** lista de páginas y bandeja de material por trabajo, entrega con estados claros y siguiente cliente. Revisar límites, memoria, almacenamiento y seguridad antes de ampliar sesiones o número de páginas.

Validación práctica propuesta en teléfono e impresora reales: una INE frente/reverso; fotografía enviada por galería; foto nueva tomada en el local; documento de seis páginas a PDF; dos clientes seguidos mientras el primero aún descarga; reintento con internet interrumpido. Medir clics, correcciones manuales y fallos por recorrido. Verificar tamaño impreso con una regla y que el cliente pueda abrir el archivo entregado.

Resultado esperado: cada archivo recibido tiene un destino visible y válido, ningún ajuste de un cliente se hereda sin que el operador lo vea, y comenzar el siguiente trabajo no interrumpe una entrega de forma inesperada.
