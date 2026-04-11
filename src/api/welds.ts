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

async function tryRequest<T = unknown>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await apiRequest<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError && [404, 405, 422].includes(error.status)) {
      return null;
    }
    throw error;
  }
}

async function tryMethods<T = unknown>(paths: string[], methods: Array<'PATCH' | 'PUT' | 'POST'>, payload: unknown): Promise<T> {
  let lastError: unknown = null;
  for (const path of paths) {
    if (!path || path.includes('/undefined') || path.includes('=undefined')) continue;
    for (const method of methods) {
      try {
        const result = await tryRequest<T>(path, {
          method,
          body: JSON.stringify(payload),
        });
        if (result !== null) return result;
      } catch (error) {
        lastError = error;
        throw error;
      }
    }
  }
  if (lastError) throw lastError;
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

export function createWeld(projectIdOrPayload: unknown, payload?: unknown) {
  if (payload !== undefined) {
    return client.post(`/projects/${projectIdOrPayload}/welds`, payload);
  }

  const body = (projectIdOrPayload || {}) as Record<string, unknown>;
  const projectId = getProjectId(body);
  if (projectId) return client.post(`/projects/${projectId}/welds`, body);
  return client.post('/welds', body);
}

export function updateWeld(projectId: string | number, weldId: string | number, payload: unknown) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/welds/${safeWeldId}`,
    `/welds/${safeWeldId}`,
  ], { method: 'PUT', body: JSON.stringify(payload) });
}

export function patchWeldStatus(projectId: string | number, weldId: string | number, status: string) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  const payload = { status };

  // Eerst de algemene weld update-routes proberen om 404 spam op /status-routes te voorkomen.
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

export function getWeldInspection(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/projects/${safeProjectId}/welds/${safeWeldId}/inspection`,
    `/welds/${safeWeldId}/inspection`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/inspections`,
  ]);
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
