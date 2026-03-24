import { apiRequest, listRequest, uploadRequest } from '@/api/client';
import type { ApiListResponse, ListParams } from '@/types/api';
import type { CeDocument, ComplianceOverview, Defect, Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

function mapWeldPayload(payload: WeldFormValues & { id?: string | number }) {
  return {
    id: payload.id ?? null,
    project_id: payload.project_id || null,
    assembly_id: payload.assembly_id || null,
    weld_no: payload.weld_number,
    location: payload.location,
    process: payload.process || null,
    welders: payload.welder_name || null,
    wps: payload.wps_id || null,
    status: payload.status || 'open',
  };
}

export function getWelds(params?: ListParams) {
  return listRequest<ApiListResponse<Weld> | Weld[]>('/welds', params);
}

export async function getWeld(projectId: string | number, weldId: string | number) {
  const rows = await getWelds({ project_id: String(projectId) });
  const items = Array.isArray(rows) ? rows : rows?.items || [];
  const match = items.find((item) => String(item.id) === String(weldId));
  if (!match) throw new Error('Las niet gevonden in huidige API-response.');
  return match;
}

export function createWeld(payload: WeldFormValues) {
  return apiRequest<Record<string, unknown>>('/welds', {
    method: 'POST',
    body: JSON.stringify(mapWeldPayload(payload)),
  });
}

export function copyWeld(_projectId: string | number, _weldId: string | number, _weldNumber?: string) {
  throw new Error('Kopiëren van lassen wordt niet ondersteund door de huidige live API.');
}

export function updateWeld(projectId: string | number, weldId: string | number, payload: WeldFormValues) {
  return apiRequest<Record<string, unknown>>('/welds', {
    method: 'POST',
    body: JSON.stringify(mapWeldPayload({ ...payload, id: weldId, project_id: String(projectId) })),
  });
}

export function deleteWeld(_projectId: string | number, _weldId: string | number) {
  throw new Error('Verwijderen van lassen wordt niet ondersteund door de huidige live API.');
}

export function getWeldInspections(_projectId: string | number, weldId: string | number) {
  return listRequest<ApiListResponse<Inspection> | Inspection[]>('/inspections', { weld_id: String(weldId) } as ListParams);
}

export async function getWeldDefects(_projectId: string | number, _weldId: string | number) {
  return { items: [] as Defect[], total: 0, page: 1, limit: 25 };
}

export async function getWeldAttachments(_projectId: string | number, _weldId: string | number) {
  return { items: [] as CeDocument[], total: 0, page: 1, limit: 25 };
}

export function uploadWeldAttachment(_projectId: string | number, _weldId: string | number, _payload: FormData) {
  return uploadRequest<Record<string, unknown>>('/photos', new FormData());
}

export async function getWeldCompliance(_projectId: string | number, _weldId: string | number) {
  return { score: 0, checklist: [], missing_items: [] } as ComplianceOverview;
}

export function resetWeldToNorm(_projectId: string | number, _weldId: string | number) {
  throw new Error('Reset to norm wordt niet ondersteund door de huidige live API.');
}

export function conformWeld(_projectId: string | number, _weldId: string | number) {
  throw new Error('Conform zetten wordt niet ondersteund door de huidige live API.');
}

export function bulkApproveWelds(_projectId: string | number, _weldIds: Array<string | number>) {
  throw new Error('Bulk accorderen wordt niet ondersteund door de huidige live API.');
}
