## 3.35.0 — Identificaciones prácticas, conexiones claras y entrega directa

- Modo rápido con Solo frente o Frente y reverso sin perder capturas; imprimir, PDF, enviar y guardar en NAS a la vista.
- Accesos de impresora y Paperless accionables; un token guardado no se anuncia como conexión comprobada. Configuración guiada para HP LaserJet CP 1025, con medición física pendiente hasta confirmarla.
- PDF con dos imágenes de identificación: revisión de caras antes de ajustar a ID-1; opción de solo frente y conservación de página completa como alternativa.
- Presentación renovada y recortes de tarjeta sin margen blanco añadido; vista móvil pequeña con espacio reservado para la imagen.
- Regresiones de diagnóstico, calidad, OCR y enderezado incluidas en verify. La publicación se acredita con sus endpoints y no con este registro.

## 3.34.0 — Log de diagnóstico en todo el flujo: cámara, impresión, Paperless, lotes y recuperación

El registro técnico que ya existía en Ajustes → Auditoría ahora cubre todo el flujo de trabajo y se abre desde el mostrador, con el mismo patrón de Alacena 3.9.5 (últimos 200 eventos en este navegador, sin fotos, sin datos de clientes y sin credenciales).
- Nuevos eventos: apertura de cámara con permiso y primera imagen (con su tiempo), inicio/éxito/fallo de impresión, inicio/éxito/fallo de envío a Paperless, inicio/fin/fallo de lotes, recuperación de trabajos por código o por QR (con sus fallos) y preparación de hoja. También quedan vivos eventos que ya se registraban pero se descartaban por no estar en la lista permitida (hoja preparada, vista previa fallida, vista previa de anotaciones, trabajo sin conexión bloqueado).
- Visor: en Ajustes → Auditoría, nuevos botones «Copiar diagnóstico» (texto plano para pegar en el chat) y «Actualizar» (relee el registro guardado), junto a los ya existentes Descargar, Compartir, Borrar y Recuperar controles.
- Acceso desde el mostrador: nueva entrada «Diagnóstico» en el menú «Más», que abre Ajustes directamente en la pestaña Auditoría. No se toca counter-desk.js: la entrada se añade en tiempo de ejecución.
- Privacidad: el registro solo admite claves técnicas en lista blanca; la URL y el token de Paperless, los nombres de clientes, teléfonos, notas, títulos, fotos, contenidos y códigos decodificados no pueden quedar guardados aunque algún llamador los pase por error. Sin cambios en impresión, PDF, medidas ni flujos de entrega.

## 3.33.0 — Rediseño del mostrador: más grande, más claro, menos scroll

