# Fase 4 — Platform hardening, beheerflows en E2E afronding

## Afgerond
- Settings CRUD aangescherpt met RBAC-guardrails en dynamische editorvelden
- Billingbeheer aangescherpt met alleen-lezen modus voor rollen zonder `billing.manage`
- Superadmin tenantbeheer uitgebreid met expliciete impersonatie-exit in paginaflow
- Tenantdetail verrijkt met KPI-samenvatting en expliciete status-/beheerweergave
- Extra E2E-dekking toegevoegd voor settings/Billing RBAC

## Validatie
- npm run lint
- npm run build

## Scope van deze fase
- WPS / materialen / lassers / inspectietemplates CRUD
- Billing status + subscription overview + guarded plan management
- Tenant management + impersonation UX
- RBAC hardening + mobile-safe beheerflows
- E2E uitbreiding op admin- en permission-flows
