PHASE 11 ULTRA SUITE

Toegevoegd bovenop heavy suite:
- desktop-baseline-screenshots.spec.ts
- mobile-baseline-screenshots.spec.ts
- desktop-mobile-parity.spec.ts
- forced-token-expiry.spec.ts
- refresh-rollover-proof.spec.ts
- corrupt-session-resilience.spec.ts
- artifact-proof-pack.spec.ts

Dekt nu ook:
- screenshot baselines per kernroute
- desktop en mobile viewport proof
- forced token expiry scenario's
- refresh rollover tests
- artifact evidence pack in test-results

Workflow:
- .github/workflows/playwright_phase11_ultra_live.yml
  Draait de ultra suite handmatig of na succesvolle deploy.
