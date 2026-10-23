# RealScan 3.6.1 — guías de corte, ajuste proporcional y diagnóstico

## Problemas identificados en el código

- La vista previa dibujaba únicamente un borde en un contenedor recortado; la imagen podía cubrirlo y no existían marcas exteriores de esquina. La exportación de imagen dibujaba la elipse antes de la foto, que podía ocultarla.
- Los tres destinos usaban medidas y estilos distintos para las guías.
- Las exportaciones estiraban cualquier imagen procesada al rectángulo de destino, incluso si un archivo restaurado tenía otra proporción. El procesamiento normal ya utilizaba escala uniforme.
- «Ajuste completo» conservaba desplazamiento y zoom anteriores y podía seguir recortando contenido.
- La elección estética de columnas podía producir más filas que las admitidas. El desplazamiento vertical mínimo adicional también podía invadir el margen inferior.
- La explicación del interruptor de guías prometía hoja limpia aunque regla y rótulos fueran independientes.
- Los cuatro botones móviles de avanzar y volver declaraban `data-target-step`, mientras su controlador leía `data-mob-nav-step`. Se reprodujo el fallo con una pulsación real: «Continuar a Cargar Fotos» permanecía en el paso 1.

## Correcciones

- Geometría compartida en milímetros para contorno punteado y marcas exteriores: esquinas para rectángulos y polos para óvalos.
- Guías SVG encima de la imagen en pantalla, sin recortar las marcas exteriores; PDF e imagen dibujan las mismas guías después de la foto. El interruptor elimina ambos tipos de guía.
- Colocación proporcional centrada de imágenes procesadas en las hojas y PDF individual; ajuste completo restablece zoom y desplazamientos. El relleno sigue siendo un recorte uniforme, sin estiramiento.
- Distribución de copias limitada por filas reales, centrada dentro del área reservada.
- Revisión previa informa guías y acabado; explicación del interruptor corregida.
- Navegación móvil con el atributo correcto en los cuatro botones; validación de pasos 1–3 e indicación accesible del paso actual. Prueba de ida y vuelta con botones reales a 360, 390 y 768 px.
- Diagnóstico esquema 2: medidas, hojas, cantidad, ajustes por cara, conectividad y eventos de guías, ajuste y exportación. Excluye imágenes, texto libre y datos de clientes. Conserva el límite de 200 eventos/14 días y los controles de descarga y borrado; nuevo botón Compartir, con descarga si el navegador no admite compartir archivos.
- Prompt de mantenimiento revisado en `audit/PROMPT_AUTOMEJORA_REALSCAN.md`.

## Verificación

`scripts/photo-layout-regression.cjs` contrasta píxeles de salidas con guías activas e inactivas, rectangulares y ovaladas, renderiza los PDF, mide una figura circular para detectar deformación y recorre combinaciones de formato fotográfico, copias, papel y regla. Verifica también el contexto del diagnóstico y el rechazo de datos no permitidos. Capturas y resultados locales: `.audit/photo-layout/`.

La verificación general incluye autenticación, navegación, recuperación, captura asistida, OCR, dúplex, transferencia local, entrega por QR y actualización sin conexión. Los resultados de publicación y respaldos quedan en el manifiesto del commit correspondiente dentro de `backups/`.

Resultado local del 15 de octubre de 2026: `npm run verify` completo aprobado con `REALSCAN_TEST_RELAY=1`. Se comprobaron 1.248 distribuciones fotográficas válidas; las figuras circulares de los PDF conservaron una relación ancho/alto de 1, y las variaciones de rasterización permanecieron por debajo del 1 %. Los cuatro botones móviles completaron la ida y vuelta a 360, 390 y 768 px. La prueba de diagnóstico comprobó descarga como alternativa a compartir, borrado sin eliminar la imagen actual y exclusión de cargas privadas. Las descargas reales por QR de JPG, PNG y PDF y la revocación de entregas finalizaron correctamente. Sin errores JavaScript no controlados en las pruebas.

## Límites

Las comprobaciones geométricas y de archivos no sustituyen una impresión física al 100 % y la medición con regla. Las guías sólo se agregan a hojas de impresión; la foto digital individual se entrega limpia. Ajuste completo puede dejar blanco para conservar toda la imagen; relleno recorta para cubrir el marco. No se garantiza la aceptación en trámites oficiales ni ausencia futura de cualquier fallo.
