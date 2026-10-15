@echo off
setlocal
cd /d "%~dp0"
echo RealScan - Verificacion y publicacion
call npm.cmd ci
if errorlevel 1 goto :error
call npx.cmd playwright install chromium
if errorlevel 1 goto :error
call npm.cmd run verify
if errorlevel 1 goto :error
call firebase.cmd deploy --only hosting --project fotos-cobertores-pro
if errorlevel 1 goto :error
echo Publicado en https://fotos-cobertores-pro.web.app
exit /b 0
:error
echo No se publico una version nueva. Corrige el error anterior y vuelve a intentar.
exit /b 1
