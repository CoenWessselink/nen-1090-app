# UI Premium Theme v1 — fase 2 appbreed

Status: afgerond voor testmoment
Datum: 2026-05-20
Scope: frontend-only appbrede visuele CSS-laag

## Doel

De premium mobiele stijl uit fase 1 doorvoeren over alle hoofdschermen zonder backend, routing, API, auth, CE, storage of businesslogica aan te passen.

## Gewijzigd

- `src/styles/premium-mobile-theme.css`

## Uitgebreid naar

- algemene cards;
- settings cards/panels;
- project/report/billing/superadmin/CE/content/detail/form/list cards;
- forms, inputs, selects en textareas;
- primaire knoppen;
- tabellen;
- bottom navigation / tabbar candidates;
- modals/dialogs;
- tabs/filter tabs/segmented controls;
- state cards, alerts, empty/loading/error states.

## Niet gewijzigd

- Geen backend.
- Geen API.
- Geen CE dossier logica.
- Geen auth.
- Geen storage.
- Geen routing.
- Geen component-rebuild.

## Test checklist

Na deploy controleren:

1. Dashboard.
2. Projectenlijst.
3. Project detail / Project 360.
4. Weld create/edit.
5. CE dossier.
6. Rapportage.
7. Instellingen inclusief logo/WPS/lassers/coördinatoren/templates.
8. Billing.
9. Superadmin.
10. Modals/popups.
11. Tabellen en filters.
12. Bottom nav.
13. Geen horizontale scroll.
14. Geen onleesbare tekst door kleurcontrast.
15. Geen gebroken desktop/tablet layout.

## Risico

Laag/middel: het is CSS-only, maar gebruikt appbrede selectors met `!important` om bestaande hotfix-lagen visueel te overrulen. Visuele regressie is mogelijk op schermen met afwijkende oude classnamen. Functionele regressie wordt niet verwacht.
