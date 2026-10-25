# Corrección del cierre de publicación — 3.25.1

## Causa comprobada

Firebase CLI 15.26.0 devolvía un error incluso al ejecutar `firebase --version`: primero imprimía la versión y después intentaba eliminar `lastError` en su archivo local de configuración. El entorno rechazaba esa escritura con EPERM. El stack identificó `Configstore.delete` y el manejador `process.on('exit')` de `lib/bin/cli.js`.

La operación en Firebase podía haberse completado antes de ese fallo. Por eso la 3.25 se confirmó consultando directamente el commit y build en los cuatro dominios, aunque el ejecutable devolviera un código no exitoso.

## Cambio

`scripts/firebase-runner.cjs` utiliza la API oficial de Node de `firebase-tools`, documentada en el README del paquete instalado. Se evita el punto de entrada binario y su manejador de cierre; no se modifica la librería instalada, no se copian credenciales y no se cambian permisos del perfil.

La comprobación de acceso, el inicio de sesión explícito y el deploy usan el mismo adaptador. Se conserva la preparación de la versión fijada de Firebase si hace falta instalarla. El deploy sigue limitado a Hosting y a los dos proyectos configurados.

Un rechazo real de la API sigue devolviendo código no exitoso. Una sesión vencida, un permiso ausente o un error de red no se transforman en éxito. La publicación solo termina después de comprobar el mismo commit y build en ambos sitios.

## Verificación

- El adaptador ejecutó `--version` con el paquete oficial instalado y terminó con código 0 en el mismo entorno donde el ejecutable fallaba.
- La consulta real de acceso con una sesión vencida terminó con código 1 y el mensaje de autenticación, sin el error adicional de cierre.
- Las pruebas del adaptador comprueban los dos destinos, las opciones explícitas de inicio de sesión, el rechazo de alcance no permitido y la propagación de un fallo real.
- La regresión Windows comprueba trece escenarios del publicador con Node real y operaciones externas simuladas, e identifica el uso del adaptador.

La autenticación interactiva requiere que el propietario complete Google cuando su sesión haya caducado. El adaptador conserva esa exigencia.
