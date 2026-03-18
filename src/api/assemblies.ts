import { apiRequest, buildListPath, listRequest, optionalRequest } from '@/api/client';
import type { Assembly, CeDocument, ComplianceOverview, Weld } from '@/types/domain';
import type { ListParams } from '@/types/api';

export function getAssemblies(projectId: string | number, params?: ListParams) {
  return listRequest<Assembly[] | { items?: Assembly[] }>(`/projects/${projectId}/assemblies`, params);
}

export function getAssembly(projectId: string | number, assemblyId: string | number) {
  return apiRequest<Assembly>(`/projects/${projectId}/assemblies/${assemblyId}`);
}

export function createAssembly(projectId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Assembly>(`/projects/${projectId}/assemblies`, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateAssembly(projectId: string | number, assemblyId: string | number, payload: Record<string, unknown>) {
  return apiRequest<Assembly>(`/projects/${projectId}/assemblies/${assemblyId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteAssembly(projectId: string | number, assemblyId: string | number) {
  return apiRequest<void>(`/projects/${projectId}/assemblies/${assemblyId}`, { method: 'DELETE' });
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
