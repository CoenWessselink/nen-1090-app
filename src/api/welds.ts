import { apiRequest, optionalRequest, resolveProjectScopedPath, uploadRequest } from '@/api/client';
import { withQuery } from '@/utils/api';
import type { ListParams } from '@/types/api';
import type { CeDocument, ComplianceOverview, Defect, Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

function mapWeldPayload(payload: WeldFormValues) {
  return {
    weld_no: payload.weld_number,
    location: payload.location,
    assembly_id: payload.assembly_id || null,
    wps: payload.wps_id || null,
    process: payload.process || null,
    welders: payload.welder_name || null,
    status: payload.status,
  };
}

export async function getWelds(params?: ListParams) {
  const projectId = params?.project_id || params?.projectId;
  return await optionalRequest<Weld[] | { items?: Weld[]; data?: Weld[]; results?: Weld[]; total?: number; page?: number; limit?: number }>([
    withQuery(resolveProjectScopedPath(projectId, `/projects/${projectId}/welds`, '/welds'), params),
    withQuery('/welds', params),
  ]) || { items: [] };
}

export function getWeld(projectId: string | number, weldId: string | number) {
  return apiRequest<Weld>(`/projects/${projectId}/welds/${weldId}`);
}

export async function createWeld(payload: WeldFormValues) {
  const projectId = payload.project_id;
  const body = JSON.stringify(mapWeldPayload(payload));
  return await optionalRequest<Weld>([
    resolveProjectScopedPath(projectId, `/projects/${projectId}/welds`, '/welds'),
    '/welds',
  ], { method: 'POST', body }) as Weld;
}

export function updateWeld(projectId: string | number, weldId: string | number, payload: WeldFormValues) {
  return apiRequest<Weld>(`/projects/${projectId}/welds/${weldId}`, { method: 'PUT', body: JSON.stringify(mapWeldPayload(payload)) });
}

export function deleteWeld(projectId: string | number, weldId: string | number) {
  return apiRequest<void>(`/projects/${projectId}/welds/${weldId}`, { method: 'DELETE' });
}

export function getWeldInspections(projectId: string | number, weldId: string | number) {
  return apiRequest<Inspection[] | { items?: Inspection[] }>(`/projects/${projectId}/welds/${weldId}/inspections`);
}

export function getWeldDefects(projectId: string | number, weldId: string | number) {
  return apiRequest<Defect[] | { items?: Defect[] }>(`/projects/${projectId}/welds/${weldId}/defects`);
}

export function getWeldAttachments(projectId: string | number, weldId: string | number) {
  return apiRequest<CeDocument[] | { items?: CeDocument[] }>(`/projects/${projectId}/welds/${weldId}/attachments`);
}

export function uploadWeldAttachment(projectId: string | number, weldId: string | number, payload: FormData) {
  return uploadRequest<Record<string, unknown>>(`/projects/${projectId}/welds/${weldId}/attachments`, payload);
}

export function getWeldCompliance(projectId: string | number, weldId: string | number) {
  return optionalRequest<ComplianceOverview>([`/projects/${projectId}/welds/${weldId}/compliance`]);
}

export function resetWeldToNorm(projectId: string | number, weldId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/welds/${weldId}/reset-to-norm`, { method: 'POST' });
}

export function conformWeld(projectId: string | number, weldId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/welds/${weldId}/conform`, { method: 'POST' });
}

export function bulkApproveWelds(projectId: string | number, weldIds: Array<string | number>) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/welds/bulk-approve`, { method: 'POST', body: JSON.stringify({ weld_ids: weldIds }) });
}
