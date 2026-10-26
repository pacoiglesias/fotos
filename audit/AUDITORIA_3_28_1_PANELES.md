# RealScan 3.28.1 — orden de paneles y acabado

Base: 73fa80ba3e7016b1a599397fb0613a5bf4dc662b (3.28.0).

## Revisión de la interfaz

La medición inicial en escritorio de 1440 × 1050 mostró una recepción de 522 px y una preparación de 1413 px. El checklist completo seguía dentro del panel de resultado, junto a otros controles, y la columna tenía desplazamiento propio. Los formatos frecuentes y varias acciones aparecían en bloques separados antes del trabajo.

## Cambios

- Recepción: cámara, archivo y celular visibles; captura sin elegir servicio como acción secundaria. Cliente y nota permanecen accesibles. Historial, herramientas y ambos grupos de formatos se reúnen en un desplegable. La recepción medida queda en aproximadamente 323 px.
- Tipo de trabajo: tarjeta propia con identificaciones, fotografías y documentos. Su elección y los controles originales conservan los mismos eventos.
- Preparación: salida, capturas, tamaño, cantidad y papel permanecen juntos. Las capturas vacías se compactan; las imágenes recibidas mantienen su proporción y se pueden ampliar.
- Acabado: deja el área de resultado y pasa a la preparación. Hoja limpia y guías quedan a un clic; el checklist se pliega en «Personalizar acabado» con un resumen de título, rótulos, regla y marcas activos.
- Posición/encabezado y firmas/sellos quedan como opciones desplegables. No se duplican controles ni identificadores.
- Resultado: tarjeta independiente, sin el checklist largo ni desplazamiento interno de toda la columna. El zoom del propio lienzo sigue disponible. Antes de cargar imágenes se muestra el estado vacío sin una segunda hoja ficticia debajo.
- Los despliegues solo cambian la presentación: abrir o cerrar un grupo no modifica las imágenes ni las opciones impresas. Los desplegables nativos conservan manejo por teclado.

## Corrección relacionada

«Hoja limpia» antes conservaba un título personalizado. Ahora lo borra y oculta los encabezados junto con regla, rótulos y marcas. El preset estándar restaura los encabezados. Escribir un título nuevo vuelve a habilitar su impresión. Las imágenes, firmas y sellos se conservan; el panel lo explica expresamente.

## Verificación

`workspace-polish-regression` comprueba los controles de acabado, hoja limpia con un título previo, título posterior, cierre del desplegable, tamaños de pantalla y preservación del resultado en Chromium y WebKit. Se actualizan los recorridos de formatos frecuentes, encabezados y anotaciones para abrir sus menús mediante la interfaz.

Se ejecutan además las pruebas de flujo, mostrador, recorte, impresión y 1256 combinaciones de fotografías y papel. La aprobación efectiva del conjunto completo, el commit publicado y las huellas del respaldo se registrarán con las evidencias de cierre; este documento no anticipa un resultado de publicación.
