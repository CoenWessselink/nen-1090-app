import { apiRequest, listRequest } from '@/api/client';
import type { ListParams } from '@/types/api';

export function getTenantBillingDetail(tenantId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/billing`);
}

export function getTenantPayments(tenantId: string | number, params?: ListParams) {
  return listRequest<Record<string, unknown>[] | { items?: Record<string, unknown>[]; total?: number }>(`/platform/tenants/${tenantId}/payments`, params);
}

export function getTenantInvoices(tenantId: string | number) {
  return listRequest<Record<string, unknown>[] | { items?: Record<string, unknown>[]; total?: number }>(`/platform/tenants/${tenantId}/invoices`);
}

export function getTenantInvoiceDetail(tenantId: string | number, invoiceId: string) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/invoices/${invoiceId}`);
}

export function createTenantManualPayment(tenantId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/manual-payment`, { method: 'POST', body: JSON.stringify(payload) });
}

export function cancelTenantSubscription(tenantId: string | number, payload: Record<string, unknown> = {}) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/cancel-subscription`, { method: 'POST', body: JSON.stringify(payload) });
}

export function changeTenantPlatformPlan(tenantId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/change-plan`, { method: 'POST', body: JSON.stringify(payload) });
}

export function createTenantInvoice(tenantId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/invoices`, { method: 'POST', body: JSON.stringify(payload) });
}

export function sendTenantInvoice(tenantId: string | number, invoiceId: string) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/invoices/${invoiceId}/send`, { method: 'POST', body: JSON.stringify({}) });
}

export function creditTenantInvoice(tenantId: string | number, invoiceId: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/invoices/${invoiceId}/credit`, { method: 'POST', body: JSON.stringify(payload) });
}

export function overrideTenantAccessMode(tenantId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/access-mode/override`, { method: 'POST', body: JSON.stringify(payload) });
}
