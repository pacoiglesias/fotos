@echo off
title RealScan Pro - Despliegue Rapido a Firebase
color 0B

cd /d "%~dp0"

cls
echo ======================================================================
echo           REALSCAN PRO - DESPLIEGUE RAPIDO A FIREBASE
echo                    Desarrollado por Paco Iglesias
echo ======================================================================
echo.
echo  Directorio activo : "%CD%"
echo  Sitio objetivo    : fotos-cobertores-pro.web.app
echo  Proyecto GCP      : fotos-cobertores-pro
echo.
echo ----------------------------------------------------------------------
echo  [1/2] Verificando Firebase CLI...
echo ----------------------------------------------------------------------

where firebase >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No se encontro Firebase CLI en tu sistema.
    echo Puedes instalarlo ejecutando: npm install -g firebase-tools
    goto :fin
)

echo [OK] Firebase CLI detectado correctamente.
echo.
echo ----------------------------------------------------------------------
echo  [2/2] Subiendo archivos a Firebase Hosting (fotos-cobertores-pro)...
echo ----------------------------------------------------------------------

cmd /c "firebase deploy --only hosting"

if errorlevel 1 (
    echo.
    echo ----------------------------------------------------------------------
    echo  AVISO: La sesion expiro o se requiere autenticacion.
    echo  Iniciando re-autenticacion en tu navegador...
    echo ----------------------------------------------------------------------
    echo.
    cmd /c "firebase login --reauth"
    echo.
    echo  Reintentando el despliegue...
    cmd /c "firebase deploy --only hosting"
    if errorlevel 1 (
        echo.
        echo [ERROR] No se pudo completar la subida. Revisa tu conexion y permisos.
        goto :fin
    )
)

echo.
echo ======================================================================
echo                  DESPLIEGUE COMPLETADO CON EXITO
echo ======================================================================
echo.
echo  Tu plataforma ya esta disponible en vivo en:
echo  https://fotos-cobertores-pro.web.app
echo.

:fin
echo.
echo ======================================================================
echo Presiona cualquier tecla para cerrar esta ventana...
echo ======================================================================
pause >nul
exit /b 0
