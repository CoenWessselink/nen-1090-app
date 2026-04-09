
import client, { apiRequest, optionalRequest } from './client';
import type { ListParams } from '@/types/api';

function withQuery(path: string, params?: ListParams): string {
  if (!params) return path;
  const sp = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    sp.set(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

function getProjectId(input: unknown): string | null {
  if (typeof input === 'string' || typeof input === 'number') return String(input);
  if (input && typeof input === 'object') {
    const projectId =
      (input as Record<string, unknown>).project_id ??
      (input as Record<string, unknown>).projectId;
    if (typeof projectId === 'string' || typeof projectId === 'number') return String(projectId);
  }
  return null;
}

export function getWelds(arg?: string | number | ListParams | Record<string, unknown>) {
  const projectId = getProjectId(arg);
  if (projectId) {
    return apiRequest(`/projects/${projectId}/welds`);
  }
  return apiRequest(withQuery('/welds', arg as ListParams | undefined));
}

export function getWeld(projectId: string | number, weldId: string | number) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}`,
    `/welds/${weldId}`,
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
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}`,
    `/welds/${weldId}`,
  ], { method: 'PUT', body: JSON.stringify(payload) });
}

export function patchWeldStatus(projectId: string | number, weldId: string | number, status: string) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/status`,
    `/projects/${projectId}/welds/${weldId}`,
    `/welds/${weldId}/status`,
  ], { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function deleteWeld(projectId: string | number, weldId: string | number) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}`,
    `/welds/${weldId}`,
  ], { method: 'DELETE' });
}

export function uploadWeldAttachment(projectId: string | number, weldId: string | number, formData: FormData) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/attachments`,
    `/welds/${weldId}/attachments`,
  ], { method: 'POST', body: formData });
}

export function getWeldAttachments(projectId: string | number, weldId: string | number) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/attachments`,
    `/welds/${weldId}/attachments`,
  ]);
}

export function getWeldCompliance(projectId: string | number, weldId: string | number) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/compliance`,
  ]);
}

export function getWeldDefects(projectId: string | number, weldId: string | number) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/defects`,
    `/weld-defects?project_id=${projectId}&weld_id=${weldId}`,
  ]);
}

export function getWeldInspection(projectId: string | number, weldId: string | number) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/inspection`,
    `/welds/${weldId}/inspection`,
  ]);
}

export async function getWeldInspections(projectId: string | number, weldId: string | number) {
  const result = await getWeldInspection(projectId, weldId);
  return Array.isArray(result) ? result : result ? [result] : [];
}

export function resetWeldToNorm(projectId: string | number, weldId: string | number) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/reset-to-norm`,
  ], { method: 'POST' });
}

export function bulkApproveWelds(projectId: string | number, weldIds: Array<string | number>) {
  return optionalRequest([
    `/projects/${projectId}/conform-all`,
  ], { method: 'POST', body: JSON.stringify({ weld_ids: weldIds }) });
}

export function conformWeld(projectId: string | number, weldId: string | number) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/conform`,
  ], { method: 'POST' });
}

export function copyWeld(projectId: string | number, weldId: string | number, weldNumber?: string) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/copy`,
  ], { method: 'POST', body: JSON.stringify({ weld_number: weldNumber }) });
}
