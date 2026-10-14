# 🧪 Matriz de Validación y Resultados — RealScan Pro

**Documento de Pruebas Continuas, Evidencias y Control de Calidad**  
**Rama:** `codex/mejora-integral-realscan`  
**Última Actualización:** 14 de Octubre de 2026

---

## 📊 1. Resumen de Ejecución por Etapa

| Etapa | Descripción | Pruebas Totales | Aprobadas | Fallidas | Pendientes | Estado |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Etapa 0** | Auditoría y Línea Base | 11 | 11 | 0 | 0 | 🟢 **Aprobada** |
| **Etapa 1** | Composición y Exportaciones | 8 | 8 | 0 | 0 | 🟢 **Aprobada** |
| **Etapa 2** | Proyecto, Persistencia y Seguridad | 7 | 7 | 0 | 0 | 🟢 **Aprobada** |
| **Etapa 3** | Rediseño Visual y Flujo Ergonómico | 6 | 0 | 0 | 6 | 🟡 **En Progreso** |
| **Etapa 4** | Edición y Gestión de Páginas | 6 | 0 | 0 | 6 | ⚪ Pendiente |
| **Etapa 5** | Recuperación y Productividad | 5 | 0 | 0 | 5 | ⚪ Pendiente |
| **Etapa 6** | Rendimiento, Accesibilidad y Offline | 6 | 0 | 0 | 6 | ⚪ Pendiente |
| **Etapa 7** | Auditoría Final y Regresión | 14 | 0 | 0 | 14 | ⚪ Pendiente |

---

## 🔬 2. Evidencia y Reproducción de la Línea Base (Etapa 0)


Todos los hallazgos de la auditoría inicial fueron comprobados experimentalmente en el código actual con datos sintéticos y capturas de pantalla:

### Hallazgo 0.1: Desbordamiento Horizontal en Dispositivos Móviles
* **Comprobación:** Viewport 390 × 844 px.
* **Medición Base:** Ancho de pantalla: 390 px. Ancho del DOM (`scrollWidth`): **534 px**. Desbordamiento horizontal: **144 px**.
* **Causa Raíz:** Clases fijas de grid (`grid-cols-2`, anchos mínimos no responsivos en cabeceras de ranura y barra flotante HUD de 244 px desalineada).
* **Evidencia:** `.audit/mobile_baseline.png` y `.audit/results.json`.
* **Dictamen:** Reproducido y clasificado como **Alta Prioridad**.

### Hallazgo 0.2: Vista Previa Errnea en Modo "2 Caras Separadas"
* **Comprobación:** Seleccionar `#btnModeSeparate` (`state.printMode = 'both_separate'`).
* **Medición Base:** `canvasDocBack` permanece visible inmediatamente debajo de `canvasDocFront` en la misma hoja A4 única. El texto del subencabezado indica: *"Anverso y Reverso alineados en 1 sola hoja A4"*.
* **Causa Raíz:** `js/app.js` línea 736 solo oculta el reverso si `printMode === 'single'`. No existe paginador ni hoja virtual 2 para el reverso en pantalla.
* **Dictamen:** Reproducido y clasificado como **Alta Prioridad**.

### Hallazgo 0.3: "Hoja Limpia" Conserva Trazado de Rectángulo y Marcas de Corte en PDF
* **Comprobación:** Desmarcar regla al pie (`includeRulerFooter = false`) y desmarcar rótulos (`includeDocLabels = false`). Ejecutar simulación vectorial de `generatePdfDoc`.
* **Medición Base:** El documento PDF resultante contiene llamadas incondicionales a `doc.rect(...)` y `drawCornerCutMarks(...)` (8 líneas de corte) alrededor de cada ranura.
* **Causa Raíz:** En `js/pdf.js` líneas 228 y 282, los métodos de corte y recuadro no están condicionados a una opción independiente de marcas de corte.
* **Dictamen:** Reproducido y clasificado como **Alta Prioridad**.

### Hallazgo 0.4: Desbordamiento Vertical en Modo Duplicado sin Paginación
* **Comprobación:** Formato personalizado 80 × 100 mm, 4 caras activas y `duplicateCard: true`.
* **Medición Base:** Ranura 4 se calcula a `itemY = 20 + 3 * (100 + 14) = 362 mm`. Altura final: `462 mm`. Altura de hoja A4: `297 mm`. La imagen se dibuja 165 mm fuera de la página física sin invocar `doc.addPage()`.
* **Causa Raíz:** En `js/pdf.js` línea 220, el bucle `activeItems.forEach` acumula `itemY` linealmente sin comprobar `itemY + targetH > maxAvailableH`.
* **Dictamen:** Reproducido y clasificado como **Alta Prioridad**.

