> Registro histórico. No describe la versión actual. Consulta [el sistema vigente](../SISTEMA_REALSCAN.md) y [el plan actual](../../PLAN_MEJORAS.md).

# Validación de RealScan 3.4

Fecha: 14 de octubre de 2026.

La matriz de aprobación anterior no detectó que `app.js` contenía un error de sintaxis. Esta revisión sustituye ese cierre con pruebas del producto compilado. Los resultados no se deducen contando funciones o textos presentes en el código.

| Comprobación | Resultado observado |
|---|---|
| Sintaxis de módulos, scripts e instrucciones inline | Correcta |
| Autenticación local, sin contraseñas maestras ni reinicio silencioso | 4 comprobaciones correctas |
| Suites existentes, actualizadas a la arquitectura actual | 12 de 12 correctas |
| Escenarios del navegador compilado con transferencia Firebase real | 19 escenarios correctos; sin errores JavaScript no capturados |
| Reglas desplegadas, incluyendo caducidad por reloj del servidor | 14 comprobaciones correctas |
| Auditoría de dependencias de producción | 0 avisos conocidos en la ejecución de `npm audit` |
| Actualización de un navegador con caché antigua rota | Recuperación automática comprobada, sin borrar almacenamiento de usuario |

La prueba de navegador cubre inicio limpio; borrado/reemplazo simultáneo y cambio de trabajo; carga de caras; escala medida en las transformaciones del PDF real; JPG/PNG/PDF y límite de píxeles; lectura del QR con un decodificador independiente; proyectos, presets, borrador y respaldo con 3A/5B y recortes; separación entre guías y píxeles exportados; selección PDF multipágina; pantallas de 360, 390 y 768 px; volumen cero; navegación offline después de visitar el teléfono; recepción real entre dos contextos independientes; reintentos; entrega y revocación.

Las reglas se probaron contra accesos sin autenticación, listados autenticados, identificadores incorrectos, noveno archivo, formato inválido, tamaño fuera de límite, auto-confirmación por el emisor, borrado ajeno y acceso/envío después de caducar.

## Reproducción

```sh
npm ci
npx playwright install chromium
npm run verify
```

Activa `REALSCAN_TEST_RELAY=1` para incluir Firebase real. Ejecuta `npm run test:rules` para repetir la comprobación de reglas. La evidencia local queda en `.audit/repair-evidence/`; `live-regression.json` conserva la ejecución con Firebase, aunque una suite posterior repita solo las pruebas locales. `.audit/results.json` contiene mediciones reales y el identificador del build para las pruebas heredadas de interfaz.

## Límites pendientes de validación física

- Escanear el QR y enviar archivos desde los teléfonos reales del negocio, incluyendo iPhone/Safari y Android.
- Probar permisos de cámara y captura con el hardware utilizado.
- Imprimir con el papel/controlador definitivos y medir tarjeta, fotos y regla.
- Comprobar manualmente encuadre, fondo, parecido y requisitos del trámite. No se garantiza aceptación oficial.

No se certifica ausencia universal de defectos, compatibilidad con todo dispositivo ni conformidad WCAG completa a partir de estas pruebas.

## Cierre operativo posterior

Panel diario con respaldo y verificación sin escritura; importación atómica con prueba de reversión; hoja PDF con regla y tarjeta/foto en cuatro papeles. Se añadieron pruebas de descarga real, restauración en navegador limpio, corrupción y fallos de almacenamiento. Flujo de publicación conjunto para los sitios fotos-cobertores-pro y fotos-cobertores, con comparación de versión y commit en sus cuatro URL Firebase. Clave pública limitada a dos API y alerta GitHub revisada y resuelta. Consulta audit/CIERRE_OPERATIVO_2026-10-14.md. El propietario realizará la medición impresa y configurará Hostinger posteriormente.
