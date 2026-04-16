import { apiRequest, listRequest, optionalRequest } from '@/api/client';
import type { AuditSummary, PlatformSummary, Tenant, TenantUser } from '@/types/domain';
import type { LoginResponse, ListParams } from '@/types/api';

export function getPlatformSummary() {
  return apiRequest<PlatformSummary>('/platform/summary');
}

export function getTenants(params?: ListParams) {
  return listRequest<Tenant[] | { items?: Tenant[]; total?: number }>('/platform/tenants', params);
}

export function searchTenants(query: string, params?: ListParams) {
  return listRequest<Tenant[] | { items?: Tenant[]; total?: number }>('/platform/tenants/search', { ...(params || {}), q: query } as ListParams);
}

export function getTenant(tenantId: string | number) {
  return apiRequest<Tenant>(`/platform/tenants/${tenantId}`);
}

export function activateTenant(tenantId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/activate`, { method: 'POST' });
}

export function deactivateTenant(tenantId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/deactivate`, { method: 'POST' });
}

export function suspendTenant(tenantId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/suspend`, { method: 'POST' });
}

export function reactivateTenant(tenantId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/reactivate`, { method: 'POST' });
}

export function getTenantUsers(tenantId: string | number) {
  return apiRequest<TenantUser[] | { items?: TenantUser[] }>(`/platform/tenants/${tenantId}/users`);
}

export function getTenantAudit(tenantId: string | number) {
  return apiRequest<AuditSummary[] | { items?: AuditSummary[] }>(`/platform/tenants/${tenantId}/audit`);
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
