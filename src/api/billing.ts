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

export async function getTenantBillingStatusPlus() {
  try {
    return await apiRequest<Record<string, unknown>>('/tenant/billing/status-plus');
  } catch {
    const status = await getTenantBillingStatus();
    return {
      tenant_status: (status as any)?.status || 'active',
      is_active: true,
      seats_purchased: (status as any)?.seats_purchased || 1,
      price_per_seat_year_cents: (status as any)?.price_per_seat_year_cents || 0,
      subscription: {
        status: (status as any)?.status || 'active',
        access_mode: 'full_access',
        seats: (status as any)?.seats_purchased || 1,
        current_period_end: (status as any)?.valid_until || null,
      },
      access_snapshot: null,
      foundation_ready: false,
      missing_tables: ['status-plus'],
    };
  }
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
