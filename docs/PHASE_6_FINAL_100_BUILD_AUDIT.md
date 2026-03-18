NEN1090 FRONTEND – FINAL 100 BUILD AUDIT

This closing build consolidates the previous phases and closes the remaining structural gaps that were still open after phase 5.

Implemented in this closing build:
- project-scoped routing via /projecten/:projectId, /projecten/:projectId/welds and /projecten/:projectId/ce-dossier
- route-to-project context synchronization so selected project follows route context
- ProjectScopePicker navigation so users no longer stay on generic pages after selecting a project
- cleanup of the duplicate unused src/services layer to reduce architectural ambiguity
- final repository packaging and audit update

Validation completed in this environment:
- npm ci
- npm run lint
- npm run build

Known environment limitation:
- live browser E2E against a real backend endpoint could not be proven inside this container.
