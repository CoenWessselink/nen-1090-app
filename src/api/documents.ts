import { ApiError, apiRequest, downloadUrlAsBlob } from '@/api/client';
import { uploadOne, filesFromInput } from './upload';
import type { ApiListResponse, ListParams } from '@/types/api';
import type { CeDocument } from '@/types/domain';

export type DocumentRecord = CeDocument & Record<string, unknown>;
export type DocumentVersionRecord = Record<string, unknown>;

function emptyList<T = DocumentRecord>(params?: ListParams): ApiListResponse<T> {
  return {
    items: [],
    total: 0,
    page: Number(params?.page || 1),
    limit: Number(params?.limit || params?.pageSize || 25),
  } as ApiListResponse<T>;
}

async function tryPaths<T>(paths: string[], init?: RequestInit, fallback?: T): Promise<T> {
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      return await apiRequest<T>(path, init);
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && [400, 404, 405, 409, 422].includes(error.status)) continue;
      throw error;
    }
  }
  if (fallback !== undefined) return fallback;
  if (lastError) throw lastError;
  throw new ApiError('Document request failed', 500);
}

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
  return tryPaths<ApiListResponse<DocumentRecord>>(
    [`/projects/${projectId}/documents${suffix}`, `/documents?project_id=${projectId}`],
    undefined,
    emptyList<DocumentRecord>(params),
  );
}

export async function getDocument(documentId: string | number) {
  return tryPaths<DocumentRecord>([
    `/documents/${documentId}`,
    `/api/v1/documents/${documentId}`,
  ]);
}

export async function getDocumentVersions(documentId: string | number) {
  return tryPaths<ApiListResponse<DocumentVersionRecord>>(
    [`/documents/${documentId}/versions`, `/api/v1/documents/${documentId}/versions`],
    undefined,
    emptyList<DocumentVersionRecord>(),
  );
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

  return tryPaths<DocumentRecord>([
    `/projects/${projectId}/documents`,
    '/documents',
  ], {
    method: 'POST',
    body: JSON.stringify({ ...payload, project_id: projectId }),
  });
}

export async function updateDocument(documentId: string | number, payload: Record<string, unknown>) {
  return tryPaths<DocumentRecord>([
    `/documents/${documentId}`,
    `/api/v1/documents/${documentId}`,
  ], {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDocument(documentId: string | number) {
  return tryPaths<{ success?: boolean }>([
    `/documents/${documentId}`,
    `/api/v1/documents/${documentId}`,
  ], {
    method: 'DELETE',
  }, { success: true });
}

export async function deleteAttachment(attachmentId: string | number) {
  return tryPaths<{ success?: boolean }>([
    `/attachments/${attachmentId}`,
    `/documents/attachments/${attachmentId}`,
    `/api/v1/attachments/${attachmentId}`,
  ], {
    method: 'DELETE',
  }, { success: true });
}

export async function downloadDocument(documentId: string | number): Promise<Blob> {
  const paths = [`/documents/${documentId}/download`, `/api/v1/documents/${documentId}/download`, `/documents/${documentId}`];
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const { blob } = await downloadUrlAsBlob(path);
      return blob;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && [400, 404, 405, 409, 422].includes(error.status)) continue;
      throw error;
    }
  }

  if (lastError) throw lastError;
  throw new ApiError('Document download failed', 500);
}
