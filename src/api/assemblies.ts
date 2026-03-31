import { apiRequest, buildListPath, listRequest, optionalRequest } from '@/api/client';
import type { Assembly, CeDocument, ComplianceOverview, Weld } from '@/types/domain';
import type { ListParams } from '@/types/api';

async function requestWithProjectFallback<T>(
  primaryPath: string,
  fallbackPath: string,
  init?: RequestInit,
): Promise<T> {
  try {
    return await apiRequest<T>(primaryPath, init);
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 0);
    if (status === 404 || status === 405) {
      return apiRequest<T>(fallbackPath, init);
    }
    throw error;
  }
}

export function getAssemblies(projectId: string | number, params?: ListParams) {
  return listRequest<Assembly[] | { items?: Assembly[] }>(`/projects/${projectId}/assemblies`, params);
}

export function getAssembly(projectId: string | number, assemblyId: string | number) {
  return requestWithProjectFallback<Assembly>(
    `/projects/${projectId}/assemblies/${assemblyId}`,
    `/assemblies/${assemblyId}`,
  );
}

export function createAssembly(projectId: string | number, payload: Record<string, unknown>) {
  const fallbackPayload = { ...payload, project_id: projectId };
  return requestWithProjectFallback<Assembly>(
    `/projects/${projectId}/assemblies`,
    '/assemblies',
    { method: 'POST', body: JSON.stringify(fallbackPayload) },
  );
}

export function updateAssembly(projectId: string | number, assemblyId: string | number, payload: Record<string, unknown>) {
  return requestWithProjectFallback<Assembly>(
    `/projects/${projectId}/assemblies/${assemblyId}`,
    `/assemblies/${assemblyId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}

export function deleteAssembly(projectId: string | number, assemblyId: string | number) {
  return requestWithProjectFallback<void>(
    `/projects/${projectId}/assemblies/${assemblyId}`,
    `/assemblies/${assemblyId}`,
    { method: 'DELETE' },
  );
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
