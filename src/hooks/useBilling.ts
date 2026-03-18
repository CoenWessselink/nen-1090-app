import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changeTenantPlan, createPaymentLink, getTenantBillingPreview, getTenantBillingStatus } from '@/api/billing';

export function useBillingStatus(enabled = true) {
  return useQuery({
    queryKey: ['billing-status'],
    queryFn: getTenantBillingStatus,
    enabled,
  });
}

export function useBillingPreview(enabled = true) {
  return useQuery({
    queryKey: ['billing-preview'],
    queryFn: getTenantBillingPreview,
    enabled,
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => changeTenantPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-status'] });
      queryClient.invalidateQueries({ queryKey: ['billing-preview'] });
    },
  });
}

export function useCreatePaymentLink() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createPaymentLink(payload),
  });
}
