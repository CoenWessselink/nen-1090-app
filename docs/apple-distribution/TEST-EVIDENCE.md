# WeldInspect Pro — Apple Distribution Test Evidence

## Documentstatus
- Masterpromptversie: 2026-05-23
- Laatst afgeronde fase: Chat A1 — Volledige audit en uitvoerscope
- Repository: `CoenWessselink/nen-1090-app`
- Branch: `feat/apple-ios-ipados-pwa-readiness`
- Baseline `main` SHA: `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Datum: 2026-05-23 (Europe/Amsterdam)

## Testbeleid A0/A1
A0 en A1 zijn volgens de SSOT veilige documentatie-/auditfasen. Daarom zijn geen featurewijzigingen, geen deployments, geen runtime logins, geen uploads en geen productiedatamutaties uitgevoerd. A1 is uitgevoerd via de gekoppelde GitHub-repositorytoegang; een lokale read-only clonepoging is mislukt doordat de container geen DNS/netwerktoegang tot GitHub heeft. Dit verhindert de GitHub-API-codeaudit niet, maar betekent dat builds/tests bewust pas worden uitgevoerd wanneer code in A2 of later wordt gewijzigd.

## A0 — Uitgevoerde bewijscontroles
| ID | Controle | Omgeving / bron | Resultaat | Bewijs / conclusie |
|---|---|---|---|---|
| A0-E01 | Repositorytoegang en permissie | GitHub repository `CoenWessselink/nen-1090-app` | PASS | Repository aanwezig; gekoppelde toegang heeft pushrechten. |
| A0-E02 | Gewenste branch vooraf afwezig | GitHub branch search vóór creatie | PASS | `feat/apple-ios-ipados-pwa-readiness` bestond niet vóór A0. |
| A0-E03 | Actuele `main` basis verifiëren | GitHub compare | PASS | `97ac4466fc7aa5ad88a01d8d4b1d193df147480b` was identiek aan `main`. |
| A0-E04 | Veilige branch aanmaken | GitHub branch write | PASS | Branch gemaakt vanaf geverifieerde `main` SHA. |
| A0-E05 | Scripts inventariseren | `package.json` | PASS | `build`, `build:pages`, `typecheck`, `lint:ci`, Playwright tests en `release:verify` aanwezig. |
| A0-E06 | Eerste PWA metadata baseline | `index.html`, `vite.config.ts`, standaardmanifestpaden | PASS met open auditpunt | Alleen standaardviewport/titel zichtbaar; geen PWA-plugin/standaardmanifest vastgesteld. |
| A0-E07 | Shell/modalbaseline | `AppShell.tsx`, `Modal.tsx`, `runtime-mobile-hotfix.css` | PASS met toekomstig verbeterpunt | Portalmodal en één-scrollarchitectuur vastgesteld; safe-area-inset niet vastgesteld. |
| A0-E08 | Kritieke routes | `routes.tsx` | PASS | CE-report, Billing, Superadmin, Control Center en Tenant 360 routes vastgesteld. |
| A0-E09 | API-/previewveiligheid | `env.ts`, `client.ts`, Pages proxy, `wrangler.toml` | PASS met blocking veiligheidsregel | Productie-Azure origin in configuratiebaseline; preview geen writes vóór A5. |
| A0-E10 | Productiewrites voorkomen | Volledige A0-uitvoering | PASS | Alleen documentatie op featurebranch geschreven. |

## A1 — Uitgevoerde auditcontroles
| ID | Controle | Bestanden / bron | Resultaat | Bevinding / impact |
|---|---|---|---|---|
| A1-E01 | A0-gate en handoff inlezen | `MASTER-CHECKLIST.md`, `HANDOFF-LATEST.md`, `DECISIONS.md`, `TEST-EVIDENCE.md` | PASS | A0 was groen; A1 mocht uitsluitend auditdocumentatie uitvoeren. |
| A1-E02 | Branchcodeauditmethode | GitHub file access; lokale `git clone` read-only geprobeerd | PASS met beperking | GitHub API-audit beschikbaar; lokale clone faalde door netwerk/DNS in container, dus geen lokale build in documentatie-only A1. |
| A1-E03 | Apple metadata/icon/manifest/service-worker zoekcontrole | `index.html`, `vite.config.ts`, `package.json`; repozoektermen `apple-touch-icon`, `manifest`, `serviceWorker`, `registerSW`, `workbox`, `vite-plugin-pwa` | PASS — ontbrekende implementatiescope bevestigd | Geen bestaande PWA-/Apple metadata-, manifest- of service-workerregistratie gevonden in gecontroleerde code; A2 moet één nieuwe veilige metadata/assetslaag bouwen. |
| A1-E04 | Shellcomponenten | `AppShell.tsx`, `Topbar.tsx`, `Sidebar.tsx`, `MobileTabbar.tsx`, `MobilePageScaffold.tsx` | PASS | Centrale shell- en mobiele header/tabbarintegratiepunten voor A3/A4 geïdentificeerd. |
| A1-E05 | CSS/modalarchitectuur | `global.css`, `runtime-mobile-hotfix.css`, `src/components/overlays/Modal.tsx`, re-export `src/components/modal/Modal.tsx` | PASS met regressierisico | Één portalmodal; CSS containment wordt voor overlays gecorrigeerd; geen safe-area-insets gevonden. A3 moet centrale safe-area-uitbreiding doen zonder printregressie. |
| A1-E06 | Projectdocumentupload | `MobileDocumentsPage.tsx`, `documents.ts`, `upload.ts` | PASS met stagingvereiste | Flow en validatie aangetroffen; `upload.ts` kan directe uploadorigin gebruiken via environmentconfig. A5 moet target bewijzen, A6 moet op staging testen. |
| A1-E07 | Masterdata- en logoupload | `CompanySettingsCard.tsx`, `settings.ts`, `MasterDataManager.tsx`, `entityDocuments.ts`, `masterdata-attachments.ts`, `welders.ts`, `weldCoordinatorAttachments.ts` | PASS met gesplitste flow | Logo, WPS, lasser- en coördinatordocumenten gebruiken afzonderlijke endpoints/modules; A6 vereist aparte testcase per route. |
| A1-E08 | CE-report route en databron | `routes.tsx`, `CeReportPrintPage.tsx`, `ceAggregateApi.ts` | PASS met blocking architectuurrisico | Route gebruikt CE aggregate endpoint, maar berekent frontend score/status/checklistpresentatie; vóór merge expliciet afhandelen conform backend-SSOT. |
| A1-E09 | Inspectiestatus SSOT | `WeldInspectionDetailPage.tsx` | PASS met blocking architectuurrisico | Pagina berekent frontend `overall` en verzendt status bij save; bestaande afwijking vastgelegd, niet gewijzigd in A1. |
| A1-E10 | Billing webfunctionaliteit | `BillingPage.tsx` | PASS met toekomstige iOS-gate | Actieve Mollie-checkout aanwezig; beschermd in Traject A, moet in iOS-build later worden gegated. |
| A1-E11 | Superadmin/cookie-authroute | `SuperadminControlCenter.tsx`, `auth-store.ts`, `superadminControlCenter.ts` | FAIL-RISK vastgelegd | `/superadmin` stelt handmatig Bearerheader samen met storetoken, terwijl store cookie-marker gebruikt; concreet `Invalid token`-risico voor A7. Control Center gebruikt centrale client maar bevat fallbackaggregatie. |
| A1-E12 | Pages release- en proxyconfiguratie | `scripts/prepare-release.mjs`, `public/_redirects`, `_headers`, `.env.example`, `wrangler.toml`, `functions/api/[[path]].js`, `functions/api/v1/[[path]].js` | FAIL-RISK vastgelegd | Twee Pages proxyhandlers met afwijkende authflow bestaan; `/api/v1` is standaard frontendtarget. Routeprioriteit/harmonisatie vereist vóór auth/write-tests. |
| A1-E13 | Cloudflare Preview feitelijke dashboardstatus | Officiële Cloudflare Pages documentatie + beschikbare repositorytoegang | BLOCKED voor dashboardbewijs | Officiële docs bevestigen branchpreview-URLs en dat previews standaard publiek zijn tenzij Access wordt ingeschakeld; concrete projectpreview/Access-status is zonder dashboardtoegang niet verifieerbaar. |
| A1-E14 | Azure stagingvereisten | Officiële Azure App Service Deployment Slots documentatie | PASS voor scope, BLOCKED voor daadwerkelijke configuratie | Officiële docs bevestigen aparte live hostnames en slot-specific settings; daadwerkelijke staging DB/storage/mail/billingstatus moet in A5 met toegang worden bewezen. |
| A1-E15 | Productieveiligheid tijdens A1 | Gehele A1-uitvoering | PASS | Uitsluitend read-only inspectie en documentatiecommits; geen productiewrites/deployments. |

## A1 — Officiële platformregels gecontroleerd
| Platform | Officiële bron gecontroleerd op 2026-05-23 | Relevante auditconclusie |
|---|---|---|
| Cloudflare Pages Preview Deployments | Cloudflare Docs: `https://developers.cloudflare.com/pages/configuration/preview-deployments/` | Preview deployments wijzigen productie/custom domains niet; preview-URL's zijn standaard publiek; Access policy kan previews afschermen. A2 moet URL en Access-status vastleggen. |
| Azure App Service Deployment Slots | Microsoft Learn: `https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots` | Slot heeft eigen hostname; slots zijn beschikbaar op ondersteunde plans; appsettings/connection strings/storage moeten als slot-specific worden behandeld waar isolatie nodig is. A5 moet de aparte keten bewijzen. |

