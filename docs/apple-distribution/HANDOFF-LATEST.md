# WeldInspect Pro — Apple Distribution Handoff Latest

## Handoffgegevens
- Datum/tijd: 2026-05-23 CEST (Europe/Amsterdam)
- Afgeronde chatfase: Chat A1 — Volledige Apple/PWA-, frontend-, Cloudflare Preview- en Azure Staging-audit — **GEREED EN BEWEZEN**
- Actief traject: Traject A — Apple-safe Webapp/PWA
- Repository: `CoenWessselink/nen-1090-app`
- Actieve branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit vanaf actuele `main`: `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- A1-documentatiecommits vóór deze handoffafsluiting:
  - `fdbeed46822ad251d907113008cd8fffc44506ba` — werkt `DECISIONS.md` bij met A1-scope en blockers.
  - `b379dc3f09679b5b754a0cf8754c7898042e6caf` — werkt `TEST-EVIDENCE.md` bij met A1-auditbewijs.
  - `817a6656ee2891afc440ed0c9638cfa08246490f` — markeert A1 groen en legt A2-scope vast in `MASTER-CHECKLIST.md`.
- PR/deployment/TestFlight-link: Geen; A1 voert geen deployment of PR uit.
- Contextgrensstatus: Veilige overdracht vóór 70%; uitsluitend de afgebakende A1-audit uitgevoerd.

## Wat in deze chat werkelijk is uitgevoerd
- `MASTER-CHECKLIST.md`, `HANDOFF-LATEST.md`, `DECISIONS.md` en `TEST-EVIDENCE.md` uit A0 zijn volledig ingelezen en A0 was groen.
- De branchcode is read-only geaudit via de gekoppelde GitHub-repositorytoegang. Een lokale clonepoging is niet gebruikt als auditbasis omdat de uitvoercontainer geen DNS/netwerktoegang naar GitHub heeft.
- De volledige implementatiescope is vastgesteld voor PWA metadata/iconen, shell/safe areas, touch/modals, uploads, CE-report/PDF, Billing, Superadmin/Control Center, proxy/auth en deployment/staging.
- Geen functionele frontendcode, Cloudflare deployment, Azure-configuratie of productiedata is gewijzigd.
- De auditbesluiten, testbevindingen, blockers en volgende faseopdracht zijn in de vaste distributiedocumentatie bijgewerkt.

## Belangrijkste A1-bevindingen

### PWA/Apple metadata
- Geen bestaande Apple touch-icon-, webmanifest-, theme-color- of service-worker/PWA-registratie gevonden in de gecontroleerde code.
- `index.html` heeft alleen standaardviewport en generieke titel `NEN1090 App`.
- A2 mag daarom één nieuwe branded Apple/PWA metadata- en assetlaag implementeren, zonder service-worker of brede offlinecache toe te voegen.

### App-shell, safe area en modals
- Centrale shell: `src/app/layout/AppShell.tsx` met `Topbar`, `Sidebar`, `.page-canvas`, `MobileTabbar`, meldingen en toasts.
- Mobiele paginalaag: `src/features/mobile/MobilePageScaffold.tsx`.
- Modal: `src/components/overlays/Modal.tsx` gebruikt al portal naar `document.body`; `src/components/modal/Modal.tsx` is uitsluitend een re-export.
- `runtime-mobile-hotfix.css` bevat single-scroll en overlayregels met `100dvh`, maar geen vastgestelde `safe-area-inset-*` toepassing.
- `global.css` heeft containment-/transformatieoptimalisaties; bestaande overlaycorrecties moeten in A3 behouden blijven.

### Uploads
- Projectdocumentupload: `MobileDocumentsPage.tsx` → `documents.ts` → `upload.ts`.
- `upload.ts` kan een directe uploadorigin gebruiken wanneer `VITE_DIRECT_UPLOAD_API_ORIGIN` of `VITE_AZURE_API_ORIGIN` is gezet; A5 moet het feitelijke target controleren.
- WPS-, lasser- en lascoördinatorattachments lopen via `MasterDataManager.tsx`, `entityDocuments.ts` en aparte attachmentmodules.
- Bedrijfslogo loopt via `CompanySettingsCard.tsx` en `/settings/company/logo`.
- A6 moet alle routes afzonderlijk testen op geïsoleerde staging, inclusief HEIC/HEIF-besluit.

### CE-report/PDF en backend-SSOT
- De visuele route blijft `/projecten/:projectId/ce-report`.
- `CeReportPrintPage.tsx` gebruikt het CE aggregate endpoint, maar berekent zelf score/status/checklistpresentatie in de frontend.
- `WeldInspectionDetailPage.tsx` berekent zelf `overall` en verzendt dat bij opslaan.
- Dit zijn bestaande SSOT-risico's; A1 heeft ze niet uitgebreid of gemaskeerd. Ze zijn blocking controlepunten vóór A8/merge.

### Billing en Superadmin/auth
- `BillingPage.tsx` bevat actieve Mollie-checkout voor de bestaande webapp; in Traject A beschermd laten, later in iOS build gated uitsluiten.
- `SuperadminControlCenter.tsx` bouwt eigen Bearerrequests op basis van de auth-storetoken.
- `auth-store.ts` gebruikt bij cookie-auth de marker `__cookie_session__`, waardoor `/superadmin` concreet risico op `Invalid token` heeft.
- `/superadmin/control-center` gebruikt grotendeels de centrale API-client maar bevat fallbackaggregatie; beide routes moeten afzonderlijk in A7 worden gevalideerd.

### Cloudflare/Azure en dubbele proxyroute
- `.env.example` gebruikt standaard same-origin `/api/v1`.
- `wrangler.toml` bevat productie-Azure als bestaande upstreambaseline.
- `functions/api/[[path]].js` bevat een HttpOnly-cookiebridge/refreshflow.
- `functions/api/v1/[[path]].js` is een tweede thin proxy zonder dezelfde cookie-tokeninjectie.
- Omdat frontendrequests standaard naar `/api/v1` gaan, is het bewijzen of harmoniseren van de effectieve proxy/authroute blocking vóór auth-/write-tests.
- Cloudflare Preview URL/Access-status en Azure staging DB/storage/mail/billingisolatie konden met de beschikbare repositorytoegang nog niet feitelijk worden vastgesteld.

## Gewijzigde bestanden in A1
| Bestand | Reden |
|---|---|
| `docs/apple-distribution/DECISIONS.md` | Auditbesluiten, scope, blockers en concrete implementatiebestanden voor A2–A8 vastleggen. |
| `docs/apple-distribution/TEST-EVIDENCE.md` | Read-only auditbewijs, officiële platformregelcontrole en bestaande risico's registreren. |
| `docs/apple-distribution/MASTER-CHECKLIST.md` | A1-gate groen zetten, A2-scope vastleggen en A5/A7 blockers registreren. |
| `docs/apple-distribution/HANDOFF-LATEST.md` | Deze veilige overdracht en exacte A2-opdracht leveren. |

## Uitgevoerde tests en resultaat
| Controle | Omgeving / bron | Resultaat | Bewijs / vervolg |
|---|---|---|---|
| A0-documenten en gate lezen | Branchdocumentatie | PASS | A1 mocht starten. |
| PWA/Apple metadata-/serviceworkeraudit | Repositorycode | PASS met implementatiescope | A2 moet metadata/manifest/iconassets bouwen; geen PWA-stack aangetroffen. |
| Shell/CSS/modal audit | Repositorycode | PASS met scope | A3-integratiepunten geïdentificeerd. |
| Uploadflows audit | Repositorycode | PASS met stagingvereiste | Gesplitste routes vereisen A6-matrix; geen writes uitgevoerd. |
| CE/inspectie SSOT-audit | Repositorycode | FAIL-RISK vastgelegd | Frontendafleidingen bestaan; vóór merge expliciet afhandelen. |
| Billing/Superadmin/auth audit | Repositorycode | FAIL-RISK vastgelegd | Webcheckout aanwezig; Superadmin bearer-marker risico aangetroffen. |
| Pages proxy/deploymentaudit | Repositorycode | FAIL-RISK vastgelegd | Twee afwijkende API proxyhandlers; A5/A7 moeten dit oplossen of bewijzen. |
| Cloudflare/Azure vereisten | Officiële platformdocumentatie / repo-access | Scope bevestigd; dashboardconfig BLOCKED | A2/A5 moet concrete omgevingstoegang of eigenaaractie gebruiken. |
| Productieveiligheid | Volledige A1-uitvoering | PASS | Geen productiewrites, featurecode of deployments. |

## Productieveiligheid
- Writes tegen productie uitgevoerd: **NEE**.
- Uploads, saveacties, factuurmutaties of Superadminmutaties uitgevoerd: **NEE**.
- Functionele code aangepast: **NEE**; uitsluitend auditdocumentatie op de featurebranch.
- Preview API-target: Niet feitelijk gedeployed/gecontroleerd in A1; repositorybaseline kan productie-Azure gebruiken.
- Stagingisolatie status: **NIET BEWEZEN / BLOCKING VOOR WRITES**.
- Secrets toegevoegd aan repo: **NEE**.
- Merge naar `main`: **NEE**.

## Besluiten van eigenaar die reeds vaststaan
- Werk uitsluitend volgens de geüploade Apple PWA + App Store masterprompt en faseprompts.
- Traject A blijft op `feat/apple-ios-ipados-pwa-readiness`; niet rechtstreeks op `main`.
- Geen merge naar `main`, TestFlight submission of App Store submission zonder expliciete toestemming.
- Geen writes/uploads/Billing-/Superadminmutaties tegen productiedata.
- Backend blijft SSOT; CE-report route blijft visuele SSOT.

## Acties die eigenaar nu moet uitvoeren
- Geen eigenaaractie nodig om Chat A2 te starten.
- In A2 kan handmatige Cloudflare Access- of iPhone-beginschermcontrole gevraagd worden nadat een Preview Deployment beschikbaar is.
- Doe vóór A5 geen schrijvende tests in een previewomgeving.

## Open risico's/blockers
| ID | Risico / blocker | Vervolg |
|---|---|---|
| A2-01 | Preview URL/Access/API-target niet vastgelegd | A2: preview inzetten/controleren; read-only blijven indien productieorigin mogelijk is. |
| A5-01 | Staging API/database/storage/testmail/billing niet bewezen | A5: isolatie inrichten/controleren vóór writes/uploads. |
| A5-02 | Dubbele API proxyhandler met afwijkende cookie-authflow | A5/A7: routeprioriteit aantonen en veilig harmoniseren/fixen vóór auth-/writetests. |
| A7-01 | Frontendstatus-/completenessberekeningen en Superadmin bearer-marker risico | A7: gerichte regressie-/architectuurfix of expliciet gatebesluit vóór PR. |

## Volgende chat moet eerst lezen
1. Het masterpromptbestand `WeldInspect-Pro-Apple-PWA-App-Store-Masterprompt-Meer-Chat-Bouwfasen-Checklist-2026-05-23.txt`.
2. `docs/apple-distribution/MASTER-CHECKLIST.md` op branch `feat/apple-ios-ipados-pwa-readiness`.
3. Dit bestand, `docs/apple-distribution/HANDOFF-LATEST.md`, op dezelfde branch.
4. `docs/apple-distribution/DECISIONS.md` en `docs/apple-distribution/TEST-EVIDENCE.md`.
5. Voor A2: `package.json`, `index.html`, `vite.config.ts`, `scripts/prepare-release.mjs`, `_headers`, `public/_redirects`, `.env.example`, `wrangler.toml`, `functions/api/[[path]].js`, `functions/api/v1/[[path]].js`.

## Exacte startopdracht volgende chat — Chat A2
“Lees masterprompt, nieuwste checklist en nieuwste handoff volledig in. Controleer dat A1 gereed is. Voer uitsluitend Chat A2 uit op branch `feat/apple-ios-ipados-pwa-readiness`.

Implementeer production-ready Apple beginscherm/PWA metadata en echte branded iconassets binnen de bestaande architectuur, zonder dubbele PWA-stack of onveilige offlinecache. Houd de in A1 vastgelegde dubbele proxy/authroute als blocker voor writes: wijzig of test geen productiedata.

Voer bestaande typecheck/lint/buildtests uit. Push de branch en realiseer/controleer de Cloudflare Pages Preview Deployment in het bestaande Pages-project voor zover toegang beschikbaar is. Leg preview-URL, Access-status en API-target vast. Gebruik preview uitsluitend read-only zolang deze niet aantoonbaar naar staging wijst.

Werk checklist/handoff/testbewijs bij, commit/push en lever de startopdracht voor A3. Vermeld kort welke Cloudflare Access- of iPhone beginschermtest ik handmatig moet doen. Stop veilig vóór 70% context.”
