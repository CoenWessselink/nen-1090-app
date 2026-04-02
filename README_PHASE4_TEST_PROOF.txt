CWS NEN-1090 — PHASE 4 TEST & PROOF

Dit pakket bevat een compacte, reproduceerbare proof-laag voor auth/routing.

Bestanden:
- playwright.config.ts
- tests/e2e/auth-routing-smoke.spec.ts
- tests/e2e/live-auth.spec.ts
- scripts/test-live-phase4.ps1
- scripts/test-local-phase4.ps1

Doel:
- login route hard valideren
- protected route redirect valideren
- verkeerde credentials foutmelding valideren
- live demo login end-to-end valideren

Gebruik lokaal:
powershell -ExecutionPolicy Bypass -File scripts/test-local-phase4.ps1

Gebruik live:
powershell -ExecutionPolicy Bypass -File scripts/test-live-phase4.ps1

Gebruik live smoke only:
powershell -ExecutionPolicy Bypass -File scripts/test-live-phase4.ps1 -SmokeOnly
