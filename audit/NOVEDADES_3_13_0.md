# RealScan Pro v3.13.0 — Añadidos 6–12 y cierre del paquete (22-oct-2026)

Continuación directa de v3.12.0 (`audit/ARREGLOS_AUDITORIA_3_12_0.md`): este
documento registra los añadidos 6 a 12, las decisiones de diseño tomadas y lo
que requiere acción del propietario. El semáforo de calidad del AÑADIDO 4.1,
que no había quedado integrado en el árbol, se implementa también en esta
versión (tira visible bajo cada miniatura, con reflejos y sombras del 9.1).

## AÑADIDO 6 — Aviso de respaldo
- La fecha del último respaldo exportado queda registrada
  (`realscan_last_backup_at_v1`) al completar cualquier exportación del
  historial (manual o del cierre diario, cifrada o en claro).
- En «Cierre diario» se muestra «Último respaldo: hoy / ayer / hace X días /
  nunca» y, si pasan N días (7 por defecto; configurable a 3/7/14/30) o nunca
  se hizo habiendo trabajos, un aviso ámbar descartable con el botón
  «Exportar respaldo ahora». Al descartarlo no reaparece hasta pasar otros
  N días. No bloquea nada.
- El texto distingue respaldo cifrado (copia completa) de archivado (7) y
  nube (8), que son complementos.

## AÑADIDO 7 — Archivado a Paperless-ngx / NAS
- `js/archive.js`: acción «Archivar» por trabajo y «Archivar pendientes» en
  lote. Genera el PDF final con el motor de la app sin perder el trabajo en
  curso (vuelca el borrador, restaura el trabajo, genera, recupera el
  borrador) con nombre `AAAA-MM-DD_tipo-documento_cliente_o_id.pdf` y un
  lateral `.json` con tipo, caras, fecha, operador, notas, folio y etiquetas
  sugeridas para la carpeta «consume» de Paperless-ngx o el NAS.
- En móvil sale por la hoja de compartir; en escritorio, por descarga (un
  ZIP en el archivado en lote). Cada trabajo queda marcado `archivado` con
  fecha y no se vuelve a exportar.
- Matiz: el PDF buscable con OCR se genera al vuelo en los trabajos de
  documento y no se almacena por trabajo; el archivado usa el PDF final de
  impresión de la app.

## AÑADIDO 8 — Guardado en Firebase
- `js/cloud-sync.js`, por REST (sin SDK nuevo, compatible con la CSP):
  metadatos en Realtime Database (`users/<uid>/scans/<id>`) y fotos en
  Firebase Storage (`users/<uid>/scans/<id>/<cara>.jpg`), del proyecto
  existente `fotos-cobertores-pro`.
- Identidad: la cuenta local se espeja en Firebase Auth como
  `<usuario>@realscan.local`. La vinculación es explícita y por equipo desde
  Ajustes: se pide la contraseña una sola vez; nunca se guarda —solo el
  token de refresco de Firebase—. Después, la copia es automática al
  guardar/borrar, al volver la conexión y al abrir la app. Local-first
  siempre: sin conexión se trabaja en IndexedDB y la nube se pone al día
  después.
- Transparencia: insignia por trabajo «Solo en este equipo» / «Subiendo…» /
  «Guardado en la nube ✓» / «Error de nube», línea de estado en el historial
  y en Ajustes, e interruptor de nube. Al detectar trabajos que están en la
  nube y no en el equipo, se ofrece recuperarlos (banner en el historial).
- Seguridad: `database.rules.json` gana la rama `users/<uid>` (solo el dueño
  lee/escribe lo suyo; se conservan intactas las reglas del relé) y se añade
  `storage.rules` con la misma política, referenciada desde `firebase.json`.
  La CSP añade `firebasestorage.googleapis.com` a `connect-src`.
- **Pasos de Paco (consola de Firebase, proyecto fotos-cobertores-pro):**
  1. Crear el bucket de Storage si aún no existe (Storage → Empezar). El
     código asume `fotos-cobertores-pro.appspot.com`; si el bucket tuviera
     otro nombre, basta con añadir `storageBucket` a
     `window.REALSCAN_FIREBASE_CONFIG` en `js/firebase-config.js`.
  2. Publicar las reglas: `firebase deploy --only database,storage` o pegar
     `database.rules.json` y `storage.rules` en la consola.
  3. Confirmar que Firebase Authentication está habilitado con el proveedor
     «Correo/contraseña» (la vinculación lo usa con correos internos
     `@realscan.local`).
  4. Revisar el plan y las cuotas (Storage/RTDB) según el volumen del
     negocio.
  Hasta completar esos pasos, la app lo indica con el estado «Error de nube»
  y sigue trabajando en local: nada se pierde.

