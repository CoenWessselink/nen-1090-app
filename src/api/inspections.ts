import { apiRequest, listRequest } from '@/api/client';
import type { Inspection } from '@/types/domain';
import type { ListParams } from '@/types/api';

function normalizeInspection(row: Record<string, unknown>): Inspection {
  return {
    ...(row as Inspection),
    id: row.id as string | number,
    weld_id: row.weld_id as string | number | undefined,
    result: String(row.result || row.status || ''),
    status: String(row.status || row.result || 'open'),
    inspector: String(row.inspector || row.inspector_name || ''),
    inspector_name: String(row.inspector_name || row.inspector || ''),
    due_date: String(row.due_date || ''),
  };
}

export async function getInspections(params?: ListParams) {
  const weldId = (params as Record<string, unknown> | undefined)?.weld_id;
  const query = weldId ? ({ weld_id: String(weldId) } as ListParams) : undefined;
  const response = await listRequest<Inspection[] | { items?: Inspection[]; total?: number; page?: number; limit?: number }>('/inspections', query);
  if (Array.isArray(response)) return { items: response.map((row) => normalizeInspection(row as unknown as Record<string, unknown>)), total: response.length, page: 1, limit: response.length || 25 };
  const items = Array.isArray(response?.items) ? response.items : [];
  return { items: items.map((row) => normalizeInspection(row as unknown as Record<string, unknown>)), total: Number(response?.total || items.length || 0), page: Number(response?.page || 1), limit: Number(response?.limit || 25) };
}

export async function getInspection(inspectionId: string | number) {
  const rows = await getInspections();
  const match = rows.items.find((item) => String(item.id) === String(inspectionId));
  if (!match) throw new Error('Inspectie niet gevonden in huidige API-response.');
  return match;
}

export async function createInspection(projectId: string | number | undefined, weldId: string | number, payload: Record<string, unknown>) {
  await apiRequest<Record<string, unknown>>('/inspections', { method: 'POST', body: JSON.stringify({ ...payload, project_id: projectId, weld_id: weldId }) });
  const rows = await getInspections({ weld_id: String(weldId) } as ListParams);
  return rows.items[0] || { ok: true };
}

export async function updateInspection(inspectionId: string | number, payload: Record<string, unknown>) {
  await apiRequest<Record<string, unknown>>('/inspections', { method: 'POST', body: JSON.stringify({ ...payload, id: inspectionId }) });
  return await getInspection(inspectionId);
}

export async function deleteInspection(_inspectionId: string | number) { return { ok: false, unsupported: true }; }
export async function getInspectionResults(inspectionId: string | number) { const item = await getInspection(inspectionId); return { inspection_id: inspectionId, result: item.result || item.status || '', checks: (item as Record<string, unknown>).checks || [] }; }
export async function createInspectionResult(inspectionId: string | number, payload: Record<string, unknown>) { return await updateInspection(inspectionId, payload); }
export async function getInspectionAttachments(_inspectionId: string | number) { return { items: [], total: 0, page: 1, limit: 25 }; }
export async function uploadInspectionAttachment(_inspectionId: string | number, _payload: FormData) { return { ok: false, unsupported: true }; }
export async function downloadInspectionAttachment(_inspectionId: string | number, _attachmentId: string | number) { return new Blob([]); }
export async function getInspectionAudit(_inspectionId: string | number) { return { items: [], total: 0, page: 1, limit: 25 }; }
export async function approveInspection(inspectionId: string | number) { return await updateInspection(inspectionId, { status: 'approved', result: 'approved' }); }
