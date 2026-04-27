import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelTenantSubscription,
  changeTenantPlatformPlan,
  createTenantInvoice,
  createTenantManualPayment,
  creditTenantInvoice,
  getTenantBillingDetail,
  getTenantInvoiceDetail,
  getTenantInvoices,
  getTenantPayments,
  getPlatformBillingPlans,
  overrideTenantAccessMode,
  sendTenantInvoice,
} from '@/api/platformBilling';
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

export function useTenantInvoices(tenantId?: string | number) {
  return useQuery({
    queryKey: ['tenant-invoices', tenantId],
    queryFn: async () => normalizeListResponse(await getTenantInvoices(String(tenantId))),
    enabled: Boolean(tenantId),
  });
}

export function useTenantInvoiceDetail(tenantId?: string | number, invoiceId?: string) {
  return useQuery({
    queryKey: ['tenant-invoice-detail', tenantId, invoiceId],
    queryFn: () => getTenantInvoiceDetail(String(tenantId), String(invoiceId)),
    enabled: Boolean(tenantId && invoiceId),
  });
}


export function usePlatformBillingPlans(enabled = true) {
  return useQuery({
    queryKey: ['platform-billing-plans'],
    queryFn: async () => normalizeListResponse(await getPlatformBillingPlans()),
    enabled,
  });
}

export function useTenantBillingActions(tenantId?: string | number) {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-billing-detail', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-payments', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-invoices', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenant-billing-panel', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
  };

  return {
    manualPayment: useMutation({ mutationFn: (payload: Record<string, unknown>) => createTenantManualPayment(String(tenantId), payload), onSuccess: refresh }),
    cancelSubscription: useMutation({ mutationFn: (payload?: Record<string, unknown>) => cancelTenantSubscription(String(tenantId), payload || {}), onSuccess: refresh }),
    changePlan: useMutation({ mutationFn: (payload: Record<string, unknown>) => changeTenantPlatformPlan(String(tenantId), payload), onSuccess: refresh }),
    createInvoice: useMutation({ mutationFn: (payload: Record<string, unknown>) => createTenantInvoice(String(tenantId), payload), onSuccess: refresh }),
    sendInvoice: useMutation({ mutationFn: (invoiceId: string) => sendTenantInvoice(String(tenantId), invoiceId), onSuccess: refresh }),
    creditInvoice: useMutation({ mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: Record<string, unknown> }) => creditTenantInvoice(String(tenantId), invoiceId, payload), onSuccess: refresh }),
    overrideAccessMode: useMutation({ mutationFn: (payload: Record<string, unknown>) => overrideTenantAccessMode(String(tenantId), payload), onSuccess: refresh }),
  };
}
