# Revisión del mostrador · 3.36.1

Estado: publicada y verificada en ambos Firebase y en el dominio habitual. Ver [entrega comprobada](ENTREGA_3361.md). La entrega anterior 3.36.0 permanece documentada en [ENTREGA_336.md](ENTREGA_336.md).

## Hallazgos y cambios

- En la sesión observada estaba activo el perfil HP LaserJet CP 1025 al 100 %, con medición pendiente. No se reprodujo el aviso equivocado en esa inspección; no se atribuye una causa no demostrada. El antiguo aviso infería el estado por identificador o texto del panel, y no escuchaba explícitamente el evento del perfil. Ahora consulta el perfil existente y muestra su nombre y el estado de medición, con acceso a cambiarlo.
- El panel antiguo de perfiles tampoco se actualizaba al seleccionar desde otro control. Se conecta al mismo evento; la regresión comprueba que su aviso, el selector, el resumen y el semáforo coinciden al aplicar y retirar la HP.
- La impresión parcial ya exigía una casilla de consentimiento, dejando espacios vacíos; descargar PDF requería completar las caras o cambiar la composición en otro control. Ahora hay una acción explícita para continuar con una sola cara desde preparación y revisión. Conserva las imágenes originales, el papel y los juegos; se mantienen los bloqueos por ausencia de imágenes y geometría inválida.
- La actualización de la revisión tenía un contador llamado igual que la función `refresh`. La nueva regresión detectó que una acción o reintento dentro de esa función intentaba ejecutar un número. Se renombra el contador y se comprueba un fallo transitorio seguido de un reintento real.
- Cambiar la composición actualiza también los hechos y el selector de la revisión. No se añade otro motor de impresión.
- Los cambios gráficos son de pantalla: contraste del encabezado, servicio seleccionado, recepción, visor y estados móviles. No modifican las reglas de impresión en milímetros ni la CSP.

## Validación

- Preparación con una y dos caras: Chromium y WebKit, cinco anchuras, ambos temas, firmas/sellos y conservación de originales.
- Revisión de impresión: acción de una cara, tamaño ID-1 de 85,60 × 53,98 mm, PDF habilitado, perfil HP tras recarga y reintento después de fallo transitorio.
- Un intento posterior con acceso Firebase renovado se detuvo al capturar evidencia: WebKit en Windows esperaba indefinidamente los cuadros de animación usados por locator.screenshot. Se comprueba ahora la geometría estable mediante temporizadores y se capturan los píxeles reales de la página, conservando todas las aserciones funcionales. La regresión completa de preparación volvió a pasar en Chromium y WebKit, cinco anchuras y ambos temas; el publicador completo posterior terminó con código 0.
- npm ci finalizó: 101 paquetes, 0 vulnerabilidades informadas. El publicador completó la batería completa: 442 marcas PASS, 0 marcas FAIL, versión/compilado/CSP comprobados. Este recuento incluye comprobaciones repetidas de publicación y no representa casos únicos.
- CI aprobado para el código, su integración y la fuente publicada `ee187d4450d3abdece84fdedee8a896922d6390b`. Tras renovar la sesión se repitió npm run publish, que terminó con código 0. Se verificaron metadatos, CSP y archivos en cinco direcciones; ver [entrega](ENTREGA_3361.md).
- Simulación: 160 trabajos en Chromium y 160 en WebKit. Nodos antes/después: 3181/3155 en ambos; heap Chromium 7754040/7603280 bytes tras recolección. WebKit no ofrece esa medición de heap. Es una simulación con imágenes sintéticas, no una certificación de jornada completa ni de dispositivo físico.
- La calibración de la HP, el dúplex físico y la prueba con iPhone real continúan pendientes por indicación del usuario. Un perfil seleccionado no equivale a una medición física.

## Mejoras siguientes, propuestas

1. Unificar acciones repetidas de captura y entrega, manteniendo cada ajuste accesible durante el trabajo y una siguiente acción clara.
2. Abrir un detalle grande del documento dentro de la revisión final, junto a la referencia de la hoja. La comparación original/resultado ya existe en el editor: conviene hacerla accesible desde el visor.
3. Edición directa sobre la vista de hoja para posición y márgenes, con entrada numérica y teclado como alternativa a los controles existentes.
4. Unificar tipografía, iconos, espaciado y etiquetas de los menús antiguos; revisar los saltos de palabras de los botones en móvil.
5. Reunir Cargar/Archivar de Paperless en un acceso claro y distinguir pedido local, archivo descargado y copia en NAS, indicando dónde queda cada copia.
6. Medir pasos y tiempo de los tres pedidos habituales y probarlos con un operador nuevo para localizar lo que todavía exige explicación.

Estas propuestas no se presentan como implementadas ni justifican declarar el sistema sin fallos.