Rediseño completo del mostrador y sus diálogos: la app hace lo mismo, pero se ve y se alcanza mejor. Sin cambios de lógica de negocio, sin precios y sin multicliente.
- Visuales: suelo tipográfico de 12 px para todo texto funcional y 13 px para etiquetas de acción (10 px solo en las marcas de versión); barra superior de dos niveles en teléfono (fila 1: Nuevo + Entregar; fila 2: NAS, Recibir QR y Más), cada píldora de 44 px o más; enlaces legibles en modo oscuro (azul claro sobre fondo oscuro, contraste verificado); diálogo "Conectar Paperless" con la misma jerarquía que los diálogos nuevos (kicker, titular grande, guía "El token se genera en Paperless, en tu perfil", botón primario único Guardar y "Comprobar acceso" como secundario); miniaturas grandes en el mostrador, del mismo tamaño y tratamiento que las tarjetas del modo rápido, con estado visible (✓ Lista / Por agregar); pantalla para el cliente con solo la hoja preparada en grande, "listo para recoger" y Cerrar; botones del diálogo de par INE apilados a ancho completo, una opción por fila; sin textos truncados (buscador "Buscar por nombre o fecha" y anchos revisados); crédito "Desarrollado por Paco Iglesias" una sola vez, en el pie de página; lenguaje del modo rápido extendido a mostrador y diálogos (titulares grandes, pasos numerados, radios y sombras unificados, mismos índigo y verde).
- Gráficas: ilustraciones simples en línea (sin imágenes externas, funciona sin conexión) para los vacíos principales (historial, cola, lista de trabajos y tablero); un solo sistema de iconos de línea en las acciones principales (modo rápido, revisión, pegar, guía y enlace), con emoji solo en estados informativos, avisos y vacíos; semáforo gráfico real con 3 puntos de color grandes y etiqueta corta, siempre visible en el mostrador, sin recogerse nunca; vista previa de la hoja en revisión a ancho completo del diálogo, con zoom a toque sobre cada cara; identidad del modo rápido aplicada al mostrador y diálogos principales.
- Operativas: barra de acción fija al pie de cada vista y cada diálogo (la acción primaria siempre visible, sin scroll) y avisos anclados encima de la acción, nunca debajo del contenido (corrige Imprimir del modo rápido bajo el pliegue, botones de entrega bajo el formulario, acciones de nuevo servicio bajo el texto y el aviso de foto borrosa invisible antes del botón verde Imprimir; la cola fija sus acciones arriba dentro del diálogo); mostrador por secciones (el trabajo actual primero y siempre visible; opciones avanzadas —acabado e impresión y exportaciones antiguas— colapsadas por defecto, con su estado resumido en una línea; los formatos directos —tamaños, caras, cantidades y papel— y los sellos quedan visibles a un toque, porque son la decisión central del trabajo y así lo exigen los flujos verificados); herramientas de uso real (girar, recortar, enderezar, ver en hoja) fuera de los acordeones, como botones directos, y el resto dentro; lenguaje llano en el núcleo ("Cambiar fotos" / "Editar frente y reverso" en vez de "Volver a Cargar / Editar Ranuras"); acciones de la cola como botones reales con jerarquía (primario Abrir por código, secundarios el resto); una sola entrada visible por acción (se elimina la entrada "Nuevo servicio" de la tira del mostrador, oculta por CSS; queda la píldora "Nuevo" de la barra); en horizontal, cabecera reducida y dock compacto en una fila; aviso "Sin perfil activo" subido al semáforo y al dock cuando no hay perfil activo; con colocación ya verificada, acción del trabajo dúplex fija al pie del diálogo y guía como ayuda colapsable (el dúplex de todos los días es de 1 toque); nota del historial en llano ("Respaldo en NAS: sin conectar. Conéctalo en Ajustes"); en el paso 3 del escritorio refinado, el panel de inicio se pliega y la columna del escenario se compacta (encabezado oculto y bandeja en una fila) para que la hoja quede visible sin desplazar (de 823 a 693 px, el test exige menos de 700).

## 3.32.0 — Entrega única, mostrador completo y escaneo más inteligente

