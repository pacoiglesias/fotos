[CmdletBinding()]
param([ValidateSet('Menu', 'Check', 'Local', 'Remote')][string]$Action = 'Menu')

$ErrorActionPreference = 'Stop'
$installedFirebase = Get-Command firebase.cmd -ErrorAction SilentlyContinue
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$firebaseRunner = Join-Path $PSScriptRoot 'firebase-runner.cjs'
if (-not $nodeCommand -or (-not $installedFirebase -and -not $npmCommand)) {
    Write-Host 'Falta Node.js con npm. Instala la version LTS desde https://nodejs.org y vuelve a abrir el BAT.' -ForegroundColor Yellow
    exit 1
}
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

function Initialize-FirebaseCli {
    Write-Host 'Comprobando la herramienta oficial de Firebase...'
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $versionOutput = @(& $nodeCommand.Source $firebaseRunner --version 2>&1)
        $cliExit = $LASTEXITCODE
        if ($cliExit -ne 0) {
            if (-not $npmCommand) { Write-Host 'Falta npm para preparar Firebase.' -ForegroundColor Red; return $false }
            $cliRoot = Join-Path (Split-Path -Parent $PSScriptRoot) '.audit\firebase-cli'
            Write-Host 'Preparando el modulo oficial de Firebase en la carpeta del proyecto.' -ForegroundColor Yellow
            & $npmCommand.Source install --prefix $cliRoot --no-save --package-lock=false firebase-tools@15.26.0 2>&1 | Out-Host
            if ($LASTEXITCODE -ne 0) { return $false }
            $env:PATH = (Join-Path $cliRoot 'node_modules\.bin') + [IO.Path]::PathSeparator + $env:PATH
            $versionOutput = @(& $nodeCommand.Source $firebaseRunner --version 2>&1)
            $cliExit = $LASTEXITCODE
        }
    } finally { $ErrorActionPreference = $previousPreference }
    if ($cliExit -ne 0) { Write-Host 'No se pudo preparar Firebase. Revisa el error anterior.' -ForegroundColor Red; return $false }
    Write-Host ('Firebase ' + ($versionOutput | Select-Object -Last 1) + ' preparado mediante su API oficial.') -ForegroundColor DarkCyan
    return $true
}

function Invoke-FirebaseCli {
    param([string[]]$CliArguments)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $nodeCommand.Source $firebaseRunner @CliArguments 2>&1 | Out-Host
        return [int]$LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
}

function Test-RealScanAccess {
    foreach ($project in @('fotos-cobertores-pro', 'cobertores-web')) {
        Write-Host ('Comprobando acceso a ' + $project + '...') -ForegroundColor Cyan
        $result = Invoke-FirebaseCli -CliArguments @('hosting:sites:list', '--project', $project)
        if ($result -ne 0) {
            Write-Host 'No se pudo confirmar el acceso. Puede ser la conexion, la sesion o los permisos del proyecto.' -ForegroundColor Yellow
            Write-Host 'Revisa el mensaje de Firebase. Para renovar la sesion elige la opcion 2.'
            return $false
        }
    }
    Write-Host 'SESION ACEPTADA en los dos proyectos. No hace falta volver a iniciar sesion.' -ForegroundColor Green
    Write-Host 'Esta comprobacion no publica ni modifica el sistema.'
    return $true
}

function Connect-RealScanFirebase {
    param([bool]$Remote)
    Write-Host 'Usa la cuenta que administra RealScan: paco@cobertores.com.' -ForegroundColor Cyan
    Write-Host 'Completa Google en el navegador. No pegues tu contrasena en esta ventana.'
    $loginArguments = @('--interactive', 'login', '--reauth')
    if ($Remote) {
        Write-Host 'Deja ESTA ventana abierta. Abre el enlace y pega aqui el codigo NUEVO que genere Firebase.' -ForegroundColor Yellow
        Write-Host 'No reutilices enlaces ni codigos de intentos anteriores.'
        $loginArguments += '--no-localhost'
    } else {
        Write-Host 'El navegador se abrira para devolver el acceso automaticamente a esta misma ventana.'
        Write-Host 'Si no puede volver, usa la opcion 3 (codigo manual).'
    }
    $result = Invoke-FirebaseCli -CliArguments $loginArguments
    if ($result -ne 0) {
        Write-Host 'Firebase no completo el acceso. Lee el error anterior; no se ha publicado nada.' -ForegroundColor Yellow
        return $false
    }
    return (Test-RealScanAccess)
}

if (-not (Initialize-FirebaseCli)) { exit 1 }
if ($Action -eq 'Check') { if (Test-RealScanAccess) { exit 0 } else { exit 2 } }
if ($Action -eq 'Local') { if (Connect-RealScanFirebase -Remote $false) { exit 0 } else { exit 2 } }
if ($Action -eq 'Remote') { if (Connect-RealScanFirebase -Remote $true) { exit 0 } else { exit 2 } }

while ($true) {
    Write-Host ''
    Write-Host 'REALSCAN - ACCESO A FIREBASE' -ForegroundColor Cyan
    Write-Host '1. Comprobar mi acceso (recomendado)'
    Write-Host '2. Iniciar o renovar acceso con el navegador'
    Write-Host '3. Acceso con codigo manual (si falla el navegador)'
    Write-Host '0. Salir'
    Write-Host 'Este asistente no hace build ni deploy y no borra ni publica archivos.'
    $choice = Read-Host 'Elige una opcion [1]'
    switch ($choice.Trim()) {
        '0' { exit 0 }
        '2' { $null = Connect-RealScanFirebase -Remote $false }
        '3' { $null = Connect-RealScanFirebase -Remote $true }
        { $_ -in @('', '1') } { $null = Test-RealScanAccess }
        default { Write-Host 'Elige 1, 2, 3 o 0.' -ForegroundColor Yellow }
    }
    $null = Read-Host 'Pulsa Enter para volver al menu'
}
