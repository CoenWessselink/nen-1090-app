# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is the **CWS NEN-1090 Platform** (WeldInspect Pro) — a React 18 + TypeScript + Vite 6 SPA for welding inspection management and CE-marking (NEN-1090 compliance). It is a **frontend-only** codebase; the backend API (`NEN10900-api`) is a separate Azure-hosted service.

### Quick reference

| Action | Command |
|---|---|
| Install deps | `npm ci` |
| Dev server | `npm run dev` (port 5173) |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` |
| Preview (prod build) | `npm run preview` (port 4173) |
| E2E tests | `npx playwright test tests/e2e/00_routes.spec.ts --project=desktop-chromium` |
| Install Playwright | `npx playwright install chromium --with-deps` |

### Important caveats

- **No backend API in this repo.** All `/api/v1/*` calls go to an external Azure backend. Without it, login and authenticated features will return errors — this is expected. The `VITE_API_BASE_URL` in `.env` controls the API endpoint.
- **Smoke test file missing.** `npm run test:smoke` references `tests/e2e/smoke.spec.ts` which does not exist. Use `tests/e2e/00_routes.spec.ts` for basic route verification instead.
- **Playwright requires a production build.** The Playwright config starts `npm run preview` (serves from `dist/`), so run `npm run build` before running E2E tests, or use `PLAYWRIGHT_REUSE_EXISTING_SERVER=1` with the dev server already running at the expected port.
- **`npm run dev` script** runs `node scripts/use-source-entry.mjs` before Vite. This script checks that `src/main.tsx`, `src/app/router/routes.tsx`, and `index.html` exist, and optionally syncs `index.html` from `index.source.html`.
- **Git submodules** are optional. `scripts/submodules-init.mjs` (run during `npm run build`) gracefully skips if `.gitmodules` is absent.
- **ESLint** uses flat config (`eslint.config.js`) with `typescript-eslint` and `react-hooks` plugin. It only lints `src/**/*.{ts,tsx}`.
