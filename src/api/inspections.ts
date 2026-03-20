import { apiRequest, listRequest, optionalRequest, uploadRequest } from '@/api/client';
import { withQuery } from '@/utils/api';
import type { Inspection } from '@/types/domain';
import type { ListParams } from '@/types/api';

export async function getInspections(params?: ListParams) {
  const projectId = params?.project_id || params?.projectId;
  return await optionalRequest<Inspection[] | { items?: Inspection[] }>([
    withQuery(projectId ? `/projects/${projectId}/inspections` : '/inspections', params),
    withQuery('/inspections', params),
  ]) || { items: [] };
}

export function getInspection(inspectionId: string | number) {
  return apiRequest<Inspection>(`/inspections/${inspectionId}`);
}

export async function createInspection(projectId: string | number, weldId: string | number, payload: Record<string, unknown>) {
  return await optionalRequest<Inspection>([
    `/projects/${projectId}/welds/${weldId}/inspections`,
    '/inspections',
  ], { method: 'POST', body: JSON.stringify({ ...payload, project_id: projectId, weld_id: weldId }) }) as Inspection;
}

export function updateInspection(inspectionId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Inspection>(`/inspections/${inspectionId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteInspection(inspectionId: string | number) {
  return optionalRequest<void>([`/inspections/${inspectionId}`], { method: 'DELETE' });
}

export function getInspectionResults(inspectionId: string | number) {
  return apiRequest<Record<string, unknown>>(`/inspections/${inspectionId}/results`);
}

export function createInspectionResult(inspectionId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/inspections/${inspectionId}/results`, { method: 'POST', body: JSON.stringify(payload) });
}

export function uploadInspectionAttachment(inspectionId: string | number, payload: FormData) {
  return optionalRequest<Record<string, unknown>>([
    `/inspections/${inspectionId}/attachments`,
    `/inspections/${inspectionId}/documents`,
  ], { method: 'POST', body: payload });
}

export function approveInspection(inspectionId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/inspections/${inspectionId}/approve`,
    `/inspections/${inspectionId}/conform`,
  ], { method: 'POST' });
}

export function uploadInspectionPhoto(inspectionId: string | number, payload: FormData) {
  return uploadRequest<Record<string, unknown>>(`/inspections/${inspectionId}/photos`, payload);
}
