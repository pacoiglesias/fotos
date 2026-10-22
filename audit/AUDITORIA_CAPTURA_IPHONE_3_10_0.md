# Auditoría de captura, documentos y OCR — RealScan 3.10.0

Fecha: 22 de octubre de 2026. Base revisada: 8ee2612. Se conservan los cambios de autenticación y el indicador de memoria del usuario.

## Fallos encontrados y correcciones

- El visor estaba limitado al 48 % de la altura y la revisión tenía otro límite de ancho que alteraba sus proporciones. Ahora se calcula dentro del espacio realmente disponible, con pantalla completa móvil, zonas seguras y distribución horizontal.
- El nuevo indicador de memoria había sustituido la instrucción que mostraba Documento completo. Se restaura esa instrucción y se conserva el indicador. Se aclara que la calidad Ligera reduce la exportación, no la memoria del borrador.
- Cambiar de fotos a documento completo podía generar un QR en modo fotografía. El modo de recepción y revisión considera ahora el servicio de documentos activo.
- Borrar todas las páginas no actualizaba el borrador y permitía recuperarlas de nuevo. Se persiste también el documento vacío.
- Girar, reorganizar o ajustar páginas conservaba un enlace a un PDF anterior. Se retira la impresión preparada y la vista de entrega del documento al modificarlo. El QR previamente entregado sigue siendo una instantánea; el puesto permite finalizarlo explícitamente.

## Captura móvil

Visor y resultado completos sin estirar la imagen. Vídeo inline y silenciado para iPhone. Espera de fotograma válido antes de habilitar captura. Enfoque continuo solicitado solo cuando el dispositivo lo admite. Reintento y cámara nativa accesibles si falla la apertura. Captura nativa con tiempo máximo y alternativa mediante fotograma. Pausa al pasar a segundo plano, liberación de cámara y reanudación manual; se conserva la imagen ya capturada. Lupa al ajustar esquinas por toque o teclado.

Se mantienen el seguimiento de bordes, evaluación orientativa de luz/nitidez, captura automática opcional tras estabilidad, corrección de perspectiva, color/grises/contraste y confirmación final. No se aplica perspectiva a los retratos. Ningún detector garantiza bordes correctos ante cualquier fondo; el operador puede ajustar las esquinas, conservar la imagen completa o repetir.

## OCR y Paperless

El lector local limita la copia de trabajo a 2600 px conservando el original, aplica fondo blanco, controla tiempos de preparación y lectura, permite cancelar/reintentar y registra únicamente idioma, etapa y confianza. No se guardan documentos ni texto reconocido en el diagnóstico. Los paquetes `spa` y `eng` se incluyen en la compilación.

El mensaje comunicado por el usuario (`MissingDependencyError`, datos `eng`/`spa` ausentes) procede del OCRmyPDF ejecutado en Paperless. RealScan no ejecuta OCRmyPDF ni administra esa instalación. Exportar un PDF de imágenes válido no instala idiomas en Paperless. El OCR local ofrece texto revisable/TXT; el PDF de escaneo no contiene una capa de texto OCR.

Si Paperless usa Docker, revisar en su configuración efectiva:

```env
PAPERLESS_OCR_LANGUAGES=eng spa
PAPERLESS_OCR_LANGUAGE=spa+eng
```

El primer parámetro instala paquetes; el segundo selecciona los idiomas de lectura. Conservar otras opciones e idiomas existentes. Recrear el servicio según su despliegue y comprobar `tesseract --list-langs` dentro del contenedor que procesa los documentos. Deben aparecer ambos idiomas antes de reintentar el documento. En instalación sin Docker, instalar los paquetes en ese mismo entorno. No se han cambiado servidores Paperless desconocidos ni se ha confirmado su reparación.

Fuentes oficiales: https://docs.paperless-ngx.com/configuration/ y https://ocrmypdf.readthedocs.io/en/latest/languages.html

## Instalación como app

Iconos PNG dedicados 180/192/512, icono Apple y manifest con identidad estable. La ayuda incluye Safari > Compartir > Agregar a pantalla de inicio > Abrir como app cuando esté disponible. Las páginas temporales de recepción no se convierten en accesos instalables con tokens.

## Evidencia y límites

- `scripts/iphone-capture-regression.cjs`: geometría de captura/revisión, esquinas con lupa, confirmación, rotación de pantalla; Chromium y WebKit, 320×568, 390×844 y 844×390. Captura sintética en Chromium con liberación/reanudación y conservación de revisión.
- `scripts/document-regression.cjs`: recorrido real Nuevo servicio, seis páginas PDF revisadas, salida PDF, invalidación de impresión, borrado persistente y recuperación sin resucitar páginas.
- `scripts/practical-regression.cjs`: OCR real inglés/español con recursos locales, cancelación y fallos de preparación; además borradores, compresión, dúplex, transferencia local y recepción.
- Verificación completa reproducible: `npm run verify`. Evidencias locales en `.audit/`; no se publican documentos de clientes. CI incluye Chromium y WebKit.
- El build identifica su commit en `dist/version.json`; la publicación debe comprobar la misma huella en los cuatro alias Firebase.
- No se ha probado la cámara física del iPhone del usuario, impresión física ni su instalación de Paperless. WebKit automatizado no sustituye esa validación. No se garantiza ausencia absoluta de errores ni enfoque óptico controlable desde todos los navegadores.
