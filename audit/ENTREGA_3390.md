# RealScan Pro 3.39.0 · Herramientas del documento

Estado: implementación local; validación completa y publicación pendientes. La última entrega pública comprobada es 3.38.0.

## Las seis funciones

1. **Unir y dividir:** Documentos → Unir archivos añade PDFs e imágenes en el orden elegido, conserva sus originales y exige revisar las páginas nuevas. Revisar entrega → Herramientas del documento permite un PDF por página o grupos como `1-2;3-5`, descargados en un ZIP. Los grupos no pueden duplicar ni omitir las páginas elegidas.
2. **Peso máximo:** límite por PDF entre 0,1 y 30 MB en la interfaz. Se mide el archivo generado, con intentos acotados de calidad/resolución; si no alcanza el objetivo, explica cómo dividir o aumentar el límite y no entrega un archivo que lo supere. Requiere revisar letras pequeñas. No altera el trabajo ni su impresión original.
3. **Páginas:** todas, pares, impares e intervalo, tanto en la entrega normal como en las herramientas. La numeración se refiere al PDF preparado que se muestra, que puede ser una selección del trabajo original.
4. **Ocultar datos en una copia:** zonas mediante arrastre o porcentajes, confirmación explícita y vista del archivo resultante antes de descargar. Se pintan píxeles negros opacos y se crea un PDF nuevo de imágenes, sin OCR, formularios, adjuntos ni original incrustado. Las zonas enmascaradas usan PNG. No se presenta como una herramienta para borrar los originales del equipo o del NAS. Comprueba que toda la información sensible quedó cubierta.
5. **Repetir ajustes:** Historial, respaldo y herramientas → Repetir ajustes · cliente nuevo. Mantiene solo una lista de formato, papel, cantidad, juegos, margen, posición y opciones de documentos en memoria. Limpia imágenes, anotaciones, encabezados y campos del cliente mediante el cambio de servicio confirmado. Nunca guarda el contenido del pedido en presets o localStorage.
6. **Comprobar el PDF final:** comprueba número de páginas y dimensiones; avisa de posibles páginas vacías/tenues y contenido o marcas fuera del papel. El análisis de páginas vacías es una sugerencia, no una eliminación automática ni una garantía de legibilidad. Una estructura inválida o páginas faltantes impiden habilitar la entrega.

## Alcance de las copias

Las herramientas especiales crean copias aplanadas desde el PDF ya preparado: conservan medidas físicas y orientación, pero no texto seleccionable, formularios ni firmas digitales de entrada. Si la única petición es un límite de peso que el archivo original ya cumple, se conserva el archivo exacto sin degradación. La copia modificada se prepara hasta 220 ppp; al limitar peso puede bajar hasta 72 ppp. El original preparado y el motor de impresión 1:1 siguen disponibles por separado. Volver al diálogo de entrega no sustituye el original por la copia ocultada.

Máximo 80 páginas por copia y 100 MB de entrada/salida agregada; render limitado por página, liberación de canvas/tareas, controles bloqueados durante operaciones y cancelación por cierre, bloqueo o cambio de trabajo. La ocultación solo vive en memoria mientras está abierto el diálogo.

## Pruebas y publicación

Pendientes de registrar sobre la fuente final: npm ci, comprobación de versión, sintaxis, compilación, CSP, regresiones de las seis funciones en Chromium/WebKit, suite completa, CI y publicación. Se comprobarán la portada y version.json sin parámetros, archivos y CSP en ambos Firebase y el dominio habitual.

## Pendientes humanos

Se mantienen la medición física HP CP1025, dúplex, iPhone real y evaluación con un operador nuevo. Las pruebas de servicios remotos usan respuestas controladas y no certifican el acceso real al NAS desde cada navegador.
