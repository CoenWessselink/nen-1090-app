import { ApiError, apiRequest, buildListPath, listRequest, optionalRequest } from '@/api/client';
import type { Assembly, CeDocument, ComplianceOverview, Weld } from '@/types/domain';
import type { ListParams } from '@/types/api';

function withProjectId(payload: Record<string, unknown>, projectId: string | number) {
  return {
    ...payload,
    project_id: String(projectId),
  };
}

function shouldFallback(error: unknown) {
  return error instanceof ApiError && [404, 405].includes(error.status);
}

export function getAssemblies(projectId: string | number, params?: ListParams) {
  return listRequest<Assembly[] | { items?: Assembly[] }>(`/projects/${projectId}/assemblies`, params);
}

export function getAssembly(projectId: string | number, assemblyId: string | number) {
  return optionalRequest<Assembly>([
    `/projects/${projectId}/assemblies/${assemblyId}`,
    `/assemblies/${assemblyId}`,
  ]).then((response) => {
    if (!response) throw new ApiError({ message: 'Assembly niet gevonden', status: 404 });
    return response;
  });
}

export async function createAssembly(projectId: string | number, payload: Record<string, unknown>) {
  try {
    return await apiRequest<Assembly>(`/projects/${projectId}/assemblies`, {
      method: 'POST',
      body: JSON.stringify(withProjectId(payload, projectId)),
    });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return await apiRequest<Assembly>('/assemblies', {
      method: 'POST',
      body: JSON.stringify(withProjectId(payload, projectId)),
    });
  }
}

export async function updateAssembly(projectId: string | number, assemblyId: string | number, payload: Record<string, unknown>) {
  try {
    return await apiRequest<Assembly>(`/projects/${projectId}/assemblies/${assemblyId}`, {
      method: 'PUT',
      body: JSON.stringify(withProjectId(payload, projectId)),
    });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return await apiRequest<Assembly>(`/assemblies/${assemblyId}`, {
      method: 'PUT',
      body: JSON.stringify(withProjectId(payload, projectId)),
    });
  }
}

export async function deleteAssembly(projectId: string | number, assemblyId: string | number) {
  try {
    return await apiRequest<void>(`/projects/${projectId}/assemblies/${assemblyId}`, { method: 'DELETE' });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return await apiRequest<void>(`/assemblies/${assemblyId}`, { method: 'DELETE' });
  }
}

export function getAssemblyWelds(projectId: string | number, assemblyId: string | number, params?: ListParams) {
  return optionalRequest<Weld[] | { items?: Weld[] }>([
    buildListPath(`/projects/${projectId}/assemblies/${assemblyId}/welds`, params),
  ]);
}

export function getAssemblyDocuments(projectId: string | number, assemblyId: string | number, params?: ListParams) {
  return optionalRequest<CeDocument[] | { items?: CeDocument[] }>([
    buildListPath(`/projects/${projectId}/assemblies/${assemblyId}/documents`, params),
  ]);
}

export function getAssemblyCompliance(projectId: string | number, assemblyId: string | number) {
  return optionalRequest<ComplianceOverview>([`/projects/${projectId}/assemblies/${assemblyId}/compliance`]);
}
