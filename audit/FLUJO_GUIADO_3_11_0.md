# RealScan 3.11.0 — Flujo guiado para atención diaria

Esta entrega integra las cinco mejoras acordadas después del parche 3.10.1. Conserva la cámara, PDF buscable, tamaños reales, recuperación local y transferencias de la auditoría AUDITORIA_CAPTURA_IPHONE_3_10_0.md.

| Necesidad | Implementación | Comprobación |
|---|---|---|
| Comenzar por lo que pide el cliente | Escanear documento, Foto para trámite y Recibir del cliente preseleccionan el servicio y la recepción en el diálogo existente | Cancelar conserva las imágenes del cliente actual; iniciar mantiene la confirmación de limpieza |
| Saber qué hacer después | Recibir → Revisar → Ajustar → Entregar, acciones contextuales y contadores reales | Archivo/USB y revisión apuntan a la cara que falta; en documentos se conserva el requisito de confirmar todas las páginas |
| Capturar con instrucciones claras | Medida elegida antes de capturar en móvil, consejo visible en cámara, navegación táctil entre tamaño/captura/revisión/guardado | Cámara completa en vertical y horizontal, incluyendo WebKit; las fotos no reciben perspectiva de documento |
| Revisar antes de entregar | Lista de orientación, bordes, caras y legibilidad; móvil muestra medida, páginas y aviso de resolución o solo frente | DNI puede entregarse con una cara si es lo solicitado; no se obliga a inventar un reverso. El PDF generado informa su peso real |
| Menos ruido y recuperación sencilla | Formatos adicionales plegables; idioma aparece al activar OCR; repetir captura por página | Repetir conserva la imagen anterior hasta confirmar, y el resultado nuevo pasa a ser su original restaurable. En móvil se muestran las páginas antes de las opciones de salida |

## Pruebas reproducibles

- `scripts/journey-regression.cjs`: accesos de servicio sin pérdida de trabajo, destino de cara pendiente, revisión de documentos, tamaños de pantalla y repetición de captura con recuperación después de recargar.
- `scripts/iphone-capture-regression.cjs`: geometría y revisión en Chromium y WebKit. La nueva ayuda visible no debe reducir ni recortar el encuadre.
- `npm run verify`: conjunto completo, incluidos almacenamiento, fotos, OCR local, PDF con texto, offline, QR y compatibilidad con trabajos anteriores. La publicación debe utilizar el commit confirmado y coincidir en los cuatro alias Firebase.
- Resultados del cierre y respaldos verificados: `backups/ESTADO_ULTIMA_PUBLICACION.md`. Este documento describe el cambio; la aprobación final depende de los resultados del cierre.

## Límites que siguen siendo reales

Las listas de revisión ayudan al operador; no certifican automáticamente nitidez, validez oficial de una fotografía o exactitud del OCR. La cámara y el enfoque físicos del iPhone y una impresión medida requieren prueba real. La medida física se elige expresamente; no se deduce con certeza de una foto de dimensiones desconocidas.

El error de Paperless por idiomas eng/spa sigue necesitando revisar la instalación que procesa sus documentos. La capa de texto de RealScan no instala dependencias en Paperless. No se ha modificado ese servidor.

Los documentos de clientes no se incluyen en el respaldo del programa. El borrador local debe acompañarse de una copia descargada en Archivos; el navegador puede liberar almacenamiento. El QR en nube necesita internet.
