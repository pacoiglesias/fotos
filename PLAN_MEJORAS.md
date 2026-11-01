# Prioridades antes de la próxima entrega — RealScan Pro

Actualización: 31 de octubre de 2026. Rama `codex/identificacion-simple-336`, revisión [#15](https://github.com/pacoiglesias/fotos/pull/15). Producción sigue en 3.35.1; la publicación está aplazada por indicación del usuario.

Ya preparados para 3.36.0: panel de identificación más compacto, captura por cara, navegación corregida, revisión de impresión renovada, edición de escala/posición/cantidades y revisión reversible de páginas en blanco. Las pruebas locales y CI se registran por commit en el PR; una compilación de prueba no acredita un despliegue.

## Estado vigente de las etapas

Los símbolos contradictorios del plan antiguo no representan el avance de esta revisión. Estos estados describen la evidencia actual; no son porcentajes de terminación.

| Etapa | Estado actual | Evidencia y pendiente |
| --- | --- | --- |
| 1. Composición y medidas | Geometría digital comprobada; validación física pendiente | Las regresiones comprueban papel, piezas, paginación y transformaciones PDF. Falta medir la salida de la HP con la regla de 50 mm. |
| 2. Proyecto y acceso | Funciones principales comprobadas; arquitectura en revisión | Acceso, respaldo, recuperación y conservación de originales tienen regresiones. Eso no acredita cerrar toda la separación arquitectónica propuesta. |
| 3. Rediseño y flujo | En curso | Preparación de identificación y revisión de impresión renovadas en la rama. Recepción compacta, visor unificado y otras propuestas siguen pendientes. |
| 4. Edición y páginas | Funciones revisadas y probadas en navegador | Recorte, perspectiva, anotaciones, distribución y revisión reversible de páginas en blanco. Se conserva la validación física pendiente. |
| 5. Recuperación y productividad | Parcial; incidencia abierta | Recuperación y cambio de cliente cubiertos. La suite local detectó un fallo intermitente al abrir Restaurar en móvil; la repetición aislada pasó en Chromium y WebKit, sin que ello permita declarar resuelta su causa. Los avisos con solución directa siguen como propuesta. |
| 6. Rendimiento, accesibilidad y sin conexión | Parcial; incidencia abierta | Hay pruebas de modo sin red, tamaños de pantalla, cancelación y recursos. La suite local detectó una caché antigua retenida durante la actualización. No se certifican 60 FPS sostenidos ni conformidad WCAG AA completa; faltan jornada larga, mediciones y dispositivo real. |
| 7. Cierre y entrega | Abierta | PR #15 en borrador. La verificación local terminó con dos suites fallidas; siguen pendientes su diagnóstico, las comprobaciones físicas y la publicación. CI satisfactorio por sí solo no cierra esta etapa. |

## Incidencias que deben cerrarse antes de publicar

- **Restaurar en móvil:** la prueba completa de Windows no consiguió abrir la acción dentro de «Más acciones». La repetición instrumentada pasó en Chromium y WebKit. La causa sigue sin confirmar; no se ha demostrado una corrección.
- **Actualización y versiones antiguas:** la prueba completa de Windows encontró `realscan-cache-v3.3.0` después de activar el trabajador actual. La repetición aislada pasó sin cambiar el código. Debe aclararse la diferencia y comprobarse la limpieza y conservación de datos de usuario antes de dar por resuelto el cambio de versión.

Ambos CI del código `4d9c1bc` terminaron correctamente. Eso no sustituye el resultado local: `npm run verify` terminó con código 1, con 398 registros PASS y las suites `image-enhance-regression` y `upgrade-regression` fallidas. Producción continúa en 3.35.1.

## Propuestas adicionales priorizadas

| Prioridad | Mejora propuesta | Resultado práctico |
| --- | --- | --- |
| Alta | Compactar la recepción en una barra y reducir los bloques anteriores a la hoja | Llegar a las capturas y opciones sin recorrer media pantalla. |
| Alta | Un visor para encuadre, caras y hoja, con controles coherentes | Evitar saltos entre vistas y conservar siempre la referencia del tamaño impreso. |
| Alta | Botón «Resolver» en cada aviso de revisión | Ir a la página, imagen o ajuste exacto que necesita atención. |
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
| Alta, física | Completar medición HP, reinserción dúplex e iPhone real | Comprobar los resultados que una prueba automatizada de navegador no puede certificar. |

La recomendación es cerrar primero recepción compacta, avisos resolubles y retorno al punto de trabajo. Las demás propuestas quedan para una fase posterior; no se presentan como funciones ya entregadas.

## Registro histórico

El plan anterior se conserva en [audit/PLAN_HISTORICO_2026-10-14.md](audit/PLAN_HISTORICO_2026-10-14.md). Sus etiquetas de completado son un registro anterior, no el estado de esta entrega.
