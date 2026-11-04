# RealScan Pro 3.39.1

Estado: publicada y verificada en los dos Firebase y en fotos.cobertores.com.

Fuente: 5f95fd5447fe7a1e560ae033a2f3e124949c378a. Contenido: realscan-a405d66782f5c9c2. Publicador oficial: 488 marcas PASS, 0 FAIL, salida 0. CI del commit exacto: [41743799455](https://github.com/pacoiglesias/fotos/actions/runs/41743799455), correcto. Prueba pública: cinco direcciones, 95 comparaciones de archivos, CSP y portadas/version.json sin parámetros coincidentes.

## Alcance

Entrada diferenciada entre servicio y origen, archivo Paperless en entrega, avisos próximos a las acciones. Correcciones de espera del NAS, errores OCR y reintentos explícitos. Eliminación de nube basada en páginas reales y conservando pendientes cuando falla. Audio condicionado a gesto real; metadato móvil actualizado. Ningún cambio al motor de impresión en milímetros ni a los scripts en línea.

## Validación

npm ci: 101 paquetes instalados, 102 auditados, 0 vulnerabilidades notificadas. Doce comprobaciones del flujo de entrada y entrega con archivos sintéticos y respuestas simuladas del NAS en Chromium y WebKit. Pruebas unitarias de audio, respuestas NAS bloqueadas, fallos OCR y reintentos; seis comprobaciones de recuperación/eliminación de nube. La verificación completa, CI y publicación de la fuente final terminaron correctamente. version.json se genera en dist durante build con versión, contenido y commit de origen; no existe un version.json manual en la raíz.

## Límites

El error original de OCR de Paperless requiere comprobar una tarea nueva tras guardar spa+eng sin espacios. Si persiste, verificar idiomas dentro del contenedor NAS. No se han instalado paquetes ni modificado Docker. La prueba física de la HP sigue pendiente. Los avisos informativos de instalación PWA y limpieza de escaneos caducados se conservan. Un objeto ya borrado en otro equipo puede responder 404 sin impedir una eliminación idempotente. No se han usado credenciales ni documentos personales en las pruebas.

## Revisión adicional antes de desplegar

Se detuvo el primer publicador durante las pruebas, antes de cualquier despliegue, al detectar que el acceso rápido de archivado no compartía la recuperación del envío manual. Ambos accesos comparten ahora estado, enlace de ayuda y reintento explícito; mientras uno trabaja, el otro no inicia otra operación. Las descargas y la impresión siguen disponibles. Dos casos adicionales de navegador prueban el fallo y la recuperación por este acceso rápido.

## Limpieza de caché comprobada durante actualización

El publicador completo se detuvo con una caché histórica todavía presente en la prueba de actualización de Windows; no se desplegó. Se añadió un caso reproducible de caché antigua que reaparece tras activar el trabajador. El aviso de disponibilidad vuelve ahora a retirar las cachés históricas antes de responder, conservando otros builds que puedan estar instalándose y las cachés ajenas. No borra preferencias, perfiles, tokens ni trabajos del usuario. Se mantienen las comprobaciones estrictas de actualización y de conservación de datos.

## Pantalla oscura de Paperless

Se reprodujo una incompatibilidad de capas: al abrir OCR desde el diálogo nativo de metadatos, la ventana anterior de OCR se mostraba detrás de la capa nativa y el coordinador antiguo bloqueaba los controles. OCR usa ahora la misma capa nativa que Paperless; la coordinación de foco e inercia respeta esa capa, Escape vuelve al diálogo anterior y ambos asistentes tienen una acción superior para volver. Se prueba con texto grande en móvil y escritorio, en Chromium y WebKit. La causa del caso exacto del usuario no se ha observado directamente en su sesión.

## Cierre de accesibilidad y repositorio

La detección de una ventana nativa exige un elemento DIALOG abierto, evitando confundir los cuadros antiguos durante el retorno de foco. La suite histórica de accesibilidad conserva sus 23 comprobaciones. Las ramas propias de las PR 19 y 20, ya fusionadas, se retiraron mediante comprobación de ascendencia y referencia remota esperada. Se preservan main, las ramas de entrega y las etiquetas. El último cierre solo cambia documentación; la fuente pública sigue siendo el commit indicado arriba.
