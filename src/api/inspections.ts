import { ApiError, apiRequest, optionalRequest } from './client';
import type { ListParams } from '@/types/api';

function withQuery(path: string, params?: ListParams) {
  if (!params) return path;
  const sp = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    sp.set(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

function normalizeInspectionPayload(input: unknown) {
  const source = (input || {}) as Record<string, unknown>;
  const payload: Record<string, unknown> = { ...source };

  if (payload.notes !== undefined && payload.remarks === undefined) {
    payload.remarks = payload.notes;
  }
  if (payload.status !== undefined && payload.overall_status === undefined) {
    payload.overall_status = payload.status;
  }
  if (payload.result !== undefined && payload.overall_status === undefined) {
    payload.overall_status = payload.result;
  }
  if (Array.isArray(payload.inspectionResults) && payload.checks === undefined) {
    payload.checks = payload.inspectionResults;
  }
  if (Array.isArray(payload.results) && payload.checks === undefined) {
    payload.checks = payload.results;
  }

  if (Array.isArray(payload.checks)) {
    payload.checks = (payload.checks as Array<Record<string, unknown>>).map((item, index) => {
      const row = item || {};
      const code = String(row.criterion_key || row.item_code || row.code || row.group_key || `check_${index + 1}`);
      return {
        group_key: row.group_key || code,
        criterion_key: row.criterion_key || code,
        applicable: row.applicable ?? true,
        approved: row.approved ?? ['conform', 'approved', 'ok'].includes(String(row.status || '').toLowerCase()),
        status: row.status || (row.approved ? 'conform' : 'open'),
        comment: row.comment ?? row.remark ?? null,
      };
    });
  }

  return payload;
}

function unwrapInspectionPayload<T = Record<string, unknown> | null>(value: unknown): T | null {
  if (!value || typeof value !== 'object') return (value ?? null) as T | null;

  const record = value as Record<string, unknown>;
  if ('inspection' in record) {
    return (record.inspection ?? null) as T | null;
  }
  if (Array.isArray(record.items)) {
    return ((record.items[0] as T | undefined) ?? null);
  }
  return record as T;
}

export function getInspections(params?: ListParams) {
  return apiRequest(withQuery('/inspections', params));
}

export function getInspection(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}`);
}

export async function getInspectionForWeld(projectId: string | number, weldId: string | number) {
  const response = await optionalRequest([
    `/projects/${projectId}/welds/${weldId}/inspections`,
    `/projects/${projectId}/inspections?weld_id=${weldId}&limit=1`,
    `/inspections?project_id=${projectId}&weld_id=${weldId}&limit=1`,
    `/welds/${weldId}/inspection`,
  ]);

  return unwrapInspectionPayload(response);
}

export async function upsertInspectionForWeld(projectId: string | number, weldId: string | number, data: unknown) {
  try {
    return await apiRequest(`/welds/${weldId}/inspection`, { method: 'PUT', body: JSON.stringify(normalizeInspectionPayload(data)) });
  } catch (error) {
    if (!(error instanceof ApiError) || ![404, 405].includes(error.status)) {
      throw error;
    }
  }

  const fallback = await optionalRequest([
    `/projects/${projectId}/welds/${weldId}/inspections`,
  ], { method: 'POST', body: JSON.stringify(normalizeInspectionPayload(data)) });

  return unwrapInspectionPayload(fallback);
}

export function createInspection(projectId: string | number, weldId: string | number, payload: unknown) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/inspections`,
    `/welds/${weldId}/inspections`,
  ], { method: 'POST', body: JSON.stringify(normalizeInspectionPayload(payload)) });
}

export function updateInspection(inspectionId: string | number, payload: unknown) {
  return apiRequest(`/inspections/${inspectionId}`, { method: 'PUT', body: JSON.stringify(normalizeInspectionPayload(payload)) });
}

export function deleteInspection(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}`, { method: 'DELETE' });
}

export function createInspectionResult(inspectionId: string | number, payload: unknown) {
  return optionalRequest([
    `/inspections/${inspectionId}/results`,
  ], { method: 'POST', body: JSON.stringify(normalizeInspectionPayload(payload)) });
}

export function approveInspection(inspectionId: string | number) {
  return optionalRequest([
    `/inspections/${inspectionId}/approve`,
  ], { method: 'POST' });
}

export function uploadInspectionAttachment(inspectionId: string | number, formData: FormData) {
  return optionalRequest([
    `/inspections/${inspectionId}/attachments`,
  ], { method: 'POST', body: formData });
}

export function downloadInspectionAttachment(inspectionId: string | number, attachmentId: string | number) {
  return apiRequest(`/inspections/${inspectionId}/attachments/${attachmentId}/download`, undefined, 0, true);
}

export function getInspectionAttachments(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}/attachments`);
}

export function getInspectionAudit(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}/audit`);
}

export function getInspectionResults(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}/results`);
}
