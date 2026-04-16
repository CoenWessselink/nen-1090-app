import { useAuthStore } from '@/app/store/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from '@/utils/api';
import type { LoginResponse, ListParams } from '@/types/api';
import { activateTenant, deactivateTenant, exitImpersonation, getPlatformSummary, getTenants, impersonateTenant, reactivateTenant, searchTenants, suspendTenant } from '@/api/platform';

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

export function useTenantSearch(query: string, enabled = true, params?: ListParams) {
  return useQuery({
    queryKey: ['tenant-search', query, params],
    queryFn: async () => normalizeListResponse(await searchTenants(query, params)),
    enabled: enabled && query.trim().length > 0,
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

function useTenantStatusMutation(mutationKey: string[], mutationFn: (tenantId: string | number) => Promise<Record<string, unknown>>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey,
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-summary'] });
    },
  });
}

export function useActivateTenant() { return useTenantStatusMutation(['tenant-activate'], activateTenant); }
export function useDeactivateTenant() { return useTenantStatusMutation(['tenant-deactivate'], deactivateTenant); }
export function useSuspendTenant() { return useTenantStatusMutation(['tenant-suspend'], suspendTenant); }
export function useReactivateTenant() { return useTenantStatusMutation(['tenant-reactivate'], reactivateTenant); }
