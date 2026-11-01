> Registro histórico. No describe la versión actual. Consulta [el sistema vigente](../SISTEMA_REALSCAN.md) y [el plan actual](../../PLAN_MEJORAS.md).

# Auditoría independiente de RealScan

Fecha: 14 de octubre de 2026. Alcance: código local y navegador de prueba Chromium; no se modificó la implementación ni se desplegó a producción.

## Método y límites

Se leyeron index.html, styles.css y los módulos de configuración, aplicación, imagen, PDF, exportación, autenticación y almacenamiento, además del service worker, manifiesto y documentación. Se ejecutó la copia local con viewport de 1440 × 1000 y 390 × 844. Se inspeccionaron las capturas completas y se comprobó el modo de hojas separadas. Se simularon en memoria las instrucciones de dibujo del generador PDF para verificar marcas y límites de página.

Evidencia: `.audit/desktop.png`, `.audit/mobile.png`, `.audit/results.json` y `.audit/inspect.cjs`. La sesión de prueba fue nueva y temporal. Los únicos accesos fueron al servidor local y las dependencias públicas que carga la aplicación. No se probó impresión física, cámara, Safari/iOS, descarga final de PDF/JPG ni funcionamiento sin red. No debe interpretarse la ausencia de errores en el recorrido inicial como validación de todos los flujos.

La herramienta de navegación integrada agotó su tiempo de respuesta; la revisión visual se completó con Chromium de prueba. La revisión automática rechazó un caso que alteraba credenciales y guardaba un registro sintético por riesgo de modificar datos locales. Esas operaciones se retiraron; los hallazgos de acceso y almacenamiento se fundamentan en lectura de código, no en ejecución de esos casos.

## Diagnóstico

La aplicación tiene funciones útiles y un propósito claro, pero presenta un flujo excesivamente largo, con demasiadas señales visuales compitiendo y una vista previa que no representa fielmente todos los resultados. La mejora debe combinar rediseño del área de trabajo, corrección de exportaciones y persistencia, y aclaración del modelo de acceso y privacidad.

## Hallazgos reproducidos

| Prioridad | Hallazgo | Evidencia | Corrección requerida |
|---|---|---|---|
| Alta | Desbordamiento horizontal móvil | A 390 px, el documento mide 534 px de ancho; captura y results.json | Localizar los elementos que desbordan y eliminar mínimos rígidos, textos sin ajuste y columnas incompatibles. Verificar 360/390/768 px. |
| Alta | Vista previa incorrecta para hojas separadas | Al elegir both_separate, se ven las dos caras en una sola hoja y el texto dice «Anverso y Reverso alineados en 1 sola hoja A4». js/app.js:643 | Usar un modelo común de paginación y permitir recorrer todas las páginas. |
| Alta | Hoja limpia conserva marcas | Con regla y rótulos desactivados, generatePdfDoc emite 1 rectángulo y 8 líneas de corte para un documento de una cara. js/pdf.js:278 | Controlar encabezados, rótulos, regla, bordes y marcas por separado; preset limpio debe excluir todas las anotaciones. |
| Alta | Duplicados pueden salir del papel | Con formato personalizado 80 × 100 mm, cuatro caras y duplicado, el dibujo llega a y=462 mm en A4 de 297 mm, sin añadir página. js/pdf.js:200 | Validar ancho y alto útil; paginar o impedir combinaciones imposibles con explicación concreta. |
| Media | Flujo inicial excesivamente largo | Escritorio 3706 px de alto, móvil 4846 px; 43 botones visibles en el estado inicial de escritorio | Reorganizar en área de trabajo, opciones esenciales primero, edición contextual y controles avanzados plegables. |
| Media | Vista previa pequeña y poco útil para editar | Hoja de 320 px y frente de 117.39 px en escritorio; index.html:1205 | Ampliar el área de trabajo, zoom de visualización independiente del zoom de imagen, encaje y navegación de páginas. |

No se detectaron excepciones JavaScript en el recorrido inicial y la selección de modo. Esto no cubre todos los escenarios.

## Hallazgos confirmados por código

1. **Acceso: prioridad alta.** js/auth.js:314–330 mantiene un PIN maestro 1313 para administradores y puede sustituir una contraseña personalizada por el hash predeterminado. js/auth.js:397 acepta también 2026 para autorizar cambios. El bloqueo y los usuarios viven en localStorage; no existe una frontera de autorización de servidor. Las funciones de alta y eliminación no comprueban el rol del usuario activo. El uso de SHA-256 no convierte este modelo en autenticación robusta. Eliminar accesos maestros, aplicar permisos en las operaciones y definir explícitamente si se desea bloqueo local o cuentas reales. No introducir infraestructura nueva sin necesidad de producto.

2. **Contenido del historial: prioridad alta.** js/storage.js:300 y 405 construyen HTML con título, id, miniatura y fecha provenientes de registros. El título se interpola en atributos y contenido sin escapar. importScansFromJson (línea 567) admite objetos con validación mínima y store.put puede sobrescribir ids existentes. Hay una vía de inyección de contenido con posible XSS; no se ejecutó una carga maliciosa. Usar textContent/DOM seguro, validar esquema, tipos, URLs de imagen, tamaño y conflictos de importación.

