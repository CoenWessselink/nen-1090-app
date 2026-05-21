Aangeleverde complete bestanden:

1. playwright.config.ts
   - Gebruikt PLAYWRIGHT_BASE_URL als die gezet is
   - Start lokaal automatisch npm run dev als PLAYWRIGHT_BASE_URL niet gezet is
   - Houdt html/json reporting aan

2. scripts/test-live.ps1
   - Draait Playwright tegen de live URL:
     https://nen1090-marketing-new.pages.dev

3. scripts/test-local-full.ps1
   - Draait install, typecheck, build, lint en Playwright lokaal

4. scripts/push-and-test-live.ps1
   - Pusht eerst naar origin main
   - Draait daarna Playwright tegen live

Plaats deze bestanden in:
- C:\NEN1090\nen-1090-app\playwright.config.ts
- C:\NEN1090\nen-1090-app\scripts\test-live.ps1
- C:\NEN1090\nen-1090-app\scripts\test-local-full.ps1
- C:\NEN1090\nen-1090-app\scripts\push-and-test-live.ps1

Uitvoeren:
powershell -ExecutionPolicy Bypass -File .\scripts\push-and-test-live.ps1
