import { createLayerConfig } from "./playwright.layer-common";

export default createLayerConfig([
  "smoke.spec.ts",
  "api.spec.ts",
]);
