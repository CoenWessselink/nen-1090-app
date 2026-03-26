$ErrorActionPreference = "Stop"
Set-Location "C:\NEN1090\nen-1090-app"

git add .
git commit -m "Stabilize Playwright config and add live/local test runners for app validation"
git pull origin main --rebase
git push origin main

$env:PLAYWRIGHT_BASE_URL = "https://nen1090-marketing-new.pages.dev"

Write-Host ""
Write-Host "=== PLAYWRIGHT TEST LIST (LIVE) ===" -ForegroundColor Cyan
npx playwright test --list
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== PLAYWRIGHT FULL (LIVE) ===" -ForegroundColor Cyan
npx playwright test --project=desktop-chromium --headed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== REPORT ===" -ForegroundColor Green
npx playwright show-report
