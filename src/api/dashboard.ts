import { listRequest, optionalRequest } from '@/api/client';
import type { ApiListResponse } from '@/types/api';
import type { AuditEntry, DashboardSummary, ExportJob, Inspection, Defect } from '@/types/domain';

export function getDashboardSummary() {
  return optionalRequest<DashboardSummary>(['/dashboard/summary']);
}

export function getRecentExports() {
  return optionalRequest<ApiListResponse<ExportJob>>(['/exports/recent']);
}

export function getRecentAudit() {
  return optionalRequest<ApiListResponse<AuditEntry>>(['/audit/recent']);
}

export function getPendingInspections() {
  return listRequest<ApiListResponse<Inspection>>('/inspections', { status: 'pending', limit: 10 });
}

export function getOpenDefects() {
  return listRequest<ApiListResponse<Defect>>('/weld-defects', { status: 'open', limit: 10 });
}
