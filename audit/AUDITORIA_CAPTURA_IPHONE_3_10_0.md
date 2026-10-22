# Auditoría de captura, documentos y OCR — RealScan 3.10.0

Fecha: 22 de octubre de 2026. Base revisada: 8ee2612. Se conservan los cambios de autenticación y el indicador de memoria del usuario.

## Resumen para seguimiento

| Antes / necesidad | Mejora de esta entrega | Comprobación |
|---|---|---|
| Cámara a media pantalla o imagen deformada | Visor completo, proporción uniforme, límites de altura y zonas seguras | Captura/revisión en vertical, horizontal y pantalla pequeña; Chromium y WebKit |
| Ajustar esquinas con el dedo era difícil | Lupa y espacio para mantener accesibles los controles | Arrastre/teclado y comprobación visual |
| Pérdida innecesaria de detalle al enderezar | Hasta 3508 px en documento enderezado, captura hasta 4096 px | Imagen sintética de alta resolución |
| Documento completo se activaba pero no aparecía | Restaurada la visibilidad del panel | Nuevo servicio y PDF de seis páginas |
| Páginas borradas reaparecían | Se guarda también el borrador vacío | Recargar y comprobar que no regresan |
| Se ofrecía un PDF preparado antes de editar | Se invalida la impresión y vista de entrega anterior | Girar una página y verificar retirada del enlace |
| QR de documento abría modo foto | Se considera el servicio de documento activo | Cambiar de Fotos a Documento completo y leer el modo del QR |
| Faltaba escanear y guardar directamente en el teléfono | Escáner móvil con borrador local y PDF sin mostrador | Captura/galería, restauración, borrado y descarga |
| DNI necesitaba medidas reales | PDF de 85,6 × 53,98 mm por cara; A4/Carta y fotos con medidas propias | Lectura de medidas del archivo exportado |
| Faltaba buscar/seleccionar texto dentro del PDF | OCR opcional con capa invisible y fuente incluida | Extraer palabras/acentos y comparar píxeles visibles |
| Dependencia de internet para preparar OCR | Descarga explícita de lector e idiomas de esta versión | Desconectar, recargar y usar OCR en frío |
| Faltaba diagnóstico del escáner local | Registro descargable y borrable sin fotos ni texto reconocido | Verificación de privacidad y conservación de capturas |
| Diferencia de pantalla pequeña en WebKit/Linux durante CI | Altura acotada a 100dvh y verificación relativa al viewport visible | Prueba automatizada en GitHub y prueba local |

La lista distingue cambios implementados de validación física. La validación de cada commit está en GitHub Actions; la auditoría completa local y las evidencias están en `.audit/`. El acta final de publicación y respaldo se guarda en `backups/ESTADO_ULTIMA_PUBLICACION.md`, junto con el manifiesto de la versión. No se considera publicada una versión sólo por estar confirmada en Git.

## Fallos encontrados y correcciones

- El visor estaba limitado al 48 % de la altura y la revisión tenía otro límite de ancho que alteraba sus proporciones. Ahora se calcula dentro del espacio realmente disponible, con pantalla completa móvil, zonas seguras y distribución horizontal.
- El nuevo indicador de memoria había sustituido la instrucción que mostraba Documento completo. Se restaura esa instrucción y se conserva el indicador. Se aclara que la calidad Ligera reduce la exportación, no la memoria del borrador.
- Cambiar de fotos a documento completo podía generar un QR en modo fotografía. El modo de recepción y revisión considera ahora el servicio de documentos activo.
- Borrar todas las páginas no actualizaba el borrador y permitía recuperarlas de nuevo. Se persiste también el documento vacío.
- Girar, reorganizar o ajustar páginas conservaba un enlace a un PDF anterior. Se retira la impresión preparada y la vista de entrega del documento al modificarlo. El QR previamente entregado sigue siendo una instantánea; el puesto permite finalizarlo explícitamente.

## Captura móvil

Visor y resultado completos sin estirar la imagen. Vídeo inline y silenciado para iPhone. Espera de fotograma válido antes de habilitar captura. Enfoque continuo solicitado solo cuando el dispositivo lo admite. Reintento y cámara nativa accesibles si falla la apertura. Captura nativa con tiempo máximo y alternativa mediante fotograma. Pausa al pasar a segundo plano, liberación de cámara y reanudación manual; se conserva la imagen ya capturada. Lupa al ajustar esquinas por toque o teclado. La captura conserva hasta 4096 px de lado largo y el documento enderezado hasta 3508 px: se elimina el límite anterior de 2400 px para no limitar innecesariamente una hoja A4. La resolución real sigue dependiendo del dispositivo; la cámara nativa permite aprovechar más detalle cuando el visor web no lo entrega.

Se mantienen el seguimiento de bordes, evaluación orientativa de luz/nitidez, captura automática opcional tras estabilidad, corrección de perspectiva, color/grises/contraste y confirmación final. No se aplica perspectiva a los retratos. Ningún detector garantiza bordes correctos ante cualquier fondo; el operador puede ajustar las esquinas, conservar la imagen completa o repetir.

## OCR y Paperless

El lector local limita la copia de trabajo a 2600 px conservando el original, aplica fondo blanco, controla tiempos de preparación y lectura, permite cancelar/reintentar y registra únicamente idioma, etapa y confianza. No se guardan documentos ni texto reconocido en el diagnóstico. Los paquetes `spa` y `eng` se incluyen en la compilación.

