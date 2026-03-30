import { createLayerConfig } from "./playwright.layer-common";
export default createLayerConfig(["**/e2e/api.spec.ts", "**/e2e/auth-hardening.spec.ts", "**/e2e/auth-session-negative.spec.ts"]);
