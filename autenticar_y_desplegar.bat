@echo off
setlocal EnableExtensions DisableDelayedExpansion
call "%~dp0subir_a_firebase.bat" -PrepararAccesos
exit /b %errorlevel%
