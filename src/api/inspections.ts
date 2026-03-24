import { apiRequest, listRequest } from '@/api/client';
import type { Inspection } from '@/types/domain';
import type { ListParams } from '@/types/api';

export function getInspections(params?: ListParams) {
  const weldId = (params as Record<string, unknown> | undefined)?.weld_id;
  const query = weldId ? ({ weld_id: String(weldId) } as ListParams) : undefined;
  return listRequest<Inspection[]>('/inspections', query);
}

export async function getInspection(inspectionId: string | number) {
  const rows = await getInspections();
  const match = rows.find((item) => String(item.id) === String(inspectionId));
  if (!match) throw new Error('Inspectie niet gevonden in huidige API-response.');
  return match;
}

export function createInspection(projectId: string | number | undefined, weldId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/inspections', {
    method: 'POST',
    body: JSON.stringify({ ...payload, project_id: projectId, weld_id: weldId }),
  });
}

export function updateInspection(inspectionId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/inspections', {
    method: 'POST',
    body: JSON.stringify({ ...payload, id: inspectionId }),
  });
}

export function deleteInspection(_inspectionId: string | number) {
  throw new Error('Verwijderen van inspecties wordt niet ondersteund door de huidige live API.');
}

export async function getInspectionResults(_inspectionId: string | number) {
  return {};
}

export function createInspectionResult(_inspectionId: string | number, _payload: Record<string, unknown>) {
  throw new Error('Inspectieresultaten opslaan wordt niet ondersteund door de huidige live API.');
}

export async function getInspectionAttachments(_inspectionId: string | number) {
  return { items: [] };
}

export function uploadInspectionAttachment(_inspectionId: string | number, _payload: FormData) {
  throw new Error('Inspectiebijlagen uploaden wordt niet ondersteund door de huidige live API.');
}

export function downloadInspectionAttachment(_inspectionId: string | number, _attachmentId: string | number) {
  throw new Error('Inspectiebijlagen downloaden wordt niet ondersteund door de huidige live API.');
}

export async function getInspectionAudit(_inspectionId: string | number) {
  return { items: [] };
}

export function approveInspection(_inspectionId: string | number) {
  throw new Error('Inspecties accorderen wordt niet ondersteund door de huidige live API.');
}

export function uploadInspectionPhoto(_inspectionId: string | number, _payload: FormData) {
  throw new Error('Inspectiefoto uploaden wordt niet ondersteund door de huidige live API.');
}
