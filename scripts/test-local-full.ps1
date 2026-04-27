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

Run-Step "INSTALL" "npm install"
Run-Step "TYPECHECK" "npm run typecheck"
Run-Step "BUILD" "npm run build"
Run-Step "LINT" "npm run lint"
Run-Step "PLAYWRIGHT TEST LIST" "npx playwright test --list"
Run-Step "PLAYWRIGHT AUTH/ROUTING" "npx playwright test tests/e2e/auth-and-routing.spec.ts --project=desktop-chromium"
Run-Step "PLAYWRIGHT WELD FLOW" "npx playwright test tests/e2e/weld-flow.spec.ts --project=desktop-chromium"
Run-Step "PLAYWRIGHT FULL" "npx playwright test --project=desktop-chromium"

Write-Host ""
Write-Host "ALL TESTS PASSED" -ForegroundColor Green
