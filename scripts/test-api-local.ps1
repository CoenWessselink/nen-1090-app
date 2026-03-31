$ErrorActionPreference = "Stop"
Set-Location "C:\NEN1090\NEN10900-api"
function Run-Step($name, $command) {
    Write-Host ""
    Write-Host "========== $name ==========" -ForegroundColor Cyan
    Invoke-Expression $command
    if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: $name" -ForegroundColor Red; exit $LASTEXITCODE }
}
Run-Step "PYTEST" "pytest -q api-tests"
Write-Host ""
Write-Host "API LOCAL TESTS PASSED" -ForegroundColor Green
