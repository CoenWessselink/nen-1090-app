import client, { ApiError, apiRequest, optionalRequest } from './client';
import { uploadMany } from './upload';
import type { ListParams } from '@/types/api';
import { runtimeTrace } from '@/utils/runtimeTracing';

function withQuery(path: string, params?: ListParams): string {
  if (!params) return path;
  const sp = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'limit' && typeof value === 'number') {
      sp.set(key, String(Math.min(Math.max(value, 1), 100)));
      return;
    }
    sp.set(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

function traceCanonicalWeldRequest(event: string, canonicalPath: string, fallbackPaths: string[] = []) {
  runtimeTrace(event, {
    canonicalPath,
    fallbackPaths,
    fallbackCount: fallbackPaths.length,
  });
}

function getProjectId(input: unknown): string | null {
  if (typeof input === 'string' || typeof input === 'number') return String(input);
  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>;
    const projectId = record.project_id ?? record.projectId;
    if (typeof projectId === 'string' || typeof projectId === 'number') return String(projectId);
  }
  return null;
}

function requireId(value: string | number | undefined | null, label: string) {
  if (value === undefined || value === null || value === '') throw new Error(`${label} is missing`);
  return String(value);
}

function toOptionalUuid(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text || text === 'undefined' || text === 'null') return null;
  return text;
}

function toOptionalText(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeStatus(value: unknown, fallback = 'open') {
  const raw = String(value || fallback).trim().toLowerCase();
  const map: Record<string, string> = {
    conform: 'conform', compliant: 'conform', approved: 'conform', goedgekeurd: 'conform', ok: 'conform',
    defect: 'defect', rejected: 'defect', afgekeurd: 'defect', 'niet conform': 'defect', 'niet-conform': 'defect', 'non conform': 'defect', 'non-compliant': 'defect',
    open: 'open', pending: 'open', 'pending review': 'gerepareerd', 'in controle': 'gerepareerd',
    repaired: 'gerepareerd', gerepareerd: 'gerepareerd',
  };
  return map[raw] || raw || fallback;
}

function sanitizeWeldPayload(payload: unknown) {
  const source = (payload || {}) as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  const copyText = (target: string, ...keys: string[]) => {
    for (const key of keys) {
      const value = toOptionalText(source[key]);
      if (value !== undefined) {
        normalized[target] = value;
        return;
      }
    }
  };

  copyText('weld_no', 'weld_no', 'weld_number', 'number', 'code');
  copyText('location', 'location');
  const assemblyId = toOptionalUuid(source.assembly_id ?? source.assemblyId);
  if (assemblyId !== undefined) normalized.assembly_id = assemblyId;
  copyText('wps', 'wps', 'wps_id');
  copyText('process', 'process');
  copyText('material', 'material');
  copyText('thickness', 'thickness');
  copyText('welders', 'welders', 'welder_name', 'welder');
  copyText('vt_status', 'vt_status');
  copyText('ndo_status', 'ndo_status');
  copyText('inspector', 'inspector');
  copyText('notes', 'notes', 'remarks', 'comment');

  if (source.photos !== undefined && source.photos !== null && source.photos !== '') {
    const numericPhotos = Number(source.photos);
    normalized.photos = Number.isFinite(numericPhotos) ? numericPhotos : 0;
  }
  if (source.status !== undefined) normalized.status = normalizeStatus(source.status, 'open');
  if (source.result !== undefined) normalized.result = normalizeStatus(source.result, 'pending');
  if (source.inspected_at !== undefined) normalized.inspected_at = source.inspected_at || null;

  runtimeTrace('WELD_PAYLOAD_NORMALIZED', {
    hasAssembly: normalized.assembly_id !== undefined,
    normalizedStatus: normalized.status,
    normalizedResult: normalized.result,
  });

  return normalized;
}

function sanitizeInspectionPayload(payload: unknown) {
  const source = (payload || {}) as Record<string, unknown>;
  const checks = source.checks ?? source.inspectionResults ?? source.results ?? source.items ?? [];
  const normalizedChecks = Array.isArray(checks)
    ? checks.map((item, index) => {
        const row = (item || {}) as Record<string, unknown>;
        return {
          item_code: String(row.item_code ?? row.criterion_key ?? row.code ?? row.title ?? row.label ?? `CHECK-${index + 1}`),
          criterion_key: String(row.criterion_key ?? row.item_code ?? row.code ?? `CHECK-${index + 1}`),
          group_key: String(row.group_key ?? row.group ?? 'inspection'),
          status: normalizeStatus(row.status ?? row.result ?? (row.approved === false ? 'defect' : 'conform'), 'conform'),
          result: normalizeStatus(row.result ?? row.status ?? (row.approved === false ? 'defect' : 'conform'), 'conform'),
          approved: row.approved ?? normalizeStatus(row.status ?? row.result, 'conform') === 'conform',
          applicable: row.applicable ?? true,
          remark: row.remark ?? row.comment ?? row.remarks ?? null,
          comment: row.comment ?? row.remark ?? row.remarks ?? null,
        };
      })
    : [];

  runtimeTrace('WELD_INSPECTION_PAYLOAD_NORMALIZED', {
    checkCount: normalizedChecks.length,
  });

  return {
    weld_id: source.weld_id ?? source.weldId ?? source.las_id,
    overall_status: normalizeStatus(source.overall_status ?? source.status ?? source.result, 'conform'),
    status: normalizeStatus(source.status ?? source.overall_status ?? source.result, 'conform'),
    result: normalizeStatus(source.result ?? source.status ?? source.overall_status, 'conform'),
    inspector: source.inspector ?? source.inspector_name ?? null,
    remarks: source.remarks ?? source.notes ?? source.comment ?? null,
    notes: source.notes ?? source.remarks ?? source.comment ?? null,
    checks: normalizedChecks,
    results: normalizedChecks,
  };
}

async function tryRequest<T = unknown>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await apiRequest<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError && [404, 405, 422].includes(error.status)) return null;
    throw error;
  }
}

