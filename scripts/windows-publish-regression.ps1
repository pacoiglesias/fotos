param([string]$Scenario, [string]$Publisher, [string]$Trace)
$ErrorActionPreference = 'Stop'

if ($Scenario) {
    # Keep Node real so Windows PowerShell argument handling is also exercised.
    $global:publishTestScenario = $Scenario
    $global:publishTestTrace = $Trace
    function global:Write-PublishTrace {
        param([string]$Value)
        [IO.File]::AppendAllText($global:publishTestTrace, $Value + [Environment]::NewLine)
    }
    if ($Scenario -eq 'old-node') {
        function global:node.exe { $global:LASTEXITCODE = 0; 'v22.0.0' }
    }
    function global:firebase.cmd {
        Write-PublishTrace ('firebase ' + ($args -join ' '))
        $global:LASTEXITCODE = 0
        if ($global:publishTestScenario -eq 'auth-failure') { $global:LASTEXITCODE = 2 }
    }
    function global:git.exe {
        Write-PublishTrace ('git ' + ($args -join ' '))
        $global:LASTEXITCODE = 0
        if ($args[0] -eq 'clone') {
            $fixture = $args[$args.Count - 1]
            New-Item -ItemType Directory -Path $fixture | Out-Null
            [IO.File]::WriteAllText((Join-Path $fixture 'package.json'), '{"version":"3.17.0"}')
        }
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
    & $Publisher
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
foreach ($case in @('success','auth-failure','wrong-commit','install-failure','publish-failure','old-node')) {
    $caseTrace = Join-Path $testRoot ($case + '.trace')
    $caseOutput = Join-Path $testRoot ($case + '.output')
    & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath -Scenario $case -Publisher $testPublisher -Trace $caseTrace *> $caseOutput
    $caseExit = $LASTEXITCODE
    $caseText = Get-Content -LiteralPath $caseOutput -Raw
    $traceText = ''
    if (Test-Path -LiteralPath $caseTrace) { $traceText = Get-Content -LiteralPath $caseTrace -Raw }
    if ($case -eq 'success') {
        if ($caseExit -ne 0 -or $traceText -notmatch 'npx playwright install chromium webkit' -or $traceText -notmatch 'npm run publish' -or $caseText -notmatch 'Node.js v24\..+ compatible') {
            throw "Fallo en $case. Salida: $caseText"
        }
    } else {
        if ($caseExit -eq 0) { throw "El error de $case no se propago." }
        if ($case -ne 'publish-failure' -and $traceText -match 'npm run publish') { throw "Se intento publicar despues del fallo de $case." }
        if ($case -eq 'old-node' -and $caseText -notmatch 'Se requiere Node.js 24') { throw 'La version antigua de Node no se rechazo correctamente.' }
    }
    Write-Host "PASS publicador Windows: $case"
}
Write-Host 'Node real y Windows PowerShell comprobados. Servicios externos simulados; no se publico nada.'
