import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeTenantPlan,
  createPaymentLink,
  getTenantBillingPreview,
  getTenantBillingStatus,
  getTenantInvoiceDetail,
  getTenantInvoices,
} from '@/api/billing';

export function useBillingStatus(enabled = true) {
  return useQuery({
    queryKey: ['billing-status'],
    queryFn: getTenantBillingStatus,
    enabled,
  });
}

export function useBillingPreview(targetSeats: number, enabled = true) {
  return useQuery({
    queryKey: ['billing-preview', targetSeats],
    queryFn: () => getTenantBillingPreview({ target_seats: targetSeats }),
    enabled,
  });
}

export function useBillingInvoices(enabled = true) {
  return useQuery({
    queryKey: ['billing-invoices'],
    queryFn: getTenantInvoices,
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
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-billing-invoices'] });
    },
  });
}

export function useCreatePaymentLink() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createPaymentLink(payload),
  });
}

export function useTenantBillingInvoices() {
  return useQuery({
    queryKey: ['tenant-billing-invoices'],
    queryFn: () => getTenantInvoices() as Promise<{ items?: Record<string, unknown>[] }>,
  });
}

export function useTenantBillingInvoiceDetail(invoiceId?: string) {
  return useQuery({
    queryKey: ['tenant-billing-invoice-detail', invoiceId],
    queryFn: () => getTenantInvoiceDetail(String(invoiceId)),
    enabled: Boolean(invoiceId),
  });
}

export function useTenantBillingMutations() {
  const queryClient = useQueryClient();
  return {
    changePlan: useMutation({
      mutationFn: (payload: Record<string, unknown>) => changeTenantPlan(payload),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['billing-status'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-billing-invoices'] });
      },
    }),
  };
}
