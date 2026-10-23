# Cierre operativo y publicación coordinada

## Hallazgos corregidos

1. El exportador admitía generar JSON de más de 50 MB que el importador rechazaba. Ahora comparten el límite de 50 MB.
2. La restauración confirmaba cada escritura individualmente, pudiendo dejar una importación parcial. Ahora valida todas las imágenes y guarda en una única transacción con confirmación al completarse. No se descartan páginas inválidas silenciosamente.
3. Se admitían URLs blob que no pueden restaurarse en otro navegador. Se rechazan y se decodifican todas las imágenes persistentes antes de aceptar el archivo.
4. Se añadió verificación del archivo sin modificar el historial y acceso directo al respaldo desde el panel de cierre diario.
5. Se añadió PDF independiente con referencias físicas y elección de A4, Carta, Oficio México y Legal USA. Su escala no depende de la del proyecto.
6. Se corrigieron mensajes que daban por verificada la impresora o Safari sin comprobación física.
7. Los accesos de despliegue anteriores sólo publicaban el sitio pro. Se añadió configuración exclusiva para el sitio fotos-cobertores del proyecto cobertores-web y un flujo que publica y comprueba ambas instalaciones. No se modifica cobertores-web.web.app.
8. La alerta GitHub número 1 corresponde a la configuración pública Firebase. Se verificó la clave en Google Cloud y se redujeron sus 27 API permitidas a sólo Identity Toolkit y Secure Token. No se oculta ni se presenta como contraseña.

## Validación

Las pruebas incorporadas descargan el respaldo real, verifican sin mutación, restauran en un navegador limpio, rechazan corrupción, rechazan imágenes no portables y simulan fallo de escritura para comprobar la reversión completa. El PDF se abre con un lector independiente y se verifican sus dimensiones y rectángulos reales en los cuatro papeles. Se mantienen las pruebas de autenticación, QR, entrega, caducidad, revocación, caché antigua, adaptación móvil y las doce suites anteriores.

Las evidencias locales están en .audit/repair-evidence. El archivo version.json permite comparar la huella y el commit entre dist y las cuatro URL de Firebase. Los respaldos locales de la versión se guardan en backups, excluido de Hosting y Git.

## Límites pendientes de aceptación física

El propietario realizará las pruebas con cámara, Android/iPhone e impresora reales. La automatización utiliza navegadores independientes y el backend Firebase real, pero no certifica la cámara ni el tamaño impreso. La regla de 50 mm y los recuadros deben medirse en papel al 100 %.

fotos.cobertores.com está registrado en Firebase, pero el DNS público aún no existe y el certificado está en validación. Por instrucción del propietario, configurará Hostinger posteriormente. El objetivo publicado en esta entrega son las cuatro direcciones de Firebase y dejar el dominio preparado.

Git y los archivos de versión respaldan el programa; los documentos locales del usuario necesitan su exportación aparte. Los historiales de distintos dominios están aislados por el navegador.

La alerta GitHub #1 quedó resuelta como false_positive tras la revisión: se trata del identificador público del cliente Firebase, con restricciones verificadas en Google Cloud. Se documentó la justificación y la referencia oficial; no se afirmó haber revocado una credencial administrativa.
