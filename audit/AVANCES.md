## 3.36.0 — Preparación de identificaciones simplificada

Ampliación solicitada: revisión de impresión con ajustes y vista en columnas, ampliación sin modificar el archivo, acceso a hoja limpia/guías, posición, escala y cantidades. Se corrigen foco, avisos obsoletos, sincronización de acciones y controles que desaparecían al pasar a la hoja en móvil. Limpieza de 18 artefactos generados; se conservan sus scripts. Por indicación del usuario se detuvo el publicador antes de Firebase y se continúa con pruebas y compilación local. Producción permanece en 3.35.1 hasta una publicación posterior comprobada.

Páginas en blanco: revisión explícita en Documentos, miniaturas de tamaño limitado, ampliación a petición, eliminación reversible y originales conservados. Ocho comprobaciones específicas en Chromium/WebKit, con PDF real de prueba, modo sin red, protección de anotaciones, dúplex y cancelación por nuevo trabajo. El plan actualizado prioriza catorce propuestas posteriores sin anunciarlas como implementadas.

Revisión del panel de identificación sobre main 3.35.1. Distribución, papel y juegos en una zona; captura por cara; controles de documentos ocultos fuera de su servicio; preparación antes de la vista previa en móvil. Se conservan motores de medida, impresión, privacidad y las opciones originales. La verificación y publicación se acreditan con resultados y endpoints, no con esta anotación.

## 3.35.1 — Ajustar la hoja desde la revisión

- Controles compartidos de márgenes, encabezado, rótulos, regla y líneas de corte dentro de la revisión y de la entrega PDF, organizados en Hoja, Encabezado y Acabado.
- Cambios con regeneración de la vista previa en el mismo diálogo; las descargas anteriores se invalidan. Se mantienen las medidas físicas de fotografías y tarjetas y se avisa si no caben.
- Margen automático compatible con los presets existentes, margen mínimo manual y conservación del ajuste en el borrador. El siguiente cliente restablece el margen automático.
- Pruebas nuevas en Chromium y WebKit para edición, regeneración y medidas ID-1. Publicación pendiente de verificación completa.

## 3.35.0 — Identificaciones prácticas, conexiones claras y entrega directa

- Modo rápido con Solo frente o Frente y reverso sin perder capturas; imprimir, PDF, enviar y guardar en NAS a la vista.
- Accesos de impresora y Paperless accionables; un token guardado no se anuncia como conexión comprobada. Configuración guiada para HP LaserJet CP 1025, con medición física pendiente hasta confirmarla.
- PDF con dos imágenes de identificación: revisión de caras antes de ajustar a ID-1; opción de solo frente y conservación de página completa como alternativa.
- Presentación renovada y recortes de tarjeta sin margen blanco añadido; vista móvil pequeña con espacio reservado para la imagen.
- Regresiones de diagnóstico, calidad, OCR y enderezado incluidas en verify. La publicación se acredita con sus endpoints y no con este registro.

# Avances de RealScan Pro

## 3.34.0 — Log de diagnóstico en todo el flujo

Extensión del registro técnico existente (Ajustes → Auditoría, 200 eventos, 14 días, solo en este navegador) a cámara (permiso y primera imagen), impresión (inicio/éxito/fallo), Paperless (inicio/éxito/fallo), lotes (inicio/fin/fallo) y recuperación por código/QR, con botones Copiar y Actualizar en el visor y entrada «Diagnóstico» en el menú «Más» del mostrador (sin tocar counter-desk.js). Privacidad estructural: la lista blanca del registro impide guardar URL/token de Paperless, datos de clientes, fotos, contenidos y códigos. Trabajo en curso local, sin publicar: la publicación la confirma el revisor con push y deploy tras revisar este commit.

## 3.33.0 — Rediseño del mostrador: más grande, más claro, menos scroll

Rediseño completo (25 ítems): suelo tipográfico 12/13 px, barra de dos niveles en teléfono, enlaces legibles en oscuro, Paperless con jerarquía nueva, miniaturas grandes con estado, pantalla cliente solo con hoja y Cerrar, par INE apilado, sin truncados, crédito único en el pie, lenguaje del modo rápido en mostrador y diálogos, ilustraciones de vacío sin red, iconos de línea unificados, semáforo gráfico siempre visible, vista previa a ancho completo con zoom a toque, barras de acción fijas con avisos encima, mostrador por secciones colapsadas, herramientas directas fuera de acordeones, lenguaje llano, cola con jerarquía, una sola entrada por acción, horizontal compacto, aviso de perfil en semáforo y dock, dúplex de 1 toque con colocación verificada y nota del historial en llano. Sin cambios de lógica de negocio. Trabajo en curso local, sin publicar: la publicación la confirma el revisor con push y deploy tras revisar este commit.

