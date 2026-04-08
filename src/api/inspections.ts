
import { apiRequest, optionalRequest } from './client';
import type { ListParams } from '@/types/api';

function withQuery(path: string, params?: ListParams): string {
  if (!params) return path;
  const sp = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    sp.set(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export function getInspections(params?: ListParams) {
  return apiRequest(withQuery('/inspections', params));
}

export function getInspection(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}`);
}

export function getInspectionForWeld(projectId: string | number, weldId: string | number) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/inspection`,
    `/welds/${weldId}/inspection`,
  ]);
}

export function upsertInspectionForWeld(projectId: string | number, weldId: string | number, data: unknown) {
  return optionalRequest([
    `/welds/${weldId}/inspection`,
    `/projects/${projectId}/welds/${weldId}/inspection`,
  ], { method: 'PUT', body: JSON.stringify(data) });
}

export function createInspection(projectId: string | number, weldId: string | number, payload: unknown) {
  return optionalRequest([
    `/projects/${projectId}/welds/${weldId}/inspections`,
    `/welds/${weldId}/inspections`,
  ], { method: 'POST', body: JSON.stringify(payload) });
}

export function updateInspection(inspectionId: string | number, payload: unknown) {
  return apiRequest(`/inspections/${inspectionId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteInspection(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}`, { method: 'DELETE' });
}

export function createInspectionResult(inspectionId: string | number, payload: unknown) {
  return optionalRequest([
    `/inspections/${inspectionId}/results`,
  ], { method: 'POST', body: JSON.stringify(payload) });
}

export function approveInspection(inspectionId: string | number) {
  return optionalRequest([
    `/inspections/${inspectionId}/approve`,
  ], { method: 'POST' });
}

export function uploadInspectionAttachment(inspectionId: string | number, formData: FormData) {
  return optionalRequest([
    `/inspections/${inspectionId}/attachments`,
  ], { method: 'POST', body: formData });
}

export function downloadInspectionAttachment(inspectionId: string | number, attachmentId: string | number) {
  return apiRequest(`/inspections/${inspectionId}/attachments/${attachmentId}/download`, undefined, 0, true);
}

export function getInspectionAttachments(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}/attachments`);
}

export function getInspectionAudit(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}/audit`);
}

export function getInspectionResults(inspectionId: string | number) {
  return apiRequest(`/inspections/${inspectionId}/results`);
}
