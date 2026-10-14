# 🛡️ AUDITORÍA DEL SISTEMA — RealScan Pro v2.6.0-Enterprise
**Desarrollado por Paco Iglesias**  
**Fecha de Auditoría:** 13 de Octubre de 2026  
**Entornos Validados:** 
- Local: `http://localhost:5500/`
- Producción Firebase Hosting: `https://fotos-cobertores-pro.web.app` / `https://fotos-cobertores-pro.firebaseapp.com`
- Repositorio GitHub: `pacoiglesias/fotos` (Rama: `main`)

---

## 1. 🔑 Auditoría de Credenciales y PIN de Acceso (Cambio de 2026 a 1313)

### Hallazgo Original
- El archivo `js/config.js` contenía el hash SHA-256 legacy del PIN `2026` (`158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab`).
- Los navegadores de clientes u operadores que hubieran iniciado sesión previamente almacenaban dicho hash en `localStorage` bajo la clave `realscan_auth_v2`. 
- Al intentar acceder con `1313`, el sistema comparaba el hash contra el valor guardado en el navegador del usuario y lo rechazaba.

### Solución y Blindaje Aplicado (v2.6.0)
1. **Nuevo Hash SHA-256 Oficial:**
   - PIN: `1313`
   - Hash: `1cfafff6d51a03662b85b93dc3417f51687034ba9a46682f5328257eff7133ed`
   - Definición explícita en `window.DEFAULT_PIN = '1313'` y `window.DEFAULT_PIN_HASH`.
2. **Auto-Migración Transparente en Cliente (`js/auth.js`):**
   - En `getAuthData()`, si cualquier usuario almacenado en `localStorage` conserva el hash antiguo de `2026`, se actualiza de forma automática y silenciosa al hash de `1313`, guardándose de inmediato.
   - En `handleLoginSubmit()`, el ingreso con PIN `1313` es validado con prioridad maestra para el usuario `admin`, actualizando el almacenamiento local en el primer acceso exitoso.
   - En `handleUpdateCredentials()`, se permite autorizar el cambio de contraseña reconociendo tanto `1313` como hashes previos.
3. **Actualización de Documentación y Textos:**
   - Leyenda de acceso en `index.html`: `admin` / PIN: `1313`.
   - `README.md` actualizado con el PIN `1313`.

---

## 2. 📇 Opciones Reales para DNI, Documentos y Tarjetas

### El Requerimiento del Usuario
En trámites reales se presentan dos necesidades críticas muy distintas:
1. **Entregar en el banco, oficina pública o consulado:** Exigen que **el Anverso y el Reverso estén en la MISMA hoja A4** para que no se separen ni se gasten dos hojas.
2. **Imprimir a doble cara por la impresora (Dúplex):** Se requiere que el Anverso esté en la **Hoja 1** y el Reverso en la **Hoja 2**, cada uno centrado a escala 1:1 real.

### Implementación Intuitiva en Paso 1:
Se agregaron 4 botones dedicados con etiquetas claras y descriptivas:

| Opción | Modo en Sistema | Comportamiento en Hoja A4 y PDF | Uso Recomendado |
| :--- | :--- | :--- | :--- |
| **2 Caras en 1 Sola Hoja** | `both` (default) | Anverso y Reverso juntos en 1 página A4 a escala 1:1 | DNI, INE, Licencias, trámites bancarios |
| **2 Caras en Hojas Separadas** | `both_separate` | Hoja 1: Anverso (1:1) • Hoja 2: Reverso (1:1) | Impresión física a dos caras (dúplex) |
| **Solo 1 Cara** | `single` | Únicamente cara frontal en 1 hoja A4 | Pasaporte Abierto o carnet de 1 cara |
| **3 o 4 Páginas / Visas** | `multi` | Paginación dinámica (2 por hoja compacta) | Pasaporte con visas, sellos o 2 tarjetas |

---

## 3. 📦 Etapa 3: Respaldo, Exportación y Auto-Caducidad

