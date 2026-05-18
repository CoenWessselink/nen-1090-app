import { apiRequest } from './client';
import { uploadMany } from './upload';
import { runtimeTrace } from '@/utils/runtimeTracing';
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

function trace(event: string, payload?: Record<string, unknown>) {
  runtimeTrace(event, {
    domain: 'welds',
    ...(payload || {}),
  });
}

function resolveCreateInput(projectIdOrPayload: unknown, payload?: unknown) {
  if (payload !== undefined) {
    return { projectId: String(projectIdOrPayload), payload };
  }
  const source = (projectIdOrPayload || {}) as Record<string, unknown>;
  return { projectId: String(source.project_id || source.projectId || ''), payload: projectIdOrPayload };
}

function resolveWeldId(payload: unknown) {
  const record = (payload || {}) as Record<string, unknown>;
  return String(record.id || record.weld_id || record.weldId || '');
}

async function createInspectionRunFromTemplate(projectId: string, weldId: string) {
  if (!projectId || !weldId) return;
  try {
    await apiRequest(`/projects/${projectId}/welds/${weldId}/inspection`);
    trace('WELD_INSPECTION_RUN_CREATED_FROM_TEMPLATE', { projectId, weldId });
  } catch (error) {
    runtimeTrace('WELD_INSPECTION_RUN_CREATE_FALLBACK', {
      domain: 'welds',
      projectId,
      weldId,
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

export function getWelds(projectId?: string | number | ListParams) {
  if (typeof projectId === 'string' || typeof projectId === 'number') {
    trace('CANONICAL_WELD_LIST_USED', { projectId });
    return apiRequest(`/projects/${projectId}/welds`);
  }
  return apiRequest(withQuery('/welds', projectId as ListParams | undefined));
}

export function getWeld(projectId: string | number, weldId: string | number) {
  trace('CANONICAL_WELD_ENDPOINT_USED', { projectId, weldId });
  return apiRequest(`/projects/${projectId}/welds/${weldId}`);
}

export async function createWeld(projectIdOrPayload: unknown, payload?: unknown) {
  const resolved = resolveCreateInput(projectIdOrPayload, payload);
  trace('WELD_CREATE_REQUEST', { projectId: resolved.projectId });
  const created = await apiRequest(`/projects/${resolved.projectId}/welds`, {
    method: 'POST',
    body: JSON.stringify(resolved.payload),
  });
  await createInspectionRunFromTemplate(resolved.projectId, resolveWeldId(created));
  return created;
}

export function updateWeld(projectId: string | number, weldId: string | number, payload: unknown) {
  trace('WELD_UPDATE_REQUEST', { projectId, weldId });
  return apiRequest(`/projects/${projectId}/welds/${weldId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteWeld(projectId: string | number, weldId: string | number) {
  return apiRequest<void>(`/projects/${projectId}/welds/${weldId}`, { method: 'DELETE' });
}

export function patchWeldStatus(projectId: string | number, weldId: string | number, status: string) {
  return updateWeld(projectId, weldId, { status });
}

export function getWeldInspection(projectId: string | number, weldId: string | number) {
  trace('CANONICAL_WELD_INSPECTION_ENDPOINT_USED', { projectId, weldId });
  return apiRequest(`/projects/${projectId}/welds/${weldId}/inspection`);
}

export async function getWeldInspections(projectId: string | number, weldId: string | number) {
  const inspection = await getWeldInspection(projectId, weldId);
  return inspection ? [inspection] : [];
}

export function createWeldInspection(projectId: string | number, weldId: string | number, payload: unknown) {
  return apiRequest(`/projects/${projectId}/welds/${weldId}/inspection`, { method: 'POST', body: JSON.stringify(payload) });
}

export const updateWeldInspection = createWeldInspection;
export const saveWeldInspection = createWeldInspection;

export function uploadWeldAttachment(projectId: string | number, weldId: string | number, files: FormData | File | File[]) {
  trace('WELD_ATTACHMENT_UPLOAD', { projectId, weldId });
  return uploadMany(`/projects/${projectId}/welds/${weldId}/photos`, files, { project_id: String(projectId), weld_id: String(weldId), kind: 'photo' });
}

export const uploadWeldPhoto = uploadWeldAttachment;
export const uploadWeldPhotos = uploadWeldAttachment;

export function getWeldAttachments(projectId: string | number, weldId: string | number) {
  return apiRequest(`/projects/${projectId}/welds/${weldId}/attachments`);
}

export function getWeldCompliance(projectId: string | number, weldId: string | number) {
  return apiRequest(`/projects/${projectId}/welds/${weldId}/compliance`);
}

export function getWeldDefects(projectId: string | number, weldId: string | number) {
  return apiRequest(`/projects/${projectId}/welds/${weldId}/defects`);
}

export function resetWeldToNorm(projectId: string | number, weldId: string | number) {
  return apiRequest(`/projects/${projectId}/welds/${weldId}/reset-to-norm`, { method: 'POST' });
}

export function bulkApproveWelds(projectId: string | number, weldIds: Array<string | number>) {
  return apiRequest(`/projects/${projectId}/conform-all`, { method: 'POST', body: JSON.stringify({ weld_ids: weldIds }) });
}

export function conformWeld(projectId: string | number, weldId: string | number) {
  return patchWeldStatus(projectId, weldId, 'conform');
}

export function copyWeld(projectId: string | number, weldId: string | number, weldNumber?: string) {
  return apiRequest(`/projects/${projectId}/welds/${weldId}/copy`, { method: 'POST', body: JSON.stringify({ weld_number: weldNumber }) });
}