3. **Persistencia incompleta: prioridad alta.** El record de js/storage.js:77 no contiene papel, cantidad de copias, mezcla, medida personalizada, orientación, modo de distribución, duplicado, rótulos, regla ni título de documento. Se guardan imágenes procesadas y se restauran como originalSrc junto con rotación/zoom/filtro anteriores (línea 221), lo que puede reaplicar transformaciones al volver a editar. Restaurar tampoco reinicia todas las ranuras y propiedades. Guardar proyecto completo, conservar original y edición por separado y migrar registros anteriores.

4. **JPG diverge del PDF: prioridad alta.** downloadA4Image (js/export.js:117) genera una sola imagen; documentos solo dibuja front y back si printMode==='both'. Omite page3/page4, both_separate y duplicados. Fotos recorta silenciosamente las que exceden el límite inferior. La posición inicial también difiere del PDF. Debe compartir composición/paginación con PDF y vista previa y entregar todas las páginas o explicar la limitación antes de exportar.

5. **Escala de la vista previa: prioridad alta.** js/app.js:738 calcula el ancho sobre 210 mm incluso con Carta/Oficio/Legal y lo limita a un mínimo de 38%. Los tamaños pequeños quedan exagerados; además se calcula sobre el área interior de una hoja con padding. No es una reproducción geométrica fiel del PDF. Escalar todas las posiciones desde milímetros y el ancho real del papel. No prometer tamaño físico real en una pantalla sin calibración.

6. **Comprobación previa superficial: prioridad media.** js/app.js:816 anuncia siempre «1:1 Real (300 DPI)». Cuenta una sola imagen en modo fotos aunque se requieran dos personas. No valida geometría, recortes, desbordamiento, resolución efectiva ni coherencia de páginas. Separar dimensiones de exportación, calidad de origen y calibración física de impresora.

7. **Procesamiento asíncrono: riesgo a verificar.** renderProcessedImage crea un Image por edición y publica su resultado en onload; no devuelve una promesa ni invalida resultados viejos. Hay recorridos que muestran éxito antes de terminar la decodificación. La exportación inmediata podría utilizar una imagen anterior. Añadir estado de procesamiento y control de revisiones; comprobar edición rápida seguida de exportación.

8. **Autoajuste: prioridad media.** autoEnhanceActiveSlots reinicia rotación, zoom y paneo, activa la bandera de recorte y puede cambiar el filtro a scanner. No implementa por sí mismo todas las mejoras de luz/nitidez descritas por el mensaje. Revisar su efecto sobre orientación y permitir comparar/deshacer. No anunciar capacidades que no se verifican.

9. **Modo sin red: riesgo a verificar.** sw.js omite auth.js y storage.js del precache. cache.addAll agrupa recursos locales y CDN y el catch describe incorrectamente un precache «parcial»; un fallo puede impedir esa precarga. Revisar caché coherente, dependencias locales, actualización de versión y primera recarga sin red. No se efectuó una prueba offline.

10. **Accesibilidad: prioridad media.** openModal enfoca el primer control pero no implementa un ciclo de Tab ni vuelve inerte el fondo. Hay texto funcional de 9–11 px, controles compactos y etiquetas de iconos que necesitan revisión. Verificar teclado, lectores de pantalla, contraste, movimiento reducido y objetivos táctiles de al menos 44 px como objetivo de diseño.

11. **Coherencia: prioridad baja.** Cabecera v3.2.0, pie v3.0.0, login v2.4.1 y ajustes v2.4.0. README apunta a fotos-cobertores, .firebaserc a fotos-cobertores-pro. Numerosos textos siguen diciendo A4 al seleccionar otro papel. Corregir desde una única fuente y separar documentación histórica de resultados de validación actuales.

## Dirección visual recomendada

En escritorio, usar una zona de configuración/archivos y otra más amplia con editor y páginas finales. En móvil, flujo por etapas con resumen y una acción principal accesible. Elegir primero el tipo de trabajo y luego mostrar únicamente sus opciones. Separar «editar imagen» de «componer hoja» y distinguir zoom visual de escala de salida.

Definir tipografía legible, espacios consistentes, superficies claras, un color principal y estados semánticos sobrios. Reservar color y énfasis para selección, acción principal y advertencias. Reducir insignias, emojis, mensajes repetidos y sombras. Reemplazar la acumulación de acciones de cabecera/HUD/paso final por acciones contextuales. Mantener las funciones útiles; no eliminar capacidades para simplificar la pantalla.

## Validación exigida a la siguiente implementación

- Documentos: una cara, dos juntas, dos separadas, tres y cuatro páginas, duplicados y formatos personalizados que caben/no caben.
- Fotos: una/dos personas, cantidades pares/impares y superiores a capacidad, formatos rectangulares/ovalados.
- Papel: A4, Carta, Oficio México y Legal; geometría en mm igual en vista previa, PDF y JPG.
- Hoja limpia sin ninguna anotación; hoja estándar con controles independientes.
- Guardar/restaurar en otra configuración conserva originales, edición, papel y composición; migración de registros antiguos y JSON inválido sin pérdida de datos.
- Cambiar credenciales sin que el PIN antiguo siga entrando; permisos de operador y administrador según el modelo elegido.
- Navegador: teclado/modales, móvil sin desbordamiento, errores de archivo/cámara/cuota, procesamiento rápido y prueba offline.
- Impresión física: medir regla de 50 mm imprimiendo al 100%; registrar impresora, papel y configuración. No afirmar validación física sin realizarla.

Entregar cambios implementados, capturas antes/después, defectos corregidos con evidencia, comprobaciones realizadas y pendientes concretos.
