import { apiRequest, listRequest, optionalRequest } from '@/api/client';
import type { ListParams } from '@/types/api';
import type { Assembly, CeDocument, ComplianceOverview, ExportJob, Inspection, Project, Weld } from '@/types/domain';
import type { ProjectFormValues } from '@/types/forms';

export function getProjects(params?: ListParams) {
  return listRequest<Project[] | { items?: Project[]; data?: Project[]; results?: Project[]; total?: number; page?: number; limit?: number }>('/projects', params);
}

export function getProject(projectId: string | number) {
  return apiRequest<Project>(`/projects/${projectId}`);
}

export function getProjectAssemblies(projectId: string | number, params?: ListParams) {
  return listRequest<Assembly[] | { items?: Assembly[] }>(`/projects/${projectId}/assemblies`, params);
}

export function getProjectWelds(projectId: string | number, params?: ListParams) {
  return listRequest<Weld[] | { items?: Weld[] }>(`/projects/${projectId}/welds`, params);
}

export function getProjectInspections(projectId: string | number, params?: ListParams) {
  return listRequest<Inspection[] | { items?: Inspection[] }>(`/projects/${projectId}/inspections`, params);
}

export function getProjectDocuments(projectId: string | number, params?: ListParams) {
  return listRequest<CeDocument[] | { items?: CeDocument[] }>(`/projects/${projectId}/documents`, params);
}

export function getProjectCompliance(projectId: string | number) {
  return optionalRequest<ComplianceOverview>([
    `/projects/${projectId}/compliance`,
    `/projects/${projectId}/ce-dossier`,
  ]);
}

export function getProjectExports(projectId: string | number, params?: ListParams) {
  return listRequest<ExportJob[] | { items?: ExportJob[] }>(`/projects/${projectId}/exports`, params);
}

export function approveAllProject(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/projects/${projectId}/approve-all`,
    `/projects/${projectId}/conform-all`,
  ], { method: 'POST' });
}

export function applyProjectInspectionTemplate(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/inspection-template/apply`, { method: 'POST' });
}

export function addProjectMaterials(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/materials/add-all`, { method: 'POST' });
}

export function addProjectWps(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/wps/add-all`, { method: 'POST' });
}

export function addProjectWelders(projectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/welders/add-all`, { method: 'POST' });
}

export function createProject(payload: ProjectFormValues) {
  return apiRequest<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProject(id: string | number, payload: ProjectFormValues) {
  return apiRequest<Project>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteProject(id: string | number) {
  return apiRequest<void>(`/projects/${id}`, { method: 'DELETE' });
}
