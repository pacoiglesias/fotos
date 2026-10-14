@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title RealScan Pro - Autenticación y Despliegue en Firebase
color 0A

:: Asegurar que el directorio activo sea siempre la carpeta del script
cd /d "%~dp0"

cls
echo ======================================================================
echo       🔐 REALSCAN PRO - AUTENTICACIÓN Y DESPLIEGUE EN VIVO
echo                  Desarrollado por Paco Iglesias
echo ======================================================================
echo.
echo  Directorio activo : %CD%
echo  Proyecto Firebase : fotos-cobertores-pro
echo  URL de Producción : https://fotos-cobertores-pro.web.app
echo.
echo ======================================================================
echo  [PASO 1/3] Verificando herramientas...
echo ======================================================================
where firebase >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontró 'firebase' en tu sistema PATH.
    echo Asegúrate de tener Node.js instalado y ejecuta: npm install -g firebase-tools
    echo.
    goto :fin
)
echo [OK] Firebase CLI detectado correctamente.
echo.

echo ======================================================================
echo  [PASO 2/3] Autenticación con tu cuenta de Google
echo ======================================================================
echo  A continuación se abrirá tu navegador predeterminado para que elijas
echo  tu cuenta de Google con acceso al proyecto 'fotos-cobertores-pro'.
echo.
echo  Presiona cualquier tecla para abrir el navegador...
pause >nul

echo.
echo  Abriendo navegador para inicio de sesión seguro...
cmd /c "firebase login --reauth"

echo.
echo ======================================================================
echo  [PASO 3/3] Seleccionando proyecto y subiendo a Firebase Hosting...
echo ======================================================================
echo.
cmd /c "firebase use fotos-cobertores-pro"
echo.
echo  Desplegando versión v3.2.0-Enterprise...
cmd /c "firebase deploy --only hosting"

if %errorlevel% neq 0 (
    echo.
    echo ----------------------------------------------------------------------
    echo  ❌ EL DESPLIEGUE NO SE PUDO COMPLETAR
    echo ----------------------------------------------------------------------
    echo  Revisa que tu cuenta de Google tenga permisos de Propietario o Editor
    echo  en el proyecto 'fotos-cobertores-pro'.
    echo.
    goto :fin
)

echo.
echo ======================================================================
echo      🎉 ¡DESPLIEGUE v3.2.0-Enterprise COMPLETADO CON ÉXITO!
echo ======================================================================
echo.
echo  Tu aplicación está 100% en vivo en:
echo  👉 https://fotos-cobertores-pro.web.app
echo  👉 https://fotos-cobertores-pro.firebaseapp.com
echo.
echo  ¿Deseas abrir la web en tu navegador?
echo  Presiona [1] para Sí, o cualquier otra tecla para salir.
set /p opt="Opción: "
if "!opt!"=="1" (
    start https://fotos-cobertores-pro.web.app
)

:fin
echo.
echo ======================================================================
echo  Ventana finalizada. Presiona cualquier tecla para cerrar...
echo ======================================================================
pause >nul
exit /b 0
