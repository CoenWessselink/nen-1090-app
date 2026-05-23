# WeldInspect Pro — Apple PWA & iOS App Store Master Checklist

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatste update: 2026-05-23 17:14 CEST (Europe/Amsterdam)
- Actief traject: Traject A — Apple-safe Webapp/PWA
- Actieve chatfase: Chat A0 — Branch, checklist en baseline
- Actieve repository: `CoenWessselink/nen-1090-app`
- Actieve branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit (`main`): `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Basiscommitverificatie: `compare_commits(base=97ac4466fc7aa5ad88a01d8d4b1d193df147480b, head=main)` gaf `identical`, `ahead_by=0`, `behind_by=0` bij start A0.
- Laatste commit: wordt bijgewerkt met branchdocumentatiecommits van A0.
- PR-link: Niet aangemaakt — A0 mag geen PR/merge uitvoeren.
- Preview/TestFlight-link: Niet van toepassing in A0.
- Hoofdstatus: `IN UITVOERING` — A0 documentatiebaseline wordt vastgelegd.
- Volgende directe actie: Rond A0 documentatiecommit af; daarna uitsluitend Chat A1 uitvoeren voor volledige audit en uitvoerscope.

## Statuslegenda
- [ ] Niet gestart
- [~] In uitvoering
- [x] Gereed en bewezen
- [!] Geblokkeerd / eigenaaractie vereist
- [-] Niet van toepassing — reden vastgelegd

## Harde productiebeveiliging
- [x] Geen wijzigingen rechtstreeks op `main` uitgevoerd; A0-branch is gemaakt vanaf geverifieerde actuele `main`.
- [x] Geen writes/uploads/facturen/superadminmutaties tegen productiedata getest in A0.
- [x] Geen secrets in repo of documentatie opgenomen.
- [x] Backend blijft SSOT; A0 bevat alleen documentatie.
- [x] CE-report visuele SSOT `/projecten/:projectId/ce-report` ongewijzigd behouden.
- [ ] Rollback per toekomstige merge/release vastgelegd — pas vereist wanneer code/PR ontstaat.

## A0-baseline: feitelijke read-only inspectie van actuele `main`

### Repository en scripts
- Frontendstack: React 18 + TypeScript + Vite 6 volgens `package.json`.
- Relevante scripts aanwezig: `build`, `build:pages`, `typecheck`, `lint`, `lint:ci`, `test`, `test:smoke`, `test:e2e`, `test:workflows`, `release:verify`.
- A0 voert geen dependency-installatie of build uit omdat uitsluitend documenten worden toegevoegd; A2/A8 gebruiken de bestaande release-/testcommando’s.

### PWA/Apple metadata-status
- `index.html` bevat `charset`, een standaardviewport (`width=device-width, initial-scale=1.0`) en titel `NEN1090 App`.
- In `index.html` zijn bij A0 geen `apple-mobile-web-app-*`, `theme-color`, Apple touch icon of manifestlink vastgesteld.
- `vite.config.ts` configureert React/Vite, alias, server/preview en `dist` build; geen PWA-pluginconfiguratie is daarin vastgesteld.
- `public/manifest.webmanifest` en `public/manifest.json` zijn bij directe controle niet aangetroffen.
- Nadere repositorybrede service-worker/icon/assetverificatie hoort expliciet bij A1; A0 concludeert nog niet dat iedere mogelijke asset ontbreekt.

### Layout-, mobile- en modalarchitectuur
- `src/app/layout/AppShell.tsx` composeert `Sidebar`, `Topbar`, `MobileTabbar`, `NotificationCenter`, `ToastViewport` en de `page-canvas`/router outlet.
- `src/components/overlays/Modal.tsx` gebruikt reeds `createPortal(..., document.body)`, body-scroll-lock bij open modal en pointer-dragging voor niet-fullscreen modals.
- `src/main.tsx` importeert meerdere globale stijlbestanden, waaronder `src/styles/runtime-mobile-hotfix.css` en CE-report-printstyles.
- `src/styles/runtime-mobile-hotfix.css` legt één verticale scrollcontainer in `.page-canvas` vast, gebruikt `100dvh` voor shell/overlays en behandelt mobile modals; bij A0 zijn daarin geen `env(safe-area-inset-*)`-toepassingen aangetroffen.

### Kritieke routes die beschermd blijven
Bron: `src/app/router/routes.tsx` op de A0-basiscommit.
- CE-report visuele SSOT: `/projecten/:projectId/ce-report` → `CeReportPrintPage`.
- CE-dossier: `/projecten/:projectId/ce-dossier` redirect naar `/projecten/:projectId/ce-v2` → `MobileCeDossierPage`.
- Billing/Facturatie: `/billing` → `BillingPage`; sidebar-meta toont `Facturatie`.
- Superadmin: `/superadmin` → `SuperadminControlCenter` achter `RoleGuard`.
- Control Center: `/superadmin/control-center` → `SuperadminControlCenterPage` achter `RoleGuard`.
- Tenant 360: `/superadmin/tenant/:tenantId/profile` → `TenantProfilePage` achter `RoleGuard`.
- Auth-basis: `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/activate-account` en `/change-password`.

### API/proxy/deploymentbaseline
- `src/lib/env.ts` gebruikt standaard same-origin `apiBaseUrl = '/api/v1'`, tenzij `VITE_API_BASE_URL` expliciet is gezet.
- `src/api/client.ts` gebruikt `credentials: 'include'`, refreshretry op 401 en protected download via blob/object URL.
- `functions/api/[[path]].js` is de Cloudflare Pages API-proxy met HttpOnly cookies en een `AZURE_API_ORIGIN`/`BACKEND_API_BASE` upstream.
- `wrangler.toml` bevat als huidige baseline voor beide upstreamvariabelen de productie-Azure API-origin. Conclusie: iedere branch-preview blijft **read-only** zolang A5 geen geïsoleerde preview → staging-route aantoonbaar groen heeft gemaakt.

## Traject A — Apple-safe Webapp/PWA

### A0 Branch/checklist/baseline
- Status: [~] In uitvoering — documentatie wordt op actieve branch geschreven.
- Chat: A0, 2026-05-23.
- Agenttaken: branch maken vanaf actuele `main`; vier distributiedocumenten initialiseren; read-only baseline inspecteren; geen featurebouw.
- Eigenaarstaken: geen handmatige Cloudflare/Azure/Apple acties vereist in A0; branch mag volgens aangeleverde opdracht gepusht worden.
- Gewijzigde bestanden: `docs/apple-distribution/MASTER-CHECKLIST.md`, `HANDOFF-LATEST.md`, `DECISIONS.md`, `TEST-EVIDENCE.md`.
- Commit: documentatiecommits worden in handoff na schrijven vastgelegd.
- Testbewijs: `main`-vergelijking identiek op basis-SHA; branch bestond vooraf niet; feitelijke bestandinspecties hierboven.
- Gate: doorgaan naar A1 pas wanneer vier documenten op de branch staan en handoff is bijgewerkt.

### A1 Audit
- Status: [ ] Niet gestart.
- Chat: A1.
- Gewijzigde bestanden: verwacht primair documentatie; pas na feitelijke audit bepalen.
- Commit: Nog niet beschikbaar.
- Bevindingen: Nog uit te voeren.
- Gate: Volledige Apple/PWA/frontend/Cloudflare-preview/Azure-stagingaudit; geen risicovolle featurebouw of productiewrites.

### A2 PWA metadata/icons/preview
- Status: [ ] Niet gestart.
- Preview URL: Nog niet beschikbaar.
- Access status: Nog niet gecontroleerd.
- API target: Baseline proxy wijst mogelijk naar productie; preview alleen read-only totdat staging aantoonbaar is.
- Commit: Nog niet beschikbaar.
- iPhone add-to-home-screen bewijs: Nog niet beschikbaar.
- Gate: branded iconassets en installability bewezen zonder onveilige offlinecache.

### A3 Safe area/app shell
- Status: [ ] Niet gestart.
- Commit: Nog niet beschikbaar.
- Geteste viewports: Vereist: 375x667, 393x852, 852x393, 768x1024, 1024x768 en desktop.
- Devicebewijs: Nog niet beschikbaar.
- Gate: geen notch/Home Indicator-overlap, horizontale overflow of CE/desktopprintregressie.

### A4 Touch/keyboard/forms/modals
- Status: [ ] Niet gestart.
- Commit: Nog niet beschikbaar.
- Testflows: login, project/las/inspectie, instellingen, Billing en Superadmin zonder productiedata te wijzigen.
- Gate: primaire acties touchbaar; toetsenbord blokkeert geen actie; desktop intact.

### A5 Stagingisolatie
- Status: [ ] Niet gestart.
- API staging hostname: Niet bevestigd.
- Aparte DB bevestigd: NEE.
- Aparte storage bevestigd: NEE.
- Testmail/billingveiligheid: Niet bevestigd.
- Preview → staging bewijs: Niet beschikbaar.
- Gate: geen writes of uploads vóór geïsoleerde API/database/storage/e-mail/billingketen bewezen is.

### A6 Uploads
- Status: [ ] Niet gestart.
- Commit: Nog niet beschikbaar.
- Uploadmatrix: inspectie-/lasfoto, WPS, lassercertificaat, lascoördinatorcertificaat, bedrijfslogo en CE/documenten vereist.
- HEIC/HEIF besluit: Nog niet genomen.
- Gate: uitsluitend op staging testen en bewijs vastleggen.

### A7 CE/Billing/Superadmin regressie
- Status: [ ] Niet gestart.
- Commit: Nog niet beschikbaar.
- CE-report resultaat: Nog niet getest; beschermd testproject volgens masterprompt: `52d28660-4880-480c-8091-bfa633688373`.
- Billing resultaat: Nog niet getest.
- Superadmin/Control Center resultaat: Nog niet getest.
- Gate: uitsluitend staging-writes; geen frontendmaskering van backendfouten.

### A8 Final test/PR
- Status: [ ] Niet gestart.
- PR: Geen.
- Main sync: Nog niet uitgevoerd.
- Automatische tests: Nog niet uitgevoerd.
- Device matrix: Nog niet uitgevoerd.
- Gate: PR naar `main` voorbereiden; niet mergen.

### A9 Merge/productievalidatie
- Status: [ ] Niet gestart.
- Expliciet mergeakkoord: NEE.
- Merge commit: Niet beschikbaar.
- Live tests: Niet uitgevoerd.
- Rollback: Nog niet vastgelegd.
- Gate: uitsluitend na expliciet eigenaarakkoord.

## Traject B — iOS App Store

### B0 Apple prerequisites/besluiten
- Status: [ ] Niet gestart; mag pas na Traject A merge en livevalidatie.
- Organisatieaccount: Niet beoordeeld.
- D-U-N-S: Niet beoordeeld.
- Membership: Niet beoordeeld.
- App Store Connect: Niet beoordeeld.
- Distributiekeuze: Nog te besluiten; masterprompt adviseert eerste zakelijke release als Unlisted App wanneer passend.
- Billingstrategie: Nog formeel te besluiten; uitgangspunt is zakelijke companion-app zonder iOS trial/checkout/upgrade.
- Privacy/support URLs: Niet beoordeeld.
- Mac/Xcode/devices: Niet beoordeeld.
- Gate: geen native code vóór blocking besluiten.

### B1 Capacitor/Xcode basis
- Status: [ ] Niet gestart.
- Branch: Nog niet maken vóór B1.
- Commit: Niet beschikbaar.
- Bundle ID: Nog te besluiten.
- Build resultaat: Niet beschikbaar.
- Web regressie: Niet beschikbaar.
- Gate: B0-besluiten vereist.

### B2 Native meerwaarde
- Status: [ ] Niet gestart.
- Camera: Niet gebouwd.
- Document picker: Niet gebouwd.
- PDF/share: Niet gebouwd.
- Commit: Niet beschikbaar.
- Gate: uitsluitend na B1.

### B3 Auth/security
- Status: [ ] Niet gestart.
- Sessiestrategie: Nog niet vastgesteld.
- Permissions: Nog niet vastgesteld.
- ATS/TLS: Nog niet vastgesteld.
- Commit: Niet beschikbaar.
- Gate: staging-auth bewezen zonder onveilige plaintext tokenopslag.

### B4 Billing/privacy compliance
- Status: [ ] Niet gestart.
- iOS billing gating: Niet gebouwd.
- Signup/account deletion besluit: Niet genomen.
- Privacy matrix: Niet opgesteld.
- Review notes: Niet opgesteld.
- Gate: eigenaarbesluiten vereist vóór release candidate.

### B5 Native E2E
- Status: [ ] Niet gestart.
- Staging build: Niet beschikbaar.
- Device matrix: Niet uitgevoerd.
- Kritieke flows: Niet getest.
- Gate: geen TestFlight upload met kritieke bugs.

### B6 Submission assets/metadata
- Status: [ ] Niet gestart.
- Screenshots: Niet opgesteld.
- Appbeschrijving: Niet opgesteld.
- App Privacy Details: Niet opgesteld.
- Review account: Niet ingericht.
- Gate: uitsluitend demo-/stagingdata.

### B7 TestFlight
- Status: [ ] Niet gestart.
- Build number: Niet beschikbaar.
- Build commit: Niet beschikbaar.
- API target: Niet beschikbaar.
- Testers: Niet ingericht.
- Gate: geen App Review submission.

### B8 Pilot/release candidate
- Status: [ ] Niet gestart.
- Feedback: Niet beschikbaar.
- Fixes: Niet beschikbaar.
- RC build: Niet beschikbaar.
- Submission akkoord: NEE.
- Gate: expliciet akkoord vereist.

### B9 App Review
- Status: [ ] Niet gestart.
- Submissiondatum: Niet beschikbaar.
- Distributievorm: Niet besloten.
- Reviewstatus: Niet beschikbaar.
- Vragen/afwijzingen: Niet beschikbaar.
- Gate: uitsluitend na expliciet submissionakkoord.

### B10 Release
- Status: [ ] Niet gestart.
- Goedgekeurde versie: Niet beschikbaar.
- Releasedatum: Niet beschikbaar.
- Store/direct link: Niet beschikbaar.
- Live smoke tests: Niet uitgevoerd.
- Support/rollback: Niet opgesteld.
- Gate: uitsluitend na Apple-goedkeuring en eigenaarreleaseakkoord.

## Doorlopende regressiecontrole
| Flow | Laatste testdatum | Omgeving | Resultaat | Bewijs |
|---|---|---|---|---|
| Login/cookie-auth/logout | 2026-05-23 | Codebaseline `main` | Alleen route/API-architectuur vastgesteld; geen runtime test in A0 | `routes.tsx`, `client.ts`, Pages proxy |
| Dashboard/Projecten | 2026-05-23 | Codebaseline `main` | Routes bestaan; geen runtime test in A0 | `routes.tsx` |
| Lassen/inspecties | 2026-05-23 | Codebaseline `main` | Routes bestaan; geen runtime test in A0 | `routes.tsx` |
| Uploads | 2026-05-23 | Geen schrijftest | Niet getest wegens productiebeveiliging | Staging vereist vanaf A5/A6 |
| CE Dossier/report/PDF | 2026-05-23 | Codebaseline `main` | Route-SSOT vastgesteld; geen visuele runtime test in A0 | `routes.tsx`, `main.tsx` |
| Instellingen/logo | 2026-05-23 | Codebaseline `main` | Route vastgesteld; geen runtime test in A0 | `routes.tsx` |
| Billing/Facturatie | 2026-05-23 | Codebaseline `main` | Route/sidebar-meta vastgesteld; geen runtime test in A0 | `routes.tsx` |
| Superadmin/Tenant 360/Control Center | 2026-05-23 | Codebaseline `main` | Protected routes vastgesteld; geen runtime test in A0 | `routes.tsx`, `AppShell.tsx` |

## Besluitregister
| Datum | Besluit | Door wie | Impact |
|---|---|---|---|
| 2026-05-23 | Traject A start op aparte branch `feat/apple-ios-ipados-pwa-readiness`; geen merge of productiewrites in A0 | Eigenaar via masterprompt/A0-opdracht | Productie blijft beschermd; documentatiebaseline kan worden vastgelegd |
| 2026-05-23 | Preview moet read-only blijven zolang API-target niet aantoonbaar staging-geïsoleerd is | Masterprompt + A0 baselinecontrole | Voorkomt writes tegen productie-origin uit `wrangler.toml`/proxyconfiguratie |
| 2026-05-23 | CE-report route `/projecten/:projectId/ce-report` blijft visuele SSOT | Masterprompt + routebaseline | Geen aparte Apple/iOS rapporttemplate bouwen |

## Open blokkades
| ID | Probleem | Benodigde actie | Eigenaar/agent | Status |
|---|---|---|---|---|
| A1-01 | Volledige repo-/PWA-/asset-/Cloudflare-/Azure-audit nog niet uitgevoerd | Chat A1 uitvoeren op actieve branch | Agent | Open voor volgende fase |
| A5-01 | Preview upstream/stagingisolatie niet bewezen; baseline kan productie-Azure gebruiken | Geen writes; in A5 stagingketen isoleren en bewijzen | Agent/eigenaar afhankelijk van toegang | Blocking vóór writes/uploads |
