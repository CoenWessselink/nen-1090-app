$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot/.."

Write-Host "[FASE 5] Typecheck starten..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[FASE 5] Playwright smoke starten..." -ForegroundColor Cyan
npx playwright test tests/e2e/phase5-proof.spec.ts --project=desktop-chromium
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[FASE 5] Routing/refresh checks starten..." -ForegroundColor Cyan
npx playwright test tests/e2e/phase5-routing-refresh.spec.ts --project=desktop-chromium
exit $LASTEXITCODE
