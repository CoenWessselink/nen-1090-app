import client, { apiRequest, optionalRequest } from './client';
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
    `/welds/${safeWeldId}`,
    `/projects/${safeProjectId}/welds/${safeWeldId}`,
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
    `/welds/${safeWeldId}`,
    `/projects/${safeProjectId}/welds/${safeWeldId}`,
  ], { method: 'PUT', body: JSON.stringify(payload) });
}

export function patchWeldStatus(projectId: string | number, weldId: string | number, status: string) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/welds/${safeWeldId}/status`,
    `/welds/${safeWeldId}`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/status`,
    `/projects/${safeProjectId}/welds/${safeWeldId}`,
  ], { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function deleteWeld(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/welds/${safeWeldId}`,
    `/projects/${safeProjectId}/welds/${safeWeldId}`,
  ], { method: 'DELETE' });
}

export function uploadWeldAttachment(projectId: string | number, weldId: string | number, formData: FormData) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/welds/${safeWeldId}/attachments`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/attachments`,
  ], { method: 'POST', body: formData });
}

export function getWeldAttachments(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/welds/${safeWeldId}/attachments`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/attachments`,
  ]);
}

export function getWeldCompliance(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/welds/${safeWeldId}/compliance`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/compliance`,
  ]);
}

export function getWeldDefects(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/weld-defects?weld_id=${safeWeldId}&project_id=${safeProjectId}`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/defects`,
  ]);
}

export function getWeldInspection(projectId: string | number, weldId: string | number) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/welds/${safeWeldId}/inspection`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/inspection`,
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
    `/welds/${safeWeldId}/reset-to-norm`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/reset-to-norm`,
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
    `/welds/${safeWeldId}/conform`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/conform`,
  ], { method: 'POST' });
}

export function copyWeld(projectId: string | number, weldId: string | number, weldNumber?: string) {
  const safeWeldId = requireId(weldId, 'weldId');
  const safeProjectId = requireId(projectId, 'projectId');
  return optionalRequest([
    `/welds/${safeWeldId}/copy`,
    `/projects/${safeProjectId}/welds/${safeWeldId}/copy`,
  ], { method: 'POST', body: JSON.stringify({ weld_number: weldNumber }) });
}
