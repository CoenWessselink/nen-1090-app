# WeldInspect Pro — Apple Distribution Handoff Latest

## Handoffgegevens
- Datum/tijd: 2026-05-23 CEST (Europe/Amsterdam)
- Uitgevoerde chatfase: Chat A4 — Touch / keyboard / modals
- Actief traject: Traject A — Apple-safe Webapp/PWA
- Repository: `CoenWessselink/nen-1090-app`
- Actieve branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit vanaf `main`: `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Laatste functionele A3-commits: `342b22f6267f30e263c78825137875b0040e086a`, `7e2d34d13b80ddddf9b3fe5b891f992760a9dcc6`, `4c657f2dc4f86c90e74841b334c4e694f826b27c`, `d4ed19d45c0fbd4bf5163137f9fb545ad6ec5276`.
- Functionele A4-commits:
  - `1516071051c39360c606ea9e930973e6a40e3e7e` — nieuwe touch/keyboard/overflow/landscape stylesheet.
  - `77a49c1cccd091a097fa42524affbbb95a9765e0` — A4 stylesheet als laatste interactielaag geïmporteerd.
  - `0635bb7b97afc2cc92b0c1dcb0a5c51a863fa3c7` — modal VisualViewport en mouse-only drag.
  - `908be349ed37d98801e3406d92cbbffb05f8d6ae` — mobiele rij-/stackactielinks opgenomen in touch-targetdekking.
- A4-documentatiecommits vóór deze handoff: `7629916ad7768a6d3bf782fbcc6a529279a7017a`, `16d8405429db8851df34fb9aa14fbc1a2fbc23f2`, `bd098892fac973eeba8e9ee480d473a8d8488f4a`.
- PR-link: Geen; niet gemerged.
- Preview-link: Niet feitelijk bevestigd via beschikbare toegang.
- Status: **A4 CODE GEREED / BUILD-, PREVIEW-, DEVICE- EN KEYBOARDACCEPTATIE OPEN / PREVIEW READ-ONLY**.
- Contextgrensstatus: Veilige overdracht vóór 70%; A5 is niet gestart.

## Wat in deze chat werkelijk is uitgevoerd
- Het geüploade Apple/PWA-masterpromptbestand als SSOT gelezen; de A4-startopdracht is vastgelegd als expliciete toestemming om uitsluitend niet-schrijvende frontendhardening te bouwen, ondanks nog open A3 build-/Preview-/devicebewijs.
- De bestaande A3-branchdocumentatie en relevante implementatie codegericht geïnspecteerd: `apple-safe-area.css`, `main.tsx`, runtime/premium mobiele styles, app-shell/topbar/sidebar/tabbar, portalmodal, notification center, toastviewport, Login en routerdekking.
- Feitelijk vastgestelde A4-hiaten: bestaande iconbuttons van 40px; geen finale centrale 16px iOS-inputborging; tabs/tabellen/dropdownpresentatie niet finaal voor touchoverflow afgedekt; modalsleepgedrag nog actief voor touch; modal kende geen VisualViewport-hoogte bij geopend iOS-keyboard.
- Een nieuwe late, uitsluitend screen/touch-gerichte stylesheet `src/styles/apple-touch-interaction.css` toegevoegd en via `src/main.tsx` na `apple-safe-area.css` geladen.
- In deze laag minimale 44px touchdoelen afgedwongen voor knoppen, iconknoppen, tabs, drawer-/rijacties en rolknoppen in mobiele/coarse-pointer context; meldingsrijen krijgen minimaal 56px.
- In deze laag invoervelden/selects/textarea's in mobiele/coarse-pointer context minimaal 16px tekst en 44px hoogte gegeven, plus scrollruimte zodat gefocuste velden niet achter acties/tabbar verdwijnen.
- Mobiele tabs, bestaande `.table-shell` en dropdown/listbox/menu containers presentatief gehard met touchscroll en viewportgrenzen, zonder tabel- of datalogica te wijzigen.
- De bestaande portalmodal gewijzigd zodat `window.visualViewport` de zichtbare hoogte/offset doorgeeft wanneer het iOS-toetsenbord opent; modalacties kunnen sticky boven de bottom safe area blijven; drag start alleen nog met desktopmuis en Escape sluit de modal.
- Landscapepresentatie compact gehouden zonder de in A3 ingevoerde notch-/Home Indicator-bescherming te omzeilen.
- Geen productiedata, formulieren, uploads, Billing/Mollie, Superadminmutaties of authmutatietests uitgevoerd; geen API-, backend-, proxy- of CE-report/PDF-layoutwijziging uitgevoerd.

## Gewijzigde bestanden
| Bestand | Reden |
|---|---|
| `src/styles/apple-touch-interaction.css` | Nieuwe finale, screen-only mobiele/coarse-pointer interactielaag voor touchdoelen, inputzoompreventie, overflow, modalfooter en landscape. |
| `src/main.tsx` | Importeert A4-interactielaag na A3 safe-area laag zodat late mobiele themeregels haar niet overschrijven. |
| `src/components/overlays/Modal.tsx` | iOS keyboardzichtbaarheid via VisualViewport, touch-safe draggedrag en Escape sluiten. |
| `docs/apple-distribution/DECISIONS.md` | A4-autorisatie, ontwerpkeuzes en gates vastgelegd. |
| `docs/apple-distribution/TEST-EVIDENCE.md` | A4 statisch bewijs, uitgevoerde veiligheidscontroles en open runtimebewijs vastgelegd. |
| `docs/apple-distribution/MASTER-CHECKLIST.md` | A4-status, gewijzigde bestanden, gates en blijvende productieveiligheidsblockers bijgewerkt. |
| `docs/apple-distribution/HANDOFF-LATEST.md` | Deze veilige overdracht. |

## Uitgevoerde tests en resultaat
| Test | Omgeving/device | Resultaat | Bewijs/vervolg |
|---|---|---|---|
| A4-scope-/gatecontrole | Masterprompt + branchdocumentatie + startopdracht | PASS | Alleen read-only frontend hardening uitgevoerd; A5/writes niet gestart. |
| Relevante interactiebroninspectie | GitHub branchcode | PASS | Concrete touch/input/modal/overflowhiaten vastgesteld vóór patch. |
| Nieuwe CSS-cascade-/printscopecontrole | `apple-touch-interaction.css` + `main.tsx` | PASS statisch | Laag is screen-only, late import en mobiel/coarse-pointer begrensd; geen printstylesheet gewijzigd. |
| Touch target controle | A4 stylesheet | PASS statisch | Knoppen/iconknoppen/tabs/drawer-/rijacties/role-buttons ≥44px; notification items ≥56px in touchcontext. |
| iOS inputzoom/focusruimte | A4 stylesheet | PASS statisch | Mobile/coarse-pointer input/select/textarea ≥16px en focus-scrollmarges aanwezig. |
| Tabel/tab/dropdownpresentatie | A4 stylesheet | PASS statisch | Scroll-/viewportregels toegevoegd zonder functionele dataflow. |
| Modal keyboard/touchcode | `Modal.tsx` + A4 stylesheet | PASS statisch | VisualViewporthoogte/offset, sticky action clearance, mouse-only drag en Escape close aanwezig. |
| Kritieke interfacescope | Router + Login + shell/overlaycomponenten | PASS codegericht / runtime OPEN | Generieke A4-laag omvat gevraagde interfaces; devicecontrole ontbreekt nog. |
| Productieveiligheid | Gehele A4-uitvoering | PASS | Geen writes/uploads/authmutaties/Billing-/Superadminacties; geen proxy/backend/API/merge. |
| Lokale clone voor `npm`-tests | Uitvoercontainer | BLOCKED | `git clone` faalde met `Could not resolve host: github.com`. |
| `npm run typecheck` | Container/GitHub CI | BLOCKED | Niet uitvoerbaar zonder lokale clone; geen GitHub Actions/statuscheck zichtbaar op A4-codehead. |
| `npm run lint:ci` | Container/GitHub CI | BLOCKED | Niet uitvoerbaar zonder lokale clone; geen GitHub Actions/statuscheck zichtbaar op A4-codehead. |
| `npm run build:pages` | Container/Cloudflare | BLOCKED | Geen lokale clone; Preview/Pages-buildstatus niet via beschikbare toegang bevestigd. |
| Viewport-/device-/keyboardmatrix | Preview/echt device | OPEN | Eigenaar moet read-only iPhone/iPad/desktopcontroles uitvoeren. |

## Productieveiligheid
- Writes tegen productie uitgevoerd: **NEE**.
- Writes/uploads/authmutatietests via preview uitgevoerd: **NEE**.
- Billing-/Mollie-/Superadminmutaties uitgevoerd: **NEE**.
- Preview API-target: **NIET BEWEZEN**; preview blijft uitsluitend read-only.
- Cloudflare Preview URL/buildstatus/Access-status: **NIET BEWEZEN VIA BESCHIKBARE TOEGANG**.
- Stagingisolatie status: **NIET BEWEZEN / BLOCKING VOOR WRITES EN A6/A7-MUTATIETESTS**.
- Dubbele proxy/authroute gewijzigd: **NEE**; blocker blijft bestaan voor A5/A7.
- Backend/API-contract/datamodel gewijzigd: **NEE**.
- Service worker/offlinecache toegevoegd: **NEE**.
- CE-report print/PDF-styles gewijzigd: **NEE**.
- Secrets toegevoegd: **NEE**.

## Acties die eigenaar nu moet uitvoeren — uitsluitend read-only
1. Open de Cloudflare Pages Preview Deployment van branch `feat/apple-ios-ipados-pwa-readiness` in het bestaande app-project en meld: Preview URL, buildstatus groen/rood, `Access actief: JA/NEE` en API-targetklasse `productie`, `staging` of `niet bewezen`.
2. Bij ontbrekend Pages-buildbewijs: voer lokaal op exact deze branch uit: `npm run typecheck`, `npm run lint:ci`, `npm run build:pages`; deel per opdracht PASS/FAIL en bij fout alleen de fouttekst.
3. iPhone portrait: open uitsluitend read-only Login, Dashboard/Projecten en een pagina met een tabel of tabs; controleer knoppen/iconbuttons/tabbar en dat er geen horizontale paginascroll is.
4. iPhone portrait: open het notification center en een modal; controleer dat sluiten en overige bediening ruim raakbaar blijven en niet achter de Home Indicator vallen.
5. iPhone keyboardtest: open in een bestaand formulier/modal uitsluitend een input zodat het toetsenbord zichtbaar wordt; **niet opslaan**. Controleer dat modalheader/sluitknop/input en onderste actieknoppen zichtbaar blijven of bereikbaar zijn via interne modalscroll.
6. iPhone landscape: controleer modal, drawer, tabbar, een tabrij en een tabel; notchruimte links/rechts moet vrij blijven en er mag geen horizontale paginascroll ontstaan.
7. iPad portrait/landscape indien beschikbaar: open read-only Dashboard/Projecten, Instellingen, Billing en Superadmin/Control Center alleen indien bevoegd, plus modal/notification center; niets opslaan of wijzigen.
8. Deel uitsluitend foutschermen/schermafbeeldingen wanneer een overlap, clipping, touchprobleem, keyboardblokkade of paginaoverflow zichtbaar is.

## Open risico's/blockers
| ID | Risico / blocker | Vervolg |
|---|---|---|
| A3-01 | Buildstatus, Preview URL en eerdere safe-area devicecontrole ontbreken nog | Combineer A3-verificatie met bovenstaande A4 read-only devicecontrole. |
| A4-01 | `typecheck`, `lint:ci`, `build:pages` niet aantoonbaar groen | Eigenaar retourneert Pages-buildstatus/log of lokale branchrun. |
| A4-02 | Echte iPhone/iPad touch-/landscape-/keyboardcontrole ontbreekt | Eigenaar voert bovenstaande read-only acceptatietest uit. |
| A5-01 | Access/API-target/stagingketen niet bewezen | Geen writes/uploads vóór A5 groen is. |
| A5-02 | Dubbele API proxy/authroute blijft bestaan | In A5/A7 bewijzen of harmoniseren vóór auth-/write-tests. |
| A7-01 | Bestaande CE/inspectie/Superadmin-risico's | In A7 gericht afhandelen vóór PR/merge. |

## Volgende chat moet eerst lezen
1. Masterpromptbestand `WeldInspect-Pro-Apple-PWA-App-Store-Masterprompt-Meer-Chat-Bouwfasen-Checklist-2026-05-23.txt`.
2. `docs/apple-distribution/MASTER-CHECKLIST.md` op branch `feat/apple-ios-ipados-pwa-readiness`.
3. Dit bestand, `docs/apple-distribution/HANDOFF-LATEST.md`.
4. `docs/apple-distribution/DECISIONS.md` en `docs/apple-distribution/TEST-EVIDENCE.md`.
5. `src/styles/apple-safe-area.css`, `src/styles/apple-touch-interaction.css`, `src/main.tsx`, `src/components/overlays/Modal.tsx`.
6. Door eigenaar teruggeleverd Preview/build/device/keyboardbewijs.

## Exacte herstartopdracht voor afronding A4
“Lees het masterpromptbestand, `docs/apple-distribution/MASTER-CHECKLIST.md`, `docs/apple-distribution/HANDOFF-LATEST.md`, `docs/apple-distribution/DECISIONS.md` en `docs/apple-distribution/TEST-EVIDENCE.md` volledig in. Ik heb de gevraagde Cloudflare Pages-build-/Preview-/Access-/API-target- en iPhone/iPad touch-/keyboard-/modalbewijzen voor Chat A4 toegevoegd. Controleer uitsluitend of de A4-gate daarmee groen is op branch `feat/apple-ios-ipados-pwa-readiness`. Gebruik preview uitsluitend read-only zolang staging niet aantoonbaar is; voer geen saves, uploads, authmutatietests, Billing-/Mollie-/Superadminmutaties of proxy/backendwijzigingen uit. Werk uitsluitend A4-testbewijs/checklist/handoff bij, commit/push en lever alleen wanneer A4 aantoonbaar groen is de startopdracht voor Chat A5. Stop veilig vóór 70% context.”

## Startopdracht A5 — nog niet vrijgegeven
A5 mag pas als uitvoeropdracht worden gebruikt nadat A4-build-/device-/keyboardacceptatie aantoonbaar groen is verklaard. A5 moet vervolgens uitsluitend de stagingisolatie en Preview→staging-bewijsketen behandelen vóór welke schrijf- of uploadtest dan ook.