- Diálogo ÚNICO de entrega: el botón "Entregar" de la cabecera y todos los flujos abren el mismo diálogo (hoja PDF, fotografía individual y, en trabajos INE/DNI, Frente y Reverso como JPG por separado), con descarga, QR, WhatsApp y Paperless en el mismo sitio. Se retira el modal legacy de entrega digital y su código asociado; la descarga de entrega digital por archivos sigue igual, incluido su límite de peso (JPG/PDF) que ahora vive dentro del exportador; el PNG nunca se convierte en silencio si supera el tope.
- Paperless en un toque: botón "Confirmar y archivar" que archiva directo cuando el título ya es propio y el tipo inferido existe en el catálogo del NAS; si no, abre la revisión de metadatos habitual. Si el operador va a Ajustes a guardar el token, el envío pendiente se reanuda solo al volver, sin repetir pasos.
- Título sugerido desde la INE: al abrir la entrega de un trabajo INE/DNI, la lectura local sugiere el nombre del archivo (CURP o nombre) solo si el campo sigue con el valor por defecto; nunca sobrescribe un título escrito por el operador.
- Par INE manual: botón "Esta foto trae dos caras → dividir" cuando una foto trae ambas caras (lado a lado o una sobre otra), con Intercambiar y Deshacer y consejo visible de fondo oscuro. La detección automática mejora con tarjeta blanca sobre fondo claro (segundo intento por bordes) y nunca inventa contenido ni recorta caras.
- Sellos junto a la hoja: COPIA y "Añadir firma" visibles sin desplegar dentro de la cabecera de la hoja, sin fila propia para no empujar la hoja hacia abajo; texto guía de cámara legible (fondo oscuro, blanco en negrita); dock móvil a una fila con el padding alineado a su altura real; arranque robusto (reintento con guardas nulas); bloqueo por inactividad por defecto 30 minutos; kanban, historial y cola en móvil con acción primaria y resto en menú "···"; phone-upload con "Optimizar (recomendado: más rápido)" / "Conservar original (sin cambios)"; historial vacío que explica para qué sirve; estado de impresora siempre visible junto a Imprimir (perfil verificado con la regla de 50 mm o aviso de medirla).
- Mostrador: semáforo al abrir (impresora lista, Paperless conectado, NAS disponible, con botón Actualizar); al cargar un trabajo se recoge igual que el encabezado del mostrador, para no empujar la hoja hacia abajo en la revisión; recuperar trabajo con código corto o escaneando su QR; aviso "listo para recoger" por WhatsApp desde el historial cuando hay teléfono; clientes frecuentes para elegir sin escribir; modo de letra gigante y alto contraste ya existente, verificado.
- Respaldo y lotes: opción de respaldar automáticamente cada impresión confirmada en Paperless (Ajustes de Paperless); búsqueda del historial por fecha además de cliente/título/nota; impresión en lote (trabajos listos seguidos, con "Siguiente trabajo del lote" y "Cancelar lote" en el resultado de impresión); impresora calibrada recordada (no vuelve a pedir la regla si ya está verificada); aviso de versión nueva prominente arriba con actualización en un toque; pantalla para el cliente (solo su trabajo, sin ajustes ni otros trabajos).
- Escaneo más inteligente: consejos de foto borrosa o lavada y de inclinación mayor de 2° en el panel de servicio; avisos antes de imprimir (calidad de cada cara y verificación de que frente y reverso son del mismo documento, solo cuando hay CURP en ambas y difieren); borde de la tarjeta detectada en la vista ampliada; tamaños de foto de un toque (infantil, pasaporte, Visa USA 50.8 × 50.8 mm); dúplex guiado desde la revisión (con colocación verificada descarga frente, guía la reinserción y descarga el reverso; sin ella abre el asistente, nunca adivina); vista previa exacta con papel y escala reales, ya existente y verificada.
- Rendimiento: carga perezosa de los módulos no críticos (dúplex, calibración y enderezado ya no entran en la carga inicial); scripts iniciales reducidos de 1,098,377 a 1,081,935 bytes en la base de esta entrega. Sin animaciones nuevas en el mostrador.
- No viable sin invasión y por tanto no incluido: un preset de "nitidez para texto pequeño" dentro de "Mejorar imagen" exigiría cambiar el algoritmo del worker de mejora (hoy solo admite intensidad y modo documento/foto); la herramienta actual ya cubre legibilidad de textos pequeños con su modo documento y el control de intensidad.

## 3.31.0 — Modo rápido INE / DNI: escanear, imprimir o guardar en 4 toques

- El botón "Modo rápido" del mostrador ya es un flujo rápido de verdad: pantalla "INE / DNI — tamaño real" con dos huecos grandes (Frente y Reverso), un solo botón gigante para escanear y avance automático al reverso tras confirmar el frente.
- Hoja a tamaño real en grande como protagonista, con sello "Tamaño real · 85.60 × 53.98 mm · 100%", y solo dos botones gigantes: Imprimir (revisión y diálogo del sistema, con confirmación "¿Salió bien?") y Guardar PDF (descarga directa, sin diálogo de opciones).
- Tras confirmar la impresión: botón gigante "Nuevo escaneo" (limpia y vuelve al paso 1, listo para el siguiente cliente) y "Ver historial" en pequeño; "Más opciones" abre el modo completo con el trabajo intacto, sin perder capturas.
- Defaults fijos del modo rápido: servicio INE/DNI, formato tarjeta, ambas caras juntas en una página, papel Carta en trabajos nuevos, 1 juego, escala 100%, hoja limpia sin título, rótulos ni regla (las marcas de corte se conservan como guía para recortar la tarjeta). Los trabajos INE ya en curso conservan su papel al adoptarlos. Reutiliza el preset "INE · frente y reverso en Carta", la cámara con guías, el detector par INE, el motor de medidas, la impresión y el PDF existentes; sin motores nuevos.
- Identidad visual propia del modo rápido, limpia y sin adornos: indicador de pasos 1 Frente · 2 Reverso · 3 Entregar, aviso de estado en banda de alto contraste (verde al estar listo), sello de tamaño real, huecos con marca ✓ al completarse y botones gigantes de 80 px con texto de acción claro. Nada de animaciones: la pantalla responde al instante.
- Corregido: en modo rápido ya no vuelve a aparecer el panel de ajustes avanzados (regla CSS del layout pulido que lo re-mostaba), y quedan escondidos el panel de servicio completo, el editor, los presets, la navegación de 4 pasos, los atajos del mostrador, la zona "Entregar este trabajo", las exportaciones legacy, sellos y firmas, OCR, guía dúplex, ajustes de formato y NAS. Todo sigue en el modo completo, a un toque.
- Guardarraíles: nunca se imprime sin vista previa (la revisión previa al diálogo del sistema); nunca se pierden capturas al cambiar de modo; si lo escaneado no parece una tarjeta, el modo completo queda a un toque sin bloquear.

