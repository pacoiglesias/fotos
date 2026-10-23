# 🗺️ Plan Maestro de Mejoras Integrales — RealScan Pro

**Documento de Control y Seguimiento de Ingeniería**  
**Rama de Trabajo:** `codex/mejora-integral-realscan`  
**Repositorio:** `https://github.com/pacoiglesias/fotos.git`  
**Autor:** Antigravity AI (Pair Programming con Paco Iglesias)  
**Fecha de Inicio:** 14 de Octubre de 2026  
**Estado General:** 🔄 **Fase de Cierre Técnico y Verificación Integral (Entregas 1 a 4)** — Correcciones funcionales comprobadas, suites de regresión automatizadas y resolución de los hallazgos de la auditoría independiente.

---

## 📌 Principios Rectores y Reglas Operativas
1. **Calidad de Grado Profesional:** No quedarse en recomendaciones ni maquetas estéticas; implementar código robusto, modular, tipado/documentado y probado.
2. **Modelo Geométrico Digital en Milímetros:** Toda composición, visualización, corte y exportación se rige por especificaciones en milímetros ($mm$) proyectadas a 300 DPI en los exportadores vectoriales y raster (la precisión física final en papel está sujeta a que el usuario desactive el 'Ajustar al área imprimible' en el driver de su impresora).
3. **Flujo de Usuario Optimizado:** Tipo de trabajo → Cargar archivos → Ajustar imágenes → Componer hojas → Verificar pre-vuelo → Exportar / Imprimir.
4. **Respeto a Cambios y Datos:** Conservar historiales, configuraciones válidas existentes y arquitectura proporcional (sin sobreingeniería ni frameworks pesados innecesarios).
5. **Entregas Continuas Validadas:** Cada entrega se implementa, valida con pruebas reproducibles, se documenta en `VALIDACION_MEJORAS.md`, se commitea y se sube a GitHub antes de avanzar a la siguiente.

---

## 📋 Inventario de Capacidades que Deben Conservarse
- [x] **Geometría 1:1 Digital:** Regla milimétrica de 50 mm trazada vectorialmente con marcas milimétricas exactas a 300 DPI.
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
* **Estado:** ✅ **COMPLETADA**

---

### ⏳ Etapa 3: Rediseño Visual y Nuevo Flujo de Trabajo
* **Objetivo:** Rediseño ergonómico integral. Reemplazar el flujo lineal interminable (3,700px) por una estación de trabajo moderna con área de control lateral y un lienzo central amplio y profesional.
* **Criterios de Aceptación:**
  1. Escritorio: Panel lateral de configuración colapsable y área de lienzo central con vista previa amplia, nítida y zoom de visualización independiente.
  2. Móvil: Flujo guiado por pasos (Wizard contextual), eliminación total del desbordamiento horizontal (ancho exacto 100vw, scrollWidth = viewport = 390px).
  3. Jerarquía visual refinada: Reducción de ruido visual, paleta sobria profesional (Dark/Light).
  4. Acceso rápido por intenciones de trabajo (Identificaciones, Fotos Oficiales, Documentos Multipágina, Medidas Libres).
* **Dependencias:** Etapas 1 y 2.
* **Estado:** ✅ **COMPLETADA** (Commit `829a403`, suite `test_etapa3.js` aprobada)

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
* **Estado:** ✅ **COMPLETADA** (Módulo `js/crop-warp.js`, modal `perspectiveWarpModal`, suite `test_etapa4.js` aprobada)

---

### ✅ Etapa 5: Recuperación y Productividad
* **Objetivo:** Resiliencia ante fallos, autoguardado de borrador activo, gestión de presets de usuario y panel de pre-vuelo centralizado.
* **Criterios de Aceptación:**
  1. Autoguardado silencioso del borrador en edición; recuperación transparente al recargar la pestaña.
  2. Botón explícito y seguro de «Nuevo Trabajo» con confirmación de descarte.
  3. Presets personalizados guardables por el usuario (ej. "Mi Notaría - INE Carta Duplicada").
  4. Historial con búsqueda en tiempo real, filtrado por fecha/etiqueta y duplicación de trabajo.
  5. Panel de Pre-Vuelo estricto con validaciones geométricas: advertencia de resolución insuficiente (<150 DPI), desbordamiento de papel o fotos faltantes con solución en 1 clic.
