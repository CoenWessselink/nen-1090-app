import { createLayerConfig } from "./playwright.layer-common";

export default createLayerConfig([
  "auth-live.spec.ts",
  "project-open-live.spec.ts",
  "ce-export-live.spec.ts",
], {
  grep: /@e2e-live|@smoke-live/,
});
