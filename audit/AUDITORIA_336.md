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

Prueba nueva identity-preparation-regression en Chromium y WebKit: recepción mediante selector real y confirmación, solo frente listo para entrega, reverso pendiente bloqueado, conservación al cambiar caras, cuatro páginas ID-1 para dos juegos separados, cancelación del recorte y regreso de entrega estable, ausencia de desbordamiento a 320/390/768/1024/1440 px y separación del servicio Documentos. Se conserva la prueba de impresión dúplex; su acceso está ahora en el acordeón de impresora.

La regresión específica aprobó doce comprobaciones en Chromium y WebKit, incluida la visibilidad de la hoja con sellos y los pasos sin impresión implícita. Compilación, metadatos coordinados y CSP aprobados. La suite completa, CI y publicación están pendientes de finalizar; este documento no acredita un despliegue.

El primer CI detectó un desfase al pedir el reverso: el estado del trabajo ya exigía dos caras mientras el botón PDF conservaba por un instante su disponibilidad anterior. Se detuvo el publicador y se sincronizan ahora las acciones de entrega al terminar cada actualización del panel, manteniendo la aserción inmediata de la prueba.

## Revisión adicional de flujos

- Se elimina el doble manejo de los pasos de navegación cuando está activo el propietario actual del mostrador. «Preparar» vuelve a sus opciones; «Entregar» muestra destinos y no abre automáticamente la impresión.
- Se corrige la regla de la interfaz móvil anterior que ocultaba el panel de preparación al activar el paso de la hoja. Las opciones de identificación permanecen accesibles durante la revisión.
- La navegación a captura termina su desplazamiento inmediatamente. La prueba local detectó una pulsación rápida interferida por el desplazamiento animado pendiente; se conserva la misma prueba y pasó junto con 1.256 distribuciones fotográficas y la comprobación de círculos sin deformación.
- Al aplicar firmas o sellos, la vista de identificación abre la hoja completa para mostrar el resultado impreso, además de las capturas originales ampliadas. Se mantiene el recorte y el original por separado.
- Se retiran 18 PNG/JSON generados de auditorías anteriores (1.969.410 bytes). No son fixtures ni recursos publicados; los cinco scripts originales se conservan y escriben en `.audit/`, fuera de Git. Los documentos de auditoría y el historial del repositorio permanecen disponibles.

## Mejoras siguientes, sin anunciarlas como implementadas

| Prioridad | Mejora | Beneficio |
| --- | --- | --- |
| Alta | Una única revisión que reúna encuadre, hoja y destino | Menos saltos entre diálogos, conservando la confirmación de tamaño físico. |
| Alta | Selector de destino más breve en la entrega PDF | Mostrar Descargar, Imprimir y Compartir; agrupar NAS/QR/WhatsApp según la acción elegida. |
| Alta | Comprobante de archivo NAS con tarea y estado final | Distinguir claramente envío aceptado, procesamiento y archivo recuperable. |
| Media | Edición del margen sobre la hoja, con guías en mm | Comprender el resultado sin interpretar campos numéricos. |
| Media | Unificar encabezado y acabado en una sola edición | Evitar controles equivalentes en posiciones distintas. |
| Media | Reanudar exactamente la posición después de cada diálogo | Mantener el contexto al revisar varias páginas o clientes. |
| Media | Accesos de teclado para capturar, repetir y entregar | Acelerar el trabajo de escritorio con foco y avisos claros. |
| Media | Recetas de negocio visibles por servicio | Ofrecer solo presets pertinentes, sin guardar imágenes ni datos personales. |
| Física | Calibración HP e iPhone con pruebas reales | Completar la evidencia que las pruebas automatizadas no pueden sustituir. |

## Límites

Se conservan las validaciones físicas pendientes de HP (regla de 50 mm), dúplex e iPhone real. No se incorporan documentos personales ni credenciales a Git o a los artefactos CI. Paperless continúa siendo opcional y su conexión depende del origen autorizado y de la sesión del navegador.