## Geïdentificeerde bestandsscope voor implementatiefasen
| Fase | Gecontroleerde of waarschijnlijk aan te passen bestanden/configuratie | Doel |
|---|---|---|
| A2 | `index.html`, nieuwe publieke manifest/iconassets; mogelijk `_headers`/release-outputcontrole; Cloudflare Preview status | Apple PWA installability zonder brede offlinecache. |
| A3 | `runtime-mobile-hotfix.css`; zo nodig `global.css`, `AppShell.tsx`, layoutcomponenten, `MobilePageScaffold.tsx`, `Modal.tsx` | Safe areas en overlays centraal hardenen. |
| A4 | Shell-/form-/modalcomponenten plus betrokken mobiele/billing/superadmin interfaces | Touch/keyboard/landscape bruikbaarheid. |
| A5 | Cloudflare/Azure environment; `wrangler.toml`, proxyfiles en config alleen indien noodzakelijk | Geïsoleerde schrijftestketen plus authroutebewijs. |
| A6 | Projectdocument-, masterdataattachment- en bedrijfslogouploadbestanden | Uploads op Apple-apparaten uitsluitend staging. |
| A7 | CE-report/PDF, Billing, Superadmin, Control Center, auth/client/proxybestanden indien nodig | Kritieke regressies en SSOT-/authrisico's oplossen of expliciet gatebesluit. |
| A8 | Alle gewijzigde files plus tests/PR-documentatie | Finale matrix en Pull Request zonder merge. |

