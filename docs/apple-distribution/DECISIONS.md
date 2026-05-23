# WeldInspect Pro — Apple Distribution Decisions

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatst uitgevoerde chatfase: Chat A4 — Touch / keyboard / modals
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
| DEC-A-004 | De in A1 aangetroffen dubbele API-proxyroute blijft een blocker voor latere auth-/schrijftests. | A2–A4 wijzigen geen proxy- of dataroute. |
| DEC-A2-001 | A2 voegt precies één Apple/PWA-installatielaag toe: HTML metadata, één manifest en branded iconassets. | Geïmplementeerd; geen service worker of offlinecache toegevoegd. |
| DEC-A2-002 | Iconassets: SVG browsericon, PNG touch-icon 180×180, PNG manifesticons 192×192 en 512×512, en maskable PNG 512×512. | Geïmplementeerd en statisch op afmetingen gevalideerd. |
| DEC-A2-003 | Manifest krijgt `no-cache`; iconassets krijgen beperkte hercontroleerbare caching. | Geïmplementeerd in `_headers`; geen gevoelige/offline cache. |
| DEC-A2-004 | De eigenaar heeft op 2026-05-23 met “Groen ga verder” akkoord gegeven om na A2 uitsluitend de niet-schrijvende A3-layoutfase uit te voeren. | A3 toegestaan; ontbrekend Preview/API-target-/stagingbewijs blijft writes blokkeren. |
| DEC-A3-001 | Safe-areahardening wordt als afzonderlijke laatste stylesheet `src/styles/apple-safe-area.css` geladen via `src/main.tsx`. | Geïmplementeerd; nodig omdat bestaande premium mobiele styles na de runtime-hotfix geladen worden en padding overschrijven. |
| DEC-A3-002 | De Apple-laag is uitsluitend `@media screen` en raakt geen CE-report print/PDF-styles. | Geïmplementeerd; behoudt CE-report visuele SSOT en printparity. |
| DEC-A3-003 | Insets worden toegepast op shellkritieke UI: topbar, sidebar, scrollcanvas, overlays/modalpanelen, notification center, toastviewport en mobiele tabbar. | Geïmplementeerd; notch/Dynamic Island/Home Indicator clearance gecentraliseerd. |
| DEC-A3-004 | Zijdelingse marges gebruiken `max(bestaande marge, safe-area-inset)` en worden alleen geactiveerd wanneer zowel `env()` als `max()` worden ondersteund. | Geïmplementeerd; voorkomt overtollige landscape-padding en houdt oudere browsers veilig op bestaande layout. |
| DEC-A3-005 | Bestaande premium mobile header-inset wordt niet herontworpen of verwijderd. | Behouden; A3 blijft app-shell/overlay hardening zonder redesign. |
| DEC-A4-001 | De startopdracht van 2026-05-23 is expliciet akkoord om A4 uit te voeren ondanks open A3 build-/preview-/devicebewijs, uitsluitend als niet-schrijvende frontend UI-hardening. | A4-code toegestaan; writes, uploads, authmutatietests, proxywijzigingen, stagingclaims en merge blijven verboden. |
| DEC-A4-002 | A4-interactiehardening wordt ondergebracht in een nieuwe late screen-only laag `src/styles/apple-touch-interaction.css`, geladen na `apple-safe-area.css`. | Geïmplementeerd; mobiele/coarse-pointer regels kunnen niet door eerdere theme-CSS worden teruggedraaid en wijzigen geen CE-printoutput. |
| DEC-A4-003 | Touch-capabele/small-screen bediening krijgt minimaal 44px interactieve hoogte; mobiele invoervelden krijgen minimaal 16px tekst. | Geïmplementeerd; verbetert aanraakbaarheid en voorkomt Safari inputzoom zonder desktopdensity te verhogen. |
| DEC-A4-004 | Mobiele tabs en bestaande `.table-shell` blijven functioneel gelijk maar krijgen gecontroleerde horizontale touch-scroll; dropdown-/menulijsten krijgen viewportgrenzen. | Geïmplementeerd als presentatiehardening; geen tabel- of selectbusinesslogica gewijzigd. |
| DEC-A4-005 | De bestaande portalmodal gebruikt `window.visualViewport` om beschikbare hoogte/offset bij geopend iOS-toetsenbord te volgen; desktop muisslepen blijft behouden, touch-/small-screen slepen wordt uitgeschakeld. | Geïmplementeerd; close/header/body/form actions blijven bruikbaar boven keyboard/Home Indicator zonder modalflowwijziging. |
| DEC-A4-006 | A4 wordt niet vrijgegeven voor A5 zolang buildstatus, preview/devicecontrole en keyboardmodalcontrole nog geen aantoonbaar acceptatiebewijs hebben. | Status: code gebouwd, acceptatiebewijs open; geen A5-startprompt vrijgegeven. |

## Gewijzigde bestanden A2
| Bestand | Reden |
|---|---|
| `index.html` | Apple beginscherm-/standalone metadata, `viewport-fit=cover`, branded titel, manifest- en iconlinks. |
| `public/manifest.webmanifest` | Standalone installatiegegevens en iconset. |
| `public/icons/app-icon.svg`, `apple-touch-icon-180x180.png`, `icon-192x192.png`, `icon-512x512.png`, `icon-maskable-512x512.png` | Branded Apple/PWA iconassetset. |
| `_headers` | Manifest- en iconcachebeleid. |

## Gewijzigde bestanden A3
| Bestand | Reden |
|---|---|
| `src/styles/apple-safe-area.css` | Nieuwe laatste, screen-only safe-area laag voor centrale shell, navigatie en overlays. |
| `src/main.tsx` | Safe-area stylesheet als laatste visuele stylesheet laden zodat bestaande themeregels deze niet overschrijven. |

## Gewijzigde bestanden A4
| Bestand | Reden |
|---|---|
| `src/styles/apple-touch-interaction.css` | Nieuwe late screen-only touch-, input-, modal-, tab-, tabel-, dropdown- en landscapehardeninglaag. |
| `src/main.tsx` | Importeert A4-interactielaag na A3-safe-area zodat zij de finale mobiele interactiecascade bezit. |
| `src/components/overlays/Modal.tsx` | VisualViewport-keyboardhoogte, Escape sluiten en mouse-only drag om modalbediening op iPhone/iPad bereikbaar te houden. |

## Blijvende blockers
| ID | Benodigde actie | Blocking voor |
|---|---|---|
| A3-01 | Lever Preview URL/buildstatus of eigenaar-buildbewijs en test A3 op echte iPhone/iPad portrait/landscape. | Finale A3/A4 acceptatie en A8. |
| A4-01 | Test touchdoelen, mobile tabbar, horizontale tabs/tabellen en modal/notification center in de vereiste viewports en echte devices. | A4 definitieve acceptatie/A5. |
| A4-02 | Test een bestaand inputformulier in modal met iPhone keyboard zichtbaar, uitsluitend zonder save/upload. | A4 definitieve acceptatie/A5. |
| A5-01 | Bevestig Cloudflare Access en effectieve API-target; richt geïsoleerde stagingketen in. | Iedere mutatietest, uploads, A6/A7. |
| A5-02 | Bewijs of harmoniseer de dubbele Cloudflare proxy/authroute. | Auth-/write-tests en merge. |
| A7-01 | Behandel bestaande CE/inspectie/Superadmin-risico's gericht. | A8/merge. |

## Wijzigingsregel
Besluiten worden niet stilzwijgend gewijzigd. Iedere nieuwe keuze krijgt een nieuwe regel met datum, bewijs en impact.
