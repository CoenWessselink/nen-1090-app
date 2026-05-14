import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeTenantPlan,
  cancelTenantSubscriptionSelfService,
  getTenantBillingPreview,
  getTenantBillingStatus,
} from '@/api/billing';
import type { BillingCheckoutRequest, BillingPreviewRequest } from '@/api/billing';

export function useBillingStatus(enabled = true) {
  return useQuery({
    queryKey: ['billing-status'],
    queryFn: getTenantBillingStatus,
    enabled,
  });
}

export function useBillingPreview(payload?: BillingPreviewRequest, enabled = true) {
  return useQuery({
    queryKey: ['billing-preview', payload],
    queryFn: () => getTenantBillingPreview(payload),
    enabled,
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BillingCheckoutRequest) => changeTenantPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-status'] });
      queryClient.invalidateQueries({ queryKey: ['billing-preview'] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelTenantSubscriptionSelfService(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-status'] });
    },
  });
}
