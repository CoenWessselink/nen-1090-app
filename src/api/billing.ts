import { optionalRequest } from '@/api/client';
import { runtimeTrace } from '@/utils/runtimeTracing';
import type { BillingStatus } from '@/types/domain';

const CANONICAL_BILLING_STATUS_ENDPOINT = '/billing/current';
const BILLING_STATUS_FALLBACK_ENDPOINTS = [
  '/tenant/billing/status',
  '/tenant/billing/subscription',
];
const BILLING_STATUS_FALLBACK_COUNT = BILLING_STATUS_FALLBACK_ENDPOINTS.length;

const CANONICAL_BILLING_INVOICES_ENDPOINT = '/billing/invoices';
const BILLING_INVOICES_FALLBACK_ENDPOINTS = ['/tenant/billing/invoices'];
const BILLING_INVOICES_FALLBACK_COUNT = BILLING_INVOICES_FALLBACK_ENDPOINTS.length;

const CANONICAL_BILLING_PREVIEW_ENDPOINT = '/billing/preview';
const BILLING_PREVIEW_FALLBACK_ENDPOINTS = [
  '/tenant/billing/preview',
  '/billing/plans',
];

const CANONICAL_BILLING_CHECKOUT_ENDPOINT = '/billing/checkout/trial-upgrade';
const BILLING_CHECKOUT_FALLBACK_ENDPOINTS = [
  '/tenant/billing/checkout',
  '/billing/checkout',
];

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
  accepted_terms?: boolean;
  accepted_recurring_payment?: boolean;
  target_seats?: number;
  targetSeats?: number;
  targetPlan?: string;
  plan_code?: string;
};

export type BillingCheckoutResponse = {
  ok?: boolean;
  checkout_url?: string;
  payment_id?: string;
  provider_payment_id?: string | null;
  tenant_id?: string;
  subscription_id?: string;
  billing_cycle?: string;
  seats?: number;
  amount_cents?: number;
  price?: Record<string, unknown>;
  [key: string]: unknown;
};

function traceCanonicalRequest(event: string, endpoint: string, fallbacks: string[]) {
  runtimeTrace(event, {
    endpoint,
    fallbackCount: fallbacks.length,
    fallbackEndpoints: fallbacks,
  });
}

function positiveInt(value: unknown, fallback = 1): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizeCheckoutPayload(payload: BillingCheckoutRequest): Record<string, unknown> {
  const billingCycle = payload.billing_cycle || (payload.billing === 'monthly' ? 'monthly' : 'yearly');
  const seats = positiveInt(payload.seats ?? payload.target_seats ?? payload.targetSeats, 1);

  runtimeTrace('BILLING_CHECKOUT_PAYLOAD_NORMALIZED', {
    billingCycle,
    seats,
    requestedPlan: payload.plan || payload.plan_code || payload.targetPlan || 'core',
  });

  return {
    seats,
    target_seats: seats,
    billing_cycle: billingCycle,
    billing: billingCycle,
    plan: payload.plan || payload.plan_code || payload.targetPlan || 'core',
    plan_code: payload.plan_code || payload.plan || payload.targetPlan || 'core',
    accepted_terms: payload.accepted_terms ?? true,
    accepted_recurring_payment: payload.accepted_recurring_payment ?? true,
  };
}

function normalizePreviewPayload(payload?: BillingPreviewRequest): Record<string, unknown> {
  const seats = positiveInt(payload?.target_seats ?? payload?.targetSeats ?? payload?.seats, 1);
  const planCode = payload?.plan_code ?? payload?.targetPlan ?? payload?.plan ?? 'core';

  runtimeTrace('BILLING_PREVIEW_PAYLOAD_NORMALIZED', {
    seats,
    planCode,
  });

  return { target_seats: seats, seats, plan_code: planCode, plan: planCode };
}

export function getTenantBillingStatus() {
  traceCanonicalRequest(
    'CANONICAL_BILLING_ENDPOINT_USED',
    CANONICAL_BILLING_STATUS_ENDPOINT,
    BILLING_STATUS_FALLBACK_ENDPOINTS,
  );

  return optionalRequest<BillingStatus | Record<string, unknown>>([
    CANONICAL_BILLING_STATUS_ENDPOINT,
    ...BILLING_STATUS_FALLBACK_ENDPOINTS,
  ]);
}