async function tryMethods<T = unknown>(paths: string[], methods: Array<'PATCH' | 'PUT' | 'POST'>, payload: unknown): Promise<T> {
  runtimeTrace('WELD_MUTATION_CHAIN_STARTED', {
    candidatePaths: paths,
    methods,
  });

  for (const path of paths) {
    if (!path || path.includes('/undefined') || path.includes('=undefined')) continue;
    for (const method of methods) {
      const result = await tryRequest<T>(path, { method, body: JSON.stringify(payload) });
      if (result !== null) {
        runtimeTrace('WELD_MUTATION_SUCCESS', {
          path,
          method,
        });

        return result;
      }
    }
  }
  throw new ApiError('No valid API mutation route succeeded', 500);
}

export function getWelds(arg?: string | number | ListParams | Record<string, unknown>) {
  const projectId = getProjectId(arg);
  if (projectId) return apiRequest(`/projects/${projectId}/welds`);
  return apiRequest(withQuery('/welds', arg as ListParams | undefined));
}

export function getWeld(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');

  traceCanonicalWeldRequest(
    'CANONICAL_WELD_ENDPOINT_USED',
    `/projects/${safeProjectId}/welds/${safeWeldId}`,
    [`/welds/${safeWeldId}`],
  );

  return optionalRequest([`/projects/${safeProjectId}/welds/${safeWeldId}`, `/welds/${safeWeldId}`]);
}

export async function createWeld(projectIdOrPayload: unknown, payload?: unknown) {
  if (payload !== undefined) {
    const safeProjectId = requireId(projectIdOrPayload as string | number, 'projectId');
    return apiRequest(`/projects/${safeProjectId}/welds`, { method: 'POST', body: JSON.stringify(sanitizeWeldPayload(payload)) });
  }
  const body = (projectIdOrPayload || {}) as Record<string, unknown>;
  const projectId = getProjectId(body);
  if (!projectId) throw new Error('projectId is missing');
  return apiRequest(`/projects/${projectId}/welds`, { method: 'POST', body: JSON.stringify(sanitizeWeldPayload(body)) });
}

export function updateWeld(projectId: string | number, weldId: string | number, payload: unknown) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return tryMethods([`/projects/${safeProjectId}/welds/${safeWeldId}`, `/welds/${safeWeldId}`], ['PATCH', 'PUT'], sanitizeWeldPayload(payload));
}

export function patchWeldStatus(projectId: string | number, weldId: string | number, status: string) {
  return updateWeld(projectId, weldId, { status });
}

