# RealScan 3.27.1 · Capturas visibles y revisión más clara

- Las miniaturas móviles se construyen dentro del flujo de captura, con espacio reservado antes de decodificar. Se elimina la dependencia del editor de anotaciones y de una altura automática con imagen al 100 %.
- El mostrador incorpora frente y reverso visibles desde recepción, incluso cuando falta completar el trabajo. Cada captura abre una vista ampliada que se cierra al bloquear la sesión.
- Tras confirmar una captura se enfoca su vista previa sin depender exclusivamente de requestAnimationFrame.
- Firmas, sellos y opciones especiales se agrupan en un panel que comienza cerrado en pantallas pequeñas.
- Actualizaciones de anotaciones pendientes se repiten y se aplican a la página con el ID correspondiente, evitando pérdidas al reconstruir la lista.
- Quitar una página conserva el nombre, las opciones OCR y las anotaciones de las restantes al recuperar el borrador.
- La regresión de vistas previas comprueba píxeles de capturas de color en capturas de pantalla reales, no solo dimensiones de los elementos. Incluye Chromium y WebKit, cambios de formato, recuperación, ampliación y bloqueo.

La validación en motores de navegador no sustituye una prueba en el teléfono físico del usuario. Las imágenes y borradores existentes se conservan; la actualización no necesita borrar datos del navegador.
