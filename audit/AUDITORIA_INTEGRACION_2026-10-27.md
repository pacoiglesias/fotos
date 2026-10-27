# RealScan Pro: integración local y GitHub, 27/10/2026

## Fuentes comparadas

- Carpeta Windows: `C:\Users\pacoi\Nueva carpeta (3)`, repositorio `pacoiglesias/fotos`. Al iniciar, árbol limpio en `main`, commit `dec667f`, versión 3.28.1. Se conservaron carpetas ignoradas de respaldo y auditoría.
- GitHub `main`: `89da339a365340c3a4cfc57d769d73f9a74c1c86`, versión 3.29.0; once commits por delante de la copia inicial.
- PR #8: rama `codex/paperless-annotations-3291`, cabeza `0ef4274080e178d367fa395d27986bfb3b532247`, versión 3.29.1. Incluye búsqueda, descarga e importación de copias de Paperless; su descripción inicial quedó desactualizada respecto del código.
- PR #9: rama `improve/ux-accessibility-20261027`, cabeza `a31b0a2a1b937cc01971ff0906da6fcf1c6b52dc`. Cambios de foco, interacción táctil y movimiento reducido.
- Integración en `codex/auditoria-integracion-3291`, sin sobrescribir `main` local.

## Correcciones de esta auditoría

1. El build omitía `ux-accessibility.css` importado por PR #9. Se incluye en la lista de publicación y se comprueba que las importaciones CSS locales existan en `dist`.
2. Paperless podía confirmar como archivado un envío usando la primera tarea de una respuesta aunque su identificador fuera diferente. Ahora exige coincidencia; una tarea ajena conserva el estado pendiente.
3. Las descargas de Paperless comprueban la generación de sesión durante la lectura: bloquear y volver a desbloquear invalida la descarga anterior. Se conserva límite de 30 MB, comprobación de formato y origen HTTPS fijo.
4. La regresión del estudio comprobaba inmediatamente una vista que abre de forma asíncrona. Se espera la vista real antes de comprobar aprobación, hojas y corrección de salida inválida. No se elimina ninguna aserción de contenido.

Se añadieron casos de regresión para los dos errores de Paperless y la integridad de CSS publicado. Los tokens no se imprimieron ni se incorporaron al repositorio.

## Validación y autenticación

