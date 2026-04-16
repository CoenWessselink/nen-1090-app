import { apiRequest } from '@/api/client';
import type { BillingStatus } from '@/types/domain';

export function getTenantBillingStatus() {
  return apiRequest<BillingStatus>('/tenant/billing/status-plus');
}

export function getTenantBillingPreview(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/tenant/billing/preview', { method: 'POST', body: JSON.stringify(payload) });
}

export function changeTenantPlan(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/tenant/billing/change-plan', { method: 'POST', body: JSON.stringify(payload) });
}

export function getTenantInvoices() {
  return apiRequest<Record<string, unknown>>('/tenant/billing/invoices');
}

export function createPaymentLink(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/billing/create-payment-link', { method: 'POST', body: JSON.stringify(payload) });
}

export function getTenantInvoiceDetail(invoiceId: string) {
  return apiRequest<Record<string, unknown>>(`/tenant/billing/invoices/${invoiceId}`);
}
