param(
  [switch]$SmokeOnly
)

$ErrorActionPreference = "Stop"
$env:PLAYWRIGHT_BASE_URL = "https://nen-1090-app.pages.dev"
$env:DEMO_TENANT = "demo"
$env:DEMO_EMAIL = "admin@demo.com"
$env:DEMO_PASSWORD = "Admin123!"

Write-Host "== CWS NEN-1090 LIVE TEST START ==" -ForegroundColor Cyan
Write-Host "Base URL: $env:PLAYWRIGHT_BASE_URL"

npm install
npx playwright install chromium

if ($SmokeOnly) {
  npx playwright test tests/e2e/auth-routing-smoke.spec.ts --project=desktop-chromium
} else {
  npx playwright test tests/e2e/auth-routing-smoke.spec.ts tests/e2e/live-auth.spec.ts --project=desktop-chromium
}

Write-Host "== LIVE TEST KLAAR ==" -ForegroundColor Green
