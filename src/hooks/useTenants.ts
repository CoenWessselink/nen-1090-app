import { useAuthStore } from '@/app/store/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateTenant,
  createTenant,
  deactivateTenant,
  exitImpersonation,
  exportTenantsCsv,
  getPlatformSummary,
  getTenants,
  impersonateTenant,
  reactivateTenant,
  searchTenants,
  startTenantTrial,
  suspendTenant,
} from '@/api/platform';
import { normalizeListResponse } from '@/utils/api';
import type { LoginResponse, ListParams } from '@/types/api';
import type { TenantCreateInput } from '@/types/domain';

export function useTenants(enabled = true, params?: ListParams) {
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: async () => normalizeListResponse(await getTenants(params)),
    enabled,
  });
}

export function usePlatformSummary(enabled = true) {
  return useQuery({
    queryKey: ['platform-summary'],
    queryFn: () => getPlatformSummary(),
    enabled,
  });
}

export function useTenantSearch(search: string, enabled = true) {
  return useQuery({
    queryKey: ['tenant-search', search],
    queryFn: () => searchTenants(search),
    enabled: enabled && Boolean(search.trim()),
  });
}

export function useTenantActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    queryClient.invalidateQueries({ queryKey: ['platform-summary'] });
  };

  return {
    createTenant: useMutation({ mutationFn: (payload: TenantCreateInput) => createTenant(payload), onSuccess: refresh }),
    activateTenant: useMutation({ mutationFn: (tenantId: string | number) => activateTenant(tenantId), onSuccess: refresh }),
    deactivateTenant: useMutation({ mutationFn: (tenantId: string | number) => deactivateTenant(tenantId), onSuccess: refresh }),
    suspendTenant: useMutation({ mutationFn: (tenantId: string | number) => suspendTenant(tenantId), onSuccess: refresh }),
    reactivateTenant: useMutation({ mutationFn: (tenantId: string | number) => reactivateTenant(tenantId), onSuccess: refresh }),
    startTrial: useMutation({ mutationFn: (tenantId: string | number) => startTenantTrial(tenantId), onSuccess: refresh }),
    exportCsv: useMutation({ mutationFn: () => exportTenantsCsv() }),
  };
}

export function useImpersonateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tenantId: string | number) => (await impersonateTenant(tenantId)) as LoginResponse,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });
}

export function useExitImpersonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => exitImpersonation(),
    onSuccess: () => {
      useAuthStore.getState().stopImpersonation();
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}
