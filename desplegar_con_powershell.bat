@echo off
title RealScan Pro - Despliegue PowerShell
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0desplegar.ps1"
echo.
echo Presiona cualquier tecla para cerrar...
pause >nul
