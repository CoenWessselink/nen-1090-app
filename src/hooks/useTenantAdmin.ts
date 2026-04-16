import { useQuery } from '@tanstack/react-query';
import { getTenant, getTenantAudit, getTenantBilling, getTenantUsers } from '@/api/platform';
import { normalizeListResponse } from '@/utils/api';
import type { AuditSummary, Tenant, TenantUser } from '@/types/domain';

export function useTenantDetail(tenantId?: string | number, enabled = true) {
  return useQuery<Tenant>({
    queryKey: ['tenant-detail', tenantId],
    queryFn: () => getTenant(String(tenantId)),
    enabled: enabled && Boolean(tenantId),
  });
}

export function useTenantUsers(tenantId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: async () => {
      const payload = await getTenantUsers(String(tenantId));
      return normalizeListResponse<TenantUser>(payload);
    },
    enabled: enabled && Boolean(tenantId),
  });
}

export function useTenantAudit(tenantId?: string | number, enabled = true) {
  return useQuery({
    queryKey: ['tenant-audit', tenantId],
    queryFn: async () => {
      const payload = await getTenantAudit(String(tenantId));
      return normalizeListResponse<AuditSummary>(payload);
    },
    enabled: enabled && Boolean(tenantId),
  });
}

export function useTenantBillingPanel(tenantId?: string | number, enabled = true) {
  return useQuery<Record<string, unknown>>({
    queryKey: ['tenant-billing-panel', tenantId],
    queryFn: () => getTenantBilling(String(tenantId)),
    enabled: enabled && Boolean(tenantId),
  });
}
