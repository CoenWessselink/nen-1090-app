Frontend fixes included:
- reports endpoint now fails closed to empty list instead of hard 404 crash
- settings root call replaced by aggregated settings contract based on live sub-endpoints
- settings update methods aligned to PATCH
- project document upload now prefers /projects/{id}/documents and falls back to /documents/upload with project_id
- compliance/export hooks no longer throw unsupported-live-API console errors
- CE/compliance fetches now use safe optional fallbacks

Validation:
- TypeScript typecheck passed: npm run typecheck
- Full build in this container was blocked by missing Rollup optional dependency inside bundled node_modules from the uploaded zip.
  Run a clean npm install locally before building.
