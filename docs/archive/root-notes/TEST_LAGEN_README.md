# NEN1090 testlagen

Deze patch voegt 4 uitvoerbare testlagen toe bovenop de bestaande Playwright-suite.

## Lagen
- `npm run test:laag1` → live smoke
- `npm run test:laag2` → contract & regressie
- `npm run test:laag3a` → stub/stable UI
- `npm run test:laag3b` → live critical E2E
- `npm run test:release` → alle lagen in volgorde

## Bestandsindeling
De bestaande tests blijven in `tests/e2e`.
De laag-configs bepalen welke bestanden meelopen.

## Nieuwe live tests
- `tests/e2e/project-open-live.spec.ts`
- `tests/e2e/ce-export-live.spec.ts`

## Omgevingsvariabelen voor live tests
- `PLAYWRIGHT_BASE_URL`
- `PLAYWRIGHT_API_URL`
- `PLAYWRIGHT_LIVE_AUTH=1`
- `PLAYWRIGHT_AUTH_TENANT`
- `PLAYWRIGHT_AUTH_EMAIL`
- `PLAYWRIGHT_AUTH_PASSWORD`
