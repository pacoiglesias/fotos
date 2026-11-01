# Prioridades antes de la próxima entrega — RealScan Pro

Actualización: 31 de octubre de 2026. Rama `codex/identificacion-simple-336`, revisión [#15](https://github.com/pacoiglesias/fotos/pull/15). El usuario ha solicitado implementar todas las mejoras de software y hacer después las pruebas físicas. La publicación se acredita únicamente con los endpoints y el resultado del publicador.

Ya preparados para 3.36.0: panel de identificación más compacto, captura por cara, navegación corregida, revisión de impresión renovada, edición de escala/posición/cantidades y revisión reversible de páginas en blanco. Las pruebas locales y CI se registran por commit en el PR; una compilación de prueba no acredita un despliegue.

## Estado vigente de las etapas

Los símbolos contradictorios del plan antiguo no representan el avance de esta revisión. Estos estados describen el código preparado y la evidencia; el resultado completo se registra por commit en el PR. No se inventan porcentajes de terminación.

| Etapa | Estado actual | Evidencia y pendiente |
| --- | --- | --- |
| 1. Composición y medidas | Geometría digital comprobada; validación física pendiente | Las regresiones comprueban papel, piezas, paginación y transformaciones PDF. Falta medir la salida de la HP con la regla de 50 mm. |
| 2. Proyecto y acceso | Funciones cubiertas por regresiones | Se conservan los motores y propietarios actuales. Configuración de favoritos validada con una lista explícita de campos; no almacena imágenes, firmas ni títulos de clientes. |
| 3. Rediseño y flujo | Implementado; en verificación integral | Recepción compacta, visor común de hoja/caras, recorte directo, avisos Resolver, foco de retorno y entrega por acciones principales. |
| 4. Edición y páginas | Funciones revisadas y probadas en navegador | Recorte, perspectiva, anotaciones, distribución y revisión reversible de páginas en blanco. Se conserva la validación física pendiente. |
| 5. Recuperación y productividad | Implementado; en verificación integral | Los menús móviles conservan apertura y foco al regenerar páginas. Se añaden ajustes por servicio/impresora, favoritos ampliados, atajos configurables, cola compacta y filtro de hoy. |
| 6. Rendimiento, accesibilidad y sin conexión | Implementado y medido en simulación; dispositivo físico posterior | La respuesta del trabajador espera la limpieza de cachés. Se mide arranque del recorrido, nodos y memoria con trabajos repetidos; diálogos y recursos secundarios siguen siendo diferidos. Se comprueban foco, teclado y adaptación; no se certifican 60 FPS sostenidos ni WCAG AA completa. |
| 7. Cierre y entrega | En verificación | Se registran pruebas completas por commit y se revisa el repositorio después del push. Las pruebas físicas se harán después de aplicar el software, por indicación del usuario. |

## Incidencias anteriores y correcciones preparadas

- **Restaurar en móvil:** la regeneración de páginas descartaba el estado de «Más acciones». Ahora se conserva por identificador de página, junto al foco de la acción. La regresión abre el menú, cambia otra opción real y comprueba que Restaurar sigue accesible y recupera exactamente el original.
- **Actualización y versiones antiguas:** el estado `activated` no acredita que haya terminado el trabajo asíncrono de activación. La respuesta `REALSCAN_CACHE_INFO` espera ahora la promesa de limpieza y toma de control. Una prueba con eliminación retenida demuestra que no confirma disponibilidad antes de tiempo y conserva las cachés ajenas.

El fallo previo de `4d9c1bc` permanece en la auditoría como antecedente. No se sustituye por repeticiones aisladas: el cierre exige la batería completa del código corregido.

## Aplicación de las catorce mejoras acordadas

| Prioridad | Mejora aplicada | Resultado práctico / validación |
| --- | --- | --- |
| Alta | Recepción compacta y herramientas secundarias plegadas fuera de la barra | Servicios y orígenes accesibles sin expandir columnas con espacios vacíos. |
| Alta | Visor común Hoja / Frente o foto / Reverso y recorte directo | Amplía sin alterar la pieza impresa; se conserva el original. |
| Alta | Resolver en avisos de caras y páginas | Abre la captura o revisión exacta que necesita atención. |
| Alta | Ajustes habituales según el servicio y la impresora | Elegir menos opciones en INE, infantiles y documentos sin heredar datos del cliente. |
| Alta | Retomar foco y desplazamiento al volver de cualquier diálogo | Continuar en la cara o página que se estaba preparando. |
| Alta | Simplificar la entrega PDF en Descargar, Imprimir y Compartir | Mostrar NAS, QR o WhatsApp cuando corresponda al destino elegido. |
| Alta | Atajos de teclado configurables para captura, cambio y entrega | Reducir movimientos de ratón, conservando la revisión antes de imprimir. |
| Media | Ampliar favoritos con margen, acabado, posición y perfil | Preparar un pedido habitual en un toque, guardando solo configuración. |
| Media | Ajustar posición y márgenes directamente sobre la hoja | Ver guías en milímetros sin alterar la medida física de las piezas. |
| Media | Reunir vacías, duplicadas y orientación dudosa en una revisión de importación | Corregir el lote con miniaturas y deshacer, sin eliminar automáticamente. |
| Media | Estado visible por archivo enviado a Paperless | Distinguir envío aceptado, procesamiento, archivado y error recuperable. |
| Media | Vista compacta de la cola para móvil y pedidos del día | Consultar el siguiente trabajo sin desplazamiento horizontal. |
| Media | Medir arranque y memoria en una jornada simulada larga | Priorizar carga diferida y liberación de recursos con evidencia de rendimiento. |
| Física, después del software | Medición HP, reinserción dúplex e iPhone real | Pendiente por indicación del usuario. El perfil no se marca verificado sin medir. |

Las trece mejoras de software están preparadas en la rama y tienen comprobaciones dirigidas. El resultado completo del código definitivo se registra por commit en el PR. La comprobación física es posterior y no se presenta como realizada.

## Registro histórico

El plan anterior se conserva en [audit/PLAN_HISTORICO_2026-10-14.md](audit/PLAN_HISTORICO_2026-10-14.md). Sus etiquetas de completado son un registro anterior, no el estado de esta entrega.
