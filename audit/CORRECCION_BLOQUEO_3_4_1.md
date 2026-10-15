# Corrección del bloqueo de recepción y auditoría de navegación — 3.4.1

## Reproducción y causa

Se reprodujo con el código publicado 380c65d en un navegador nuevo: acceso por formulario, abrir Recibir Celular, renovar QR, cerrar una vez y pulsar Entrega Digital. La misma ventana aparecía dos veces en modalFocusStack; después del cierre quedaba una entrada de una ventana oculta y el encabezado conservaba inert. La reproducción confirmó el bloqueo mediante un clic real que era interceptado por el fondo.

La auditoría anterior no cubría renovar y cerrar repetidamente la misma ventana. Las nuevas pruebas recorren esa secuencia y las ventanas superpuestas mediante controles reales.

## Cambios

- Apertura única por ventana, eliminación completa al cerrar y depuración de entradas ocultas. Restauración de inert y aria-hidden antes de aplicar la siguiente ventana activa. Orden visual, foco, Escape y Tab basados en la pila real.
- Conexión visible y cancelable, protección de solicitudes duplicadas y contra reapertura tardía. Reabrir conserva el QR y su bandeja; Renovar genera uno nuevo. Los errores no bloquean la navegación y el reintento queda disponible.
- Corrección del bloqueo entre recepción y el selector PDF. Eliminación del editor de perspectiva duplicado y sus identificadores repetidos; cierre explícito de un botón HTML incompleto.
- Cuenta/admin ahora es un botón accesible que abre ajustes. Instalación siempre tiene una acción: solicitud nativa cuando existe o ayuda cuando no está disponible. Se eliminaron instrucciones obsoletas de enviar el index.html aislado.
- La entrega evita solicitudes simultáneas, cancela resultados tardíos al cerrar o cambiar de trabajo y comunica fallos del PDF sin omitir silenciosamente la hoja solicitada.
- Avisos visibles dentro de la ventana activa. Recuperación con Esc, Alt + Mayús + R y botón en Auditoría, sin recargar ni borrar el proyecto ni eludir el acceso.
- Diagnóstico técnico local descargable: errores de ejecución, promesas, recursos, navegación y operaciones QR/PWA. Campos admitidos explícitamente, sin mensajes libres, nombres de clientes, imágenes, documentos, contraseñas ni URLs de sesión. Máximo 200 eventos, 14 días, alternativa en memoria si falla el almacenamiento. Identifica el sitio y la compilación cuando está disponible. No envía telemetría.
- Publicación coordinada con reintentos ante fallos temporales de conexión y verificación de las cuatro URL Firebase.

## Comprobaciones

Se conservan la regresión de edición, dimensiones reales del PDF, formato de entrega, perfiles, copias A/B, persistencia, respaldo y restauración atómica, vistas móviles, audio, uso sin conexión y actualización desde caché rota. Se agregaron pruebas de acceso real, cinco renovaciones seguidas y un cierre, cierre por fondo y Escape, PDF anidado, red lenta, error de red y reintento, solicitudes duplicadas, instalación aceptada/cancelada/fallida, todos los paneles de ajustes, descarga del diagnóstico, exclusión de datos privados, recuperación y fallo de almacenamiento.

Los tests anteriores que fijaban literalmente 3.4.0 ahora comprueban la versión del paquete; el simulador unitario de etapa 3 incorpora el evento de documento que existe en el navegador. No se retiraron comprobaciones funcionales.

Evidencia local: .audit/navigation-evidence y .audit/repair-evidence. Se repite la navegación en los sitios publicados. Sólo la nueva versión debe quedar activa en ambos sitios; la vista previa antigua se retira después de la publicación. El historial de Git se conserva para recuperación.

## Límites

La comprobación utiliza navegadores aislados y archivos sintéticos; las transferencias reales se prueban contra Firebase. Los flujos de instalación nativa se simulan para comprobar aceptación, cancelación y error; no se afirma haber instalado en todos los sistemas operativos. La cámara, impresora y teléfonos físicos siguen requiriendo comprobación con los equipos del propietario. Hostinger y el DNS del dominio personalizado quedan bajo su control por instrucción previa.

Se añadió test:delivery: generación real mediante los controles de Entrega Digital, QR leído por un decodificador independiente, descarga de frente/reverso y hoja en otro navegador y revocación. Se prueban JPG, PNG y PDF, cabeceras binarias, lectura de PDFs y límite de 600 píxeles en imágenes, usando el backend real y únicamente archivos sintéticos.

La prueba de entregas consecutivas descubrió un segundo fallo real: navegar a otro QR con la misma ruta y un fragmento distinto no vuelve a ejecutar el portal. Éste conservaba la escucha de la entrega revocada anterior y rechazaba aparentemente la nueva. Se añadió reinicialización al cambiar el fragmento en ambos portales móviles y al restaurar desde la caché de navegación, sin modificar el trabajo del mostrador. El rótulo móvil ahora indica correctamente que una entrega revocada ya no está disponible. La prueba recorre tres QR consecutivos en la misma pestaña sin recarga forzada desde el test. También se corrigió la etiqueta de versión antigua de ajustes.
