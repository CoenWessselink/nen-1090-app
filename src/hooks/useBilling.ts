import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeTenantPlan,
  createPaymentLink,
  cancelTenantSubscriptionSelfService,
  downloadTenantInvoicePdf,
  getTenantBillingPreview,
  getTenantBillingStatus,
  getTenantBillingStatusPlus,
  getTenantBillingPlans,
  getTenantAccessRuntime,
  getTenantInvoice,
  getTenantInvoices,
  openTenantInvoicePdf,
} from '@/api/billing';
import { normalizeListResponse } from '@/utils/api';

export function useBillingStatus(enabled = true) {
  return useQuery({
    queryKey: ['billing-status'],
    queryFn: getTenantBillingStatus,
    enabled,
  });
}

export function useBillingStatusPlus(enabled = true) {
  return useQuery({
    queryKey: ['billing-status-plus'],
    queryFn: getTenantBillingStatusPlus,
    enabled,
  });
}

export function useBillingPreview(targetSeats?: number, targetPlan?: string, enabled = true) {
  return useQuery({
    queryKey: ['billing-preview', targetSeats, targetPlan],
    queryFn: () => getTenantBillingPreview(targetSeats, targetPlan),
    enabled,
  });
}


export function useBillingPlans(enabled = true) {
  return useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => normalizeListResponse(await getTenantBillingPlans()),
    enabled,
  });
}

export function useBillingInvoices(enabled = true) {
  return useQuery({
    queryKey: ['billing-invoices'],
    queryFn: async () => normalizeListResponse(await getTenantInvoices()),
    enabled,
  });
}

export function useBillingInvoice(invoiceId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['billing-invoice', invoiceId],
    queryFn: () => getTenantInvoice(String(invoiceId)),
    enabled: enabled && Boolean(invoiceId),
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => changeTenantPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-status'] });
      queryClient.invalidateQueries({ queryKey: ['billing-status-plus'] });
      queryClient.invalidateQueries({ queryKey: ['billing-preview'] });
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
  });
}

export function useCreatePaymentLink() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createPaymentLink(payload),
  });
}

export function useInvoicePdfActions() {
  return {
    downloadInvoicePdf: useMutation({ mutationFn: (invoiceId: string | number) => downloadTenantInvoicePdf(invoiceId) }),
    openInvoicePdf: useMutation({ mutationFn: (invoiceId: string | number) => openTenantInvoicePdf(invoiceId) }),
  };
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelTenantSubscriptionSelfService(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-status'] });
      queryClient.invalidateQueries({ queryKey: ['billing-status-plus'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
  });
}


export function useTenantAccessRuntime(enabled = true) {
  return useQuery({
    queryKey: ['tenant-access-runtime'],
    queryFn: getTenantAccessRuntime,
    enabled,
  });
}
