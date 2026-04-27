import { listRequest } from '@/api/client';
import type { ApiListResponse } from '@/types/api';
import type { AuditEntry, DashboardSummary, ExportJob, Inspection, Defect } from '@/types/domain';

function emptyList<T>() {
  return {
    items: [] as T[],
    total: 0,
    page: 1,
    limit: 10,
  };
}

export function getDashboardSummary() {
  return listRequest<DashboardSummary>('/dashboard/summary');
}

export async function getRecentExports() {
  return emptyList<ExportJob>();
}

export async function getRecentAudit() {
  return emptyList<AuditEntry>();
}

export function getPendingInspections() {
  return listRequest<ApiListResponse<Inspection>>('/inspections', {
    limit: 10,
  });
}

export function getOpenDefects() {
  return listRequest<ApiListResponse<Defect>>('/weld-defects', {
    limit: 10,
  });
}
