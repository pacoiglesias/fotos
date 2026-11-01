# Entrega verificada de RealScan Pro 3.36.1

Estado: **publicada y verificada en ambos Firebase y en el dominio habitual**. Comprobación pública: 1 de noviembre de 2026, 2:39 p.m., hora de Ciudad de México.

- Código publicado: `ee187d4450d3abdece84fdedee8a896922d6390b`.
- Contenido compilado: `realscan-ed88608a60ea8802`, 360 archivos.
- Integración: [PR #16](https://github.com/pacoiglesias/fotos/pull/16), merge `5a5c1b8b8b4b4c8f429d3012c061f9bcc9c9e236`.
- npm ci finalizó: 101 paquetes, 0 vulnerabilidades informadas.
- npm run publish finalizó con código 0 tras la verificación completa y los dos despliegues. Registro local ignorado: `.audit/publish3361-final.log`.
- 442 marcas PASS y 0 FAIL. Incluyen comprobaciones repetidas de publicación y no equivalen a casos únicos.
- [CI del código](https://github.com/pacoiglesias/fotos/actions/runs/41322251982), [CI de la integración](https://github.com/pacoiglesias/fotos/actions/runs/41323516796) y [CI de la fuente publicada](https://github.com/pacoiglesias/fotos/actions/runs/41346099165): aprobados.

## Publicación comprobada

Se compararon appVersion, identificador de contenido y sourceCommit de version.json, la política CSP y las huellas SHA-256 de los archivos indicados en cada dirección:

| Dirección | Versión | Archivos con huella coincidente |
| --- | --- | --- |
| [fotos-cobertores-pro.web.app](https://fotos-cobertores-pro.web.app) | 3.36.1 | 64 |
| [fotos-cobertores-pro.firebaseapp.com](https://fotos-cobertores-pro.firebaseapp.com) | 3.36.1 | 64 |
| [fotos-cobertores.web.app](https://fotos-cobertores.web.app) | 3.36.1 | 64 |
| [fotos-cobertores.firebaseapp.com](https://fotos-cobertores.firebaseapp.com) | 3.36.1 | 64 |
| [fotos.cobertores.com](https://fotos.cobertores.com) | 3.36.1 | 64 |

Evidencia local ignorada: `.audit/publicacion-3361-verificada.json` y `.audit/publicacion-3361-verificacion.log`. Son 320 comprobaciones de archivos en total, además de los metadatos y la CSP.

## Alcance y pendientes

- Aplicado: continuar solo con frente desde preparación y revisión, conservar originales/papel/juegos, sincronizar el perfil en todas las vistas, corregir Reintentar y mejorar la jerarquía visual.
- El publicador final repitió la simulación con 32 trabajos por motor. La validación anterior ejecutó 160 en Chromium y 160 en WebKit; su evidencia se conserva en `.audit/stage-completion-3361-160.json`. Son pruebas sintéticas, no una certificación de jornada completa ni de dispositivo físico.
- La medición física de la HP, el dúplex físico y la prueba con iPhone real siguen pendientes por indicación del usuario. Seleccionar la HP no equivale a una medición física.
- Las seis propuestas siguientes permanecen separadas de lo implementado en [la revisión](REVISION_3361.md).

## Antecedente resuelto

El cierre posterior de estos registros solo modifica documentación. No cambia el compilado ni constituye otro despliegue; la fuente publicada sigue siendo la indicada arriba.

El primer intento completó las pruebas y se detuvo por sesión Firebase caducada antes de publicar; las cinco direcciones seguían en 3.36.0. El usuario completó el acceso oficial de Google y se comprobó el permiso sobre ambos sitios. Un intento intermedio se detuvo por la captura de evidencia de WebKit en Windows; se corrigió la espera de geometría sin retirar las aserciones funcionales y se volvió a ejecutar el publicador completo. Ambos bloqueos están resueltos; no se compartieron credenciales en los registros de entrega.
