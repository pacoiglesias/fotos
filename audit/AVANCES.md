# Avances de RealScan Pro

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