export function getBillingPaymentStatus(paymentId: string) {
  runtimeTrace('CANONICAL_BILLING_PAYMENT_STATUS_USED', {
    paymentId,
  });

  return optionalRequest<Record<string, unknown>>([
    `/billing/payment-status/${encodeURIComponent(paymentId)}`,
  ]);
}

export function getTenantBillingInvoices() {
  traceCanonicalRequest(
    'CANONICAL_BILLING_ENDPOINT_USED',
    CANONICAL_BILLING_INVOICES_ENDPOINT,
    BILLING_INVOICES_FALLBACK_ENDPOINTS,
  );

  return optionalRequest<Record<string, unknown>>([
    CANONICAL_BILLING_INVOICES_ENDPOINT,
    ...BILLING_INVOICES_FALLBACK_ENDPOINTS,
  ]);
}

export function getTenantBillingPayments() {
  traceCanonicalRequest('CANONICAL_BILLING_PAYMENTS_USED', '/billing/payments', [
    '/tenant/billing/payments',
  ]);

  return optionalRequest<Record<string, unknown>>([
    '/billing/payments',
    '/tenant/billing/payments',
  ]);
}

export function getBillingPlans() {
  traceCanonicalRequest('CANONICAL_BILLING_PLANS_USED', '/billing/plans', [
    '/tenant/billing/plans',
  ]);

  return optionalRequest<Record<string, unknown>>([
    '/billing/plans',
    '/tenant/billing/plans',
  ]);
}

export function getTenantBillingPreview(payload?: BillingPreviewRequest) {
  traceCanonicalRequest(
    'CANONICAL_BILLING_PREVIEW_USED',
    CANONICAL_BILLING_PREVIEW_ENDPOINT,
    BILLING_PREVIEW_FALLBACK_ENDPOINTS,
  );

  return optionalRequest<Record<string, unknown>>(
    [
      CANONICAL_BILLING_PREVIEW_ENDPOINT,
      ...BILLING_PREVIEW_FALLBACK_ENDPOINTS,
    ],
    {
      method: 'POST',
      body: JSON.stringify(normalizePreviewPayload(payload)),
    },
  );
}

export function createTenantBillingCheckout(payload: BillingCheckoutRequest) {
  traceCanonicalRequest(
    'CANONICAL_BILLING_CHECKOUT_USED',
    CANONICAL_BILLING_CHECKOUT_ENDPOINT,
    BILLING_CHECKOUT_FALLBACK_ENDPOINTS,
  );

  const body = JSON.stringify(normalizeCheckoutPayload(payload));

  return optionalRequest<BillingCheckoutResponse>([
    CANONICAL_BILLING_CHECKOUT_ENDPOINT,
    ...BILLING_CHECKOUT_FALLBACK_ENDPOINTS,
  ], {
    method: 'POST',
    body,
  });
}

export function changeTenantSeats(payload: BillingCheckoutRequest | Record<string, unknown>) {
  const body = JSON.stringify(normalizeCheckoutPayload(payload as BillingCheckoutRequest));

  runtimeTrace('CANONICAL_BILLING_CHANGE_REQUEST_USED', {
    endpoint: '/billing/change-seats',
    fallbackEndpoints: [
      '/tenant/billing/change-plan',
      '/tenant/billing/change',
      '/billing/change-plan',
    ],
  });

  return optionalRequest<BillingCheckoutResponse>([
    '/billing/change-seats',
    '/tenant/billing/change-plan',
    '/tenant/billing/change',
    '/billing/change-plan',
  ], {
    method: 'POST',
    body,
  });
}

export function changeTenantPlan(payload: BillingCheckoutRequest | Record<string, unknown>) {
  return changeTenantSeats(payload);
}

export function retryTenantPayment() {
  runtimeTrace('CANONICAL_BILLING_RETRY_USED', {
    endpoint: '/billing/retry-payment',
  });

  return optionalRequest<BillingCheckoutResponse>([
    '/billing/retry-payment',
    '/tenant/billing/retry-payment',
    '/tenant/billing/checkout',
  ], {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function cancelTenantSubscriptionSelfService() {
  runtimeTrace('CANONICAL_BILLING_CANCEL_USED', {
    endpoint: '/billing/cancel',
  });

  return optionalRequest<Record<string, unknown>>([
    '/billing/cancel',
    '/tenant/billing/cancel-subscription',
  ], {
    method: 'POST',
    body: JSON.stringify({}),
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
