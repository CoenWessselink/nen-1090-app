import { createLayerConfig } from "./playwright.layer-common";
export default createLayerConfig(["**/e2e/smoke.spec.ts", "**/e2e/api.spec.ts"]);
