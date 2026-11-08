## 3.40.2 — Preparada en local (rama mejora/fotos-visual-nas, sin publicar)

El banner de estado de Paperless (§14, 3.40.1) llega a las dos ventanas que quedaban con texto plano: la búsqueda en el NAS (#nasStatus en openBrowser) y la ventana de metadatos al archivar (#nasMetadataStatus en js/paperless-metadata.js), con la nueva §15 de css/visual-espectacular.css y el helper compartido paintStatus (exportado como RealScanPaperless.setStatusBanner); F3 intacto. El botón #headerNas refleja el último estado de checkAccess() vía data-state (checking/ok/error; idle al quitar el token o bloquearse la sesión). Auditoría de selectores muertos de visual-espectacular.css: 236 reglas contrastadas contra el HTML/JS real, ningún token de clase/id sin uso, cero selectores eliminados. pdfjs-dist 6.4.299 → 6.5.438 (arrastra @napi-rs/canvas 1.0.11 → 1.1.0). Verificación en la VM: build, regresión principal (17 PASS) y paperless-regression en verde; paperless-intake y mobile:webkit no pueden ejecutarse en esta VM porque Playwright no lanza MiniBrowser (falta libgstreamer-1.0.so.0), fallo idéntico en main sin cambios.

## 3.40.1 — En publicación

Restaurada la retroalimentación visual de la conexión con el NAS/Paperless: las reglas «puntos con luz real» de la PR #24 (css/visual-espectacular.css §6) nunca ganaban la cascada frente a redesign-333.css y el semáforo se veía plano; la nueva §14 las restablece con la especificidad ganadora sin alterar la geometría, y el estado de «Comprobar acceso» pasa a ser un banner con estado (comprobando/conectado/error) en el diálogo de Paperless, que además muestra el token guardado sin exponerlo (F3 intacto). Sin cambios de lógica.

## 3.40.0 — En publicación

Rediseño visual espectacular (PR #24) y endurecimiento de seguridad (PR #27: contraseña mínima de 12 caracteres con PBKDF2 y sal, token de sesión de 256 bits, credencial de nube separada de la contraseña local, cabeceras de seguridad). Versión alineada en package.json, package-lock.json, js/config.js, metadatos de las páginas móviles y portada.

## 3.39.1 — Publicada y verificada

Entrada más clara, ventanas de Paperless y OCR accesibles, recuperación de envíos y limpieza de cachés históricas. Publicador: 488 marcas PASS, 0 FAIL. Cinco direcciones y 95 comparaciones de archivos verificadas. Fuente 5f95fd5447fe7a1e560ae033a2f3e124949c378a, contenido realscan-a405d66782f5c9c2. [Entrega y límites](ENTREGA_3391.md). El OCR real del NAS y la prueba física de la HP siguen pendientes.

## 3.39.0 — Publicada y verificada

Las seis propuestas están implementadas y publicadas. 470 marcas PASS, 0 FAIL; cinco direcciones verificadas y 65 comparaciones de archivos. Fuente 442650608898de65d31690f4fa87c7650680b584, contenido realscan-144ffb76d7a0a7f6. [Alcance, pruebas y límites](ENTREGA_3390.md).

## 3.38.0 — Publicada y verificada

Las cinco mejoras de software están publicadas. Publicador completo: 460 marcas PASS, 0 FAIL. Cinco direcciones verificadas, 95 comparaciones de archivos, CSP y metadatos coincidentes. Fuente 78354907c481a5a4ab6ca6ce53183d50e33c00d1, contenido realscan-9536e5ccaa108f44. Evaluación humana preparada y pendiente. [Entrega y límites](ENTREGA_3380.md).

## 3.37.0 — Publicada y verificada

Se aplican las seis propuestas de la revisión 3.36.1 y se separa selección de impresora de medición. Publicador completo: 450 marcas PASS, 0 FAIL. Cinco direcciones comprobadas, 330 archivos en total, CSP y metadatos coincidentes. Fuente f13b46be3b3f18284f67a9e8e483ae45c937aeca, contenido realscan-781411c417b9da3e. [Entrega y pendientes humanos](ENTREGA_3370.md).

## 3.36.1 — Publicada y verificada

Continuación explícita solo con frente desde preparación y revisión; perfil sincronizado también con el panel antiguo; reintento corregido y composición visual más compacta. PR #16 integrado y CI aprobado. Tras renovar el acceso a Firebase, el publicador completo finalizó con código 0: 442 marcas PASS, 0 FAIL y ambos despliegues completados. Cinco direcciones comprobadas: contenido `realscan-ed88608a60ea8802`, fuente `ee187d4450d3abdece84fdedee8a896922d6390b`. Ver [entrega](ENTREGA_3361.md) y [auditoría](REVISION_3361.md). Las pruebas físicas y las seis propuestas siguientes permanecen pendientes.

## 3.36.0 — Publicada y verificada

Las trece mejoras de software del plan están aplicadas y publicadas: recepción compacta, visor de caras/hoja, Resolver, favoritos ampliados, ajustes por servicio e impresora, atajos, retorno de foco, entrega agrupada, posición/margen visual, revisión de lotes, estados de transferencias, cola móvil/Hoy y mediciones de uso repetido.

El publicador oficial terminó con código 0; 437 marcas PASS, ninguna suite fallida y ambos despliegues completados. Versión `realscan-eae2eb5df9ea7418`, fuente `09743c6be291da54c386652a31ebc52345cab0f1`. Las cinco direcciones coinciden, con 63 archivos y CSP comprobados por dirección. [Registro de entrega](ENTREGA_336.md).

El PR #15 está integrado en main. Se retiraron 18 resultados generados y se archivaron los tres informes antiguos de raíz. Las pruebas físicas de HP, dúplex e iPhone quedan para después, por indicación del usuario; no se marcan verificadas.

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
