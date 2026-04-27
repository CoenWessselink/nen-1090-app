import { ApiError, apiRequest } from '@/api/client';
import type { ApiListResponse, ListParams } from '@/types/api';
import type { CeDocument } from '@/types/domain';

function emptyList(params?: ListParams): ApiListResponse<CeDocument> {
  return { items: [], total: 0, page: Number(params?.page || 1), limit: Number(params?.limit || params?.pageSize || 25) } as ApiListResponse<CeDocument>;
}

function cloneFormData(input: FormData, field: 'file' | 'files', projectId: string) {
  const out = new FormData();
  const files: File[] = [];
  for (const [k, v] of input.entries()) {
    if (v instanceof File) files.push(v);
    else out.append(k, v);
  }
  files.forEach((f) => out.append(field, f, f.name));
  out.set('project_id', projectId);
  return out;
}

export async function getProjectDocuments(projectId: string | number, params?: ListParams) {
  try {
    return await apiRequest<ApiListResponse<CeDocument>>(`/projects/${projectId}/documents`);
  } catch {
    try {
      return await apiRequest<ApiListResponse<CeDocument>>(`/documents?project_id=${projectId}`);
    } catch {
      return emptyList(params);
    }
  }
}

export async function createProjectDocument(projectId: string | number, payload: FormData | Record<string, unknown>) {
  if (payload instanceof FormData) {
    const paths = [`/projects/${projectId}/documents`, '/documents/upload', '/documents'];
    let lastError: unknown = null;
    for (const path of paths) {
      for (const field of ['files', 'file'] as const) {
        try {
          return await apiRequest(path, { method: 'POST', body: cloneFormData(payload, field, String(projectId)) });
        } catch (err) {
          lastError = err;
          if (err instanceof ApiError && [404, 405, 422].includes(err.status)) continue;
          throw err;
        }
      }
    }
    if (lastError) throw lastError;
    throw new ApiError('Document upload failed', 500);
  }
  return apiRequest(`/projects/${projectId}/documents`, { method: 'POST', body: JSON.stringify({ ...payload, project_id: projectId }) });
}
