# WeldInspect Pro — Apple PWA & iOS App Store Master Checklist

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatste update: 2026-05-23 (Europe/Amsterdam)
- Actief traject: Traject A — Apple-safe Webapp/PWA
- Actieve chatfase: Chat A1 — Volledige audit en uitvoerscope — **afgerond**
- Actieve repository: `CoenWessselink/nen-1090-app`
- Actieve branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit (`main`): `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Laatste A1-documentatiecommits: `fdbeed46822ad251d907113008cd8fffc44506ba`, `b379dc3f09679b5b754a0cf8754c7898042e6caf`, plus deze checklist-/handoffafsluiting.
- PR-link: Niet aangemaakt — A1 mag geen PR/merge uitvoeren.
- Preview/TestFlight-link: Niet beschikbaar — A2 moet Preview Deployment en Access-status vastleggen.
- Hoofdstatus: `A1 GEREED EN BEWEZEN / KLAAR VOOR CHAT A2`.
- Volgende directe actie: Voer uitsluitend Chat A2 uit: PWA metadata, branded iconassets en Cloudflare Previewcontrole; preview blijft read-only zolang A5 niet groen is.

## Statuslegenda
- [ ] Niet gestart
- [~] In uitvoering
- [x] Gereed en bewezen
- [!] Geblokkeerd / eigenaaractie vereist
- [-] Niet van toepassing — reden vastgelegd

## Harde productiebeveiliging
- [x] Geen wijzigingen rechtstreeks op `main` uitgevoerd; alle A0/A1-documentatie staat op `feat/apple-ios-ipados-pwa-readiness`.
- [x] Geen writes/uploads/facturen/superadminmutaties tegen productiedata uitgevoerd in A0/A1.
- [x] Geen secrets in repo of documentatie opgenomen.
- [x] Backend blijft beoogde SSOT; bestaande frontendafwijkingen zijn expliciet als auditrisico vastgelegd en niet uitgebreid.
- [x] CE-report visuele route-SSOT `/projecten/:projectId/ce-report` ongewijzigd behouden.
- [-] Rollback per merge/release — niet van toepassing in A0/A1 omdat uitsluitend documentatie op featurebranch is gewijzigd.

## Baseline en auditresultaat

### Repository, scripts en deploymentoutput
- Frontendstack: React 18 + TypeScript + Vite 6.
- Relevante scripts: `build`, `build:pages`, `typecheck`, `lint`, `lint:ci`, `test`, `test:smoke`, `test:e2e`, `test:workflows`, `release:verify`.
- `scripts/prepare-release.mjs` maakt `release/` vanuit `dist/`, kopieert `public/_redirects`, optioneel `_headers` en `public/app`.
- `_headers` configureert immutable cache alleen voor `/assets/*` en `no-cache` voor HTML.
- Geen functionele code of deployment uitgevoerd in A1; builds/tests worden verplicht zodra A2 code/assets wijzigt.

### PWA/Apple audit
- `index.html` bevat standaardviewport en titel `NEN1090 App`; geen vastgestelde Apple standalone/title/statusbar/theme-color/icon/manifest metadata.
- `vite.config.ts` bevat geen vastgestelde PWA-plugin.
- `public/manifest.webmanifest` en `public/manifest.json` zijn direct gecontroleerd en niet aangetroffen.
- Repositoryzoekcontrole vond geen verwijzingen naar `apple-touch-icon`, manifestregistratie, `navigator.serviceWorker`, `registerSW`, Workbox of `vite-plugin-pwa`.
- Conclusie A2: implementeer één branded metadata-/manifest-/iconassetlaag, zonder service-worker of brede offlinecache te introduceren.

### Layout, shell en modals
- `src/app/layout/AppShell.tsx` is de centrale shell met `Sidebar`, `Topbar`, `.page-canvas`, `MobileTabbar`, NotificationCenter en ToastViewport.
- `src/features/mobile/MobilePageScaffold.tsx` levert mobiele paginaheader en bodystructuur binnen de shell.
- `src/components/overlays/Modal.tsx` is de werkelijke portalmodal naar `document.body`; `src/components/modal/Modal.tsx` re-exporteert die component en is geen dubbele implementatie.
- `src/styles/runtime-mobile-hotfix.css` regelt single-scroll en globale overlays via `100dvh`; safe-area-insets zijn niet vastgesteld.
- `src/styles/global.css` bevat containment-/transformaties voor cards/dialogs die al deels door de runtime-hotfix worden gecorrigeerd.
- Conclusie A3: centrale safe-areaaanpassing primair in `runtime-mobile-hotfix.css`, alleen noodzakelijke shellcomponentwijzigingen, zonder CE-print/PDF-regressie.

### Kritieke routes en functionele beschermingsscope
- CE-report visuele route: `/projecten/:projectId/ce-report` → `CeReportPrintPage`.
- CE-dossier: `/projecten/:projectId/ce-dossier` redirect naar `/projecten/:projectId/ce-v2`.
- Billing/Facturatie: `/billing` → `BillingPage`.
- Superadmin: `/superadmin` → `SuperadminControlCenter` achter `RoleGuard`.
- Control Center: `/superadmin/control-center` → `SuperadminControlCenterPage` achter `RoleGuard`.
- Tenant 360: `/superadmin/tenant/:tenantId/profile` → `TenantProfilePage` achter `RoleGuard`.

### Uploadflows en A6-matrix
- Projectdocumenten: `MobileDocumentsPage.tsx` → `documents.ts` → `upload.ts`; `upload.ts` kan via environmentconfig een directe uploadorigin gebruiken.
- WPS/lassercertificaat/lascoördinatorcertificaat: `MasterDataManager.tsx` → `entityDocuments.ts` → aparte attachmentmodules → `/attachments/upload` via centrale client.
- Bedrijfslogo: `CompanySettingsCard.tsx` → `settings.ts` → `/settings/company/logo`.
- Conclusie: iedere route moet op geïsoleerde staging afzonderlijk worden bewezen; één werkende uploadroute bewijst de rest niet.

### Geconstateerde SSOT- en authrisico's
- `WeldInspectionDetailPage.tsx` berekent een frontend `overall` en verzendt die bij save; dit is bestaande code die vóór merge tegen backend-SSOT beoordeeld moet worden.
- `CeReportPrintPage.tsx` gebruikt `/projects/{id}/ce-aggregate`, maar berekent tevens frontend score/status/checklistpresentatie; A7 moet dit expliciet afhandelen of het gatebesluit blokkeren.
- `BillingPage.tsx` bevat actieve Mollie-checkout voor de webapp; dit blijft beschermd in Traject A en vereist later iOS-gating in Traject B.
- `SuperadminControlCenter.tsx` bouwt eigen `Authorization: Bearer ${token}` requests; `auth-store.ts` gebruikt bij cookie-auth een marker `__cookie_session__`. Daarmee bestaat een concreet bestaand `Invalid token`-risico voor `/superadmin`.
- `superadminControlCenter.ts` gebruikt grotendeels de centrale API-client, maar bevat fallbackaggregatie/afgeleide platformdata die met backend-SSOT moet worden bewaakt.

### API/proxy/Cloudflare/Azure audit
- `.env.example` gebruikt same-origin `/api/v1`.
- `wrangler.toml` bevat productie-Azure als bestaande upstreambaseline.
- `functions/api/[[path]].js` bevat HttpOnly-cookiebridge en refreshlogica.
- `functions/api/v1/[[path]].js` is een tweede, specifiekere thin proxy zonder dezelfde cookie-tokeninjectie.
- Omdat de frontend standaard `/api/v1` gebruikt, is routeprioriteit/authharmonisatie een blocking bewijs-/fixpunt vóór auth- en schrijftests.
- Cloudflare Preview URL, Access-status en effectieve environment variables zijn via de beschikbare repositorytoegang niet feitelijk bewezen; A2 moet preview vastleggen en als read-only behandelen.
- Azure slot `staging`, aparte database/storage, veilige testmail en billingtestmodus zijn niet bewezen; A5 blijft blocking voor writes/uploads.

## Traject A — Apple-safe Webapp/PWA

### A0 Branch/checklist/baseline
- Status: [x] Gereed en bewezen.
- Chat: A0, 2026-05-23.
- Agenttaken: branch gemaakt vanaf actuele `main`; documentatieset geïnitialiseerd; read-only baseline vastgelegd.
- Gewijzigde bestanden: `docs/apple-distribution/MASTER-CHECKLIST.md`, `HANDOFF-LATEST.md`, `DECISIONS.md`, `TEST-EVIDENCE.md`.
- Commits: `771f374066987e60b697cd2a3936218814e164bd`, `470438e55424b71c0280c4f9d5b89e2b5e635f75`, `96d5339964f5cde9833406306dec183670a02b75`, `235df8a58e4c5e51fcfef93d1780d6eb34b3a5c1`, `6495eecd134dbb385fef1997da4483b87e1ace9c`, `8bcdb00b64f3c019a5666b28d5e605afabba027f`.
- Gate: Door naar A1 — uitgevoerd.

### A1 Audit
- Status: [x] Gereed en bewezen.
- Chat: A1, 2026-05-23.
- Agenttaken: Apple/PWA-, shell/CSS/modal-, uploads-, CE-report-, Billing-, Superadmin-, proxy/deployment- en stagingbehoefteaudit uitgevoerd; exacte scopes en blockers geregistreerd.
- Eigenaarstaken: Geen actie vereist om A2 te starten; Cloudflare/Azure-acties pas wanneer in A2/A5 gevraagd.
- Gewijzigde bestanden: `docs/apple-distribution/DECISIONS.md`, `TEST-EVIDENCE.md`, `MASTER-CHECKLIST.md`, `HANDOFF-LATEST.md`.
- Commit: `fdbeed46822ad251d907113008cd8fffc44506ba`, `b379dc3f09679b5b754a0cf8754c7898042e6caf`, plus checklist-/handoffafsluiting.
- Bevindingen: Geen bestaande PWA-stack gevonden; dubbele proxy/authroute; gesplitste uploadflows; bestaande CE/inspectie statusberekeningen; bestaand Superadmin bearer-marker risico.
- Gate: **DOORGAAN NAAR A2** voor metadata/icons/preview. Preview blijft uitsluitend read-only; geen schrijftests vóór A5 groen is.

### A2 PWA metadata/icons/preview
- Status: [ ] Niet gestart.
- Verplichte implementatiescope: `index.html`; nieuwe/gewijzigde manifest-/branded iconassets; release-/headercontrole alleen indien nodig; Cloudflare Previewcontrole.
- Preview URL: Nog niet beschikbaar.
- Access status: Nog niet gecontroleerd.
- API target: Configuratiebaseline kan productie aanspreken; preview uitsluitend read-only zolang A5 niet groen is.
- Tests: bestaande `typecheck`, `lint`/`lint:ci`, `build`/`build:pages` uitvoeren na wijziging.
- Gate: branded iconassets/installability bewezen; geen dubbele PWA-stack of onveilige offlinecache.

### A3 Safe area/app shell
- Status: [ ] Niet gestart.
- Scope: primair `runtime-mobile-hotfix.css`; zo nodig shell/layout/scaffold/modalcomponenten.
- Geteste viewports vereist: 375x667, 393x852, 852x393, 768x1024, 1024x768 en desktop.
- Gate: geen systeemgebiedoverlap, horizontale overflow of CE/desktopprintregressie.

### A4 Touch/keyboard/forms/modals
- Status: [ ] Niet gestart.
- Scope: shell/form/modalcomponenten plus betrokken mobiele, Billing- en Superadmininterfaces.
- Gate: primaire acties touchbaar; toetsenbord blokkeert geen actie; desktop intact; geen productiewrites.

### A5 Stagingisolatie
- Status: [!] Geblokkeerd totdat feitelijk ingericht/bewezen.
- API staging hostname: Niet bevestigd.
- Aparte DB bevestigd: NEE.
- Aparte storage bevestigd: NEE.
- Testmail/billingveiligheid: Niet bevestigd.
- Preview → staging bewijs: Niet beschikbaar.
- Extra blocker: dubbele Pages proxy/authroute moet worden bewezen of geharmoniseerd vóór auth/write-tests.
- Gate: geen writes of uploads vóór geïsoleerde keten en authroute bewezen zijn.

### A6 Uploads
- Status: [ ] Niet gestart; geblokkeerd door A5.
- Uploadmatrix: project-/CE-document, WPS, lassercertificaat, lascoördinatorcertificaat, bedrijfslogo, inspectie-/lasfoto waar geïmplementeerd.
- HEIC/HEIF besluit: Nog niet genomen.
- Gate: alle kritieke routes afzonderlijk op staging groen of exact geblokkeerd.

### A7 CE/Billing/Superadmin regressie
- Status: [ ] Niet gestart; geblokkeerd door A5 voor write/authmutatietests.
- CE-report: frontendstatus-/completenessberekeningen als expliciet SSOT-risico controleren.
- Billing: webcheckout beschermen; uitsluitend stagingmutaties.
- Superadmin: `/superadmin` bearer-marker risico en `/superadmin/control-center` fallbackaggregatie afzonderlijk testen.
- Gate: geen merge bij auth-, CE/PDF- of SSOT-regressie.

### A8 Final test/PR
- Status: [ ] Niet gestart.
- PR: Geen.
- Gate: complete matrix, main-sync, PR zonder merge.

### A9 Merge/productievalidatie
- Status: [ ] Niet gestart.
- Expliciet mergeakkoord: NEE.
- Gate: uitsluitend na expliciet eigenaarakkoord.

## Traject B — iOS App Store
- Status: [ ] Niet gestart; Traject A moet eerst gemerged en live gevalideerd zijn.
- Vaststaand aandachtspunt: iOS build moet later bestaande web-Mollie-/trial-/upgradeflows gated uitsluiten volgens de zakelijke companion-app strategie.

## Doorlopende regressiecontrole
| Flow | Laatste testdatum | Omgeving | Resultaat | Bewijs / volgende gate |
|---|---|---|---|---|
| Login/cookie-auth/logout | 2026-05-23 | Codeaudit branch | [!] Dubbele proxy en Superadmin bearer-marker risico gevonden | A5/A7 moet runtimebewijs/fix leveren |
| Dashboard/Projecten | 2026-05-23 | Codeaudit branch | Routes/shell vastgesteld; geen runtimewijziging | A3/A4/A8 testen |
| Lassen/inspecties | 2026-05-23 | Codeaudit branch | [!] Frontend overall-statusberekening gevonden | A7/architectuurgate |
| Uploads | 2026-05-23 | Codeaudit branch | Gesplitste uploadroutes vastgesteld; niet runtime getest | A5 groen vereist vóór A6 |
| CE Dossier/report/PDF | 2026-05-23 | Codeaudit branch | [!] Aggregate gebruikt, maar frontend score/statuslogica aangetroffen | A7/mergegate |
| Instellingen/logo | 2026-05-23 | Codeaudit branch | Logo- en masterdatauploadroutes vastgesteld | A6 stagingtest |
| Billing/Facturatie | 2026-05-23 | Codeaudit branch | Web-Molliecheckout vastgesteld; niet gewijzigd | A7 webregressie; B4 iOS-gating |
| Superadmin/Tenant 360/Control Center | 2026-05-23 | Codeaudit branch | [!] Afwijkende auth-/fallbacklogica aangetroffen | A7 stagingtest/fixgate |

## Besluitregister
| Datum | Besluit | Door wie | Impact |
|---|---|---|---|
| 2026-05-23 | Traject A gebruikt uitsluitend branch `feat/apple-ios-ipados-pwa-readiness`; geen merge zonder akkoord | Eigenaar/SSOT | Productie beschermd |
| 2026-05-23 | Preview blijft read-only zolang API-target/stagingisolatie niet bewezen is | SSOT + audit | Blokkeert previewwrites |
| 2026-05-23 | CE-report route blijft visuele SSOT; geen iOS-specifieke tweede layout | SSOT | Behoud print/PDF-parity |
| 2026-05-23 | A2 bouwt metadata/icons/manifest zonder service-worker/offlinecache toe te voegen | Agent op basis A1-audit | Veilige installabilityscope |
| 2026-05-23 | Dubbele proxy/authroute en frontend-SSOT-afwijkingen zijn blocking punten vóór writes/merge | Agent op basis A1-audit | A5/A7 moeten aantoonbaar groen worden |

## Open blokkades
| ID | Probleem | Benodigde actie | Eigenaar/agent | Status |
|---|---|---|---|---|
| A2-01 | Preview URL, Access-status en effectieve API-target nog niet vastgelegd | A2 previewdeployment controleren/registreren; bij dashboardbeperking eigenaaractie vragen | Agent/eigenaar | Open voor A2 |
| A5-01 | Preview → Azure staging/database/storage/mail/billingisolatie niet bewezen | A5 geïsoleerde testketen inrichten of exact eigenaarstappenblok geven | Agent/eigenaar | Blocking vóór writes/uploads |
| A5-02 | Twee Cloudflare API proxyhandlers met afwijkende cookie-authflow aangetroffen | Routeprioriteit aantonen en veilig harmoniseren/fixen vóór auth-/writetests | Agent | Blocking vóór A6/A7 |
| A7-01 | Bestaande frontend CE/inspectie statusberekeningen en Superadmin bearer-marker risico | Gerichte regressie-/architectuurfix of expliciet gatebesluit conform SSOT | Agent/eigenaar | Blocking vóór PR/merge |
