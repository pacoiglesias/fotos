# Revisión del mostrador · 3.36.1

Estado: candidata en validación. La entrega anterior 3.36.0 permanece documentada en [ENTREGA_336.md](ENTREGA_336.md).

## Hallazgos y cambios

- En la sesión observada estaba activo el perfil HP LaserJet CP 1025 al 100 %, con medición pendiente. No se reprodujo el aviso equivocado en esa inspección; no se atribuye una causa no demostrada. El antiguo aviso infería el estado por identificador o texto del panel, y no escuchaba explícitamente el evento del perfil. Ahora consulta el perfil existente y muestra su nombre y el estado de medición, con acceso a cambiarlo.
- La impresión parcial ya exigía una casilla de consentimiento, dejando espacios vacíos; descargar PDF requería completar las caras o cambiar la composición en otro control. Ahora hay una acción explícita para continuar con una sola cara desde preparación y revisión. Conserva las imágenes originales, el papel y los juegos; se mantienen los bloqueos por ausencia de imágenes y geometría inválida.
- La actualización de la revisión tenía un contador llamado igual que la función `refresh`. La nueva regresión detectó que una acción o reintento dentro de esa función intentaba ejecutar un número. Se renombra el contador y se comprueba un fallo transitorio seguido de un reintento real.
- Cambiar la composición actualiza también los hechos y el selector de la revisión. No se añade otro motor de impresión.
- Los cambios gráficos son de pantalla: contraste del encabezado, servicio seleccionado, recepción, visor y estados móviles. No modifican las reglas de impresión en milímetros ni la CSP.

## Validación

- Preparación con una y dos caras: Chromium y WebKit, cinco anchuras, ambos temas, firmas/sellos y conservación de originales.
- Revisión de impresión: acción de una cara, tamaño ID-1 de 85,60 × 53,98 mm, PDF habilitado, perfil HP tras recarga y reintento después de fallo transitorio.
- Compilación, comprobación de versión, CSP y batería completa: se registrará el resultado al terminar.
- La calibración de la HP, el dúplex físico y la prueba con iPhone real continúan pendientes por indicación del usuario. Un perfil seleccionado no equivale a una medición física.

## Mejoras siguientes, propuestas

1. Medir pasos y tiempo de los tres pedidos habituales con datos sintéticos; fijar un objetivo por recorrido y comprobarlo en cada entrega.
2. Unificar acciones repetidas de captura y entrega tras comprobar qué accesos se usan, manteniendo cada ajuste accesible durante el trabajo.
3. Edición directa sobre la vista de hoja para posición y márgenes, con entrada numérica y teclado como alternativa.
4. Resumen de pedido legible para el cliente: piezas, caras, juegos y hojas, antes de confirmar cada destino.
5. Separar más claramente «guardar pedido local», «descargar archivo» y «archivar copia en NAS», indicando dónde queda cada copia.
6. Prueba de uso con un operador nuevo para localizar etiquetas y pasos que todavía requieren explicación.

Estas propuestas no se presentan como implementadas ni justifican declarar el sistema sin fallos.
