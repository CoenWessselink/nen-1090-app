import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTenantUser,
  deleteTenantUser,
  downloadTenantAuditCsv,
  forceLogoutTenant,
  getTenant,
  getTenantAudit,
  getTenantAuditSummary,
  getTenantBilling,
  getTenantUsers,
  patchTenantUser,
} from '@/api/platform';

export function useTenantDetail(tenantId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['tenant-detail', tenantId],
    queryFn: () => getTenant(String(tenantId)),
    enabled: enabled && Boolean(tenantId),
  });
}

export function useTenantUsers(tenantId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: () => getTenantUsers(String(tenantId)),
    enabled: enabled && Boolean(tenantId),
  });
}

export function useTenantAudit(tenantId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['tenant-audit', tenantId],
    queryFn: () => getTenantAudit(String(tenantId)),
    enabled: enabled && Boolean(tenantId),
  });
}

export function useTenantAuditSummary(tenantId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['tenant-audit-summary', tenantId],
    queryFn: () => getTenantAuditSummary(String(tenantId)),
    enabled: enabled && Boolean(tenantId),
  });
}

export function useTenantBillingPanel(tenantId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['tenant-billing-panel', tenantId],
    queryFn: () => getTenantBilling(String(tenantId)),
    enabled: enabled && Boolean(tenantId),
  });
}

export function useTenantUserActions(tenantId?: string | number) {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-audit', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-audit-summary', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-detail', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['platform-summary'] });
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
  };

  return {
    create: useMutation({ mutationFn: (payload: Record<string, unknown>) => createTenantUser(String(tenantId), payload), onSuccess: refresh }),
    patch: useMutation({ mutationFn: ({ userId, payload }: { userId: string | number; payload: Record<string, unknown> }) => patchTenantUser(String(tenantId), userId, payload), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (userId: string | number) => deleteTenantUser(String(tenantId), userId), onSuccess: refresh }),
    forceLogout: useMutation({ mutationFn: () => forceLogoutTenant(String(tenantId)), onSuccess: refresh }),
    exportCsv: useMutation({ mutationFn: () => downloadTenantAuditCsv(String(tenantId)) }),
  };
}
