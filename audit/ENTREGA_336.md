# Entrega verificada de RealScan Pro 3.36.0

Estado: **software publicado y verificado; pruebas físicas posteriores**. Última comprobación pública: 1 de noviembre de 2026, 7:56 a.m., hora de Ciudad de México.

- Código compilado: `09743c6be291da54c386652a31ebc52345cab0f1`.
- Identificador de contenido: `realscan-eae2eb5df9ea7418`.
- Integración en main: `2efb151432cfe6f86b00b476407d9014d3d88d11`, [PR #15](https://github.com/pacoiglesias/fotos/pull/15), integrado.
- Dependencias: npm ci finalizó; 101 paquetes añadidos y 0 vulnerabilidades informadas.
- Publicación oficial: npm run publish finalizó con código 0, después de ejecutar la batería completa. Registro: 437 marcas PASS, 0 marcas FAIL y ninguna suite fallida; incluye comprobaciones de publicación repetidas, no un recuento de casos únicos.
- El compilado contiene 360 archivos. Se comprobaron versión, fuente, política CSP y huellas SHA-256 de 63 archivos por dirección: 315 comprobaciones de archivos en total.

## Direcciones comprobadas

| Dirección | Versión | Archivos con huella coincidente |
| --- | --- | --- |
| [fotos-cobertores-pro.web.app](https://fotos-cobertores-pro.web.app) | 3.36.0 | 63 |
| [fotos-cobertores-pro.firebaseapp.com](https://fotos-cobertores-pro.firebaseapp.com) | 3.36.0 | 63 |
| [fotos-cobertores.web.app](https://fotos-cobertores.web.app) | 3.36.0 | 63 |
| [fotos-cobertores.firebaseapp.com](https://fotos-cobertores.firebaseapp.com) | 3.36.0 | 63 |
| [fotos.cobertores.com](https://fotos.cobertores.com) | 3.36.0 | 63 |

Todas coinciden en identificador de contenido y commit fuente. Las marcas de tiempo de compilación pueden diferir entre los predeploy de cada proyecto; se verificó el contenido servido.

## Verificación del código

- [CI del push](https://github.com/pacoiglesias/fotos/actions/runs/41273432565): correcto.
- [CI del PR](https://github.com/pacoiglesias/fotos/actions/runs/41273435214): correcto.
- [CI de main integrado](https://github.com/pacoiglesias/fotos/actions/runs/41274036935): correcto.
- Regresiones de geometría, impresión, importación de INE/PDF, originales, firmas y sellos, cantidades, recuperación, cambios de cliente, navegación, modo sin conexión y privacidad.
- Paperless: pruebas automatizadas de origen fijo, límite de 30 MB, sesión, metadatos, tareas y prevención de duplicados. Las respuestas de API de esas regresiones son simuladas; no se enviaron documentos personales al NAS durante esta fase.

## Simulación de uso repetido

Se ejecutaron 160 ciclos de carga y revisión por navegador, seguidos de limpieza del trabajo. El tiempo de arranque incluye el acceso automatizado y no representa una medición pura de primera pintura.

| Navegador | Ciclos | Elementos antes/después | Heap antes/después | Duración de los ciclos |
| --- | --- | --- | --- | --- |
| chromium | 160 | 3172 / 3146 | 7.36 / 7.30 MiB | 43.5 s |
| webkit | 160 | 3172 / 3146 | No disponible en esta prueba | 167.4 s |

Se comprobó la liberación de la imagen del visor y la ausencia de diálogos abiertos tras limpiar. Esta simulación no certifica una jornada completa con documentos reales, 60 FPS sostenidos ni conformidad WCAG AA completa.

## Limpieza del repositorio

- Retirados 18 PNG/JSON generados de auditorías anteriores, 1.969.410 bytes. Sus scripts escriben ahora en .audit/, ignorado por Git.
- Tres informes históricos de raíz conservados en audit/archivo/ e identificados como históricos.
- Conservados código, pruebas, recursos, licencias, documentación útil e historial de Git. No se incorporaron documentos personales, credenciales, node_modules, dist ni registros locales al commit.
- La limpieza de la rama integrada se registra en el PR tras comprobar su punta y su inclusión en main; no se eliminan ramas con avances nuevos ni respaldos necesarios.

## Pendiente por acuerdo con el usuario

El plan de software está aplicado. Las pruebas físicas se harán después: medir las reglas horizontal y vertical de 50 mm en la HP LaserJet CP1025, comprobar reinserción dúplex y usar un iPhone real. El perfil no se marca verificado sin medir. Las opciones de trabajo y las direcciones públicas se conservan para esa comprobación.

Evidencias completas locales, ignoradas por Git: .audit/publish336-complete-stages.log, .audit/publicacion-336-verificada.json y .audit/stage-completion/results.json. Las comprobaciones no acreditan operaciones reales de NAS o hardware que no se hayan ejecutado.
