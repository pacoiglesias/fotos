@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
title RealScan 3.25 - Compilar y publicar
echo RealScan 3.25 - Build, pruebas y publicacion en ambos sitios
echo.
where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: no se encontro Windows PowerShell.
  pause
  exit /b 1
)
set "prepareAccess="
if /I "%~1"=="-PrepararAccesos" set "prepareAccess=-PrepararAccesos"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0desplegar.ps1" %prepareAccess%
set "deployResult=%errorlevel%"
echo.
if "%deployResult%"=="0" (
  echo PUBLICACION VERIFICADA. La version 3.25 esta en ambos sitios.
) else (
  echo PUBLICACION INCOMPLETA. Revisa el error y el registro indicado arriba.
)
echo.
pause
exit /b %deployResult%
