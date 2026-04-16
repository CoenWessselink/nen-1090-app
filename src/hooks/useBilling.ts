import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeTenantPlan,
  createPaymentLink,
  downloadTenantInvoicePdf,
  getTenantBillingPreview,
  getTenantBillingStatus,
  getTenantBillingStatusPlus,
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

export function useBillingPreview(targetSeats?: number, enabled = true) {
  return useQuery({
    queryKey: ['billing-preview', targetSeats],
    queryFn: () => getTenantBillingPreview(targetSeats),
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
