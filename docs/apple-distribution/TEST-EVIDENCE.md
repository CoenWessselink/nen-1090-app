# WeldInspect Pro — Apple Distribution Test Evidence

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatst uitgevoerde fase: Chat A2 — PWA metadata, iconen en previewcontrole
- Repository: `CoenWessselink/nen-1090-app`
- Branch: `feat/apple-ios-ipados-pwa-readiness`
- Baseline `main` SHA: `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Datum: 2026-05-23 (Europe/Amsterdam)
- Veiligheidsstatus: geen productiedatawrites; preview uitsluitend read-only zolang staging niet bewezen is.

## Uitvoerbeperking
De repository is via de gekoppelde GitHub-toegang gelezen en bijgewerkt. Een lokale read-only clonepoging vanuit de uitvoercontainer faalt doordat `github.com` daar niet via DNS bereikbaar is. GitHub toont op de actuele A2-head geen statuschecks of workflowruns. Daardoor worden `npm run typecheck`, `npm run lint:ci` en `npm run build:pages` niet ten onrechte als uitgevoerd of groen aangemerkt; hun bewijs moet worden aangevuld vanuit Cloudflare Pages buildlogs of een eigenaar-run.

## A0/A1 bewijsstatus
| Fase | Resultaat | Samenvatting |
|---|---|---|
| A0 | PASS | Veilige branch/documentatieset/baseline op featurebranch; geen productie-effect. |
| A1 | PASS | Audit afgerond; geen bestaande PWA-stack; dubbele proxy/authroute en stagingvereisten als blockers vastgelegd. |

## A2 — Implementatiebewijs
| ID | Controle | Bron/omgeving | Resultaat | Bewijs / conclusie |
|---|---|---|---|---|
| A2-E01 | A1-gate en scope vooraf gecontroleerd | `MASTER-CHECKLIST.md`, `HANDOFF-LATEST.md`, `DECISIONS.md`, `TEST-EVIDENCE.md` | PASS | A1 stond op gereed; A2 mocht uitsluitend metadata/icons/preview uitvoeren. |
| A2-E02 | Bestaande PWA-stack niet gedupliceerd | A1 audit + A2 diff | PASS | Eén `public/manifest.webmanifest` toegevoegd; geen serviceworker, Workbox of offlinecache toegevoegd. |
| A2-E03 | Apple/PWA metadata | `index.html` op featurebranch | PASS | `viewport-fit=cover`, branded titel, theme-color, standalone/title/statusbarmetadata, manifestlink en Apple touch-iconlink toegevoegd. |
| A2-E04 | Webmanifestinhoud | `public/manifest.webmanifest` | PASS | `name`, `short_name`, `start_url`, `scope`, `display: standalone`, kleurvelden en drie PNG icon entries aanwezig. |
| A2-E05 | Branded iconassets aanwezig | Featurebranch diff + statische assetvalidatie | PASS | SVG en PNG-assets aangemaakt voor 180×180, 192×192, 512×512 en maskable 512×512. |
| A2-E06 | PNG assetformaten/dimensies | Gegenereerde assetbytes gevalideerd met image parser | PASS | Alle vier PNG-assets zijn geldige PNG RGB-bestanden met exact de bedoelde afmetingen. |
| A2-E07 | Veilige installatieassetcache | `_headers` | PASS | Manifest `no-cache`; iconen beperkt cachebaar met `max-age=86400, must-revalidate`; geen gevoelige tenantdata/offlinecache. |
| A2-E08 | Productieveiligheid | Gehele A2-uitvoering | PASS | Geen API-calls voor writes, uploads, Billing- of Superadminmutaties uitgevoerd; proxies ongemoeid gelaten. |
| A2-E09 | Repository/API-targetbaseline | `wrangler.toml` | PASS met blocker | Repositorybaseline wijst naar productie-Azure; preview mag uitsluitend read-only gebruikt worden totdat staging aantoonbaar is. |
| A2-E10 | Typecheck/lint/buildbewijs | Beschikbare GitHubstatus + uitvoercontainer | BLOCKED | Geen CI-run/status zichtbaar; lokale clone/build kan niet worden uitgevoerd door DNS-beperking naar GitHub. |
| A2-E11 | Cloudflare Pages Preview URL/Access/API-target | Beschikbare toegang | BLOCKED | Cloudflare-dashboard/Pages deploymentstatus is niet beschikbaar via de gekoppelde toegang; eigenaar moet URL, Access-status en effective API-target bevestigen. |
| A2-E12 | Echte iPhone Add-to-Home-Screen | Eigenaar/device vereist | OPEN | Moet na previewdeploy handmatig worden getest: icoon, titel en standalone-start. |

## A2 gewijzigde bestanden en commits
| Bestand | Doel | Commit(s) |
|---|---|---|
| `public/manifest.webmanifest` | Branded standalone manifest | `78ce4124239e40b25ed75915a083787c6cd8bd1d` |
| `public/icons/app-icon.svg` | Vectorbrowsericon | `4461f06b221bc7c700b707f0c0a02df03bae22e9` |
| `public/icons/apple-touch-icon-180x180.png`, `icon-192x192.png`, `icon-512x512.png`, `icon-maskable-512x512.png` | Apple/manifest branded PNG-assets | `e3c42899260937ed55709ea4ccee9ae7465f1d30` |
| `index.html` | Apple/PWA metadata en links | `e912dbabc356ec84ca6d29fdd4b64feeef593a83` |
| `_headers` | Cache- en manifest content-typepolicy | `34f1834eb644e728523bca4c90f873a34f118ab2` |
| `docs/apple-distribution/DECISIONS.md` | A2 beslissingen/blockers | `127d659c7344feb66b31241010ac8ce8ea8608c8` |

## Nog door eigenaar of Cloudflare bewijs te leveren voor A2-gate
| Controle | Actie | Gevraagde terugmelding zonder secrets |
|---|---|---|
| Cloudflare Preview Deployment | Cloudflare Pages → bestaande appproject → Deployments → branch `feat/apple-ios-ipados-pwa-readiness` openen. | Preview-URL en buildstatus/logresultaat. |
| Cloudflare Access | Beveilig previewdeployments met Access wanneer bedrijfsdata zichtbaar kan zijn. | `Access actief: JA/NEE`. |
| API-target | Controleer Preview environment variable/Pages Function upstream. | Alleen hostname/type: `productie` of `staging`; geen tokens/secrets. |
| Buildcontroles | Deel Cloudflare buildlog waarin relevante npm-build groen is, of voer lokaal uit: `npm run typecheck`; `npm run lint:ci`; `npm run build:pages`. | PASS/FAIL per commando met fouttekst bij FAIL. |
| iPhone beginschermtest | Safari preview openen → Deel → Zet op beginscherm → openen. | Icoon/titel/startscherm correct: JA/NEE + screenshot bij afwijking. |

## Gatebesluit A2
- Implementatiecode/assets: **GEREED OP FEATUREBRANCH**.
- Statische manifest-/PNG-validatie: **PASS**.
- Productieveiligheid: **PASS; GEEN WRITES**.
- Build/typecheck/lint: **BLOCKED / NIET AANTOONBAAR UITGEVOERD**.
- Preview URL/Access/effectieve API-target: **BLOCKED OP CLOUDFLARE DASHBOARDBEWIJS**.
- iPhone beginschermacceptatie: **OPEN — EIGENAARTEST**.
- Doorgaan naar A3: **NOG NIET**, totdat build- en previewveiligheidsbewijs is teruggeleverd of de eigenaar expliciet besluit A3 alleen als niet-schrijvende UI-fase door te zetten.
