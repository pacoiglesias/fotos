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
   - **Solicitud del usuario:** Posibilidad de eliminar fotos o PDFs subidos por error sin necesidad de reiniciar la aplicación.
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

## 8. 🚀 Despliegue y Sincronización Total
- **Local:** `http://localhost:5500/`
- **Producción:** `https://fotos-cobertores-pro.web.app` / `https://fotos-cobertores-pro.firebaseapp.com`
- **Integridad:** Código modular sincronizado al 100%, validado sintácticamente y con cero errores de consola.
- **Autoría:** Desarrollado por **Paco Iglesias**.