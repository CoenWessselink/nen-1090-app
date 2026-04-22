import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTenantUser,
  deactivatePlatformUser,
  deleteTenantUser,
  forceLogoutTenant,
  getTenant,
  getTenantAccessHistory,
  getTenantAudit,
  getTenantBilling,
  getTenantPermissionsSummary,
  getTenantBillingEvents,
  getTenantUsers,
  patchTenantUser,
  reactivatePlatformUser,
  resendTenantUserInvite,
  resetTenantUserPassword,
} from '@/api/platform';
import { normalizeListResponse } from '@/utils/api';
import type { TenantUserCreateInput, TenantUserPatchInput } from '@/types/domain';

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
    queryFn: async () => {
      const payload = await getTenantUsers(String(tenantId));
      return normalizeListResponse(payload);
    },
    enabled: enabled && Boolean(tenantId),
  });
}

export function useTenantAudit(tenantId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['tenant-audit', tenantId],
    queryFn: async () => {
      const payload = await getTenantAudit(String(tenantId));
      return normalizeListResponse(payload);
    },
    enabled: enabled && Boolean(tenantId),
  });
}



export function useTenantAccessHistory(tenantId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['tenant-access-history', tenantId],
    queryFn: async () => {
      const payload = await getTenantAccessHistory(String(tenantId));
      return normalizeListResponse(payload);
    },
    enabled: enabled && Boolean(tenantId),
  });
}

export function useTenantBillingEvents(tenantId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['tenant-billing-events', tenantId],
    queryFn: async () => {
      const payload = await getTenantBillingEvents(String(tenantId));
      return normalizeListResponse(payload);
    },
    enabled: enabled && Boolean(tenantId),
  });
}


export function useTenantPermissionsSummary(tenantId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['tenant-permissions-summary', tenantId],
    queryFn: () => getTenantPermissionsSummary(String(tenantId)),
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
    queryClient.invalidateQueries({ queryKey: ['tenant-detail', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-audit', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-access-history', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-billing-events', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-permissions-summary', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    queryClient.invalidateQueries({ queryKey: ['platform-summary'] });
  };

  return {
    createUser: useMutation({
      mutationFn: (payload: TenantUserCreateInput) => createTenantUser(String(tenantId), payload),
      onSuccess: refresh,
    }),
    patchUser: useMutation({
      mutationFn: ({ userId, payload }: { userId: string; payload: TenantUserPatchInput }) => patchTenantUser(String(tenantId), userId, payload),
      onSuccess: refresh,
    }),
    resendInvite: useMutation({
      mutationFn: (userId: string) => resendTenantUserInvite(String(tenantId), userId),
      onSuccess: refresh,
    }),
    resetPassword: useMutation({
      mutationFn: (userId: string) => resetTenantUserPassword(String(tenantId), userId),
      onSuccess: refresh,
    }),
    deleteUser: useMutation({
      mutationFn: (userId: string) => deleteTenantUser(String(tenantId), userId),
      onSuccess: refresh,
    }),
    deactivateUser: useMutation({
      mutationFn: (userId: string) => deactivatePlatformUser(userId, tenantId),
      onSuccess: refresh,
    }),
    reactivateUser: useMutation({
      mutationFn: (userId: string) => reactivatePlatformUser(userId, tenantId),
      onSuccess: refresh,
    }),
    forceLogout: useMutation({
      mutationFn: () => forceLogoutTenant(String(tenantId)),
      onSuccess: refresh,
    }),
  };
}
