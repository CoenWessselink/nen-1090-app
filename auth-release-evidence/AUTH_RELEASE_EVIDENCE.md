# AUTH release evidence

Generated: 2026-03-18T11:34:12.172Z

## Scope
- API AUTH
- APP AUTH
- E2E AUTH

## Build artifacts checked
- package.json scripts present: yes
- Playwright live spec present: yes
- Live auth runbook present: yes

## Live matrix summary
- No live-auth-matrix.json found yet. Run `npm run auth:matrix:live` first.

## Final manual release checks
- Verify reset mail delivery or documented reset-token source.
- Verify audit log rows in database for login, refresh denial, logout, reset request, reset confirm, change password.
- Verify Alembic migration 0019 applied in target environment.
- Verify no .env file is committed and only .env.example remains.

## Decision
- Set AUTH to 100% FINAL only when all live matrix steps are green and manual release checks are signed off.

