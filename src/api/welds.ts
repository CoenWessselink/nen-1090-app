import client, { ApiError, apiRequest, optionalRequest } from './client';
import type { ListParams } from '@/types/api';

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

function getProjectId(input: unknown): string | null {
  if (typeof input === 'string' || typeof input === 'number') return String(input);
  if (input && typeof input === 'object') {
    const projectId = (input as Record<string, unknown>).project_id ?? (input as Record<string, unknown>).projectId;
    if (typeof projectId === 'string' || typeof projectId === 'number') return String(projectId);
  }
  return null;
}

function requireId(value: string | number | undefined | null, label: string) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${label} ontbreekt`);
  }
  return String(value);
}

function toOptionalUuid(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text ? text : null;
}

function toOptionalText(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text ? text : null;
}

function sanitizeWeldPayload(payload: unknown) {
  const source = (payload || {}) as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  const weldNo = toOptionalText(source.weld_no ?? source.weld_number);
  if (weldNo !== undefined) normalized.weld_no = weldNo;

  const location = toOptionalText(source.location);
  if (location !== undefined) normalized.location = location;

  const assemblyId = toOptionalUuid(source.assembly_id);
  if (assemblyId !== undefined) normalized.assembly_id = assemblyId;

  const wps = toOptionalText(source.wps ?? source.wps_id);
  if (wps !== undefined) normalized.wps = wps;

  const executionClass = toOptionalText(source.execution_class);
  if (executionClass !== undefined) normalized.execution_class = executionClass;

  const templateId = toOptionalUuid(source.template_id);
  if (templateId !== undefined) normalized.template_id = templateId;

  const coordinatorId = toOptionalUuid(source.coordinator_id);
  if (coordinatorId !== undefined) normalized.coordinator_id = coordinatorId;

  const process = toOptionalText(source.process);
  if (process !== undefined) normalized.process = process;

  const material = toOptionalText(source.material);
  if (material !== undefined) normalized.material = material;

  const thickness = toOptionalText(source.thickness);
  if (thickness !== undefined) normalized.thickness = thickness;

  const welders = toOptionalText(source.welders ?? source.welder_name);
  if (welders !== undefined) normalized.welders = welders;

  const vtStatus = toOptionalText(source.vt_status);
  if (vtStatus !== undefined) normalized.vt_status = vtStatus;

  const ndoStatus = toOptionalText(source.ndo_status);
  if (ndoStatus !== undefined) normalized.ndo_status = ndoStatus;

  if (source.photos !== undefined && source.photos !== null && source.photos !== '') {
    const numericPhotos = Number(source.photos);
    normalized.photos = Number.isFinite(numericPhotos) ? numericPhotos : 0;
  }

  const status = toOptionalText(source.status);
  if (status !== undefined) normalized.status = status;

  const result = toOptionalText(source.result);
  if (result !== undefined) normalized.result = result;

  const inspector = toOptionalText(source.inspector);
  if (inspector !== undefined) normalized.inspector = inspector;

  if (source.inspected_at !== undefined) {
    normalized.inspected_at = source.inspected_at || null;
  }

  if (source.notes !== undefined) {
    normalized.notes = toOptionalText(source.notes);
  }

  return normalized;
}

async function tryRequest<T = unknown>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await apiRequest<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError && [404, 405].includes(error.status)) {
      return null;
    }
    throw error;
  }
}

async function tryMethods<T = unknown>(paths: string[], methods: Array<'PATCH' | 'PUT' | 'POST'>, payload: unknown): Promise<T> {
  for (const path of paths) {
    if (!path || path.includes('/undefined') || path.includes('=undefined')) continue;
    for (const method of methods) {
      const result = await tryRequest<T>(path, {
        method,
        body: JSON.stringify(payload),
      });
      if (result !== null) return result;
    }
  }
  throw new ApiError('Geen geldige weld mutation route gevonden', 500);
}

export function getWelds(arg?: string | number | ListParams | Record<string, unknown>) {
  const projectId = getProjectId(arg);
  if (projectId) {
    return apiRequest(`/projects/${projectId}/welds`);
  }
  return apiRequest(withQuery('/welds', arg as ListParams | undefined));
}

export function getWeld(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/welds/${safeWeldId}`,
    `/welds/${safeWeldId}`,
  ]);
}

