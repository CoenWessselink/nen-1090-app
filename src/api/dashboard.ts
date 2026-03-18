import { apiRequest, listRequest, optionalRequest } from '@/api/client';
import type { DashboardSummary, ExportJob, Inspection, Defect } from '@/types/domain';
import type { PaginatedApiResponse } from '@/types/api';

export function getDashboardSummary() {
  return optionalRequest<DashboardSummary>(['/dashboard/summary']);
}

export function getRecentExports() {
  return optionalRequest<PaginatedApiResponse<ExportJob> | ExportJob[]>(['/exports/recent']);
}

export function getRecentAudit() {
  return optionalRequest<Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> }>(['/audit/recent']);
}

export function getPendingInspections() {
  return listRequest<PaginatedApiResponse<Inspection> | Inspection[]>('/inspections', { status: 'pending', limit: 10 });
}

export function getOpenDefects() {
  return listRequest<PaginatedApiResponse<Defect> | Defect[]>('/weld-defects', { status: 'open', limit: 10 });
}
