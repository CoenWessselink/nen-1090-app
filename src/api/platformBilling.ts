import { apiRequest, listRequest } from '@/api/client';
import type { ListParams } from '@/types/api';
import type {
  AccessModeOverridePayload,
  BillingInvoice,
  CancelTenantSubscriptionPayload,
  ChangeTenantPlatformPlanPayload,
  CreateTenantInvoicePayload,
  CreditTenantInvoicePayload,
  EnterpriseActionResponse,
  EnterpriseListResponse,
  ManualPaymentPayload,
  PlatformBillingOverview,
  TenantBillingPanel,
} from '@/api/enterpriseTypes';
import type { BillingPayment, BillingPlan } from '@/types/domain';

export function getTenantBillingDetail(tenantId: string | number) {
  return apiRequest<TenantBillingPanel>(`/platform/tenants/${tenantId}/billing`);
}

export function getPlatformBillingOverview() {
  return apiRequest<PlatformBillingOverview>('/platform/billing/overview');
}

export function getTenantPayments(tenantId: string | number, params?: ListParams) {
  return listRequest<EnterpriseListResponse<BillingPayment>>(`/platform/tenants/${tenantId}/payments`, params);
}

export function getTenantInvoices(tenantId: string | number) {
  return listRequest<EnterpriseListResponse<BillingInvoice>>(`/platform/tenants/${tenantId}/invoices`);
}

export function getTenantInvoiceDetail(tenantId: string | number, invoiceId: string) {
  return apiRequest<BillingInvoice>(`/platform/tenants/${tenantId}/invoices/${invoiceId}`);
}

export function createTenantManualPayment(tenantId: string | number, payload: ManualPaymentPayload) {
  return apiRequest<EnterpriseActionResponse>(`/platform/tenants/${tenantId}/manual-payment`, { method: 'POST', body: JSON.stringify(payload) });
}

export function cancelTenantSubscription(tenantId: string | number, payload: CancelTenantSubscriptionPayload = {}) {
  return apiRequest<EnterpriseActionResponse>(`/platform/tenants/${tenantId}/cancel-subscription`, { method: 'POST', body: JSON.stringify(payload) });
}

export function changeTenantPlatformPlan(tenantId: string | number, payload: ChangeTenantPlatformPlanPayload) {
  return apiRequest<EnterpriseActionResponse>(`/platform/tenants/${tenantId}/change-plan`, { method: 'POST', body: JSON.stringify(payload) });
}

export function createTenantInvoice(tenantId: string | number, payload: CreateTenantInvoicePayload) {
  return apiRequest<EnterpriseActionResponse>(`/platform/tenants/${tenantId}/invoices`, { method: 'POST', body: JSON.stringify(payload) });
}

export function sendTenantInvoice(tenantId: string | number, invoiceId: string) {
  return apiRequest<EnterpriseActionResponse>(`/platform/tenants/${tenantId}/invoices/${invoiceId}/send`, { method: 'POST', body: JSON.stringify({}) });
}

export function creditTenantInvoice(tenantId: string | number, invoiceId: string, payload: CreditTenantInvoicePayload) {
  return apiRequest<EnterpriseActionResponse>(`/platform/tenants/${tenantId}/invoices/${invoiceId}/credit`, { method: 'POST', body: JSON.stringify(payload) });
}

export function overrideTenantAccessMode(tenantId: string | number, payload: AccessModeOverridePayload) {
  return apiRequest<EnterpriseActionResponse>(`/platform/tenants/${tenantId}/access-mode/override`, { method: 'POST', body: JSON.stringify(payload) });
}


export function getPlatformBillingPlans() {
  return apiRequest<EnterpriseListResponse<BillingPlan>>(`/platform/billing/plans`);
}
