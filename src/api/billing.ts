import { apiRequest } from '@/api/client';

export type BillingCheckoutRequest = { seats: number; billing_cycle?: 'monthly' | 'yearly'; success_url?: string; cancel_url?: string };
export function getTenantBillingStatus() { return apiRequest<Record<string, unknown>>('/billing/current'); }
export function getTenantBillingInvoices() { return apiRequest<Record<string, unknown>>('/billing/invoices'); }
export function createTenantBillingCheckout(payload: BillingCheckoutRequest) {
  return apiRequest<Record<string, unknown>>('/billing/checkout/trial-upgrade', { method: 'POST', body: JSON.stringify({ seats: Math.max(1, Number(payload.seats || 1)), billing_cycle: payload.billing_cycle || 'yearly', success_url: payload.success_url || `${window.location.origin}/billing?payment=success`, cancel_url: payload.cancel_url || `${window.location.origin}/billing?payment=cancelled` }) });
}
export function getTeamUsers() { return apiRequest<Record<string, unknown>>('/team/users'); }
export function inviteTeamUser(payload: { email: string; role: string }) { return apiRequest<Record<string, unknown>>('/team/invite', { method: 'POST', body: JSON.stringify(payload) }); }
