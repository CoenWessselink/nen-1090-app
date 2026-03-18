import { apiRequest, listRequest, optionalRequest, uploadRequest } from '@/api/client';
import type { CeDocument, ComplianceOverview, ExportJob } from '@/types/domain';
import type { ListParams } from '@/types/api';

export function getCeDocuments(params?: ListParams) {
  if (params?.project_id || params?.projectId) {
    const projectId = params.project_id || params.projectId;
    return listRequest<CeDocument[] | { items?: CeDocument[]; data?: CeDocument[]; results?: CeDocument[] }>(`/projects/${projectId}/documents`, params);
  }
  return listRequest<CeDocument[] | { items?: CeDocument[]; data?: CeDocument[]; results?: CeDocument[] }>('/documents', params);
}

export function uploadDocument(payload: FormData) {
  return optionalRequest<unknown>(['/attachments/upload', '/documents/upload'], {
    method: 'POST',
    body: payload,
  });
}

export function getComplianceOverview(projectId: string | number) {
  return apiRequest<ComplianceOverview>(`/projects/${projectId}/compliance`);
}

export function getComplianceMissingItems(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>([`/projects/${projectId}/compliance/missing-items`]);
}

export function getComplianceChecklist(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>([`/projects/${projectId}/compliance/checklist`]);
}

export function getCeDossier(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>([`/projects/${projectId}/ce-dossier`]);
}

export function getProjectExports(projectId: string | number, params?: ListParams) {
  return listRequest<ExportJob[] | { items?: ExportJob[] }>(`/projects/${projectId}/exports`, params);
}

export function createCeReport(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/exports/ce-report`, { method: 'POST' });
}

export function createZipExport(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/exports/zip`, { method: 'POST' });
}

export function createPdfExport(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/exports/pdf`, { method: 'POST' });
}

export function createExcelExport(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>([`/projects/${projectId}/exports/excel`], { method: 'POST' });
}
