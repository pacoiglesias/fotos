param([string]$Scenario, [string]$Publisher, [string]$Trace)
$ErrorActionPreference = 'Stop'

if ($Scenario) {
    # Keep Node real so Windows PowerShell argument handling is also exercised.
    $global:publishTestScenario = $Scenario
    $global:publishTestTrace = $Trace
    $global:publishTestGithubLoggedIn = $false
    $env:REALSCAN_TEST_AUTH_MARKER = $Trace + '.auth'
    function global:Read-Host { if ($global:publishTestScenario -eq 'auth-cancel') { '0' } else { '1' } }
    function global:Write-PublishTrace {
        param([string]$Value)
        [IO.File]::AppendAllText($global:publishTestTrace, $Value + [Environment]::NewLine)
    }
    if ($Scenario -eq 'node-24-13') { function global:node.exe { $global:LASTEXITCODE=0; 'v24.13.0' } }
    if ($Scenario -eq 'old-node') {
        function global:node.exe { $global:LASTEXITCODE = 0; 'v22.0.0' }
    }
    function global:firebase.cmd {
        Write-PublishTrace ('firebase ' + ($args -join ' '))
        $global:LASTEXITCODE = 0
        if ($global:publishTestScenario -eq 'auth-failure') { $global:LASTEXITCODE = 2 }
        if ($global:publishTestScenario -in @('auth-renew','auth-cancel') -and -not (Test-Path -LiteralPath $env:REALSCAN_TEST_AUTH_MARKER)) { Write-Error 'Expired authentication'; $global:LASTEXITCODE=2 }
        if ($global:publishTestScenario -eq 'auth-stderr') { Write-Error 'Credentials no longer valid'; $global:LASTEXITCODE = 2 }
    }
    function global:git.exe {
        Write-PublishTrace ('git ' + ($args -join ' '))
        $global:LASTEXITCODE = 0
        if ($args[0] -eq 'credential-manager') {
            if ($args[1] -eq '--version') { if ($global:publishTestScenario -eq 'missing-gcm') { $global:LASTEXITCODE=3 } else { '2.9.1' } }
            if ($args[1] -eq 'github' -and $args[2] -eq 'login') { $global:publishTestGithubLoggedIn = $true }
            if ($args[1] -eq 'github' -and $args[2] -eq 'list' -and $global:publishTestGithubLoggedIn) { 'pacoiglesias' }
        }
        if ($args[0] -eq 'clone') {
            $fixture = $args[$args.Count - 1]
            New-Item -ItemType Directory -Path $fixture | Out-Null
            [IO.File]::WriteAllText((Join-Path $fixture 'package.json'), '{"version":"3.25.0"}')
        }
        if ($args[0] -eq 'ls-remote') { '8b4d9c4782afa0f0f3f3a924841cd7371a4d4a5b' + "`t" + $args[$args.Count - 1] }
        if ($args[0] -eq 'rev-parse') {
            if ($global:publishTestScenario -eq 'wrong-commit') { '0000000000000000000000000000000000000000' }
            else { '8b4d9c4782afa0f0f3f3a924841cd7371a4d4a5b' }
        }
    }
    function global:npm.cmd {
        Write-PublishTrace ('npm ' + ($args -join ' '))
        $global:LASTEXITCODE = 0
        if ($args[0] -eq 'ci' -and $global:publishTestScenario -eq 'install-failure') { $global:LASTEXITCODE = 8 }
        if ($args[0] -eq 'run' -and $global:publishTestScenario -eq 'publish-failure') { $global:LASTEXITCODE = 9 }
    }
    function global:npx.cmd { Write-PublishTrace ('npx ' + ($args -join ' ')); $global:LASTEXITCODE = 0 }
    if ($Scenario -in @('prepare-access','auth-renew','auth-cancel','missing-gcm')) { & $Publisher -PrepararAccesos }
    else { & $Publisher }
    exit $LASTEXITCODE
}

# Test an isolated copy. No source folder, login, network or live site is changed.
$sourceRoot = Split-Path -Parent $PSScriptRoot
$testRoot = Join-Path $env:TEMP ('RealScan-prueba-publicador-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
$testPublisher = Join-Path $testRoot 'desplegar.ps1'
Copy-Item -LiteralPath (Join-Path $sourceRoot 'desplegar.ps1') -Destination $testPublisher
foreach ($file in @($testPublisher, (Join-Path $PSScriptRoot 'firebase-access.ps1'))) {
    $parseTokens = $null
    $parseErrors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($file, [ref]$parseTokens, [ref]$parseErrors) | Out-Null
    if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
}
New-Item -ItemType Directory -Path (Join-Path $testRoot 'scripts') | Out-Null
[IO.File]::WriteAllText((Join-Path $testRoot 'scripts\firebase-access.ps1'), 'param([string]$Action) [IO.File]::WriteAllText($env:REALSCAN_TEST_AUTH_MARKER, $Action); exit 0')
foreach ($case in @('success','prepare-access','auth-failure','wrong-commit','install-failure','publish-failure','old-node','node-24-13','auth-stderr','auth-renew','auth-cancel','missing-gcm')) {
    $caseTrace = Join-Path $testRoot ($case + '.trace')
    $caseOutput = Join-Path $testRoot ($case + '.output')
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath -Scenario $case -Publisher $testPublisher -Trace $caseTrace *> $caseOutput
        $caseExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    $caseText = Get-Content -LiteralPath $caseOutput -Raw
    $traceText = ''
    if (Test-Path -LiteralPath $caseTrace) { $traceText = Get-Content -LiteralPath $caseTrace -Raw }
    if ($case -in @('success','prepare-access','node-24-13','auth-renew','missing-gcm')) {
        if ($caseExit -ne 0 -or $traceText -notmatch 'npx playwright install chromium webkit' -or $traceText -notmatch 'npm run publish' -or $caseText -notmatch 'Node.js v24\..+ compatible') {
            throw "Fallo en $case. Salida: $caseText"
        }
        if ($case -eq 'auth-renew' -and (-not (Test-Path -LiteralPath ($caseTrace + '.auth')) -or $caseText -notmatch 'La informacion del acceso interactivo')) { throw 'No se verifico la renovacion aislada del acceso.' }
        if ($case -eq 'prepare-access' -and ($traceText -notmatch 'git credential-manager configure' -or $traceText -notmatch 'git credential-manager github login --username pacoiglesias --browser')) {
            throw 'No se preparo el acceso GitHub con el navegador.'
        }
    } else {
        if ($caseExit -eq 0) { throw "El error de $case no se propago." }
        if ($case -ne 'publish-failure' -and $traceText -match 'npm run publish') { throw "Se intento publicar despues del fallo de $case." }
        if ($case -eq 'auth-stderr' -and $caseText -notmatch 'PUBLICACION NO INICIADA') { throw 'Fallo al capturar stderr de Firebase.' }
        if ($case -eq 'old-node' -and $caseText -notmatch 'Se requiere Node.js 24') { throw 'La version antigua de Node no se rechazo correctamente.' }
    }
    Write-Host "PASS publicador Windows: $case"
}
Write-Host 'Node real y Windows PowerShell comprobados. Servicios externos simulados; no se publico nada.'
