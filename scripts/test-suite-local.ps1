$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
npm ci
npx playwright install chromium
npm run build
npm run test:enterprise:local
npx playwright show-report