## AÑADIDO 9
- **9.1 Reflejos y sombras:** `analyzeGlareShadow` en el motor analiza la
  captura por celdas 3×3 (quema localizada que contrasta con el resto /
  celda muy oscura en escena clara), baja el semáforo a ámbar como máximo y
  añade el consejo («Hay reflejo en la esquina…: inclina un poco el
  teléfono»). Repetir la foto es un toque (botones de cámara de la tarjeta).
- **9.2 Nombre por OCR:** `js/doc-identify.js` usa el OCR local (Tesseract,
  en el dispositivo) tras guardar, cuando el flujo pasa por los botones de
  guardar: extrae tipo (INE/DNI/pasaporte/licencia), nombre y número solo
  con palabras clave claras; propone el título «INE — Nombre Apellidos»
  (editable) y guarda los metadatos que alimentan la búsqueda del
  historial, el nombre de archivo del archivado (7) y la nube (8). Sin
  certeza, nombre genérico de siempre.
- **9.3 WhatsApp en un toque:** `js/share-delivery.js`: desde el resumen
  previo y desde cada trabajo del historial; comparte el PDF con la hoja
  del sistema (sin pedir el número) y, si el sistema no comparte archivos,
  abre la entrega digital/QR de la app o descarga el PDF.
- **9.4 Hoja de pasaporte:** en el resumen previo (categoría Fotos), botones
  «Hoja de 4» y «Hoja de 6»: aplican el formato oficial 35 × 45 mm
  (`photo_passport`; si el spec no coincide, tamaño personalizado 3,5 × 4,5
  cm), 4 o 6 copias de la misma foto y guías de corte, a escala real 1:1.

## AÑADIDO 10
- **10.1 Fondo blanco oficial:** botón «⬜ Fondo blanco» por cara (fotos):
  inundación desde los bordes con tolerancia de color sobre la imagen
  procesada; la original nunca se toca, se puede desactivar y comparar
  manteniendo pulsada la miniatura. Matiz honesto: es una aproximación
  clásica, muy buena con fondos uniformes (pared, fondo liso); la
  segmentación de personas con modelo de IA queda propuesta para la
  siguiente versión.
- **10.2 Tipo automático:** la misma identificación OCR muestra, solo con
  certeza, el aviso «Parece un INE. ¿Usar ese tipo y marco?» con un toque
  para aplicar y otro para descartar. Sin certeza no se preselecciona nada.
- **10.3 Aprobación del cliente:** botón «👀 Mostrar al cliente» en el
  resumen previo: la hoja a pantalla completa, limpia, con «✓ Aprobada» y
  «↺ Repetir foto» en grande, pensada para girar el equipo en el mostrador.
- **10.4 Folio y marca:** `RealScanFolio` en `js/export.js`: folio correlativo
  persistente (`F-000001`…) y nombre del negocio (Ajustes) estampados en el
  pie de la hoja de los PDF de entrega y de los JPG de hoja completa —
  nunca sobre el documento—; el folio queda en la bitácora y en el trabajo
  del historial (`lastFolio`, visible como insignia). Las fotos sueltas de
  la entrega digital llevan el folio en el nombre de archivo y en la
  bitácora, sin quemarlo en la imagen.

## AÑADIDO 11 — Temas y refresco visual
- `css/polish.css` + `js/theme.js`: cinco temas (Índigo, Esmeralda, Grafito,
  Burdeos, Océano) que recolorean el acento con variables CSS, se aplican
  al instante desde Ajustes (muestras circulares) y se recuerdan por
  equipo. Los estados (semáforo, Listo/error) conservan icono, texto y
  colores propios: no dependen del tema. Contrastes de texto ≥ 4,5:1 en
  todos los temas.
- Refresco: sombras suaves en tarjetas y hoja, tipografía suavizada,
  transiciones cortas en botones y foco visible con el color del tema. El
  modo oscuro de la app es independiente y no se toca.