El mensaje comunicado por el usuario (`MissingDependencyError`, datos `eng`/`spa` ausentes) procede del OCRmyPDF ejecutado en Paperless. RealScan no ejecuta OCRmyPDF ni administra esa instalación. Exportar un PDF de imágenes válido no instala idiomas en Paperless. El lector local ofrece texto revisable/TXT. La nueva opción «Añadir texto buscable» incorpora una capa invisible de texto al PDF sin alterar su imagen; permanece desactivada hasta que el usuario la elige. No repara los idiomas de Paperless ni garantiza su ingestión sin comprobar ese servidor.

Si Paperless usa Docker, revisar en su configuración efectiva:

```env
PAPERLESS_OCR_LANGUAGES=eng spa
PAPERLESS_OCR_LANGUAGE=spa+eng
```

El primer parámetro instala paquetes; el segundo selecciona los idiomas de lectura. Conservar otras opciones e idiomas existentes. Recrear el servicio según su despliegue y comprobar `tesseract --list-langs` dentro del contenedor que procesa los documentos. Deben aparecer ambos idiomas antes de reintentar el documento. En instalación sin Docker, instalar los paquetes en ese mismo entorno. No se han cambiado servidores Paperless desconocidos ni se ha confirmado su reparación.

Fuentes oficiales: https://docs.paperless-ngx.com/configuration/ y https://ocrmypdf.readthedocs.io/en/latest/languages.html

## Instalación como app

Iconos PNG dedicados 180/192/512, icono Apple y manifest con identidad estable. La ayuda incluye Safari > Compartir > Agregar a pantalla de inicio > Abrir como app cuando esté disponible. Las páginas temporales de recepción no se convierten en accesos instalables con tokens.

## Escáner móvil y PDF buscable añadidos a petición del usuario

- Nueva pantalla `mobile-scan.html`, accesible desde el inicio móvil, Más opciones y la ayuda de instalación. Captura o galería, revisión, restauración, orden y borrado. DNI admite frente y reverso; los demás formatos hasta ocho capturas. Límite de borrador de 40 MB y archivo de entrada de 30 MB. Copias de imagen grandes se limitan a 3508 px manteniendo proporción.
- Exportación directa sin mostrador: DNI/INE/licencia con páginas de 85,6 × 53,98 mm, A4 de 210 × 297 mm, Carta de 215,9 × 279,4 mm, fotos de 100 × 150 mm y carnet de 35 × 45 mm. Las imágenes se encajan mediante escala uniforme; un DNI debe rodearse correctamente con las cuatro esquinas para que el documento ocupe su medida nominal. La aplicación no deduce milímetros desconocidos a partir de una fotografía.
- El borrador móvil utiliza IndexedDB propio y se conserva al recargar. Nuevo y Quitar actualizan ese borrador; no hay envío a servidores desde esta pantalla. Diagnóstico descargable y borrable sin fotos ni texto OCR.
- Preparar app y OCR sin conexión descarga explícitamente motor e idiomas español/inglés al caché de esa compilación. Prueba con conexión antes de salir; instalar no garantiza que el sistema operativo nunca elimine almacenamiento. El PDF debe conservarse también en Archivos. Tras actualizar la app hay que preparar de nuevo el lector si se va a usar sin conexión.
- `js/searchable-pdf.js`: un lector reutilizado secuencialmente por trabajo, límite de resolución OCR de 2600 px, español/inglés o ambos, fuente Liberation Sans incluida con su licencia existente en la distribución de PDF.js. Texto invisible situado mediante cajas de palabras. La imagen original del PDF mantiene sus píxeles visibles; el texto automático puede contener errores. Las páginas sin texto requieren confirmación antes de continuar. Cancelación termina también lectores que responden tarde.
- La opción de PDF buscable está disponible en Documento completo y en el escáner móvil. No se cambia silenciosamente la exportación predeterminada.
- No hace falta Wi-Fi para capturar y guardar localmente después de preparar la app con conexión. Firebase requiere internet; transferencia directa entre dispositivos necesita una red local y preparación/emparejamiento por ambos lados.

## Evidencia y límites

- `scripts/iphone-capture-regression.cjs`: geometría de captura/revisión, esquinas con lupa, confirmación, rotación de pantalla; Chromium y WebKit, 320×568, 390×844 y 844×390. Captura sintética en Chromium con liberación/reanudación y conservación de revisión.
- `scripts/document-regression.cjs`: recorrido real Nuevo servicio, seis páginas PDF revisadas, salida PDF, invalidación de impresión, borrado persistente y recuperación sin resucitar páginas.
- `scripts/practical-regression.cjs`: OCR real inglés/español con recursos locales, cancelación y fallos de preparación; además borradores, compresión, dúplex, transferencia local y recepción.
- `scripts/mobile-local-regression.cjs`: DNI de dos caras, medidas del PDF comprobadas leyendo el archivo, apertura en frío sin red, recuperación local, OCR real con español y texto acentuado, comparación exacta de los píxeles visibles con/sin OCR, cancelación y borrado. Comprobado en Chromium y WebKit; no equivale a cámara física de iPhone.
- Verificación completa reproducible: `npm run verify`. Evidencias locales en `.audit/`; no se publican documentos de clientes. CI incluye Chromium y WebKit.
- El build identifica su commit en `dist/version.json`; la publicación debe comprobar la misma huella en los cuatro alias Firebase.
- No se ha probado la cámara física del iPhone del usuario, impresión física ni su instalación de Paperless. WebKit automatizado no sustituye esa validación. No se garantiza ausencia absoluta de errores ni enfoque óptico controlable desde todos los navegadores.
