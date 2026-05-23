# WeldInspect Pro — Apple PWA & iOS App Store Master Checklist

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatste update: 2026-05-23 (Europe/Amsterdam)
- Actief traject: Traject A — Apple-safe Webapp/PWA
- Actieve chatfase: Chat A3 — Safe area en app-shell — **implementatie gereed / acceptatiebewijs open**
- Actieve repository: `CoenWessselink/nen-1090-app`
- Actieve branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit (`main`): `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Laatste functionele A3-commits: `342b22f6267f30e263c78825137875b0040e086a`, `7e2d34d13b80ddddf9b3fe5b891f992760a9dcc6`, `4c657f2dc4f86c90e74841b334c4e694f826b27c`, `d4ed19d45c0fbd4bf5163137f9fb545ad6ec5276`
- Laatste documentatiecommits: `e039a91312017a62b809e71ec61414676ab82d83`, `42803640ffca983ec52b24b3b237d7ea6dd8d5dd`, plus checklist-/handoffafsluiting.
- PR-link: Niet aangemaakt — geen merge naar `main`.
- Preview-link: Niet feitelijk bevestigd via beschikbare toegang.
- Hoofdstatus: `A3 CODE GEREED / BUILD- EN DEVICEACCEPTATIE OPEN / PREVIEW READ-ONLY`.
- Volgende directe actie: Lever veilige Preview/build/device-uitkomsten voor A3; start A4 pas na akkoord of expliciete read-only vervolgbeslissing.

## Statuslegenda
- [ ] Niet gestart
- [~] In uitvoering
- [x] Gereed en bewezen
- [!] Geblokkeerd / eigenaaractie vereist
- [-] Niet van toepassing — reden vastgelegd

## Harde productiebeveiliging
- [x] Geen wijzigingen rechtstreeks op `main`; alle A0–A3-wijzigingen staan op `feat/apple-ios-ipados-pwa-readiness`.
- [x] Geen writes/uploads/facturen/Superadminmutaties tegen productiedata uitgevoerd in A0–A3.
- [x] Geen secrets in repo of documentatie opgenomen.
- [x] Backend blijft SSOT; CE-report route `/projecten/:projectId/ce-report` blijft ongewijzigd.
- [x] Geen service worker, brede offlinecache of tweede PWA-stack toegevoegd.
- [x] A3 safe-area laag is screen-only; geen CE-report print/PDF-styles gewijzigd.
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
- Status: [~] Code gereed; eigenaar gaf op 2026-05-23 met **“Groen ga verder”** toestemming voor uitsluitend niet-schrijvende A3-uitvoering. Preview-/API-target-/devicebewijs blijft open.
- Geïmplementeerd: Apple standalone-/title-/theme metadata, `viewport-fit=cover`, één `manifest.webmanifest`, echte branded SVG/PNG-iconset, veilige installassetheaders.
- Geen dubbele PWA-stack/offlinecache: [x] Statisch bewezen.
- API target: [!] Niet feitelijk bevestigd; preview blijft read-only.
- Gatebesluit: voldoende voor eigenaar-geautoriseerde read-only A3-layoutbouw; niet voldoende voor writes of merge.

### A3 Safe area/app shell
- Status: [~] **Implementatie gereed op branch; build-/viewport-/deviceacceptatie open.**
- Gewijzigde bestanden:
  - `src/styles/apple-safe-area.css`: nieuwe als laatste geladen, screen-only Apple safe-area laag.
  - `src/main.tsx`: importeert `apple-safe-area.css` na de bestaande visual/print styles.
- Feitelijke implementatie:
  - safe-area-insets voor topbar, sidebar, `.page-canvas`, overlays/modalpanelen, notification center, toastviewport en `.mobile-tabbar`;
  - `max(bestaande marge, safe-area-inset)` voor zijdelingse ruimte;
  - feature-detection voor `env()` plus `max()`;
  - geen wijzigingen aan CE-report print/PDF-layout of componentbusinesslogica.
- Cascadebewijs: [x] Een tijdelijke patch in `runtime-mobile-hotfix.css` is teruggedraaid nadat is vastgesteld dat een later geladen premium mobile stylesheet mobiele padding overschrijft; de finale branchdiff bevat alleen de nieuwe laatste safe-area stylesheet en de import.
- Build/typecheck/lint: [!] Niet aantoonbaar uitgevoerd; lokale clone faalde met `Could not resolve host: github.com` en geen zichtbare CI-statuscheck was beschikbaar.
- Vereiste viewports/devicebewijs: [!] Open — 375×667, 393×852, 852×393, 768×1024, 1024×768 en desktop; echte iPhone/iPad portrait/landscape.
- Gate: **Geen A4 zonder A3 acceptatiebewijs of nieuwe expliciete read-only vervolgbeslissing.**

### A4 Touch/keyboard/forms/modals
- Status: [ ] Niet gestart; wacht op A3-gate.

### A5 Stagingisolatie
- Status: [!] Geblokkeerd totdat feitelijk ingericht/bewezen.
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
| Login/cookie-auth/logout | 2026-05-23 | Codeaudit branch | [!] Dubbele proxy en Superadmin bearer-marker risico gevonden | A5/A7 runtimebewijs vereist |
| Dashboard/Projecten | 2026-05-23 | A3 CSS-scopecontrole | Geen businesslogica gewijzigd | A3 device-/viewporttest |
| Lassen/inspecties | 2026-05-23 | Codeaudit branch | [!] Frontend overall-statusberekening bestaand | A7/architectuurgate |
| Uploads | 2026-05-23 | Veiligheidsregel | Niet getest; geen writes uitgevoerd | A5 groen vereist vóór A6 |
| CE Dossier/report/PDF | 2026-05-23 | A3 scopecontrole | Screen-only safe-area CSS; geen printstyle gewijzigd | A7/formele printtest |
| Instellingen/logo | 2026-05-23 | Codeaudit branch | Niet gewijzigd; uploadroute niet getest | A6 stagingtest |
| Billing/Facturatie | 2026-05-23 | Codeaudit branch | Niet gewijzigd; geen mutaties uitgevoerd | A7 webregressie |
| Superadmin/Tenant 360/Control Center | 2026-05-23 | Codeaudit branch | Niet gewijzigd; geen mutaties uitgevoerd | A7 stagingtest/fixgate |
| PWA metadata/iconassets | 2026-05-23 | Featurebranch + statische assetcontrole | [x] Code/assets geldig; devicebewijs nog open | Preview/iPhonebewijs nodig |
| Apple safe-area/app-shell | 2026-05-23 | Featurebranch + cascadecontrole | [x] Code afgebakend; [!] device/buildbewijs open | iPhone/iPad/viewportchecks nodig |

## Besluitregister
| Datum | Besluit | Door wie | Impact |
|---|---|---|---|
| 2026-05-23 | Traject A alleen op featurebranch; geen merge zonder akkoord | Eigenaar/SSOT | Productie beschermd |
| 2026-05-23 | Preview read-only zolang API-target/stagingisolatie niet bewezen is | SSOT/A1 | Blokkeert writes |
| 2026-05-23 | A2 voegt één manifest/icon/metadatalaag toe zonder service worker/offlinecache | Agent binnen A2-scope | Apple installabilitycode gebouwd |
| 2026-05-23 | “Groen ga verder” autoriseert uitsluitend niet-schrijvende A3-uitvoering | Eigenaar | A3 gebouwd; writeblockers blijven actief |
| 2026-05-23 | A3 safe-area rules staan in een laatste, screen-only stylesheet wegens bestaande late theme overrides | Agent op codecontrole | Safe-area effectief en CE-print beschermd |

## Open blokkades
| ID | Probleem | Benodigde actie | Eigenaar/agent | Status |
|---|---|---|---|---|
| A3-01 | Branch Preview URL/buildstatus niet zichtbaar via beschikbare toegang | Deel Preview URL en groene/rode buildstatus of lokale buildresultaten | Eigenaar | Blocking A3-acceptatie |
| A3-02 | Echte iPhone/iPad safe-area/landscapecontrole ontbreekt | Test read-only topbar/tabbar/modal/sidebar/overflow portrait en landscape | Eigenaar | Blocking A4-gate |
| A5-01 | Access/API-target/stagingketen niet bewezen | Bevestig Access/API-target; richt A5-isolatie in | Eigenaar/agent | Blocking vóór writes/uploads |
| A5-02 | Afwijkende proxy/authflow | Veilig bewijzen of harmoniseren binnen A5/A7 | Agent | Blocking auth/write/merge |
| A7-01 | Bestaande CE/inspectie/Superadmin-risico's | Gericht oplossen of gatebesluit vastleggen | Agent/eigenaar | Blocking PR/merge |
