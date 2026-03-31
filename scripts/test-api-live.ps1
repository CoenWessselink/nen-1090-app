$ErrorActionPreference = "Stop"
Set-Location "C:\NEN1090\NEN10900-api"
$env:NEN1090_API_BASE_URL = "https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net"
$env:NEN1090_APP_BASE_URL = "https://nen-1090-app.pages.dev"
function Run-Step($name, $command) {
    Write-Host ""
    Write-Host "========== $name ==========" -ForegroundColor Cyan
    Invoke-Expression $command
    if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: $name" -ForegroundColor Red; exit $LASTEXITCODE }
}
Run-Step "PYTEST LIVE" "pytest -q api-tests"
Write-Host ""
Write-Host "API LIVE TESTS PASSED" -ForegroundColor Green
