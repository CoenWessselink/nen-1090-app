param(
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

Run-Step "INSTALL DEPENDENCIES" "npm ci"
Run-Step "INSTALL PLAYWRIGHT CHROMIUM" "npx playwright install chromium"
Run-Step "TYPECHECK" "npm run typecheck"
Run-Step "BUILD" "npm run build"
Run-Step "PLAYWRIGHT TEST LIST" "npx playwright test --list"

if ($SmokeOnly) {
    Run-Step "PLAYWRIGHT SMOKE" "npx playwright test tests/e2e/smoke.spec.ts --project=desktop-chromium"
}
else {
    Run-Step "PLAYWRIGHT AUTH + ROUTING" "npx playwright test tests/e2e/auth-and-routing.spec.ts --project=desktop-chromium"
    Run-Step "PLAYWRIGHT PROJECT CRUD" "npx playwright test tests/e2e/projects-crud.spec.ts --project=desktop-chromium"
    Run-Step "PLAYWRIGHT WELD FLOW" "npx playwright test tests/e2e/weld-flow.spec.ts --project=desktop-chromium"
    Run-Step "PLAYWRIGHT DOCUMENTS + SETTINGS" "npx playwright test tests/e2e/documents-and-settings.spec.ts --project=desktop-chromium"
    Run-Step "PLAYWRIGHT GLOBAL SEARCH + EXPORT" "npx playwright test tests/e2e/global-search-and-export.spec.ts --project=desktop-chromium"
    Run-Step "PLAYWRIGHT FULL SUITE" "npx playwright test --project=desktop-chromium"
}

Write-Host ""
Write-Host "PHASE 4 LOCAL VALIDATION PASSED" -ForegroundColor Green
