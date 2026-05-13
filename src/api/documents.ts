import { ApiError, apiRequest, downloadUrlAsBlob } from '@/api/client';
import { uploadOne, filesFromInput } from './upload';
import type { ApiListResponse, ListParams } from '@/types/api';
import type { CeDocument } from '@/types/domain';

export type DocumentRecord = CeDocument & Record<string, unknown>;
export type DocumentVersionRecord = Record<string, unknown>;

function firstStringFromForm(input: FormData, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = input.get(key);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export async function getProjectDocuments(projectId: string | number, params?: ListParams) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit || params?.pageSize) query.set('limit', String(params.limit || params.pageSize));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<ApiListResponse<DocumentRecord>>(`/projects/${projectId}/documents${suffix}`);
}

export async function getDocument(documentId: string | number) {
  return apiRequest<DocumentRecord>(`/documents/${documentId}`);
}

export async function getDocumentVersions(documentId: string | number) {
  return apiRequest<ApiListResponse<DocumentVersionRecord>>(`/documents/${documentId}/versions`);
}

export async function createProjectDocument(projectId: string | number, payload: FormData | Record<string, unknown>) {
  if (payload instanceof FormData) {
    const files = filesFromInput(payload);
    if (!files.length) throw new ApiError('Geen document geselecteerd voor upload.', 400);

    const title = firstStringFromForm(payload, 'title', 'name', 'filename');
    const documentType = firstStringFromForm(payload, 'document_type', 'type', 'kind');
    const uploaded: unknown[] = [];
    for (const file of files) {
      uploaded.push(await uploadOne(`/projects/${projectId}/documents`, file, {
        title: title || file.name,
        document_type: documentType || 'document',
        project_id: String(projectId),
      }));
    }
    return uploaded.length === 1 ? uploaded[0] : { items: uploaded, total: uploaded.length };
  }

  return apiRequest<DocumentRecord>(`/projects/${projectId}/documents`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, project_id: projectId }),
  });
}

export async function updateDocument(documentId: string | number, payload: Record<string, unknown>) {
  return apiRequest<DocumentRecord>(`/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDocument(documentId: string | number) {
  return apiRequest<void>(`/documents/${documentId}`, {
    method: 'DELETE',
  });
}

export async function deleteAttachment(attachmentId: string | number) {
  return apiRequest<void>(`/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}

export async function downloadDocument(documentId: string | number): Promise<Blob> {
  const { blob } = await downloadUrlAsBlob(`/documents/${documentId}/download`);
  return blob;
}