### Hallazgo 0.5: Exportación JPG Omite Páginas y Modos Complejos
* **Comprobación:** Inspección de `downloadA4Image` en `js/export.js`.
* **Medición Base:** Solo genera 1 lienzo canvas de 1 sola página. Omite completamente `canvasDocPage3` y `canvasDocPage4`, no contempla duplicados ni genera imágenes individuales por página para `both_separate`.
* **Dictamen:** Confirmado por código y clasificado como **Alta Prioridad**.

### Hallazgo 0.6: Guardado Incompleto y Reaplicación Destructiva de Filtros
* **Comprobación:** Inspección de `saveToHistory` y `restoreScan` en `js/storage.js`.
* **Medición Base:** Solo guarda imagen procesada. Al restaurar, asigna `state.images[slot].originalSrc = p.dataUrl` (que ya contiene brillo, contraste y rotación previa) y conserva `p.filter`, `p.rotation` y `p.zoom`. Cualquier edición posterior re-aplica el procesamiento sobre los píxeles ya transformados.
* **Dictamen:** Confirmado por código y clasificado como **Alta Prioridad**.

### Hallazgo 0.7: Bypass de PIN Maestro en Autenticación
* **Comprobación:** Inspección de `js/auth.js` líneas 314–330 y 397.
* **Medición Base:** Contiene PIN fijo `1313` y código de restablecimiento `2026` codificados en el cliente que anulan los cambios de contraseña de usuario.
* **Dictamen:** Confirmado por código y clasificado como **Alta Prioridad**.

### Hallazgo 0.8: Vulnerabilidad de Inyección en Títulos de Historial
* **Comprobación:** Inspección de renderizado de tarjetas en `js/storage.js` líneas 300 y 405.
* **Medición Base:** Títulos de escaneo se interpolan directamente en cadenas HTML sin escapar caracteres `< > & "`.
* **Dictamen:** Confirmado por código y clasificado como **Alta Prioridad**.

### Hallazgo 0.9: Flujo Inicial Sobrecargado y Vista Previa Reducida
* **Medición Base:** Altura total de la página en escritorio: **3,706 px**. Cantidad de botones visibles iniciales: **43 botones**. Ancho de hoja de vista previa: **320 px** (la credencial mide solo 117 px).
* **Evidencia:** `.audit/desktop_baseline.png`.
* **Dictamen:** Confirmado y clasificado como **Media Prioridad**.

### Hallazgo 0.10: Desconexión de Dependencias en Service Worker (Offline)
* **Medición Base:** `sw.js` omite `./js/auth.js` y `./js/storage.js` de la lista de activos estáticos cacheados. Si se usa sin conexión por primera vez, el sistema de almacenamiento falla.
* **Dictamen:** Confirmado por código y clasificado como **Media Prioridad**.

---

## 📈 3. Mediciones Base del Sistema (Benchmark Inicial)

| Parámetro | Medición Inicial (Etapa 0) | Meta Objetivo (Etapa 6/7) | Estado |
|---|:---:|:---:|:---:|
| **ScrollHeight Escritorio (1440px)** | 3,706 px | < 1,200 px (Workspace dinámico) | 🔄 Pendiente |
| **ScrollWidth Móvil (390px)** | 534 px (desborde +144px) | 390 px exactos (0 desborde) | 🔄 Pendiente |
| **Botones en Pantalla Inicial** | 43 botones | < 18 contextuales | 🔄 Pendiente |
| **Ancho Hoja Vista Previa (Escritorio)**| 320 px | > 540 px (amplia y nítida) | 🔄 Pendiente |
| **Páginas Exportadas en JPG (4 caras)**| 1 página (incompleto) | 2 páginas en ZIP | 🔄 Pendiente |
| **Tiempo de Carga Local (LCP sintético)**| ~380 ms | < 250 ms | 🟢 Rápido |
| **Tiempo de Exportación PDF (2 caras 300 DPI)**| ~420 ms | < 450 ms | 🟢 Estable |

---

## 🎯 4. Matriz de Verificación para Etapa 1 (✅ APROBADA)

