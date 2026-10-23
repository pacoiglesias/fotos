# Publicacion de RealScan 3.17 desde Windows

Abre `subir_a_firebase.bat` con doble clic. `autenticar_y_desplegar.bat` y
`desplegar_con_powershell.bat` ejecutan el mismo proceso y conservan su codigo
de salida. La ventana queda abierta al terminar, tanto si hay exito como error.

El proceso usa Git y Node.js 24 o posterior. Reutiliza Firebase CLI instalado y
su sesion actual; solo instala la CLI 15.26.0 en `.audit/firebase-cli` si falta.
Comprueba acceso a ambos proyectos antes de descargar las dependencias.
Si el acceso falla, muestra el error y se detiene. Para renovar la sesion,
abre `Firebase-Acceso.bat`; el publicador no fuerza un nuevo inicio de sesion.

Para evitar que el Git local antiguo bloquee la entrega, descarga una copia
nueva de la aplicacion auditada 3.17.0, commit
`8b4d9c4782afa0f0f3f3a924841cd7371a4d4a5b`, en una carpeta unica dentro
de `.audit/publicacion-317-*`. Conserva los archivos de la carpeta original.
Publica ese commit exacto; otros cambios locales sin subir no se incorporan.

Instala las dependencias con `npm ci` y los navegadores Chromium y WebKit con
Playwright. Ejecuta `npm run publish`, que compila, ejecuta las pruebas,
comprueba el commit del build, despliega Hosting en los proyectos
`fotos-cobertores-pro` y `cobertores-web`, y verifica version y commit en los
cuatro dominios web.app/firebaseapp.com. No cambia reglas ni proveedores de
autenticacion. Solo informa de exito si todo termina correctamente.

Cada intento guarda un registro `.audit/publicacion-317-*.log`. Si el segundo
sitio falla despues de actualizarse el primero, el intento se considera
incompleto; ejecutar de nuevo el BAT completa la misma version en ambos.

Validacion local: sintaxis PowerShell y ejecucion con comandos simulados en
cinco escenarios: exito, acceso denegado, commit incorrecto, instalacion fallida
y publicacion fallida. Los errores interrumpen el proceso y producen salida
distinta de cero. Estas pruebas no realizan despliegues reales.
