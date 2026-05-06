# FASE C3 — Frontend Contract Hardening

## Goal

Stabilize frontend API contracts after canonical endpoint consolidation.

## Scope

### Inspection contract hardening

Targets:
- src/api/inspections.ts

Focus:
- inspection status normalization reduction
- canonical inspection response handling
- payload consistency
- compat mapping visibility

### Billing contract hardening

Targets:
- src/api/billing.ts

Focus:
- canonical response ownership
- fallback payload containment
- response consistency
- reduced runtime guessing

### optionalRequest containment

Goals:
- canonical-first endpoint ownership
- compat endpoints remain rollback-safe
- reduce endpoint ambiguity
- improve runtime predictability

## Runtime safety rules

- no abrupt compat removal
- no hard endpoint deletion
- rollback-safe deploys only
- observability remains active

## Deployment status

- frontend stable
- backend stable
- Azure stable
- canonical-first architecture active
