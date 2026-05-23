# WeldInspect Pro — Apple Distribution Test Evidence

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatst uitgevoerde fase: Chat A4 — Touch / keyboard / modals
- Repository: `CoenWessselink/nen-1090-app`
- Branch: `feat/apple-ios-ipados-pwa-readiness`
- Baseline `main` SHA: `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Datum: 2026-05-23 (Europe/Amsterdam)
- Veiligheidsstatus: geen productiedatawrites; preview uitsluitend read-only zolang staging/API-target/authroute niet bewezen zijn.

## Uitvoerbeperking
De repository is via gekoppelde GitHub-toegang gelezen en bijgewerkt. Een actuele lokale clone/buildpoging voor A4 faalde doordat `github.com` vanuit de uitvoercontainer niet via DNS bereikbaar is (`Could not resolve host: github.com`). Voor de nieuwe A4-commits waren via GitHub geen Actions workflow-runs of statuschecks zichtbaar. Daarom worden `npm run typecheck`, `npm run lint:ci`, `npm run build:pages` en runtime viewporttests niet ten onrechte als uitgevoerd verklaard; bewijs moet via Cloudflare Pages-buildlog of een eigenaar-run worden teruggeleverd.

## Faseoverzicht
| Fase | Resultaat | Samenvatting |
|---|---|---|
| A0 | PASS | Veilige featurebranch/documentatieset/baseline; geen productie-effect. |
| A1 | PASS | Audit afgerond; geen bestaande PWA-stack; dubbele proxy/authroute en stagingvereisten vastgelegd. |
| A2 | OWNER GREEN FOR READ-ONLY CONTINUATION | Branded PWA metadata/icons/manifest code staat op branch; eigenaar gaf op 2026-05-23 “Groen ga verder”. Cloudflare/API-target/stagingbewijs blijft verplicht vóór writes. |
| A3 | IMPLEMENTATIE GEREED / DEVICE- EN BUILDACCEPTATIE OPEN | Centrale screen-only safe-area laag gebouwd; runtime/devicebewijs blijft open. |
| A4 | IMPLEMENTATIE GEREED / ACCEPTATIEBEWIJS OPEN | Eigenaar gaf expliciet akkoord voor uitsluitend niet-schrijvende A4-hardeningscode; touch-, input-, responsive overflow- en modal/keyboardhardening staat op branch. |

## A2 — Vastgelegd bewijs
| ID | Controle | Resultaat | Conclusie |
|---|---|---|---|
| A2-E01 | Eén manifest-/icon-/metadatalayer | PASS | Geen serviceworker, Workbox of offlinecache toegevoegd. |
| A2-E02 | Apple/PWA metadata in `index.html` | PASS | `viewport-fit=cover`, appnaam, standalone metadata, manifest- en touch-iconlink aanwezig. |
| A2-E03 | Branded assetset | PASS | SVG en PNG-assets voor 180×180, 192×192, 512×512 en maskable 512×512 toegevoegd; PNG-afmetingen statisch gevalideerd. |
| A2-E04 | Veilige cachepolicy | PASS | Manifest `no-cache`; iconen beperkt hercontroleerbaar; geen gevoelige offlinecache. |
| A2-E05 | Productieveiligheid | PASS | Geen writes/uploads/Billing-/Superadminmutaties uitgevoerd. |
| A2-E06 | Preview/build/API-target/devicebewijs | OPEN | Evidence blijft open vóór writefasen en uiteindelijke review. |

## A3 — Implementatiebewijs
| ID | Controle | Bestanden / bron | Resultaat | Bevinding / vervolg |
|---|---|---|---|---|
| A3-E01 | Scope en productiebeveiliging | Masterprompt, checklist, handoff, eigenaarbericht “Groen ga verder” | PASS | A3 uitgevoerd als niet-schrijvende layoutfase; API/proxy/dataflow niet gewijzigd. |
| A3-E02 | Bestaande shell-/overlayarchitectuur | `AppShell.tsx`, `Topbar.tsx`, `Sidebar.tsx`, `MobileTabbar.tsx`, `NotificationCenter.tsx`, `Modal.tsx`, `runtime-mobile-hotfix.css` | PASS | Centrale single-scrollcanvas, portaloverlay en fixed mobiele tabbar zijn correcte veilige integratiepunten. |
| A3-E03 | Late CSS-overridecontrole | `src/main.tsx`, `premium-mobile-theme.css`, `runtime-mobile-hotfix.css` | PASS met concrete fix | Premium themelaag wordt na runtime-hotfix geladen en overschrijft mobiele canvaspadding; safe-area regels zijn daarom in nieuwe laatste stylesheet geplaatst. |
| A3-E04 | Centrale Apple safe-area laag | `src/styles/apple-safe-area.css` | PASS statisch | Variabelen voor `safe-area-inset-*`; bescherming voor topbar, sidebar, page canvas, overlays/modal, notification center, toastviewport en mobile tabbar. |
| A3-E05 | CE-report/PDF no-regression ontwerp | `apple-safe-area.css`, `src/main.tsx` | PASS statisch | Nieuwe laag is `@media screen`; geen print/PDF- of CE-layoutselectoren aangepast. Runtime printvalidatie blijft later vereist. |
| A3-E06 | Lokale typecheck/lint/build en device matrix | Container/Preview/echt device | OPEN/BLOCKED | DNS-/Preview-/devicebewijs ontbreekt; geen vals groen resultaat geregistreerd. |

## A4 — Implementatiebewijs
| ID | Controle | Bestanden / bron | Resultaat | Bevinding / vervolg |
|---|---|---|---|---|
| A4-E01 | Scopebesluit en veiligheidsregels | Startopdracht eigenaar, masterprompt, A3 handoff | PASS | A4 mag niet-schrijvend worden gebouwd ondanks open A3-bewijs; writes/proxy/authmutatie/merge blijven uitgesloten. |
| A4-E02 | Bestaande interactieve implementatie geïnspecteerd | `premium-mobile-theme.css`, `runtime-mobile-hotfix.css`, `Modal.tsx`, `Topbar.tsx`, `Sidebar.tsx`, `MobileTabbar.tsx`, `NotificationCenter.tsx`, `LoginPage.tsx`, `routes.tsx` | PASS | Concrete hiaten vastgesteld: 40px icon buttons, geen centrale 16px iOS inputregel, mobiele tabel/tabs/dropdown overflow niet finaal afgedekt, modal drag actief voor touch en geen VisualViewport keyboardhoogte. |
| A4-E03 | Laatste CSS-cascade voor interactie | `src/styles/apple-touch-interaction.css`, `src/main.tsx` | PASS statisch | Nieuwe screen-only laag wordt na `apple-safe-area.css` geladen en is begrensd tot max-width 1024px/coarse pointer; desktopdensity en printlayout worden niet gewijzigd. |
| A4-E04 | Touch targets | `apple-touch-interaction.css` | PASS statisch | Buttons, iconbuttons, tabbaritems, drawerlinks, tabbuttons, rij-/stackactie-links en role-buttons krijgen minimaal 44px in touchcontext; notification items minimaal 56px. |
| A4-E05 | Invoer en Safari zoompreventie | `apple-touch-interaction.css` | PASS statisch | Input/select/textarea/form triggers krijgen minimaal 16px tekst en 44px hoogte plus scroll margins voor focuszichtbaarheid. |
| A4-E06 | Tabs, dropdowns en tabellen | `apple-touch-interaction.css` | PASS statisch | Tabs worden touch-scrollbaar zonder wrap; `.table-shell` krijgt gecontroleerde horizontale pan/scroll; dropdown/listbox/menu krijgt viewportgebonden maximale maat en scroll. |
| A4-E07 | Modal keyboard en touchgedrag | `Modal.tsx`, `apple-touch-interaction.css` | PASS statisch | Portalmodal volgt `window.visualViewport` hoogte/offset; overlay/panel gebruiken beschikbare keyboardviewport; acties kunnen sticky boven bottom safe area blijven; drag wordt alleen met muis op desktop gestart; Escape sluiten toegevoegd. |
| A4-E08 | Landscape | `apple-touch-interaction.css`, `apple-safe-area.css` | PASS statisch | Compacte iPhone-landscape modal/header/body/tabbarregels combineren met bestaande linker/rechter safe-area bescherming. |
| A4-E09 | Kritieke interfaces in scope | `LoginPage.tsx`, route-/shell-/modalcomponenten | PASS codegericht / runtime OPEN | Generieke input/touch/modal/tabelregels dekken Login, Dashboard/Projecten, Lascontrole/inspecties, Instellingen, Billing, Superadmin en overlays; read-only runtimecontrole blijft nodig. |
| A4-E10 | Productieveiligheid | Gehele A4-uitvoering | PASS | Geen writes, uploads, Billing-/Mollie-/Superadminmutaties, authmutatietests, proxywijzigingen, backendwijzigingen of merge uitgevoerd. |
| A4-E11 | `npm run typecheck` | Container/CI | BLOCKED | Lokale clone faalde door DNS naar GitHub; geen GitHub Actions/statuscheck zichtbaar. |
| A4-E12 | `npm run lint:ci` | Container/CI | BLOCKED | Lokale clone faalde door DNS naar GitHub; geen GitHub Actions/statuscheck zichtbaar. |
| A4-E13 | `npm run build:pages` | Container/Cloudflare | BLOCKED | Lokale clone faalde door DNS; Cloudflare Pages buildstatus/Preview URL niet via beschikbare toegang bewezen. |
| A4-E14 | Viewport/device/keyboard matrix | Preview/echt device | OPEN | Nog uit te voeren: 375×667, 393×852, 852×393, 768×1024, 1024×768, desktop; iPhone/iPad met modal/notification center en zichtbaar keyboard. |

## A4 gewijzigde bestanden en codecommits
| Bestand | Doel | Relevante commit(s) |
|---|---|---|
| `src/styles/apple-touch-interaction.css` | Late touch-/keyboard-/overflow-/landscapehardeninglaag | `1516071051c39360c606ea9e930973e6a40e3e7e`, `908be349ed37d98801e3406d92cbbffb05f8d6ae` |
| `src/main.tsx` | Laadt A4-laag na A3 safe-area CSS | `77a49c1cccd091a097fa42524affbbb95a9765e0` |
| `src/components/overlays/Modal.tsx` | VisualViewport keyboard containment, mouse-only drag en Escape sluiten | `0635bb7b97afc2cc92b0c1dcb0a5c51a863fa3c7` |

## Benodigd acceptatiebewijs voor A4
| Controle | Handmatige actie | Gevraagde terugmelding |
|---|---|---|
| Pages build / lokale scripts | Open branch Preview Deployment of voer lokaal op deze branch `npm run typecheck`, `npm run lint:ci`, `npm run build:pages` uit. | PASS/FAIL per controle; bij FAIL fouttekst. |
| Previewveiligheid | Meld Preview URL, Cloudflare Access status en API-targetklasse. | URL; `Access actief: JA/NEE`; target `productie`, `staging` of `niet bewezen`. |
| iPhone portrait | Open uitsluitend read-only Login en appschermen; open notification center en een modal; raak primaire/icon/tabbaracties aan zonder save. | Geen overlap/clipping; touchtargets bruikbaar; geen horizontale paginascroll: JA/NEE. |
| iPhone landscape | Draai naar landscape; controleer modal, drawer, tabbar, horizontaal scrollbare tabs/tabel. | Notch links/rechts vrij; acties bereikbaar; geen paginaoverflow: JA/NEE. |
| Keyboardformulier | In een bestaand modalformulier tik uitsluitend in een input zodat keyboard opent; NIET opslaan. | Header/sluiten/input/onderste acties zichtbaar of via modal scroll bereikbaar boven keyboard/Home Indicator: JA/NEE. |
| iPad portrait/landscape | Open read-only Dashboard/Projecten, Instellingen, Billing of Superadmin indien bevoegd, plus modal/notification center. | Geen clipping/overflow; touchbediening bruikbaar: JA/NEE. |

## Gatebesluit A4
- Code/scope: **GEREED OP FEATUREBRANCH**.
- Statische interactie-/veiligheidscontrole: **PASS**.
- Productieveiligheid: **PASS — GEEN WRITES, GEEN PROXY-/API-/BACKENDWIJZIGING, GEEN MERGE**.
- Build/typecheck/lint: **NIET AANTOONBAAR GROEN DOOR DNS-/CI-/CLOUDFLAREBEWIJSBEPERKING**.
- Preview/device/viewports/keyboard: **OPEN — EIGENAAR-/CLOUDFLAREBEWIJS NODIG**.
- Start A5: **NIET VRIJGEGEVEN ZONDER VOLDOENDE A4-ACCEPTATIEBEWIJS**.
