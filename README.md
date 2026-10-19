# 📸 RealScan Pro — Impresión de Documentos y Fotos a Escala Real (1:1) en Hoja A4

> **Desarrollado por:** Paco Iglesias  
> **Producción:** [https://fotos-cobertores-pro.web.app](https://fotos-cobertores-pro.web.app) / [https://fotos-cobertores-pro.firebaseapp.com](https://fotos-cobertores-pro.firebaseapp.com)  
> **Dominio Objetivo:** `fotos.cobertores.com`  

---

## 🚀 Características Principales

1. **Escala 1:1 Milimétrica Garantizada**:
   - Calibrado físico exacto a **300 DPI** para evitar deformaciones y garantizar tamaños de documento oficiales.
   - Regla de calibración de 5 cm incluida en la hoja para verificar la escala física impresa con una regla real.

2. **Formatos Oficiales y Personalizados**:
   - **Documentos e Identificaciones**: DNI / INE / Licencias (85.6 × 53.98 mm), Pasaporte Abierto (176 × 125 mm), Pasaporte Cerrado (125 × 88 mm), Documento A6 (148 × 105 mm).
   - **Fotografía de Estudio**: Tamaño Infantil (2.5 × 3.0 cm), Credencial (3.5 × 5.0 cm), Pasaporte Internacional (3.5 × 4.5 cm / 5.0 × 5.0 cm), Título Profesional (6.0 × 9.0 cm).
   - **Medidas Personalizadas**: En centímetros (cm) o milímetros (mm) con presets rápidos.

3. **Modos de Imposición y Eficiencia**:
   - **Anverso + Reverso** en la misma hoja A4 para credenciales y documentos.
   - **Fotos Múltiples**: De 2 hasta 36 fotos por hoja A4 para no desperdiciar papel.
   - **👥 Modo 2 Personas / 2 Fotos (50% / 50%)**: Distribuye fotos de dos personas distintas en una sola hoja A4 con etiquetas de corte individuales.

4. **Herramientas de Procesamiento Integradas**:
   - **Filtros Oficiales**: Color original, Blanco y Negro Oficial (SEP, Cartilla, Títulos), y Modo Escáner de alto contraste.
   - **Centrado Manual & Drag-to-Pan**: Botonera de micropasos y arrastre táctil / ratón.
   - **Guía Biométrica OACI / ICAO**: Silueta de verificación facial en tiempo real.
   - **Detección Automática de Bordes**: Recorte inteligente de fondo.

5. **Exportación Flexible**:
   - **Impresión Directa (1 Clic)** al 100% de escala.
   - **Descarga PDF A4 (1:1)**.
   - **Descarga Imagen A4 300 DPI** (2480 × 3508 px en JPG).

6. **Seguridad y Auditoría**:
   - Acceso protegido por pantalla de bloqueo con clave hasheada en **SHA-256**.
   - Gestión de credenciales (Usuario y PIN) en el panel de Ajustes.
   - **Bitácora de Auditoría (Log)** con exportación a CSV para control de impresiones y accesos.

---

## 🛠️ Despliegue en Firebase Hosting

Para desplegar actualizaciones a producción:
```bash
subir_a_firebase.bat
```
O manualmente:
```bash
firebase deploy --only hosting:fotos-cobertores-pro
```

---

## 🔒 Acceso Inicial
- **Usuario:** `admin`
- En el primer ingreso el sistema te pedirá cambiar la clave inicial de inmediato.  
*(Modificable en la interfaz dentro de ⚠️ Ajustes → Credenciales)*
