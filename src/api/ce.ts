import { downloadRequest, optionalRequest, uploadRequest } from '@/api/client';
import { withQuery } from '@/utils/api';
import type { CeDocument, ComplianceOverview, ExportJob } from '@/types/domain';
import type { ListParams } from '@/types/api';

type ListLike<T> = T[] | { items?: T[]; data?: T[]; results?: T[] };

function emptyList<T>(params?: ListParams): { items: T[]; total: number; page: number; limit: number } {
  return {
    items: [],
    total: 0,
    page: Number(params?.page || 1),
    limit: Number(params?.limit || params?.pageSize || 25),
  };
}

function buildExportPayload(projectId: string | number, kind: 'ce' | 'zip' | 'pdf' | 'excel') {
  if (kind === 'ce') {
    return {
      project_id: projectId,
      export_type: 'ce-report',
      bundle_type: 'zip',
      report_type: 'ce',
      kind: 'ce-report',
    };
  }

  if (kind === 'zip') {
    return {
      project_id: projectId,
      export_type: 'zip',
      bundle_type: 'zip',
      report_type: 'zip',
      kind: 'zip',
    };
  }

  if (kind === 'pdf') {
    return {
      project_id: projectId,
      export_type: 'pdf',
      bundle_type: 'pdf',
      report_type: 'pdf',
      kind: 'pdf',
    };
  }

  return {
    project_id: projectId,
    export_type: 'excel',
    bundle_type: 'excel',
    report_type: 'excel',
    kind: 'excel',
  };
}

function defaultComplianceOverview(): ComplianceOverview {
  return {
    score: 0,
    checklist: [],
    missing_items: [],
    validation_summary: {
      completed_checks: 0,
      total_checks: 0,
    },
  } as ComplianceOverview;
}

export function getCeDocuments(params?: ListParams) {
  const projectId = params?.project_id || params?.projectId;
  return (
    optionalRequest<ListLike<CeDocument>>(
      projectId
        ? [withQuery(`/projects/${projectId}/documents`, params), withQuery('/documents', params)]
        : [withQuery('/documents', params)],
    ) || Promise.resolve(emptyList<CeDocument>(params))
  );
}

export function uploadDocument(payload: FormData) {
  return optionalRequest<unknown>(['/attachments/upload', '/documents/upload'], {
    method: 'POST',
    body: payload,
  });
}

export async function getComplianceOverview(projectId: string | number) {
  return (
    (await optionalRequest<ComplianceOverview>([
      `/projects/${projectId}/compliance`,
      `/projects/${projectId}/ce-dossier`,
    ])) || defaultComplianceOverview()
  );
}

export async function getComplianceMissingItems(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/compliance/missing-items`,
      `/projects/${projectId}/compliance/missing_items`,
      `/projects/${projectId}/ce-dossier/missing-items`,
    ])) || { items: [], missing_items: [] }
  );
}

export async function getComplianceChecklist(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/compliance/checklist`,
      `/projects/${projectId}/ce-dossier/checklist`,
    ])) || { items: [], checklist: [] }
  );
}

export async function getCeDossier(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/ce-dossier`,
      `/projects/${projectId}/compliance`,
    ])) || { sections: [] }
  );
}

export async function getProjectExports(projectId: string | number, params?: ListParams) {
  return (
    (await optionalRequest<ListLike<ExportJob>>([
      withQuery(`/projects/${projectId}/exports`, params),
      withQuery('/exports', { ...(params || {}), project_id: projectId }),
    ])) || emptyList<ExportJob>(params)
  );
}

export async function createCeReport(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>(
      [
        `/projects/${projectId}/exports/ce-report`,
        `/projects/${projectId}/exports/zip`,
        '/exports',
      ],
      { method: 'POST', body: JSON.stringify(buildExportPayload(projectId, 'ce')) },
    )) || { queued: false }
  );
}

export async function createZipExport(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>(
      [`/projects/${projectId}/exports/zip`, '/exports'],
      { method: 'POST', body: JSON.stringify(buildExportPayload(projectId, 'zip')) },
    )) || { queued: false }
  );
}

export async function createPdfExport(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>(
      [`/projects/${projectId}/exports/pdf`, '/exports'],
      { method: 'POST', body: JSON.stringify(buildExportPayload(projectId, 'pdf')) },
    )) || { queued: false }
  );
}

export async function createExcelExport(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>(
      [`/projects/${projectId}/exports/excel`, '/exports'],
      { method: 'POST', body: JSON.stringify(buildExportPayload(projectId, 'excel')) },
    )) || { queued: false }
  );
}

export function downloadProjectExport(projectId: string | number, exportId: string | number) {
  return downloadRequest(`/projects/${projectId}/exports/${exportId}/download`);
}

export async function retryProjectExport(projectId: string | number, exportId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>(
      [`/projects/${projectId}/exports/${exportId}/retry`, `/exports/${exportId}/retry`],
      { method: 'POST' },
    )) || { queued: false }
  );
}

export async function getProjectExportPreview(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/exports/preview`,
      `/projects/${projectId}/ce-dossier`,
      `/projects/${projectId}/compliance`,
    ])) || {}
  );
}

export async function getProjectExportManifest(projectId: string | number, exportId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/exports/${exportId}/manifest`,
      `/projects/${projectId}/exports/${exportId}`,
      `/exports/${exportId}`,
    ])) || { manifest: { files: [] } }
  );
}

export function uploadProjectExportAttachment(payload: FormData) {
  return uploadRequest<Record<string, unknown>>('/attachments/upload', payload);
}
