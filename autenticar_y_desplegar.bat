@echo off
cd /d "%~dp0"
call firebase.cmd login
if errorlevel 1 exit /b 1
call subir_a_firebase.bat
exit /b %errorlevel%