export function deleteWeld(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([`/projects/${safeProjectId}/welds/${safeWeldId}`, `/welds/${safeWeldId}`], { method: 'DELETE' });
}

export async function uploadWeldAttachment(projectId: string | number, weldId: string | number, upload: FormData | File | File[]) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return uploadMany(`/welds/${safeWeldId}/photos`, upload, { project_id: safeProjectId, weld_id: safeWeldId, kind: 'photo' });
}

export const uploadWeldPhoto = uploadWeldAttachment;
export const uploadWeldPhotos = uploadWeldAttachment;

export function getWeldAttachments(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  return optionalRequest([`/welds/${safeWeldId}/attachments`, `/welds/${safeWeldId}/photos`]);
}

export function getWeldCompliance(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([`/projects/${safeProjectId}/welds/${safeWeldId}/compliance`, `/welds/${safeWeldId}/compliance`]);
}

export function getWeldDefects(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([`/projects/${safeProjectId}/welds/${safeWeldId}/defects`, `/weld-defects?weld_id=${safeWeldId}&project_id=${safeProjectId}`]);
}

export async function getWeldInspection(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');

  traceCanonicalWeldRequest(
    'CANONICAL_WELD_INSPECTION_ENDPOINT_USED',
    `/projects/${safeProjectId}/welds/${safeWeldId}/inspection`,
    [
      `/projects/${safeProjectId}/welds/${safeWeldId}/inspections`,
      `/welds/${safeWeldId}/inspection`,
      `/inspections?project_id=${safeProjectId}&weld_id=${safeWeldId}&limit=1`,
    ],
  );

  const result = await optionalRequest<any>([
    `/projects/${safeProjectId}/welds/${safeWeldId}/inspection`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/inspections`,
    `/welds/${safeWeldId}/inspection`,
    `/inspections?project_id=${safeProjectId}&weld_id=${safeWeldId}&limit=1`,
  ]).catch(() => null);
  if (Array.isArray(result)) return result[0] || null;
  if (result && Array.isArray(result.items)) return result.items[0] || null;
  if (result && typeof result === 'object' && 'inspection' in (result as Record<string, unknown>)) return (result as Record<string, unknown>).inspection || null;
  return result;
}

export async function getWeldInspections(projectId: string | number, weldId: string | number) {
  const inspection = await getWeldInspection(projectId, weldId);
  return inspection ? [inspection] : [];
}

export async function saveWeldInspection(projectId: string | number, weldId: string | number, payload: unknown, inspectionId?: string | number | null) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  const body = sanitizeInspectionPayload({ ...(payload as Record<string, unknown>), weld_id: safeWeldId });
  const paths = inspectionId
    ? [`/projects/${safeProjectId}/welds/${safeWeldId}/inspections/${inspectionId}`, `/inspections/${inspectionId}`, `/projects/${safeProjectId}/welds/${safeWeldId}/inspection`]
    : [`/projects/${safeProjectId}/welds/${safeWeldId}/inspection`, `/welds/${safeWeldId}/inspection`, `/projects/${safeProjectId}/welds/${safeWeldId}/inspections`, `/projects/${safeProjectId}/inspections`];
  const saved = await tryMethods(paths, ['PATCH', 'PUT', 'POST'], body);
  await updateWeld(safeProjectId, safeWeldId, { status: body.overall_status }).catch(() => undefined);
  return saved;
}

export const updateWeldInspection = saveWeldInspection;
export const createWeldInspection = saveWeldInspection;

export function resetWeldToNorm(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([`/projects/${safeProjectId}/welds/${safeWeldId}/reset-to-norm`, `/welds/${safeWeldId}/reset-to-norm`], { method: 'POST' });
}

export function bulkApproveWelds(projectId: string | number, weldIds: Array<string | number>) {
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([`/projects/${safeProjectId}/conform-all`], { method: 'POST', body: JSON.stringify({ weld_ids: weldIds }) });
}

export function conformWeld(projectId: string | number, weldId: string | number) {
  return patchWeldStatus(projectId, weldId, 'conform');
}

export function copyWeld(projectId: string | number, weldId: string | number, weldNumber?: string) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([`/projects/${safeProjectId}/welds/${safeWeldId}/copy`, `/welds/${safeWeldId}/copy`], { method: 'POST', body: JSON.stringify({ weld_number: weldNumber }) });
}

export default client;
