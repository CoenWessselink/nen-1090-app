import { apiRequest, listRequest, optionalRequest } from '@/api/client';
import type { ApiListResponse, ListParams } from '@/types/api';
import type { CeDocument, ComplianceOverview, Defect, Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

type PagedResponse<T> = ApiListResponse<T> | T[] | { items?: T[]; total?: number; page?: number; limit?: number; data?: T[] };

type WeldStatus = 'conform' | 'defect' | 'gerepareerd';

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

function normalizeStatus(value: unknown): WeldStatus {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'conform' || raw === 'approved' || raw === 'ok') return 'conform';
  if (raw === 'gerepareerd' || raw === 'resolved' || raw === 'repaired') return 'gerepareerd';
  return 'defect';
}

function projectWeldsBase(projectId: string | number) {
  return `/projects/${projectId}/welds`;
}

function mapWeldPayload(payload: WeldFormValues & { id?: string | number }) {
  return {
    id: payload.id ?? null,
    project_id: payload.project_id || null,
    assembly_id: payload.assembly_id || null,
    weld_no: payload.weld_number,
    weld_number: payload.weld_number,
    location: payload.location || null,
    process: payload.process || null,
    welders: payload.welder_name || null,
    welder_name: payload.welder_name || null,
    wps: payload.wps_id || null,
    wps_id: payload.wps_id || null,
    execution_class: payload.execution_class || null,
    template_id: payload.template_id || null,
    status: normalizeStatus(payload.status || 'defect'),
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
    status: normalizeStatus(row.status || 'defect'),
    execution_class: row.execution_class ? String(row.execution_class) : '',
    template_id: row.template_id ? String(row.template_id) : '',
  };
}

export async function getWelds(params?: ListParams) {
  const projectId = params?.project_id;
  const response = projectId
    ? await listRequest<PagedResponse<Weld>>(projectWeldsBase(String(projectId)), params)
    : await listRequest<PagedResponse<Weld>>('/welds', params);
  const paged = normalizePagedList<Weld>(response, params?.limit || 25);
  return {
    ...paged,
    items: paged.items.map((item) => normalizeWeld(item as unknown as Record<string, unknown>)),
  };
}

export async function getWeld(projectId: string | number, weldId: string | number) {
  const scoped = await optionalRequest<Record<string, unknown>>([
    `${projectWeldsBase(projectId)}/${weldId}`,
    `/welds/${weldId}`,
  ]);
  if (!scoped) throw new Error('Las niet gevonden.');
  return normalizeWeld(scoped);
}

export async function createWeld(payload: WeldFormValues) {
  if (!payload.project_id) throw new Error('Project-ID ontbreekt bij het aanmaken van een las.');
  const response = await apiRequest<Record<string, unknown>>(projectWeldsBase(String(payload.project_id)), {
    method: 'POST',
    body: JSON.stringify(mapWeldPayload(payload)),
  });
  const createdId = response?.id || response?.weld_id;
  if (!createdId) return normalizeWeld(response);
  return await getWeld(String(payload.project_id), createdId as string | number);
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
    execution_class: (String(source.execution_class || '') || '') as '' | 'EXC1' | 'EXC2' | 'EXC3' | 'EXC4',
    template_id: String(source.template_id || ''),
    status: normalizeStatus(source.status || 'conform'),
  });
}

export async function updateWeld(projectId: string | number, weldId: string | number, payload: WeldFormValues) {
  const body = JSON.stringify(mapWeldPayload({ ...payload, id: weldId, project_id: String(projectId) }));
  const direct =
    (await optionalRequest<Record<string, unknown>>([
      `${projectWeldsBase(projectId)}/${weldId}`,
      `/welds/${weldId}`,
    ], {
      method: 'PUT',
      body,
    })) ||
    (await optionalRequest<Record<string, unknown>>([
      `${projectWeldsBase(projectId)}/${weldId}`,
      `/welds/${weldId}`,
    ], {
      method: 'PATCH',
      body,
    }));

  if (!direct) throw new Error('Las opslaan mislukt. Geen bruikbaar endpoint gevonden.');
  return normalizeWeld(direct);
}

export async function deleteWeld(projectId: string | number, weldId: string | number) {
  const direct = await optionalRequest<Record<string, unknown>>([
    `${projectWeldsBase(projectId)}/${weldId}`,
    `/welds/${weldId}`,
  ], {
    method: 'DELETE',
  });
  if (direct) return direct;
  return { ok: false, unsupported: true };
}

export async function patchWeldStatus(projectId: string | number, weldId: string | number, status: WeldStatus) {
  const response =
    (await optionalRequest<Record<string, unknown>>([
      `${projectWeldsBase(projectId)}/${weldId}/status`,
      `/welds/${weldId}/status`,
    ], {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })) ||
    (await optionalRequest<Record<string, unknown>>([
      `${projectWeldsBase(projectId)}/${weldId}`,
      `/welds/${weldId}`,
    ], {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }));

  if (!response) throw new Error('Status wijzigen mislukt. Geen bruikbaar endpoint gevonden.');
  return { id: String(response.id || weldId), status: normalizeStatus(response.status || status) };
}

export async function getWeldInspections(projectId: string | number, weldId: string | number) {
  const direct =
    (await optionalRequest<PagedResponse<Inspection>>([`${projectWeldsBase(projectId)}/${weldId}/inspections`])) ||
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
    (await optionalRequest<PagedResponse<CeDocument>>([`${projectWeldsBase(projectId)}/${weldId}/attachments`])) ||
    (await listRequest<PagedResponse<CeDocument>>('/photos', {
      project_id: String(projectId),
      weld_id: String(weldId),
    } as ListParams));

  return normalizePagedList<CeDocument>(direct, 25);
}

export async function uploadWeldAttachment(projectId: string | number, weldId: string | number, payload: FormData) {
  const direct = await optionalRequest<Record<string, unknown>>([`${projectWeldsBase(projectId)}/${weldId}/attachments`], {
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
  const direct = await optionalRequest<ComplianceOverview>([`${projectWeldsBase(projectId)}/${weldId}/compliance`]);
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
  const direct = await optionalRequest<Record<string, unknown>>([`${projectWeldsBase(projectId)}/${weldId}/reset-to-norm`], {
    method: 'POST',
  });
  if (direct) return direct;

  return await updateWeld(projectId, weldId, {
    project_id: String(projectId),
    weld_number: String(weldId),
    location: '',
    status: 'conform',
  });
}

export async function conformWeld(projectId: string | number, weldId: string | number) {
  const direct = await optionalRequest<Record<string, unknown>>([`${projectWeldsBase(projectId)}/${weldId}/conform`], {
    method: 'POST',
  });
  if (direct) return direct;

  return await updateWeld(projectId, weldId, {
    project_id: String(projectId),
    weld_number: String(weldId),
    location: '',
    status: 'conform',
  });
}

export async function bulkApproveWelds(projectId: string | number, weldIds: Array<string | number>) {
  const direct = await optionalRequest<Record<string, unknown>>([`${projectWeldsBase(projectId)}/bulk-approve`], {
    method: 'POST',
    body: JSON.stringify({ weld_ids: weldIds.map(String) }),
  });
  if (direct) return direct;
  return { ok: false, unsupported: true };
}
