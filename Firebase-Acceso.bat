@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
title RealScan - Acceso a Firebase
where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo No se encontro Windows PowerShell. Abre esta carpeta en Windows.
  pause
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\firebase-access.ps1" %*
set "loginResult=%errorlevel%"
if not "%loginResult%"=="0" if "%~1"=="" pause
exit /b %loginResult%
