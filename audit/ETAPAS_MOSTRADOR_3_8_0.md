# Atención de mostrador — RealScan 3.8.0

Fecha: 16 de octubre de 2026. Punto de partida: auditoría `AUDITORIA_FLUJO_MOSTRADOR_3_7_1.md`, código `a9a60a7`. Este documento describe la primera entrega por etapas de esa propuesta; no declara terminada la ampliación completa.

## Etapa 1 — Fiabilidad operativa

- La visibilidad de reverso y páginas sigue los destinos que realmente utiliza el motor de composición. El reverso permanece accesible al volver desde fotografías a un documento en hojas separadas.
- La bandeja del celular deja de ofrecer páginas 3 y 4 para una planilla fotográfica. Solo ofrece personas con copias activas. «Añadir segunda persona» activa sus copias y el destino visible. En documentos, «Añadir reverso» activa también esa cara en la salida.
- «Descargar archivo recibido» distingue el archivo recibido del original existente en el teléfono.
- El selector de páginas PDF aplica la misma política: en fotos ofrece solo personas con copias, y asignar un reverso a un documento activa esa cara. Se revisaron estas rutas alternativas además de la bandeja QR.
- El móvil permite elegir entre optimizar imágenes a JPG, hasta 3000 px, o conservar bytes, formato y resolución de JPG/PNG/WebP. Los PDF se conservan. La elección explica el tratamiento de metadatos. Cada archivo muestra su preparación y dimensiones. Restaurar un PNG después de editarlo recupera sus bytes y su MIME, sin etiquetarlo erróneamente como JPEG.
- Un archivo conservado de más de 6 MB se rechaza con una explicación; no se comprime silenciosamente. Se mantienen los límites de 8 archivos y 60 megapíxeles decodificados.
- La limpieza de recepción vacía la bandeja inmediatamente y las sesiones nuevas esperan a que termine el cierre anterior. Se añade la opción interna de conservar una entrega al cambiar de trabajo, utilizada por la etapa 2.
- Antes de generar otra entrega digital se advierte que sustituirá el QR vigente. Cancelar conserva el enlace anterior.

## Etapa 2 — Inicio del servicio y navegación

- Cabecera con «Nuevo servicio», «Recibir por QR», «Entrega digital» y «Más opciones», con nombres visibles y superficies táctiles amplias en móvil.
- Historial, favoritos, instalación, cuenta, tema, ajustes, salida y ayudas quedan en «Más opciones». Se conserva el sistema de ventanas, foco, teclado y recuperación de controles.
- El servicio se prepara eligiendo necesidad, origen y salida. Las opciones corresponden a capacidades existentes: identificación, fotos, pasaporte y medidas personalizadas. No se anuncia un editor general de documentos largos.
- Nuevo servicio restaura papel A4, escala 100 %, copias iniciales, guías y orientaciones iniciales. «Repetir configuración» conserva explícitamente opciones del servicio, sin fotos ni nombre del cliente. Si hay imágenes o archivos recibidos, exige confirmar que el trabajo actual puede limpiarse.
- El operador puede conservar el QR anterior mientras prepara al siguiente cliente. Una franja muestra caducidad y permite volver a ver ese QR, abrirlo o finalizarlo. Sigue existiendo **una sola entrega activa por puesto**, hasta 15 minutos y mientras el puesto permanezca conectado; no se promete una cola de entregas simultáneas.
- El destino de salida elegido orienta el acceso principal a revisión de impresión o entrega digital. Los formatos y controles existentes continúan disponibles; todavía no se oculta toda la configuración de impresión en servicios digitales.
- El servicio actual y el siguiente paso quedan visibles. Los textos del papel y las descargas dejan de asumir siempre A4. Se comprueban anchos de 360, 390, 768 y 1440 px y presentación clara/oscura.
- El diagnóstico incorpora el evento de nuevo servicio con categorías cerradas de servicio, origen y salida; no registra nombres, imágenes, números ni enlaces secretos.

## Verificación y evidencia

Verificación inicial: 106 comprobaciones PASS y código 0 antes de los últimos ajustes de presentación: geometría de fotos (1248 combinaciones), proporciones y guías en PDF/raster, navegación, cuotas de borrador, cancelaciones, OCR local, WebRTC offline, transferencia real Firebase y entrega real JPG/PNG/PDF. Se añadieron pruebas de regresión de mostrador integradas en `scripts/verify.cjs`.

Las 15 pruebas nuevas de mostrador terminaron con código 0 sobre la compilación revisada. Cubren: inicio de sesión; dos clientes sucesivos; conservación y revocación de QR; cancelación durante limpieza; rechazo de destinos no impresos; conservación exacta de PNG y restauración después de editar; optimización proporcional y límite de peso; navegación de «Más opciones» y ventanas sin bloqueo.

La batería completa se repite desde el commit de entrega antes de publicar. Su resultado y la correspondencia entre Git, publicación y respaldo quedan registrados en el manifiesto local. Evidencias locales: `.audit/counter-regression/results.json`, capturas en esa carpeta, `.audit/verify-3.8.0.log`, `.audit/repair-evidence/final-sites.json` y manifiesto de respaldo. Los archivos de evidencia usan material sintético. El manifiesto relaciona commit, huella publicada y archivos respaldados; los cuatro alias Firebase deben coincidir con `dist/version.json`.

## Etapa siguiente — Pendiente

1. Revisión común para galería, cámara nativa y cámara asistida, con confirmación explícita antes de asignar o enviar y sin aplicar perspectiva de documento a retratos.
2. Lista ordenada de documentos generales de seis o más páginas. Actualmente el editor compone hasta cuatro destinos; importar un PDF de hasta 40 páginas permite elegir páginas, no equivale a editar sus 40 páginas completas.
3. Separación más profunda entre salida digital y preparación de papel, con opciones contextuales y menos desplazamiento.
4. Prueba de operación en el teléfono y la impresora reales: enfoque, lectura de textos pequeños, papel y tamaño medido con regla. La emulación de navegador no certifica la óptica ni el tamaño físico impreso.

No se modifica DNS, facturación, visibilidad del repositorio ni otros sitios Firebase. No se borran trabajos del navegador para resolver problemas. La copia histórica anterior se conserva hasta verificar código, publicación y respaldo de esta entrega.
