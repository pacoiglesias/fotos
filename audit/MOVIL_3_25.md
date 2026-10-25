# RealScan 3.25.0 — escaneo móvil y envío al mostrador

Cambios del 25 de octubre de 2026 sobre la versión 3.24.0.

- Tarjetas de identificación, documento y fotografía que cambian el formato real del PDF.
- Selector de servicio plegable después de la primera captura y espacios de frente/reverso con acceso a la imagen confirmada.
- Barra inferior con la acción siguiente: abrir cámara, capturar reverso, guardar PDF o añadir otra captura. El reverso sigue siendo opcional cuando se quiere conservar solo el frente.
- Capturas grandes; revisar, ajustar y repetir a la vista. Restaurar, ordenar y quitar permanecen en Más acciones.
- Nombre del PDF e idioma OCR conservados en el borrador. Los nombres se normalizan para la descarga, sin emplearlos como rutas.
- Compartir PDF mediante el menú del teléfono cuando el navegador lo admite. Cancelar conserva el trabajo; si compartir no se admite o falla, se descarga el PDF.
- En calidad local se conservan los PNG/JPEG normalizados en el PDF, evitando una recompresión JPEG adicional. La capa OCR sigue siendo invisible y usa el motor local existente.
- Repetir una captura con la cámara nativa sustituye su destino original; una selección tardía de una operación anterior no se aplica a otro servicio.
- El envío por QR muestra imágenes mayores, recorrido Captura/Revisa/Envía y acción de envío fija. La confirmación del mostrador sigue siendo responsabilidad del protocolo existente.
- Modo oscuro del escáner local, zonas seguras del teléfono y controles principales de al menos 44 px.

## Verificación

`npm run verify` ejecuta las pruebas anteriores y dos nuevos recorridos de interfaz, en Chromium y WebKit. Incluyen servicios, frente/reverso, sustitución con cámara nativa simulada, PDF real con nombre, compartir/cancelar/descargar, persistencia del idioma y nombre, y geometría en teléfono pequeño, horizontal y tableta. La hoja nativa de compartir se simula: se verifica el archivo entregado a la API, no las aplicaciones de terceros.

Evidencias: `.audit/mobile-experience-chromium/` y `.audit/mobile-experience-webkit/`, incluidas en el artefacto de GitHub Actions. Las pruebas existentes de OCR real sin conexión y medidas físicas del PDF siguen siendo obligatorias.

No se ha medido calidad o velocidad contra Genius Scan ni se ha verificado este cambio en un iPhone o Android físico. Una prueba de navegador con su tamaño de pantalla no sustituye esa validación.

## Comparación con Genius Scan

Fuentes oficiales consultadas el 25 de octubre de 2026:

- https://thegrizzlylabs.com/genius-scan/
- https://apps.apple.com/sa/app/scanner-app-genius-scan/id377672876
- https://thegrizzlylabs.com/genius-scan/pricing/

Genius Scan declara corrección de perspectiva, escaneo por lotes, PDF multipágina, OCR, organización y búsqueda, exportación a servicios de nube y funciones de seguridad. RealScan cubre captura/corrección y PDF/OCR y añade su recorrido de mostrador, formatos físicos y trabajos de impresión. El escáner local admite hasta ocho capturas; el recorrido de documentos del mostrador tiene otros límites. No se afirma equivalencia completa en limpieza de sombras, organización/búsqueda, biometría, cifrado PDF, sincronización o exportación automática.

Descripción adecuada: sistema especializado en preparar fotos, identificaciones y documentos para imprimir y entregar desde un mostrador. No se debe anunciar como superior a Genius Scan sin pruebas comparativas equivalentes.
# Ajustes del recorrido de impresión

La impresión de documentos desde el estudio y desde el recorrido de entrega abre la misma revisión de impresión directa. El PDF sigue siendo una alternativa explícita.

En doble cara manual, la primera pasada muestra una confirmación de que las caras han salido bien y el papel se ha recolocado. Solo entonces permite continuar con las caras pares. Si cambia el trabajo, las opciones o la revisión después de la primera pasada, se bloquea la continuación para evitar imprimir reversos de un pedido diferente.

No se supone que cerrar la ventana de impresión signifique que el papel salió. La orientación de entrada y el orden de la pila se comprueban con una prueba física en la impresora. Las comprobaciones automáticas validan selección de caras y continuidad, no la colocación física del papel.
# Pulido de los tres servicios

Las opciones de identificación incorporan dibujos de la hoja y explican la diferencia entre ambas caras de una identificación colocadas juntas en una página y la impresión por ambos lados del papel. La guía manual queda accesible desde ese apartado.

En fotografía, el resumen muestra fotos por juego, número de juegos y total, e indica una copia en el controlador cuando los juegos ya están incluidos. La revisión final separa esos cuatro datos.

La captura móvil identifica la tarea concreta en el encabezado: revisar frente, revisar reverso, repetir una cara, tomar una fotografía o revisar una página numerada. Los títulos se insertan como texto, sin interpretar HTML.
