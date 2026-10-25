# RealScan: tres etapas de usabilidad

## Etapa 1 — 3.21.0
Panel por servicio, tamaños ilustrados, cantidades rápidas, juegos separados de fotos por juego y resumen permanente. Ajustes avanzados recogidos. Documentos con salida en color o gris, juegos para impresión y guía de doble cara manual. El PDF digital mantiene una copia del documento.

Las medidas permanecen en el motor compartido. Los juegos de fotos/identificaciones se reflejan en vista previa, PDF e impresión. Límite de diez juegos. No se cambia el papel ni la medida solicitada automáticamente.

Validación: build y regresión service-flow (formatos, cantidades, hojas reales, opciones de documentos, bloqueo y tamaños de pantalla).

Las etapas siguientes añaden edición y recuperación, y después asistencia y rendimiento.

## Etapa 2 — 3.22.0
Edición de foto/identificación seleccionada con deshacer, rehacer y reemplazar; repetición del servicio con confirmación de limpieza. Documentos con historial de ocho acciones y hasta 24 MB adicionales de imágenes históricas, selección por miniatura y teclado, reordenación arrastrando o por botones, reemplazo de imagen y edición tocando la página de salida. El historial se limpia al terminar el servicio. Se conservan los originales y la recuperación local existente.

## Etapa 3 — 3.23.0
Avisos con solución explícita cuando no caben las fotos y al detectar resolución baja. Revisión solicitada por el operador de páginas posiblemente vacías, duplicados exactos y nitidez; nunca se elimina contenido automáticamente. Orientación/encuadre se revisan visualmente, sin inferir el sentido del texto. Preparación anticipada y caché de hojas de impresión; caché del PDF de documento invalidada por cambios. OCR y herramientas pesadas mantienen carga diferida. Navegación guiada y recorrido comparten eventos de actualización en lugar de dos temporizadores. Al cerrar el diálogo de impresión se pide comprobar el papel, sin dar por realizada la impresión.

Doble cara de documentos: PDFs separados de impares y pares, con reverso vacío al final de cada juego impar. No se configura automáticamente la impresora. Se conserva una copia del documento en la entrega digital. Vista previa en gris cuando se solicita ese acabado.

Validación: regresiones de flujo, impresión, composición, documentos y suite de GitHub Actions. Los controles de impresión física requieren la impresora real. La conexión al entorno Windows se perdió durante el cierre; GitHub conserva las tres etapas, y las correcciones finales se comprueban en CI. El despliegue exige checkout limpio de release/3.23.0 y verificación de ambos sitios.

## Cierre de auditoría

- Etapa 1 respaldada: `14d4089bf163ef93a0a3ff8d2ee0012404c07ad3` (3.21).
- Etapa 2 respaldada: `42d78661db4d8d74ab9da0a84b6380cdc88ddbf8` (3.22).
- Dos verificaciones completas aprobadas de la 3.23: [40158532206](https://github.com/pacoiglesias/fotos/actions/runs/40158532206) y [40158717757](https://github.com/pacoiglesias/fotos/actions/runs/40158717757). Incluyen Windows, Chromium, WebKit, documentos, captura, recuperación, composición y regresiones anteriores.
- La composición se comprobó en 1,256 combinaciones; la salida del navegador se verificó en A4, Carta, Oficio México, Legal USA, 10 × 15 cm y 4 × 6 pulgadas. Esta comprobación del papel no certifica requisitos de fotos oficiales.
- La regresión nueva comprueba cantidades que no caben sin reducir el pedido, juegos reales, giro/deshacer/rehacer, orden y reemplazo de páginas, análisis sin borrado, caché invalidada al editar, cinco páginas en dos juegos de doble cara con reversos vacíos y PDFs de impares/pares, y el cierre del diálogo sin afirmar que se imprimió.
- Se revisaron capturas a 320, 390, 768 y 1440 px, documentos y modo oscuro. La suite guarda `results.json` y capturas en el artefacto `realscan-build-and-audit`.
- Tras revisar las capturas se colocaron los ajustes de documentos antes de las páginas, se reunió papel/color/impresión, se corrigió el paso activo del móvil y se redujeron elementos repetidos de la revisión fotográfica en móvil. La geometría de impresión se conserva en milímetros.
- La versión final y sus correcciones se comprueban por commit en [GitHub Actions](https://github.com/pacoiglesias/fotos/actions). El publicador descarga un checkout limpio de `release/3.23.0`, comprueba su commit y versión, genera el build y exige `check-release` antes de publicar. El build local de trabajo sirve para revisión y no sustituye esa comprobación de procedencia.

### Estado de publicación comprobado
El intento con `desplegar.ps1` se detuvo en el paso 1 de 5: Firebase indicó que las credenciales ya no son válidas y solicitó renovar la sesión. Ese intento no llegó a actualizar ninguno de los dos sitios. Registro local: `.audit/publicacion-323-20261024-213716-5c489279.log`. La sesión de ejecución también presentó un fallo de resolución DNS al intentar descargar GitHub.

Para renovar acceso y completar la publicación desde Windows: `autenticar_y_desplegar.bat`. Si el acceso ya está renovado: `subir_a_firebase.bat`. Solo se considera completada al verificar el mismo commit y build en los cuatro dominios de ambos sitios. Las credenciales no forman parte del repositorio ni del informe.

### Comprobación pendiente en el establecimiento
Imprimir una prueba con la impresora y papel reales, medir la regla de 5 cm y comprobar el giro y orden de la bandeja antes de usar doble cara manual con un cliente. El navegador no confirma la salida física del papel.