* **Dependencias:** Etapas 2 y 4.
* **Estado:** ✅ **COMPLETADA** (`test_etapa5.js` pasa 100%)

---

### ✅ Etapa 6: Optimización, Accesibilidad y Funcionamiento Offline
* **Objetivo:** Rendimiento fluido a 60 FPS, consumo controlado de memoria, soporte PWA sin conexión garantizado y accesibilidad WCAG 2.1 AA.
* **Criterios de Aceptación:**
  1. Cache de miniaturas de previsualización para no reprocesar imágenes de 12 MP en cada interacción.
  2. Service Worker actualizado con pre-caché completo de todos los módulos locales (`auth.js`, `storage.js`, `crop-warp.js`, etc.) y bibliotecas CDN en versión `v3.3.0`.
  3. Navegación por teclado completa: Roles de diálogo, tecla Escape para modales, foco visible.
  4. Tamaños táctiles ergonómicos en móviles y contraste tipográfico verificado.
  5. Compatibilidad verificada en viewports de 360px, 390px, 768px y 1440px.
* **Dependencias:** Etapas 1 a 5.
* **Estado:** ✅ **COMPLETADA** (`test_etapa6.js` pasa 100%)

---

### ✅ Etapa 7: Auditoría Final, Validación de Regresión y Entrega
* **Objetivo:** Ejecución exhaustiva de la matriz de pruebas de punta a punta, reporte comparativo antes/después, documentación técnica y cierre de PR.
* **Criterios de Aceptación:**
  1. 100% de la matriz de pruebas aprobada sin defectos críticos ni regresiones (7 de 7 suites).
  2. Cotas geométricas milimétricas verificadas contra estándares oficiales ISO y de México.
  3. Cero errores en consola con ejecución en modo headless.
  4. Rama `codex/mejora-integral-realscan` actualizada y lista para merge o producción.
* **Dependencias:** Etapas 0 a 6.
* **Estado:** ✅ **COMPLETADA** (`test_etapa7.js` pasa 100%)

---

## 📦 Entregas de Cierre Técnico y Resolución de Auditoría Independiente

### 🛡️ Entrega 1 — Integridad de Exportación y Seguridad (Commit `dfe9f3b`)
- **Imágenes requeridas estrictas (C01):** Eliminado el fallback que sustituía caras faltantes por el frente en PDF, JPG e impresión. `runPreflightChecks` valida las caras exigidas por la composición activa y bloquea la exportación si faltan ranuras obligatorias.
- **Validación geométrica común bloqueante (C06):** Centralización de `validateGeometry()` previa a todos los exportadores; rechazo de dimensiones no finitas, desbordamientos de página y elementos fuera del papel útil.
- **Permisos de autenticación y saneamiento DOM (C03):** Autorización estricta por rol (operador no puede crear ni eliminar administradores; protección de al menos un administrador activo); erradicación de interpolación insegura de HTML en miniaturas mediante asignación de propiedades directas a nodos DOM.

### 🔄 Entrega 2 — Ciclo de Vida del Proyecto y Aislamiento entre Trabajos (Commit `717a67a`)
- **Aislamiento integral de ranuras (C02):** Limpieza profunda de `originalSrc`, `processedSrc`, `croppedSrc` y propiedades transitorias al cambiar de trabajo o restaurar.
- **Vaciado de historial de edición (C02):** Las pilas de Undo/Redo no filtran estados entre diferentes proyectos.
- **Separación de títulos (C02):** `projectTitle` (nombre de gestión en historial) y `printedSheetTitle` (rótulo impreso en la hoja) desacoplados.
- **Preservación de ambas fotos en mezcla (C07):** Soporte de fotos de dos personas guardando ambas caras sin omisiones.
- **Deshacer agrupado en sliders (C07):** Registro de zoom y ajustes continuos con debounce de 500ms para hacer viable el deshacer interactivo.
- **Espera asíncrona:** `waitForProcessingComplete()` para asegurar que ninguna exportación utilice resultados transitorios obsoletos.