- `npm ci --no-audit --no-fund`: correcto, 101 paquetes instalados.
- Pruebas específicas de Paperless: ocho resultados PASS, incluidos tarea ajena y cambio de sesión durante descarga.
- Regresión de estudio repetida tras corregir la espera: diez resultados PASS; incluye capturas a 320/390/768/1440 px y tema oscuro.
- Primera pasada de `npm run verify`: terminó con un único grupo fallido, `studio-regression`, por la espera asíncrona corregida arriba. El estudio se repitió y sus diez comprobaciones pasaron. El publicador repetirá la suite completa sobre el commit final antes de permitir despliegue.
- CI solicitado [40543343674](https://github.com/pacoiglesias/fotos/actions/runs/40543343674), asociado a la cabeza del PR #8: Windows aprobado; regresión en instalación de navegadores al consultar. No equivale a CI aprobado de la integración.
- Firebase rechazó inicialmente las credenciales caducadas. Se ejecutó `login --interactive --reauth` por solicitud del usuario y finalizó correctamente. Se confirmó acceso de lectura a **ambos** proyectos, `fotos-cobertores-pro` y `cobertores-web`.

- `npm audit --omit=dev`: cero vulnerabilidades reportadas en dependencias de producción.
- Publicador Windows: 16 casos PASS con Node y Windows PowerShell reales; servicios externos simulados.
- Revisión visual: escritorio, móvil a 320/390 px, Paperless y modo oscuro. El tema oscuro se captura con movimiento reducido y espera a su fondo efectivo; la captura inicial durante transición no se usa como evidencia final.

## Producción comprobada antes de publicar

Los cuatro endpoints `version.json` devolvieron HTTP 200:

| Destino | Build | Commit |
| --- | --- | --- |
| fotos-cobertores-pro.web.app y firebaseapp.com | realscan-787bec0e2079b7f7 (3.29.0) | 89da339a365340c3a4cfc57d769d73f9a74c1c86 |
| fotos-cobertores.web.app y firebaseapp.com | realscan-45289f2da3a545c8 (3.28.1 según código fuente) | dec667f32180f426d187a14e62237e9145c895df |

Ambos destinos estaban desincronizados. La nueva versión aún no se declara publicada en este checkpoint.

## Rendimiento y límites

La prueba Chromium con una hoja 4×6 de ocho fotos midió 42.5 ms para preparar impresión y 0.3 ms al reutilizarla. Es una medición sintética de esta ejecución; no una garantía ni una comparación universal. Se mantienen carga diferida de OCR y segmentación, caché de impresión e importes acotados.

Quedan para validación física: cámara/PWA de iPhone real, regla de 50 mm e impresora y reinserción dúplex. Paperless se prueba con respuestas simuladas y archivos sintéticos; no se afirma acceso, CORS ni recepción real en el NAS. La autenticación Firebase no concede ni demuestra autenticación Paperless. No se almacenaron firmas reales de clientes.

## Revisión de facilidad de uso solicitada

| Mejora | Estado en la integración | Evidencia o límite |
| --- | --- | --- |
| Una zona de preparación | Implementada | Mostrador común de servicio, formato, papel, cantidad y hoja. Escritorio usa columnas; móvil coloca hoja antes de herramientas. |
| Siguiente acción contextual | Implementada con margen de simplificación | `workspaceNext` distingue primera captura, reverso y páginas pendientes. Persisten varios accesos a revisión/entrega. |
| Resumen del pedido | Implementado | Fotos, juegos, hojas, papel y copias de impresora calculados del trabajo real. |
| Presets del negocio | Implementados | Accesos INE/infantiles y hasta seis ajustes propios; no guardan imágenes de clientes. |
| Cambio de cliente | Implementado | Confirmación para sustituir trabajo, limpieza de anotaciones e imágenes y tratamiento explícito del QR anterior. |
| Avisos junto al problema | Parcial | Revisión individual de páginas, caras pendientes y calidad; algunos errores todavía son mensajes generales. |
| Progreso de operaciones lentas | Parcial | Estados de preparación y Paperless y bloqueo de acciones repetidas; falta una presentación uniforme de etapas y espera. |
| Móvil al alcance del pulgar | Implementado y probado en navegadores | Barra adaptativa y objetivos táctiles; falta prueba física de iPhone. |

Prioridades de una siguiente iteración: consolidar la acción principal cuando hay varios accesos visibles; convertir errores generales en avisos junto al control con acción de corrección; unificar estados «Preparando archivo», «Generando PDF», «Recibido por Paperless» y «Archivado» sin porcentajes inventados. No se declaran implementadas esas mejoras futuras.


## Cierre de publicación comprobado

- La suite completa del publicador sobre `9ac90a5870ce96e129afd3681bae4a851f0cd69a` terminó sin fallos: 326 mensajes PASS.
- Build publicado: `realscan-b6c338541ef7eb0c`, aplicación 3.29.1. Ambos sitios y sus dos dominios respondieron HTTP 200 con el mismo build y commit; la hoja `css/ux-accessibility.css` también respondió 200 en los cuatro.
- `npm run publish` completó la verificación y el primer destino. El segundo predeploy rechazó un cambio concurrente en una prueba. Se guardó aparte ese ajuste, se restauró el árbol limpio y se repitieron `check-release` y únicamente el despliegue secundario por el mismo runner oficial. Después se verificaron los cuatro endpoints, incluida appVersion. No se omitieron controles ni se cambiaron los archivos de la aplicación durante la recuperación.
- Evidencia local: `.audit/publicacion-3291-verificada.json`, `.audit/publish-integracion-3291.log` y `.audit/annotations-ci-followup.log`.
- CI de la integración `40548246430`: Windows aprobado; Linux detectó una espera insuficiente en `annotations-regression`. La prueba intentaba reabrir captura antes de finalizar el diálogo anterior. Se espera ahora el cierre efectivo y el fin del procesamiento. Regresión específica repetida: aprobada con todas las aserciones de PDF, firmas, privacidad, móvil y cambio de cliente. El seguimiento modifica únicamente prueba y documentación, no el contenido publicado.
- CI original `40543343674`: se consultó repetidamente; Windows aprobado y regresión aún en instalación de navegadores en esas consultas. El intento de recuperar sus logs mientras corría devolvió 404. No se presenta como aprobado.
- La propuesta 3.30.0 se evaluó y se presentó un plan por fases; no se implementó ni se publicó como parte de 3.29.1. Hay guardado explícito de firmas reutilizables en localStorage y borradores en IndexedDB: la versión actual no ofrece una garantía zero-storage.
