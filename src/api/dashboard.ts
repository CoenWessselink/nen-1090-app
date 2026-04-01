import { listRequest } from '@/api/client';
import type { ApiListResponse } from '@/types/api';
import type { AuditEntry, DashboardSummary, ExportJob, Inspection, Defect } from '@/types/domain';

function emptyList<T>() {
  return { items: [] as T[], total: 0, page: 1, limit: 10 };
}

export function getDashboardSummary() {
  return listRequest<DashboardSummary>('/dashboard/summary');
}

/**
 * Live backend is proven on project-scoped exports, but recent aggregate routes are
 * not yet hard-proven. Return a stable empty payload here to prevent frontend 404 noise
 * until a dedicated recent-exports aggregate route is confirmed live.
 */
export async function getRecentExports() {
  return emptyList<ExportJob>();
}

/**
 * Live backend is proven on project-scoped audit, but recent aggregate routes are
 * not yet hard-proven. Return a stable empty payload here to prevent frontend 404 noise
 * until a dedicated recent-audit aggregate route is confirmed live.
 */
export async function getRecentAudit() {
  return [] as AuditEntry[];
}

export function getPendingInspections() {
  return listRequest<ApiListResponse<Inspection>>('/inspections', { status: 'pending', limit: 10 });
}

export function getOpenDefects() {
  return listRequest<ApiListResponse<Defect>>('/weld-defects', { status: 'open', limit: 10 });
}
