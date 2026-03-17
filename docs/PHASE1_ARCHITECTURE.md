# Fase 1 — definitieve architectuurbasis

## Repo-verdeling
- `NEN1090-marketing`: publieke website, pricing, onboarding, login-entry.
- `nen-1090-app`: operationele SaaS-app, PWA, modules, shell, component library.
- `NEN10900-api`: FastAPI backend, domeinservices, migraties, seeders.

## App-modulekaart
- dashboard
- projecten
- lascontrole
- documenten
- requirements
- auditlog
- instellingen
- superadmin
- tenant-billing

## API-domeinen
- auth
- tenants
- projects
- welds
- inspections
- documents
- audit
- exports
- billing

## Kernprincipe
Project -> compliance objecten -> bewijsstukken -> audit events -> export.
