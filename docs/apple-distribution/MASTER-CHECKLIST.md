# WeldInspect Pro — Apple PWA & iOS App Store Master Checklist

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatste update: 2026-05-23 (Europe/Amsterdam)
- Actief traject: Traject A — Apple-safe Webapp/PWA
- Actieve chatfase: Chat A2 — PWA metadata, iconen en Cloudflare Preview — **implementatie gereed / acceptatie geblokkeerd**
- Actieve repository: `CoenWessselink/nen-1090-app`
- Actieve branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit (`main`): `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- A2 codecommits: `78ce4124239e40b25ed75915a083787c6cd8bd1d`, `4461f06b221bc7c700b707f0c0a02df03bae22e9`, `e3c42899260937ed55709ea4ccee9ae7465f1d30`, `e912dbabc356ec84ca6d29fdd4b64feeef593a83`, `34f1834eb644e728523bca4c90f873a34f118ab2`
- A2 documentatiecommits: `127d659c7344feb66b31241010ac8ce8ea8608c8`, `eb202ec05030a9da9d5b21aab6d29c979cc29aab`, plus deze checklist-/handoffafsluiting.
- PR-link: Niet aangemaakt — geen merge naar `main`.
- Preview/TestFlight-link: Niet feitelijk uitleesbaar via beschikbare toegang; eigenaar moet Cloudflare Pages-preview terugmelden.
- Hoofdstatus: `A2 CODE GEREED / BLOCKED OP BUILD-, PREVIEW-, ACCESS-, API-TARGET- EN IPHONEBEWIJS`.
- Volgende directe actie: Eigenaar levert A2-bewijs; daarna dezelfde A2-gate afronden of pas na groenbewijs A3 starten.

## Statuslegenda
- [ ] Niet gestart
- [~] In uitvoering
- [x] Gereed en bewezen
- [!] Geblokkeerd / eigenaaractie vereist
- [-] Niet van toepassing — reden vastgelegd

## Harde productiebeveiliging
- [x] Geen wijzigingen rechtstreeks op `main`; alle A0–A2-wijzigingen staan op `feat/apple-ios-ipados-pwa-readiness`.
- [x] Geen writes/uploads/facturen/Superadminmutaties tegen productiedata uitgevoerd in A0–A2.
- [x] Geen secrets in repo of documentatie opgenomen.
- [x] Backend blijft SSOT; CE-report route `/projecten/:projectId/ce-report` is ongewijzigd behouden.
- [x] Geen service worker, brede offlinecache of tweede PWA-stack toegevoegd.
- [-] Rollback per merge/release — nog niet van toepassing; branch is niet gemerged.

## Vastgelegde A1-blockers die blijven gelden
- De repository bevat twee Cloudflare API Functions met afwijkende authflow: `functions/api/[[path]].js` en `functions/api/v1/[[path]].js`.
- `wrangler.toml` bevat als repositorybaseline de productie-Azure-upstream; previewwrites blijven verboden zolang staging niet bewezen is.
- Azure slot `staging`, aparte database/storage, veilige testmail en billingtestmodus zijn nog niet bewezen; A5 blijft blocking voor schrijftests.
- Bestaande CE/inspectiestatus- en Superadmin-authrisico's moeten in A7 worden afgehandeld vóór merge.

## Traject A — Apple-safe Webapp/PWA

### A0 Branch/checklist/baseline
- Status: [x] Gereed en bewezen.
- Gewijzigde bestanden: `docs/apple-distribution/MASTER-CHECKLIST.md`, `HANDOFF-LATEST.md`, `DECISIONS.md`, `TEST-EVIDENCE.md`.
- Gate: Door naar A1 — uitgevoerd.

### A1 Audit
- Status: [x] Gereed en bewezen.
- Bevindingen: Geen bestaande PWA-stack; dubbele proxy/authroute; gesplitste uploadflows; CE/inspectie SSOT-risico's; Superadmin bearer-marker risico.
- Gate: Door naar A2 met read-only previewbeperking — uitgevoerd.

### A2 PWA metadata/icons/preview
- Status: [!] **Implementatie gereed op branch; acceptatie geblokkeerd op eigenaar-/Cloudflarebewijs.**
- Geïmplementeerd:
  - `index.html`: `viewport-fit=cover`, theme color, appnaam, Apple standalone/title/statusbar metadata, manifestlink, SVG favicon en 180×180 Apple touch-iconlink.
  - `public/manifest.webmanifest`: één standalone manifest met branded `any`- en `maskable`-iconen.
  - `public/icons/app-icon.svg`, `apple-touch-icon-180x180.png`, `icon-192x192.png`, `icon-512x512.png`, `icon-maskable-512x512.png`.
  - `_headers`: no-cache voor manifest en beperkte hercontroleerbare iconcache; geen offline datacache.
- Branded assetvalidatie: [x] PNG-bestanden zijn statisch als geldige PNG's met exacte afmetingen 180×180, 192×192, 512×512 en 512×512 gevalideerd; manifestvelden zijn statisch gevalideerd.
- Typecheck/lint/build: [!] Niet aantoonbaar uitgevoerd: GitHub toont geen statuscheck/workflowrun op actuele branchhead en uitvoercontainer kan door DNS-blokkade de repository niet lokaal clonen.
- Preview URL: [!] Niet feitelijk vastgesteld; Cloudflare-dashboardtoegang ontbreekt.
- Access status: [!] Niet feitelijk vastgesteld; preview moet met Access worden beschermd wanneer bedrijfsdata zichtbaar is.
- API target: [!] Niet feitelijk vastgesteld; repositorybaseline is productie-Azure, dus preview blijft uitsluitend read-only.
- iPhone add-to-home-screen bewijs: [!] Open — eigenaar moet icoon, titel en standalone-start bevestigen.
- Gate: **NIET DOOR NAAR A3** tot build-, Preview-/Access-/API-target- en iPhonebewijs is teruggeleverd of expliciet vervolg binnen dezelfde geblokkeerde fase is gegeven.

### A3 Safe area/app shell
- Status: [ ] Niet gestart; wacht op A2-gate.
- Scope: primair `src/styles/runtime-mobile-hotfix.css`; alleen noodzakelijke shell/layout/scaffold/modalcomponenten.
- Vereiste viewports: 375×667, 393×852, 852×393, 768×1024, 1024×768 en desktop.

### A4 Touch/keyboard/forms/modals
- Status: [ ] Niet gestart.

### A5 Stagingisolatie
- Status: [!] Geblokkeerd totdat feitelijk ingericht/bewezen.
- API staging hostname: Niet bevestigd.
- Aparte DB/storage/testmail/billingveiligheid: Niet bevestigd.
- Preview → staging bewijs: Niet beschikbaar.
- Extra blocker: dubbele Pages proxy/authroute moet veilig worden bewezen of geharmoniseerd vóór auth/write-tests.

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
| Dashboard/Projecten | 2026-05-23 | A2 metadata-only diff | Geen functionele wijziging | A3/A4/A8 testen |
| Lassen/inspecties | 2026-05-23 | Codeaudit branch | [!] Frontend overall-statusberekening bestaand | A7/architectuurgate |
| Uploads | 2026-05-23 | Veiligheidsregel | Niet getest; geen writes uitgevoerd | A5 groen vereist vóór A6 |
| CE Dossier/report/PDF | 2026-05-23 | Codeaudit branch | [!] Frontend score/statuslogica bestaand; A2 raakt CE niet | A7/mergegate |
| Instellingen/logo | 2026-05-23 | Codeaudit branch | Niet gewijzigd; uploadroute niet getest | A6 stagingtest |
| Billing/Facturatie | 2026-05-23 | Codeaudit branch | Niet gewijzigd; geen mutaties uitgevoerd | A7 webregressie |
| Superadmin/Tenant 360/Control Center | 2026-05-23 | Codeaudit branch | Niet gewijzigd; geen mutaties uitgevoerd | A7 stagingtest/fixgate |
| PWA metadata/iconassets | 2026-05-23 | Featurebranch + statische assetcontrole | [x] Code/assets geldig; [!] live/devicebewijs open | Cloudflare/iPhone bewijs gevraagd |

## Besluitregister
| Datum | Besluit | Door wie | Impact |
|---|---|---|---|
| 2026-05-23 | Traject A alleen op featurebranch; geen merge zonder akkoord | Eigenaar/SSOT | Productie beschermd |
| 2026-05-23 | Preview read-only zolang API-target/stagingisolatie niet bewezen is | SSOT/A1 | Blokkeert writes |
| 2026-05-23 | A2 voegt één manifest/icon/metadatalaag toe zonder service worker/offlinecache | Agent binnen A2-scope | Apple installabilitycode gereed |
| 2026-05-23 | A2 kan niet groen worden verklaard zonder build-, Preview-/Access-/API-target- en iPhonebewijs | Agent op feitelijk bewijs | Eigenaaractie nodig vóór A3 |

## Open blokkades
| ID | Probleem | Benodigde actie | Eigenaar/agent | Status |
|---|---|---|---|---|
| A2-01 | Cloudflare Preview URL/buildstatus niet zichtbaar via beschikbare toegang | Open bestaande Pages-project en deel preview-URL + groene/rode buildstatus | Eigenaar | Blocking A2-gate |
| A2-02 | Access-status en effectieve Preview API-target niet bewezen | Activeer/bevestig Access; meld alleen `productie` of `staging` als API-target | Eigenaar | Blocking previewveiligheid |
| A2-03 | Typecheck/lint/build niet uitvoerbaar via huidige agenttoegang | Lever Pages buildlog of run lokaal `npm run typecheck`, `npm run lint:ci`, `npm run build:pages` | Eigenaar | Blocking A2-gate |
| A2-04 | iPhone beginschermtest nog niet uitgevoerd | Safari preview → Deel → Zet op beginscherm; test icoon/titel/openen | Eigenaar | Blocking installabilityacceptatie |
| A5-01 | Stagingketen niet bewezen | A5 isolatie inrichten/controleren | Agent/eigenaar | Blocking vóór writes/uploads |
| A5-02 | Afwijkende proxy/authflow | Veilig bewijzen of harmoniseren binnen A5/A7 | Agent | Blocking auth/write/merge |
| A7-01 | Bestaande CE/inspectie/Superadmin-risico's | Gericht oplossen of gatebesluit vastleggen | Agent/eigenaar | Blocking PR/merge |
