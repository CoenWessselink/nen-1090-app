# WeldInspect Pro — Apple Distribution Decisions

## Documentstatus
- Masterpromptversie: 2026-05-23
- Aangemaakt in: Chat A0 — Branch, checklist en baseline
- Repository: `CoenWessselink/nen-1090-app`
- Branch: `feat/apple-ios-ipados-pwa-readiness`
- Basiscommit (`main`): `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`
- Laatste bijwerking: 2026-05-23 (Europe/Amsterdam)

## Vaststaande uitgangspunten

| ID | Datum | Besluit / uitgangspunt | Status | Impact op uitvoering |
|---|---|---|---|---|
| DEC-A-001 | 2026-05-23 | Traject A wordt uitsluitend ontwikkeld op `feat/apple-ios-ipados-pwa-readiness`, gestart vanaf actuele `main` commit `97ac4466fc7aa5ad88a01d8d4b1d193df147480b`. | Vaststaand | Geen wijzigingen rechtstreeks op `main`; merge pas na expliciet eigenaarakkoord in A9. |
| DEC-A-002 | 2026-05-23 | Chat A0 is documentatie- en baseline-only; geen functionele codebouw of productiewrites. | Vaststaand | De vier Apple-distributiedocumenten zijn de enige A0-wijzigingen. |
| DEC-A-003 | 2026-05-23 | Backend/API blijft enige SSOT voor tenants, projecten, inspecties, CE-data, attachments en billing. | Vaststaand | Frontend Apple-aanpassingen mogen geen businesslogica of fallbackstatusberekening introduceren. |
| DEC-A-004 | 2026-05-23 | `/projecten/:projectId/ce-report` blijft de enige visuele SSOT voor CE-report en browserprint/PDF. | Vaststaand | Geen Apple-specifieke tweede CE-layout of concurrerende PDF-template. |
| DEC-A-005 | 2026-05-23 | Iedere Cloudflare preview is read-only zolang preview → geïsoleerde Azure staging API/database/storage niet aantoonbaar groen is. | Vaststaand | Geen opslaan, uploads, factuuracties of Superadminmutaties via preview vóór A5. |
| DEC-A-006 | 2026-05-23 | De bestaande app Pages deploymentconfiguratie wordt gebruikt; Traject A maakt geen nieuw Pages-project. | Vaststaand | Preview Deployment moet in later stadium binnen het bestaande Pages-project worden gecontroleerd. |
| DEC-B-001 | 2026-05-23 | Traject B mag pas starten nadat Traject A is gemerged en live gevalideerd met eigenaarakkoord. | Vaststaand | Geen Capacitor/Xcode/native code in Traject A. |
| DEC-B-002 | 2026-05-23 | De eerste iOS-release wordt benaderd als zakelijke companion-app voor bestaande accounts; definitieve billing/distributiekeuzes volgen in B0. | Voorbereidend | Geen iOS-trial-, upgrade- of Mollie-checkoutflow zonder later formeel besluit. |

## Feitelijke baselinebevindingen die besluiten onderbouwen

### Frontend/PWA
- `index.html` bevat bij start alleen de generieke titel `NEN1090 App` en standaardviewport; geen Apple home-screen metadata of manifestkoppeling is daarin vastgesteld.
- `vite.config.ts` bevat standaard React/Vite-buildconfiguratie; geen PWA-plugin is daarin vastgesteld.
- Direct gecontroleerde standaardmanifestpaden `public/manifest.webmanifest` en `public/manifest.json` zijn niet aangetroffen.
- A1 moet repositorybreed nog bewijzen of aanvullende icon-, manifest- of service-workerassets elders aanwezig zijn.

### Shell en interactie
- `AppShell.tsx` bevat de bestaande shell met Sidebar, Topbar, MobileTabbar, NotificationCenter en ToastViewport.
- `Modal.tsx` gebruikt reeds React Portal naar `document.body` en body scroll-lock.
- `runtime-mobile-hotfix.css` centraliseert viewportscroll en modals met `100dvh`; safe-area-insets zijn in de gecontroleerde baseline niet aangetroffen.

### Auth/API/previewveiligheid
- `env.ts` gebruikt standaard same-origin `/api/v1`.
- `client.ts` gebruikt cookie-auth (`credentials: 'include'`) en refreshretry.
- `functions/api/[[path]].js` fungeert als Pages-proxy en injecteert cookiegebaseerde authenticatie naar een Azure-origin.
- `wrangler.toml` bevat op de baseline productie-Azure als origin/fallback; dit motiveert DEC-A-005.

## Open besluiten voor latere fases

| Fase | Benodigd besluit / bewijs | Wie | Blocking voor |
|---|---|---|---|
| A1/A2 | Cloudflare Preview URL, Access-status en feitelijke API-target | Agent/eigenaar bij ontbrekende toegang | Preview met zichtbare gegevens |
| A5 | Azure deployment slot `staging`, aparte database, aparte storage, veilige mail/billing en preview-routing | Agent/eigenaar afhankelijk van toegang | Alle writes en uploads in A6/A7 |
| B0 | Apple Developer organisatieaccount, D-U-N-S, seller/legal entity en App Store Connect toegang | Eigenaar | Native distributietraject |
| B0 | Definitieve appnaam, bundle ID en distributievorm (unlisted/publiek/custom) | Eigenaar | B1 / Xcode-configuratie |
| B0/B4 | Definitieve iOS-billing-, account- en privacystrategie | Eigenaar met officiële Apple-verificatie | TestFlight/review candidate |
| B0/B7 | Mac/Xcode/iPhone/iPad/signing/2FA beschikbaarheid | Eigenaar | Native build/TestFlight |

## Wijzigingsregel
Besluiten worden niet stilzwijgend gewijzigd. Iedere nieuwe keuze krijgt een nieuwe regel met datum, eigenaar/bron, impact en eventuele vervanging van een eerder besluit.
