import { apiRequest, optionalRequest } from '@/api/client';
import type { ListParams } from '@/types/api';

function emptyListPayload() {
  return { items: [], total: 0, page: 1, limit: 25 };
}

export async function getComplianceOverview(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/compliance`,
      `/ce_export/${projectId}`,
    ])) || { score: 0, checklist: [], missing_items: [] }
  );
}

export async function getComplianceMissingItems(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/compliance/missing-items`,
      `/ce_export/${projectId}`,
    ])) || { items: [], missing_items: [] }
  );
}

export async function getComplianceChecklist(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/compliance/checklist`,
      `/ce_export/${projectId}`,
    ])) || { items: [], checklist: [] }
  );
}

export async function getCeDossier(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/ce-dossier`,
      `/ce_export/${projectId}`,
    ])) || { project_id: String(projectId), sections: [], items: [] }
  );
}

export async function getCeDocuments(_params?: ListParams) {
  return emptyListPayload();
}

export async function uploadDocument(payload: FormData) {
  return apiRequest<Record<string, unknown>>('/documents/upload', { method: 'POST', body: payload });
}

export async function getProjectExports(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown> | { items?: Record<string, unknown>[] }>([
      `/projects/${projectId}/exports`,
    ])) || emptyListPayload()
  );
}

export async function createCeReport(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/exports/ce-report`,
    ], { method: 'POST' })) || { unsupported: true, type: 'ce-report', project_id: String(projectId) }
  );
}

export async function createZipExport(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/exports/zip`,
    ], { method: 'POST' })) || { unsupported: true, type: 'zip', project_id: String(projectId) }
  );
}

export async function createPdfExport(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/exports/pdf`,
    ], { method: 'POST' })) || { unsupported: true, type: 'pdf', project_id: String(projectId) }
  );
}

export async function createExcelExport(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/exports/excel`,
    ], { method: 'POST' })) || { unsupported: true, type: 'excel', project_id: String(projectId) }
  );
}

export async function downloadProjectExport(_projectId: string | number, exportId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/exports/${exportId}/download`);
}

export async function retryProjectExport(projectId: string | number, exportId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/exports/${exportId}/retry`,
      `/ops/projects/${projectId}/exports/${exportId}/retry`,
    ], { method: 'POST' })) || { unsupported: true, export_id: String(exportId), project_id: String(projectId) }
  );
}

export async function getProjectExportPreview(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/exports/preview`,
      `/ce_export/${projectId}`,
    ])) || { project_id: String(projectId), preview: [] }
  );
}

export async function getProjectExportManifest(projectId: string | number, exportId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/exports/${exportId}/manifest`,
      `/ce_export/${projectId}`,
    ])) || { project_id: String(projectId), export_id: String(exportId), manifest: [] }
  );
}
