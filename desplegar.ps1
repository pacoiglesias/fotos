# RealScan Pro - Despliegue PowerShell
$Host.UI.RawUI.WindowTitle = "RealScan Pro - Despliegue Firebase"
Clear-Host

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "       REALSCAN PRO - AUTENTICACION Y DESPLIEGUE EN VIVO" -ForegroundColor Cyan
Write-Host "                  Desarrollado por Paco Iglesias" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Proyecto Firebase : fotos-cobertores-pro" -ForegroundColor Gray
Write-Host " URL Produccion    : https://fotos-cobertores-pro.web.app" -ForegroundColor Gray
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/3] Verificando Firebase CLI..." -ForegroundColor Yellow
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Firebase CLI no esta instalado." -ForegroundColor Red
    Write-Host "Ejecuta: npm install -g firebase-tools"
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host "[OK] Firebase CLI disponible." -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] Autenticando sesion..." -ForegroundColor Yellow
Write-Host "Se abrira el navegador para seleccionar tu cuenta de Google." -ForegroundColor Gray
firebase login --reauth

Write-Host ""
Write-Host "[3/3] Desplegando en Firebase Hosting..." -ForegroundColor Yellow
firebase use fotos-cobertores-pro
firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "           DESPLIEGUE COMPLETADO CON EXITO!" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "Tu aplicacion esta disponible en:" -ForegroundColor White
    Write-Host "https://fotos-cobertores-pro.web.app" -ForegroundColor Cyan
    Write-Host ""
    $resp = Read-Host "Deseas abrir la web en tu navegador? (S/N)"
    if ($resp -match "^[sSyY]") {
        Start-Process "https://fotos-cobertores-pro.web.app"
    }
} else {
    Write-Host ""
    Write-Host "[ERROR] Hubo un problema con el despliegue." -ForegroundColor Red
}

Write-Host ""
Read-Host "Presiona Enter para cerrar esta ventana..."
