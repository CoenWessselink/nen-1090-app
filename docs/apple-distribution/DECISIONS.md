# WeldInspect Pro — Apple Distribution Decisions

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatst afgeronde chatfase: Chat A1 — Volledige audit en uitvoerscope
- Repository: `CoenWessselink/nen-1090-app`
- Branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit (`main`): `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Laatste bijwerking: 2026-05-23 (Europe/Amsterdam)

## Vaststaande uitgangspunten

| ID | Datum | Besluit / uitgangspunt | Status | Impact op uitvoering |
|---|---|---|---|---|
| DEC-A-001 | 2026-05-23 | Traject A wordt uitsluitend ontwikkeld op `feat/apple-ios-ipados-pwa-readiness`, gestart vanaf actuele `main` commit `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`. | Vaststaand | Geen wijzigingen rechtstreeks op `main`; merge pas na expliciet eigenaarakkoord in A9. |
| DEC-A-002 | 2026-05-23 | Chat A0 was documentatie- en baseline-only; Chat A1 is audit- en scopedocumentatie-only. | Vaststaand | Geen functionele codewijzigingen vóór A2; geen productiewrites in A0/A1. |
| DEC-A-003 | 2026-05-23 | Backend/API blijft enige SSOT voor tenants, projecten, inspecties, CE-data, attachments, volledigheid/status en billing. | Vaststaand | Frontend Apple-aanpassingen mogen geen nieuwe businesslogica of fallbackstatusberekening introduceren. Bestaande afwijkingen zijn als risico vastgelegd. |
| DEC-A-004 | 2026-05-23 | `/projecten/:projectId/ce-report` blijft de enige visuele SSOT voor CE-report en browserprint/PDF. | Vaststaand | Geen Apple-specifieke tweede CE-layout of concurrerende PDF-template. |
| DEC-A-005 | 2026-05-23 | Iedere Cloudflare preview is read-only zolang preview → geïsoleerde Azure staging API/database/storage niet aantoonbaar groen is. | Vaststaand | Geen opslaan, uploads, factuuracties of Superadminmutaties via preview vóór A5. |
| DEC-A-006 | 2026-05-23 | De bestaande app Pages deploymentconfiguratie wordt gebruikt; Traject A maakt geen nieuw Pages-project. | Vaststaand | Preview Deployment moet in later stadium binnen het bestaande Pages-project worden gecontroleerd. |
| DEC-A-007 | 2026-05-23 | A2 implementeert alleen één lichte PWA/Apple metadata- en assetlaag; geen service-worker/offlinecache introduceren zolang daar geen bestaand veilig fundament voor is bewezen. | Vaststaand na A1 audit | Benodigde A2-kernbestanden: `index.html` en nieuwe/gewijzigde publieke manifest-/iconassets; build- en previewbewijs vereist. |
| DEC-A-008 | 2026-05-23 | A3 gebruikt de bestaande centrale shell/scrollarchitectuur als integratiepunt voor safe areas, met `runtime-mobile-hotfix.css` als primaire plaats voor overlays/viewportcorrecties. | Vaststaand na A1 audit | Topbar/sidebar/tabbar/scaffold/modal uitsluitend aanpassen als CSS alleen onvoldoende blijkt; CE-printstyles mogen niet regressief wijzigen. |
| DEC-A-009 | 2026-05-23 | Twee aangetroffen Cloudflare API-functionpaden moeten vóór staging schrijftests/authvalidatie feitelijk worden geharmoniseerd of routeprioriteit moet aantoonbaar bewezen worden. | Blocking vóór A5/A7 writes/auth | `functions/api/[[path]].js` heeft cookiebridge; `functions/api/v1/[[path]].js` is een afwijkende thin proxy zonder dezelfde tokeninjectie. |
| DEC-A-010 | 2026-05-23 | A6 test afzonderlijk projectdocumentupload, masterdata-attachmentupload en bedrijfslogoupload; één geslaagde flow is geen bewijs voor alle uploadroutes. | Vaststaand na A1 audit | Verschillende frontendmodules/endpoints zijn aangetroffen. |
| DEC-A-011 | 2026-05-23 | Bestaande frontend-SSOT-afwijkingen worden in A1 niet stilzwijgend gefixt; zij worden als blocking regressie-/architectuurpunten bewaakt vóór merge. | Vaststaand na A1 audit | `WeldInspectionDetailPage.tsx`, `CeReportPrintPage.tsx` en Control Center fallbackaggregatie vereisen later gerichte beoordeling binnen toegestane fase/scope. |
| DEC-B-001 | 2026-05-23 | Traject B mag pas starten nadat Traject A is gemerged en live gevalideerd met eigenaarakkoord. | Vaststaand | Geen Capacitor/Xcode/native code in Traject A. |
| DEC-B-002 | 2026-05-23 | De eerste iOS-release wordt benaderd als zakelijke companion-app voor bestaande accounts; definitieve billing/distributiekeuzes volgen in B0. | Voorbereidend | `BillingPage.tsx` bevat huidige web-Mollie-checkout; toekomstige iOS build moet die gated uitsluiten volgens B4. |

## Feitelijke A1-auditbevindingen

### PWA, metadata, iconen en service worker
- `index.html` bevat een standaardviewport en titel `NEN1090 App`; geen Apple standalone/title/statusbar/theme-color/icon/manifest metadata vastgesteld.
- `vite.config.ts` bevat React/Vite-buildconfiguratie en geen vastgestelde PWA-plugin.
- `package.json` bevat geen vastgestelde PWA-/service-workerplugin dependency.
- Direct gecontroleerde paden `public/manifest.webmanifest` en `public/manifest.json` ontbreken.
- Repositoryzoekcontroles leverden geen gevonden verwijzingen op voor `apple-touch-icon`, manifestregistratie, `navigator.serviceWorker`, `registerSW`, Workbox of `vite-plugin-pwa`.
- Auditconclusie: A2 mag een enkele branded Apple/PWA metadata- en assetimplementatie maken; brede offlinecache is niet gerechtvaardigd.

### Shell, safe area, touch en modals
- `AppShell.tsx` is de centrale shell: `Sidebar`, `Topbar`, `page-canvas`, `MobileTabbar`, notificatiecentrum en toasts.
- `MobilePageScaffold.tsx` heeft een eigen mobiele header/bodystructuur binnen de shell.
- `Modal.tsx` onder `src/components/overlays/` gebruikt reeds portal naar `document.body` en scroll-lock; `src/components/modal/Modal.tsx` is alleen een re-export, geen tweede modalimplementatie.
- `runtime-mobile-hotfix.css` beheert single-scrollcontainer en globale viewportoverlays met `100dvh`; in de gecontroleerde styles is geen `env(safe-area-inset-*)` gevonden.
- `global.css` bevat containment/transformaties voor cards/dialogs; `runtime-mobile-hotfix.css` heft delen daarvan voor overlays op. A3 moet dit behouden en gecontroleerd uitbreiden.

### Uploadflows
- Projectdocumenten: `MobileDocumentsPage.tsx` → `src/api/documents.ts` → `src/api/upload.ts`.
- `src/api/upload.ts` valideert bestandstype/grootte en kan uploadrequests direct naar `VITE_DIRECT_UPLOAD_API_ORIGIN` of `VITE_AZURE_API_ORIGIN` sturen wanneer gezet; anders via same-origin `/api/v1`.
- WPS, lassercertificaten en lascoördinatorcertificaten: `MasterDataManager.tsx` → `entityDocuments.ts` → afzonderlijke attachmentmodules → `/attachments/upload` via centrale client.
- Bedrijfslogo: `CompanySettingsCard.tsx` → `uploadCompanyLogo()` → `/settings/company/logo`.
- A6-testmatrix moet alle routes plus HEIC/HEIF-gedrag afzonderlijk valideren via geïsoleerde staging.

### CE-report/PDF en SSOT-risico
- `CeReportPrintPage.tsx` gebruikt `fetchCeAggregate(projectId)` via `/projects/{id}/ce-aggregate` en importeert de bestaande CE-printstyles.
- De pagina berekent daarnaast zelf `score`, statuslabels en checklistweergave vanuit frontenddata; dit is een aangetroffen bestaande afwijking van het backend-SSOT-uitgangspunt.
- A3 mag de CE-printstyles niet wijzigen; A7 moet CE-report en PDF-parity bewijzen en deze bestaande SSOT-afwijking expliciet afhandelen vóór merge.

### Billing, Superadmin en cookie-auth
- `BillingPage.tsx` bevat actieve tenantcheckout via Mollie en is een beschermde webfunctionaliteit voor Traject A; voor de latere iOS build is gating vereist.
- `/superadmin` rendert `SuperadminControlCenter.tsx`, dat zelf fetchrequests met `Authorization: Bearer ${token}` samenstelt.
- `auth-store.ts` houdt bij cookie-auth alleen marker `__cookie_session__` in memory; daarmee bestaat een concreet risico dat `/superadmin` een marker als Bearertoken aanbiedt en `Invalid token` veroorzaakt.
- `/superadmin/control-center` gebruikt `src/api/superadminControlCenter.ts` en daarmee grotendeels de centrale cookieclient, maar bevat fallbackaggregatie/afgeleide health- en tenantdata; dit is een bestaand SSOT-risico.
- A7 moet `/superadmin` en `/superadmin/control-center` afzonderlijk op staging testen; geen productie-Superadminmutaties.

### Cloudflare Pages en Azure staging
- `build:pages` voert build plus `scripts/prepare-release.mjs` uit; dit kopieert `dist`, `_redirects`, optioneel `_headers` en de compatibiliteitsmap `public/app` naar `release`.
- `_headers` stelt immutable caching alleen voor `/assets/*` in en no-cache voor HTML; A2 moet controleren dat manifest/iconassets correct geleverd en niet onveilig gecachet worden.
- `.env.example` gebruikt same-origin `/api/v1`; `wrangler.toml` configureert productie-Azure als bestaande upstreambaseline.
- Er zijn twee API Pages Functions aangetroffen: `functions/api/[[path]].js` met HttpOnly-cookiebridge/refreshlogica en `functions/api/v1/[[path]].js` als afwijkende dunne proxy.
- Via beschikbare repositorytoegang is geen Cloudflare Dashboard/Access-status, Preview URL, Azure deployment slot, aparte database, aparte storage, mailconfig of billingtestmodus aantoonbaar geverifieerd. Die status blijft `BLOCKED` voor writes tot A5.

## Exacte uitvoerscope per volgende Traject A-fase

| Fase | Primair te inspecteren/wijzigen bestanden of externe configuratie | Gate/reden |
|---|---|---|
| A2 | `index.html`; nieuwe/gewijzigde publieke manifest- en branded iconassets; `scripts/prepare-release.mjs`, `_headers` alleen indien lever-/cachebewijs dit vereist; Cloudflare Preview-status | Installability zonder service-workerduplication; preview read-only zolang productieorigin mogelijk is. |
| A3 | `src/styles/runtime-mobile-hotfix.css` primair; zo nodig `src/styles/global.css`, `src/app/layout/AppShell.tsx`, `src/components/layout/Topbar.tsx`, `Sidebar.tsx`, `MobileTabbar.tsx`, `src/features/mobile/MobilePageScaffold.tsx`, `src/components/overlays/Modal.tsx` | Centrale safe areas voor shell/overlays; CE-report CSS niet regressief wijzigen. |
| A4 | Bovenstaande shell/formcomponenten plus feitelijk geraakte pagina’s zoals `MobileDocumentsPage.tsx`, `CompanySettingsCard.tsx`, `MasterDataManager.tsx`, `WeldInspectionDetailPage.tsx`, Billing/Superadminpagina’s | Touch/keyboard/modalbruikbaarheid; geen redesign en geen writes zonder staging. |
| A5 | Cloudflare Preview environment/Access; Azure staging slot/database/storage/mail/billing; `wrangler.toml`, `.env`-config en beide `functions/api...` proxybestanden indien route/authfix aantoonbaar noodzakelijk is | Blocking gate voor alle writes/uploads/authmutatietests. |
| A6 | `MobileDocumentsPage.tsx`, `documents.ts`, `upload.ts`, `CompanySettingsCard.tsx`, `settings.ts`, `MasterDataManager.tsx`, `entityDocuments.ts`, `masterdata-attachments.ts`, `welders.ts`, `weldCoordinatorAttachments.ts` | Iedere Apple-uploadroute en HEIC/HEIF alleen op staging testen/fixen. |
| A7 | `CeReportPrintPage.tsx` en bestaande CE-printstyles; `BillingPage.tsx`; `SuperadminControlCenter.tsx`; `superadminControlCenter.ts`; `auth-store.ts`; centrale API-client/proxies indien nodig | CE/PDF, Billing, cookie-auth en Control Center regressie op staging; SSOT-afwijkingen niet maskeren. |
| A8 | Testconfiguratie, relevante Playwright tests en alle tijdens A2–A7 gewijzigde bestanden; PR-documentatie | Finale matrix en reviewpakket; niet mergen. |

## Open besluiten en blockers voor latere fases

| ID | Fase | Benodigd besluit / bewijs | Wie | Blocking voor |
|---|---|---|---|---|
| BLOCK-A2-01 | A2 | Cloudflare Preview URL en Access-status moeten na branchpreview/deploy feitelijk worden vastgelegd. | Agent/eigenaar bij ontbrekende toegang | Zichtbare preview met bedrijfsdata |
| BLOCK-A5-01 | A5 | Azure deployment slot `staging`, aparte database, aparte storage, veilige mail/billing en preview-routing. | Agent/eigenaar afhankelijk van toegang | Alle writes en uploads in A6/A7 |
| BLOCK-A5-02 | A5 | Bepalen welke van de twee Pages proxy-routes `/api/v1/*` daadwerkelijk afhandelt en cookie-auth veilig harmoniseren/bewijzen. | Agent | Auth-/write-tests en merge |
| BLOCK-A7-01 | A7 | Bestaande frontendstatus-/completenessberekeningen en Superadmin bearer-marker risico expliciet oplossen of accepteren conform backend-SSOT vóór PR. | Agent/eigenaar | A8/merge |
| BLOCK-B0-01 | B0 | Apple Developer organisatieaccount, D-U-N-S, seller/legal entity en App Store Connect toegang. | Eigenaar | Native distributietraject |
| BLOCK-B0-02 | B0 | Definitieve appnaam, bundle ID en distributievorm. | Eigenaar | B1/Xcode |
| BLOCK-B4-01 | B0/B4 | Definitieve iOS-billing-, account- en privacystrategie. | Eigenaar met officiële Apple-verificatie | TestFlight/review candidate |

## Wijzigingsregel
Besluiten worden niet stilzwijgend gewijzigd. Iedere nieuwe keuze krijgt een nieuwe regel met datum, eigenaar/bron, impact en eventuele vervanging van een eerder besluit.
