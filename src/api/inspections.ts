import { apiRequest, listRequest, optionalRequest } from '@/api/client';
import type { Inspection, WeldStatus } from '@/types/domain';
import type { ListParams } from '@/types/api';

type InspectionListResponse = Inspection[] | { items?: Inspection[]; total?: number; page?: number; limit?: number };
type InspectionDetailResponse = { exists?: boolean; inspection?: Record<string, unknown> | null } | Record<string, unknown>;

type InspectionCheckPayload = {
  id?: string | number;
  group_key: string;
  criterion_key: string;
  approved?: boolean;
  status?: WeldStatus | string;
  comment?: string;
};

type InspectionUpsertPayload = {
  status: WeldStatus | string;
  template_id?: string;
  remarks?: string;
  inspector?: string;
  checks?: InspectionCheckPayload[];
};

function normalizeStatus(value: unknown): WeldStatus {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'conform' || raw === 'approved' || raw === 'ok') return 'conform';
  if (raw === 'gerepareerd' || raw === 'resolved' || raw === 'repaired') return 'gerepareerd';
  return 'defect';
}

function normalizeCheck(row: Record<string, unknown>) {
  return {
    id: row.id as string | number | undefined,
    group_key: String(row.group_key || row.group || 'algemeen'),
    criterion_key: String(row.criterion_key || row.key || row.code || ''),
    approved: Boolean(row.approved ?? (normalizeStatus(row.status) !== 'defect')),
    status: normalizeStatus(row.status ?? (row.approved ? 'conform' : 'defect')),
    comment: String(row.comment || ''),
  };
}

function normalizeInspection(row: Record<string, unknown>): Inspection {
  return {
    ...(row as Inspection),
    id: row.id as string | number,
    weld_id: row.weld_id as string | number | undefined,
    template_id: row.template_id as string | number | undefined,
    result: normalizeStatus(row.result || row.status || 'defect'),
    status: normalizeStatus(row.status || row.result || 'defect'),
    inspector: String(row.inspector || row.inspector_name || ''),
    inspector_name: String(row.inspector_name || row.inspector || ''),
    due_date: String(row.due_date || row.inspected_at || ''),
    remarks: String(row.remarks || row.notes || ''),
    checks: Array.isArray(row.checks) ? row.checks.map((item) => normalizeCheck(item as Record<string, unknown>)) : [],
  };
}

function normalizeList(response: InspectionListResponse) {
  if (Array.isArray(response)) {
    return {
      items: response.map((row) => normalizeInspection(row as unknown as Record<string, unknown>)),
      total: response.length,
      page: 1,
      limit: response.length || 25,
    };
  }
  const items = Array.isArray(response?.items) ? response.items : [];
  return {
    items: items.map((row) => normalizeInspection(row as unknown as Record<string, unknown>)),
    total: Number(response?.total || items.length || 0),
    page: Number(response?.page || 1),
    limit: Number(response?.limit || 25),
  };
}

export async function getInspections(params?: ListParams) {
  return normalizeList(await listRequest<InspectionListResponse>('/inspections', params));
}

export async function getInspection(inspectionId: string | number) {
  const direct = await optionalRequest<Record<string, unknown>>([`/inspections/${inspectionId}`]);
  if (!direct) throw new Error('Inspectie niet gevonden.');
  return normalizeInspection(direct);
}

export async function getInspectionForWeld(projectId: string | number, weldId: string | number) {
  const scoped = await optionalRequest<InspectionDetailResponse>([
    `/welds/${weldId}/inspection`,
    `/projects/${projectId}/welds/${weldId}/inspection`,
  ]);
  if (!scoped) return null;
  const record = scoped as { exists?: boolean; inspection?: Record<string, unknown> | null };
  if (record.exists === false) return null;
  const source = record.inspection && typeof record.inspection === 'object' ? record.inspection : (scoped as Record<string, unknown>);
  return normalizeInspection(source);
}

export async function createInspection(projectId: string | number | undefined, weldId: string | number, payload: Record<string, unknown>) {
  const targetProjectId = String(projectId || payload.project_id || '');
  const response = await apiRequest<Record<string, unknown>>(`/projects/${targetProjectId}/welds/${weldId}/inspections`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeInspection(response);
}

async function requestInspectionUpsert(path: string, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, 0, true);
}

export async function upsertInspectionForWeld(projectId: string | number, weldId: string | number, payload: InspectionUpsertPayload) {
  const body = {
    overall_status: normalizeStatus(payload.status),
    template_id: payload.template_id || null,
    remarks: payload.remarks || null,
    inspector: payload.inspector || null,
    checks: (payload.checks || []).map((check) => ({
      group_key: check.group_key,
      criterion_key: check.criterion_key,
      applicable: true,
      approved: normalizeStatus(check.status ?? (check.approved ? 'conform' : 'defect')) !== 'defect',
      status: normalizeStatus(check.status ?? (check.approved ? 'conform' : 'defect')),
      comment: check.comment || null,
    })),
  };

  const candidates = [
    `/welds/${weldId}/inspection`,
    `/projects/${projectId}/welds/${weldId}/inspection`,
  ];

  for (const path of candidates) {
    try {
      const response = await requestInspectionUpsert(path, body);
      return normalizeInspection(response);
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'status' in error) {
        const status = Number((error as { status?: unknown }).status);
        if (status === 404 || status === 405) {
          continue;
        }
      }
      throw error;
    }
  }

  throw new Error('Inspectie opslaan mislukt. Geen bruikbaar endpoint gevonden.');
}

export async function updateInspection(inspectionId: string | number, payload: Record<string, unknown>) {
  const response = await apiRequest<Record<string, unknown>>(`/inspections/${inspectionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return normalizeInspection(response);
}

export async function deleteInspection(inspectionId: string | number) {
  return apiRequest<{ ok: boolean }>(`/inspections/${inspectionId}`, { method: 'DELETE' });
}

export async function getInspectionResults(inspectionId: string | number) {
  return apiRequest<Record<string, unknown>>(`/inspections/${inspectionId}/results`);
}

export async function createInspectionResult(inspectionId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/inspections/${inspectionId}/results`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getInspectionAttachments(inspectionId: string | number) {
  return apiRequest<{ items: Array<Record<string, unknown>>; total?: number }>(`/inspections/${inspectionId}/attachments`);
}

export async function uploadInspectionAttachment(inspectionId: string | number, payload: FormData) {
  return apiRequest<Record<string, unknown>>(`/inspections/${inspectionId}/attachments`, {
    method: 'POST',
    body: payload,
  });
}

export async function downloadInspectionAttachment(inspectionId: string | number, attachmentId: string | number) {
  return apiRequest<Blob>(`/inspections/${inspectionId}/attachments/${attachmentId}/download`, { method: 'GET' });
}

export async function getInspectionAudit(inspectionId: string | number) {
  return apiRequest<{ items: Array<Record<string, unknown>>; total?: number }>(`/inspections/${inspectionId}/audit`);
}

export async function approveInspection(inspectionId: string | number) {
  return apiRequest<Record<string, unknown>>(`/inspections/${inspectionId}/approve`, { method: 'POST' });
}
