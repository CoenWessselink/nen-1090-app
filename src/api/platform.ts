import { apiRequest, listRequest, optionalRequest } from '@/api/client';
import type { Tenant } from '@/types/domain';
import type { LoginResponse, ListParams } from '@/types/api';

export function getTenants(params?: ListParams) {
  return listRequest<Tenant[] | { items?: Tenant[] }>('/platform/tenants', params);
}

export function getTenant(tenantId: string | number) {
  return apiRequest<Tenant>(`/platform/tenants/${tenantId}`);
}

export function getTenantUsers(tenantId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/users`);
}

export function getTenantAudit(tenantId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/audit`);
}

export function getTenantBilling(tenantId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/billing`);
}

export function impersonateTenant(tenantId: string | number) {
  return optionalRequest<LoginResponse>([
    `/platform/impersonate/${tenantId}`,
    `/admin/tenants/${tenantId}/impersonate`,
    '/admin/impersonate',
  ], { method: 'POST', body: JSON.stringify({ tenant_id: tenantId }) });
}

export function exitImpersonation() {
  return optionalRequest<Record<string, unknown>>(['/platform/impersonate/exit'], { method: 'POST' });
}
