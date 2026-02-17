# Deploy 02 App naar Cloudflare Pages (Pages-ready)

Deze map (`PAGES_APP_READY/`) is de **Pages-deploybare** versie van het eindprogramma (02).

## Belangrijkste uitgangspunt
Alle frontend calls gaan naar **zelfde origin**:
- `/api/v1/...`

De Pages Function proxy in `functions/api/[[path]].js` stuurt alles door naar Azure:
- `https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net/api/v1/...`

## Cloudflare Pages instellingen
- Framework preset: **None**
- Build command: **(leeg)**
- Output directory: **/** (root)
- Functions: automatisch uit `/functions`

## Environment variables (optioneel)
De proxy ondersteunt meestal een env var zoals:
- `AZURE_API_ORIGIN` of `BACKEND_API_BASE`

Zet in Pages (Project settings → Environment variables) bij voorkeur:
- `AZURE_API_ORIGIN = https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net`

Als je dit niet zet, gebruikt de proxy zijn default (zie `functions/api/[[path]].js`).

## Local dev
Als je lokaal start via `server.bat` (http://localhost:5173) heb je geen Pages Functions.
Dan kun je tijdelijk een API base instellen via:
- `localStorage.API_BASE_URL = "http://127.0.0.1:8001"` (of Azure origin)
Of gebruik `set_api.html` indien aanwezig.

## Snelle test
1) Open `/start.html`
2) Login
3) Controleer Network calls:
   - `/api/v1/auth/login`
   - `/api/v1/auth/me`
   - `/api/v1/projects` (of andere endpoints)

