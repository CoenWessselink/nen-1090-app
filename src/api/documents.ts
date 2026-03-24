import { apiRequest, downloadRequest, optionalRequest, uploadRequest } from '@/api/client';
import { withQuery } from '@/utils/api';
import type { ApiListResponse, ListParams } from '@/types/api';
import type { CeDocument } from '@/types/domain';

function emptyList(params?: ListParams): ApiListResponse<CeDocument> {
  return {
    items: [],
    total: 0,
    page: Number(params?.page || 1),
    limit: Number(params?.limit || params?.pageSize || 25),
  } as ApiListResponse<CeDocument>;
}

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

export async function getProjectDocuments(projectId: string | number, params?: ListParams) {
  return (
    (await optionalRequest<ApiListResponse<CeDocument>>([
      withQuery(`/projects/${projectId}/documents`, params),
      withQuery('/documents', { ...(params || {}), project_id: projectId }),
    ])) || emptyList(params)
  );
}

export function createProjectDocument(projectId: string | number, payload: FormData | Record<string, unknown>) {
  if (payload instanceof FormData) {
    return (
      optionalRequest<Record<string, unknown>>(
        [`/projects/${projectId}/documents`, '/attachments/upload'],
        { method: 'POST', body: payload },
      ) || Promise.resolve({})
    );
  }
  return (
    optionalRequest<Record<string, unknown>>(
      [`/projects/${projectId}/documents`, '/documents'],
      { method: 'POST', body: JSON.stringify({ ...payload, project_id: projectId }) },
    ) || Promise.resolve({})
  );
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
  return optionalRequest<ApiListResponse<CeDocument>>([`/documents/${documentId}/versions`]) || Promise.resolve(emptyList());
}

export function downloadDocument(documentId: string | number) {
  return downloadRequest(`/documents/${documentId}/download`);
}
