import { createLayerConfig } from "./playwright.layer-common";
export default createLayerConfig(["**/e2e/auth-live.spec.ts", "**/e2e/smoke.spec.ts"]);
