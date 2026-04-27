$ErrorActionPreference = "Stop"
Set-Location "C:\NEN1090\nen-1090-app"
$env:PLAYWRIGHT_BASE_URL = "https://nen-1090-app.pages.dev"
function Run-Step($name, $command) {
    Write-Host ""
    Write-Host "========== $name ==========" -ForegroundColor Cyan
    Invoke-Expression $command
    if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: $name" -ForegroundColor Red; exit $LASTEXITCODE }
}
Run-Step "NPM CI" "npm ci"
Run-Step "PLAYWRIGHT INSTALL" "npx playwright install chromium"
Run-Step "PLAYWRIGHT LIST" "npx playwright test --list"
Run-Step "LIVE AUTH + ROUTING" "npx playwright test tests/e2e/auth-and-routing.spec.ts tests/e2e/dashboard-navigation.spec.ts tests/e2e/project-context.spec.ts --project=desktop-chromium"
Run-Step "LIVE CORE ROUTES" "npx playwright test tests/e2e/weld-flow.spec.ts tests/e2e/documents-ce-flow.spec.ts tests/e2e/redirects-refresh.spec.ts --project=desktop-chromium"
Write-Host ""
Write-Host "APP LIVE SMOKE PASSED" -ForegroundColor Green
