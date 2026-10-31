# RealScan Pro · 3.35.0

Mostrador para recibir, preparar, revisar e imprimir fotografías y documentos. Desarrollado por Paco Iglesias.

[Guía técnica](audit/SISTEMA_REALSCAN.md) · [Avances](audit/AVANCES.md) · [Cambios](CHANGELOG.md)

Dirección habitual: [fotos.cobertores.com](https://fotos.cobertores.com). Usa siempre el mismo dominio y navegador para acceder a tus trabajos locales. Cada origen conserva su propio acceso, ajustes y borradores.

## Trabajo diario

1. Elige **INE / DNI**, **Fotografías** o **Documentos**.
2. Recibe mediante **Cámara**, **Archivo**, **Cargar desde NAS** o **Recibir QR**. El acceso **NAS** de la cabecera permanece disponible durante la preparación.
3. Revisa la hoja y ajusta tamaño, papel y cantidad. La acción principal indica si falta una cara, quedan páginas por revisar o puedes preparar la entrega.
4. Revisa e imprime, guarda PDF, entrega por QR o archiva una copia en Paperless. Para impresión física, selecciona papel correcto y escala 100 %; mide la regla de calibración en la impresora real.
5. Al cambiar de cliente, termina o guarda el trabajo. **Guardar trabajo y comenzar otro** conserva una copia local antes de preparar el siguiente.

Los originales se conservan durante la edición. Los cambios de servicio se pueden deshacer. Las anotaciones se aplican como una capa de salida; la firma no se guarda como recurso reutilizable en localStorage.

## Trabajos, comprobantes y cierre

**Trabajos** incluye vistas **Tablero** y **Lista**. El Kanban agrupa Pendiente, En preparación, Listo para entregar y Entregado. Permite abrir pedidos y cambiar estado con selector o arrastre. Mover tarjetas no confirma una impresión física. Marcar un pedido entregado solicita confirmación antes de retirar las imágenes de esa copia.

**Comprobante con folio** genera un ticket PDF e impresión independiente con fecha y resumen del pedido. Su QR contiene únicamente una referencia: no ofrece seguimiento remoto del estado. Emitir tickets no aumenta los totales de producción.

**Cierre del día** exporta CSV y JSON verificable con firma ECDSA del navegador. La firma detecta alteraciones; la identidad de su origen se contrasta con la huella de la clave. El cierre contiene totales agregados, sin rostros, firmas, imágenes ni nombres de clientes. Solo se suman impresiones confirmadas por el operador.

## Paperless / NAS

El servidor permitido se fija en la configuración del producto. Administración configura el token en este navegador. Las peticiones no siguen redirecciones y no envían cookies del navegador. La lectura y el archivado necesitan conexión con el NAS y una política CORS compatible.

- Buscar y abrir una copia no modifica el documento del NAS.
- Antes de archivar puedes revisar título, fecha, tipo y etiquetas existentes. Las sugerencias de OCR son locales y requieren confirmación.
- Los envíos y descargas están limitados a 30 MB.
- Un archivo recibido por Paperless sigue pendiente hasta confirmar su tarea. Un envío incierto no se repite a ciegas.

## Sin internet

Abre **Preparar sin conexión** mientras tengas red. El panel comprueba los recursos de la versión instalada para captura, exportación PDF, OCR y fondo con IA. La edición es local; Paperless y los envíos por red requieren conectividad. La app no puede recuperar detalle que ya se perdió en una foto reducida.

Los borradores con imágenes se guardan en IndexedDB. Si no está disponible, se informa del fallo para que descargues el trabajo; no se utiliza localStorage como respaldo de imágenes. Los presets guardan ajustes, no fotografías. Al actualizar se retiran cachés de aplicación obsoletas; se conservan cuentas, trabajos y ajustes.

## Desarrollo y validación

Requiere Node 24 con npm y Git.

```text
npm ci
npx playwright install chromium webkit
npm run check
npm run build
node scripts/check-build.cjs
npm run verify
```

Las pruebas usan archivos sintéticos y servicios simulados. En Windows, verify carga la adaptación de navegador incluida. La suite comprueba también medidas reales del PDF, contenido visible, conservación de originales, cancelación, recuperación, CSP y actualizaciones.

## Publicación

```text
npm run publish
```

El publicador exige un commit sin cambios rastreados pendientes, repite la verificación, valida el build y publica ambos destinos Firebase:

- `fotos-cobertores-pro` → `fotos-cobertores-pro.web.app`
- `cobertores-web` → sitio `fotos-cobertores.web.app`

Los accesos Windows existentes delegan en el mismo publicador. Si la sesión caducó, `Firebase-Acceso.bat` permite renovarla mediante Google sin pegar contraseñas en la consola.

`dist` se reconstruye desde cero mediante una lista de archivos permitidos. Los scripts y estilos usan identificadores derivados de sus bytes. `version.json` lo genera el build con aplicación, hash, commit y fecha; no se edita manualmente.

Un push o CI aprobado no demuestra despliegue. Comprueba `version.json` en ambos sitios y en el dominio personalizado, y registra el commit exacto. Las evidencias locales de prueba están en `.audit/`, fuera de la publicación y de Git.

## Validación física

La emulación no sustituye probar cámara/PWA en iPhone real, medir 50 mm en papel, verificar la reinserción dúplex y comprobar CORS, permisos y recepción real de Paperless. El navegador no conoce el resultado físico de una impresora; el operador lo confirma.

Las auditorías anteriores se conservan como historial en `audit/`; sus estados describen la fecha de cada documento.
