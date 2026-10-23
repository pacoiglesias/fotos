# Interfaz e impresión 3.17.0

Fecha: 23 de octubre de 2026. Base: `main` 3.16.0, commit `1f450dbf855efc7191d9cc82bdf21f8bf4920b8a`, árbol `7ae1ca342e68e0614bfb19bebaebedcc443dcc2b`.

## Base y conservación

La primera copia local estaba en una rama antigua 3.11.1. Ese trabajo preliminar se aisló sin publicarlo. Se obtuvo la fuente de 3.16.0 desde GitHub y se revisó en móvil y escritorio antes de aplicar esta mejora. La rama `release/3.16.0` y sus archivos no se sustituyen por la versión preliminar. Se conservan los cambios de seguridad (sin credencial de fábrica), fondo con IA, temas, mostrador, cifrado, nube, archivo, folios, calibración, aprobación del cliente y WhatsApp.

## Cambios para el uso diario

- Un único recorrido visible: Elegir, Cargar y Revisar / Imprimir. Se conserva la barra fija y su separación de la cabecera.
- Identificación, fotografías y documentos con icono y texto. Fotos e identificación se abren sin formulario cuando el puesto está vacío; cambiar un trabajo cargado sigue requiriendo confirmación.
- Cámara, Archivo / USB y Celular por QR visibles y con objetivos amplios. El acceso al escáner local sigue disponible debajo del trabajo y en herramientas.
- Estado de cada cara con icono y texto, y acceso al lugar donde se carga o revisa. Los controles rápidos usan las mismas funciones de papel, tamaño, copias y caras del programa existente.
- El panel Hoy mantiene sus acciones de respaldo, calibración y nube, después del trabajo principal. Los formatos del servicio siguen accesibles sin desplegables.
- Etiquetas legibles en la cabecera del teléfono. Se conservan el modo mostrador y los temas.

## Impresión y correcciones

- Se elimina el camino de generar PDF y esperar el visor oculto antes de llamar a imprimir. La descarga PDF se mantiene como alternativa explícita.
- La hoja se prepara durante la revisión con el mismo motor milimétrico. Se espera a decodificar sus imágenes; se reutiliza mientras no cambien la composición, las fuentes o el perfil de impresora.
- La corrección X/Y y el desplazamiento del perfil activo se aplican a la geometría real. La revisión muestra todas las hojas preparadas, sin duplicar la vista anterior.
- Los botones de cuatro y seis fotos de pasaporte y el selector de perfil regeneran la vista antes de permitir continuar. Se conservan la aprobación del cliente y WhatsApp.
- Se corrige la aprobación del cliente para que use la pila de ventanas y el foco del programa: abrirla solo quitando la clase hidden dejaba sus controles inactivos bajo la ventana anterior.
- La revisión comienza en el título, no en una posición de scroll de una apertura anterior. El botón Imprimir queda accesible mientras se revisa.
- Una imagen original sin resultado procesado ya no cuenta como lista para imprimir o exportar. Las caras faltantes exigen aceptación expresa. Se evita abrir dos trabajos de impresión simultáneos.
- Cambiar de trabajo limpia la hoja preparada y las imágenes de su vista previa.

## Validación y límites

`scripts/print-usability-regression.cjs` comprueba el acceso real con una cuenta sintética, selección rápida, conservación del trabajo, preparación reutilizada, ausencia de impresión duplicada, aplicación exacta del perfil, seis formatos de papel, imágenes visibles en la salida del navegador, ausencia de hojas vacías, controles de pasaporte y aprobación del cliente, consentimiento de cara faltante, invalidación de caché, limpieza y geometría en 320/390/768/1440 píxeles y modo oscuro. También se revisan navegación guiada, captura y funciones existentes con sus suites.

En esta sesión la prueba específica pasó sobre una vista local de la fuente 3.17 basada en 3.16, usando dependencias de edición ya instaladas. La preparación de una identificación sintética se midió alrededor de 117–130 ms; esto no mide el tiempo del controlador de impresión ni garantiza el mismo tiempo en otro equipo.

El build completo local requiere `@mediapipe/tasks-vision` 0.10.14, dependencia existente de 3.16.0. Falta en el entorno y no pudo descargarse: npm devolvió ENOTFOUND. No se ha sustituido por una librería distinta ni desactivado la función de IA para ocultarlo. Las pruebas hechas con la vista parcial se identifican como tales. La integración continua instala la dependencia oficial desde el lockfile, construye y ejecuta la verificación completa; su resultado debe revisarse antes de publicar.

La configuración local de Git es de solo lectura en esta sesión. Las escrituras remotas, si se completan, usan la conexión de GitHub con la base 3.16.0 y comprobación del estado de la rama, no un push de la antigua rama local. El despliegue Firebase no se declara completado: la consola no pudo actualizar su configuración y la revisión automática rechazó preparar una configuración temporal por requerir una aprobación de sandbox no admitida. No se cambiaron las reglas de Firebase ni se enviaron documentos de clientes.

No se han verificado físicamente impresoras o iPhone. Deben medirse la regla de 50 mm y una tarjeta con la impresora del negocio al 100 %, sin ajustar a página. La aceptación de una fotografía oficial requiere comprobar los requisitos del trámite.