## 3.32.0 — Entrega única, mostrador completo y escaneo más inteligente

Diálogo único de entrega (PDF + caras JPG + QR + WhatsApp + Paperless, con "Confirmar y archivar" en un toque y reanudación automática tras guardar el token), par INE manual con consejo de fondo oscuro, sellos junto a la hoja, semáforo del mostrador, recuperación por código/QR, aviso de listo para recoger, respaldo automático a Paperless, impresión en lote, avisos de calidad y mismo documento antes de imprimir, bordes de tarjeta en la vista ampliada, Visa USA de un toque y dúplex guiado desde la revisión. Carga perezosa de dúplex, calibración y enderezado. Trabajo en curso local, sin publicar: la publicación la confirma el revisor con push y deploy tras revisar este commit.

## 3.31.0 — Modo rápido INE / DNI

Modo rápido real sobre el botón existente del mostrador (sin motores nuevos): pantalla con dos huecos grandes Frente/Reverso, un solo botón gigante de escaneo con avance automático al reverso, hoja Carta a tamaño real con sello "85.60 × 53.98 mm · 100%" y solo dos botones gigantes, Imprimir y Guardar PDF. Corrección de la regla CSS que volvía a mostrar los ajustes avanzados en modo rápido; en modo rápido solo quedan los huecos, la hoja y la entrega (el resto sigue en modo completo a un toque). Guardarraíles: nunca imprime sin vista previa, nunca pierde capturas al cambiar de modo, y el banner par INE se aloja dentro de la pantalla rápida. Trabajo en curso local, sin publicar: la publicación la confirma el revisor con push y deploy tras revisar este commit.

- Recorrido en emulación iPhone: 19 comprobaciones, 0 errores JS (escanear frente, auto-avance a reverso, hoja lista, PDF directo, impresión con revisión previa, Nuevo escaneo, par INE, salida y re-entrada sin perder capturas).
- Comparativa visual antes/después guardada junto al recorrido (misma pantalla 3.30.0 y 3.31.0 lado a lado).

## 3.30.0 — Nueva entrega en validación

Rama: codex/mostrador-claro-330. Incluye rediseño del mostrador, NAS visible, Kanban, ticket con folio, cierre verificable, metadatos revisados de Paperless, mejoras de memoria, privacidad y actualización. La publicación se confirma con los endpoints version.json y con la evidencia de entrega, no con este título.

- Dependencias reinstaladas con npm ci: 101 paquetes.
- Nuevos recorridos: pruebas sintéticas locales en Chromium y WebKit. La suite completa y su CI deben finalizar antes de cerrar la entrega.
- Base 3.29.1: PR #10 integrado en main, commit de merge 81f0965b5238a6408b4a4e7c0be3d69b3b36df41; CI 40551089106 aprobado.
- Producción comprobada al iniciar el rediseño: 3.29.1, realscan-b6c338541ef7eb0c, commit 9ac90a5870ce96e129afd3681bae4a851f0cd69a. Ambos Firebase y el dominio fotos.cobertores.com entregaron los mismos archivos.

La limpieza afecta al build y a cachés antiguas de la aplicación. Conserva cuentas, trabajos y ajustes. Las firmas reutilizables de versiones antiguas se retiran conforme a la nueva política de privacidad; los borradores gráficos se guardan en IndexedDB.

Pendientes de validación física: cámara/PWA en iPhone, medición de 50 mm, reinserción dúplex e integración real del NAS. El QR de ticket es una referencia; el Kanban es local de este navegador; la firma del cierre verifica integridad y necesita contrastar la huella para confiar en su identidad.

## Referencias

- [Guía técnica vigente](SISTEMA_REALSCAN.md)
- [Auditoría e integración 3.29.1](AUDITORIA_INTEGRACION_2026-10-27.md)
- [Registro de cambios](../CHANGELOG.md)

Las auditorías anteriores en esta carpeta documentan su fecha y versión. El historial completo de avances anteriores se conserva en Git.