## 3.30.0 — Mostrador rediseñado, trabajos y actualización consistente

- Nueva composición de servicio, recepción y preparación, con hoja protagonista y ajustes agrupados; estilos consolidados para escritorio, móvil y modo oscuro.
- Cámara, Archivo, Cargar desde NAS y Recibir QR en la misma zona; acceso NAS permanente en la cabecera.
- Acción principal contextual, revisión de páginas pendientes y avisos junto a los ajustes. Guardar el trabajo antes de cambiar de cliente.
- Kanban y lista de pedidos: Pendiente, En preparación, Listo para entregar y Entregado; cambios persistidos sin inventar confirmaciones físicas.
- Comprobante con folio estable, fecha, resumen, ticket PDF e impresión independiente. QR de referencia sin datos personales ni seguimiento remoto ficticio.
- Cierre JSON firmado por el navegador, verificación de integridad y CSV protegido contra fórmulas; métricas agregadas sin imágenes ni datos de clientes.
- Paperless: revisión de título, fecha, tipos y etiquetas existentes; sugerencias locales a partir del texto reconocido; límite de 30 MB y protección frente a duplicados y cambios de sesión.
- Canvas temporales liberados tras materializar sus resultados, incluidas rutas fallidas de render PDF; ayuda secundaria diferida.
- Se retiran firmas reutilizables en localStorage y el respaldo de imágenes en ese almacenamiento; se conserva recuperación mediante IndexedDB.
- Build limpio con referencias por contenido; caché aislada por versión y retirada de cachés antiguas sin limpiar trabajos. Estado offline basado en recursos realmente presentes.
- Documentación de uso y referencia técnica actualizadas. Regresión nueva en Chromium y WebKit para la entrega; la actualización comprueba conservación de datos del usuario.

## 3.29.1 — Paperless visible y sellos y firmas al alcance

- Servicios rápidos visibles, acción contextual para continuar y cantidades con botones +/−.
- Actualizaciones del panel agrupadas para evitar recalcularlo inmediatamente y otra vez en el mismo ciclo.
- Búsqueda paginada en Paperless, descarga y apertura de copia como trabajo nuevo con confirmación; sin modificar el original del NAS.
- Descarga limitada a PDF/imágenes de 30 MB, sin seguir redirecciones y con comprobación de sesión.
- Pruebas nuevas de recorrido, búsqueda y tiempos de preparación/reutilización de impresión.

- Paperless pasa a recepción con estado de conexión y revisión antes del envío.
- Sello COPIA y Añadir firma visibles junto a la hoja; otras herramientas agrupadas.
- Sellos de un toque, pestaña activa y ajustes de precisión desplegables.
- Se conservan los motores de impresión, PDF, medidas y capas originales.

## 3.29.0 — Mostrador, preparación y entrega unificados

- Recepción directa, selector de servicio compacto, herramientas según el trabajo y una zona de entrega con impresión, PDF, QR y Paperless opcional.
- Un único módulo organiza los paneles; cliente y nota son opcionales; preferencias separadas por servicio y cambio de servicio conservando las capturas, con deshacer.
- Resumen de fotos/páginas, juegos y hojas; perfil de impresora y verificación física visibles en la preparación.
- Trabajos reúne pedidos guardados e impresiones con filtros, reanudación y reimpresión exacta.
- Paperless acepta fotografía individual o PDF revisado. El historial archiva las hojas completas con medidas, guías y capas; no convierte cada imagen en una página A4.
- Confirmación de tareas asíncronas, recibos locales acotados, prevención de doble envío y tratamiento explícito de respuestas inciertas.
- Configuración de Paperless reservada a administración, dominio HTTPS autorizado y cancelación de operaciones al bloquear la sesión.
- La detección de INE queda limitada a identificaciones, propone las caras antes de aplicarlas y permite conservar la foto original o deshacer la separación.
- Pruebas específicas de Paperless, archivo completo, flujos y geometría, junto a la regresión existente. Publicación pendiente de revisión; iPhone y regla física de 50 mm requieren prueba real.

