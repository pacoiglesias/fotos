# Paperless · OCR local en el NAS

## Incidencia revisada

Se recibió un error `MissingDependencyError` con los idiomas `spa ` y ` eng`. El operador mostró que el campo Idioma estaba guardado como `spa + eng`, con espacios y con la indicación «Overrides external». Ese valor no coincide con los códigos de idioma instalados. Se indicó cambiarlo a `spa+eng`; el operador confirmó haber guardado el cambio. Pendiente de validar el resultado de una tarea nueva.

La revisión se realizó a partir del error y de los valores facilitados por el operador. El control del navegador de esta sesión no pudo iniciarse. No se accedió al contenedor ni se instalaron paquetes en el NAS.

## Perfil conservador para este flujo

Abrir Configuración de la Aplicación (`/config`) → Ajustes de OCR. Esta configuración es general para la instancia; los valores guardados aquí prevalecen sobre los externos.

| Campo | Configuración |
| --- | --- |
| Tipo de salida | `pdfa` |
| Idioma | `spa+eng`, sin espacios |
| Páginas | Vacío: todas |
| Modo | `auto` |
| Archive File Generation | `auto` |
| Imagen DPI | Sin forzar; vacío para detección automática. El valor `1` observado no es una referencia adecuada para escaneos |
| Limpiar | `clean` |
| Corregir sesgo | Activado |
| Rotar páginas | Activado |
| Umbral de rotación | Predeterminado |
| Máximo de píxeles | Predeterminado; conservar el límite de protección |
| Estrategia de color | Predeterminada |
| Parámetros OCR adicionales | Vacío, salvo una necesidad probada |
| OCR remoto | Motor sin seleccionar si se desea procesamiento íntegramente local y no se utiliza Azure |

Si un valor indica que se configura externamente, se debe revisar también la configuración de despliegue. No introducir claves de servicios externos para reparar el OCR local. No compartir claves, contraseñas ni el entorno completo en un chat o registro.

## Validar el cambio

Guardar, realizar una sola subida nueva de prueba sin datos personales y consultar su tarea. El error de una tarea anterior no se modifica al cambiar la configuración. Una imagen o un PDF escaneado sin texto seleccionable permite comprobar el OCR, no solo la extracción de texto existente. Confirmar que el documento aparece en Documentos y que el texto reconocido es utilizable.

Antes de volver a subir un archivo anterior, comprobar que no haya quedado archivado para evitar envíos repetidos. No ocultar ni borrar la tarea fallida como sustituto de comprobar el documento.

## Solo si una tarea nueva sigue indicando idiomas ausentes

En la terminal del contenedor que procesa documentos, comprobar:

```text
tesseract --list-langs
```

Deben aparecer `spa` y `eng`. La imagen oficial normalmente ya los incluye. Si aparecen, revisar el idioma efectivo, posibles argumentos OCR adicionales y la ruta de datos de Tesseract antes de reinstalar nada.

Si realmente faltan y se usa la imagen oficial en un contenedor que permite instalar paquetes al arrancar, el despliegue puede declarar:

```yaml
environment:
  PAPERLESS_OCR_LANGUAGE: "spa+eng"
  PAPERLESS_OCR_LANGUAGES: "spa eng"
```

La primera variable selecciona idiomas con `+`; la segunda solicita paquetes separados por espacios. La segunda no debe usarse en contenedores rootless. Identificar primero el servicio y método de despliegue; aplicar los cambios conservando los volúmenes de datos. Una instalación manual dentro de un contenedor puede perderse al recrearlo y no sustituye una configuración persistente.

## Fuentes oficiales

- [Configuración OCR y opciones Docker](https://docs.paperless-ngx.com/configuration/).
- [Ruta de Configuración de la Aplicación](https://github.com/paperless-ngx/paperless-ngx/blob/main/src-ui/src/app/app-routing.module.ts).
- [Campos de configuración de Paperless](https://github.com/paperless-ngx/paperless-ngx/blob/main/src-ui/src/app/data/paperless-config.ts).
- [Datos de idiomas de OCRmyPDF](https://ocrmypdf.readthedocs.io/en/latest/languages.html).