1. **Exportación en Lote JSON:**
   - Botón `📥 Exportar Respaldo` en el modal de Historial.
   - Genera un archivo `.json` con todos los escaneos guardados, fechas y configuraciones.
2. **Importación de Respaldo:**
   - Botón `📤 Importar` que permite restaurar escaneos en cualquier computadora o navegador a IndexedDB.
3. **Paquete ZIP por Escaneo:**
   - Botón `📦 ZIP` en cada tarjeta del historial.
   - Empaqueta con `JSZip` todas las fotos del documento en alta resolución más un archivo `detalles_escaneo.txt`.
4. **Auto-Caducidad y Purga Automática:**
   - Selección de retención: `1 día`, `3 días` (por defecto), `7 días`, `30 días` o `Permanente`.
   - Limpieza automática de fotos vencidas al iniciar la aplicación.
5. **Bitácora de Auditoría Integral:**
   - Registro en tiempo real de cada inicio de sesión, cambio de credenciales, exportación JSON/ZIP y eliminación.

---

## 4. 🎨 Diseño de Lujo, Ergonomía y Barra Flotante HUD (v2.6.5)
1. **Barra Flotante HUD Ergonómica (`.hud-bar`):**
   - Menú flotante siempre accesible en la parte inferior con efecto Glassmorphism (`backdrop-blur-20px`, borde sutil y sombras luminiscentes).
   - Indicador de estado en tiempo real: `🟢 1:1 EXACTO • A4 300 DPI`.
   - Accesos directos rápidos con 1 solo toque:
     - `✨ Auto-Ajuste 1:1`: Nivelación automática de brillo, nitidez, eliminación de sombras y encuadre milimétrico.
     - `🖨️ Imprimir 100%`: Disparo de impresión directa con calibración exacta.
     - `📄 PDF`: Descarga inmediata del PDF 1:1.
     - `📦 Historial`: Apertura del cajón privado con miniaturas y respaldos.
     - `⚙️`: Acceso rápido al panel de seguridad y bitácora.
2. **Estética Visual Premium:**
   - Hoja A4 con iluminación ambiental perimetral y elevación suave al pasar el cursor.
   - Modo Oscuro ultra-pulido con gradientes de índigo profundo y zafiro.
   - Micro-animaciones en tarjetas, selectores de modo y botones de corte.

---

## 5. 🛡️ Versión v2.7.0-Enterprise: Opciones para Trámites Oficiales y Título Personalizado
1. **Regla de 5 cm e Instrucciones de Calibración 100% Opcionales:**
   - **Problema resuelto:** En trámites oficiales (bancos, juzgados, embajadas, colegios profesionales, notarías), los documentos son rechazados si la fotocopia contiene textos adicionales, reglas o anotaciones externas ajenas al documento original.
   - **Solución implementada:** Casilla de verificación *"Incluir regla de 5 cm e instrucciones"* en el Paso 4. Al desmarcarla:
     - Se oculta de inmediato en la vista previa en vivo (`#footerCalibrationRuler`).
     - Se omite completamente en el PDF exportado (`js/pdf.js` -> `drawCalibrationFooter`).
     - Se omite en la descarga de imagen A4 (`js/export.js` -> `downloadA4Image`).
     - Se imprime una hoja **100% limpia, pulcra e inmaculada** conservando la escala geométrica real 1:1 exacta.
   - **Persistencia automática:** La preferencia se almacena en `localStorage` y se restaura en cada sesión.

2. **Nombre / Titular del Documento Personalizado:**
   - **Campo de texto:** `#inputDocumentTitle` en el Paso 4 con botón de limpieza rápida (`#btnClearDocTitle`).
   - **Ejemplo:** *"DNI - Carlos Gómez"* o *"Pasaporte Mexicano - María Pérez"*.
   - **Impacto directo:**
     - El archivo PDF se descarga con el nombre sanitizado: `RealScan_DNI_Carlos_Gomez_20261013.pdf`.
     - Si los rótulos están activos, se incluye en el encabezado de cada ranura.
   - **Rótulos superiores opcionales:** Casilla *"Incluir rótulo del documento"* para omitir también los títulos superiores si la institución requiere una copia 100% fotográfica sin ninguna palabra externa.

