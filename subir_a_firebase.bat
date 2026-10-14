@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title RealScan Pro - Despliegue Rápido a Firebase
color 0B

:: Asegurar que el directorio activo sea siempre la carpeta del script
cd /d "%~dp0"

cls
echo ======================================================================
echo           🚀 REALSCAN PRO - DESPLIEGUE RÁPIDO A FIREBASE
echo                    Desarrollado por Paco Iglesias
echo ======================================================================
echo.
echo  Directorio activo : %CD%
echo  Sitio objetivo    : fotos-cobertores-pro.web.app
echo  Dominio final     : fotos.cobertores.com
echo  Proyecto GCP      : fotos-cobertores-pro
echo.
echo ----------------------------------------------------------------------
echo  [1/2] Verificando Firebase CLI...
echo ----------------------------------------------------------------------

where firebase >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontró Firebase CLI en tu sistema.
    echo Puedes instalarlo ejecutando: npm install -g firebase-tools
    goto :fin
)

echo [OK] Firebase CLI detectado correctamente.
echo.
echo ----------------------------------------------------------------------
echo  [2/2] Subiendo archivos a Firebase Hosting (fotos-cobertores-pro)...
echo ----------------------------------------------------------------------

cmd /c "firebase deploy --only hosting"

if %errorlevel% neq 0 (
    echo.
    echo ----------------------------------------------------------------------
    echo  ⚠️ La sesión expiró o se requiere autenticación.
    echo  Iniciando re-autenticación en tu navegador...
    echo ----------------------------------------------------------------------
    echo.
    cmd /c "firebase login --reauth"
    echo.
    echo  Reintentando el despliegue...
    cmd /c "firebase deploy --only hosting"
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] No se pudo completar la subida. Revisa tu conexión y permisos.
        goto :fin
    )
)

echo.
echo ======================================================================
echo                  🎉 ¡DESPLIEGUE COMPLETADO CON ÉXITO!
echo ======================================================================
echo.
echo  Tu plataforma ya está disponible en vivo en:
echo  👉 https://fotos-cobertores-pro.web.app
echo  👉 https://fotos-cobertores-pro.firebaseapp.com
echo.
echo  PASOS PARA VINCULAR TU DOMINIO (fotos.cobertores.com):
echo  1. Abre la consola de Firebase:
echo     https://console.firebase.google.com/project/fotos-cobertores-pro/hosting/sites
echo  2. Haz clic en "Agregar dominio personalizado".
echo  3. Escribe: fotos.cobertores.com
echo  4. Agrega el registro CNAME que te indique Firebase en tu panel de DNS.
echo.

:fin
echo.
echo ======================================================================
echo Presiona cualquier tecla para cerrar esta ventana...
echo ======================================================================
pause >nul
exit /b 0
