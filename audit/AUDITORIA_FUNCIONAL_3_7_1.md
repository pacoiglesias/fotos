# Auditoría funcional adicional — RealScan 3.7.1

Fecha: 15 de octubre de 2026. Base revisada: 3.7.0, commit `66f1769`. Objetivo: fiabilidad de las funciones existentes en trabajos cotidianos; no se añaden servicios externos ni se sustituyen originales.

## Hallazgos y correcciones

| Área | Problema encontrado | Cambio aplicado |
| --- | --- | --- |
| Recorte | El mismo botón abría el editor y alternaba el recorte automático. Además se ocultaba al cargar fotografías sin recorte automático. | Una única acción abre el editor; está disponible con una imagen cargada. Cancelar no cambia la imagen. |
| Recorte manual | Podía conservar zoom anterior y mostrar sólo parte de la región elegida; las dimensiones y el recuadro no estaban completos en el historial de deshacer. | La región aplicada queda centrada, a zoom 1 y con ajuste completo. Deshacer/rehacer conserva también dimensiones y recuadro. |
| Tacto | Los controles del recorte se volvían demasiado pequeños al reducir el lienzo y el gesto competía con el desplazamiento del navegador. | Zona de contacto adaptada al tamaño mostrado; el lienzo reserva el gesto para editar y limpia su estado al cancelar o perder el puntero. |
| Ajuste rápido | «Auto 1:1» aumentaba el zoom por pulsación y podía intentar recortar blancos de un retrato. El ajuste por lotes giraba y cambiaba filtros. | «Centrar y encajar» y «Encajar caras» son ajustes repetibles que conservan original, orientación, color e iluminación. No afirman calibrar físicamente la impresión. |
| Sustitución de archivos | El orden final podía depender de cuándo terminase FileReader, la descarga o la decodificación, en vez del último archivo elegido. | Solicitudes por ranura y revisión de trabajo: una lectura antigua no sustituye una selección posterior ni repuebla un trabajo nuevo. Exportar espera también a la lectura. |
| Imágenes muy grandes | El límite de peso del sistema principal no imponía el límite de píxeles utilizado en el remitente móvil. | Se rechazan dimensiones superiores a 60 megapíxeles antes de procesar la imagen en el lienzo; el trabajo existente se conserva. |
| Metadatos de imagen | Una carga nueva podía conservar recuadros, perspectiva o recortes de la anterior. | Se limpian los ajustes geométricos heredados y el historial de la imagen sustituida. Los perfiles sin retoque restablecen color y luz originales al cargar. |
| Editores pendientes | Confirmar un editor abierto antes de sustituir la imagen podía volver a escribir sobre la imagen nueva. | El recorte y la perspectiva comprueban que siguen editando la misma solicitud y trabajo. |
| PDF | La lectura o una selección pendiente podía terminar después de cancelar. Las acciones de frente/reverso no trataban todos los fallos. El límite de 40 páginas intentaba usar una liberación incorrecta. | Asignación protegida contra cierres, cambios de trabajo y doble selección; errores recuperables y liberación de la tarea PDF. Los PDF conservan su encuadre al cargarse. |
| Encabezados | Algunas combinaciones de título, rótulos y guías no coincidían entre pantalla y PDF. El título personalizado de una planilla fotográfica se ignoraba. | Política compartida: los rótulos habilitan el encabezado predeterminado; un título personalizado se conserva explícitamente; sin ambos no hay encabezado. Una hoja con título no se clasifica como totalmente limpia. |
| Guía de medición | La referencia geométrica de colisión de la regla difería de su posición dibujada. | La posición de validación se unifica con la regla dibujada a 35 mm del borde inferior. |
| Recepción móvil | Restaurar una fotografía podía adoptar el modo Documento elegido después para otra carga. Una asignación QR cancelada podía informar éxito. | Se conserva el modo del archivo restaurado y las asignaciones canceladas devuelven cancelación. Las nuevas capturas fotográficas se identifican como Foto. |

## Uso más sencillo y proactivo

Se incorpora una guía visible con tres pasos: elegir formato, cargar y ajustar, revisar y entregar. Indica la siguiente imagen necesaria según las piezas realmente colocadas en las hojas; lleva a su zona de carga y sitúa el foco allí. Al terminar permite revisar la hoja sin imprimir ni enviar automáticamente. Resume formato, papel, hojas, copias y escala, muestra los avisos de composición y explica cuándo el QR en la nube necesita internet. Durante la lectura de archivos evita iniciar un segundo paso desde el botón principal. No oculta los controles de edición existentes.

