# Phase 3 — CE dossier, documenten en exports

Afgerond in deze fase:

- CE dossierpagina uitgebreid met project-scoped compliance-overzicht
- CE dossierstructuur gekoppeld via `/projects/{project_id}/ce-dossier`
- documentbeheer uitgebreid naar echte multi-upload flow
- upload progress UI toegevoegd per bestand
- documentdownload ondersteund via backend download endpoints of directe `download_url`
- exportcentrum gekoppeld aan CE, ZIP, PDF en Excel exportacties
- exporthistorie uitgebreid met downloadknoppen waar backend een `download_url` teruggeeft
- document detailmodal uitgebreid met versieoverzicht en preview/download
- query invalidation verbeterd voor documentmutaties

Validatie:

- `npm ci`
- `npm run lint`
- `npm run build`

Open punten binnen fase 3:

- geen repo-structurele build blockers
- end-to-end validatie blijft afhankelijk van runtime omgeving en beschikbare browser binaries
