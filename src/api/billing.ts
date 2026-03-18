import { apiRequest } from '@/api/client';
import type { BillingStatus } from '@/types/domain';

export function getTenantBillingStatus() {
  return apiRequest<BillingStatus>('/tenant/billing/status');
}

export function getTenantBillingPreview() {
  return apiRequest<Record<string, unknown>>('/tenant/billing/preview');
}

export function changeTenantPlan(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/tenant/billing/change-plan', { method: 'POST', body: JSON.stringify(payload) });
}

export function createPaymentLink(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/billing/create-payment-link', { method: 'POST', body: JSON.stringify(payload) });
}
