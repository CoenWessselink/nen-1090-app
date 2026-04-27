PHASE 11 HEAVY SUITE

Toegevoegd:
- _heavy-helper.ts
- auth-header-proof.spec.ts
- console-and-network-proof.spec.ts
- multi-route-refresh-proof.spec.ts
- storage-cookie-proof.spec.ts
- logout-relogin-lifecycle.spec.ts
- tab-shell-proof.spec.ts
- multi-tab-session-consistency.spec.ts
- direct-protected-entry-after-login.spec.ts

Doel:
- auth header bewijs op /auth/me en /auth/refresh
- console + pageerror controle
- multi-route refresh proof
- storage/cookie proof voor sessiepersistentie
- logout/relogin lifecycle
- project tab shell continuity
- multi-tab session consistency
- deep-link continuity naar protected routes

Aanvullende uitbreidingen mogelijk:
- screenshot baselines per kernroute
- forced token expiry scenario's
- refresh rollover tests
- suite-splitsing desktop/mobile
- parallel live proof workflow na deploy
