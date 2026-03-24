import { apiRequest, listRequest, uploadRequest } from '@/api/client';
import type { ListParams } from '@/types/api';

export function getComplianceOverview(_projectId: string | number) {
  return Promise.resolve({ score: 0, checklist: [], missing_items: [] });
}
export function getComplianceMissingItems(_projectId: string | number) {
  return Promise.resolve({ items: [] });
}
export function getComplianceChecklist(_projectId: string | number) {
  return Promise.resolve({ items: [] });
}
export async function getCeDossier(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/ce_export/${projectId}`);
}
export function getCeDocuments(params?: ListParams) {
  const projectId = params?.project_id || params?.projectId;
  return listRequest<Record<string, unknown>[]>('/documents', projectId ? { ...params, project_id: String(projectId) } : params);
}
export function uploadDocument(payload: FormData) {
  return uploadRequest<Record<string, unknown>>('/documents', payload);
}
export function getProjectExports(_projectId: string | number) { return Promise.resolve([]); }
export async function createCeReport(_projectId: string | number) { throw new Error('Exportjobs worden niet ondersteund door de huidige live API. Gebruik /ce_export.'); }
export async function createZipExport(_projectId: string | number) { throw new Error('ZIP-export wordt niet ondersteund door de huidige live API.'); }
export async function createPdfExport(_projectId: string | number) { throw new Error('PDF-export wordt niet ondersteund door de huidige live API.'); }
export async function createExcelExport(_projectId: string | number) { throw new Error('Excel-export wordt niet ondersteund door de huidige live API.'); }
export async function downloadProjectExport(_projectId: string | number, _exportId: string | number) { throw new Error('Download van exportjobs wordt niet ondersteund door de huidige live API.'); }
export async function retryProjectExport(_projectId: string | number, _exportId: string | number) { throw new Error('Retry van exportjobs wordt niet ondersteund door de huidige live API.'); }
export async function getProjectExportPreview(projectId: string | number) { return getCeDossier(projectId); }
export async function getProjectExportManifest(projectId: string | number, _exportId: string | number) { return getCeDossier(projectId); }
