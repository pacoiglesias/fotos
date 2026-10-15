$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
& npm.cmd run publish
exit $LASTEXITCODE