Los indicadores inferiores ya no anuncian tamaño real si la escala es distinta del 100 %, no certifican nitidez a partir de los píxeles de salida y no confunden una hoja con guías o título con una hoja limpia. El contador usa las caras incluidas por el diseño, también en modo de una cara y planillas de dos personas. El botón de relleno explica que puede recortar bordes; «Favoritos» sustituye «Presets» y las secciones usan los mismos conceptos que la navegación. El tipo de trabajo activo se sincroniza con el formato, también para lectores de pantalla.

La guía se comprueba a 360, 390, 768 y 1440 píxeles, con capturas en claro y oscuro, comprobando navegación, foco, cara pendiente, escala, lectura en curso y cambio de conexión. Las indicaciones no califican una fotografía como apta para un trámite ni garantizan enfoque o impresión física.

La inspección de la pantalla completa detectó superposición de los botones de cabecera sobre la marca en pantallas pequeñas. Se distribuyen en filas hasta 1279 píxeles, conservando los accesos y dejando margen al navegar hacia un panel. El modo Fotos oculta el consejo específico de identificaciones. Los avisos diferencian foto de persona A y B de frente y reverso; el texto de escala del plan se comparte también con los encabezados y el resumen del PDF.

## Pruebas de regresión

Se mantiene la suite existente: autenticación, carga, borradores y respaldos, geometría, guías, gestos móviles, enfoque y permisos, OCR local, dúplex asistido, WebRTC, entrega por Firebase y actualización desde caché.

Se incorpora `scripts/functional-audit-regression.cjs` para comprobar con navegador y archivos sintéticos las cancelaciones y confirmaciones del recorte, tacto en esquinas, ajuste repetible, lecturas lentas, sustitución durante un editor abierto, cancelación de asignación QR, 16 combinaciones de encabezado, PDF pendiente después de comenzar otro trabajo, cierre durante la selección de una página, límite de páginas y restauración de fotografías en el teléfono.

La nueva prueba se incluye en `npm run verify`. Evidencias locales: `.audit/functional-audit/results.json`; las evidencias de navegación, móvil, captura, geometría y entrega conservan sus carpetas respectivas. El manifiesto del respaldo identifica commit, versión, resultados publicados y hashes.

Resultado de la ejecución integral local: salida 0, 96 comprobaciones PASS y los 12 archivos históricos aprobados. Incluye 1,248 combinaciones geométricas, 14 comprobaciones funcionales nuevas y 16 combinaciones de título/rótulos/guías con comparación del encabezado real de la vista previa y el PDF. Las entregas JPG, PNG y PDF se descargaron en navegador independiente usando Firebase real; se comprobó revocación. El último ajuste visual de cabecera, ayuda contextual y nombres de fotografías se revisa además mediante las suites funcional y móvil y capturas completas. La comprobación posterior a la publicación y sus versiones quedan registradas en el manifiesto del respaldo, sin tokens ni fotografías de clientes.

## Criterio práctico de uso

Para fotografías, conserva el modo Fotografía y revisa el marco antes de elegir relleno con recorte. Para documentos, selecciona el formato conocido al enderezar y revisa las cuatro esquinas. Los ajustes rápidos no deben girar, recolorear ni recortar contenido de forma implícita. Antes de imprimir o entregar, confirma tamaño, caras, copias, guías y formato de archivo.

## Acceso operativo a Firebase — 16 de octubre de 2026

Se añade `Firebase-Acceso.bat` con menú local para comprobar la sesión, renovarla mediante navegador o utilizar un código manual en una sesión interactiva que permanece abierta. Se comprueba la sesión consultando los sitios de los dos proyectos; no se interpreta simplemente «ya hay una cuenta guardada» como prueba de acceso. Los fallos de conexión o permisos no fuerzan una renovación automática. El asistente reutiliza la herramienta oficial disponible en la caché de npm y la descarga cuando falta. No almacena códigos ni contraseñas en archivos del repositorio y no publica ni elimina contenido. El acceso a Google sigue requiriendo que el operador complete su identidad cuando Google lo solicite.

El BAT de autenticación y publicación existente utiliza esta comprobación previa; cuando falla ofrece el menú y vuelve a comprobar el acceso antes de publicar. La validación del nuevo asistente comprende análisis sintáctico de PowerShell y ejecución aprobada del BAT con `-Action Check` contra los dos proyectos, sin solicitar otro código ni modificar permisos.

## Comprobación física

No se puede certificar perfección de una foto mediante software: la óptica, luz, movimiento, papel, impresora y requisitos de cada institución necesitan comprobación en el equipo real. La cámara se valida con fuentes simuladas; el intercambio por Firebase sí se prueba con el servicio real. Una captura sin nitidez debe repetirse, y la escala impresa debe comprobarse con una regla física. La auditoría no promete ausencia de cualquier fallo futuro.
