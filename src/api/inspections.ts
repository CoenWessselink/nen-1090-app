import { optionalRequest, downloadRequest } from '@/api/client';
import { buildQueryString } from '@/utils/api';
import type { Inspection } from '@/types/domain';
import type { ListParams } from '@/types/api';

export async function getInspections(params?: ListParams) {
  return (
    await optionalRequest<Inspection[] | { items?: Inspection[] }>([
      `/inspections${buildQueryString(params)}`,
    ])
  ) || [];
}

export function getInspection(inspectionId: string | number) {
  return optionalRequest<Inspection>([`/inspections/${inspectionId}`]) as Promise<Inspection>;
}

export async function createInspection(projectId: string | number | undefined, weldId: string | number, payload: Record<string, unknown>) {
  return (
    await optionalRequest<Inspection>([
      '/inspections',
      `/welds/${weldId}/inspection`,
    ], {
      method: 'POST',
      body: JSON.stringify({ ...payload, project_id: projectId || null, weld_id: weldId }),
    })
  ) as Inspection;
}

export function updateInspection(inspectionId: string | number, payload: Record<string, unknown>) {
  return optionalRequest<Inspection>([`/inspections/${inspectionId}`], {
    method: 'PUT',
    body: JSON.stringify(payload),
  }) as Promise<Inspection>;
}

export function deleteInspection(inspectionId: string | number) {
  return optionalRequest<void>([`/inspections/${inspectionId}`], { method: 'DELETE' }) as Promise<void>;
}

export function getInspectionResults(inspectionId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/inspections/${inspectionId}/results`,
    `/inspections/${inspectionId}`,
  ]) || Promise.resolve({});
}

export function createInspectionResult(inspectionId: string | number, payload: Record<string, unknown>) {
  return optionalRequest<Record<string, unknown>>([
    `/inspections/${inspectionId}/results`,
    `/inspections/${inspectionId}`,
  ], { method: 'POST', body: JSON.stringify(payload) }) as Promise<Record<string, unknown>>;
}

export function getInspectionAttachments(inspectionId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/inspections/${inspectionId}/attachments`,
    `/inspections/${inspectionId}/documents`,
  ]) || Promise.resolve({ items: [] });
}

export function uploadInspectionAttachment(inspectionId: string | number, payload: FormData) {
  return optionalRequest<Record<string, unknown>>([
    `/inspections/${inspectionId}/attachments`,
    `/inspections/${inspectionId}/documents`,
    '/photos',
  ], { method: 'POST', body: payload }) as Promise<Record<string, unknown>>;
}

export function downloadInspectionAttachment(inspectionId: string | number, attachmentId: string | number) {
  return downloadRequest(`/inspections/${inspectionId}/attachments/${attachmentId}/download`);
}

export function getInspectionAudit(inspectionId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/inspections/${inspectionId}/audit`,
  ]) || Promise.resolve({ items: [] });
}

export function approveInspection(inspectionId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/inspections/${inspectionId}/approve`,
    `/inspections/${inspectionId}/conform`,
  ], { method: 'POST' }) as Promise<Record<string, unknown>>;
}

export function uploadInspectionPhoto(inspectionId: string | number, payload: FormData) {
  return optionalRequest<Record<string, unknown>>([
    `/inspections/${inspectionId}/photos`,
    '/photos',
  ], { method: 'POST', body: payload }) as Promise<Record<string, unknown>>;
}
