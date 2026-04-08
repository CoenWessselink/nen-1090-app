param(
  [string]$BaseUrl = "https://nen-1090-app.pages.dev"
)

$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot/.."
$env:PLAYWRIGHT_BASE_URL = $BaseUrl

Write-Host "[FASE 5 LIVE] Typecheck starten..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[FASE 5 LIVE] Playwright smoke starten tegen $BaseUrl ..." -ForegroundColor Cyan
npx playwright test tests/e2e/phase5-proof.spec.ts tests/e2e/phase5-routing-refresh.spec.ts --project=desktop-chromium
exit $LASTEXITCODE
