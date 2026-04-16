import client, { apiRequest, downloadUrlAsObjectUrl, listRequest, optionalRequest } from '@/api/client';
import type {
  AuditSummary,
  PlatformSummary,
  Tenant,
  TenantCreateInput,
  TenantPatchInput,
  TenantUser,
  TenantUserCreateInput,
  TenantUserPatchInput,
} from '@/types/domain';
import type { LoginResponse, ListParams } from '@/types/api';

export function getTenants(params?: ListParams) {
  return listRequest<Tenant[] | { items?: Tenant[] }>('/platform/tenants', params);
}

export function getTenant(tenantId: string | number) {
  return apiRequest<Tenant>(`/platform/tenants/${tenantId}`);
}

export function createTenant(payload: TenantCreateInput) {
  return client.post<Tenant>('/platform/tenants', payload);
}

export function patchTenant(tenantId: string | number, payload: TenantPatchInput) {
  return client.patch<Tenant>(`/platform/tenants/${tenantId}`, payload);
}

export function startTenantTrial(tenantId: string | number) {
  return client.post<Tenant>(`/platform/tenants/${tenantId}/trial/start`, {});
}

export function activateTenant(tenantId: string | number) {
  return patchTenant(tenantId, { is_active: true, status: 'active' });
}

export function deactivateTenant(tenantId: string | number) {
  return patchTenant(tenantId, { is_active: false, status: 'inactive' });
}

export function suspendTenant(tenantId: string | number) {
  return patchTenant(tenantId, { is_active: false, status: 'suspended' });
}

export function reactivateTenant(tenantId: string | number) {
  return patchTenant(tenantId, { is_active: true, status: 'active' });
}

export async function getPlatformSummary(): Promise<PlatformSummary> {
  const payload = await getTenants({ limit: 200 });
  const rows = Array.isArray(payload) ? payload : payload.items || [];
  const active = rows.filter((tenant) => String(tenant.status || tenant.subscription_status || '').toLowerCase() === 'active' || tenant.is_active).length;
  const suspended = rows.filter((tenant) => String(tenant.status || '').toLowerCase() === 'suspended').length;
  const totalUsers = rows.reduce((sum, tenant) => sum + Number(tenant.users_count ?? tenant.user_count ?? 0), 0);
  const totalSeats = rows.reduce((sum, tenant) => sum + Number(tenant.seats_purchased ?? 0), 0);
  return {
    total_tenants: rows.length,
    active_tenants: active,
    inactive_tenants: Math.max(rows.length - active - suspended, 0),
    suspended_tenants: suspended,
    total_users: totalUsers,
    total_seats: totalSeats,
  };
}

export async function searchTenants(query: string) {
  const payload = await getTenants({ limit: 200 });
  const rows = Array.isArray(payload) ? payload : payload.items || [];
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((tenant) => `${tenant.name || ''} ${tenant.id || ''} ${tenant.status || ''} ${tenant.subscription_status || ''}`.toLowerCase().includes(needle));
}

export function getTenantUsers(tenantId: string | number) {
  return apiRequest<TenantUser[] | { items?: TenantUser[] }>(`/platform/tenants/${tenantId}/users`);
}

export function createTenantUser(tenantId: string | number, payload: TenantUserCreateInput) {
  return client.post<TenantUser>(`/platform/tenants/${tenantId}/users`, payload);
}

export function patchTenantUser(tenantId: string | number, userId: string, payload: TenantUserPatchInput) {
  return client.patch<TenantUser>(`/platform/tenants/${tenantId}/users/${userId}`, payload);
}

export function getTenantAudit(tenantId: string | number) {
  return apiRequest<AuditSummary[] | { items?: AuditSummary[] }>(`/platform/tenants/${tenantId}/audit`);
}

export function getTenantBilling(tenantId: string | number) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/billing`);
}

export function forceLogoutTenant(tenantId: string | number) {
  return client.post<Record<string, unknown>>(`/platform/tenants/${tenantId}/force_logout`, {});
}

export function exportTenantsCsv() {
  return downloadUrlAsObjectUrl('/platform/tenants.csv');
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


export function resendTenantUserInvite(tenantId: string | number, userId: string) {
  return client.post<Record<string, unknown>>(`/platform/tenants/${tenantId}/users/${userId}/resend-invite`, {});
}

export function resetTenantUserPassword(tenantId: string | number, userId: string) {
  return client.post<Record<string, unknown>>(`/platform/tenants/${tenantId}/users/${userId}/reset-password`, {});
}

export function deleteTenantUser(tenantId: string | number, userId: string) {
  return apiRequest<Record<string, unknown>>(`/platform/tenants/${tenantId}/users/${userId}`, { method: 'DELETE' });
}