3. **Control Estricto de Versiones:**
   - Versión del sistema elevada a **`v2.7.0-Enterprise`**.
   - Sincronización dinámica automática entre `window.APP_VERSION` en `js/config.js` y el badge del encabezado `#appVersionHeader`.

---

---

## 6. 🚀 Versión v2.8.0-Enterprise: Auto-Relleno 1:1 para PDFs y Botones de Eliminación
1. **Solución a Impresión de DNI Pequeño en PDFs Escaneados:**
   - **Diagnóstico del problema:** Al subir un PDF que contiene un DNI escaneado en una hoja completa (como una página blanca de escáner plano), el sistema cargaba la página entera en lugar de la tarjeta, provocando que el DNI quedara flotando en medio de márgenes blancos y se imprimiera con un tamaño inferior al real.
   - **Algoritmo de Detección de Bordes Mejorado:** Implementado en `js/engine.js` (`detectAndCropCard`). Ahora escanea las 4 dimensiones completas de la imagen/PDF, identifica los límites de la tarjeta o documento frente al fondo del escáner y la recorta de manera milimétrica.
   - **Escala 1:1 Exacta:** Al aislar la tarjeta, el motor de renderizado a 300 DPI (`renderProcessedImage`) escala la credencial exactamente al tamaño oficial (85.60 × 53.98 mm), eliminando bordes residuales y asegurando que la impresión en papel coincida 100% con la tarjeta real.
   - **Botón `⚡ Rellenar 1:1`:** Añadido en la barra de herramientas de cada ranura para forzar el ajuste perfecto y eliminar márgenes en cualquier momento con un solo toque.

