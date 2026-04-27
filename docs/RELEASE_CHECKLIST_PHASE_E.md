# Fase E — test- en release-hardening

## Doel
Deze fase maakt de frontend vrijgaveklaar zonder backend, database of infrastructuur opnieuw te bouwen.

## Inhoud van deze fase
- Playwright smoke-tests voor login-redirect, routebescherming, dashboarddata en mobiele navigatie
- releasechecklist voor handmatige validatie tegen de bestaande backend
- npm-scripts voor e2e-uitvoering en preview-gebaseerde validatie

## Handmatige vrijgavecheck tegen bestaande omgeving
1. Inloggen met echte tenant/account tegen de bestaande backend
2. Dashboard laadt zonder fallback- of mockgegevens
3. Projecten CRUD controleren tegen echte API-contracten
4. Lascontrole-opvolging controleren op bestaande eindpunten
5. CE-upload + documentlijst controleren tegen bestaande blob/documentflow
6. Planning en rapportage controleren zonder fallbackdata
7. Instellingen laden en opslaan verifiëren voor bestaande endpoints
8. Superadmin alleen valideren met rol die daar daadwerkelijk toegang toe heeft
9. Mobiel/tablet nalopen op menu, drawers, modals en tabellen
10. Sessieverloop / refresh / unauthorized flow expliciet testen

## Resultaatinterpretatie
- Een geslaagde productiebuild betekent alleen dat de frontend compileert.
- Een geslaagde Playwright-smoke-test betekent alleen dat de shell- en hoofdflows frontendmatig stabiel zijn.
- 100% functionele oplevering kan pas hard bevestigd worden na runtime-validatie tegen de echte backend/API.