- [x] **M-01:** Modelo unificado en mm (`js/layout-engine.js`) calcula coordenadas unívocas y exactas en milímetros para Preview, PDF, Canvas JPG e Impresión.
- [x] **M-02:** Modo 1 Cara centrada verticalmente en zona útil de la hoja con margen de seguridad.
- [x] **M-03:** Modo 2 Caras en 1 Hoja (`same_page`) con distribución simétrica milimétrica.
- [x] **M-04:** Modo 2 Caras Separadas (`both_separate`) genera 2 hojas independientes navegables en preview (#previewSheetPaginationBar) y en PDF/JPG.
- [x] **M-05:** Modo 3 y 4 Páginas distribuye Hoja 1 (Págs 1-2) y Hoja 2 (Págs 3-4).
- [x] **M-06:** Modo Duplicado valida altura total útil; pagina automáticamente en Hoja 2 si `y + alto > papel` sin desbordamiento.
- [x] **M-07:** "Hoja Limpia" desactiva 100% de marcas de corte, recuadros grises y textos en PDF y JPG para trámites oficiales.
- [x] **M-08:** Exportación JPG multipágina descarga todas las páginas de forma secuencial o empaquetada en ZIP.

*Resultados de la suite de pruebas sintéticas (`test_etapa1.js`):*
- Test 1 (2 Caras Separadas): 2 páginas independientes generadas y validadas.
- Test 2 (Duplicado 4 caras 80×100mm en A4): Auto-paginación en 2 hojas, altura máxima respetada (cero desbordamiento vertical).
- Test 3 (Hoja Limpia): `cleanSheetMode: true`, 0 marcas de corte, 0 recuadros, 0 rótulos.
- Test 4 (Planilla fotos en Oficio Mex): 24 fotos ubicadas dentro del área útil de 340 mm.
- Test 5 (Límites en A4, Carta, Oficio y Legal): Todas las ranuras verificadas dentro del límite del papel.

---

## 🎯 5. Matriz de Verificación para Etapa 2 (✅ APROBADA)

- [x] **M-09:** Esquema versionado de proyecto (`RealScanProject v2`) en `js/storage.js` con soporte integral de propiedades físicas y acabado.
- [x] **M-10:** Desacoplamiento de originales puros (`rawOriginalSrc`) respecto al renderizado procesado (evita degradación acumulativa por re-aplicación de filtros).
- [x] **M-11:** Guardado y restauración integral: incluye papel, orientación, acabado (`cutMarks`, `ruler`, `labels`), duplicados y ranuras activas.
- [x] **M-12:** Sanitización estricta contra XSS en títulos y listados de escaneos mediante `escapeHtml` y safe DOM rendering.
- [x] **M-13:** Eliminación total de PIN maestro hardcodeado `1313` y bypass `2026` en `js/auth.js`. Contraseña cambiada es inmutable e inviolable.
- [x] **M-14:** Migración retrocompatible de proyectos v1 existentes en IndexedDB (los bitmaps se usan como punto neutro sin filtros duplicados).
- [x] **M-15:** Limpieza correcta y completa del estado y ranuras del trabajo anterior al cargar otro escaneo.

*Resultados de la suite de pruebas sintéticas (`test_etapa2.js`):*
- Test 1 (Seguridad Auth): Contraseña cambiada guardada como hash SHA-256; login con 1313 o 2026 rechazado taxativamente.
- Test 2 (Sanitización XSS): Cadenas maliciosas `<script>` e `<img onerror>` escapadas a entidades HTML inocuas.
- Test 3 (Proyecto v2): SchemaVersion = 2 verificado; propiedades `paperSize`, `printMode`, `duplicateCard`, `rawOriginalSrc` persistidas con exactitud.
- Test 4 (Restauración y Limpieza): Ranuras huérfanas limpiadas a null; papel y modo restaurados; cero duplicación de filtros.
- Test 5 (Migración v1): Proyectos legacy v1 adoptados con transformaciones neutralizadas.

---

## 🎯 6. Matriz de Verificación para Etapa 3 (En Progreso)

- [ ] **M-16:** Eliminación de los 3,706 px de desplazamiento lineal en escritorio en favor de un espacio de trabajo dividido (sidebar de control + lienzo interactivo amplio).
- [ ] **M-17:** Eliminación del desbordamiento móvil de 534 px en pantalla de 390 px (ancho DOM estricto al 100vw).
- [ ] **M-18:** Acceso rápido y contextual según intención: Identificaciones, Fotos Oficiales, Documentos Multipágina, Medidas Libres.
- [ ] **M-19:** Vista previa amplia de la hoja física (>540 px en escritorio) con zoom de visualización desacoplado del encuadre.
- [ ] **M-20:** Navegación por etapas fluidas sin pérdida de imágenes ni configuraciones al retroceder.
- [ ] **M-21:** Consistencia tipográfica, espaciado uniforme y coherencia en modos Claro y Oscuro.


