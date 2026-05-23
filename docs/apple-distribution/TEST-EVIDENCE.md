# WeldInspect Pro — Apple Distribution Test Evidence

## Documentstatus
- Masterpromptversie: 2026-05-23
- Actieve fase: Chat A0 — Branch, checklist en baseline
- Repository: `CoenWessselink/nen-1090-app`
- Branch: `feat/apple-ios-ipados-pwa-readiness`
- Baseline `main` SHA: `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Datum: 2026-05-23 (Europe/Amsterdam)

## Testbeleid A0
Chat A0 is volgens de SSOT uitsluitend bedoeld voor veilige branchinitialisatie en read-only baseline-inspectie. Daarom zijn geen functionele changes, geen deploymenttests, geen browserwrites, geen uploads en geen productiegegevensmutaties uitgevoerd.

## A0 — Uitgevoerde bewijscontroles

| ID | Controle | Omgeving / bron | Resultaat | Bewijs / conclusie |
|---|---|---|---|---|
| A0-E01 | Repositorytoegang en permissie | GitHub repository `CoenWessselink/nen-1090-app` | PASS | Repository aanwezig; connector meldde `admin`, `maintain`, `push` en `pull` rechten. |
| A0-E02 | Gewenste branch vooraf afwezig | GitHub branch search vóór creatie | PASS | `feat/apple-ios-ipados-pwa-readiness` bestond niet vóór A0; geen eerdere branchbasis overschreven. |
| A0-E03 | Actuele `main` basis verifiëren | GitHub compare: `97ac4466fc7aa5ad88a01d8d4b1d193df147480b` versus `main` | PASS | Status `identical`, `ahead_by=0`, `behind_by=0`; dit is de A0 basiscommit. |
| A0-E04 | Veilige branch aanmaken | GitHub create branch | PASS | Branch `feat/apple-ios-ipados-pwa-readiness` aangemaakt vanaf geverifieerde `main` SHA. |
| A0-E05 | Build-/testscripts inventariseren | `package.json` op `main` | PASS | Scripts voor `build`, `build:pages`, `typecheck`, `lint:ci`, Playwright tests en `release:verify` aanwezig. Geen scripts uitgevoerd omdat A0 alleen documentatie wijzigt. |
| A0-E06 | Apple/PWA metadata eerste baseline | `index.html`, `vite.config.ts`, standaardmanifestpaden | PASS met open auditpunt | Alleen standaard viewport/titel zichtbaar; geen PWA plugin in Vite-config; standaard manifestpaden niet aangetroffen. A1 voert repositorybrede audit uit. |
| A0-E07 | App-shell en modalbaseline | `AppShell.tsx`, `Modal.tsx`, `runtime-mobile-hotfix.css` | PASS met toekomstig verbeterpunt | Bestaande shell en portalmodal vastgesteld; één-scrollarchitectuur aanwezig; safe-area-inset gebruik nog niet aangetroffen in gecontroleerd CSS-bestand. |
| A0-E08 | Kritieke routes vastleggen | `src/app/router/routes.tsx` | PASS | CE-report, Billing, Superadmin, Control Center en Tenant 360 routes feitelijk aanwezig en beschermd als no-regression scope. |
| A0-E09 | API-/previewveiligheidsbaseline | `env.ts`, `client.ts`, `functions/api/[[path]].js`, `wrangler.toml` | PASS met blocking veiligheidsregel | Frontend gebruikt same-origin proxy/cookie-auth; configuratie bevat productie-Azure origin als baseline. Preview mag daarom geen writes uitvoeren vóór A5 stagingbewijs. |
| A0-E10 | Productiewrites voorkomen | Gehele A0 uitvoering | PASS | Geen runtime login, upload, save, Billing-actie of Superadminmutatie uitgevoerd; uitsluitend GitHub branchdocumentatie geschreven. |

## A0 — Gewijzigde bestanden en documentatiecommits

| Bestand | Reden | Commit-SHA |
|---|---|---|
| `docs/apple-distribution/MASTER-CHECKLIST.md` | Permanente fasechecklist, baseline, productieveiligheid en gates vastleggen | `771f374066987e60b697cd2a3936218814e164bd` |
| `docs/apple-distribution/DECISIONS.md` | Vaststaande veiligheids- en distributiebesluiten vastleggen | `470438e55424b71c0280c4f9d5b89e2b5e635f75` |
| `docs/apple-distribution/TEST-EVIDENCE.md` | Deze bewijsregistratie initialiseren | Wordt na commit vastgelegd in handoff/checklist |
| `docs/apple-distribution/HANDOFF-LATEST.md` | Volgende chat veilig laten vervolgen | Wordt na commit vastgelegd in handoff/checklist |

## Niet uitgevoerd in A0 — bewust

| Activiteit | Reden | Eerst toegestane fase |
|---|---|---|
| PWA/icon/metadata code wijzigen | A0 is baseline-only | A2 na A1 audit |
| Device/browser/preview visuele tests | Nog geen preview of featurewijziging | A2/A3 |
| Upload-/save-/Billing-/Superadminmutatietests | Stagingisolatie nog niet bewezen | A6/A7 na groene A5 |
| Merge naar `main` | Alleen na eigenaarreview en expliciet akkoord | A9 |
| Capacitor/Xcode/App Storewerk | Traject A nog niet afgerond | B0/B1 en later |

## Verplichte bewijslast voor Chat A1
Chat A1 moet, zonder productiewrites, de volgende bewijsgebieden verdiepen:
1. repositorybrede metadata/icon/manifest/service-workerstatus;
2. globale styles, shell, tabbar, sidebar, modals, toast- en uploadinputlocaties;
3. CE-report CSS/PDF, Billing en Superadmin/Control Center implementatiebestanden;
4. Cloudflare Pages Preview configuratie en Access-status indien toegankelijk;
5. Azure stagingmogelijkheden en minimale isolatiebehoefte voor A5;
6. exact bestandsoverzicht voor A2 t/m A8.
