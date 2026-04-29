import { optionalRequest } from '@/api/client';
import type { BillingStatus } from '@/types/domain';

export type BillingPreviewRequest = {
  target_seats?: number;
  targetSeats?: number;
  seats?: number;
  plan_code?: string;
  targetPlan?: string;
  plan?: string;
};

export type BillingCheckoutRequest = {
  seats: number;
  plan?: string;
  billing?: 'monthly' | 'yearly' | string;
  billing_cycle?: 'monthly' | 'yearly';
  success_url?: string;
  cancel_url?: string;
};

export type BillingCheckoutResponse = {
  ok?: boolean;
  mode?: 'mollie' | 'preview' | string;
  checkout_url?: string;
  payment_id?: string;
  provider_payment_id?: string | null;
  tenant_id?: string;
  tenant?: string | null;
  plan?: string;
  billing?: string;
  billing_cycle?: string;
  seats?: number;
  unit_amount_cents?: number;
  amount_cents?: number;
  total_cents?: number;
  currency?: string;
  description?: string;
  provider_error?: string | null;
  [key: string]: unknown;
};

function positiveInt(value: unknown, fallback = 1): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizePreviewPayload(payload?: BillingPreviewRequest): Record<string, unknown> {
  const targetSeats = positiveInt(
    payload?.target_seats ?? payload?.targetSeats ?? payload?.seats,
    1,
  );
  const planCode = payload?.plan_code ?? payload?.targetPlan ?? payload?.plan;
  return {
    target_seats: targetSeats,
    ...(planCode ? { plan_code: planCode } : {}),
  };
}

function normalizeCheckoutPayload(payload: BillingCheckoutRequest): Record<string, unknown> {
  const billingCycle = payload.billing_cycle || (payload.billing === 'monthly' ? 'monthly' : 'yearly');
  return {
    seats: positiveInt(payload.seats, 1),
    billing_cycle: billingCycle,
    billing: billingCycle,
    plan: payload.plan || 'core',
    success_url: payload.success_url || `${window.location.origin}/billing?payment=success`,
    cancel_url: payload.cancel_url || `${window.location.origin}/billing?payment=cancelled`,
  };
}

export function getTenantBillingStatus() {
  return optionalRequest<BillingStatus | Record<string, unknown>>([
    '/billing/current',
    '/tenant/billing/status',
    '/tenant/billing/subscription',
  ]);
}

export function getTenantBillingInvoices() {
  return optionalRequest<Record<string, unknown>>([
    '/billing/invoices',
    '/tenant/billing/invoices',
  ]);
}

export function getTenantBillingPreview(payload?: BillingPreviewRequest) {
  const body = JSON.stringify(normalizePreviewPayload(payload));
  return optionalRequest<Record<string, unknown>>([
    '/tenant/billing/preview',
    '/billing/preview',
  ], {
    method: 'POST',
    body,
  });
}

export function changeTenantPlan(payload: Record<string, unknown>) {
  const normalized = {
    ...payload,
    target_seats: positiveInt(
      payload.target_seats ?? payload.targetSeats ?? payload.seats,
      1,
    ),
    plan_code: payload.plan_code ?? payload.targetPlan ?? payload.plan,
  };
  return optionalRequest<Record<string, unknown>>([
    '/tenant/billing/change-plan',
    '/tenant/billing/change',
    '/billing/change-plan',
    '/billing/change-seats',
  ], {
    method: 'POST',
    body: JSON.stringify(normalized),
  });
}

export function cancelTenantSubscriptionSelfService() {
  return optionalRequest<Record<string, unknown>>([
    '/tenant/billing/cancel-subscription',
    '/billing/cancel',
  ], {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function createTenantBillingCheckout(payload: BillingCheckoutRequest) {
  const body = JSON.stringify(normalizeCheckoutPayload(payload));
  return optionalRequest<BillingCheckoutResponse>([
    '/billing/checkout/trial-upgrade',
    '/tenant/billing/checkout',
    '/billing/checkout',
  ], {
    method: 'POST',
    body,
  });
}

export function getTeamUsers() {
  return optionalRequest<Record<string, unknown>>([
    '/team/users',
    '/tenant/users',
  ]);
}

export function inviteTeamUser(payload: { email: string; role: string }) {
  return optionalRequest<Record<string, unknown>>([
    '/team/invite',
    '/tenant/users/invite',
  ], {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