export async function createWeld(projectIdOrPayload: unknown, payload?: unknown) {
  if (payload !== undefined) {
    const body = sanitizeWeldPayload(payload);
    return (await optionalRequest([`/projects/${projectIdOrPayload}/welds`, `/welds`], { method: 'POST', body: JSON.stringify(body) })) || {};
  }

  const body = (projectIdOrPayload || {}) as Record<string, unknown>;
  const projectId = getProjectId(body);
  const normalized = sanitizeWeldPayload(body);
  return (await optionalRequest(projectId ? [`/projects/${projectId}/welds`, `/welds`] : ['/welds'], { method: 'POST', body: JSON.stringify(normalized) })) || {};
}

export function updateWeld(projectId: string | number, weldId: string | number, payload: unknown) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  const body = sanitizeWeldPayload(payload);
  return tryMethods([`/projects/${safeProjectId}/welds/${safeWeldId}`, `/welds/${safeWeldId}`], ['PATCH', 'PUT'], body);
}

export function patchWeldStatus(projectId: string | number, weldId: string | number, status: string) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  const payload = { status };

  return tryMethods([
    `/projects/${safeProjectId}/welds/${safeWeldId}`,
    `/welds/${safeWeldId}`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/status`,
    `/welds/${safeWeldId}/status`,
  ], ['PATCH', 'PUT'], payload);
}

export function deleteWeld(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/welds/${safeWeldId}`,
    `/welds/${safeWeldId}`,
  ], { method: 'DELETE' });
}

export function uploadWeldAttachment(projectId: string | number, weldId: string | number, formData: FormData) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/welds/${safeWeldId}/attachments`,
    `/welds/${safeWeldId}/attachments`,
  ], { method: 'POST', body: formData });
}

export function getWeldAttachments(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/welds/${safeWeldId}/attachments`,
    `/welds/${safeWeldId}/attachments`,
  ]);
}

export function getWeldCompliance(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/welds/${safeWeldId}/compliance`,
    `/welds/${safeWeldId}/compliance`,
  ]);
}

export function getWeldDefects(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/welds/${safeWeldId}/defects`,
    `/weld-defects?weld_id=${safeWeldId}&project_id=${safeProjectId}`,
  ]);
}

export async function getWeldInspection(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');

  const fromProjectList = await optionalRequest<any>([
    `/projects/${safeProjectId}/welds/${safeWeldId}/inspections`,
    `/projects/${safeProjectId}/inspections?weld_id=${safeWeldId}&limit=1`,
    `/inspections?project_id=${safeProjectId}&weld_id=${safeWeldId}&limit=1`,
  ]).catch(() => null);

  if (Array.isArray(fromProjectList)) {
    return fromProjectList.find((row) => String(row?.weld_id || row?.weldId || '') === safeWeldId) || fromProjectList[0] || null;
  }

  if (fromProjectList && Array.isArray(fromProjectList.items)) {
    return fromProjectList.items.find((row: any) => String(row?.weld_id || row?.weldId || '') === safeWeldId) || fromProjectList.items[0] || null;
  }

  const direct = await optionalRequest([
    `/welds/${safeWeldId}/inspection`,
  ]).catch(() => null);

  if (direct && typeof direct === 'object' && 'inspection' in (direct as Record<string, unknown>)) {
    return ((direct as Record<string, unknown>).inspection as Record<string, unknown> | null) ?? null;
  }

  return direct;
}

export async function getWeldInspections(projectId: string | number, weldId: string | number) {
  const result = await getWeldInspection(projectId, weldId);
  return Array.isArray(result) ? result : result ? [result] : [];
}

export function resetWeldToNorm(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/welds/${safeWeldId}/reset-to-norm`,
    `/welds/${safeWeldId}/reset-to-norm`,
  ], { method: 'POST' });
}

export function bulkApproveWelds(projectId: string | number, weldIds: Array<string | number>) {
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/conform-all`,
  ], { method: 'POST', body: JSON.stringify({ weld_ids: weldIds }) });
}

export function conformWeld(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/welds/${safeWeldId}/conform`,
    `/welds/${safeWeldId}/conform`,
  ], { method: 'POST' });
}

export function copyWeld(projectId: string | number, weldId: string | number, weldNumber?: string) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/welds/${safeWeldId}/copy`,
    `/welds/${safeWeldId}/copy`,
  ], { method: 'POST', body: JSON.stringify({ weld_number: weldNumber }) });
}
