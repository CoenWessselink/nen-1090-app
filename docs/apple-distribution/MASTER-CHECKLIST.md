# WeldInspect Pro — Apple PWA & iOS App Store Master Checklist

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatste update: 2026-05-23 (Europe/Amsterdam)
- Actief traject: Traject A — Apple-safe Webapp/PWA
- Actieve chatfase: Chat A4 — Touch / keyboard / modals — **implementatie gereed / acceptatiebewijs open**
- Actieve repository: `CoenWessselink/nen-1090-app`
- Actieve branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit (`main`): `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Laatste functionele A3-commits: `342b22f6267f30e263c78825137875b0040e086a`, `7e2d34d13b80ddddf9b3fe5b891f992760a9dcc6`, `4c657f2dc4f86c90e74841b334c4e694f826b27c`, `d4ed19d45c0fbd4bf5163137f9fb545ad6ec5276`.
- Laatste functionele A4-commits: `1516071051c39360c606ea9e930973e6a40e3e7e`, `77a49c1cccd091a097fa42524affbbb95a9765e0`, `0635bb7b97afc2cc92b0c1dcb0a5c51a863fa3c7`, `908be349ed37d98801e3406d92cbbffb05f8d6ae`.
- Laatste A4-documentatiecommits vóór deze checklist: `7629916ad7768a6d3bf782fbcc6a529279a7017a`, `16d8405429db8851df34fb9aa14fbc1a2fbc23f2`.
- PR-link: Niet aangemaakt — geen merge naar `main`.
- Preview-link: Niet feitelijk bevestigd via beschikbare toegang.
- Hoofdstatus: `A4 CODE GEREED / BUILD-, PREVIEW-, DEVICE- EN KEYBOARDACCEPTATIE OPEN / PREVIEW READ-ONLY`.
- Volgende directe actie: Lever A4 Preview/build/device/keyboardbewijs read-only; start A5 uitsluitend wanneer A4 voldoende groen is en blijft gericht op stagingbewijs vóór iedere write.

## Statuslegenda
- [ ] Niet gestart
- [~] In uitvoering
- [x] Gereed en bewezen
- [!] Geblokkeerd / eigenaaractie vereist
- [-] Niet van toepassing — reden vastgelegd

## Harde productiebeveiliging
- [x] Geen wijzigingen rechtstreeks op `main`; alle A0–A4-wijzigingen staan op `feat/apple-ios-ipados-pwa-readiness`.
- [x] Geen writes/uploads/facturen/Mollie-/Superadminmutaties tegen productiedata uitgevoerd in A0–A4.
- [x] Geen login-/authmutatietests uitgevoerd in A4.
- [x] Geen secrets in repo of documentatie opgenomen.
- [x] Backend blijft SSOT; CE-report route `/projecten/:projectId/ce-report` blijft ongewijzigd.
- [x] Geen service worker, brede offlinecache of tweede PWA-stack toegevoegd.
- [x] A3 en A4 CSS-lagen zijn screen-only; geen CE-report print/PDF-styles gewijzigd.
- [x] Geen backend-, API-contract-, proxy- of dataroutewijziging uitgevoerd in A4.
- [-] Rollback per merge/release — branch is nog niet gemerged.

## Blijvende veiligheidsblockers
- Twee Cloudflare API Functions hebben volgens A1 afwijkende authflow: `functions/api/[[path]].js` en `functions/api/v1/[[path]].js`.
- `wrangler.toml` bevat als repositorybaseline de productie-Azure-upstream; preview blijft uitsluitend read-only zolang het effectieve API-target niet als staging is bewezen.
- Azure slot `staging`, aparte database/storage, veilige testmail en billingtestmodus zijn niet bewezen; A5 blijft blocking voor schrijftests.
- Bestaande CE/inspectiestatus- en Superadmin-authrisico's moeten in A7 worden afgehandeld vóór merge.

## Traject A — Apple-safe Webapp/PWA

### A0 Branch/checklist/baseline
- Status: [x] Gereed en bewezen.
- Gate: Door naar A1 — uitgevoerd.

### A1 Audit
- Status: [x] Gereed en bewezen.
- Bevindingen: Geen bestaande PWA-stack; dubbele proxy/authroute; gesplitste uploadflows; CE/inspectie SSOT-risico's; Superadmin bearer-marker risico.
- Gate: Door naar A2 met read-only previewbeperking — uitgevoerd.

### A2 PWA metadata/icons/preview
- Status: [~] Code gereed; eigenaar gaf op 2026-05-23 toestemming voor uitsluitend niet-schrijvende vervolgfasen. Preview-/API-target-/devicebewijs blijft open.
- Geïmplementeerd: Apple standalone-/title-/theme metadata, `viewport-fit=cover`, één `manifest.webmanifest`, echte branded SVG/PNG-iconset, veilige installassetheaders.
- Geen dubbele PWA-stack/offlinecache: [x] Statisch bewezen.
- API target: [!] Niet feitelijk bevestigd; preview blijft read-only.
- Gatebesluit: voldoende voor eigenaar-geautoriseerde read-only A3/A4-codebouw; niet voldoende voor writes of merge.

### A3 Safe area/app shell
- Status: [~] **Implementatie gereed op branch; build-/viewport-/deviceacceptatie open.**
- Gewijzigde bestanden: `src/styles/apple-safe-area.css`, `src/main.tsx`.
- Feitelijke implementatie: screen-only safe-area-insets voor topbar, sidebar, `.page-canvas`, overlays/modalpanelen, notification center, toastviewport en `.mobile-tabbar`; `max(...)`-zijdelingse ruimte; feature detection; geen CE-report/PDF-layoutwijziging.
- Build/typecheck/lint: [!] Niet aantoonbaar uitgevoerd; lokale clone faalde met `Could not resolve host: github.com` en geen zichtbare CI-statuscheck was beschikbaar.
- Vereiste viewports/devicebewijs: [!] Open — 375×667, 393×852, 852×393, 768×1024, 1024×768 en desktop; echte iPhone/iPad portrait/landscape.
- Gate: De expliciete A4-startopdracht autoriseerde uitsluitend read-only A4-codebouw ondanks open bewijs; A3-bewijs blijft verplicht vóór A8/merge.

### A4 Touch/keyboard/forms/modals
- Status: [~] **Implementatie gereed op branch; build-/Preview-/device-/keyboardacceptatie open.**
- Autorisatie: De startopdracht van 2026-05-23 geeft expliciet akkoord voor uitsluitend niet-schrijvende A4 frontend UI-hardening ondanks open A3-bewijs.
- Gewijzigde bestanden:
  - `src/styles/apple-touch-interaction.css`: nieuwe late, screen-only touch-/input-/overflow-/landscapehardeninglaag.
  - `src/main.tsx`: laadt de A4-laag na `apple-safe-area.css`.
  - `src/components/overlays/Modal.tsx`: iOS VisualViewport keyboardcontour, mouse-only desktop drag en Escape-close.
- Opgeloste risico's statisch:
  - minimaal 44px touchdoel voor primaire/icon/tab/drawer/rijacties in touchcontext; meldingsrijen minimaal 56px;
  - input/select/textarea minimaal 16px op touch/small-screen ter voorkoming van iOS focuszoom, met focus-scrollruimte;
  - tabs, tabelcontainer en menu/listbox/dropdownpresentatie blijven bereikbaar door gecontroleerde touch-overflow;
  - modalpaneel blijft binnen zichtbare keyboardviewport; formulieracties kunnen sticky boven Home Indicator blijven;
  - modalheaderdrag is niet actief op touch/small-screen, maar desktop mouse drag blijft behouden;
  - landscape krijgt compacte overlay/header/tabbarregeling naast A3 side-insets.
- Kritieke interfaces codegericht afgedekt: Login, Dashboard/Projecten, Lascontrole/inspecties, Instellingen, Billing, Superadmin/Control Center, modals, notification center en mobiele tabbar.
- Tests werkelijk uitgevoerd: statische bron-/cascade-/diff-/scopecontrole en productieveiligheidscontrole — PASS.
- `npm run typecheck`, `npm run lint:ci`, `npm run build:pages`: [!] Niet aantoonbaar uitvoerbaar; lokale clone/DNS geblokkeerd en geen CI/statuscheck zichtbaar.
- Vereiste Preview/device/keyboardmatrix: [!] Open — 375×667, 393×852, 852×393, 768×1024, 1024×768, desktop; echte iPhone/iPad met modal/notification center en keyboard zichtbaar.
- Gate: **A4 code gereed; A5 niet vrijgegeven zonder voldoende A4-acceptatiebewijs.**

### A5 Stagingisolatie
- Status: [!] Geblokkeerd totdat feitelijk ingericht/bewezen én A4-acceptatiebewijs voldoende is.
- API staging hostname: Niet bevestigd.
- Aparte DB/storage/testmail/billingveiligheid: Niet bevestigd.
- Preview → staging bewijs: Niet beschikbaar.
- Extra blocker: dubbele Pages proxy/authroute veilig bewijzen of harmoniseren vóór auth/write-tests.

### A6 Uploads
- Status: [ ] Niet gestart; geblokkeerd door A5.

### A7 CE/Billing/Superadmin regressie
- Status: [ ] Niet gestart; geblokkeerd door A5 voor mutatietests en door vastgelegde A7-risico's.

### A8 Final test/PR
- Status: [ ] Niet gestart; geen PR.

### A9 Merge/productievalidatie
- Status: [ ] Niet gestart; expliciet mergeakkoord: NEE.

## Traject B — iOS App Store
- Status: [ ] Niet gestart; Traject A moet eerst gemerged en live gevalideerd zijn.

## Doorlopende regressiecontrole
| Flow | Laatste testdatum | Omgeving | Resultaat | Bewijs / volgende gate |
|---|---|---|---|---|
| Login/cookie-auth/logout | 2026-05-23 | A4 codeaudit, geen authmutatie | Inputtouch/16px generiek gehard; [!] dubbele proxy/Superadmin authrisico blijft | A4 read-only UI-check; A5/A7 runtimebewijs vereist |
| Dashboard/Projecten | 2026-05-23 | A4 CSS-/modal-scopecontrole | Touch/tab/tabel/modal presentatie gehard; geen businesslogica gewijzigd | A4 viewport/devicecheck |
| Lassen/inspecties | 2026-05-23 | A4 CSS-/modal-scopecontrole | Touch/input/modal presentatie gehard; [!] bestaande frontend overall-statusberekening blijft buiten A4 | A4 read-only UI-check; A7 architectuurgate |
| Uploads | 2026-05-23 | Veiligheidsregel | Niet getest; geen writes uitgevoerd | A5 groen vereist vóór A6 |
| CE Dossier/report/PDF | 2026-05-23 | A3/A4 scopecontrole | Screen-only CSS; geen printroute/layout gewijzigd | A7/formele printtest |
| Instellingen/logo | 2026-05-23 | A4 codeaudit | Touch/input/table/modal presentatie gehard; geen opslag/upload getest | A4 read-only; A6 stagingtest |
| Billing/Facturatie | 2026-05-23 | A4 codeaudit | Touch/input/table/modal presentatie gehard; geen mutaties uitgevoerd | A4 read-only; A7 stagingtest |
| Superadmin/Tenant 360/Control Center | 2026-05-23 | A4 codeaudit | Touch/table/modal presentatie gehard; geen mutaties uitgevoerd | A4 read-only; A7 stagingtest/fixgate |
| PWA metadata/iconassets | 2026-05-23 | Featurebranch + statische assetcontrole | [x] Code/assets geldig; devicebewijs nog open | Preview/iPhonebewijs nodig |
| Apple safe-area/app-shell | 2026-05-23 | Featurebranch + cascadecontrole | [x] Code afgebakend; [!] device/buildbewijs open | iPhone/iPad/viewportchecks nodig |
| Apple touch/keyboard/modals | 2026-05-23 | Featurebranch + statische codecontrole | [x] Code afgebakend; [!] build/device/keyboardbewijs open | A4 eigenaarcontrole nodig |

## Besluitregister
| Datum | Besluit | Door wie | Impact |
|---|---|---|---|
| 2026-05-23 | Traject A alleen op featurebranch; geen merge zonder akkoord | Eigenaar/SSOT | Productie beschermd |
| 2026-05-23 | Preview read-only zolang API-target/stagingisolatie niet bewezen is | SSOT/A1 | Blokkeert writes |
| 2026-05-23 | A2 voegt één manifest/icon/metadatalaag toe zonder service worker/offlinecache | Agent binnen A2-scope | Apple installabilitycode gebouwd |
| 2026-05-23 | “Groen ga verder” autoriseert uitsluitend niet-schrijvende A3-uitvoering | Eigenaar | A3 gebouwd; writeblockers blijven actief |
| 2026-05-23 | A3 safe-area rules staan in een laatste, screen-only stylesheet wegens bestaande late theme overrides | Agent op codecontrole | Safe-area effectief en CE-print beschermd |
| 2026-05-23 | Startopdracht A4 autoriseert A4 als veilige niet-schrijvende frontend UI-hardening ondanks open A3/Preview/devicebewijs | Eigenaar | A4 gebouwd; open bewijs blijft blocker voor A5/merge |
| 2026-05-23 | A4 gebruikt een late screen-only interactielaag en VisualViewport-ondersteunde portalmodal | Agent op codecontrole | Touch/keyboard/modal hardening zonder datamutatie of redesign |

## Open blokkades
| ID | Probleem | Benodigde actie | Eigenaar/agent | Status |
|---|---|---|---|---|
| A3-01 | Branch Preview URL/buildstatus en A3-devicebewijs niet zichtbaar via beschikbare toegang | Deel Preview URL en groene/rode buildstatus; controleer A3 samen met A4 devicecheck | Eigenaar | Blocking finale acceptatie |
| A4-01 | Typecheck/lint/build niet aantoonbaar groen | Deel Cloudflare Pages buildstatus/log of draai lokaal `npm run typecheck`, `npm run lint:ci`, `npm run build:pages` | Eigenaar | Blocking A4-gate |
| A4-02 | iPhone/iPad portrait-/landscape-/keyboardbewijs ontbreekt | Test read-only touch, modal, notifications, keyboard en overflow volgens handoff | Eigenaar | Blocking A5-gate |
| A5-01 | Access/API-target/stagingketen niet bewezen | Bevestig Access/API-target; richt A5-isolatie in | Eigenaar/agent | Blocking vóór writes/uploads |
| A5-02 | Afwijkende proxy/authflow | Veilig bewijzen of harmoniseren binnen A5/A7 | Agent | Blocking auth/write/merge |
| A7-01 | Bestaande CE/inspectie/Superadmin-risico's | Gericht oplossen of gatebesluit vastleggen | Agent/eigenaar | Blocking PR/merge |
