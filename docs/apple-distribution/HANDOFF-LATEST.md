# WeldInspect Pro — Apple Distribution Handoff Latest

## Handoffgegevens
- Datum/tijd: 2026-05-23 CEST (Europe/Amsterdam)
- Uitgevoerde chatfase: Chat A2 — PWA metadata, iconen en Cloudflare Preview
- Actief traject: Traject A — Apple-safe Webapp/PWA
- Repository: `CoenWessselink/nen-1090-app`
- Actieve branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit vanaf `main`: `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Laatste bevestigde codecommits:
  - `78ce4124239e40b25ed75915a083787c6cd8bd1d` — webmanifest.
  - `4461f06b221bc7c700b707f0c0a02df03bae22e9` — branded SVG-icon.
  - `e3c42899260937ed55709ea4ccee9ae7465f1d30` — PNG iconassetset.
  - `e912dbabc356ec84ca6d29fdd4b64feeef593a83` — Apple/PWA metadata in `index.html`.
  - `34f1834eb644e728523bca4c90f873a34f118ab2` — veilige cacheheaders.
- A2 documentatiecommits vóór deze handoff: `127d659c7344feb66b31241010ac8ce8ea8608c8`, `eb202ec05030a9da9d5b21aab6d29c979cc29aab`, `6b404ac7b35e2eb5d1bbfdbcaed52a5996655617`.
- PR-link: Geen; niet gemerged.
- Preview-link: Nog niet feitelijk bevestigd via beschikbare toegang.
- Status: **A2 CODE GEREED / ACCEPTATIE GEBLOKKEERD OP EIGENAAR-/CLOUDFLAREBEWIJS**.
- Contextgrensstatus: Veilige overdracht vóór 70%; A3 is niet gestart.

## Wat in deze chat werkelijk is uitgevoerd
- Masterprompt, A1-checklist, A1-handoff, Decisions en Test Evidence volledig ingelezen; A1 was aantoonbaar groen.
- Alleen op branch `feat/apple-ios-ipados-pwa-readiness` gewerkt; `main` is niet gewijzigd of gemerged.
- `index.html` uitgebreid met Apple/PWA beginschermmetadata: branded documenttitel, `viewport-fit=cover`, theme color, standalone/title/statusbarvelden, manifestlink, SVG-iconlink en Apple touch-iconlink.
- Eén `public/manifest.webmanifest` toegevoegd met standalonepresentatie en `any`-/`maskable`-iconen.
- Echte branded iconassetset toegevoegd: SVG en PNG's voor Apple touch icon, 192×192, 512×512 en maskable 512×512.
- `_headers` aangescherpt voor manifest/content-type en veilige iconhervalidatie; geen serviceworker of offline datacache toegevoegd.
- A1-blocker ongewijzigd gerespecteerd: dubbele API proxy/authroute en onbewezen staging blokkeren alle previewwrites en auth-/uploadmutatietests.
- Checklist, Decisions en Test Evidence bijgewerkt met implementatie, bewijs en open acceptatieacties.

## Gewijzigde bestanden
| Bestand | Reden |
|---|---|
| `index.html` | Apple/PWA installatie- en branded metadata. |
| `public/manifest.webmanifest` | Standalone webmanifest met branded iconset. |
| `public/icons/app-icon.svg` | Vectoricon voor browser/app-presentatie. |
| `public/icons/apple-touch-icon-180x180.png` | iPhone/iPad beginschermicoon. |
| `public/icons/icon-192x192.png` | Manifest standaardicoon. |
| `public/icons/icon-512x512.png` | Manifest hoge-resolutieicoon. |
| `public/icons/icon-maskable-512x512.png` | Manifest maskable icoon. |
| `_headers` | Cache-/content-typepolicy voor installatieassets. |
| `docs/apple-distribution/DECISIONS.md` | A2-ontwerp- en veiligheidbesluiten. |
| `docs/apple-distribution/TEST-EVIDENCE.md` | A2-testbewijs en open externe verificaties. |
| `docs/apple-distribution/MASTER-CHECKLIST.md` | A2-status en gateblokkers. |
| `docs/apple-distribution/HANDOFF-LATEST.md` | Deze overdracht. |

## Uitgevoerde tests en resultaat
| Test | Omgeving/device | Resultaat | Bewijs/vervolg |
|---|---|---|---|
| A1-gatecontrole | Branchdocumentatie | PASS | A2 mocht starten. |
| Branchdiffcontrole | GitHub branch versus `main` | PASS | A2-bestanden alleen op featurebranch; branch ligt vóór `main`. |
| Webmanifest inhoud | Statische controle | PASS | `standalone`, kleurvelden en icon entries aanwezig. |
| PNG-validatie | Gegenereerde assetbytes met image parser | PASS | Geldige PNG RGB-bestanden met exacte afmetingen 180×180, 192×192, 512×512, 512×512. |
| Geen dubbele/offline PWA-stack | A1-audit + A2 diff | PASS | Geen service worker of offlinecache toegevoegd. |
| Productieveiligheid | Gehele A2-uitvoering | PASS | Geen writes, uploads, factuur- of Superadminmutaties getest. |
| `npm run typecheck` / `lint:ci` / `build:pages` | Agentomgeving/GitHubstatus | BLOCKED | GitHub toont geen workflow/statuscheck; lokale clone faalt door DNS naar GitHub. Eigenaar/Pages buildlog vereist. |
| Preview URL / Access / API-target | Cloudflare-dashboardtoegang | BLOCKED | Dashboardstatus niet via beschikbare toegang uitleesbaar; eigenaar moet terugmelden. |
| iPhone beginscherminstallatie | Echte iPhone | OPEN | Eigenaar moet testen na werkende preview. |

## Productieveiligheid
- Writes tegen productie uitgevoerd: **NEE**.
- Preview writes/uploads/authmutatietests uitgevoerd: **NEE**.
- Preview API-target: **NIET BEWEZEN**; repositorybaseline in `wrangler.toml` wijst naar productie-Azure.
- Stagingisolatie status: **NIET BEWEZEN / BLOCKING VOOR WRITES**.
- Dubbele proxy/authroute gewijzigd: **NEE**; blocker blijft staan voor A5/A7.
- Service worker/offline cache toegevoegd: **NEE**.
- Secrets toegevoegd aan repo: **NEE**.

## Acties die eigenaar nu moet uitvoeren
1. Open Cloudflare Pages in het bestaande app-project en ga naar de deployment van branch `feat/apple-ios-ipados-pwa-readiness`.
2. Meld de Preview URL en of de build groen of rood is; deel bij rood alleen de fouttekst.
3. Controleer of Cloudflare Access voor die preview actief is. Wanneer bedrijfsdata zichtbaar kan zijn en Access nog uit staat: bescherm de preview vóór inhoudelijke appcontrole.
4. Meld uitsluitend of de preview-API naar `productie` of `staging` wijst; deel geen secrets. Zolang dit niet bewezen `staging` is: alleen kijken, niets opslaan/uploaden.
5. Lever buildbewijs via het Pages-buildlog of voer lokaal in `C:\NEN1090\nen-1090-app` op deze branch uit: `npm run typecheck`, `npm run lint:ci`, `npm run build:pages`.
6. Op iPhone Safari: open de veilige preview, kies **Deel → Zet op beginscherm**, controleer appnaam **WeldInspect Pro**, het branded icoon en openen in standalone-weergave; meld resultaat/screenshot.

## Open risico's/blockers
| ID | Risico / blocker | Vervolg |
|---|---|---|
| A2-01 | Preview URL en Pages buildstatus ontbreken | Eigenaar retourneert URL en buildstatus/log. |
| A2-02 | Access-status en effectieve API-target ontbreken | Eigenaar bevestigt Access en productie/staging-target; preview blijft read-only. |
| A2-03 | Typecheck/lint/build niet aantoonbaar groen | Pages log of lokale eigenaar-run retourneren. |
| A2-04 | iPhone Add-to-Home-Screen niet bevestigd | Eigenaar voert echte-device test uit. |
| A5-01 | Geïsoleerde stagingketen niet bewezen | Geen writes/uploads vóór A5 groen. |
| A5-02 | Dubbele API proxy/authroute blijft bestaan | In A5/A7 veilig bewijzen of harmoniseren vóór auth-/write-tests. |
| A7-01 | CE/inspectie/Superadmin bestaande risico's | In A7 gericht afhandelen vóór PR/merge. |

## Volgende chat moet eerst lezen
1. Het masterpromptbestand `WeldInspect-Pro-Apple-PWA-App-Store-Masterprompt-Meer-Chat-Bouwfasen-Checklist-2026-05-23.txt`.
2. `docs/apple-distribution/MASTER-CHECKLIST.md` op branch `feat/apple-ios-ipados-pwa-readiness`.
3. Dit bestand, `docs/apple-distribution/HANDOFF-LATEST.md`.
4. `docs/apple-distribution/DECISIONS.md` en `docs/apple-distribution/TEST-EVIDENCE.md`.
5. Eigenaarbewijs: Preview URL, Access-status, API-targetklasse, buildresultaten en iPhone-testuitkomst.

## Exacte herstartopdracht voor afronding A2
“Lees masterprompt, `docs/apple-distribution/MASTER-CHECKLIST.md` en `docs/apple-distribution/HANDOFF-LATEST.md` volledig in. Ik heb de gevraagde Cloudflare Pages-/Access-/API-target-/build- en iPhone-beginschermbewijzen voor Chat A2 uitgevoerd en toegevoegd. Controleer uitsluitend of de A2-blokkades zijn opgelost op branch `feat/apple-ios-ipados-pwa-readiness`; wijzig geen productiedata en voer geen writes uit zolang staging niet aantoonbaar is. Werk A2-testbewijs/checklist/handoff bij, commit/push en lever alleen wanneer A2 volledig groen is de startopdracht voor Chat A3. Stop veilig vóór 70% context.”

## Startopdracht A3 — uitsluitend gebruiken nadat A2 groen is verklaard
“Lees masterprompt, checklist en handoff volledig in. Controleer dat A2 aantoonbaar groen is. Voer uitsluitend Chat A3 uit op branch `feat/apple-ios-ipados-pwa-readiness`. Bouw een centrale veilige iPhone/iPad safe-area oplossing in de bestaande UI voor notch, Dynamic Island en Home Indicator. Pas alleen noodzakelijke app-shell-, topbar-, sidebar-, tabbar-, overlay-, modal- en toaststyles/componenten aan. Desktop en CE-report print/PDF mogen niet regressief wijzigen. Test minimaal 375x667, 393x852, 852x393, 768x1024, 1024x768 en desktop. Commit/push alleen als de fase groen is. Werk checklist en handoff bij en lever echte-device checks plus startprompt A4. Stop veilig vóór 70% context.”
