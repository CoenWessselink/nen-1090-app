# FASE 1C — Frontend Contract Locking

## Goal

Move the frontend from:
- fallback-driven runtime behavior

to:
- canonical API contract behavior

## Current frontend runtime risks

### Billing frontend
Current behavior:
- optionalRequest fallback chains
- multiple billing endpoint attempts
- response normalization
- runtime compatibility handling

### Inspection frontend
Current behavior:
- response guessing
- payload normalization
- status compatibility mapping
- multiple inspection endpoint compatibility

## Canonical API targets

### Inspection API
Canonical runtime:
- inspection_save_final.py

Target endpoints:
- /projects/{projectId}/welds/{weldId}/inspections
- /welds/{weldId}/inspections

### Billing API
Canonical runtime candidate:
- billing_phase10a_ssot.py

Target endpoints:
- /billing/current
- /billing/invoices
- /billing/payments
- /billing/checkout
- /billing/change-seats

## FASE 1C rollout strategy

1. endpoint locking
2. response contract stabilization
3. payload stabilization
4. optionalRequest reduction
5. frontend fallback reduction

## Important

No abrupt fallback removal.
No frontend hard switch before runtime validation.
