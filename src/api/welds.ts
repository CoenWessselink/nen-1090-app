import { apiRequest, listRequest } from './client';
import { uploadMany } from './upload';
import { runtimeTrace } from '@/utils/runtimeTracing';
import type { ListParams } from '@/types/api';

type RuntimeRecord = Record<string, unknown>;

function asRecord(value: unknown): RuntimeRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RuntimeRecord : {};
}

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const record = asRecord(payload);
  if (Array.isArray(record.items)) return record.items as T[];
  if (Array.isArray(record.data)) return record.data as T[];
  if (Array.isArray(record.results)) return record.results as T[];
  return [];
}

function normalizeExc(value: unknown): string {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  return raw.match(/EXC[1-4]/)?.[0] || '';
}

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
  runtimeTrace(event, { domain: 'welds', ...(payload || {}) });
}

function resolveCreateInput(projectIdOrPayload: unknown, payload?: unknown) {
  if (payload !== undefined) return { projectId: String(projectIdOrPayload), payload };
  const source = asRecord(projectIdOrPayload || {});
  return { projectId: String(source.project_id || source.projectId || ''), payload: projectIdOrPayload };
}

async function firstWorking(paths: string[], init?: RequestInit) {
  let lastError: unknown;
  for (const path of paths) {
    try { return await apiRequest(path, init); }
    catch (error) { lastError = error; }
  }
  throw lastError;
}

async function templateForExecutionClass(executionClass: unknown): Promise<RuntimeRecord | null> {
  const exc = normalizeExc(executionClass);
  if (!exc) return null;
  const templates = asArray<RuntimeRecord>(await listRequest('/settings/inspection-templates').catch(() => []));
  const candidates = templates.filter((template) => {
    const templateExc = normalizeExc(template.exc_class || template.execution_class || template.profile_code || template.code || template.name);
    const code = String(template.code || template.name || '').toUpperCase();
    return templateExc === exc || code.includes(exc);
  });
  const ranked = candidates.sort((a, b) => {
    const aTenant = a.is_locked ? 0 : 1;
    const bTenant = b.is_locked ? 0 : 1;
    const aDefault = a.is_default ? 1 : 0;
    const bDefault = b.is_default ? 1 : 0;
    return (bTenant + bDefault) - (aTenant + aDefault);
  });
  return ranked[0] || null;
}

async function hydrateWeldTemplateForExc(payload: unknown, current?: RuntimeRecord): Promise<RuntimeRecord> {
  const body = { ...asRecord(payload) };
  const nextExc = normalizeExc(body.execution_class || body.exc_class || body.default_execution_class);
  if (!nextExc) return body;

  const currentExc = normalizeExc(current?.execution_class || current?.exc_class || current?.default_execution_class);
  const explicitTemplate = Boolean(body.template_id || body.inspection_template_id || body.default_template_id);
  const excChanged = !currentExc || currentExc !== nextExc;

  if (!excChanged && explicitTemplate) return body;

  const template = await templateForExecutionClass(nextExc);
  const templateId = String(template?.id || '').trim();
  if (!templateId) return body;

  body.execution_class = nextExc;
  body.exc_class = nextExc;
  body.template_id = templateId;
  body.inspection_template_id = templateId;
  body.default_template_id = templateId;
  body.template_name = template.name || template.code || body.template_name;
  return body;
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
  const body = await hydrateWeldTemplateForExc(resolved.payload);
  return apiRequest(`/projects/${resolved.projectId}/welds`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateWeld(projectId: string | number, weldId: string | number, payload: unknown) {
  trace('WELD_UPDATE_REQUEST', { projectId, weldId });
  const current = await apiRequest<RuntimeRecord>(`/projects/${projectId}/welds/${weldId}`).catch((): RuntimeRecord => ({}));
  const body = await hydrateWeldTemplateForExc(payload, current);
  return apiRequest(`/projects/${projectId}/welds/${weldId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteWeld(projectId: string | number, weldId: string | number) {
  return apiRequest<void>(`/projects/${projectId}/welds/${weldId}`, { method: 'DELETE' });
}

export function patchWeldStatus(projectId: string | number, weldId: string | number, status: string) {
  return updateWeld(projectId, weldId, { status });
}

export function getWeldInspection(projectId: string | number, weldId: string | number) {
  trace('CANONICAL_WELD_INSPECTION_ENDPOINT_USED', { projectId, weldId });
  return firstWorking([`/projects/${projectId}/welds/${weldId}/inspection`, `/welds/${weldId}/inspection`]);
}

export async function getWeldInspections(projectId: string | number, weldId: string | number) {
  const inspection = await getWeldInspection(projectId, weldId);
  return inspection ? [inspection] : [];
}

export function createWeldInspection(projectId: string | number, weldId: string | number, payload: unknown) {
  return firstWorking([`/projects/${projectId}/welds/${weldId}/inspection`, `/welds/${weldId}/inspection`], { method: 'POST', body: JSON.stringify(payload) });
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
