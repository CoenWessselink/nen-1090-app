import { apiRequest } from '@/api/client';
import type { BillingStatus } from '@/types/domain';

export type BillingPreviewRequest = {
  target_seats?: number;
  targetSeats?: number;
  plan_code?: string;
  targetPlan?: string;
};

export type BillingCheckoutRequest = {
  seats: number;
  plan?: string;
  billing?: string;
  success_url?: string;
  cancel_url?: string;
};

export type BillingCheckoutResponse = {
  ok: boolean;
  mode: 'mollie' | 'preview' | string;
  checkout_url: string;
  payment_id: string;
  provider_payment_id?: string | null;
  tenant_id: string;
  tenant?: string | null;
  plan: string;
  billing: string;
  seats: number;
  unit_amount_cents: number;
  amount_cents: number;
  currency: string;
  description: string;
  provider_error?: string | null;
};

function normalizePreviewPayload(payload?: BillingPreviewRequest) {
  const safeSeats =
    typeof payload?.target_seats === 'number'
      ? payload.target_seats
      : typeof payload?.targetSeats === 'number'
        ? payload.targetSeats
        : 1;

  const normalized: Record<string, unknown> = {
    target_seats: Number.isFinite(safeSeats) && safeSeats > 0 ? safeSeats : 1,
  };

  const planCode = payload?.plan_code || payload?.targetPlan;
  if (planCode) normalized.plan_code = planCode;

  return normalized;
}

export function getTenantBillingStatus() {
  return apiRequest<BillingStatus>('/tenant/billing/status');
}

export function getTenantBillingPreview(payload?: BillingPreviewRequest) {
  return apiRequest<Record<string, unknown>>('/tenant/billing/preview', {
    method: 'POST',
    body: JSON.stringify(normalizePreviewPayload(payload)),
  });
}

export function changeTenantPlan(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/tenant/billing/change-plan', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelTenantSubscriptionSelfService() {
  return apiRequest<Record<string, unknown>>('/tenant/billing/cancel-subscription', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function createTenantBillingCheckout(payload: BillingCheckoutRequest) {
  return apiRequest<BillingCheckoutResponse>('/tenant/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({
      seats: Math.max(1, Number(payload.seats || 1)),
      plan: payload.plan || 'professional',
      billing: payload.billing || 'yearly',
      success_url: payload.success_url,
      cancel_url: payload.cancel_url,
    }),
  });
}
