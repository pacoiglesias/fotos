@echo off
cd /d "%~dp0"
call Firebase-Acceso.bat -Action Check
if errorlevel 1 (
  call Firebase-Acceso.bat
  call Firebase-Acceso.bat -Action Check
  if errorlevel 1 exit /b 1
)
call subir_a_firebase.bat
exit /b %errorlevel%
