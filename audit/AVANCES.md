# Avances de RealScan Pro

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
