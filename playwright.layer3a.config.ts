import { createLayerConfig } from "./playwright.layer-common";

export default createLayerConfig([
  "auth-and-routing.spec.ts",
  "billing-and-superadmin.spec.ts",
  "documents-and-settings.spec.ts",
  "global-search-and-export.spec.ts",
  "global-search-and-impersonation.spec.ts",
  "impersonation-exit.spec.ts",
  "planning-reporting.spec.ts",
  "projects-crud.spec.ts",
  "responsive-shell.spec.ts",
  "settings-crud-and-rbac.spec.ts",
  "weld-flow.spec.ts",
], {
  grepInvert: /@e2e-live/,
});
