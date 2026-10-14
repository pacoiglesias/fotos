# 🗺️ Plan Maestro de Mejoras Integrales — RealScan Pro

**Documento de Control y Seguimiento de Ingeniería**  
**Rama de Trabajo:** `codex/mejora-integral-realscan`  
**Repositorio:** `https://github.com/pacoiglesias/fotos.git`  
**Autor:** Antigravity AI (Pair Programming con Paco Iglesias)  
**Fecha de Inicio:** 14 de Octubre de 2026  
**Estado General:** En Progreso (Etapas 0 y 1 Completadas — Iniciando Etapa 2)

---

## 📌 Principios Rectores y Reglas Operativas
1. **Calidad de Grado Profesional:** No quedarse en recomendaciones ni maquetas estéticas; implementar código robusto, modular, tipado/documentado y probado.
2. **Modelo Físico en Milímetros:** Toda composición, visualización, corte y exportación se rige por geometría física estricta ($mm$) calibrada a 300 DPI.
3. **Flujo de Usuario Optimizado:** Tipo de trabajo → Cargar archivos → Ajustar imágenes → Componer hojas → Verificar pre-vuelo → Exportar / Imprimir.
4. **Respeto a Cambios y Datos:** Conservar historiales, configuraciones válidas existentes y arquitectura proporcional (sin sobreingeniería ni frameworks pesados innecesarios).
5. **Entregas Continuas Validadas:** Cada etapa se implementa, valida con pruebas reproducibles, se documenta en `VALIDACION_MEJORAS.md`, se commitea y se sube a GitHub antes de avanzar a la siguiente.

---

## 📋 Inventario de Capacidades que Deben Conservarse
- [x] **Calibración 1:1 Estricta:** Regla física de 50 mm trazada vectorialmente con marcas milimétricas exactas.
- [x] **Formatos Oficiales México e Internacionales:**
  - Identificaciones: INE/IFE, DNI Europeo, Licencias, Tarjetas de Visita ($85.6 \times 53.98\text{ mm}$ y $85 \times 55\text{ mm}$).
  - Pasaportes: Libreta Abierta ($176 \times 125\text{ mm}$), Páginas Individuales ($88 \times 125\text{ mm}$).
  - Fotografías: Infantil ($25 \times 30\text{ mm}$), Carnet ($26 \times 32\text{ mm}$), Pasaporte OACI ($35 \times 45\text{ mm}$), Visa USA ($50.8 \times 50.8\text{ mm}$), Título Rectangular ($60 \times 90\text{ mm}$).
  - Óvalos Oficiales: Óvalo Título Grande ($60 \times 90\text{ mm}$), Óvalo Mignon ($50 \times 70\text{ mm}$), Óvalo Credencial ($35 \times 50\text{ mm}$).
  - Medidas Personalizadas en cm y mm.
- [x] **Papeleo Multipapel:** A4 ($210 \times 297\text{ mm}$), Carta ($215.9 \times 279.4\text{ mm}$), Oficio México ($215.9 \times 340\text{ mm}$), Legal ($215.9 \times 355.6\text{ mm}$).
- [x] **Edición Rápida en Navegador:** Rotación en pasos de 90° y libre, zoom de encuadre, desplazamiento (pan), filtros (B/N, Escáner, Color), ajuste de brillo y contraste.
- [x] **Modo 2 Personas / Mezcla:** Impresión combinada de dos fotos distintas en la misma planilla para trámites compartidos o hermanos.
- [x] **Generación Vectorial PDF:** jsPDF con inserción de imágenes en alta resolución a escala milimétrica exacta.
- [x] **Almacenamiento Local Offline:** IndexedDB para guardar proyectos e historial sin depender de servidores externos.

---

## 🚀 Fases y Etapas de Implementación

### ✅ Etapa 0: Auditoría Actual y Línea Base
* **Objetivo:** Radiografía completa del sistema, confirmación experimental de los 11 hallazgos, capturas de referencia, matriz de pruebas inicial y setup de rama `codex/mejora-integral-realscan`.
* **Criterios de Aceptación:**
  1. Rama creada y sincronizada con GitHub.
  2. Todos los hallazgos categorizados (Reproducidos, Código, Riesgos).
  3. Capturas de escritorio y móvil en `.audit/`.
  4. Métricas base registradas en `.audit/baseline_measurements.json`.
  5. `PLAN_MEJORAS.md` y `VALIDACION_MEJORAS.md` publicados.
* **Estado:** ✅ **COMPLETADA**

---

### ⏳ Etapa 1: Composición, Medidas y Exportaciones Fiables
* **Objetivo:** Crear un motor unificado de composición en milímetros (`js/layout-engine.js`) compartido de forma idéntica por la vista previa en pantalla, el generador jsPDF, el exportador de imágenes canvas y la impresión nativa.
* **Criterios de Aceptación:**
  1. Soporte completo de modos: 1 cara, 2 caras juntas, 2 caras separadas (en hojas separadas navegables), 3 y 4 páginas, y duplicados (INE x2).
  2. Fotografías de 1 y 2 personas con paginación real cuando la cantidad supere la capacidad de 1 hoja.
  3. Adaptación geométrica real a Carta, A4, Oficio México y Legal.
  4. Paginación automática en duplicados cuando el alto útil exceda el papel (evitar desbordamiento vertical).
  5. Control independiente y estricto de «Hoja Limpia»: exclusión 100% de marcas de corte, recuadros y textos cuando esté desmarcado.
  6. Exportación completa en PDF y paquete ZIP de imágenes de todas las páginas (no solo la primera).
  7. Vista previa interactiva con paginador (Hoja 1 de N) y escala milimétrica correcta.
