# RealScan Pro 3.39.0 · Herramientas del documento

Estado: **publicada y verificada en ambos Firebase y en el dominio habitual**.

## Las seis funciones

1. **Unir y dividir:** Documentos → Unir archivos añade PDFs e imágenes en el orden elegido, conserva sus originales y exige revisar las páginas nuevas. Revisar entrega → Herramientas del documento permite un PDF por página o grupos como `1-2;3-5`, descargados en un ZIP. Los grupos no pueden duplicar ni omitir las páginas elegidas.
2. **Peso máximo:** límite por PDF entre 0,1 y 30 MB en la interfaz. Se mide el archivo generado, con intentos acotados de calidad/resolución; si no alcanza el objetivo, explica cómo dividir o aumentar el límite y no entrega un archivo que lo supere. Requiere revisar letras pequeñas. No altera el trabajo ni su impresión original.
3. **Páginas:** todas, pares, impares e intervalo, tanto en la entrega normal como en las herramientas. La numeración se refiere al PDF preparado que se muestra, que puede ser una selección del trabajo original.
4. **Ocultar datos en una copia:** zonas mediante arrastre o porcentajes, confirmación explícita y vista del archivo resultante antes de descargar. Se pintan píxeles negros opacos y se crea un PDF nuevo de imágenes, sin OCR, formularios, adjuntos ni original incrustado. Las zonas enmascaradas usan PNG. No se presenta como una herramienta para borrar los originales del equipo o del NAS. Comprueba que toda la información sensible quedó cubierta.
5. **Repetir ajustes:** Historial, respaldo y herramientas → Repetir ajustes · cliente nuevo. Mantiene solo una lista de formato, papel, cantidad, juegos, margen, posición y opciones de documentos en memoria. Limpia imágenes, anotaciones, encabezados y campos del cliente mediante el cambio de servicio confirmado. Nunca guarda el contenido del pedido en presets o localStorage. Se corrigió una recuperación previa que podía restaurar imágenes de otro cliente: Deshacer cambio de servicio ahora queda vinculado al pedido original y se invalida al comenzar otro.
6. **Comprobar el PDF final:** comprueba número de páginas y dimensiones; avisa de posibles páginas vacías/tenues y contenido o marcas fuera del papel. El análisis de páginas vacías es una sugerencia, no una eliminación automática ni una garantía de legibilidad. Una estructura inválida o páginas faltantes impiden habilitar la entrega.

## Alcance de las copias

Las herramientas especiales crean copias aplanadas desde el PDF ya preparado: conservan medidas físicas y orientación, pero no texto seleccionable, formularios ni firmas digitales de entrada. Si la única petición es un límite de peso que el archivo original ya cumple, se conserva el archivo exacto sin degradación. La copia modificada se prepara hasta 220 ppp; al limitar peso puede bajar hasta 72 ppp. El original preparado y el motor de impresión 1:1 siguen disponibles por separado. Volver al diálogo de entrega no sustituye el original por la copia ocultada.

Máximo 80 páginas por copia y 100 MB de entrada/salida agregada; render limitado por página, liberación de canvas/tareas, controles bloqueados durante operaciones y cancelación por cierre, bloqueo o cambio de trabajo. La ocultación solo vive en memoria mientras está abierto el diálogo.

## Pruebas y publicación

Publicación comprobada el 3 de noviembre de 2026, 1:02 p.m., hora de Ciudad de México.

- Fuente: `442650608898de65d31690f4fa87c7650680b584`; contenido: `realscan-144ffb76d7a0a7f6`.
- npm ci: 101 paquetes instalados; 0 vulnerabilidades informadas.
- npm run publish terminó con código 0: suite completa, build, CSP, metadatos y ambos Firebase desplegados. 470 marcas PASS, 0 FAIL; las marcas incluyen comprobaciones repetidas y no equivalen a casos únicos.
- [PR #19](https://github.com/pacoiglesias/fotos/pull/19) integrado. [CI de la fuente publicada](https://github.com/pacoiglesias/fotos/actions/runs/41694262545) aprobado.
- Regresión nueva: 10 grupos en Chromium/WebKit. Comprueba medidas mixtas A4/Carta/paisaje, píxeles opacos y ausencia de OCR/adjuntos en copias ocultadas, peso real y límite imposible, conservación exacta del archivo que ya cumple, ZIP de uno o varios PDFs, orden de unión, páginas impares, vista ampliada, limpieza de datos al repetir ajustes, recuperación limitada al mismo pedido y cierre por bloqueo.
- Portada / y version.json sin parámetros, appVersion, sourceCommit, CSP y huellas de archivos coinciden en cinco direcciones: 65 comparaciones de archivos.

| Dirección | Archivos comprobados | Versión |
| --- | ---: | --- |
| [https://fotos-cobertores-pro.web.app](https://fotos-cobertores-pro.web.app) | 13 | 3.39.0 |
| [https://fotos-cobertores-pro.firebaseapp.com](https://fotos-cobertores-pro.firebaseapp.com) | 13 | 3.39.0 |
| [https://fotos-cobertores.web.app](https://fotos-cobertores.web.app) | 13 | 3.39.0 |
| [https://fotos-cobertores.firebaseapp.com](https://fotos-cobertores.firebaseapp.com) | 13 | 3.39.0 |
| [https://fotos.cobertores.com](https://fotos.cobertores.com) | 13 | 3.39.0 |

Durante la validación se reprodujo y corrigió la recuperación de imágenes del pedido anterior mediante Deshacer cambio de servicio. La primera ejecución del publicador se interrumpió en las pruebas, antes de desplegar, para incorporar esa corrección y su regresión. La ejecución final corresponde a la fuente y resultados indicados.

Evidencia local ignorada: .audit/publish3390.log, .audit/publicacion-3390-verificada.json, .audit/ci3390-publication.json y .audit/document-tools/results.json. El cierre documental no modifica el compilado ni constituye otro despliegue.

## Pendientes humanos

Se mantienen la medición física HP CP1025, dúplex, iPhone real y evaluación con un operador nuevo. Las pruebas de servicios remotos usan respuestas controladas y no certifican el acceso real al NAS desde cada navegador.

## Incidencia OCR del NAS

El operador mostró `spa + eng` en el campo Idioma de Paperless, sobrescribiendo la configuración externa. Se indicó usar `spa+eng`; el operador confirmó haber guardado el cambio. La validación de una tarea nueva sigue pendiente. No se instalaron paquetes ni se modificó Docker desde esta sesión. [Configuración, diagnóstico y límites](CONFIGURACION_PAPERLESS.md).
