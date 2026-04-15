import { apiRequest, downloadRequest, listRequest, optionalRequest } from '@/api/client';
import type { LoginResponse, ListParams } from '@/types/api';
import type { AuditEntry, AuditSummary, PlatformSummary, Tenant, TenantUser } from '@/types/domain';

export function getPlatformSummary() {
  return apiRequest<PlatformSummary>('/platform/summary');
}

export function getTenants(params?: ListParams) {
  return listRequest<Tenant[] | { items?: Tenant[] }>('/platform/tenants', params);
}

export function searchTenants(params?: ListParams) {
  return listRequest<Tenant[] | { items?: Tenant[] }>('/platform/tenants/search', params);
}

export function getTenant(tenantId: string | number) {
  return apiRequest<Tenant>(`/platform/tenants/${tenantId}`);
}

export function createTenant(payload: Record<string, unknown>) {
  return apiRequest<Tenant>('/platform/tenants', { method: 'POST', body: JSON.stringify(payload) });
}

export function patchTenant(tenantId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Tenant>(`/platform/tenants/${tenantId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function activateTenant(tenantId: string | number) {
  return apiRequest<Tenant>(`/platform/tenants/${tenantId}/activate`, { method: 'POST' });
}

export function deactivateTenant(tenantId: string | number) {
  return apiRequest<Tenant>(`/platform/tenants/${tenantId}/deactivate`, { method: 'POST' });
}

export function suspendTenant(tenantId: string | number) {
  return apiRequest<Tenant>(`/platform/tenants/${tenantId}/suspend`, { method: 'POST' });
}

export function reactivateTenant(tenantId: string | number) {
  return apiRequest<Tenant>(`/platform/tenants/${tenantId}/reactivate`, { method: 'POST' });
}

export function getTenantUsers(tenantId: string | number) {
  return apiRequest<TenantUser[]>(`/platform/tenants/${tenantId}/users`);
}

export function createTenantUser(tenantId: string | number, payload: Record<string, unknown>) {
  return apiRequest<TenantUser>(`/platform/tenants/${tenantId}/users`, { method: 'POST', body: JSON.stringify(payload) });
}

export function patchTenantUser(tenantId: string | number, userId: string | number, payload: Record<string, unknown>) {
  return apiRequest<TenantUser>(`/platform/tenants/${tenantId}/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteTenantUser(tenantId: string | number, userId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/users/${userId}`, { method: 'DELETE' });
}

export function getTenantAudit(tenantId: string | number) {
  return apiRequest<AuditEntry[]>(`/platform/tenants/${tenantId}/audit`);
}

export function getTenantAuditSummary(tenantId: string | number) {
  return apiRequest<AuditSummary>(`/platform/tenants/${tenantId}/audit/summary`);
}

export function downloadTenantAuditCsv(tenantId: string | number) {
  return downloadRequest(`/platform/tenants/${tenantId}/audit/export.csv`);
}

export function getTenantBilling(tenantId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/billing`);
}

export function forceLogoutTenant(tenantId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/force_logout`, { method: 'POST' });
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
