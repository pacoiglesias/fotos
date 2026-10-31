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

La regresión específica aprobó diez comprobaciones en Chromium y WebKit. Compilación, metadatos coordinados y CSP aprobados. La suite completa, CI y publicación están pendientes de finalizar; este documento no acredita un despliegue.

## Límites

Se conservan las validaciones físicas pendientes de HP (regla de 50 mm), dúplex e iPhone real. No se incorporan documentos personales ni credenciales a Git o a los artefactos CI. Paperless continúa siendo opcional y su conexión depende del origen autorizado y de la sesión del navegador.
