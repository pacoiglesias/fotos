# Auditoría 3.36.0 — preparación de identificación

Base: main 3.35.1, dda394d1cf195b42c1d183fca29962145070f3f0. Versión anterior publicada y verificada en ambos Firebase y dominio propio.

## Problemas revisados y correcciones

- El acordeón de color/dúplex de documentos aparecía con identificaciones aunque sus controles internos estuvieran ocultos. Se sincroniza la visibilidad del envoltorio con su contenido; no se confunde distribución de caras con doble cara física.
- Había dos bandejas y dos mecanismos visibles de selección de papel. Para identificación queda la bandeja de captura por cara y el selector principal de papel. Los accesos de papel del servicio fotográfico se conservan.
- La preparación quedaba después de la hoja en pantallas pequeñas. Se muestra primero para que las decisiones precedan al resultado. En escritorio, controles a la izquierda y resultado a la derecha.
- Las tarjetas vacías remitían al editor avanzado. Ahora Cámara y Archivo actúan directamente sobre cada cara. Una imagen confirmada ofrece ampliación, repetición, cambio de archivo y recorte reversible.
- Las tres distribuciones utilizan rótulos breves y diagramas; Solo frente se presenta primero. Papel y juegos comparten fila. No se cambia automáticamente una captura ni la medida nominal.
- Se retiran los botones duplicados de la vista ampliada; imprimir conserva la acción principal del pie y el PDF su destino de entrega. El pie móvil conserva resumen, comprobante y acción principal con menos altura; el aviso detallado de impresora sigue en el semáforo y la revisión.
- Un único propietario de distribución, workspace-polish, coloca los nodos originales una vez; no se clonan controles ni manejadores. Los cambios de servicio mantienen el mismo motor y sus guardas.

## Verificación

El usuario pidió perfeccionar la revisión y cerrar la auditoría antes de hacer la publicación. Se detuvo el publicador antes de Firebase. Se realizan compilaciones locales para las pruebas de navegador; producción continúa en 3.35.1 y no se anuncia 3.36.0 desplegada.

Prueba nueva identity-preparation-regression en Chromium y WebKit: recepción mediante selector real y confirmación, solo frente listo para entrega, reverso pendiente bloqueado, conservación al cambiar caras, cuatro páginas ID-1 para dos juegos separados, cancelación del recorte y regreso de entrega estable, ausencia de desbordamiento a 320/390/768/1024/1440 px y separación del servicio Documentos. Se conserva la prueba de impresión dúplex; su acceso está ahora en el acordeón de impresora.

La regresión de identificación aprobó doce comprobaciones en Chromium y WebKit, incluida la visibilidad de la hoja con sellos y los pasos sin impresión implícita. La revisión de impresión añade doce comprobaciones de vista, escala, formato y cantidades; páginas en blanco añade ocho comprobaciones. Compilación local, metadatos coordinados y CSP aprobados. El resultado de la suite completa y CI se registra por commit en el PR #15 y sus evidencias; este documento no acredita un despliegue.

El primer CI detectó un desfase al pedir el reverso: el estado del trabajo ya exigía dos caras mientras el botón PDF conservaba por un instante su disponibilidad anterior. Se detuvo el publicador y se sincronizan ahora las acciones de entrega al terminar cada actualización del panel, manteniendo la aserción inmediata de la prueba.

## Revisión adicional de flujos

- Revisión de impresión con panel de ajustes y vista previa en columnas; vista previa primero en móvil, resumen de medida/papel y detalles secundarios plegados. Las acciones de cliente y compartir están agrupadas.
- Nuevos accesos de acabado, posición, escala del contenido y cantidad por juego o persona. La ampliación no altera la copia preparada; el mensaje distingue escala del contenido y el 100 % de la impresora.
- Se conserva el foco al regenerar controles y se retiran avisos de una revisión anterior. La revisión de calidad/coincidencia ignora las caras excluidas de la salida.
- Tras generar el PDF, el margen numérico sigue bloqueado cuando el ajuste es automático. Los presets también quedan bloqueados durante preparación para evitar repetición de acciones.
- Los estilos de la revisión se separan en `css/review-workspace.css`. Se corrige una regla antigua con mayor prioridad que impedía encajar la hoja completa en su marco, sin cambiar el archivo físico.
- La detección de páginas en blanco ofrece miniaturas limitadas a 360 × 480 px y carga el original solo al ampliarlo. No selecciona páginas automáticamente; preserva los originales y elimina el lote en una única operación reversible. Excluye páginas con anotaciones añadidas y no analiza las páginas de relleno generadas para dúplex. Se cancela al cambiar de trabajo o sesión.
- La navegación consulta el tipo de trabajo actual, evitando depender de una clase visual que podía actualizarse después. Si ya está el frente, «Preparar» enfoca la captura del reverso; sin capturas vuelve a las opciones.

- Se elimina el doble manejo de los pasos de navegación cuando está activo el propietario actual del mostrador. «Preparar» vuelve a sus opciones; «Entregar» muestra destinos y no abre automáticamente la impresión.
- Se corrige la regla de la interfaz móvil anterior que ocultaba el panel de preparación al activar el paso de la hoja. Las opciones de identificación permanecen accesibles durante la revisión.
- La navegación a captura termina su desplazamiento inmediatamente. La prueba local detectó una pulsación rápida interferida por el desplazamiento animado pendiente; se conserva la misma prueba y pasó junto con 1.256 distribuciones fotográficas y la comprobación de círculos sin deformación.
- Al aplicar firmas o sellos, la vista de identificación abre la hoja completa para mostrar el resultado impreso, además de las capturas originales ampliadas. Se mantiene el recorte y el original por separado.
- Se retiran 18 PNG/JSON generados de auditorías anteriores (1.969.410 bytes). No son fixtures ni recursos publicados; los cinco scripts originales se conservan y escriben en `.audit/`, fuera de Git. Los documentos de auditoría y el historial del repositorio permanecen disponibles.

## Mejoras siguientes, sin anunciarlas como implementadas

Las catorce propuestas, con prioridad y beneficio práctico, se centralizan en [PLAN_MEJORAS.md](../PLAN_MEJORAS.md). La recomendación es empezar por recepción compacta, avisos con solución y retorno al punto de trabajo. Estas propuestas son una fase posterior a las correcciones ya preparadas.

## Límites

Se conservan las validaciones físicas pendientes de HP (regla de 50 mm), dúplex e iPhone real. No se incorporan documentos personales ni credenciales a Git o a los artefactos CI. Paperless continúa siendo opcional y su conexión depende del origen autorizado y de la sesión del navegador.
