$ErrorActionPreference = "Stop"
Set-Location "C:\NEN1090\nen-1090-app"

$env:PLAYWRIGHT_BASE_URL = "https://nen1090-marketing.pages.dev"

Write-Host ""
Write-Host "=== PLAYWRIGHT TEST LIST (LIVE) ===" -ForegroundColor Cyan
npx playwright test --list
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== PLAYWRIGHT AUTH/ROUTING (LIVE) ===" -ForegroundColor Cyan
npx playwright test tests/e2e/auth-and-routing.spec.ts --project=desktop-chromium --headed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== PLAYWRIGHT FULL (LIVE) ===" -ForegroundColor Cyan
npx playwright test --project=desktop-chromium --headed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
