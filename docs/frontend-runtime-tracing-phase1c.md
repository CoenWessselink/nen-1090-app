# Frontend Runtime Tracing — Phase 1C

## Billing frontend tracing

Target:
- src/api/billing.ts

Planned markers:
- BILLING_FALLBACK_TRIGGERED
- CANONICAL_BILLING_ENDPOINT_USED
- LEGACY_BILLING_ENDPOINT_USED

Tracked flows:
- billing/current
- billing/invoices
- billing/payments
- billing/checkout

## Inspection frontend tracing

Target:
- src/api/inspections.ts

Planned markers:
- INSPECTION_RESPONSE_NORMALIZED
- LEGACY_INSPECTION_STATUS_USED
- CANONICAL_INSPECTION_ENDPOINT_USED

Tracked flows:
- response normalization
- payload normalization
- compat status mapping

## Goal

Measure active fallback usage and canonical endpoint adoption before compat cleanup.
