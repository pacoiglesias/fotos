# Auditoría RealScan Pro 3.35.0

Base: main 3.34.0, ecd0bad066c3863a8cff01e99ee248c4bcad4f07. Se conservó el trabajo anterior en codex/dni-pdf-intake-3301 (6658aa5) antes de integrar su corrección de importación PDF en la nueva base.

## Flujo operativo
- Capturar o subir, elegir solo frente / ambas juntas / una por hoja y modificar papel o juegos sin borrar las capturas.
- La reentrada al modo rápido conserva caras, papel, escala y juegos de un trabajo existente. Un trabajo nuevo mantiene los valores seguros del preset.
- Imprimir conserva la revisión previa. Descargar usa el PDF existente. Enviar y guardar en NAS abren la entrega unificada.
- Solo frente excluye el reverso del selector de entrega digital, aunque su captura se conserve para poder cambiar de modalidad.
- Móvil: acciones fijas al estar listo y espacio inferior reservado; cámara y archivo antes de las miniaturas para reducir desplazamientos.

## Conexiones
- Los indicadores son botones que abren calibración, acceso de Paperless o búsqueda del NAS.
- Un token guardado no acredita conexión: el servidor debe responder correctamente a la comprobación. No se simula disponibilidad ni calibración.
- La HP LaserJet CP 1025 tiene un acceso para rellenar su nombre en el asistente. La escala exige imprimir y medir referencias X/Y de 50 mm, guardar la corrección y verificarla físicamente.
- Desde este equipo, Paperless respondió HTTPS 401 y autorizó CORS para https://fotos.cobertores.com. El servidor es alcanzable; falta validar credenciales reales. No se han leído ni registrado tokens, ni enviado documentos.
- La sesión del NAS y el token pertenecen al navegador del operador. El código publicado no lleva credenciales ni perfiles falsamente verificados.

## PDF de identificación y privacidad
- El analizador examina operadores PDF y propone dos imágenes rectangulares de proporción ID-1 en una o dos páginas. Solo actúa tras revisar y confirmar; puede usarse solo el frente o conservarse la página completa.
- La renderización respeta el contenido pintado del PDF. Se liberan canvas temporales y se invalidan operaciones de otra sesión o trabajo.
- Cancelar conserva el trabajo abierto. Sustituir imágenes/anotaciones existentes requiere confirmación.
- No se incluyen documentos personales en fixtures, Git o evidencias públicas. La prueba privada opcional guarda resultados en .audit/private-dni, fuera de los directorios de artefactos CI.
- El detector de pares conserva el algoritmo nuevo de 3.32 y elimina el margen extra del 2% que reducía el contenido real dentro de la medida nominal.

## Verificación
- npm ci: 101 paquetes, ninguna vulnerabilidad reportada en esa instalación.
- Sintaxis y metadatos coordinados 3.35.0; HTML sin nuevos scripts en línea. CSP validada mediante check-build para ambos Firebase.
- Nuevas pruebas: counter335-regression (caras, conservación, reverso excluido, configuración HP, token rechazado, 320–1440 px) e id-pdf-intake-regression (detección, medidas reales PDF, sustitución y privacidad), en Chromium y WebKit.
- Se incorporan a verify las regresiones nuevas y las pruebas existentes de diagnóstico, calidad, extracción OCR y enderezado, anteriormente fuera de la lista.
- El fallo iphone-capture-regression de CI 3.34 no se reprodujo en Windows: la base pasó ambas variantes. Se reserva más espacio para la imagen en pantallas pequeñas y se adapta el margen del escenario. CI debe confirmar Linux sin debilitar la aserción.
- Verificación completa y publicación: pendientes hasta que finalicen sus ejecuciones. Este documento no acredita un deploy.

## Pendientes físicos
Medición en HP real, reinserción dúplex, cámara y permisos en iPhone, token de Paperless y archivado de prueba autorizado. Estos resultados no se deducen de pruebas sintéticas.

