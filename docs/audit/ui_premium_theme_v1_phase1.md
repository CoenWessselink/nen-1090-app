# UI Premium Theme v1 — fase 1

Status: afgerond voor testmoment
Datum: 2026-05-20
Scope: frontend-only visual CSS layer

## Doel

Een eerste premium mobiele visuele laag toepassen op basis van de gekozen dashboard-referentie, zonder bestaande componentlogica, routing, API, CE, auth of storage te wijzigen.

## Gewijzigd

- `src/styles/premium-mobile-theme.css`
- `src/main.tsx`

## Aanpak

De nieuwe CSS is als laatste stylesheet geïmporteerd, zodat bestaande runtime/mobile fixes behouden blijven en de premium laag alleen visueel overrulet.

## Visuele onderdelen fase 1

- mobiele pagina-achtergrond;
- premium blauwe mobiele header;
- glassy menu- en notificatieknoppen;
- KPI/dashboard cards met gradient, grotere typografie en icon badges;
- mobile spacing/radius/shadow tokens;
- responsive tuning voor smalle schermen.

## Niet gewijzigd

- Geen backend.
- Geen routing.
- Geen API calls.
- Geen CE dossier logica.
- Geen auth.
- Geen storage.
- Geen component-rebuild.
- Geen desktop herbouw.

## Test checklist

Na deploy controleren op mobiel en desktop responsive mode:

1. Dashboard opent zonder runtime error.
2. Header is niet te hoog en knoppen blijven klikbaar.
3. Dashboard KPI cards blijven klikbaar.
4. Bottom nav blijft zichtbaar en klikbaar.
5. Projecten, Rapporten en Instellingen openen nog correct.
6. Forms blijven leesbaar.
7. Modals/popups blijven boven alles zichtbaar.
8. Geen horizontale scroll.
9. Geen overlap met iOS Safari bottom bar.

## Volgende UI-fase

UI Premium Theme v1 fase 2 kan gericht uitbreiden naar:

- bottom navigation extra polish;
- snelle acties/dashboard detail cards;
- Projects list/cards;
- Settings cards/forms;
- Weld create/edit forms;
- CE dossier cards/status rows.
