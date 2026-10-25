# RealScan Pro 3.25.1

[Registro de cambios](CHANGELOG.md) · [Auditoría 3.25](audit/MOVIL_3_25.md)

La 3.25.1 corrige el cierre de publicación usando la API oficial de Firebase, conserva los fallos reales y mantiene la verificación del build en ambos sitios.

La 3.25 mejora los recorridos de escaneo local y envío al mostrador desde el móvil: servicios visuales, frente y reverso, acciones al alcance del pulgar, nombre de PDF, compartir con descarga alternativa y continuación guiada de doble cara manual.

La 3.23 reunió tres etapas: preparación por servicio con cantidades y juegos claros; edición reversible y organización de páginas; y asistencia de calidad y preparación anticipada de impresión. Consulta `audit/MEJORAS_TRES_ETAPAS.md` para pruebas y límites de validación.

La 3.24 añade modo rápido, cola local de pedidos, edición por lotes, encabezados con vista previa, distribución de hoja e impresión directa de documentos. Consulta [los cambios y sus límites](audit/MEJORAS_MOSTRADOR_3_24.md).

Edición y composición de documentos y fotografías para mostrador. Desarrollado por Paco Iglesias.

La 3.20 incorpora el estudio visual: tarjetas de servicios, hoja en vivo, herramientas de edición junto a la vista previa, comparación original/resultado, formatos frecuentes guardados sin fotografías y revisión del cliente de todas las hojas. Los ajustes avanzados conservan las funciones existentes. Consulta [los cambios y la validación](audit/ESTUDIO_3_20_0.md).

Sitio configurado: https://fotos-cobertores-pro.web.app

## Uso diario

La versión 3.17 parte de la 3.16.0 y conserva su modo mostrador, seguridad, fondo con IA, sincronización, perfiles de impresora y entrega digital. Reúne los accesos a identificación, fotografías y documentos; mantiene una sola barra de pasos visible y muestra las imágenes listas o pendientes. Papel, tamaño, copias y caras se ajustan desde el panel principal.

La revisión de impresión prepara la hoja directamente con la geometría milimétrica y el perfil activo, sin generar un PDF ni cargar un visor oculto. La misma hoja se muestra antes de habilitar **Imprimir**. Cambiar el perfil o las 4/6 fotos de pasaporte actualiza la preparación. **Guardar PDF**, aprobación del cliente y WhatsApp siguen disponibles. La impresora debe utilizar el papel seleccionado y escala 100 %.

Prueba específica: `npm run test:print`. Alcance y límites de la validación: [auditoría 3.17](audit/INTERFAZ_E_IMPRESION_3_17_0.md).

1. Elige identificación, fotografía, páginas de documento o una medida personalizada.
2. Carga imágenes o PDF, usa cámara o portapapeles, o pulsa **Recibir Celular** para generar un QR temporal.
3. Revisa orientación, recorte y calidad. En un PDF multipágina, selecciona la página y su destino; se admiten hasta cuatro caras en una composición.
4. Selecciona papel, copias, marcas y escala. El modo de dos personas conserva cantidades independientes.
5. Comprueba la vista previa y exporta PDF/JPG, imprime o prepara una entrega digital.

El 100% conserva las medidas elegidas en el archivo. La impresora debe usar **tamaño real / escala 100%**, sin ajustar a página. Imprime y mide la regla de 5 cm y una tarjeta de prueba antes de prestar el servicio: el programa no puede verificar físicamente el papel, los márgenes ni el controlador de la impresora.

Las guías milimétricas y faciales son ayudas de edición; no se incrustan en las imágenes exportadas. Las marcas de corte se controlan por separado.

## Recepción y entrega por QR

Ahora usan Firebase Realtime Database y autenticación anónima; funcionan con navegadores independientes conectados a internet. No dependen de compartir Wi-Fi ni de `localStorage`.

