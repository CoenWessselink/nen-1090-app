import { useAuthStore } from '@/app/store/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginResponse, ListParams } from '@/types/api';
import {
  activateTenant,
  deactivateTenant,
  exitImpersonation,
  getPlatformSummary,
  getTenants,
  impersonateTenant,
  reactivateTenant,
  searchTenants,
  suspendTenant,
} from '@/api/platform';
import { normalizeListResponse } from '@/utils/api';

export function usePlatformSummary(enabled = true) {
  return useQuery({
    queryKey: ['platform-summary'],
    queryFn: () => getPlatformSummary(),
    enabled,
  });
}

export function useTenants(enabled = true, params?: ListParams) {
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: async () => normalizeListResponse(await getTenants(params)),
    enabled,
  });
}

export function useTenantSearch(enabled = true, params?: ListParams) {
  return useQuery({
    queryKey: ['tenant-search', params],
    queryFn: async () => normalizeListResponse(await searchTenants(params)),
    enabled,
  });
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

export function useTenantStatusActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    queryClient.invalidateQueries({ queryKey: ['tenant-search'] });
    queryClient.invalidateQueries({ queryKey: ['tenant-detail'] });
    queryClient.invalidateQueries({ queryKey: ['platform-summary'] });
  };

  return {
    activate: useMutation({ mutationFn: (tenantId: string | number) => activateTenant(tenantId), onSuccess: refresh }),
    deactivate: useMutation({ mutationFn: (tenantId: string | number) => deactivateTenant(tenantId), onSuccess: refresh }),
    suspend: useMutation({ mutationFn: (tenantId: string | number) => suspendTenant(tenantId), onSuccess: refresh }),
    reactivate: useMutation({ mutationFn: (tenantId: string | number) => reactivateTenant(tenantId), onSuccess: refresh }),
  };
}
