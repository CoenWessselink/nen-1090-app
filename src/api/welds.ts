import { apiRequest, listRequest, optionalRequest } from '@/api/client';
import type { ApiListResponse, ListParams } from '@/types/api';
import type { CeDocument, ComplianceOverview, Defect, Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

type PagedResponse<T> = ApiListResponse<T> | T[] | { items?: T[]; total?: number; page?: number; limit?: number; data?: T[] };

function normalizePagedList<T>(response: PagedResponse<T>, fallbackLimit = 25) {
  if (Array.isArray(response)) {
    return {
      items: response,
      total: response.length,
      page: 1,
      limit: fallbackLimit || response.length || 25,
    };
  }

  const items = Array.isArray(response?.items)
    ? response.items
    : Array.isArray((response as { data?: T[] })?.data)
      ? (response as { data?: T[] }).data || []
      : [];

  return {
    items,
    total: Number((response as { total?: number })?.total || items.length || 0),
    page: Number((response as { page?: number })?.page || 1),
    limit: Number((response as { limit?: number })?.limit || fallbackLimit || 25),
  };
}

function mapWeldPayload(payload: WeldFormValues & { id?: string | number }) {
  return {
    id: payload.id ?? null,
    project_id: payload.project_id || null,
    assembly_id: payload.assembly_id || null,
    weld_no: payload.weld_number,
    location: payload.location || null,
    process: payload.process || null,
    welders: payload.welder_name || null,
    wps: payload.wps_id || null,
    status: payload.status || 'conform',
  };
}

function normalizeWeld(row: Record<string, unknown>): Weld {
  return {
    ...(row as Weld),
    id: row.id as string | number,
    project_id: row.project_id as string | number | undefined,
    assembly_id: row.assembly_id as string | number | undefined,
    weld_number: String(row.weld_number || row.weld_no || ''),
    weld_no: String(row.weld_no || row.weld_number || ''),
    welder_name: String(row.welder_name || row.welders || ''),
    welders: String(row.welders || row.welder_name || ''),
    wps_id: String(row.wps_id || row.wps || ''),
    wps: String(row.wps || row.wps_id || ''),
    location: String(row.location || ''),
    process: String(row.process || ''),
    status: String(row.status || ''),
  };
}

export async function getWelds(params?: ListParams) {
  const response = await listRequest<PagedResponse<Weld>>('/welds', params);
  const paged = normalizePagedList<Weld>(response, params?.limit || 25);
  return {
    ...paged,
    items: paged.items.map((item) => normalizeWeld(item as unknown as Record<string, unknown>)),
  };
}

export async function getWeld(projectId: string | number, weldId: string | number) {
  const scoped = await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/welds/${weldId}`]);
  if (scoped) return normalizeWeld(scoped);

  const rows = await getWelds({ project_id: String(projectId) });
  const match = rows.items.find((item) => String(item.id) === String(weldId));
  if (!match) throw new Error('Las niet gevonden in huidige API-response.');
  return match;
}

export async function createWeld(payload: WeldFormValues) {
  const response = await apiRequest<Record<string, unknown>>('/welds', {
    method: 'POST',
    body: JSON.stringify(mapWeldPayload(payload)),
  });
  const createdId = response?.id || response?.weld_id;
  if (!createdId) return response;
  return await getWeld(String(payload.project_id || ''), createdId as string | number);
}

export async function copyWeld(projectId: string | number, weldId: string | number, weldNumber?: string) {
  const source = await getWeld(projectId, weldId);
  return await createWeld({
    project_id: String(source.project_id || projectId || ''),
    weld_number: weldNumber || `${String(source.weld_number || source.weld_no || source.id)}-kopie`,
    assembly_id: String(source.assembly_id || ''),
    wps_id: String(source.wps_id || source.wps || ''),
    welder_name: String(source.welder_name || source.welders || ''),
    process: String(source.process || '135'),
    location: String(source.location || ''),
    status: String(source.status || 'conform'),
  });
}

export async function updateWeld(projectId: string | number, weldId: string | number, payload: WeldFormValues) {
  const direct =
    (await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/welds/${weldId}`], {
      method: 'PUT',
      body: JSON.stringify(mapWeldPayload({ ...payload, id: weldId, project_id: String(projectId) })),
    })) ||
    (await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/welds/${weldId}`], {
      method: 'PATCH',
      body: JSON.stringify(mapWeldPayload({ ...payload, id: weldId, project_id: String(projectId) })),
    }));

  if (direct) return normalizeWeld(direct);

  await apiRequest<Record<string, unknown>>('/welds', {
    method: 'POST',
    body: JSON.stringify(mapWeldPayload({ ...payload, id: weldId, project_id: String(projectId) })),
  });
  return await getWeld(String(projectId), weldId);
}

export async function deleteWeld(projectId: string | number, weldId: string | number) {
  const direct = await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/welds/${weldId}`], {
    method: 'DELETE',
  });
  if (direct) return direct;
  return { ok: false, unsupported: true };
}

