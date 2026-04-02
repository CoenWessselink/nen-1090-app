$ErrorActionPreference = "Stop"

if (-not $env:PLAYWRIGHT_BASE_URL) {
  $env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:5173"
}

Write-Host "== CWS NEN-1090 LOCAL TEST START ==" -ForegroundColor Cyan
Write-Host "Base URL: $env:PLAYWRIGHT_BASE_URL"

npm install
npx playwright install chromium
npx playwright test tests/e2e/auth-routing-smoke.spec.ts --project=desktop-chromium

Write-Host "== LOCAL TEST KLAAR ==" -ForegroundColor Green
