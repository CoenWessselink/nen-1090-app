import { useAuthStore } from '@/app/store/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from '@/utils/api';
import type { LoginResponse, ListParams } from '@/types/api';
import { exitImpersonation, getTenants, impersonateTenant } from '@/api/platform';

export function useTenants(enabled = true, params?: ListParams) {
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: async () => normalizeListResponse(await getTenants(params)),
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