## En desarrollo — Paperless y operatividad del mostrador (sin publicar, sin cambio de versión)

- Botón "Enviar a Paperless" en la entrega de PDF (junto a "Descargar PDF preparado") y en el historial de cada trabajo con copia guardada; acceso "Enviar a Paperless" en los atajos del mostrador, que abre la entrega de PDF.
- Ajustes de Paperless (dirección, por defecto https://paperless.iglesiasmurrieta.com, y token de API) guardados solo en localStorage del navegador; el token nunca se escribe en el código (en ejemplos solo el marcador TU_TOKEN). Botón "Comprobar acceso" para validar dirección y token sin enviar nada.
- El envío es POST multipart a {base}/api/documents/post_document/ con Authorization: Token y campos document y title (título del trabajo, con cliente si lo hay). Progreso, éxito y errores legibles: token rechazado, archivo no aceptado, Paperless sin respuesta o bloqueado por CORS.
- Desde el historial, el PDF se reconstruye con las imágenes guardadas de la hoja (una por página, proporción conservada); no inventa etiquetas ni tipos.
- Operatividad: atajos del mostrador con texto centrado y sin recortes en pantallas estrechas; el estado de la entrega mantiene su altura para no mover el diálogo. Sin cambios de color ni de tema, recepción fija intacta, sin precios ni multicliente, sin scripts inline nuevos.
- Operatividad de Paperless: "Comprobar acceso" guarda primero lo escrito en pantalla y luego comprueba, para no validar un token viejo; el estado de sus ajustes mantiene su altura para no mover el diálogo.
- En producción la CSP ya incluye el dominio de Paperless en connect-src (firebase.json, sin tocar script-src ni sus hashes); pendiente fuera de este repo: Paperless debe permitir el origen https://fotos.cobertores.com (CORS).
- Botón \"Enviar a Paperless\" mucho más visible en los tres sitios: acción primaria azul a todo lo ancho en los atajos del mostrador, botón primario en cada trabajo del historial y botón primario grande en el diálogo de entrega PDF. El estado deshabilitado (por ejemplo, antes de preparar el PDF) sigue visible y legible, solo atenuado. Sin cambio de texto ni de flujo: sigue enviando lo mismo.
- INE en una sola foto: si la foto (o el documento subido) trae los dos lados del INE juntos, la app detecta las dos tarjetas en el cliente (canvas, sin servicios externos ni enderezado), las separa en Frente y Reverso y muestra un aviso visible con miniaturas, \"Intercambiar\" y \"Deshacer\" de un toque. Si no detecta exactamente dos tarjetas, la foto se usa como antes, sin cambios. El par se imprime y se envía a Paperless como hasta ahora (dos páginas en el PDF).

## 3.28.1 — paneles y acabado de hoja

- Recepción compacta; historial y formatos en un desplegable.
- Preparación y acabado agrupados; vista previa sin checklist largo ni desplazamiento interno de columna.
- Resumen de los elementos impresos, controles de acabado plegados y acceso directo a hoja limpia.
- Hoja limpia elimina el título personalizado; escribir un título nuevo vuelve a mostrarlo.
- Pruebas de escritorio, móvil, teclado, impresión y conservación de las imágenes.

## 3.28.0 — acabado local y cierre de auditoría

- Corrige la pérdida del arrastre cuando se actualiza la vista previa; la prueba fuerza esa actualización con el dedo agarrando la foto.
- Acabado local y reversible de documentos y fotografías: contraste, reducción suave de ruido, nitidez, comparación y original conservado. Se procesa fuera de la interfaz, sin servicios externos.
- Los formatos marcados sin retoque mantienen desactivada la mejora en mostrador. Se preservan proporciones, resolución y transparencia. No reconstruye partes inexistentes ni garantiza recuperar desenfoque fuerte.
- Recuperación de nube completa por trabajo: no anuncia documentos parciales, conserva reintentos y valida las huellas de las copias nuevas. Las copias en proceso no se dan por listas.
- El publicador toma la versión del programa y verifica la rama correspondiente. Diagnóstico técnico sin imágenes, texto OCR ni datos de clientes.
- Pruebas de Windows, Chromium y WebKit; resultados efectivos de publicación en el acta de cierre.

## 3.27.0 — Pulido de mostrador (revisión del 26 de octubre de 2026)

- Recepción se desbloquea al iniciar sesión; cámara, archivo y QR mantienen su acceso directo.
- Inicialización ordenada del estudio y selección inmediata de formatos fotográficos.
- Marco blanco compartido sin aumentar el tamaño de corte; guías limitadas al espacio entre fotos, iguales en PDF e impresión.
- Documentos: la alternativa PDF de impresión usa la misma calibración que la impresión directa; documentos limpios sin guías añadidas.
- Respaldo del historial validado y transaccional: 80 MB, 2000 trabajos, cantidades positivas, sin contenido activo; conserva los límites de 12 copias / 48 horas.
- Confirmación de impresión, entrega y reimpresión exacta desde el resultado; estados sin prometer el estado físico de la impresora.
- Miniaturas móviles visibles y espacio inferior calculado según la altura real de la barra de impresión.
- Respaldo Git por commit con etiquetas inmutables y promoción de la rama de publicación solo después del CI; el BAT rechaza publicar una rama atrasada respecto a main.
- Se conserva el número de versión. Publicación y medición física pendientes de revisión.

# Registro de cambios de RealScan

Este registro describe los avances del código. Un build o un push no acreditan una publicación: el deploy se confirma comprobando el mismo commit y build en los dominios de ambos sitios. Las pruebas físicas de papel, giro y calidad se realizan con la impresora del establecimiento.

## 3.27.0 - Capturar primero, firmar y entregar

### Mostrador práctico y correcciones de impresión

- Recepción fija: Cámara principal, Archivo y Recibir por QR; accesos INE e infantil sin pasos previos.
- Reimpresión exacta e historial local, cola con confirmación del resultado y cierre diario por papel/formato con CSV.
- Asistente por impresora: reglas X/Y de 50 mm, cálculo de corrección y verificación física separada.
- Infantil de 25 × 30 mm: 8 y 12 en una hoja 4×6; 16 en dos hojas para conservar medidas y márgenes.
- Enderezado fino con vista previa, original y deshacer; lectura PDF diferida sin bloquear el mostrador.
- Correcciones de vistas previas móviles, distribución en milímetros, persistencia de packs/perfiles y referencia del trabajo en afterprint.
- Pruebas nuevas Chromium/WebKit y ejecución fiable de las pruebas en Windows sin omitir sus aserciones.

### Mostrador 2: marco, respaldo, carga, tema y flujo de entrega

- Marco blanco automático para recortar (2 mm, limitado por el hueco real entre fotos y los márgenes de la hoja): la foto conserva su tamaño 1:1 y las guías de corte se desplazan al borde exterior del marco, así el recorte deja borde blanco. También en documentos, con guía punteada en el borde del marco.
- Respaldo del historial y los cierres: exportar a JSON e importar (por id, sin duplicar, con validación) desde el diálogo de impresiones recientes. El cierre diario se calcula desde los trabajos, así el respaldo lo cubre.
- Primera carga completa: los 68 scripts clásicos de index.html ahora usan defer (orden preservado; el módulo del lector PDF ya era diferido). Siete inicios se hicieron compatibles con defer (studio, guided-steps, review-enhancements, app, audio, modern-experience y annotation-workflow): solo inician de inmediato con readyState complete y si no esperan a DOMContentLoaded, porque un setTimeout corto podía dispararse antes de terminar los 68 scripts y dejar la interfaz moderna sin definir. Las páginas del teléfono se dejan como están.
- Tema general: botones del estudio a 48 px (60 px en modo mostrador), tarjetas con el mismo radio y borde, sin cambiar la estructura ni esconder funciones. Los colores no se tocan: el acento es el sistema de temas del usuario.
- Nube: cors.json del bucket guardado en el repo (origen https://fotos.cobertores.com; confirmar contra la consola con `gsutil cors get`) y eliminado el fallback que inventaba `<proyecto>.appspot.com` cuando faltaba storageBucket: ahora falla con mensaje visible y el trabajo local sigue a salvo.
- Etiqueta del trabajo: Cliente y Nota opcionales en la sección de mostrador, se guardan con el trabajo, se ven en el historial y se pueden buscar por nombre, trabajo o nota.
- Reimprimir solo la hoja que falló: en el diálogo de reimpresión, con más de una hoja, botones Hoja 1, Hoja 2… que preparan solo esa hoja sin tocar el trabajo abierto.
- Estado Entregado y pendientes de entrega: lo impreso y confirmado que aún no se recoge queda en "Pendientes de entrega"; al marcarlo entregado sigue contando en el cierre del día (ya se imprimió) y ya no pide confirmación.



- Entrada «Escanear primero»: captura y elección posterior del servicio, revisión de bordes para DNI/INE y confirmación para sustituir un trabajo abierto.
- Acabado visual de mostrador y móvil: tarjetas, controles grandes, foco accesible, vista previa proporcional y conservación del original después de ajustar el recorte.
- Política del alojamiento corregida para procesar imágenes locales; las nuevas pruebas utilizan los encabezados reales de publicación. Mensajes del publicador vinculados a la versión seleccionada.
- Firmas manuscritas dibujadas o importadas; eliminación de fondo blanco y guardado opcional en este navegador.
- Sellos COPIA, RECIBIDO con fecha, REVISADO, ANULADO, CONFIDENCIAL y texto personalizado; tamaño, intensidad, color, posición y marca de agua diagonal.
- Selección de páginas, deshacer y quitar anotaciones, conservando imágenes originales y capa independiente en PDF, JPG e impresión.
- Copias identificadas por destinatario y folio; registro local de preparación/descarga y comprobación de coincidencia exacta por SHA-256. No detecta fotocopias ni acredita quién las realizó.
- Entrega de PDF por páginas o rangos, calidad alta/ligera, nombre y tamaño real del archivo, con vista previa del PDF preparado.
- Comparador deslizante y lupa; accesos visuales a los acabados de captura y cuenta regresiva para captura automática estable.
- Firma criptográfica con certificado aplazada por decisión del usuario al priorizar estas mejoras. La firma manuscrita y las marcas no se anuncian como certificación.

## 3.26.0 - Mostrador visual y doble cara guiada

- Interfaz coherente de mostrador y móvil: tarjetas de servicio, contraste, controles táctiles y vista previa de la hoja.
- Botones de papel frecuente conectados a las medidas reales y plantillas de encabezado editables con miniaturas.
- Prueba A/B con borde naranja ARRIBA, selección explícita de cara y borde de entrada y dibujo que cambia con esas respuestas.
- Perfiles de impresora, bandeja y papel comprobados por el usuario; se recuperan al abrir la guía. Los perfiles antiguos conservan notas y requieren completar la colocación.
- El dibujo guardado aparece al reinsertar papel en documentos. En identificaciones se confirma la recolocación antes de preparar el reverso; cambios del trabajo invalidan la primera pasada.
- Las medidas de impresión y los motores de captura, PDF y OCR se mantienen compartidos. La orientación física requiere la prueba en la impresora real.

## Ajuste del BAT - 25 de octubre de 2026

- Los mensajes de progreso nativos se muestran como texto sin bloques NativeCommandError de PowerShell. Se conservan stderr y los codigos de salida reales; pruebas con procesos reales que terminan en 0 y 7.

## 3.25.1 — corrección del publicador

- La autenticación, la comprobación de acceso y el deploy usan la API oficial de firebase-tools.
- Se evita el manejador de cierre de la CLI que intentaba escribir lastError en el perfil local después de completar la operación.
- Las credenciales y los permisos se conservan. Los errores reales de autenticación, red y despliegue siguen dando salida no exitosa.
- Se mantiene la comprobación del mismo commit y build en los cuatro dominios.
- Pruebas del adaptador y del BAT para que una operación rechazada nunca se anuncie como completada.

## 3.25.0 — 25 de octubre de 2026

### Escaneo más claro para cada servicio
- Tarjetas visuales de identificación, documento y fotografía en el móvil.
- Frente y reverso con estados y acceso a la captura confirmada; encabezados que indican qué cara o página se revisa.
- La fotografía conserva sus proporciones; los documentos conservan su recorrido de ajuste de bordes y revisión.
- Acción inferior accesible que cambia entre capturar, añadir, guardar o revisar; opciones especiales agrupadas.
- Repetir mediante la cámara nativa sustituye la captura elegida, con protección frente a selecciones tardías de otro servicio.

### PDF y entrega desde el teléfono
- Nombre de archivo, idioma y selección OCR conservados en el borrador.
- Compartir PDF mediante el menú del dispositivo cuando se admite, con descarga alternativa y cancelación que conserva el trabajo.
- Conservación de PNG/JPEG normalizados en el PDF para evitar una recompresión adicional.
- Recepción por QR con imágenes mayores y botón de envío fijo. La confirmación sigue dependiendo de la recepción real del mostrador.

### Mostrador e impresión
- Dibujos y explicaciones que distinguen ambas caras de una identificación juntas en una página de la impresión física por los dos lados del papel.
- Fotografías: separación entre fotos por juego, juegos completos, total de fotos y una copia en el controlador cuando los juegos ya están incluidos.
- Accesos de impresión de documentos dirigidos a una misma revisión, conservando la alternativa PDF.
- Doble cara manual: primera pasada, confirmación de que el papel se ha recolocado y continuación a reversos. Un cambio del trabajo bloquea una continuación obsoleta.
- Prueba de giro accesible, sin suponer cómo alimenta o entrega papel cada impresora.

Validación: batería completa `npm run verify`, pruebas del publicador Windows y recorridos adicionales de móvil en Chromium y WebKit. Véase [la auditoría de esta versión](audit/MOVIL_3_25.md) y [GitHub Actions](https://github.com/pacoiglesias/fotos/actions). Las pruebas de compartir simulan la API nativa; no acreditan el envío a aplicaciones externas ni sustituyen una prueba en teléfonos físicos.

## 3.24.0
- Modo rápido del mostrador y cola local con estados, guardado de pedidos y protección al cambiar de trabajo.
- Actualización del pedido activo sin crear copias duplicadas; entrega que elimina las imágenes de la copia conservando el trabajo abierto.
- Selección de páginas y edición por lotes con un paso de deshacer, incluida la recuperación de la selección.
- Encabezado configurable, ejemplo visual y espacio reservado en documentos; nombre del pedido independiente del texto impreso.
- Distribución arriba, centrada y compacta sin modificar las medidas solicitadas.
- Impresión directa de documentos con juegos y caras impares/pares; PDF como alternativa.
- PDF de alta calidad y respaldo de los ajustes OCR; mejoras de cancelación del lector.
- Publicador que comprueba versión y commit, informa el paso fallido y distingue una publicación no iniciada de una posiblemente parcial.

Detalle: [auditoría 3.24](audit/MEJORAS_MOSTRADOR_3_24.md).

## 3.23.0
- Avisos con acciones correctivas cuando las cantidades no caben, sin reducir silenciosamente el pedido.
- Revisión solicitada por el operador de posibles páginas vacías, duplicados exactos y calidad estimada.
- Preparación anticipada de impresión y cachés invalidadas cuando cambia el contenido.
- Separación de impares/pares y reversos vacíos entre juegos con número impar de páginas.
- Confirmación del papel después de cerrar la ventana, sin suponer una impresión realizada.

## 3.22.0
- Deshacer, rehacer, reemplazo de imágenes y repetición del servicio con confirmación.
- Historial de documentos, selección por miniaturas, orden por arrastre o botones y conservación de originales.

## 3.21.0
- Panel por servicio con tamaños, cantidades rápidas y juegos completos.
- Resumen del pedido y controles de documentos reunidos; ajustes avanzados agrupados.

Detalle de 3.21–3.23: [mejoras en tres etapas](audit/MEJORAS_TRES_ETAPAS.md).

## 3.20.0
- Estudio visual con tarjetas de servicio, hoja en vivo y herramientas de edición próximas a la imagen.
- Comparación original/resultado, formatos frecuentes guardados sin fotos y revisión del cliente.

Detalle: [estudio visual 3.20](audit/ESTUDIO_3_20_0.md).