2. **Botón "🗑️ Borrar / Eliminar" en Cada Ranura:**
nar 1:1` (`cover`)**:
       - `📐 Encajar Todo`: Reduce la imagen en su totalidad (`Math.min`) para que quepa al 100% dentro del marco físico del documento sin recortar ni una sola esquina.
       - `🔲 Llenar 1:1`: Ajusta proporcionalmente para cubrir todo el marco (`Math.max`).
     - **Control Deslizante Continuo de Zoom (`zoom-slider`)**:
       - Rango extendido de **`20%` a `350%`** con indicador porcentual en vivo (`100%`) para un control milimétrico suave.
     - **Botón Rápido `-25%` (Reducción)** y **`100%` (Escala Original)**:
       - Permite encoger fotos sobredimensionadas en 1 toque.
     - **Zoom Proactivo con la Rueda del Ratón (Mouse Wheel Zoom)**:
       - Desplazar la rueda sobre cualquier ranura reduce o amplía la imagen de manera fluida y táctil.

2. **Inspector Proactivo Inteligente (`inspectSlotImage`):**
   - Al cargar cualquier imagen o PDF en una ranura, el sistema inspecciona automáticamente:
     - **Resolución física**: Evalúa si alcanza los 300 DPI recomendados (`✅ 300 DPI Óptimo` vs `⚠️ Resolución Estándar`).
     - **Orientación cruzada**: Si se carga una foto vertical en un espacio horizontal (o viceversa), muestra una sugerencia interactiva con el botón `🔄 Girar 90°` en 1 clic.
     - **Sobredimensión**: Si la foto supera los 2000 px, sugiere automáticamente el botón `📐 Encajar Todo` para prevenir recortes accidentales.

3. **Regla Milimétrica Superpuesta en Pantalla (1:1 Virtual mm Grid):**
   - Cada ranura cuenta con el botón `📏 Regla mm` que proyecta una cuadrícula milimétrica semitransparente (líneas cada 5 mm y 10 mm calibradas a 300 DPI) para auditar visualmente bordes, márgenes y firmas antes de imprimir.

4. **Barra de Verificación Previa a la Impresión (Pre-Flight Check Bar):**
   - Ubicada directamente sobre el botón principal de impresión en el Paso 4.
   - Diagnostica en tiempo real:
     - Documentos cargados (cuántas caras listas).
     - Estado de calibración 1:1 (300 DPI físico).
     - Acabado de la hoja (Trámite oficial limpio vs Hoja estándar con regla de 5 cm).

5. **Soporte Multi-Formato de Papel Físico (A4, Carta, Oficio México y Legal USA):**
   - **Pregunta y necesidad del usuario:** *"¿Lo tienes contemplado? ¿O una tamaño oficio?"*
   - **Solución implementada:**
     - Integración de catálogo `window.PAPER_SPECS` con:
       - **`A4`** (210.0 × 297.0 mm) — Estándar internacional ISO 216.
       - **`Carta (Letter)`** (215.9 × 279.4 mm) — Estándar en México y Norteamérica.
       - **`Oficio México`** (215.9 × 340.0 mm) — Imprescindible para trámites legales, juzgados, notarías y dependencias mexicanas.
       - **`Oficio Legal USA`** (215.9 × 355.6 mm) — Formato extendido de 8.5 × 14 pulgadas.
     - **Selector Visual de Papel en Paso 4**: Botones táctiles interactivos con medidas y proporciones exactas.
     - **Proporción Dinámica en Pantalla**: El lienzo de la hoja (`.a4-sheet`) adapta su relación de aspecto en vivo (`aspectRatio: widthMm / heightMm`), viéndose más largo en Oficio y más ancho en Carta.
     - **Calibración y Centrado 1:1 en PDF y Descarga**: La regla de calibración de 5 cm se ubica inteligentemente al pie de cada formato (`pageH - 35 mm`) para que nunca se corte ni se desplace fuera del margen útil.
     - **Insignia en Pre-Flight Bar**: Muestra el tamaño de papel activo con su icono (`📄 A4`, `📜 Oficio Mex`, etc.).

6. **Evolución Estética y Visual:**
   - Sliders estilizados con acento índigo y efecto resplandor (glow).
   - Botoneras ergonómicas con estados activos claramente diferenciados (`.is-active`).
   - Sistema de banners proactivos con consejos contextuales no invasivos.
   - Versión oficial actualizada a **`v3.0.0-Titanium`** en toda la plataforma.

---

## 9. 🚀 Despliegue y Sincronización Total
- **Local:** `http://localhost:5500/`
- **Producción:** `https://fotos-cobertores-pro.web.app` / `https://fotos-cobertores-pro.firebaseapp.com`
- **Integridad:** Código modular sincronizado al 100%, validado sintácticamente y con cero errores de consola.
- **Autoría:** Desarrollado por **Paco Iglesias**.   - **Solicitud del usuario:** Posibilidad de eliminar fotos o PDFs subidos por error sin necesidad de reiniciar la aplicación.
   - **Ubicación:**
     - Botón `🗑️ Borrar` visible en la cabecera de cada tarjeta (junto al distintivo de estado).
     - Botón `🗑️ Eliminar` dentro de la fila de herramientas de edición de cada ranura.
   - **Comportamiento:** Limpia la memoria del slot (`state.images[side]`), vacía el selector de archivos nativo, oculta las herramientas, restablece el estado a *"Sin foto"* y limpia la vista previa en la hoja A4.

3. **Control Estricto de Versiones:**
   - Versión del sistema elevada a **`v2.8.0-Enterprise`**.

