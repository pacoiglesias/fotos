# Qué pasa si el puesto se cierra o se bloquea a mitad de una entrega (E4)

## Aviso antes del bloqueo por inactividad

Cuando hay una entrega digital activa, el mostrador avisa un minuto antes
de bloquearse (30 segundos si el bloqueo está configurado a 1 minuto).
El aviso ofrece dos opciones:

- **Mantener la entrega abierta**: rearma el temporizador de inactividad y
  cierra el aviso. Cualquier actividad en el puesto también cierra el aviso
  y rearma el temporizador.
- **Bloquear ahora**: bloquea la sesión de inmediato.

Sin entrega activa, el bloqueo sigue siendo silencioso, como antes.

## Si el puesto se bloquea por inactividad (sin cerrarse)

El bloqueo solo limpia el token de sesión y muestra la pantalla de acceso;
**no borra la entrega**. Al desbloquear, la entrega sigue visible en el
mostrador si no ha caducado. Las entregas caducan por tiempo: el mostrador
muestra los minutos restantes (la transferencia local usa 15 minutos).
Si la entrega caduca mientras el puesto está bloqueado, hay que generarla
de nuevo.

## Si el puesto se cierra o se recarga a mitad de una entrega

La sesión de entrega vive **solo en memoria** (`js/qr-sync.js`, variable
`delivery`, vía `RealScanRelay`). Cerrar o recargar la pestaña pierde el
manejador de esa sesión desde el mostrador: ya no se puede mostrar el QR
ni revocarlo desde el puesto. En ese caso, lo seguro es generar una
entrega nueva desde el trabajo actual.

Lo que **no** se pierde al cerrar el puesto:

- La cola de trabajos (`realscan_queue_v1` en IndexedDB, 48 horas).
- El historial del mostrador (`realscan_print_desk_v1`: registro 31 días,
  copias de impresión 48 horas).
- Los borradores de recuperación (`realscan_recovery_v1`) y la captura
  staged de «Escanear primero» (24 horas, ver Q7).

En resumen: el trabajo siempre se conserva; lo único que se pierde al
cerrar el puesto es la sesión de entrega en curso, que se regenera desde
el trabajo guardado.