- Mantén abierto y conectado el mostrador. El teléfono solo indica éxito cuando recibe confirmación del puesto.
- Enlaces con secreto aleatorio de 256 bits y duración de 15 minutos; la base no permite enumerar sesiones.
- Hasta 8 archivos de 6 MB por sesión. Las fotos recibidas desde teléfono se orientan, se convierten a JPG de hasta 3000 px y se eliminan sus metadatos de ubicación. Un PDF debe estar dentro del límite antes de enviarlo.
- El editor admite PDF de hasta 40 páginas para selección, con resolución de renderizado limitada para proteger la memoria; la composición final admite hasta cuatro caras.
- Los reintentos del mismo contenido no duplican la bandeja. Las sesiones caducadas y revocadas son rechazadas también por las reglas del servidor.
- Los archivos de transferencia se eliminan al revocar/renovar la sesión y al detectarse la desconexión del mostrador; el enlace deja de permitir acceso a clientes a los 15 minutos incluso si el temporizador del navegador se retrasa. No es almacenamiento permanente ni respaldo.
- Revocar un enlace impide nuevas descargas; no borra copias que el cliente ya guardó.

El historial y los borradores son locales al navegador. La transferencia QR utiliza almacenamiento temporal en Firebase. El PIN local evita operaciones accidentales en el puesto; no sustituye autenticación remota de empleados.

## Fotografías y perfiles

Se incluyen plantillas de medidas. Los perfiles con una fuente comprobada muestran su enlace; el resto se identifica como orientativo. Verifica el trámite concreto. Las ayudas faciales no certifican identidad, encuadre biométrico ni aceptación por una autoridad.

El perfil Visa USA limita la foto digital a JPG y a sus dimensiones/peso configurados; impide filtros y ajustes de apariencia. La hoja para impresión puede entregarse como PDF separado. Los formatos y resoluciones elegidos se aplican a los archivos generados.

## Compilar y comprobar

Requiere Node.js 24 y npm. Las versiones están fijadas en `package-lock.json`.

```sh
npm ci
npx playwright install chromium
npm run verify
```

`verify` comprueba sintaxis, crea `dist/`, prueba autenticación local, abre la aplicación compilada en Chromium y ejecuta las doce suites. Las pruebas de navegador generan evidencia nueva vinculada a la versión del build.

Para probar además la transferencia real, establece `REALSCAN_TEST_RELAY=1` antes de `npm run verify`. `npm run test:rules` comprueba las reglas desplegadas con cuentas anónimas desechables y registros sintéticos; requiere conexión y el proyecto configurado. Nunca usa documentos de clientes.

## Publicar

Las suites `test_entrega*`, `test_etapa*` y `test_maestro_integral.js` están agrupadas en `tests/`. Se ejecutan con `npm run test:legacy` o dentro de `npm run verify`; no se incluyen en la distribución que se publica.

Firebase CLI probado: 15.26.0. Proyecto: `fotos-cobertores-pro`.

```sh
firebase hosting:channel:deploy revision --expires 7d --project fotos-cobertores-pro
firebase deploy --only hosting --project fotos-cobertores-pro
```

Hosting publica exclusivamente `dist/`. Sus pasos previos verifican sintaxis y reconstruyen la distribución. No publiques directamente la raíz del repositorio. Cambios en reglas o proveedores se revisan y despliegan por separado con `firebase deploy --only auth,database`.

La edición y exportación local funcionan sin conexión después de instalarse completamente la caché de la aplicación. Recepción y entrega QR requieren internet. Las dependencias de edición, PDF, QR y estilos se distribuyen localmente.

## Validación

Consulta [VALIDACION_MEJORAS.md](VALIDACION_MEJORAS.md) y [audit/REPARACION_3_4.md](audit/REPARACION_3_4.md). La aprobación de pruebas de software no sustituye las pruebas físicas con teléfono, cámara e impresora del negocio.

## Cierre diario y recuperación

El panel «Cierre diario y prueba de impresión» permite descargar el historial, verificar todas las imágenes del archivo sin importar nada y generar una hoja de prueba independiente del trabajo actual. Elige A4, Carta, Oficio México o Legal USA; la referencia incluye regla de 50 mm, tarjeta de 85.60 × 53.98 mm y foto de 35 × 45 mm. La impresora debe configurarse al 100 % y las medidas comprobarse físicamente.

El respaldo JSON admite hasta 50 MB tanto al exportar como al importar. Se rechazan imágenes dañadas, direcciones blob no portables y páginas duplicadas. La importación es una única transacción: un error cancela todos los trabajos de esa importación y conserva los existentes. El verificador no escribe en el historial. Guarda primero el trabajo activo; los borradores, las preferencias, las credenciales y las sesiones QR no se incluyen. El navegador no puede confirmar que hayas conservado la descarga en otra unidad.

## Publicación coordinada

