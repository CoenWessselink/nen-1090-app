Gerichte herstelset voor de actuele blokkades.

Deze ZIP fixt alleen de bestanden die nu aantoonbaar de build breken:
- src/app/router/requireAuth.tsx
- src/pages/LoginPage.tsx
- src/services/apiClient.ts
- playwright.config.ts

Doel:
- typecheck herstellen
- axios-dependency verwijderen
- apiRequest named export herstellen
- Playwright project 'desktop-chromium' terugzetten
- RequireAuth laten aansluiten op huidig SessionContext-contract
