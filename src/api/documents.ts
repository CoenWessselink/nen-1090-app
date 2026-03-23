import { apiRequest, downloadRequest, listRequest, optionalRequest, uploadRequest } from '@/api/client';
import type { ApiListResponse, ListParams } from '@/types/api';
import type { CeDocument } from '@/types/domain';

export function uploadAttachment(payload: FormData) {
  return optionalRequest<Record<string, unknown>>(['/attachments/upload'], { method: 'POST', body: payload });
}

export function getAttachment(attachmentId: string | number) {
  return apiRequest<Record<string, unknown>>(`/attachments/${attachmentId}`);
}

export function deleteAttachment(attachmentId: string | number) {
  return apiRequest<void>(`/attachments/${attachmentId}`, { method: 'DELETE' });
}

export function downloadAttachment(attachmentId: string | number) {
  return downloadRequest(`/attachments/${attachmentId}/download`);
}

export function getProjectDocuments(projectId: string | number, params?: ListParams) {
  return listRequest<ApiListResponse<CeDocument>>(`/projects/${projectId}/documents`, params);
}

export function createProjectDocument(projectId: string | number, payload: FormData | Record<string, unknown>) {
  if (payload instanceof FormData) return uploadRequest<Record<string, unknown>>(`/projects/${projectId}/documents`, payload);
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/documents`, { method: 'POST', body: JSON.stringify(payload) });
}

export function getDocument(documentId: string | number) {
  return apiRequest<CeDocument>(`/documents/${documentId}`);
}

export function updateDocument(documentId: string | number, payload: Record<string, unknown>) {
  return apiRequest<CeDocument>(`/documents/${documentId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteDocument(documentId: string | number) {
  return apiRequest<void>(`/documents/${documentId}`, { method: 'DELETE' });
}

export function getDocumentVersions(documentId: string | number) {
  return optionalRequest<ApiListResponse<CeDocument>>([`/documents/${documentId}/versions`]);
}

export function downloadDocument(documentId: string | number) {
  return downloadRequest(`/documents/${documentId}/download`);
}
