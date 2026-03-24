import { apiRequest } from '@/api/client';

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

export function getProjectExports(_projectId: string | number) {
  return Promise.resolve([]);
}

export function createCeReport(_projectId: string | number) {
  throw new Error('Exportjobs worden niet ondersteund door de huidige live API. Gebruik het CE-overzicht op basis van /ce_export.');
}

export function createZipExport(_projectId: string | number) {
  throw new Error('ZIP-export wordt niet ondersteund door de huidige live API.');
}

export function createPdfExport(_projectId: string | number) {
  throw new Error('PDF-export wordt niet ondersteund door de huidige live API.');
}

export function createExcelExport(_projectId: string | number) {
  throw new Error('Excel-export wordt niet ondersteund door de huidige live API.');
}

export function downloadProjectExport(_projectId: string | number, _exportId: string | number) {
  throw new Error('Download van exportjobs wordt niet ondersteund door de huidige live API.');
}

export function retryProjectExport(_projectId: string | number, _exportId: string | number) {
  throw new Error('Retry van exportjobs wordt niet ondersteund door de huidige live API.');
}

export async function getProjectExportPreview(projectId: string | number) {
  return getCeDossier(projectId);
}

export async function getProjectExportManifest(projectId: string | number, _exportId: string | number) {
  return getCeDossier(projectId);
}
