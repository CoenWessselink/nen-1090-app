$ErrorActionPreference = "Stop"
Set-Location "C:\NEN1090\nen-1090-app"
function Run-Step($name, $command) {
    Write-Host ""
    Write-Host "========== $name ==========" -ForegroundColor Cyan
    Invoke-Expression $command
    if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: $name" -ForegroundColor Red; exit $LASTEXITCODE }
}
Run-Step "NPM CI" "npm ci"
Run-Step "PLAYWRIGHT INSTALL" "npx playwright install chromium"
Run-Step "TYPECHECK" "npm run typecheck"
Run-Step "BUILD" "npm run build"
Run-Step "PLAYWRIGHT LIST" "npx playwright test --list"
Run-Step "AUTH + ROUTING" "npx playwright test tests/e2e/auth-and-routing.spec.ts tests/e2e/dashboard-navigation.spec.ts tests/e2e/project-context.spec.ts --project=desktop-chromium"
Run-Step "PROJECT WORKFLOWS" "npx playwright test tests/e2e/assemblies-flow.spec.ts tests/e2e/weld-flow.spec.ts tests/e2e/documents-ce-flow.spec.ts tests/e2e/redirects-refresh.spec.ts --project=desktop-chromium"
Run-Step "ADMIN / SETTINGS / RELEASE" "npx playwright test tests/e2e/instellingen-rapportage-billing.spec.ts tests/e2e/superadmin-rbac.spec.ts tests/e2e/smoke-release.spec.ts --project=desktop-chromium"
Write-Host ""
Write-Host "APP LOCAL TESTS PASSED" -ForegroundColor Green