export async function getWeldInspections(projectId: string | number, weldId: string | number) {
  const direct =
    (await optionalRequest<PagedResponse<Inspection>>([`/projects/${projectId}/welds/${weldId}/inspections`])) ||
    (await listRequest<PagedResponse<Inspection>>('/inspections', { weld_id: String(weldId) } as ListParams));

  return normalizePagedList<Inspection>(direct, 25);
}

export async function getWeldDefects(projectId: string | number, weldId: string | number) {
  const rows = await listRequest<PagedResponse<Defect>>('/weld-defects', {
    project_id: String(projectId),
    weld_id: String(weldId),
    limit: 25,
  } as ListParams);
  return normalizePagedList<Defect>(rows, 25);
}

export async function getWeldAttachments(projectId: string | number, weldId: string | number) {
  const direct =
    (await optionalRequest<PagedResponse<CeDocument>>([`/projects/${projectId}/welds/${weldId}/attachments`])) ||
    (await listRequest<PagedResponse<CeDocument>>('/photos', {
      project_id: String(projectId),
      weld_id: String(weldId),
    } as ListParams));

  return normalizePagedList<CeDocument>(direct, 25);
}

export async function uploadWeldAttachment(projectId: string | number, weldId: string | number, payload: FormData) {
  const direct = await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/welds/${weldId}/attachments`], {
    method: 'POST',
    body: payload,
  });
  if (direct) return direct;

  const file = payload.get('files') || payload.get('file');
  const name =
    typeof file === 'object' && file && 'name' in file
      ? String((file as { name?: unknown }).name || 'bijlage')
      : 'bijlage';

  return apiRequest<Record<string, unknown>>('/photos', {
    method: 'POST',
    body: JSON.stringify({
      project_id: String(projectId),
      weld_id: String(weldId),
      name,
      mime: typeof file === 'object' && file && 'type' in file ? String((file as { type?: unknown }).type || '') : '',
      has_data: false,
    }),
  });
}

export async function getWeldCompliance(projectId: string | number, weldId: string | number) {
  const direct = await optionalRequest<ComplianceOverview>([`/projects/${projectId}/welds/${weldId}/compliance`]);
  if (direct) return direct;

  const inspections = await getWeldInspections(projectId, weldId);
  const attachments = await getWeldAttachments(projectId, weldId);

  return {
    score: inspections.total ? 75 : attachments.total ? 50 : 0,
    checklist: [
      { id: 'weld', label: 'Las aanwezig', completed: true },
      { id: 'inspection', label: 'Inspectie gekoppeld', completed: inspections.total > 0 },
      { id: 'attachment', label: 'Bijlagen aanwezig', completed: attachments.total > 0 },
    ],
    missing_items: [
      ...(inspections.total > 0 ? [] : [{ id: 'inspection-missing', label: 'Inspectie ontbreekt' }]),
      ...(attachments.total > 0 ? [] : [{ id: 'attachment-missing', label: 'Bijlagen ontbreken' }]),
    ],
  } as ComplianceOverview;
}

export async function resetWeldToNorm(projectId: string | number, weldId: string | number) {
  const direct = await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/welds/${weldId}/reset-to-norm`], {
    method: 'POST',
  });
  if (direct) return direct;

  const current = await getWeld(projectId, weldId);
  return await updateWeld(projectId, weldId, {
    project_id: String(current.project_id || projectId || ''),
    weld_number: String(current.weld_number || current.weld_no || ''),
    assembly_id: String(current.assembly_id || ''),
    wps_id: String(current.wps_id || current.wps || ''),
    welder_name: String(current.welder_name || current.welders || ''),
    process: String(current.process || '135'),
    location: String(current.location || ''),
    status: 'concept',
  });
}

export async function conformWeld(projectId: string | number, weldId: string | number) {
  const direct = await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/welds/${weldId}/conform`], {
    method: 'POST',
  });
  if (direct) return direct;

  const current = await getWeld(projectId, weldId);
  return await updateWeld(projectId, weldId, {
    project_id: String(current.project_id || projectId || ''),
    weld_number: String(current.weld_number || current.weld_no || ''),
    assembly_id: String(current.assembly_id || ''),
    wps_id: String(current.wps_id || current.wps || ''),
    welder_name: String(current.welder_name || current.welders || ''),
    process: String(current.process || '135'),
    location: String(current.location || ''),
    status: 'conform',
  });
}

export async function bulkApproveWelds(projectId: string | number, weldIds: Array<string | number>) {
  const direct = await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/welds/bulk-approve`], {
    method: 'POST',
    body: JSON.stringify({ weld_ids: weldIds }),
  });
  if (direct) return { ok: true, count: Number(direct.approved || direct.count || weldIds.length), items: weldIds };

  const results = [];
  for (const weldId of weldIds) results.push(await conformWeld(projectId, weldId));
  return { ok: true, count: results.length, items: results };
}
