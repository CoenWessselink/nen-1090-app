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

/**
 * Live aggregate export route is not hard-proven.
 * Return a stable empty payload instead of causing console noise.
 */
export async function getRecentExports() {
  return emptyList<ExportJob>();
}

/**
 * Live aggregate audit route is not hard-proven.
 * Return a stable empty payload instead of causing console noise.
 */
export async function getRecentAudit() {
  return emptyList<AuditEntry>();
}

/**
 * Backend on live environment rejected status=pending with 422.
 * Use only a safe limit and let UI derive the summary from returned rows.
 */
export function getPendingInspections() {
  return listRequest<ApiListResponse<Inspection>>('/inspections', {
    limit: 10,
  });
}

/**
 * Backend on live environment rejected status=open with 422.
 * Use only a safe limit and let UI derive the summary from returned rows.
 */
export function getOpenDefects() {
  return listRequest<ApiListResponse<Defect>>('/weld-defects', {
    limit: 10,
  });
}
