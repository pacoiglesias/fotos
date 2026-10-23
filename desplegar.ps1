# Publish the audited application even when this folder has old Git metadata.
# A new checkout preserves all local files and gives the build its true source SHA.
$ErrorActionPreference = 'Stop'
$releaseVersion = '3.17.0'
$releaseCommit = '8b4d9c4782afa0f0f3f3a924841cd7371a4d4a5b'
$originalLocation = Get-Location
$auditRoot = Join-Path $PSScriptRoot '.audit'
$publicationId = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$releaseRoot = Join-Path $auditRoot ('publicacion-317-' + $publicationId)
$releaseLog = Join-Path $auditRoot ('publicacion-317-' + $publicationId + '.log')
$transcribing = $false
$originalPath = $env:PATH
$result = 1

function Invoke-ReleaseStep {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "Fallo en $Program (codigo $LASTEXITCODE). La publicacion no se ha completado."
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
    $nodeVersion = & node.exe -p 'process.versions.node.split(".")[0]'
    if ($LASTEXITCODE -ne 0 -or [int]$nodeVersion -lt 24) { throw 'Se requiere Node.js 24 o posterior.' }

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
        & firebase.cmd hosting:sites:list --project $project | Out-Host
        if ($LASTEXITCODE -ne 0) {
            throw "No se pudo comprobar el acceso a $project. Revisa la conexion y los permisos. Si la sesion caduco, abre Firebase-Acceso.bat y vuelve a ejecutar este BAT."
        }
    }
    Write-Host "[2/5] Descargando la version auditada $releaseVersion. Tu carpeta actual se conserva." -ForegroundColor Cyan
    Invoke-ReleaseStep 'git.exe' @('clone','--single-branch','--branch','release/3.17.0','https://github.com/pacoiglesias/fotos.git',$releaseRoot)
    Set-Location -LiteralPath $releaseRoot
    Invoke-ReleaseStep 'git.exe' @('checkout','--detach',$releaseCommit)
    $actualCommit = (& git.exe rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $actualCommit -ne $releaseCommit) { throw 'El commit descargado no coincide con la version auditada.' }
    if ((Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).version -ne $releaseVersion) { throw 'La version descargada no coincide.' }
    Write-Host '[3/5] Instalando dependencias y los navegadores de las pruebas.' -ForegroundColor Cyan
    Invoke-ReleaseStep 'npm.cmd' @('ci')
    Invoke-ReleaseStep 'npx.cmd' @('playwright','install','chromium','webkit')
    Write-Host '[4/5] Build, pruebas, deploy y comprobacion de los dos sitios. Puede tardar varios minutos.' -ForegroundColor Cyan
    Invoke-ReleaseStep 'npm.cmd' @('run','publish')
    Write-Host '[5/5] PUBLICACION VERIFICADA: version y commit correctos en los dos sitios.' -ForegroundColor Green
    Write-Host 'https://fotos-cobertores-pro.web.app'
    Write-Host 'https://fotos-cobertores.web.app'
    Write-Host "Fuente local y build: $releaseRoot"
    $result = 0
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'PUBLICACION INCOMPLETA. Si un sitio se actualizo antes del error, vuelve a ejecutar el BAT para completar ambos.' -ForegroundColor Yellow
} finally {
    Set-Location -LiteralPath $originalLocation.Path
    $env:PATH = $originalPath
    if ($transcribing) { Stop-Transcript | Out-Null }
    Write-Host "Registro: $releaseLog"
}
exit $result
