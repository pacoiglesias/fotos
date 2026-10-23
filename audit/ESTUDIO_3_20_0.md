# RealScan 3.20 — estudio visual

Esta entrega reúne el rediseño visual y el flujo práctico propuestos para las
versiones 3.18, 3.19 y 3.20 sobre la aplicación 3.17.

## Interfaz y trabajo diario

- Tres tarjetas ilustradas: identificación, fotografías y documentos.
- Inicio amplio que se compacta al entrar en un servicio; formatos frecuentes
  pasan al panel de trabajo para dejar la hoja como centro de la pantalla.
- Controles y capturas a la izquierda, hoja en vivo a la derecha en escritorio;
  distribución de una columna en teléfonos y tabletas.
- Tipografía, superficies, bordes, estados, iconos, espaciado y modo oscuro
  coherentes. Se mantienen los temas y el modo de mostrador accesible.
- Ajustes avanzados agrupados en un panel desplegable, abierto inicialmente
  para conservar el acceso a los controles anteriores.
- Selección de imagen, giro, recorte y comparación original/resultado junto
  a la hoja. Usan los mismos datos y el editor existente.
- La barra técnica anterior deja de flotar sobre las fotografías.
- Avisos de preimpresión y de resolución estimada inferior a 150 ppp.
  La estimación no certifica la aceptación de una fotografía oficial.

## Formatos y aprobación

Los formatos frecuentes iniciales preparan identificación, seis fotografías
infantiles y cuatro fotografías de pasaporte. Se pueden guardar hasta seis
configuraciones locales de formato, papel, cantidad y caras. Se validan al leer
y solo contienen preferencias: no fotos, nombres ni otros datos del cliente.
Cambiar de servicio con imágenes cargadas conserva la confirmación existente.

La vista del cliente muestra todas las hojas preparadas. La aprobación vive
solo en memoria; se invalida al cambiar imágenes, formato, papel, cantidades,
escala, distribución, guías o perfil de impresora. No supone una validación
oficial ni confirma que se haya realizado la impresión física.

## Publicación desde Windows

`subir_a_firebase.bat` publica la 3.20. `autenticar_y_desplegar.bat` prepara
también GitHub y Firebase. El publicador resuelve el commit de
`release/3.20.0`, descarga esa versión y exige que el checkout coincida con el
commit resuelto y con package.json 3.20.0. Si la rama cambia durante la descarga,
se detiene. Conserva los archivos de la carpeta original y guarda el registro
y la copia de publicación dentro de la carpeta de trabajo de auditoría.

El proceso ejecuta las pruebas, el build y la comprobación de origen antes de
publicar Hosting en ambos proyectos. Verifica versión y commit en los cuatro
dominios de Firebase. No despliega reglas ni cambia proveedores de acceso.

## Validación

- `npm run check` y `npm run build`.
- `npm run test:studio`: servicios, preferencias, comparación, giro, protección
  del trabajo, aprobación de todas las hojas, invalidación, bloqueo de acceso,
  escritorio, móvil y modo oscuro.
- `npm run test:print`: medidas, seis papeles, imágenes visibles, ausencia de
  hojas adicionales, perfiles de impresora y preparación de impresión.
- `npm run verify`: regresiones de la aplicación anterior y del estudio nuevo.
- `scripts/windows-publish-regression.ps1`: Node real en Windows PowerShell,
  accesos simulados y propagación de fallos. No realiza despliegues reales.

Las pruebas del estudio generan evidencia en `.audit/studio-320/`. La impresión
física debe comprobarse con la impresora y el papel reales del establecimiento.
