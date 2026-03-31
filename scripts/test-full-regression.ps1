$ErrorActionPreference = "Stop"
Write-Host "========== NEN1090 FULL REGRESSION ==========" -ForegroundColor Yellow
Write-Host ""
Write-Host "--- APP LOCAL ---" -ForegroundColor Cyan
& "C:\NEN1090\nen-1090-app\scripts\test-app-local.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ""
Write-Host "--- API LOCAL ---" -ForegroundColor Cyan
& "C:\NEN1090\NEN10900-api\scripts\test-api-local.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ""
Write-Host "FULL REGRESSION PASSED" -ForegroundColor Green