## Documentatiecommits tot en met A1
| Bestand | Reden | Bekende commit-SHA |
|---|---|---|
| `docs/apple-distribution/MASTER-CHECKLIST.md` | A0-baseline en gate | `771f374066987e60b697cd2a3936218814e164bd`, `6495eecd134dbb385fef1997da4483b87e1ace9c` |
| `docs/apple-distribution/DECISIONS.md` | A0-besluiten en A1-uitvoerscope/risico's | `470438e55424b71c0280c4f9d5b89e2b5e635f75`, `fdbeed46822ad251d907113008cd8fffc44506ba` |
| `docs/apple-distribution/TEST-EVIDENCE.md` | Auditbewijs A0/A1 | Deze commit vult A1-bewijs aan. |
| `docs/apple-distribution/HANDOFF-LATEST.md` | Handoff per afgeronde fase | Wordt na A1-checklist bijgewerkt. |

## Niet uitgevoerd in A1 — bewust
| Activiteit | Reden | Eerst toegestane fase |
|---|---|---|
| PWA/icon/metadata code wijzigen | A1 is audit-only | A2 |
| Cloudflare Preview deployment wijzigen/configureren | A1 legt scope vast; A2 realiseert/controleert preview | A2 |
| Proxy/authcode repareren | A1 wijzigt geen feature/configcode; prioriteit vastgelegd | A5/A7 binnen toegestane gate |
| Runtime writes/uploads/Billing/Superadminmutaties | Geen stagingisolatie bewezen | A6/A7 na groene A5 |
| Merge naar `main` | Alleen na review en expliciet akkoord | A9 |
| Capacitor/Xcode/App Storewerk | Traject A nog niet afgerond | B0/B1 en later |

## Gatebesluit A1
- Auditstatus: **GEREED EN BEWEZEN** voor uitvoerscope.
- Functionele codewijzigingen: **GEEN**.
- Productiewrites: **GEEN**.
- Doorgaan naar A2: **JA**, met read-only previewbeperking zolang A5 niet groen is.
- Blocking voor schrijftests: dubbele proxy/authroute, Cloudflare/Azure stagingisolatie en uploadtargetbewijs moeten vóór A6/A7 worden opgelost/bewezen.