### 📐 Entrega 3 — Vista Previa Fiel 1:1 y Herramientas Interactivas (Commit `c320422`)
- **Composición 1:1 fiel en pantalla (C04):** `#faithfulSheetPlacements` renderiza cada elemento del plan común en sus coordenadas y dimensiones exactas relativas al papel (eliminado el ancho mínimo artificial de 38% para documentos pequeños; 4 colocaciones visibles en duplicado).
- **Herramientas de edición integradas (C08):**
  - Recorte manual interactivo (`cropModal`) con comparador contra imagen original.
  - Corrección de perspectiva con 4 esquinas interactivas (`perspectiveWarpModal`) y validación de cuadrilátero convexo `isConvexQuad`.
  - Extractor y selector de páginas PDF (`pdfPageSelectorModal`) con asignación directa a caras.
- **Fotos multipágina y mezcla (C08):** Distribución de fotos sin clamp a 4, paginando hasta 2 hojas; cantidades independientes para Persona A y Persona B (`inputCopiesPersonA` e `inputCopiesPersonB`).
- **Unificación de versión (C09):** Versión única `v3.3.0-Enterprise` sincronizada en cabecera, pie, settings y accesos.

### 🌐 Entrega 4 — PWA Offline Resiliente, Accesibilidad y Cierre Verificable
- **Service Worker resiliente (C05):** Separación de `CORE_ASSETS` locales y `OPTIONAL_ASSETS` (CDNs); eliminación del operador síncrono `||` entre promesas de `caches.match`; resolución asíncrona real con `await` para garantizar recargas 100% offline sin `net::ERR_FAILED`.
- **Accesibilidad y Focus Trap (C09):** Contención estricta de foco (teclas `Tab` / `Shift+Tab`) en todos los modales; fondo inerte (`inert` y `aria-hidden="true"`); cierre con `Escape` y devolución garantizada del foco al control disparador.
- **Transparencia y honestidad técnica (C10):** Eliminación de términos inflados ("inviolable", "calibración micrométrica física"); documentación explícita de cotas digitales milimétricas a 300 DPI y declaración de límites técnicos.

### 🌟 Entrega 5 — Prompt Maestro Definitivo (Validación Final Integral)
- **Papeles y Trámites Oficiales:**
  - Papeles fotográficos diferenciados: `photo_10x15` (100.0 × 150.0 mm métrico) y `photo_4x6` (101.6 × 152.4 mm imperial).
  - Metadatos normativos oficiales en presets: `officialSource`, `reviewDate`, `reqsPhysical`, `reqsDigital` y `editingRestrictions` (prohibición estricta de filtros/IA).
  - Modal `#formatRequirementsModal` para consulta de fichas normativas en mostrador.
  - Selector de escala de salida (`#selectOutputScale`: 100% oficial 1:1, 50%, 75%, 125%, 150%, 200%) con `#bannerScaleWarning` cuando != 100%.
- **Alertas Sonoras y Feedback Auditivo (`js/audio.js`):**
  - Implementación con Web Audio API nativo (100% offline, cero assets externos).
  - Tonos armónicos diferenciados: éxito, advertencia, error, obturador de cámara y campanilla de recepción móvil.
  - Configuración persistente en `localStorage`: activar/silenciar, slider de volumen y botón de prueba en Ajustes.
  - Integración automática con `showToast()`.
- **Sincronización QR Móvil (Recepción y Entrega Digital):**
  - Módulo autónomo `js/qr-sync.js` con generador vectorial de códigos QR en Canvas (cero dependencias externas).
  - Portal móvil para clientes `phone-upload.html`: selección múltiple, cámara directa, progreso y confirmación.
  - Portal móvil para clientes `phone-download.html`: descarga protegida de archivos aprobados por el operador.
  - Sesiones temporales impredecibles (`RS-XXXX` y `DL-XXXX`) con caducidad a 15 minutos.
  - Modales en mostrador `#receiveFromPhoneModal` (bandeja de entrada con inyección directa a ranuras) y `#digitalDeliveryModal`.
- **Detección Asistida de Formatos (`js/engine.js`):**
  - Detección de imágenes HEIC/HEIF de iPhone con guía paso a paso para el usuario.
  - Validación de integridad de archivos: rechazo preventivo de archivos vacíos (0 bytes) y archivos dañados.
  - Inyección global `window.handleLoadedFile` desde el sincronizador QR.
- **Service Worker Actualizado (`sw.js`):**
  - Precacheo de `js/audio.js`, `js/qr-sync.js`, `phone-upload.html` y `phone-download.html`.
- **Suite de Pruebas `test_maestro_integral.js`:**
  - 31 pruebas automatizadas cubriendo los requerimientos consolidados del Prompt Maestro.

