# Cierre de reparación 3.4

Base: commit `2bc4a3525f6c182f6541ebd253c7a811fb7673b9`. Fecha: 14/10/2026.

## Correcciones de la auditoría

| Hallazgo | Cambio y comprobación |
|---|---|
| F01: no iniciaba | Se eliminó el bloque residual; análisis de todos los módulos y arranque real obligatorios. |
| F02–F03: transferencia y QR simulados | Transporte real por Firebase con autenticación anónima y generador QR estándar. Dos navegadores independientes y un decodificador externo verifican el recorrido. |
| F04: sesiones | Secreto de 256 bits en fragmento, caducidad y permisos en servidor, acuse del receptor, límite de ocho archivos, deduplicación, revocación y eliminación al desconectarse el puesto. |
| F05: caché cruzada | Cada navegación conserva su propia entrada; dependencias locales y versión por contenido. Se reproduce teléfono → inicio sin internet correctamente. |
| F06: contraseñas fijas locales | Eliminado el bypass y la sustitución de hashes existentes; pruebas con contraseña cambiada. |
| F07: escala sin efecto | La composición cambia dimensiones y posiciones; comprobación del tamaño dentro del PDF generado. |
| F08: controles digitales | Conversión real a JPG/PNG/PDF y redimensionado; comprobados MIME, dimensiones y bytes. |
| F09: PDF móvil | Importador PDF compartido, selección explícita de página/destino y confirmación después del procesamiento. |
| F10: persistencia | Se conservan cantidades A/B, escala, recorte y perspectiva; comprobados historial, presets, borrador y respaldo importado. |
| F11: fichas | Referencias verificables para perfiles comprobados; resto orientativo. Restricciones de color/luz y comprobaciones previas de salida en perfiles sin retoque. No se certifica el cumplimiento de todos los trámites. |
| F12: HTML de archivos | Nombres mostrados mediante `textContent`; descarga mediante Blob; formatos y límites validados. |
| F13: publicación de raíz | Construcción con selección explícita de archivos y Hosting desde `dist/`; se excluyen los documentos ajenos sin borrarlos. |
| F14: sonido | Panel real de ajustes, conservación del volumen cero y silencio efectivo. |

Además: se controlaron operaciones asíncronas por trabajo/ranura para impedir recuperar imágenes descartadas; se separaron guías de edición y datos exportados; se bloquearon composiciones que omitirían copias; se limitaron páginas/dimensiones de PDF para evitar asignaciones de memoria desproporcionadas; se agregó verificación automatizada en GitHub.

## Infraestructura

Proyecto existente `fotos-cobertores-pro`; aplicación web RealScan Transferencias; base `fotos-cobertores-pro-default-rtdb`, reglas restrictivas y proveedor anónimo activados. No se activó facturación. Se eliminó de la configuración local el segundo sitio inexistente, conservando el sitio verificado `fotos-cobertores-pro`.

Los enlaces funcionan como credenciales temporales: quien recibe uno puede usar esa sesión hasta su caducidad/revocación. La autenticación del puesto sigue siendo local y no se presenta como un sistema de autorización remota de empleados. El historial continúa local; las transferencias sí utilizan almacenamiento temporal de Firebase.

## Evidencia y límites

Resultados detallados en [validación histórica](archivo/VALIDACION_MEJORAS.md). Los programas de prueba se incluyen en `scripts/`; las imágenes y registros locales están en `.audit/repair-evidence/`. La transferencia se probó mediante Firebase real, con imágenes sintéticas y navegadores aislados; no se utilizaron documentos ni cuentas de clientes.

La verificación de hardware, Safari/iPhone y medidas impresas debe hacerse en el negocio. No se afirma que el sistema esté libre de cualquier error posible ni que las fotografías sean aceptadas por todas las autoridades.
