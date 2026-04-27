cd C:\NEN1090\nen-1090-app
npm ci
npx playwright install chromium
npm run build
npx playwright test --project=desktop-chromium
npx playwright show-report