## 7. 🚀 Versión v2.9.1-Enterprise: Ampliación Inteligente de DNI Pequeño, Reactividad en Vivo y Dashboard de Escaneos
1. **Ampliación y Ajuste Automático/Manual de DNI o Fotos Pequeñas:**
   - **Problema planteado:** Al subir una foto o PDF donde el DNI fue tomado de lejos o aparece pequeño, la impresión estándar salía con menor tamaño que el documento físico real.
   - **Solución implementada:**
     - **Botón `⚡ Ampliar 1:1`**: Aplica recorte automático inteligente si hay bordes blancos o contrastados. Si ya está recortado o no hay bordes definidos, amplía el documento un +25% de forma progresiva hasta llenar con exactitud el marco físico de 85.60 × 53.98 mm a 300 DPI.
     - **Presets Rápidos de Zoom (`+25%`, `+50%`)**: Botones táctiles inmediatos en la barra de cada ranura para escalar fotos reducidas sin perder nitidez.
     - **Encuadre por Arrastre (Drag-to-Pan)**: Al hacer zoom, el usuario puede arrastrar directamente sobre la imagen para encuadrar la credencial o cara del pasaporte a la perfección.

2. **Reactividad Inmediata en la Vista Previa de la Hoja A4:**
   - Al marcar o desmarcar *"📐 Regla de 5 cm e Instrucciones"* o *"🏷️ Imprimir Nombre y Medidas"*, la hoja A4 se actualiza en tiempo real de forma instantánea.
   - Si se activa *"🏛️ Trámite Oficial (Hoja Limpia)"*, todos los encabezados, rótulos de mm y reglas desaparecen inmediatamente de la hoja en pantalla, del PDF y de la impresión física.

3. **Checklist Visual Unificado en el Paso 4:**
   - Reemplazo de controles dispersos por una caja de checklist visual con insignias de estado en vivo (*"Visible"* / *"Oculto"*).
   - Presets de 1 solo clic:
     - `🏛️ Hoja 100% Limpia (Trámite Oficial)`: Desmarca todo automáticamente para evitar rechazos en juzgados, bancos o embajadas.
     - `📐 Estándar Completo (Con Regla)`: Activa regla de calibración y rótulos de tamaño milimétrico.

4. **Dashboard Visible de Documentos Guardados en la Página Principal:**
   - Se integró la sección `#sectionSavedScansDashboard` directamente en la interfaz principal.
   - Muestra tarjetas interactivas con miniatura, cantidad de caras, fecha de creación y estado de caducidad.
   - Permite con 1 solo toque: `🔄 Cargar al Lienzo`, `📄 Exportar PDF 1:1`, `🖨️ Imprimir Directo` y `🗑️ Eliminar`.

5. **Control de Versiones:**
   - Versión del sistema elevada a **`v2.9.1-Enterprise`** en `js/config.js`, `index.html` y documentación.

---

## 8. 🚀 Versión v3.0.0-Titanium: Escala Bidireccional (De Más a Menos), Inspector Proactivo y Soporte Multi-Papel
1. **Ajuste Bidireccional de Escala (De Más a Menor Tamaño / Reducción sin Cortes):**
   - **Problema planteado:** Cuando una foto, escaneo o documento PDF es muy grande o fue tomado muy de cerca, se recortaban las esquinas o textos periféricos si solo se aplicaba relleno forzado (cover).
   - **Solución implementada:**
     - **Modo `📐 Encajar Todo` (`fit`):** Reduce la imagen manteniendo proporciones completas para que quepa dentro de la ranura sin amputar ningún texto ni firma.
     - **Modo `🔲 Llenar 1:1` (`cover`):** Rellena la ranura calibrada a 300 DPI.
     - **Slider de Escala Continuo (20% a 350%):** Con botones de salto rápido `-25%`, `100%`, `+25%`, `+50%`.
     - **Zoom con Rueda del Ratón:** Rueda del mouse sobre cualquier ranura para zoom fino en vivo.
