# Auditoría 3.35.1: edición dentro de la revisión

Base: entrega 3.35.0 publicada en ambos Firebase y dominio propio; los cinco orígenes se verificaron con 54 archivos por origen, CSP y metadatos coincidentes. Build realscan-e805bb784685d880, fuente 65246aa357b48a46ccae7e633986e89d79d88e28. CI de main aprobado y release/3.35.0 en 19584afa94bb670444a5a9e5cfa0f304c4c0168c.

## Cambios
- Panel compartido Hoja / Encabezado / Acabado en la revisión de impresión/PDF y entrega digital.
- Papel, caras, juegos, margen automático/manual, encabezado y texto; rótulos, regla y líneas de corte para fotografía e identificación. Documentos usan sus opciones propias de margen y encabezado, sin ofrecer marcas que su motor no genera.
- Vista previa regenerada en el mismo diálogo. Las operaciones de envío y descarga se deshabilitan mientras la copia preparada deja de ser válida. Cambios ajenos del trabajo siguen cerrando una entrega obsoleta.
- Pantallas grandes: ajustes a la izquierda y vista previa a la derecha. Móvil: campos amplios y grupos legibles.
- El margen cambia la colocación y la capacidad de la hoja; conserva las medidas físicas. Se reserva espacio para título/regla cuando están activos y se conservan los errores de falta de espacio. No se reduce la identificación para hacerla caber.
- Margen manual en borrador y copias guardadas; validación 0–25 mm al restaurar. El siguiente cliente restablece el margen automático. Los valores automáticos anteriores permanecen iguales.

## Verificación
Regresión específica en Chromium y WebKit: edición de margen, título y marcas; tamaño ID-1 conservado; entrega PDF regenerada sin salir del diálogo; ocultación real de encabezado; limpieza del ajuste al cambiar de trabajo. Regresión fotográfica: 1.256 distribuciones y comprobaciones de círculo sin deformación. Build, metadatos y CSP aprobados. Suite completa, CI y publicación de 3.35.1 pendientes hasta finalizar las ejecuciones correspondientes.

## Configuración real
HP CP 1025: perfil nominal 100 % guardado en el navegador; medición física pendiente. NAS: credencial validada por HTTP 200 contra su origen, sin documentos enviados; pendiente guardarla en la sesión del usuario, bloqueada por inactividad. No contiene credenciales este informe ni el código.
