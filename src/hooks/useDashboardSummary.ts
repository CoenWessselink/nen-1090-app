import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, getOpenDefects, getPendingInspections, getRecentAudit, getRecentExports } from '@/api/dashboard';
import { normalizeListResponse } from '@/utils/api';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });
}

export function usePendingInspectionsSummary() {
  return useQuery({
    queryKey: ['dashboard-pending-inspections'],
    queryFn: async () => normalizeListResponse(await getPendingInspections()),
  });
}

export function useOpenDefectsSummary() {
  return useQuery({
    queryKey: ['dashboard-open-defects'],
    queryFn: async () => normalizeListResponse(await getOpenDefects()),
  });
}

export function useRecentExports() {
  return useQuery({
    queryKey: ['dashboard-recent-exports'],
    queryFn: async () => {
      const payload = await getRecentExports();
      return payload ? normalizeListResponse(payload) : { items: [], total: 0, page: 1, pageSize: 10 };
    },
  });
}

export function useRecentAudit() {
  return useQuery({
    queryKey: ['dashboard-recent-audit'],
    queryFn: async () => {
      const payload = await getRecentAudit();
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      return payload.items || [];
    },
  });
}
