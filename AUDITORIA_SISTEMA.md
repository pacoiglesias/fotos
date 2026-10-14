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

## 5. 🚀 Despliegue y Sincronización Total
- **Local:** `http://localhost:5500/`
- **Producción:** `https://fotos-cobertores-pro.web.app` / `https://fotos-cobertores-pro.firebaseapp.com`
- **Integridad:** Código sincronizado al 100%, validado sintácticamente y con cero errores de consola.
 