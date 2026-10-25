param([switch]$PrepararAccesos)
# Publish the audited application even when this folder has old Git metadata.
# A new checkout preserves all local files and gives the build its true source SHA.
$ErrorActionPreference = 'Stop'
$releaseVersion = '3.24.0'
$releaseBranch = 'release/3.24.0'
$releaseRef = 'refs/heads/' + $releaseBranch
$releaseCommit = $null
$originalLocation = Get-Location
$auditRoot = Join-Path $PSScriptRoot '.audit'
$publicationId = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$releaseRoot = Join-Path $auditRoot ('publicacion-324-' + $publicationId)
$releaseLog = Join-Path $auditRoot ('publicacion-324-' + $publicationId + '.log')
$transcribing = $false
$originalPath = $env:PATH
$result = 1
$publishStarted = $false
$stage = 'Preparacion'

function Invoke-ReleaseStep {
    param([string]$Program, [string[]]$Arguments)
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $Program @Arguments 2>&1 | Out-Host
        $stepExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($stepExit -ne 0) {
        throw "Fallo en $Program (codigo $stepExit). La publicacion no se ha completado."
    }
}

try {
    Set-Location -LiteralPath $PSScriptRoot
    if ((Test-Path -LiteralPath $auditRoot) -and ((Get-Item -LiteralPath $auditRoot).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'La carpeta .audit esta redirigida. Usa una carpeta normal para guardar la publicacion.'
    }
    New-Item -ItemType Directory -Path $auditRoot -Force | Out-Null
    Start-Transcript -LiteralPath $releaseLog | Out-Null
    $transcribing = $true
    foreach ($program in @('git.exe','node.exe','npm.cmd','npx.cmd')) {
        if (-not (Get-Command $program -ErrorAction SilentlyContinue)) {
            throw "Falta $program. Instala Git y Node.js 24 desde git-scm.com y nodejs.org; despues abre de nuevo el BAT."
        }
    }
    $nodeVersionOutput = @(& node.exe --version)
    $nodeVersionExit = $LASTEXITCODE
    $nodeVersion = ([string]($nodeVersionOutput | Select-Object -Last 1)).Trim()
    if ($nodeVersionExit -ne 0 -or $nodeVersion -notmatch '^v(?<major>[0-9]+)\.') {
        throw "No se pudo leer la version de Node.js: $nodeVersion"
    }
    if ([int]$Matches.major -lt 24) { throw "Se requiere Node.js 24 o posterior. Version detectada: $nodeVersion" }
    Write-Host "Node.js $nodeVersion compatible." -ForegroundColor DarkCyan

    if ($PrepararAccesos) {
        Write-Host 'GIT: comprobando conexion con el repositorio de RealScan.' -ForegroundColor Cyan
        Invoke-ReleaseStep 'git.exe' @('ls-remote','--exit-code','https://github.com/pacoiglesias/fotos.git','refs/heads/main')
        Write-Host 'GITHUB: preparando el acceso de pacoiglesias con Git Credential Manager.' -ForegroundColor Cyan
        Invoke-ReleaseStep 'git.exe' @('credential-manager','--version')
        Invoke-ReleaseStep 'git.exe' @('credential-manager','configure')
        $githubAccounts = @(& git.exe credential-manager github list)
        if ($LASTEXITCODE -ne 0) { throw 'No se pudieron consultar las cuentas de GitHub. Comprueba Git Credential Manager.' }
        $githubAccounts = @($githubAccounts | ForEach-Object { ([string]$_).Trim() })
        if ($githubAccounts -notcontains 'pacoiglesias') {
            Write-Host 'Completa el acceso de GitHub en el navegador que se abrira.' -ForegroundColor Yellow
            if ($transcribing) { Stop-Transcript | Out-Null; $transcribing = $false }
            try { Invoke-ReleaseStep 'git.exe' @('credential-manager','github','login','--username','pacoiglesias','--browser') }
            finally { Start-Transcript -LiteralPath $releaseLog -Append | Out-Null; $transcribing = $true }
            $githubAccounts = @(& git.exe credential-manager github list)
            if ($LASTEXITCODE -ne 0 -or @($githubAccounts | ForEach-Object { ([string]$_).Trim() }) -notcontains 'pacoiglesias') {
                throw 'GitHub no guardo la cuenta pacoiglesias. Vuelve a ejecutar autenticar_y_desplegar.bat.'
            }
        }
        Write-Host 'Cuenta GitHub guardada. Se conserva el historial y los archivos de tu carpeta.' -ForegroundColor Green
    }

    # Use the installed CLI and its existing login. Only install if it is absent.
    if (-not (Get-Command firebase.cmd -ErrorAction SilentlyContinue)) {
        $cliRoot = Join-Path $auditRoot 'firebase-cli'
        $cliBin = Join-Path $cliRoot 'node_modules\.bin'
        if (-not (Test-Path -LiteralPath (Join-Path $cliBin 'firebase.cmd'))) {
            Write-Host 'Preparando Firebase CLI...'
            Invoke-ReleaseStep 'npm.cmd' @('install','--prefix',$cliRoot,'--no-save','--package-lock=false','firebase-tools@15.26.0')
        }
        $env:PATH = $cliBin + [IO.Path]::PathSeparator + $env:PATH
    }
    Write-Host '[1/5] Comprobando acceso a los dos proyectos de Firebase.' -ForegroundColor Cyan
    foreach ($project in @('fotos-cobertores-pro','cobertores-web')) {
        $stage = 'Acceso a Firebase: ' + $project
        $previousPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            & firebase.cmd hosting:sites:list --project $project 2>&1 | Out-Host
            $accessExit = $LASTEXITCODE
        } finally { $ErrorActionPreference = $previousPreference }
        if ($accessExit -ne 0) {
            if (-not $PrepararAccesos) {
                throw "No se pudo comprobar el acceso a $project. Revisa la conexion y los permisos. Para preparar los accesos abre autenticar_y_desplegar.bat."
            }
            Write-Host 'No se pudo confirmar el acceso a Firebase. Si tienes conexion, puedes renovar tu sesion.' -ForegroundColor Yellow
            Write-Host '1. Acceso con navegador'
            Write-Host '2. Acceso con codigo manual'
            Write-Host '0. Salir para revisar la conexion o los permisos'
            $authChoice = Read-Host 'Elige una opcion [1]'
            if ($authChoice -notin @('','1','2')) { throw 'Preparacion cancelada. No se ha publicado nada en este intento.' }
            $authAction = 'Local'
            if ($authChoice -eq '2') { $authAction = 'Remote' }
            if ($transcribing) { Stop-Transcript | Out-Null; $transcribing = $false }
            try {
                & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'scripts\firebase-access.ps1') -Action $authAction
                $authExit = $LASTEXITCODE
            } finally {
                Start-Transcript -LiteralPath $releaseLog -Append | Out-Null
                $transcribing = $true
                Write-Host 'La informacion del acceso interactivo no se incluye en el registro.'
            }
            if ($authExit -ne 0) { throw 'No se pudo completar el acceso a Firebase.' }
            Invoke-ReleaseStep 'firebase.cmd' @('hosting:sites:list','--project',$project)
        }
    }
    Write-Host "[2/5] Descargando la version auditada $releaseVersion. Tu carpeta actual se conserva." -ForegroundColor Cyan
    $releaseHeadOutput = @(& git.exe ls-remote --exit-code 'https://github.com/pacoiglesias/fotos.git' $releaseRef)
    $releaseHeadExit = $LASTEXITCODE
    $releaseHead = ([string]($releaseHeadOutput | Select-Object -Last 1)).Trim()
    if ($releaseHeadExit -ne 0 -or $releaseHead -notmatch ('^(?<sha>[0-9a-f]{40})\s+' + [regex]::Escape($releaseRef) + '$')) {
        throw 'No se pudo resolver la version 3.24. Comprueba la conexion y que la rama release/3.24.0 este publicada.'
    }
    $releaseCommit = $Matches.sha
    $stage = 'Descargar y comprobar la version'
    Invoke-ReleaseStep 'git.exe' @('clone','--single-branch','--branch',$releaseBranch,'https://github.com/pacoiglesias/fotos.git',$releaseRoot)
    Set-Location -LiteralPath $releaseRoot
    Invoke-ReleaseStep 'git.exe' @('checkout','--detach',$releaseCommit)
    $actualCommit = (& git.exe rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $actualCommit -ne $releaseCommit) { throw 'El commit descargado no coincide con la version auditada.' }
    if ((Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).version -ne $releaseVersion) { throw 'La version descargada no coincide.' }
    Write-Host '[3/5] Instalando dependencias y los navegadores de las pruebas.' -ForegroundColor Cyan
    $stage = 'Instalacion de dependencias'
    Invoke-ReleaseStep 'npm.cmd' @('ci')
    Invoke-ReleaseStep 'npx.cmd' @('playwright','install','chromium','webkit')
    Write-Host '[4/5] Build, pruebas, deploy y comprobacion de los dos sitios. Puede tardar varios minutos.' -ForegroundColor Cyan
    $stage = 'Build, pruebas y publicacion de ambos sitios'
    $publishStarted = $true
    Invoke-ReleaseStep 'npm.cmd' @('run','publish')
    Write-Host '[5/5] PUBLICACION VERIFICADA: version y commit correctos en los dos sitios.' -ForegroundColor Green
    Write-Host 'https://fotos-cobertores-pro.web.app'
    Write-Host 'https://fotos-cobertores.web.app'
    Write-Host "Fuente local y build: $releaseRoot"
    $result = 0
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ('Paso detenido: ' + $stage) -ForegroundColor Yellow
    if ($publishStarted) {
        Write-Host 'PUBLICACION INCOMPLETA. Revisa el registro: si un sitio se actualizo, vuelve a ejecutar para completar ambos.' -ForegroundColor Yellow
    } else {
        Write-Host 'PUBLICACION NO INICIADA. Ningun sitio se ha modificado en este intento.' -ForegroundColor Yellow
    }
} finally {
    Set-Location -LiteralPath $originalLocation.Path
    $env:PATH = $originalPath
    if ($transcribing) { Stop-Transcript | Out-Null }
    Write-Host "Registro: $releaseLog"
}
exit $result
