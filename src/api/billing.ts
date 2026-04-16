import { apiRequest, downloadUrlAsObjectUrl, openProtectedFile } from '@/api/client';
import type { BillingStatus } from '@/types/domain';

export function getTenantBillingStatus() {
  return apiRequest<BillingStatus>('/tenant/billing/status');
}

export function getTenantBillingPreview(targetSeats?: number) {
  if (typeof targetSeats === 'number' && Number.isFinite(targetSeats) && targetSeats > 0) {
    return apiRequest<Record<string, unknown>>('/tenant/billing/preview', {
      method: 'POST',
      body: JSON.stringify({ target_seats: targetSeats }),
    });
  }
  return apiRequest<Record<string, unknown>>('/tenant/billing/preview');
}

export function changeTenantPlan(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/tenant/billing/change-plan', { method: 'POST', body: JSON.stringify(payload) });
}

export function getTenantInvoices() {
  return apiRequest<{ items?: Record<string, unknown>[]; total?: number }>('/tenant/billing/invoices');
}

export function getTenantInvoice(invoiceId: string | number) {
  return apiRequest<Record<string, unknown>>(`/tenant/billing/invoices/${invoiceId}`);
}

export function getTenantBillingStatusPlus() {
  return apiRequest<Record<string, unknown>>('/tenant/billing/status-plus');
}

export function downloadTenantInvoicePdf(invoiceId: string | number) {
  return downloadUrlAsObjectUrl(`/tenant/billing/invoices/${invoiceId}/pdf`);
}

export function openTenantInvoicePdf(invoiceId: string | number) {
  return openProtectedFile(`/tenant/billing/invoices/${invoiceId}/pdf`, `invoice-${invoiceId}.pdf`);
}

export function createPaymentLink(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/billing/create-payment-link', { method: 'POST', body: JSON.stringify(payload) });
}
