@echo off
setlocal
cd /d "%~dp0"
echo RealScan - Verificar y publicar en ambos sitios Firebase
call npm.cmd ci
if errorlevel 1 exit /b 1
call npx.cmd playwright install chromium
if errorlevel 1 exit /b 1
call npm.cmd run publish
exit /b %errorlevel%
