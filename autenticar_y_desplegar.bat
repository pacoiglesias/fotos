@echo off
title RealScan Pro - Autenticacion y Despliegue en Firebase
color 0A

cd /d "%~dp0"

cls
echo ======================================================================
echo       REALSCAN PRO - AUTENTICACION Y DESPLIEGUE EN VIVO
echo                  Desarrollado por Paco Iglesias
echo ======================================================================
echo.
echo  Directorio activo : "%CD%"
echo  Proyecto Firebase : fotos-cobertores-pro
echo  URL Produccion    : https://fotos-cobertores-pro.web.app
echo.
echo ======================================================================
echo  [PASO 1/3] Verificando herramientas...
echo ======================================================================
where firebase >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No se encontro 'firebase' en el sistema.
    echo Asegurate de tener Node.js instalado y ejecuta: npm install -g firebase-tools
    echo.
    goto :fin
)
echo [OK] Firebase CLI detectado correctamente.
echo.

echo ======================================================================
echo  [PASO 2/3] Autenticacion con tu cuenta de Google
echo ======================================================================
echo  A continuacion se abrira tu navegador web para que inicies sesion
echo  con tu cuenta de Google del proyecto fotos-cobertores-pro.
echo.
echo  Presiona una tecla para abrir el navegador...
pause >nul

echo.
echo  Abriendo navegador para inicio de sesion seguro...
cmd /c "firebase login --reauth"

echo.
echo ======================================================================
echo  [PASO 3/3] Seleccionando proyecto y subiendo a Firebase Hosting...
echo ======================================================================
echo.
cmd /c "firebase use fotos-cobertores-pro"
echo.
echo  Desplegando version v3.2.0-Enterprise...
cmd /c "firebase deploy --only hosting"

if errorlevel 1 (
    echo.
    echo ----------------------------------------------------------------------
    echo  ERROR EN EL DESPLIEGUE
    echo ----------------------------------------------------------------------
    echo  Revisa que tu cuenta de Google tenga permisos en fotos-cobertores-pro.
    echo.
    goto :fin
)

echo.
echo ======================================================================
echo      DESPLIEGUE COMPLETADO CON EXITO
echo ======================================================================
echo.
echo  Tu aplicacion esta en vivo en:
echo  https://fotos-cobertores-pro.web.app
echo.
echo  Deseas abrir la web en tu navegador?
echo  Presiona [1] para Si, o presiona Enter para salir.
set /p opt="Opcion: "
if "%opt%"=="1" (
    start https://fotos-cobertores-pro.web.app
)

:fin
echo.
echo ======================================================================
echo  Presiona cualquier tecla para cerrar esta ventana...
echo ======================================================================
pause >nul
exit /b 0
