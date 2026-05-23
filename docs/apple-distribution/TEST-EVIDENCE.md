# WeldInspect Pro — Apple Distribution Test Evidence

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatst uitgevoerde fase: Chat A3 — Safe area en app-shell
- Repository: `CoenWessselink/nen-1090-app`
- Branch: `feat/apple-ios-ipados-pwa-readiness`
- Baseline `main` SHA: `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Datum: 2026-05-23 (Europe/Amsterdam)
- Veiligheidsstatus: geen productiedatawrites; preview uitsluitend read-only zolang staging/API-target/authroute niet bewezen zijn.

## Uitvoerbeperking
De repository is via gekoppelde GitHub-toegang gelezen en bijgewerkt. Een actuele lokale clone/buildpoging voor A3 faalde doordat `github.com` vanuit de uitvoercontainer niet via DNS bereikbaar is. GitHub stelde geen zichtbare workflowrun/statuscheck beschikbaar op de bekeken branchhead. Daarom worden `npm run typecheck`, `npm run lint:ci`, `npm run build:pages` en runtime viewporttests niet ten onrechte als uitgevoerd verklaard; bewijs moet via het Cloudflare Pages-buildlog of een eigenaar-run worden teruggeleverd.

## Faseoverzicht
| Fase | Resultaat | Samenvatting |
|---|---|---|
| A0 | PASS | Veilige featurebranch/documentatieset/baseline; geen productie-effect. |
| A1 | PASS | Audit afgerond; geen bestaande PWA-stack; dubbele proxy/authroute en stagingvereisten vastgelegd. |
| A2 | OWNER GREEN FOR READ-ONLY CONTINUATION | Branded PWA metadata/icons/manifest code staat op branch; eigenaar gaf op 2026-05-23 “Groen ga verder”. Cloudflare/API-target/stagingbewijs blijft verplicht vóór writes. |
| A3 | IMPLEMENTATIE GEREED / DEVICE- EN BUILDACCEPTATIE OPEN | Centrale screen-only safe-area laag gebouwd; runtime/devicebewijs vereist vóór A4-gate. |

## A2 — Vastgelegd bewijs
| ID | Controle | Resultaat | Conclusie |
|---|---|---|---|
| A2-E01 | Eén manifest-/icon-/metadatalayer | PASS | Geen serviceworker, Workbox of offlinecache toegevoegd. |
| A2-E02 | Apple/PWA metadata in `index.html` | PASS | `viewport-fit=cover`, appnaam, standalone metadata, manifest- en touch-iconlink aanwezig. |
| A2-E03 | Branded assetset | PASS | SVG en PNG-assets voor 180×180, 192×192, 512×512 en maskable 512×512 toegevoegd; PNG-afmetingen statisch gevalideerd. |
| A2-E04 | Veilige cachepolicy | PASS | Manifest `no-cache`; iconen beperkt hercontroleerbaar; geen gevoelige offlinecache. |
| A2-E05 | Productieveiligheid | PASS | Geen writes/uploads/Billing-/Superadminmutaties uitgevoerd. |
| A2-E06 | Preview/build/API-target/devicebewijs | OPEN | Eigenaar liet doorgaan naar uitsluitend niet-schrijvende A3; evidence blijft open vóór writefasen en uiteindelijke review. |

## A3 — Implementatiebewijs
| ID | Controle | Bestanden / bron | Resultaat | Bevinding / vervolg |
|---|---|---|---|---|
| A3-E01 | Scope en productiebeveiliging | Masterprompt, checklist, handoff, eigenaarbericht “Groen ga verder” | PASS | A3 uitgevoerd als niet-schrijvende layoutfase; API/proxy/dataflow niet gewijzigd. |
| A3-E02 | Bestaande shell-/overlayarchitectuur | `AppShell.tsx`, `Topbar.tsx`, `Sidebar.tsx`, `MobileTabbar.tsx`, `NotificationCenter.tsx`, `Modal.tsx`, `runtime-mobile-hotfix.css` | PASS | Centrale single-scrollcanvas, portaloverlay en fixed mobiele tabbar zijn correcte veilige integratiepunten. |
| A3-E03 | Late CSS-overridecontrole | `src/main.tsx`, `premium-mobile-theme.css`, `runtime-mobile-hotfix.css` | PASS met concrete fix | Premium themelaag wordt na runtime-hotfix geladen en overschrijft mobiele canvaspadding; safe-area regels zijn daarom in nieuwe laatste stylesheet geplaatst. |
| A3-E04 | Centrale Apple safe-area laag | `src/styles/apple-safe-area.css` | PASS statisch | Variabelen voor `safe-area-inset-*`; bescherming voor topbar, sidebar, page canvas, overlays/modal, notification center, toastviewport en mobile tabbar. |
| A3-E05 | Desktop/landscape spacingmethode | `apple-safe-area.css` | PASS statisch | Zijkanten gebruiken `max(bestaande marge, inset)` in plaats van optellen; voorkomt te brede landscape spacing. |
| A3-E06 | Browserfallback | `apple-safe-area.css` | PASS statisch | Regels zijn beperkt tot `@supports env(...) and max(...)`; bestaande layout blijft fallback. |
| A3-E07 | CE-report/PDF no-regression ontwerp | `apple-safe-area.css`, `src/main.tsx` | PASS statisch | Nieuwe laag is `@media screen`; geen print/PDF- of CE-layoutselectoren aangepast. Runtime printvalidatie blijft later vereist. |
| A3-E08 | Importcascade | `src/main.tsx` | PASS statisch | `apple-safe-area.css` wordt na premium- en CE-printstyles geïmporteerd en is screen-only; bestaande mobiele theme overrides breken de insets niet meer. |
| A3-E09 | Finale branchdiff | GitHub compare met `main` | PASS | Einddiff A3 bevat alleen nieuwe `apple-safe-area.css` en import in `src/main.tsx`; tijdelijke runtimefilewijziging is in finale diff afwezig. |
| A3-E10 | Lokale typecheck/lint/build | Container clone/build | BLOCKED | `git clone` faalde met `Could not resolve host: github.com`; geen vals groen resultaat geregistreerd. |
| A3-E11 | Viewport/device matrix | Preview/echt device | OPEN | Nog uit te voeren: 375×667, 393×852, 852×393, 768×1024, 1024×768 en desktop; echte iPhone/iPad portrait/landscape vereist. |

## A3 gewijzigde bestanden en commits
| Bestand | Doel | Relevante commit(s) |
|---|---|---|
| `src/styles/apple-safe-area.css` | Laatste, screen-only safe-area protection layer | `342b22f6267f30e263c78825137875b0040e086a`, `7e2d34d13b80ddddf9b3fe5b891f992760a9dcc6`, `4c657f2dc4f86c90e74841b334c4e694f826b27c` |
| `src/main.tsx` | Laad safe-area CSS als laatste visuele laag | `d4ed19d45c0fbd4bf5163137f9fb545ad6ec5276` |
| `src/styles/runtime-mobile-hotfix.css` | Tijdelijke aanpak geëvalueerd en volledig teruggedraaid nadat late theme override gevonden was | `0baf968d5268bc6b667a44c5a39992f81cb828b9`, `39486b16a8fbe265475d07fa52dd162eb6151115`; finale diff versus `main`: geen wijziging |
| `docs/apple-distribution/DECISIONS.md` | A3-architectuurbesluiten en blijvende blockers | `e039a91312017a62b809e71ec61414676ab82d83` |

## Benodigd acceptatiebewijs voor A3
| Controle | Handmatige actie | Gevraagde terugmelding |
|---|---|---|
| Pages build | Open de branch Preview Deployment of voer lokaal `npm run typecheck`, `npm run lint:ci`, `npm run build:pages` uit. | PASS/FAIL per controle; bij FAIL uitsluitend foutmelding. |
| iPhone portrait | Open preview read-only in portrait; controleer bovenbalk/Dynamic Island, onderste tabbar en modal. | Geen overlap/afsnijding/horizontale scroll: JA/NEE + screenshot bij afwijking. |
| iPhone landscape | Draai naar landscape; controleer linker/rechter notchruimte, tabbar en modal. | Ruimte correct zonder overdreven inspringing: JA/NEE. |
| iPad portrait/landscape | Open menu, meldingen en een uitsluitend read-only scherm; geen save/upload. | Geen clipping/overflow: JA/NEE. |
| CE-report visueel read-only | Open bestaande CE-reportweergave zonder mutatie; print/PDF pas in latere testgate formeel controleren. | Geen visuele schermregressie: JA/NEE. |

## Gatebesluit A3
- Code/scope: **GEREED OP FEATUREBRANCH**.
- Veilige architectuur/cascadecontrole: **PASS STATISCH**.
- Productieveiligheid: **PASS — GEEN WRITES, GEEN PROXY-/APIWIJZIGING**.
- Build/typecheck/lint: **NIET AANTOONBAAR GROEN DOOR TOEGANGS-/DNSBEPERKING**.
- Preview/device/viewports: **OPEN — EIGENAAR-/CLOUDFLAREBEWIJS NODIG**.
- Start A4: **WACHT OP A3 ACCEPTATIEBEWIJS OF EXPLICIETE EIGENAARBESLISSING OM UITSLUITEND NIET-SCHRIJVENDE A4-CODE VOORT TE ZETTEN**.
