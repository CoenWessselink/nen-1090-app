import { apiRequest, downloadRequest, optionalRequest } from '@/api/client';
import { withQuery } from '@/utils/api';
import type { CeDocument, ComplianceOverview, ExportJob } from '@/types/domain';
import type { ListParams } from '@/types/api';

type LooseRecord = Record<string, unknown>;

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as LooseRecord) : {};
}

function normalizeComplianceOverview(payload: unknown): ComplianceOverview {
  const source = asObject(payload);
  const validationSummary = asObject(source.validation_summary);
  const checklist = asArray(source.checklist);
  const missingItems = asArray(source.missing_items);

  return {
    ...(source as ComplianceOverview),
    score: Number(source.score ?? source.compliance_score ?? source.percentage ?? 0),
    validation_summary: {
      ...validationSummary,
      completed_checks: Number(validationSummary.completed_checks ?? checklist.filter((item) => asObject(item).completed).length),
      total_checks: Number(validationSummary.total_checks ?? checklist.length),
    },
    checklist,
    missing_items: missingItems,
  } as ComplianceOverview;
}

function normalizeChecklist(payload: unknown): LooseRecord {
  const source = asObject(payload);
  if (Array.isArray(source.checklist)) return source;
  if (Array.isArray(source.items)) return { checklist: source.items };
  if (Array.isArray(source.data)) return { checklist: source.data };
  if (Array.isArray(payload)) return { checklist: payload as unknown[] };
  return { checklist: [] };
}

function normalizeMissingItems(payload: unknown): LooseRecord {
  const source = asObject(payload);
  if (Array.isArray(source.missing_items)) return source;
  if (Array.isArray(source.items)) return { missing_items: source.items };
  if (Array.isArray(source.data)) return { missing_items: source.data };
  if (Array.isArray(payload)) return { missing_items: payload as unknown[] };
  return { missing_items: [] };
}

function normalizeCeDossier(payload: unknown): LooseRecord {
  const source = asObject(payload);
  if (Array.isArray(source.sections)) return source;
  const checklist = asArray(source.checklist);
  const missingItems = asArray(source.missing_items);
  const sections = [
    { id: 'checklist', label: 'Checklist', completed: checklist.length > 0 && missingItems.length === 0, description: `${checklist.length} checklist-items` },
    { id: 'missing', label: 'Missende items', completed: missingItems.length === 0, description: `${missingItems.length} open punten` },
  ];
  return { ...source, sections };
}

function normalizeListPayload<T>(payload: unknown): { items: T[]; total: number; page: number; limit: number } {
  if (Array.isArray(payload)) {
    return { items: payload as T[], total: payload.length, page: 1, limit: payload.length || 25 };
  }
  const source = asObject(payload);
  const items = (source.items || source.data || source.results || source.rows || []) as T[];
  return {
    items: Array.isArray(items) ? items : [],
    total: Number(source.total ?? source.count ?? (Array.isArray(items) ? items.length : 0)),
    page: Number(source.page ?? 1),
    limit: Number(source.limit ?? 25),
  };
}

export async function getCeDocuments(params?: ListParams) {
  const projectId = params?.project_id || params?.projectId;
  return (await optionalRequest<unknown>([
    withQuery(projectId ? `/projects/${projectId}/documents` : '/documents', params),
    withQuery('/documents', { ...params, project_id: projectId || params?.project_id }),
  ])) || { items: [] };
}

export function uploadDocument(_payload: FormData) {
  return Promise.resolve({ ok: false });
}

export async function getComplianceOverview(projectId: string | number) {
  const payload =
    (await optionalRequest<unknown>([
      `/projects/${projectId}/compliance`,
      `/projects/${projectId}/ce-dossier`,
      `/compliance/projects/${projectId}`,
      `/compliance/${projectId}`,
    ])) || {};
  return normalizeComplianceOverview(payload);
}

export async function getComplianceMissingItems(projectId: string | number) {
  const payload =
    (await optionalRequest<unknown>([
      `/projects/${projectId}/compliance/missing-items`,
      `/projects/${projectId}/missing-items`,
      `/projects/${projectId}/ce-dossier/missing-items`,
      `/projects/${projectId}/compliance`,
    ])) || {};
  return normalizeMissingItems(payload);
}

export async function getComplianceChecklist(projectId: string | number) {
  const payload =
    (await optionalRequest<unknown>([
      `/projects/${projectId}/compliance/checklist`,
      `/projects/${projectId}/checklist`,
      `/projects/${projectId}/ce-dossier/checklist`,
      `/projects/${projectId}/compliance`,
    ])) || {};
  return normalizeChecklist(payload);
}

export async function getCeDossier(projectId: string | number) {
  const payload =
    (await optionalRequest<unknown>([
      `/projects/${projectId}/ce-dossier`,
      `/projects/${projectId}/compliance`,
      `/projects/${projectId}`,
    ])) || {};
  return normalizeCeDossier(payload);
}

export async function getProjectExports(projectId: string | number, params?: ListParams) {
  const payload =
    (await optionalRequest<unknown>([
      withQuery(`/projects/${projectId}/exports`, params),
      withQuery('/exports', { ...params, project_id: projectId }),
      withQuery(`/projects/${projectId}/export-history`, params),
    ])) || { items: [] };
  return normalizeListPayload<ExportJob>(payload);
}

export function createCeReport(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>(
    [
      `/projects/${projectId}/exports/ce-report`,
      `/projects/${projectId}/exports/pdf`,
      `/exports/ce-report`,
      `/exports/pdf`,
    ],
    { method: 'POST', body: JSON.stringify({ project_id: projectId }) },
  );
}

export function createZipExport(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>(
    [
      `/projects/${projectId}/exports/zip`,
      `/exports/zip`,
    ],
    { method: 'POST', body: JSON.stringify({ project_id: projectId }) },
  );
}

export function createPdfExport(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>(
    [
      `/projects/${projectId}/exports/pdf`,
      `/exports/pdf`,
    ],
    { method: 'POST', body: JSON.stringify({ project_id: projectId }) },
  );
}

export function createExcelExport(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>(
    [
      `/projects/${projectId}/exports/excel`,
      `/exports/excel`,
    ],
    { method: 'POST', body: JSON.stringify({ project_id: projectId }) },
  );
}

export async function downloadProjectExport(projectId: string | number, exportId: string | number) {
  for (const path of [
    `/projects/${projectId}/exports/${exportId}/download`,
    `/exports/${exportId}/download`,
  ]) {
    try {
      return await downloadRequest(path);
    } catch {
      continue;
    }
  }
  throw new Error('Exportdownload niet beschikbaar.');
}

export function retryProjectExport(projectId: string | number, exportId: string | number) {
  return optionalRequest<Record<string, unknown>>(
    [
      `/projects/${projectId}/exports/${exportId}/retry`,
      `/exports/${exportId}/retry`,
    ],
    { method: 'POST', body: JSON.stringify({ project_id: projectId }) },
  );
}

export async function getProjectExportPreview(projectId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/exports/preview`,
      `/projects/${projectId}/compliance`,
      `/projects/${projectId}/ce-dossier`,
    ])) || {}
  );
}

export async function getProjectExportManifest(projectId: string | number, exportId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/exports/${exportId}/manifest`,
      `/exports/${exportId}/manifest`,
      `/projects/${projectId}/exports/${exportId}`,
    ])) || {}
  );
}