En Windows, abre **subir_a_firebase.bat** con doble clic. Comprueba tu acceso actual, resuelve y descarga la **3.24.0** desde `release/3.24.0`, instala dependencias y Chromium/WebKit, y ejecuta la verificación y publicación en ambos sitios. Conserva tu carpeta actual y los cambios locales; publica la versión de GitHub con el commit resuelto. La ventana permanece abierta y muestra dónde guardó el registro. Los otros BAT de despliegue usan este mismo lanzador. Consulta [el procedimiento de la 3.20](audit/ESTUDIO_3_20_0.md).

Para publicar desde un checkout propio limpio, ejecuta `npm run publish` con los cambios confirmados en Git. Si falla uno de los sitios, devuelve error y debe repetirse para completar la actualización; no existe una transacción de publicación entre proyectos.

- Proyecto fotos-cobertores-pro, sitio fotos-cobertores-pro: https://fotos-cobertores-pro.web.app y https://fotos-cobertores-pro.firebaseapp.com.
- Proyecto cobertores-web, únicamente sitio fotos-cobertores: https://fotos-cobertores.web.app y https://fotos-cobertores.firebaseapp.com. Su configuración está en firebase.secondary.json; no se modifica el sitio principal cobertores-web.
- fotos.cobertores.com ya está asociado al segundo sitio. Queda pendiente que su propietario configure el DNS en Hostinger y Firebase valide su certificado; no se declara operativo antes de esa validación.

Los historiales y preferencias pertenecen al origen del navegador: cambiar de dominio no traslada automáticamente los trabajos. Exporta e importa el respaldo si necesitas moverlos. Las transferencias QR de ambos sitios utilizan el mismo backend Firebase y la URL del origen que crea la sesión.

## Configuración pública de Firebase

La clave de js/firebase-config.js identifica la aplicación web y debe ser pública para funcionar en el navegador. No es una clave administrativa ni una cuenta de servicio. Se restringió en Google Cloud a identitytoolkit.googleapis.com y securetoken.googleapis.com, las dos API que necesita este cliente. Los documentos están protegidos por autenticación, enlaces aleatorios temporales y reglas del servidor; ocultar la configuración no sustituye estos controles. Referencia: https://firebase.google.com/docs/projects/api-keys. No introduzcas credenciales administrativas ni tokens privados en el repositorio.

## Operación profesional y recuperación 3.6.0

Se corrigen el límite de localStorage del borrador y el ajuste que podía forzar la proporción de una fotografía. Se amplían la cámara y galería con captura automática opcional, vista previa confirmada, giro, filtros y restauración. La bandeja QR permite revisar, editar, descargar originales y asignar páginas sin otro recorte automático.

La entrega incorpora límite de peso y enlace preparado para WhatsApp. Desde la zona de impresión se abren **OCR local** y **Asistente doble cara**. En recepción aparece **Sin internet: recibir por Wi-Fi local**, con emparejamiento WebRTC de dos QR. El modo local requiere páginas preparadas en ambos navegadores y una red sin aislamiento de clientes.

Prueba dedicada: `npm run test:practical`. [Registro completo de mejoras, correcciones, pruebas y límites](audit/MEJORAS_Y_CORRECCIONES_3_6_0.md).

## Captura asistida y revisión visual 3.5.0

En el teléfono, pulsa **Encuadrar y escanear documento**. Usa un fondo que contraste, deja visibles los cuatro bordes y toma la foto. Revisa la propuesta y mueve las esquinas antes de **Enderezar y usar**; también puedes repetir o conservar la foto completa. La captura se envía sólo al pulsar **Enviar archivos al mostrador**. La cámara del mostrador utiliza el mismo asistente; los perfiles de fotografías conservan la imagen completa.

Antes de imprimir aparece un resumen de miniaturas, medidas, papel y contenido. La entrega digital también muestra un resumen que refleja los formatos y archivos seleccionados. Sigue siendo necesario elegir el formato físico correcto y usar escala 100 % en la impresora.

Prueba dedicada: `npm run test:capture`. Alcance, resultados esperados y límites prácticos: [auditoría 3.5.0](audit/CAPTURA_ASISTIDA_3_5_0.md).

## Reparación de navegación 3.4.1

