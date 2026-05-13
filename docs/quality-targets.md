# Kwaliteitslat (richting 9/10)

Meetbare doelen voor releases. Review elk kwartaal en pas drempels aan op basis van productie-feedback.

## Betrouwbaarheid

- **P0-productie:** geen openstaande P0 op auth, projecten, lassen, inspectie, upload of export gedurende **14 dagen** na release.
- **Rollback:** elke productierelease heeft een **bekende vorige** Pages/API-image tag om binnen **30 minuten** terug te kunnen.

## Performance (web)

- **Largest JS chunk** (build `dist/assets/*.js`, ongecomprimeerd): **≤ 620 KB** (zie `scripts/check-bundle-budget.mjs`; verhoog alleen na bewuste keuze).
- **Time-to-interactive** op mobiel: vastleggen in Lighthouse/Playwright; verbetering t.o.v. vorige baseline vastleggen in release notes.

## Onderhoudbaarheid

- **CI groen:** `typecheck`, `lint`, `build` (+ bundle-budget) op elke PR die `src/**` raakt.
- **API-drift:** wijzigingen aan de productie-API horen in **NEN10900-api** `main` te landen; lokale `backend/` in deze repo is alleen een **clone**, niet de bron van waarheid.

## Observability (volgende stap)

- Correlatie: frontend stuurt **`X-Request-Id`** (zie `src/api/client.ts`). Backend kan dezelfde id in logs echoën wanneer middleware wordt toegevoegd.

## Tests

- **Playwright smoke** op PR (bestaande workflow).
- Uitbreiden: **contractmatrix** voor nieuwe kritieke endpoints vóór grote refactors.
