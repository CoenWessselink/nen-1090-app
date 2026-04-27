param(
  [string]$BaseUrl = 'https://nen-1090-app.pages.dev'
)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
npm ci
npx playwright install chromium
$env:PLAYWRIGHT_BASE_URL = $BaseUrl
$env:PLAYWRIGHT_LIVE_MODE = '1'
npm run test:enterprise:live
npx playwright show-report
