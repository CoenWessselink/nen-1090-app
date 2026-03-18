# Phase 2 — Core modules operational

This phase completes the primary frontend workflows against the mapped backend endpoints:

- Dashboard summary stays wired to `/dashboard/summary` and related aggregate fallbacks.
- Global search remains available from the topbar via `GET /search?q=`.
- Projects page now uses the enterprise list contract with server-side `page`, `limit`, `search`, `sort`, `status`.
- Project 360 now includes weld and inspection tabs in addition to assemblies, documents, compliance and exports.
- Weld / inspection / defect workflows now use the same enterprise list contract with project-scoped context where available.
- Responsive tables continue to work through the shared `DataTable` mobile cards and pagination.

Phase gate evidence for this environment:
- `npm run build`
- `npm run lint`
