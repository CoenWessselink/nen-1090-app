import { apiRequest } from '@/api/client';

export type BillingCycle = 'monthly' | 'yearly';

export type BillingCheckoutRequest = {
  seats: number;
  billing_cycle?: BillingCycle;
  success_url?: string;
  cancel_url?: string;
};

export type BillingPreviewRequest = {
  target_seats?: number;
  seats?: number;
  plan_code?: string;
  billing_cycle?: BillingCycle;
};

function appOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

function normalizeSeats(value: unknown, fallback = 1): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : fallback;
}

export function getTenantBillingStatus() {
  return apiRequest<Record<string, unknown>>('/billing/current');
}

export function getTenantBillingInvoices() {
  return apiRequest<Record<string, unknown>>('/billing/invoices');
}

export function getTenantBillingPreview(payload?: BillingPreviewRequest) {
  const params = new URLSearchParams();
  if (payload?.target_seats || payload?.seats) params.set('seats', String(normalizeSeats(payload.target_seats ?? payload.seats)));
  if (payload?.plan_code) params.set('plan_code', String(payload.plan_code));
  if (payload?.billing_cycle) params.set('billing_cycle', payload.billing_cycle);
  const query = params.toString();
  return apiRequest<Record<string, unknown>>(`/billing/preview${query ? `?${query}` : ''}`);
}

export function createTenantBillingCheckout(payload: BillingCheckoutRequest) {
  return apiRequest<Record<string, unknown>>('/billing/checkout/trial-upgrade', {
    method: 'POST',
    body: JSON.stringify({
      seats: normalizeSeats(payload.seats),
      billing_cycle: payload.billing_cycle || 'yearly',
      success_url: payload.success_url || `${appOrigin()}/billing?payment=success`,
      cancel_url: payload.cancel_url || `${appOrigin()}/billing?payment=cancelled`,
    }),
  });
}

export function changeTenantPlan(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/billing/change-plan', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      seats: normalizeSeats(payload.seats ?? payload.target_seats),
      billing_cycle: (payload.billing_cycle as BillingCycle) || 'yearly',
    }),
  });
}

export function cancelTenantSubscriptionSelfService() {
  return apiRequest<Record<string, unknown>>('/billing/cancel', { method: 'POST', body: JSON.stringify({}) });
}

export function getTeamUsers() {
  return apiRequest<Record<string, unknown>>('/team/users');
}

export function inviteTeamUser(payload: { email: string; role: string }) {
  return apiRequest<Record<string, unknown>>('/team/invite', { method: 'POST', body: JSON.stringify(payload) });
}
