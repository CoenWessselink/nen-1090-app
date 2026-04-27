# AUTH Block C release runbook

## Doel
Blok C sluit de laatste AUTH-gaps met live E2E-validatie en release-bewijsvoering.

## Voorwaarden
- Gebruik de echte API base URL.
- Gebruik een bestaand testaccount binnen de juiste tenant.
- Zorg dat Alembic migration `0019_auth_hardening_persistence.py` is uitgerold.
- Gebruik voor reset/change-password óf een non-prod API die `reset_token` teruggeeft, óf lever handmatig `PLAYWRIGHT_AUTH_RESET_TOKEN` aan.

## Aanbevolen volgorde
1. Frontend build maken.
2. Lokale preview starten.
3. Live auth matrix draaien.
4. Playwright live auth suite draaien.
5. Evidence document genereren.
6. Handmatige DB/audit checks aftekenen.

## Commands
```bash
npm run build
npm run auth:matrix:live
npm run test:e2e:auth:live
npm run auth:release:evidence
```

## Minimale env
Gebruik `.env.playwright.live.example` als startpunt.

## Verwachte uitkomsten
- login groen
- refresh rotatie groen
- oude refresh token na rotatie afgekeurd
- logout groen
- refresh token na logout afgekeurd
- forgot password request groen
- reset/change-password groen indien reset token beschikbaar is

## Handmatige eindcontrole
- Controleer audit-log records in database.
- Controleer dat reset tokens eenmalig zijn gebruikt.
- Controleer dat refresh tokens na logout/change/reset zijn ingetrokken.
- Controleer dat er geen `.env` file is meegeleverd in de repo.

## Resultaatlocaties
- `auth-release-evidence/live-auth-matrix.json`
- `auth-release-evidence/AUTH_RELEASE_EVIDENCE.md`
- `playwright-report/`
