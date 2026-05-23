# WeldInspect Pro — Apple Distribution Handoff Latest

## Handoffgegevens
- Datum/tijd: 2026-05-23 CEST (Europe/Amsterdam)
- Uitgevoerde chatfase: Chat A3 — Safe area en app-shell
- Actief traject: Traject A — Apple-safe Webapp/PWA
- Repository: `CoenWessselink/nen-1090-app`
- Actieve branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit vanaf `main`: `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Laatste functionele A3-commits:
  - `342b22f6267f30e263c78825137875b0040e086a` — nieuwe safe-area stylesheet.
  - `7e2d34d13b80ddddf9b3fe5b891f992760a9dcc6` — safe-area laag screen-only gemaakt.
  - `4c657f2dc4f86c90e74841b334c4e694f826b27c` — feature detection voor `env()` en `max()`.
  - `d4ed19d45c0fbd4bf5163137f9fb545ad6ec5276` — laatste importlaag in `src/main.tsx`.
- Tijdelijke, teruggedraaide analysecommits: `0baf968d5268bc6b667a44c5a39992f81cb828b9`, `39486b16a8fbe265475d07fa52dd162eb6151115`; finale diff versus `main` bevat geen wijziging in `runtime-mobile-hotfix.css`.
- Documentatiecommits vóór deze handoff: `e039a91312017a62b809e71ec61414676ab82d83`, `42803640ffca983ec52b24b3b237d7ea6dd8d5dd`, `b928ba2380a039bc3a83ef36179b26f5a9d431db`.
- PR-link: Geen; niet gemerged.
- Preview-link: Niet uitleesbaar via beschikbare toegang.
- Status: **A3 CODE GEREED / BUILD- EN DEVICEACCEPTATIE OPEN / PREVIEW READ-ONLY**.
- Contextgrensstatus: Veilige overdracht vóór 70%; A4 is niet gestart.

## Wat in deze chat werkelijk is uitgevoerd
- De eigenaarbevestiging **“Groen ga verder”** is vastgelegd als toestemming om uitsluitend de niet-schrijvende A3-layoutfase te bouwen. Alle A1/A2-beveiligingsblockers voor writes blijven actief.
- A2-documentatie, A1-blockers en shellcomponenten opnieuw gecontroleerd: `AppShell`, `Topbar`, `Sidebar`, `MobileTabbar`, `NotificationCenter`, portalmodal en single-scroll runtime styles.
- Officiële WebKit safe-area aanpak toegepast op basis van de al in A2 toegevoegde `viewport-fit=cover` metadata.
- Eerst is gecontroleerd of de bestaande centrale runtime stylesheet geschikt was; daarna is feitelijk vastgesteld dat een later geladen premium mobiele themalaag mobiele `.page-canvas`-padding overschrijft.
- Om de cascade betrouwbaar en terugdraaibaar te houden is de uiteindelijke implementatie ondergebracht in een nieuwe laatste stylesheet `src/styles/apple-safe-area.css`, geladen na de bestaande visual/print layers via `src/main.tsx`.
- De nieuwe laag beschermt topbar, sidebar, centrale scrollcanvas, viewport overlays/modalpanelen, notification center, toastviewport en mobiele tabbar tegen notch, Dynamic Island en Home Indicator overlap.
- De safe-area laag is uitsluitend `@media screen`, waardoor zij geen CE-report print/PDF-layout wijzigt.
- Geen componentbusinesslogica, API-routes, proxyconfiguratie, authflow, uploads of productiedata zijn gewijzigd of getest.

## Gewijzigde bestanden
| Bestand | Reden |
|---|---|
| `src/styles/apple-safe-area.css` | Nieuwe finale, screen-only safe-area laag voor iPhone/iPad shell, navigatie en overlays. |
| `src/main.tsx` | Importeert `apple-safe-area.css` als laatste visual stylesheet om bestaande late theme overrides gecontroleerd te overrulen. |
| `docs/apple-distribution/DECISIONS.md` | Eigenaarbesluit voor read-only A3 en safe-area architectuurbesluiten vastgelegd. |
| `docs/apple-distribution/TEST-EVIDENCE.md` | A3 statisch bewijs, cascadebevinding en open acceptatietests vastgelegd. |
| `docs/apple-distribution/MASTER-CHECKLIST.md` | A3-status, gates en blijvende productieveiligheidsblockers bijgewerkt. |
| `docs/apple-distribution/HANDOFF-LATEST.md` | Deze veilige overdracht. |

## Uitgevoerde tests en resultaat
| Test | Omgeving/device | Resultaat | Bewijs/vervolg |
|---|---|---|---|
| A2-eigenaarbesluit interpreteren voor A3 | Chat + branchdocumentatie | PASS | Alleen read-only layoutbouw uitgevoerd; writes blijven geblokkeerd. |
| Shell/overlayintegratiepunten inspecteren | GitHub branchcode | PASS | Single-scrollcanvas, portalmodal, fixed tabbar en overlaylaag bevestigd. |
| CSS-cascadecontrole | `src/main.tsx`, runtime/premium styles | PASS met noodzakelijke fix | Late premium theme overschrijft runtimepadding; oplossing bewust als laatste stylesheet geladen. |
| Safe-area methodiek | `apple-safe-area.css` + officiële WebKit-richtlijn | PASS statisch | `env(safe-area-inset-*)`, `max()` en feature detection toegepast. |
| Print/PDF bescherming | `apple-safe-area.css` scope | PASS statisch | Nieuwe regels vallen uitsluitend binnen `@media screen`; geen CE-printbestand gewijzigd. |
| Finale diffcontrole | Branch versus `main` | PASS | Finale A3 diff bevat `apple-safe-area.css` en import; geen finale wijziging aan `runtime-mobile-hotfix.css`. |
| Productieveiligheid | Gehele A3-uitvoering | PASS | Geen writes/uploads/Billing-/Superadminmutaties of API-/proxywijziging uitgevoerd. |
| Lokale typecheck/lint/build | Container | BLOCKED | Clone faalt door `Could not resolve host: github.com`; geen vals groen vastgelegd. |
| Cloudflare Preview/buildstatus/API-target | Beschikbare toegang | BLOCKED | Pages-dashboardstatus niet feitelijk uitleesbaar. |
| Device-/viewportmatrix | Preview/echt device | OPEN | Echte iPhone/iPad- en viewporttests vereist vóór A4-gate. |

## Productieveiligheid
- Writes tegen productie uitgevoerd: **NEE**.
- Writes/uploads/authmutatietests via preview uitgevoerd: **NEE**.
- Preview API-target: **NIET BEWEZEN**; repositorybaseline wijst naar productie-Azure.
- Stagingisolatie status: **NIET BEWEZEN / BLOCKING VOOR WRITES**.
- Dubbele proxy/authroute gewijzigd: **NEE**; blocker blijft bestaan voor A5/A7.
- Service worker/offlinecache toegevoegd: **NEE**.
- CE-report print/PDF-styles gewijzigd: **NEE**.
- Secrets toegevoegd: **NEE**.

## Acties die eigenaar nu moet uitvoeren
1. Open de Cloudflare Pages Preview Deployment van branch `feat/apple-ios-ipados-pwa-readiness` in het bestaande app-project en meld de Preview URL plus groene/rode buildstatus.
2. Controleer dat de preview met Cloudflare Access is afgeschermd wanneer bedrijfsdata zichtbaar kan zijn; meld alleen `Access actief: JA/NEE`.
3. Meld alleen of de preview-API naar `productie` of `staging` wijst. Zolang dit niet aantoonbaar staging is: uitsluitend bekijken, niets opslaan/uploaden.
4. Open de preview read-only op iPhone in portrait én landscape: controleer topbar onder notch/Dynamic Island, onderste tabbar boven Home Indicator, menu/drawer en een modal of meldingenpaneel; meld overlap/afsnijding/horizontale scroll met screenshot bij fout.
5. Test bij beschikbaarheid ook iPad portrait en landscape; controleer menu, canvas en modals zonder saves/uploads.
6. Lever buildbewijs uit Pages of voer lokaal op deze branch uit: `npm run typecheck`, `npm run lint:ci`, `npm run build:pages`.

## Open risico's/blockers
| ID | Risico / blocker | Vervolg |
|---|---|---|
| A3-01 | Buildstatus en Preview URL ontbreken | Eigenaar retourneert Pages buildstatus/URL of lokale builduitkomst. |
| A3-02 | iPhone/iPad portrait-/landscape safe-area bewijs ontbreekt | Eigenaar voert read-only devicecontrole uit. |
| A5-01 | Access/API-target/stagingketen niet bewezen | Geen writes/uploads vóór A5 groen is. |
| A5-02 | Dubbele API proxy/authroute blijft bestaan | In A5/A7 bewijzen of harmoniseren vóór auth-/write-tests. |
| A7-01 | Bestaande CE/inspectie/Superadmin risico's | In A7 gericht afhandelen vóór PR/merge. |

## Volgende chat moet eerst lezen
1. Masterpromptbestand `WeldInspect-Pro-Apple-PWA-App-Store-Masterprompt-Meer-Chat-Bouwfasen-Checklist-2026-05-23.txt`.
2. `docs/apple-distribution/MASTER-CHECKLIST.md` op branch `feat/apple-ios-ipados-pwa-readiness`.
3. Dit bestand, `docs/apple-distribution/HANDOFF-LATEST.md`.
4. `docs/apple-distribution/DECISIONS.md` en `docs/apple-distribution/TEST-EVIDENCE.md`.
5. `src/styles/apple-safe-area.css`, `src/main.tsx`, en door eigenaar aangeleverd Preview/build/devicebewijs.

## Exacte herstartopdracht voor afronding A3
“Lees masterprompt, `docs/apple-distribution/MASTER-CHECKLIST.md` en `docs/apple-distribution/HANDOFF-LATEST.md` volledig in. Ik heb de gevraagde Cloudflare Pages-build-/Preview-/Access-/API-target- en iPhone/iPad safe-area bewijzen voor Chat A3 toegevoegd. Controleer uitsluitend of de A3-gate daarmee groen is op branch `feat/apple-ios-ipados-pwa-readiness`. Gebruik preview uitsluitend read-only zolang staging niet aantoonbaar is; wijzig of test geen productiedata. Werk uitsluitend A3-testbewijs/checklist/handoff bij, commit/push en lever alleen wanneer A3 aantoonbaar groen is de startopdracht voor Chat A4. Stop veilig vóór 70% context.”

## Startopdracht A4 — uitsluitend gebruiken nadat A3 groen is verklaard
“Lees masterprompt, checklist en handoff. Controleer A3. Voer uitsluitend Chat A4 uit op branch `feat/apple-ios-ipados-pwa-readiness`. Harden de bestaande app voor iPhone/iPad touch- en toetsenbordgebruik: touchtargets, inputs, keyboard/focus, modalscroll, acties boven safe-area, dropdowns/tabs/tabellen en landscape. Geen redesign. Test de interfaces van login, project/las/inspectie, instellingen, Billing en Superadmin zonder productiedata te wijzigen. Voer bestaande builds/tests uit, commit/push, werk checklist/handoff bij en lever duidelijke echte-device checks plus startprompt A5. Stop vóór 70% context.”
