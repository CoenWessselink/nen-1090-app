# Fase G – Definitieve releasevalidatie

## Doel
Deze fase levert de laatste releasevalidatie-laag voor de frontend rebuild op basis van de bestaande backend/API en infrastructuur.

## Opgeleverd
- Uitgebreide Playwright e2e-validatie naast de eerdere smoke-tests
- Dekking voor:
  - authenticatie en routing
  - projecten CRUD-flow
  - CE-dossier uploadflow
  - planning en rapportage zonder fallback-data
  - instellingen / contractvalidatie
  - superadmin zichtbaarheid op rolbasis
- Schone broncode-oplevering zonder `node_modules`, `dist` of buildcache

## Nog altijd eerlijk begrensd
Deze fase valideert de frontend op code- en e2e-niveau binnen de buildomgeving. Een 100% vrijgaveclaim blijft pas verantwoord na runtime-validatie tegen de echte bestaande backendomgeving.

## Aanbevolen live eindcontrole
1. `.env` vullen met de echte bestaande frontend/backend-URL's.
2. `npm ci`
3. `npm run build`
4. `npx playwright install chromium`
5. `npm run test:e2e`
6. Handmatige spotcheck in staging met echte tenant- en rolaccounts.
