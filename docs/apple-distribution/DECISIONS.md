# WeldInspect Pro — Apple Distribution Decisions

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatst uitgevoerde chatfase: Chat A2 — PWA metadata, iconen en previewcontrole
- Repository: `CoenWessselink/nen-1090-app`
- Branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit (`main`): `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Laatste bijwerking: 2026-05-23 (Europe/Amsterdam)

## Vaste besluiten
| ID | Besluit | Status / impact |
|---|---|---|
| DEC-A-001 | Traject A wordt uitsluitend uitgevoerd op `feat/apple-ios-ipados-pwa-readiness`; geen merge zonder expliciet eigenaarakkoord. | Vaststaand; productiebranch beschermd. |
| DEC-A-002 | Backend blijft SSOT en `/projecten/:projectId/ce-report` blijft de bestaande visuele rapportroute. | Geen nieuwe frontend-businesslogica of tweede rapportlayout. |
| DEC-A-003 | Preview blijft read-only totdat preview aantoonbaar naar geïsoleerde staging wijst. | Geen saves, uploads of mutatietests via een onbewezen preview. |
| DEC-A-004 | De in A1 aangetroffen dubbele API-proxyroute blijft een blocker voor latere auth-/schrijftests. | A2 wijzigt geen proxy- of dataroute. |
| DEC-A2-001 | A2 voegt precies één Apple/PWA-installatielaag toe: HTML metadata, één manifest en branded iconassets. | Geïmplementeerd; geen service worker of offlinecache toegevoegd. |
| DEC-A2-002 | Iconassets: SVG browsericon, PNG touch-icon 180×180, PNG manifesticons 192×192 en 512×512, en maskable PNG 512×512. | Geïmplementeerd en statisch op afmetingen gevalideerd. |
| DEC-A2-003 | `viewport-fit=cover` is alleen voorbereidende metadata; centrale safe-area layoutcorrecties behoren tot A3. | A2 wijzigt geen app-shell-/printlayout. |
| DEC-A2-004 | Manifest krijgt `no-cache`; iconassets krijgen beperkte hercontroleerbare caching. | Geïmplementeerd in `_headers`; geen gevoelige/offline cache. |
| DEC-A2-005 | `wrangler.toml` bevat als repositorybaseline de productie-API; dashboardoverride en Access-status zijn niet zichtbaar via de beschikbare toegang. | Preview blijft read-only en eigenaarcontrole is vereist. |
| DEC-A2-006 | Er zijn geen zichtbare GitHub statuschecks/workflowruns op de huidige A2-head; de uitvoercontainer kan de repository niet lokaal clonen door DNS-beperking. | Volledige typecheck/lint/build moet nog met Pages buildlog of eigenaar-run worden bewezen. |

## A2 gewijzigde bestanden
| Bestand | Reden |
|---|---|
| `index.html` | Apple beginscherm-/standalone metadata, `viewport-fit=cover`, branded titel, manifest- en iconlinks. |
| `public/manifest.webmanifest` | Standalone installatiegegevens en iconset. |
| `public/icons/app-icon.svg` | Branded vectoricon. |
| `public/icons/apple-touch-icon-180x180.png` | Apple beginschermicon. |
| `public/icons/icon-192x192.png` | Manifesticon. |
| `public/icons/icon-512x512.png` | Hoge-resolutie manifesticon. |
| `public/icons/icon-maskable-512x512.png` | Maskable manifesticon. |
| `_headers` | Manifest- en iconcachebeleid. |

## Blijvende auditbevindingen uit A1
- Geen bestaande manifest-, Apple icon-, PWA-plugin- of serviceworkerlaag was aangetroffen vóór A2.
- Safe-area/app-shell hardening behoort tot A3; writes/uploads/authmutatietests vereisen eerst A5-isolatie.
- CE-report/PDF, Billing en Superadmin-/Control Center-risico's blijven beschermd en moeten in de aangewezen latere fases worden behandeld.

## Open blokkades
| ID | Benodigde actie | Blocking voor |
|---|---|---|
| A2-01 | Open het bestaande Cloudflare Pages-project, bevestig Preview URL en activeer/bevestig Access voor previews met bedrijfsdata. | A2 previewacceptatie. |
| A2-02 | Bevestig zonder gevoelige waarden of de preview API-target productie of staging is. | Iedere mutatietest. |
| A2-03 | Lever groen Pages buildlog of voer lokaal `npm run typecheck`, `npm run lint:ci` en `npm run build:pages` uit. | Definitieve A2 gate / start A3. |
| A2-04 | Test op iPhone Safari: Deel → Zet op beginscherm; controleer icoon, naam en openen als app. | Installabilityacceptatie. |
| A5-01 | Bewijs geïsoleerde stagingketen en veilige API-routering. | A6/A7 writes/uploads. |

## Wijzigingsregel
Besluiten worden niet stilzwijgend gewijzigd. Iedere nieuwe keuze krijgt een nieuwe regel met datum, bewijs en impact.
