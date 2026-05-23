# WeldInspect Pro — Apple Distribution Handoff Latest

## Handoffgegevens
- Datum/tijd: 2026-05-23 17:14 CEST (Europe/Amsterdam)
- Afgeronde chatfase: Chat A0 — Branch, checklist en baseline
- Actief traject: Traject A — Apple-safe Webapp/PWA
- Repository: `CoenWessselink/nen-1090-app`
- Actieve branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit vanaf actuele `main`: `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Documentatiecommits bij aanmaak handoff:
  - `771f374066987e60b697cd2a3936218814e164bd` — `MASTER-CHECKLIST.md`
  - `470438e55424b71c0280c4f9d5b89e2b5e635f75` — `DECISIONS.md`
  - `96d5339964f5cde9833406306dec183670a02b75` — `TEST-EVIDENCE.md`
- PR/deployment/TestFlight-link: Geen; A0 maakt geen PR/deployment.
- Contextgrensstatus: Veilige overdracht vóór 70%; slechts één afgebakende A0-fase uitgevoerd.

## Wat in deze chat werkelijk is uitgevoerd
- Het geüploade masterpromptbestand en de korte chatstartprompt zijn als SSOT gelezen; uitsluitend de opdracht voor Chat A0 is uitgevoerd.
- GitHub-toegang voor `CoenWessselink/nen-1090-app` is gecontroleerd; push-/maintain-/adminrechten zijn beschikbaar via de gekoppelde repositorytoegang.
- Vastgesteld dat branch `feat/apple-ios-ipados-pwa-readiness` vóór uitvoering niet bestond.
- De actuele `main` is geverifieerd: commit `97ac4466fc7aa5ad88a01d8d4b1d193df147480b` vergeleek `identical` met `main` (`ahead_by=0`, `behind_by=0`).
- De branch `feat/apple-ios-ipados-pwa-readiness` is vanaf deze basiscommit aangemaakt.
- De vereiste directory/documentatieset is op de branch geïnitialiseerd:
  - `docs/apple-distribution/MASTER-CHECKLIST.md`
  - `docs/apple-distribution/HANDOFF-LATEST.md`
  - `docs/apple-distribution/DECISIONS.md`
  - `docs/apple-distribution/TEST-EVIDENCE.md`
- Read-only codebaseline is vastgesteld voor scripts/configuratie, PWA/metadata-eerste status, app-shell/modals/scrollarchitectuur, kritieke routes en API/proxyconfiguratie.
- Geen functionele frontendcode is gewijzigd; geen productiewrites, uploads, Billingacties, Superadminmutaties, merge of deployment uitgevoerd.

## Gewijzigde bestanden
| Bestand | Reden |
|---|---|
| `docs/apple-distribution/MASTER-CHECKLIST.md` | Permanente Apple-trajectchecklist met A0-baseline, gates en productieveiligheidsregels initialiseren. |
| `docs/apple-distribution/DECISIONS.md` | Vaststaande branch-, SSOT-, previewveiligheids- en trajectbesluiten registreren. |
| `docs/apple-distribution/TEST-EVIDENCE.md` | A0 bewijscontroles en bewust niet-uitgevoerde risicotests vastleggen. |
| `docs/apple-distribution/HANDOFF-LATEST.md` | Veilige en feitelijke overdracht voor Chat A1 bieden. |

## Uitgevoerde tests en resultaat
| Test | Omgeving/device | Resultaat | Bewijs |
|---|---|---|---|
| Repo/permissies controle | GitHub repository | PASS | Repository toegankelijk met pushrechten. |
| Branch vooraf controleren | GitHub branch search | PASS | Apple/PWA-branch was vóór A0 afwezig. |
| `main` basis vaststellen | GitHub compare | PASS | `97ac4466fc7aa5ad88a01d8d4b1d193df147480b` is identiek aan actuele `main`. |
| Branch aanmaken | GitHub | PASS | `feat/apple-ios-ipados-pwa-readiness` aangemaakt vanaf actuele `main`. |
| Scripts/config baseline | `package.json` | PASS | Typecheck/lint/build/Pages/Playwright/release-verifyscripts vastgesteld. |
| Metadata/PWA eerste baseline | `index.html`, `vite.config.ts`, standaard manifestpaden | PASS met vervolgaudit | Standaardviewport/titel aanwezig; Apple/PWA metadata/plugin/standaardmanifest nog niet vastgesteld. |
| Shell/modal/mobile baseline | `AppShell.tsx`, `Modal.tsx`, `runtime-mobile-hotfix.css`, `main.tsx` | PASS met toekomstig werkpunt | Portalmodal en single-scrollarchitectuur aanwezig; safe-area-insets nog niet vastgesteld. |
| Routes baseline | `routes.tsx` | PASS | CE-report, Billing, Superadmin, Control Center en Tenant 360 routes vastgelegd. |
| Proxy/API veiligheidsbaseline | `env.ts`, `client.ts`, Pages Function, `wrangler.toml` | PASS met blocking regel | Same-origin cookie-authproxy; productie-Azure origin als baseline, dus preview read-only vóór stagingbewijs. |

## Productieveiligheid
- Writes tegen productie uitgevoerd: **NEE**.
- Uploads, saveacties, factuurmutaties of Superadminmutaties uitgevoerd: **NEE**.
- Functionele code aangepast: **NEE**; uitsluitend documentatie op nieuwe featurebranch.
- Preview API-target: Niet ingezet in A0; configuratiebaseline bevat productie-Azure upstream, daarom preview later alleen read-only totdat A5 staging aantoont.
- Stagingisolatie status: Niet ingericht of bewezen; vereist vóór schrijftests.
- Secrets toegevoegd aan repo: **NEE**.
- Merge naar `main`: **NEE**.

## Feitelijke baseline voor Chat A1
### Scripts/configuratie
- `package.json`: React/TypeScript/Vite frontend met scripts `build`, `build:pages`, `typecheck`, `lint:ci`, `test:smoke`, `test:e2e`, `test:workflows` en `release:verify`.
- `vite.config.ts`: Reactplugin, alias `@`, Vite dev/preview server en `dist` output; geen PWA-plugin vastgesteld in dit bestand.

### PWA/Apple startsituatie
- `index.html`: standaardviewport en titel `NEN1090 App`; geen Apple home-screen metadata, theme-color of manifestlink vastgesteld.
- Directe controle van `public/manifest.webmanifest` en `public/manifest.json`: niet aangetroffen.
- A1 moet repositorybreed icons, overige manifests, service workers, public assets en deploymentoutputs onderzoeken.

### Layoutarchitectuur
- `AppShell.tsx`: Sidebar + Topbar + `.page-canvas` + MobileTabbar + notificaties/toasts.
- `Modal.tsx`: portal naar `document.body`, body scroll-lock en pointer-dragging voor desktop modals.
- `runtime-mobile-hotfix.css`: één scrollcanvas (`.page-canvas`), `100dvh` shell/overlays en globale modalregels; safe-area-inset-gebruik niet vastgesteld in gecontroleerde stylesheet.

### Kritieke no-regression routes
- CE-report SSOT: `/projecten/:projectId/ce-report`.
- Billing: `/billing`.
- Superadmin: `/superadmin`.
- Control Center: `/superadmin/control-center`.
- Tenant 360: `/superadmin/tenant/:tenantId/profile`.

### API/proxy
- `env.ts`: standaard `/api/v1` same-origin API-target.
- `client.ts`: `credentials: 'include'`, refreshretry en protected file downloads.
- `functions/api/[[path]].js`: Cloudflare Pages proxy met HttpOnly cookieflow.
- `wrangler.toml`: productie-Azure origin is de huidige upstreambaseline; A1/A5 moeten preview- en stagingveiligheid feitelijk afdwingen.

## Besluiten van eigenaar die reeds vaststaan
- Werk uitsluitend volgens de geüploade Apple PWA + App Store masterprompt en korte faseprompts.
- Traject A wordt op `feat/apple-ios-ipados-pwa-readiness` uitgevoerd; niet op `main`.
- Geen merge naar `main`, TestFlight submission of App Store submission zonder expliciete toestemming.
- Geen writes/uploads/Billing-/Superadminmutaties tegen productiedata.
- Backend blijft SSOT; CE-report route blijft visuele SSOT.

## Acties die eigenaar nu moet uitvoeren
- Geen eigenaaractie noodzakelijk om Chat A1 te starten.
- Nog geen iPhone-previewtest, Cloudflare Access-handeling, Azure staginghandeling of Apple Developeractie nodig in A0.

## Open risico’s/blockers
- A1 moet nog exact vaststellen waar iconen/manifests/service-workerbestanden, uploadflows, CE CSS, Billing/Superadminbestanden en deploymentinstellingen zich bevinden.
- De huidige proxy/wranglerbaseline kan productie-Azure aanspreken; preview mag daarom vóór groen stagingbewijs uitsluitend read-only worden gebruikt.
- Stagingdatabase, stagingstorage, veilige testmail en billingtestmodus zijn nog niet bewezen; dit blokkeert alle schrijftests vanaf A6/A7 totdat A5 groen is.

## Volgende chat moet eerst lezen
1. Het masterpromptbestand `WeldInspect-Pro-Apple-PWA-App-Store-Masterprompt-Meer-Chat-Bouwfasen-Checklist-2026-05-23.txt`.
2. `docs/apple-distribution/MASTER-CHECKLIST.md` op branch `feat/apple-ios-ipados-pwa-readiness`.
3. `docs/apple-distribution/HANDOFF-LATEST.md` op dezelfde branch.
4. `docs/apple-distribution/DECISIONS.md` en `docs/apple-distribution/TEST-EVIDENCE.md`.
5. Relevante baselinebestanden: `package.json`, `index.html`, `vite.config.ts`, `src/main.tsx`, `src/app/router/routes.tsx`, `src/app/layout/AppShell.tsx`, `src/components/overlays/Modal.tsx`, `src/styles/runtime-mobile-hotfix.css`, `src/lib/env.ts`, `src/api/client.ts`, `functions/api/[[path]].js`, `wrangler.toml`.

## Exacte startopdracht volgende chat — Chat A1
“Lees het masterpromptbestand, `docs/apple-distribution/MASTER-CHECKLIST.md` en `docs/apple-distribution/HANDOFF-LATEST.md` volledig in. Voer uitsluitend Chat A1 uit op branch `feat/apple-ios-ipados-pwa-readiness`.

Rond de volledige Apple/PWA-, frontend-, Cloudflare Preview- en Azure Staging-audit af. Inspecteer feitelijk metadata/icons/manifest/service worker, app-shell/CSS/modals, uploads, CE-report, Billing, Superadmin/Control Center, API-target/proxy en bestaande deploymentconfiguratie. Bepaal exact welke bestanden in latere fases aangepast moeten worden en welke stagingisolatie nodig is vóór writes.

Geen risicovolle featurebouw en geen productiewrites. Commit/push de auditdocumentatie, werk checklist en handoff bij en lever de startopdracht voor Chat A2. Stop vóór 70% context.”
