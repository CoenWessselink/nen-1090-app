import { ApiError, apiRequest, optionalRequest } from './client';
import { uploadMany } from './upload';
import type { ListParams } from '@/types/api';
import { normalizeBoolean, normalizeInspectionStatus } from '@/utils/contractNormalization';
import { runtimeTrace } from '@/utils/runtimeTracing';

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

function cleanText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeInspectionPayload(input: unknown) {
  const source = (input || {}) as Record<string, unknown>;
  const payload: Record<string, unknown> = {};

  const status = normalizeInspectionStatus(source.overall_status ?? source.status ?? source.result, 'conform');

  runtimeTrace('INSPECTION_STATUS_NORMALIZED', {
    incomingStatus: source.overall_status ?? source.status ?? source.result,
    normalizedStatus: status,
  });

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

  if (!Array.isArray(rawChecks)) {
    runtimeTrace('INSPECTION_COMPAT_MAPPING_TRIGGERED', {
      reason: 'checks_not_array',
      receivedType: typeof rawChecks,
    });

    payload.checks = [];
    return payload;
  }

  payload.checks = rawChecks.map((item, index) => {
    const row = (item || {}) as Record<string, unknown>;

    const code =
      cleanText(row.criterion_key ?? row.item_code ?? row.code ?? row.label ?? row.title ?? row.group_key) ||
      `CHECK_${index + 1}`;

    const rowStatus = normalizeInspectionStatus(
      row.status ?? row.result ?? (normalizeBoolean(row.approved) === false ? 'defect' : 'conform'),
      'conform',
    );

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

  return payload;
}

function unwrapInspectionPayload<T = Record<string, unknown> | null>(value: unknown): T | null {
  if (!value || typeof value !== 'object') return (value ?? null) as T | null;

  const record = value as Record<string, unknown>;

  if ('inspection' in record) {
    runtimeTrace('CANONICAL_INSPECTION_RESPONSE_USED', {
      shape: 'inspection',
    });

    return (record.inspection ?? null) as T | null;
  }

  runtimeTrace('INSPECTION_ITEMS_ARRAY_RETIRED', {
    retiredCompat: 'items_array_unwrap',
  });

  runtimeTrace('LEGACY_INSPECTION_PAYLOAD_USED', {
    keys: Object.keys(record),
  });

  return record as T;
}

async function syncWeldStatus(projectId: string | number, weldId: string | number, status: unknown) {
  const normalized = normalizeInspectionStatus(status, 'conform');

  try {
    await apiRequest(`/projects/${projectId}/welds/${weldId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: normalized }),
    });
  } catch (error) {
    if (!(error instanceof ApiError) || ![404, 405, 422].includes(error.status)) throw error;

    runtimeTrace('INSPECTION_WELD_STATUS_SYNC_FALLBACK', {
      projectId,
      weldId,
      normalized,
      statusCode: error.status,
    });
  }
}

export function getInspections(params?: ListParams) {
  return apiRequest(withQuery('/inspections', params));
}

export function getInspection(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}`);
}

export async function getInspectionForWeld(projectId: string | number, weldId: string | number) {
  runtimeTrace('CANONICAL_INSPECTION_ENDPOINT_USED', {
    endpoint: `/projects/${projectId}/welds/${weldId}/inspection`,
    retiredFallbacks: [
      `/projects/${projectId}/welds/${weldId}/inspections`,
      `/inspections?project_id=${projectId}&weld_id=${weldId}&limit=1`,
    ],
  });

  const response = await optionalRequest([
    `/projects/${projectId}/welds/${weldId}/inspection`,
    `/welds/${weldId}/inspection`,
  ]);

  return unwrapInspectionPayload(response);
}

export async function upsertInspectionForWeld(projectId: string | number, weldId: string | number, data: unknown) {
  const payload = normalizeInspectionPayload(data);

  const saved = await apiRequest(`/projects/${projectId}/welds/${weldId}/inspections`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  await syncWeldStatus(projectId, weldId, payload.overall_status);
  return unwrapInspectionPayload(saved);
}

export function createInspection(projectId: string | number, weldId: string | number, payload: unknown) {
  return apiRequest(`/projects/${projectId}/welds/${weldId}/inspections`, {
    method: 'PUT',
    body: JSON.stringify(normalizeInspectionPayload(payload)),
  });
}

export function updateInspection(inspectionId: string | number, payload: unknown) {
  return apiRequest(`/inspections/${inspectionId}`, {
    method: 'PUT',
    body: JSON.stringify(normalizeInspectionPayload(payload)),
  });
}

export function deleteInspection(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}`, { method: 'DELETE' });
}

export function createInspectionResult(inspectionId: string | number, payload: unknown) {
  return optionalRequest([`/inspections/${inspectionId}/results`], {
    method: 'POST',
    body: JSON.stringify(normalizeInspectionPayload(payload)),
  });
}

export function approveInspection(inspectionId: string | number) {
  return optionalRequest([`/inspections/${inspectionId}/approve`], { method: 'POST' });
}

export async function uploadInspectionAttachment(
  inspectionId: string | number,
  formData: FormData | File | File[],
) {
  return uploadMany(`/inspections/${inspectionId}/attachments`, formData, { kind: 'photo' });
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
