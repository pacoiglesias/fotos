# Estado de RealScan Pro 3.36.1

Estado: **código verificado e integrado; despliegue pendiente de autenticación**. No se declara una nueva publicación.

- Código verificado: `32d12db5c0a9848897e3f9b02ad720de83102464`.
- Compilado preparado: `realscan-fe6b11373aef770f`, 360 archivos.
- Integración: [PR #16](https://github.com/pacoiglesias/fotos/pull/16), merge `5a5c1b8b8b4b4c8f429d3012c061f9bcc9c9e236`.
- Dependencias exactas instaladas con npm ci: 101 paquetes, 0 vulnerabilidades informadas.
- El publicador oficial ejecutó la verificación completa, incluida compilación, Playwright, comprobación de contenido/CSP y simulación de 160 trabajos por motor: 441 marcas PASS, 0 FAIL. Incluye comprobaciones repetidas de publicación; no es un recuento de pruebas únicas.
- [CI del código](https://github.com/pacoiglesias/fotos/actions/runs/41322251982) y [CI de main integrado](https://github.com/pacoiglesias/fotos/actions/runs/41323516796): aprobados.
- La primera operación de despliegue se detuvo con «Your credentials are no longer valid». npm run publish terminó con código 1. El registro local ignorado es `.audit/publish3361-complete-r2.log`.
- Se inició la renovación mediante el acceso oficial de Google en Chrome. Se necesita completar el inicio de sesión en esa ventana; no se deben compartir contraseñas ni códigos en el chat.

## Versión pública comprobada tras el intento

Las cinco direcciones seguían sirviendo **3.36.0**, contenido `realscan-eae2eb5df9ea7418`, fuente `09743c6be291da54c386652a31ebc52345cab0f1`:

- https://fotos.cobertores.com
- https://fotos-cobertores-pro.web.app
- https://fotos-cobertores-pro.firebaseapp.com
- https://fotos-cobertores.web.app
- https://fotos-cobertores.firebaseapp.com

## Correcciones preparadas y pendientes

La [revisión de la corrección](REVISION_3361.md) separa lo implementado de las seis propuestas siguientes. Están aplicadas y verificadas la continuación solo con frente, la sincronización del perfil en todas las vistas, el reintento de revisión y los ajustes gráficos de esta versión.

Falta renovar la sesión, completar ambos despliegues y comparar versión, fuente, CSP y archivos servidos. La medición física de la HP, el dúplex físico y la prueba con iPhone real siguen pendientes por indicación del usuario. Seleccionar la HP no equivale a registrar una medición física.
