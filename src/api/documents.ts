import { ApiError, apiRequest } from '@/api/client';
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

function cloneFormData(input: FormData, field: 'file' | 'files', projectId?: string) {
  const out = new FormData();
  const files: File[] = [];

  for (const [key, value] of input.entries()) {
    if (value instanceof File) {
      files.push(value);
    } else {
      out.append(key, value);
    }
  }

  files.forEach((file) => out.append(field, file, file.name));
  if (projectId) out.set('project_id', projectId);
  return out;
}

function getFileNameFromHeaders(headers?: Headers | null, fallback = 'document') {
  const disposition = headers?.get('content-disposition') || '';
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
  const normalMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (normalMatch?.[1]) return normalMatch[1];
  return fallback;
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
    const paths = [`/projects/${projectId}/documents`, '/documents/upload', '/documents'];
    let lastError: unknown = null;
    for (const path of paths) {
      for (const field of ['files', 'file'] as const) {
        try {
          return await apiRequest(path, { method: 'POST', body: cloneFormData(payload, field, String(projectId)) });
        } catch (error) {
          lastError = error;
          if (error instanceof ApiError && [400, 404, 405, 409, 422].includes(error.status)) continue;
          throw error;
        }
      }
    }
    if (lastError) throw lastError;
    throw new ApiError('Document upload failed', 500);
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

export async function downloadDocument(documentId: string | number) {
  const paths = [`/documents/${documentId}/download`, `/documents/${documentId}`, `/api/v1/documents/${documentId}/download`];
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const response = await apiRequest<Response>(path, { rawResponse: true } as RequestInit & { rawResponse: boolean });
      const blob = await response.blob();
      return {
        blob,
        fileName: getFileNameFromHeaders(response.headers, `document-${documentId}`),
        mimeType: response.headers.get('content-type') || blob.type || 'application/octet-stream',
      };
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && [400, 404, 405, 409, 422].includes(error.status)) continue;
      throw error;
    }
  }

  if (lastError) throw lastError;
  throw new ApiError('Document download failed', 500);
}
