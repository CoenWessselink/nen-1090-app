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

function normalizeStatus(value: unknown, fallback = 'conform') {
  const raw = String(value || fallback).trim().toLowerCase().replace(/_/g, ' ');
  if (['conform', 'approved', 'ok', 'goed'].includes(raw)) return 'conform';
  if (['defect', 'rejected', 'afgekeurd', 'niet conform', 'non conform', 'niet-conform', 'non-conform'].includes(raw)) return 'defect';
  if (['gerepareerd', 'in controle', 'in progress', 'pending', 'open', 'repaired'].includes(raw)) return 'gerepareerd';
  return raw || fallback;
}

function cleanText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeInspectionPayload(input: unknown) {
  const source = (input || {}) as Record<string, unknown>;
  const payload: Record<string, unknown> = {};

  const status = normalizeStatus(source.overall_status ?? source.status ?? source.result, 'conform');
  payload.overall_status = status;
  payload.status = status;
  payload.result = status;

  const remarks = cleanText(source.remarks ?? source.notes ?? source.comment);
  if (remarks !== null) {
    payload.remarks = remarks;
    payload.notes = remarks;
  }

  const templateId = cleanText(source.template_id ?? source.templateId);
  if (templateId) payload.template_id = templateId;

  const rawChecks = source.checks ?? source.inspectionResults ?? source.results ?? source.items ?? [];
  if (Array.isArray(rawChecks)) {
    payload.checks = rawChecks.map((item, index) => {
      const row = (item || {}) as Record<string, unknown>;
      const code = cleanText(row.criterion_key ?? row.item_code ?? row.code ?? row.label ?? row.title ?? row.group_key) || `CHECK_${index + 1}`;
      const rowStatus = normalizeStatus(row.status ?? row.result ?? (row.approved === false ? 'defect' : 'conform'), 'conform');
      const comment = cleanText(row.comment ?? row.remark ?? row.remarks);
      return {
        group_key: cleanText(row.group_key ?? row.group ?? row.category) || 'inspectie',
        criterion_key: code,
        item_code: code,
        applicable: row.applicable ?? true,
        approved: row.approved ?? rowStatus === 'conform',
        status: rowStatus,
        result: rowStatus,
        comment,
        remark: comment,
      };
    });
  } else {
    payload.checks = [];
  }

  return payload;
}

function unwrapInspectionPayload<T = Record<string, unknown> | null>(value: unknown): T | null {
  if (!value || typeof value !== 'object') return (value ?? null) as T | null;
  const record = value as Record<string, unknown>;
  if ('inspection' in record) return (record.inspection ?? null) as T | null;
  if ('item' in record) return (record.item ?? null) as T | null;
  if (Array.isArray(record.items)) return ((record.items[0] as T | undefined) ?? null);
  return record as T;
}

function cloneFormData(input: FormData, preferredKey: 'files' | 'file') {
  const output = new FormData();
  const files: File[] = [];
  input.forEach((value, key) => {
    if (value instanceof File) files.push(value);
    else output.append(key, value);
  });
  files.forEach((file) => output.append(preferredKey, file, file.name));
  return output;
}

async function syncWeldStatus(projectId: string | number, weldId: string | number, status: unknown) {
  const normalized = normalizeStatus(status, 'conform');
  try {
    await apiRequest(`/projects/${projectId}/welds/${weldId}`, { method: 'PATCH', body: JSON.stringify({ status: normalized }) });
  } catch (error) {
    if (!(error instanceof ApiError) || ![404, 405, 422].includes(error.status)) throw error;
  }
}

export function getInspections(params?: ListParams) {
  return apiRequest(withQuery('/inspections', params));
}

export function getInspection(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}`);
}

export async function getInspectionForWeld(projectId: string | number, weldId: string | number) {
  const response = await optionalRequest([
    `/welds/${weldId}/inspection`,
    `/projects/${projectId}/welds/${weldId}/inspection`,
    `/projects/${projectId}/welds/${weldId}/inspections`,
    `/inspections?project_id=${projectId}&weld_id=${weldId}&limit=1`,
  ]);
  return unwrapInspectionPayload(response);
}

export async function upsertInspectionForWeld(projectId: string | number, weldId: string | number, data: unknown) {
  const payload = normalizeInspectionPayload(data);
  let saved: unknown = null;
  const routes = [
    { path: `/welds/${weldId}/inspection`, method: 'PUT' },
    { path: `/welds/${weldId}/inspection`, method: 'POST' },
    { path: `/projects/${projectId}/welds/${weldId}/inspection`, method: 'PUT' },
    { path: `/projects/${projectId}/welds/${weldId}/inspections`, method: 'POST' },
  ];

  let lastError: unknown = null;
  for (const route of routes) {
    try {
      saved = await apiRequest(route.path, { method: route.method, body: JSON.stringify(payload) });
      break;
    } catch (error) {
      lastError = error;
      if (!(error instanceof ApiError) || ![404, 405, 409, 422].includes(error.status)) throw error;
    }
  }

  if (!saved && lastError) throw lastError;
  await syncWeldStatus(projectId, weldId, payload.overall_status);
  return unwrapInspectionPayload(saved);
}

export function createInspection(projectId: string | number, weldId: string | number, payload: unknown) {
  return optionalRequest([
    `/welds/${weldId}/inspection`,
    `/projects/${projectId}/welds/${weldId}/inspection`,
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
  return optionalRequest([`/inspections/${inspectionId}/results`], { method: 'POST', body: JSON.stringify(normalizeInspectionPayload(payload)) });
}

export function approveInspection(inspectionId: string | number) {
  return optionalRequest([`/inspections/${inspectionId}/approve`], { method: 'POST' });
}

export async function uploadInspectionAttachment(inspectionId: string | number, formData: FormData) {
  let lastError: unknown = null;
  for (const key of ['files', 'file'] as const) {
    try {
      return await apiRequest(`/inspections/${inspectionId}/attachments`, { method: 'POST', body: cloneFormData(formData, key) });
    } catch (error) {
      lastError = error;
      if (!(error instanceof ApiError) || ![400, 404, 405, 422].includes(error.status)) throw error;
    }
  }
  if (lastError) throw lastError;
  throw new ApiError('Upload mislukt', 500);
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