## Cierre de las 20 propuestas
| Criterio | Solución de esta entrega |
| --- | --- |
| 1. Caras visibles | Selector rápido de solo frente, ambas juntas o una por hoja; conserva imágenes. |
| 2. Papel y cantidad | Selectores directos y resumen que se recalcula. |
| 3. Destinos claros | Imprimir, descargar PDF, enviar/QR y guardar en NAS. |
| 4. Acciones móviles | Barra fija cuando el trabajo está listo, con espacio inferior reservado. |
| 5. Resumen | Caras, papel, escala, juegos y total de hojas; el modo completo conserva su resumen por servicio. |
| 6. Cambiar desde revisión | Caras, papel y juegos editables; nueva vista y preparación de impresión. |
| 7. Capturar primero | Se conserva la entrada existente Escanear primero y la elección posterior del servicio; no se declara reconocimiento universal. |
| 8. PDF de dos caras | Propuesta de recortes por regiones PDF, intercambio, cancelación y solo frente. |
| 9. Vista ampliada | Caras ampliadas y hoja completa secundaria en modo completo; miniaturas de modo rápido sin recortar la imagen por CSS. |
| 10. Edición próxima | Girar/cambiar junto a cada captura y visor de edición existente. |
| 11. Deshacer opciones | Historial de diez cambios en memoria, invalidado al cambiar de trabajo. |
| 12. Favoritos | Se conservan los formatos propios existentes en modo completo, con guardado sin fotos ni datos personales. No se duplica su almacenamiento. |
| 13. Cantidades | Se reutilizan los controles -/+ existentes de modo completo; selección directa de juegos en modo rápido y revisión. |
| 14. Impresora | Indicador accionable y acceso HP CP 1025 en el asistente; medición real pendiente. |
| 15. Paperless | Guía de acceso y enlace al NAS; estado conectado solo después de respuesta válida. Token real pendiente. |
| 16. Avisos resolubles | Falta de cara enlazada a capturar; conexión enlazada a ajustes; avisos de calidad existentes conservados. |
| 17. Operaciones | Se mantienen guardas de trabajo/sesión y estados ocupados; entregas y envíos no se duplican durante preparación. |
| 18. Siguiente cliente | Nuevo escaneo y cambio de cliente existentes, con limpieza de capturas/anotaciones y confirmación de trabajo pendiente. |
| 19. Diseño coherente | Se amplía el rediseño 3.33, sin reiniciar la interfaz: selectores segmentados, tipografía, superficies, contraste y acciones móviles. |
| 20. Pantalla de trabajo | Recepción y opciones esenciales directas; herramientas especiales conservadas en modo completo. |

No todos los puntos son funciones nuevas: la matriz distingue lo incorporado de lo que ya existía y se conserva. No se anuncia una versión sin fallos ni una impresora calibrada sin medirla.

## Comprobación de origen del NAS
La preconsulta OPTIONS autoriza https://fotos.cobertores.com. En ambas direcciones web.app responde 200 pero sin Access-Control-Allow-Origin: no pueden acceder desde el navegador hasta que el administrador del NAS amplíe sus orígenes autorizados. El formulario recomienda usar el dominio del negocio; no se redirige ni se cambia el servidor. Esta limitación no se resuelve desplegando Firebase.

## Correcciones del primer CI 3.35
El primer CI detectó cuatro fallos y se detuvo el publicador local antes de ejecutar Firebase. Se corrigió el espacio de la hoja preparada en escritorio, se evitó un segundo encabezado global en la vista ampliada y se compactaron textos auxiliares en teléfonos pequeños para conservar imagen y acciones. La prueba dúplex espera ahora la apertura real del módulo diferido, manteniendo su aserción de visibilidad y la comprobación del modo de impresión. La prueba de cámara conserva sus umbrales y añade evidencia de geometría por viewport.

## Casos reales adicionales y adaptación de documentos
- Se amplía la detección de tarjetas a imágenes ampliadas dentro de páginas grandes: una INE con una cara por página debe proponer ambas aunque cada imagen ocupe una hoja completa. No se usa el tamaño físico del escaneo como tamaño final de la credencial.
- La validación privada del nuevo PDF de dos páginas pasó en Chromium y WebKit. Se conservan las proporciones del escaneo y se comprueban los rectángulos de salida ID-1 del PDF generado. Si la proporción de origen difiere, el diálogo pide revisar bordes; no se estira la imagen ni se inventan partes ausentes.
- El servicio Documentos ofrece Carta, A4, Oficio México (215.9 × 340 mm) y Legal USA (215.9 × 355.6 mm) como acciones directas, sincronizadas con el selector existente. El encaje conserva todo el contenido y su proporción; el original sigue disponible.
- Las doce conversiones dirigidas entre los cuatro papeles se comprobaron en ambos navegadores con el PDF real generado y con conservación de la imagen.
- Identificaciones mantienen su formato físico y fotografías su tamaño elegido; cambiar el papel no las convierte en una imagen a página completa.
- Token del NAS comprobado contra su servidor: respuesta HTTP 200. Pendiente aplicarlo en el formulario de la versión nueva. No se incluye el token ni información de documentos en esta auditoría. Perfil HP guardado en el navegador, nominal 100 %, pendiente de medición física.

## Foco después de colocar paneles
La batería local completa terminó con un único fallo de foco en la navegación de documentos; el CI de la entrega funcional había pasado. Se restaura el foco después de la colocación de paneles con guardas de sesión, trabajo e intención, sin robarlo a un control elegido posteriormente. El recorrido espera el fin del procesamiento y comprueba el foco después de la transición con movimiento reducido. La publicación permaneció detenida al fallar verify.