* **Dependencias:** Etapa 0.
* **Estado:** ✅ **COMPLETADA**

---

### ⏳ Etapa 2: Proyecto Completo, Acceso y Arquitectura
* **Objetivo:** Modelo de datos de proyecto versionado (`RealScanProject v2`), separación modular clara de responsabilidades, saneamiento de seguridad en historial (XSS) y corrección de autenticación/PIN.
* **Criterios de Aceptación:**
  1. Esquema de proyecto desacoplado del estado global mutable directo.
  2. Separación entre imagen original pura (`rawOriginalSrc`), estado de edición y renderizado procesado.
  3. Guardado y restauración integral: incluye papel, orientación, márgenes, distribución, copias, sin reaplicar filtros en cascada al restaurar.
  4. Sanitización estricta de cadenas en `js/storage.js` usando `textContent` y creación segura de nodos DOM (cero inyección HTML).
  5. Eliminación de PINs maestros ocultos o bypass no revocables (`1313`, `2026`) tras el cambio de credenciales de administrador.
  6. Migración transparente de proyectos v1 existentes en IndexedDB hacia el nuevo esquema.
* **Dependencias:** Etapa 1.
* **Estado:** ⏳ Pendiente

---

### ⏳ Etapa 3: Rediseño Visual y Nuevo Flujo de Trabajo
* **Objetivo:** Rediseño ergonómico integral. Reemplazar el flujo lineal interminable (3,700px) por una estación de trabajo moderna con área de control lateral y un lienzo central amplio y profesional.
* **Criterios de Aceptación:**
  1. Escritorio: Panel lateral de configuración colapsable y área de lienzo central con vista previa amplia, nítida y zoom de visualización independiente.
  2. Móvil: Flujo guiado por pasos (Wizard contextual), eliminación total del desbordamiento horizontal (ancho exacto 100vw, scrollWidth = viewport).
  3. Jerarquía visual refinada: Reducción de ruido visual, emojis excesivos e insignias redundantes; paleta sobria profesional (Dark/Light).
  4. Acceso rápido por intenciones de trabajo (Identificaciones, Fotos Oficiales, Documentos Multipágina, Medidas Libres).
* **Dependencias:** Etapas 1 y 2.
* **Estado:** ⏳ Pendiente

---

### ⏳ Etapa 4: Edición y Gestión Avanzada de Páginas
* **Objetivo:** Herramientas de edición de precisión documental, corrección de perspectiva, recorte manual y gestión flexible de páginas.
* **Criterios de Aceptación:**
  1. Recorte manual interactivo con previsualización del encuadre y comparación instantánea contra el original.
  2. Corrección de perspectiva de 4 esquinas para documentos fotografiados en ángulo con celular.
  3. Historial de Deshacer / Rehacer (Undo / Redo) en cada ranura.
  4. Selector y extractor de páginas desde archivos PDF de entrada.
  5. Reordenación por arrastre, sustitución y eliminación de páginas.
  6. Modo 2 personas con reparto independiente de fotos (ej. 3 fotos Persona A y 5 fotos Persona B).
* **Dependencias:** Etapa 3.
* **Estado:** ⏳ Pendiente

---

### ⏳ Etapa 5: Recuperación y Productividad
* **Objetivo:** Resiliencia ante fallos, autoguardado de borrador activo, gestión de presets de usuario y panel de pre-vuelo centralizado.
* **Criterios de Aceptación:**
  1. Autoguardado silencioso del borrador en edición; recuperación transparente al recargar la pestaña.
  2. Botón explícito y seguro de «Nuevo Trabajo» con confirmación de descarte.
  3. Presets personalizados guardables por el usuario (ej. "Mi Notaría - INE Carta Duplicada").
  4. Historial con búsqueda en tiempo real, filtrado por fecha/etiqueta y duplicación de trabajo.
  5. Panel de Pre-Vuelo estricto con validaciones geométricas: advertencia de resolución insuficiente (<150 DPI), desbordamiento de papel o fotos faltantes con solución en 1 clic.
* **Dependencias:** Etapas 2 y 4.
* **Estado:** ⏳ Pendiente

---

### ⏳ Etapa 6: Optimización, Accesibilidad y Funcionamiento Offline
* **Objetivo:** Rendimiento fluido a 60 FPS, consumo controlado de memoria, soporte PWA sin conexión garantizado y accesibilidad WCAG 2.1 AA.
* **Criterios de Aceptación:**
  1. Cache de miniaturas de previsualización para no reprocesar imágenes de 12 MP en cada interacción.
  2. Service Worker actualizado con pre-caché completo de todos los módulos locales (`auth.js`, `storage.js`, etc.) y bibliotecas CDN.
  3. Navegación por teclado completa: Focus trap en modales, tecla Escape, navegación por flechas.
  4. Tamaños táctiles mínimos de 44x44 px en móviles y contraste tipográfico verificado.
  5. Compatibilidad verificada en viewports de 360px, 390px, 768px y 1440px.
* **Dependencias:** Etapas 1 a 5.
* **Estado:** ⏳ Pendiente

---

### ⏳ Etapa 7: Auditoría Final, Validación de Regresión y Entrega
* **Objetivo:** Ejecución exhaustiva de la matriz de pruebas de punta a punta, reporte comparativo antes/después, documentación técnica y cierre de PR.
* **Criterios de Aceptación:**
  1. 100% de la matriz de pruebas aprobada sin defectos críticos ni regresiones.
  2. Comparación de capturas y métricas de rendimiento documentadas.
  3. Guía de despliegue, recuperación y límites documentada.
  4. PR actualizado y preparado para merge.
* **Dependencias:** Etapas 0 a 6.
* **Estado:** ⏳ Pendiente
