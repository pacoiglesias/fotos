# RealScan Pro 3.4

Edición y composición de documentos y fotografías para mostrador. Desarrollado por Paco Iglesias.

Sitio configurado: https://fotos-cobertores-pro.web.app

## Uso diario

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

Ejecuta npm run publish desde la raíz con los cambios confirmados en Git. Verifica, construye y publica ambos sitios; luego exige que las cuatro direcciones de Firebase respondan con el mismo commit y huella de contenido. Todos los accesos de despliegue .bat y .ps1 usan este flujo. Si falla uno de los sitios, el proceso devuelve error y debe repetirse para completar la actualización; no existe una transacción de publicación entre proyectos.

- Proyecto fotos-cobertores-pro, sitio fotos-cobertores-pro: https://fotos-cobertores-pro.web.app y https://fotos-cobertores-pro.firebaseapp.com.
- Proyecto cobertores-web, únicamente sitio fotos-cobertores: https://fotos-cobertores.web.app y https://fotos-cobertores.firebaseapp.com. Su configuración está en firebase.secondary.json; no se modifica el sitio principal cobertores-web.
- fotos.cobertores.com ya está asociado al segundo sitio. Queda pendiente que su propietario configure el DNS en Hostinger y Firebase valide su certificado; no se declara operativo antes de esa validación.

Los historiales y preferencias pertenecen al origen del navegador: cambiar de dominio no traslada automáticamente los trabajos. Exporta e importa el respaldo si necesitas moverlos. Las transferencias QR de ambos sitios utilizan el mismo backend Firebase y la URL del origen que crea la sesión.

## Configuración pública de Firebase

La clave de js/firebase-config.js identifica la aplicación web y debe ser pública para funcionar en el navegador. No es una clave administrativa ni una cuenta de servicio. Se restringió en Google Cloud a identitytoolkit.googleapis.com y securetoken.googleapis.com, las dos API que necesita este cliente. Los documentos están protegidos por autenticación, enlaces aleatorios temporales y reglas del servidor; ocultar la configuración no sustituye estos controles. Referencia: https://firebase.google.com/docs/projects/api-keys. No introduzcas credenciales administrativas ni tokens privados en el repositorio.