## AÑADIDO 12 — Hermoso, amigable, proactivo
- **12.1 Micro-animaciones:** entrada suave de diálogos, transiciones del
  flujo guiado y marca de éxito animada (✓) al guardar y al completar la
  revisión de impresión; todo bajo `prefers-reduced-motion: no-preference`
  (si el sistema pide reducir movimiento, no hay animaciones).
- **12.2 Iconografía:** se mantiene y unifica el sistema de iconos emoji de
  la app en las acciones nuevas (📥 archivar, 📲 WhatsApp, ☁️ nube, 🛡️
  respaldo, 🎨 temas, 🎓 guía), coherente con las existentes.
- **12.3 Lenguaje humano:** los errores nuevos (y el de exportación de
  respaldo) se muestran en español claro y accionable; los códigos técnicos
  quedan en consola/bitácora, no en la cara del operador.
- **12.4 Bienvenida:** guía de 3 pantallas (Tipo → Fotos → Imprimir/
  Entregar). No asalta al entrar: su invitación aparece en el panel «Hoy»
  hasta que se ve una vez (y siempre desde Ajustes, «🎓 Ver la guía de
  bienvenida»). La primera implementación la abría sola al entrar y la
  suite de regresión demostró que bloqueaba el flujo; quedó corregido.
- **12.5 Deshacer/confirmación:** verificado el mapa de acciones
  destructivas: eliminar del historial confirma con diálogo propio, el
  editor tiene Deshacer/Rehacer por instantáneas, vaciar el taller y los
  restablecimientos confirman, y el fondo blanco/OCR son reversibles o
  editables.
- **12.6 Panel «Hoy»:** al entrar, tarjeta cerrable (por día) con lo
  accionable: trabajos sin archivar, respaldo antiguo o inexistente,
  impresora sin perfil de calibración y nube sin vincular — cada renglón
  con su botón directo. Sin ventanas emergentes.
- **12.7 Reflejo en vivo:** el análisis de la cámara (`RealScanCapture`)
  expone `glareZone`; la línea de calidad avisa «Reflejo detectado: inclina
  el teléfono» mientras se apunta, antes de disparar.
- **12.8 Costumbres:** se cuenta el uso de tipos de documento (total y por
  hora) y, si aún no hay un último tipo recordado, se preselecciona el más
  usado (o el de la franja horaria, con al menos 3 usos). Cuando el OCR
  reconoce un nombre ya presente en el historial, lo sugiere («¿El mismo
  cliente de la vez pasada?»): no se copia ni se rellena ningún dato sin
  que el operador actúe.

## Verificación
- `npm run check` y `npm run build` en verde sobre el árbol final.
- `npm run verify` del repo sobre este código: 95 PASS seguidos, incluidas
  las suites de autenticación, regresión principal, diseño de fotos,
  flujos móviles, auditoría funcional, mostrador, trayecto, navegación,
  captura, captura iPhone (Chromium y WebKit), documento con OCR y borrador
  local. La propia verificación cazó y obligó a corregir dos regresiones
  de este paquete (la guía de bienvenida que se abría sola bloqueando
  clics, y las insignias del historial definidas en la función equivocada).
  El resto de suites (practical, upgrade y legacy) no pudo completarse en
  esta pasada: a mitad de la verificación la máquina virtual de pruebas se
  reinició y su runtime de navegador quedó inservible (ambos Chromium,
  headless y completo, mueren con SIGTRAP al arrancar). En la pasada de
  v3.12.0, con el mismo código de suites, upgrade y legacy pasaron enteras
  y de practical solo quedó sin ejecutar el apretón WebRTC P2P.
- Las piezas puras nuevas sí quedaron verificadas por unidad (Node):
  extracción OCR (INE/DNI/pasaporte), nombre y lateral del archivado,
  folio correlativo y su estampado, y las reglas de la nube.
- La sonda de navegador de funciones (`.audit/probe-613.cjs`, fuera del
  repo: temas con capturas, recordatorio, archivado real, nube con REST
  simulado, compartir, fondo blanco, hoja de pasaporte, aprobación del
  cliente) quedó escrita pero no ejecutable por el mismo motivo ambiental;
  debe correrse en el primer entorno sano disponible.
- Conocido y ajeno a este paquete: la sección P2P WebRTC de
  `practical-regression` no puede ejecutarse en la VM de pruebas (su
  Chromium headless no genera candidatos ICE; probado con sonda cruda sin
  código de la app). Este paquete no toca `js/local-transfer.js`.