Se corrigió el bloqueo que aparecía al renovar el QR y cerrar recepción: una ventana repetida en la pila de foco dejaba el fondo inactivo. Las aperturas ahora son únicas, se restaura la interactividad al cerrar y el foco de ventanas superpuestas sigue el orden real. La conexión de recepción muestra progreso, admite cerrar mientras espera, evita solicitudes duplicadas y conserva la sesión y su bandeja al reabrir; Renovar QR crea otra sesión. Cuenta/admin abre ajustes e Instalar App ofrece ayuda cuando no hay una solicitud nativa disponible.

En Cuenta y ajustes → Auditoría → Diagnóstico de funcionamiento puedes descargar un JSON técnico. El diagnóstico conserva como máximo 200 eventos durante 14 días en ese navegador. Incluye códigos de error admitidos, archivo de programa y línea cuando están disponibles; nunca incorpora textos libres de excepciones, fotos, nombres de documentos, contraseñas ni enlaces QR. Si el almacenamiento no está disponible, funciona temporalmente en memoria. No se envía automáticamente a ningún servicio. La bitácora de actividad anterior sigue siendo independiente del diagnóstico técnico.

Para cerrar ventanas y recuperar controles sin recargar ni borrar el trabajo: Esc para la ventana activa; Alt + Mayús + R para todas las ventanas. También está disponible el botón Recuperar controles en Auditoría. Estos controles no ocultan ni eluden la pantalla de acceso.

La verificación incluye ahora npm run test:navigation: acceso por formulario, renovaciones, cierre, ventanas PDF superpuestas, conexiones lentas y fallidas, instalación aceptada/cancelada/fallida, diagnóstico y privacidad, límites de almacenamiento y recuperación respetando el acceso.

Para comprobar la entrega completa contra Firebase: npm run test:delivery. Genera QR desde los controles, los decodifica y descarga frente, reverso y hoja en un navegador independiente, probando JPG, PNG y PDF y revocación. Sólo usa archivos sintéticos. Se incluye al ejecutar verify con REALSCAN_TEST_RELAY=1. REALSCAN_SMOKE_URL permite repetirla sobre el sitio publicado.

## Guías y ajuste proporcional 3.6.1

Guías coherentes en pantalla, PDF e imagen; ajuste completo centrado sin estirar; distribución de fotos dentro de los márgenes y diagnóstico compartible con ajustes técnicos sin imágenes. Véanse [auditoría](audit/GUIAS_Y_AJUSTE_3_6_1.md) y [prompt de mantenimiento](audit/PROMPT_AUTOMEJORA_REALSCAN.md).

## Captura y flujo móvil 3.7.0

Vista previa bloqueada por defecto, ajuste táctil explícito, fotografías completas sin giro automático, modo Documento/Fotografía en recepción QR y cámara renovada con revisión de calidad y reintento de enfoque cuando el navegador lo admite. Diagnóstico descargable también desde el móvil. [Auditoría del flujo móvil](audit/FLUJO_MOVIL_Y_CAPTURA_3_7_0.md).

## Auditoría funcional 3.7.1

Guía del trabajo en tres pasos con acciones contextuales, avisos de escala y cara pendiente, navegación accesible y textos más claros. Recorte sin acciones duplicadas, ajuste repetible, protección de archivos y PDF pendientes, restauración móvil y encabezados coherentes entre vista previa y exportación. [Hallazgos y correcciones](audit/AUDITORIA_FUNCIONAL_3_7_1.md).

## Acceso sencillo a Firebase en Windows

Abre **Firebase-Acceso.bat** con doble clic. Elige **1** para comprobar la sesión en los dos proyectos de RealScan; si funciona, no necesitas volver a identificarte. La opción **2** renueva el acceso en el navegador y la **3** permite completar un código manual manteniendo abierta la misma ventana. Usa la cuenta que administra los proyectos. El asistente utiliza la herramienta oficial de Firebase, conserva la ventana para leer errores y no publica ni elimina archivos. No copies contraseñas al asistente ni reutilices códigos anteriores. Para comprobarlo sin menú: `Firebase-Acceso.bat -Action Check`.

`autenticar_y_desplegar.bat` prepara el acceso y después ejecuta el mismo publicador. Comprueba Git y la conexión al repositorio, configura Git Credential Manager y abre el acceso de GitHub en el navegador si no está guardada la cuenta `pacoiglesias`. Comprueba Firebase y, si hace falta renovar la sesión, permite elegir navegador o código manual desde la misma ventana. Conserva los archivos y el historial de tu carpeta. El push del código se realiza por separado; este BAT descarga y publica la versión auditada de GitHub.