2. **Soporte Multi-Papel Físico Calibrado:**
   - Selección táctil e instantánea entre:
     - `A4 Estándar (210 × 297 mm)`: ISO 216 Internacional.
     - `Carta / Letter (215.9 × 279.4 mm)`: Estándar México y Norteamérica.
     - `Oficio México (215.9 × 340.0 mm)`: Formato oficial para notarías, juzgados y trámites SEP.
     - `Oficio Legal USA (215.9 × 355.6 mm)`: Formato Legal 8.5 × 14 pulgadas.
   - Cálculo automático de márgenes y centrado vertical y horizontal para cada tipo de papel.

---

## 9. 🏆 Versión v3.1.0-Enterprise: Auditoría Integral y 5 Etapas de Mejoras Mayores
Desarrollado y calibrado por **Paco Iglesias** — 13 Octubre 2026.

### ✅ Etapa 1: Claridad Visual y Encabezados Transparentes
- **Problema:** Términos como "Anverso" y "Reverso" generaban dudas en usuarios que no sabían cuál cara iba primero.
- **Solución implementada:**
  - `1. Frente (Delantera con Foto)`: Cara frontal del documento donde aparece la fotografía y datos personales.
  - `2. Reverso (Atrás / Vuelta)`: Cara posterior donde está el código de barras, huella, firma o banda magnética.
  - Rótulos en PDF, vistas previas vivas y placeholders alineados unívocamente.

### ✅ Etapa 2: Formato Oficial Óvalo Título / Diploma (6.0 × 9.0 cm)
- **Problema:** En trámites de titulación profesional en México (UNAM, IPN, UAM, SEP, BUAP), los títulos exigen formato de óvalo / diploma.
- **Solución implementada:**
  - Incorporación de `photo_ovalo_titulo` con dimensiones de 6.0 × 9.0 cm.
  - Trazado de elipse de corte oficial punteada calibrada a 300 DPI tanto en el renderizador en pantalla como en el motor vectorial jsPDF.

### ✅ Etapa 3: Corrector Rápido de Luz y Sombra (Brillo y Contraste)
- **Problema:** Fotos tomadas con celular o escáneres defectuosos suelen quedar sobreexpuestas o subexpuestas (oscuras).
- **Solución implementada:**
  - Controles integrados en cada ranura:
    - `☀️ Aclarar (+15%)`: Incrementa la luminosidad para fotos oscuras.
    - `🌙 Oscurecer (-15%)`: Reduce el exceso de luz o fotos lavadas.
    - `🔆 Contraste (+15%)`: Realza la nitidez de firmas, sellos y letras pequeñas.
    - `🔄 Reset`: Restablece iluminación a valores originales.
  - Renderizado por hardware mediante filtros acelerados por GPU.

### ✅ Etapa 4: Modo Duplicado de Documento (2 Juegos de Copias en 1 Hoja: INE/DNI x2)
- **Problema:** Muchos trámites bancarios, de crédito o gubernamentales solicitan "2 copias de la credencial por ambos lados en una sola hoja".
- **Solución implementada:**
  - Checkbox interactivo en Paso 4: `👥 2 Juegos de Copias en la Misma Hoja (INE / DNI x2)`.
  - Disposición inteligente en 2 columnas:
    - Columna 1: Frente (Juego 1) + Reverso (Juego 1).
    - Columna 2: Frente (Juego 2) + Reverso (Juego 2).
  - Ambos juegos permanecen a tamaño físico real 1:1 estricto (85.6 × 53.98 mm) sin escalamiento ni distorsión.

### ✅ Etapa 5: PWA Completa & Funcionamiento Offline-First
- **Problema:** En notarías, oficinas públicas o sótanos no siempre hay conexión a internet disponible.
- **Solución implementada:**
  - Creación de `manifest.json` oficial con visualización `standalone` y colores corporativos.
  - Service Worker `sw.js` con estrategia Cache-First con Network Fallback.
  - Pre-caché de activos locales y librerías CDN (Tailwind, jsPDF, PDF.js, Google Fonts, JSZip).
  - Botón `#btnInstallPwa` para instalación nativa con 1 solo toque en Chrome, Edge, Safari y Android.