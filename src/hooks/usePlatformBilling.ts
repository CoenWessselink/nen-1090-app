import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelTenantSubscription, changeTenantPlatformPlan, createTenantManualPayment, getTenantBillingDetail, getTenantPayments } from '@/api/platformBilling';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';

export function useTenantBillingDetail(tenantId?: string | number) {
  return useQuery({
    queryKey: ['tenant-billing-detail', tenantId],
    queryFn: () => getTenantBillingDetail(String(tenantId)),
    enabled: Boolean(tenantId),
  });
}

export function useTenantPayments(tenantId?: string | number, params?: ListParams) {
  return useQuery({
    queryKey: ['tenant-payments', tenantId, params],
    queryFn: async () => normalizeListResponse(await getTenantPayments(String(tenantId), params)),
    enabled: Boolean(tenantId),
  });
}

export function useTenantBillingActions(tenantId?: string | number) {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-billing-detail', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-payments', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-billing-panel', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
  };

  return {
    manualPayment: useMutation({ mutationFn: (payload: Record<string, unknown>) => createTenantManualPayment(String(tenantId), payload), onSuccess: refresh }),
    cancelSubscription: useMutation({ mutationFn: (payload?: Record<string, unknown>) => cancelTenantSubscription(String(tenantId), payload || {}), onSuccess: refresh }),
    changePlan: useMutation({ mutationFn: (payload: Record<string, unknown>) => changeTenantPlatformPlan(String(tenantId), payload), onSuccess: refresh }),
  };
}
