import { createLayerConfig } from "./playwright.layer-common";

export default createLayerConfig([
  "api.spec.ts",
  "auth-hardening.spec.ts",
  "auth-session-negative.spec.ts",
], {
  grepInvert: /@e2e-live/,
});
