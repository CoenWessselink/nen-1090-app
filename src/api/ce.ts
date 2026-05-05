import { apiRequest, downloadRequest, listRequest, optionalRequest } from '@/api/client';
import type { ListParams } from '@/types/api';
import type { ComplianceOverview, ExportJob } from '@/types/domain';

type PagedResponse<T> = T[] | { items?: T[]; total?: number; page?: number; limit?: number; data?: T[] };

function normalizePagedList<T>(response: PagedResponse<T>, fallbackLimit = 25) {
  if (Array.isArray(response)) {
    return { items: response, total: response.length, page: 1, limit: fallbackLimit || response.length || 25 };
  }
  const items = Array.isArray(response?.items) ? response.items : Array.isArray(response?.data) ? response.data : [];
  return {
    items,
    total: Number(response?.total || items.length || 0),
    page: Number(response?.page || 1),
    limit: Number(response?.limit || fallbackLimit || 25),
  };
}

function safeParams(params?: ListParams): ListParams | undefined {
  if (!params) return undefined;
  return {
    ...params,
    page: typeof params.page === 'number' && params.page > 0 ? params.page : 1,
    limit: typeof params.limit === 'number' ? Math.min(Math.max(params.limit, 1), 100) : params.limit,
  };
}

export function getComplianceOverview(projectId: string | number) {
  return apiRequest<ComplianceOverview>(`/projects/${projectId}/ce-dossier/preview`);
}

export function getComplianceMissingItems(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/ce-dossier/missing`);
}

export function getComplianceChecklist(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/ce-dossier/checklist`);
}

export function getCeDossier(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/ce-dossier/preview`);
}

export function getCeDocuments(params?: ListParams) {
  return optionalRequest<Record<string, unknown>>([
    `/documents`,
    `/attachments`,
  ]).catch(() => ({ items: [], total: 0, page: Number(params?.page || 1), limit: Number(params?.limit || 25) }));
}

export function uploadDocument(formData: FormData) {
  return optionalRequest<Record<string, unknown>>([
    `/documents/upload`,
    `/attachments/upload`,
  ], {
    method: 'POST',
    body: formData,
  });
}

export async function getProjectExports(projectId: string | number, params?: ListParams) {
  const response = await listRequest<PagedResponse<ExportJob>>(`/projects/${projectId}/exports`, safeParams(params));
  return normalizePagedList<ExportJob>(response, params?.limit || 25);
}

export function getProjectExportPreview(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/exports/preview`);
}

export function getProjectExportManifest(projectId: string | number, exportId?: string | number) {
  if (exportId) return apiRequest<Record<string, unknown>>(`/projects/${projectId}/exports/${exportId}`);
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/exports/manifest`);
}

export function createCeReport(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/exports/ce-report`, { method: 'POST' });
}

export async function createPdfExport(projectId: string | number) {
  const result = await apiRequest<Record<string, unknown>>(`/projects/${projectId}/exports/pdf`, { method: 'POST' });
  const premiumPdfPath = `/projects/${projectId}/exports/compliance/pdf?download=true&force=true`;
  const premiumViewerPath = `/projects/${projectId}/exports/compliance/pdf?download=false&force=true`;
  return {
    ...(result || {}),
    type: 'pdf',
    export_type: 'pdf',
    project_id: String(projectId),
    title: 'CE-dossier PDF',
    label: 'CE-dossier downloaden',
    download_url: (result as any)?.download_url || premiumPdfPath,
    viewer_url: (result as any)?.viewer_url || premiumViewerPath,
    fallback_download_url: premiumPdfPath,
    fallback_viewer_url: premiumViewerPath,
  };
}

export function createZipExport(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/exports/zip`, { method: 'POST' });
}

export function createExcelExport(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/exports/excel`, { method: 'POST' });
}

export function retryProjectExport(projectId: string | number, exportId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/exports/${exportId}/retry`, { method: 'POST' });
}

export function downloadProjectExport(projectId: string | number, exportId: string | number) {
  return downloadRequest(`/projects/${projectId}/exports/${exportId}/download`);
}

export function downloadPremiumCeDossierPdf(projectId: string | number) {
  return downloadRequest(`/projects/${projectId}/exports/compliance/pdf?download=true&force=true`);
}
