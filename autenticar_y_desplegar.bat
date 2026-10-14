@echo off
chcp 65001 >nul
title RealScan Pro - Autenticación y Despliegue Firebase
color 0A
cls

echo ======================================================================
echo       🔐 REALSCAN PRO - AUTENTICACIÓN Y DESPLIEGUE EN VIVO
echo                  Desarrollado por Paco Iglesias
echo ======================================================================
echo.
echo  Proyecto Firebase : fotos-cobertores-pro
echo  URL de Producción : https://fotos-cobertores-pro.web.app
echo.
echo ----------------------------------------------------------------------
echo  [PASO 1/4] Verificando Firebase CLI...
echo ----------------------------------------------------------------------

where firebase >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontró 'firebase' en el sistema.
    echo Instalando herramientas o ejecuta: npm install -g firebase-tools
    echo.
    pause
    exit /b 1
)
echo [OK] Firebase CLI detectado.
echo.

echo ----------------------------------------------------------------------
echo  [PASO 2/4] Autenticando con tu cuenta de Google (Re-auth)...
echo ----------------------------------------------------------------------
echo  Se abrirá una ventana en tu navegador web.
echo  Por favor inicia sesión con tu cuenta de Google propietaria del proyecto.
echo.
call firebase login --reauth

if %errorlevel% neq 0 (
    echo.
    echo [ADVERTENCIA] Si la ventana no abrió, intentando login estándar...
    call firebase login
)

echo.
echo ----------------------------------------------------------------------
echo  [PASO 3/4] Verificando proyectos y seleccionando fotos-cobertores-pro...
echo ----------------------------------------------------------------------
call firebase use fotos-cobertores-pro

echo.
echo ----------------------------------------------------------------------
echo  [PASO 4/4] Desplegando versión v3.2.0-Enterprise a Firebase Hosting...
echo ----------------------------------------------------------------------
echo  Subiendo archivos estáticos y calibraciones 1:1...
echo.

call firebase deploy --only hosting

if %errorlevel% neq 0 (
    echo.
    echo ======================================================================
    echo  ❌ ERROR EN EL DESPLIEGUE
    echo ======================================================================
    echo  Revisa que la cuenta seleccionada en el navegador tenga permisos
    echo  sobre el proyecto 'fotos-cobertores-pro'.
    echo.
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo      🎉 ¡AUTENTICACIÓN Y DESPLIEGUE v3.2.0 COMPLETADOS CON ÉXITO!
echo ======================================================================
echo.
echo  Sitio en Vivo:
echo  👉 https://fotos-cobertores-pro.web.app
echo  👉 https://fotos-cobertores-pro.firebaseapp.com
echo.
echo ----------------------------------------------------------------------
echo  ¿Deseas abrir la aplicación en tu navegador ahora mismo?
echo ----------------------------------------------------------------------
echo  [1] Sí, abrir RealScan Pro en producción (fotos-cobertores-pro.web.app)
echo  [2] Abrir Consola de Firebase
echo  [3] Salir
echo.
set /p opt="Selecciona una opción (1, 2 o 3) y presiona Enter: "

if "%opt%"=="1" (
    start https://fotos-cobertores-pro.web.app
)
if "%opt%"=="2" (
    start https://console.firebase.google.com/project/fotos-cobertores-pro/overview
)

echo.
echo ¡Listo! Gracias por usar RealScan Pro.
timeout /t 3 >nul
exit /b 0
