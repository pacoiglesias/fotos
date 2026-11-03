# RealScan Pro 3.39.1

Estado: cambios implementados; publicación pendiente.

## Alcance

Entrada diferenciada entre servicio y origen, archivo Paperless en entrega, avisos próximos a las acciones. Correcciones de espera del NAS, errores OCR y reintentos explícitos. Eliminación de nube basada en páginas reales y conservando pendientes cuando falla. Audio condicionado a gesto real; metadato móvil actualizado. Ningún cambio al motor de impresión en milímetros ni a los scripts en línea.

## Validación

npm ci: 101 paquetes instalados, 102 auditados, 0 vulnerabilidades notificadas. Ocho comprobaciones del flujo de entrada y entrega con archivos sintéticos y respuestas simuladas del NAS en Chromium y WebKit. Pruebas unitarias de audio, respuestas NAS bloqueadas, fallos OCR y reintentos; seis comprobaciones de recuperación/eliminación de nube. Pendientes verificaciones finales, CI y publicación de la fuente final. version.json se genera en dist durante build con versión, contenido y commit de origen; no existe un version.json manual en la raíz.

## Límites

El error original de OCR de Paperless requiere comprobar una tarea nueva tras guardar spa+eng sin espacios. Si persiste, verificar idiomas dentro del contenedor NAS. No se han instalado paquetes ni modificado Docker. La prueba física de la HP sigue pendiente. Los avisos informativos de instalación PWA y limpieza de escaneos caducados se conservan. Un objeto ya borrado en otro equipo puede responder 404 sin impedir una eliminación idempotente. No se han usado credenciales ni documentos personales en las pruebas.
