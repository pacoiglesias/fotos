# Publicacion de RealScan 3.17 desde Windows

Abre `subir_a_firebase.bat` con doble clic para publicar con tu sesion actual.
Para preparar tambien los accesos, abre `autenticar_y_desplegar.bat`: comprueba
Git y la conexion al repositorio; configura Git Credential Manager y, si no
encuentra la cuenta pacoiglesias, abre el acceso de GitHub en el navegador.
Si Firebase requiere renovar la sesion, ofrece navegador o codigo manual.
Los BAT conservan su codigo de salida y dejan la ventana abierta al terminar.

El proceso usa Git y Node.js 24 o posterior. Reutiliza Firebase CLI instalado y
su sesion actual; solo instala la CLI 15.26.0 en `.audit/firebase-cli` si falta.
Comprueba acceso a ambos proyectos antes de descargar las dependencias.
Si el acceso falla, muestra el error; el modo de preparacion permite renovar
la sesion. Tambien puedes usar `Firebase-Acceso.bat` de forma independiente.

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

Validacion: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File
scripts/windows-publish-regression.ps1`. Ejecuta el publicador aislado con Node
real y Windows PowerShell; simula Git, Firebase, npm y Playwright. Comprueba
exito, acceso denegado, commit incorrecto, instalacion fallida, publicacion
fallida, preparacion de GitHub y rechazo de Node antiguo. Los errores interrumpen el proceso y producen
salida distinta de cero. Se ejecuta tambien en GitHub Actions sobre Windows.
Estas pruebas no realizan despliegues reales.
