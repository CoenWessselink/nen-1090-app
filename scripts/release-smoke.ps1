$ErrorActionPreference = 'Stop'
Write-Host '1/4 npm ci'
npm ci
Write-Host '2/4 productiebuild'
npm run build
Write-Host '3/4 Playwright browsers installeren'
npx playwright install --with-deps chromium
Write-Host '4/4 e2e smoke tests'
npm run test:e2e
