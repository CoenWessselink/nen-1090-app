param(
    [string]$BaseUrl = "https://nen1090-marketing-new.pages.dev",
    [switch]$SmokeOnly
)

$ErrorActionPreference = "Stop"
Set-Location "C:\NEN1090\nen-1090-app"

function Run-Step($name, $command) {
    Write-Host ""
    Write-Host "========== $name ==========" -ForegroundColor Cyan
    Invoke-Expression $command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $name" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

$env:PLAYWRIGHT_BASE_URL = $BaseUrl

Run-Step "INSTALL DEPENDENCIES" "npm ci"
Run-Step "INSTALL PLAYWRIGHT CHROMIUM" "npx playwright install chromium"
Run-Step "BUILD" "npm run build"
Run-Step "PLAYWRIGHT TEST LIST" "npx playwright test --list"

if ($SmokeOnly) {
    Run-Step "PLAYWRIGHT LIVE SMOKE" "npx playwright test tests/e2e/smoke.spec.ts --project=desktop-chromium"
}
else {
    Run-Step "PLAYWRIGHT LIVE AUTH" "npx playwright test tests/e2e/auth-live.spec.ts --project=desktop-chromium"
    Run-Step "PLAYWRIGHT LIVE SMOKE" "npx playwright test tests/e2e/smoke.spec.ts --project=desktop-chromium"
    Run-Step "PLAYWRIGHT LIVE FULL" "npx playwright test --project=desktop-chromium"
}

Write-Host ""
Write-Host "PHASE 4 LIVE VALIDATION PASSED" -ForegroundColor Green
