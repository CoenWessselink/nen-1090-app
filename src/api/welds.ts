import { optionalRequest } from '@/api/client';
import { buildQueryString } from '@/utils/api';
import type { ApiListResponse, ListParams } from '@/types/api';
import type { CeDocument, ComplianceOverview, Defect, Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

function mapWeldPayload(payload: WeldFormValues) {
  return {
    weld_no: payload.weld_number,
    project_id: payload.project_id || null,
    location: payload.location,
    assembly_id: payload.assembly_id || null,
    wps: payload.wps_id || null,
    process: payload.process || null,
    welders: payload.welder_name || null,
    status: payload.status,
  };
}

function withQuery(path: string, params?: ListParams) {
  return `${path}${buildQueryString(params)}`;
}

export async function getWelds(params?: ListParams) {
  return (
    await optionalRequest<ApiListResponse<Weld> | Weld[]>([
      withQuery('/welds', params),
    ])
  ) || [];
}

export function getWeld(projectId: string | number, weldId: string | number) {
  return optionalRequest<Weld>([
    `/welds/${weldId}`,
    `/projects/${projectId}/welds/${weldId}`,
  ]) as Promise<Weld>;
}

export async function createWeld(payload: WeldFormValues) {
  return (
    await optionalRequest<Weld>([
      '/welds',
    ], {
      method: 'POST',
      body: JSON.stringify(mapWeldPayload(payload)),
    })
  ) as Weld;
}

export function copyWeld(projectId: string | number, weldId: string | number, weldNumber?: string) {
  return optionalRequest<Weld>([
    `/projects/${projectId}/welds/${weldId}/copy`,
  ], {
    method: 'POST',
    body: JSON.stringify(weldNumber ? { weld_number: weldNumber, weld_no: weldNumber } : {}),
  }) as Promise<Weld>;
}

export function updateWeld(projectId: string | number, weldId: string | number, payload: WeldFormValues) {
  return optionalRequest<Weld>([
    `/welds/${weldId}`,
    `/projects/${projectId}/welds/${weldId}`,
  ], {
    method: 'PUT',
    body: JSON.stringify(mapWeldPayload(payload)),
  }) as Promise<Weld>;
}

export function deleteWeld(projectId: string | number, weldId: string | number) {
  return optionalRequest<void>([
    `/welds/${weldId}`,
    `/projects/${projectId}/welds/${weldId}`,
  ], { method: 'DELETE' }) as Promise<void>;
}

export async function getWeldInspections(projectId: string | number, weldId: string | number) {
  return (
    await optionalRequest<ApiListResponse<Inspection> | Inspection[]>([
      `/inspections?weld_id=${encodeURIComponent(String(weldId))}`,
      `/projects/${projectId}/welds/${weldId}/inspections`,
    ])
  ) || [];
}

export async function getWeldDefects(projectId: string | number, weldId: string | number) {
  return (
    await optionalRequest<ApiListResponse<Defect> | Defect[]>([
      `/weld-defects?weld_id=${encodeURIComponent(String(weldId))}`,
      `/projects/${projectId}/welds/${weldId}/defects`,
      `/projects/${projectId}/welds/${weldId}/weld-defects`,
    ])
  ) || [];
}

export async function getWeldAttachments(projectId: string | number, weldId: string | number) {
  return (
    await optionalRequest<ApiListResponse<CeDocument> | CeDocument[]>([
      `/photos?weld_id=${encodeURIComponent(String(weldId))}`,
      `/projects/${projectId}/welds/${weldId}/attachments`,
    ])
  ) || [];
}

export async function uploadWeldAttachment(projectId: string | number, weldId: string | number, payload: FormData) {
  return (
    await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/welds/${weldId}/attachments`,
      '/photos',
    ], { method: 'POST', body: payload })
  ) || {};
}

export async function getWeldCompliance(projectId: string | number, weldId: string | number) {
  const ce = await optionalRequest<Record<string, unknown>>([
    `/ce_export/${projectId}`,
    `/projects/${projectId}/welds/${weldId}/compliance`,
  ]);

  if (!ce || typeof ce !== 'object') {
    return { score: 0, checklist: [], missing_items: [] } as ComplianceOverview;
  }

  const source = ce as Record<string, unknown>;
  const welds = Array.isArray(source.welds) ? (source.welds as Array<Record<string, unknown>>) : [];
  const current = welds.find((item) => String(item.id) === String(weldId));

  return {
    score: current ? 100 : 0,
    checklist: current ? [{ label: 'Las aanwezig in CE export', completed: true }] : [],
    missing_items: current ? [] : [{ label: 'Las ontbreekt in CE export', severity: 'warning' }],
  } as ComplianceOverview;
}

export function resetWeldToNorm(projectId: string | number, weldId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/projects/${projectId}/welds/${weldId}/reset-to-norm`,
  ], { method: 'POST' }) as Promise<Record<string, unknown>>;
}

export function conformWeld(projectId: string | number, weldId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/projects/${projectId}/welds/${weldId}/conform`,
  ], { method: 'POST' }) as Promise<Record<string, unknown>>;
}

export function bulkApproveWelds(projectId: string | number, weldIds: Array<string | number>) {
  return optionalRequest<Record<string, unknown>>([
    `/projects/${projectId}/welds/bulk-approve`,
  ], { method: 'POST', body: JSON.stringify({ weld_ids: weldIds }) }) as Promise<Record<string, unknown>>;
}
