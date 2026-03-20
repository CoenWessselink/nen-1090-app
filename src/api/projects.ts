import { apiRequest, listRequest, optionalRequest } from '@/api/client';
import { withQuery } from '@/utils/api';
import type { ListParams } from '@/types/api';
import type { Assembly, CeDocument, ComplianceOverview, ExportJob, Inspection, Project, Weld } from '@/types/domain';
import type { ProjectAssemblyDraft, ProjectFormValues } from '@/types/forms';

export type ProjectSelectionItem = Record<string, unknown>;

function normalizeProjectRecord(payload: Record<string, unknown>): Project {
  return {
    ...payload,
    id: String(payload.id || payload.project_id || ''),
    projectnummer: String(payload.projectnummer || payload.code || payload.project_number || ''),
    name: String(payload.name || payload.omschrijving || ''),
    client_name: String(payload.client_name || payload.client || payload.opdrachtgever || ''),
    execution_class: String(payload.execution_class || payload.exc || payload.executieklasse || ''),
    status: String(payload.status || 'concept'),
    start_date: String(payload.start_date || ''),
    end_date: String(payload.end_date || ''),
  };
}

export function getProjects(params?: ListParams) {
  return listRequest<Project[] | { items?: Project[]; data?: Project[]; results?: Project[]; total?: number; page?: number; limit?: number }>('/projects', params);
}

export function getProject(projectId: string | number) {
  return apiRequest<Project>(`/projects/${projectId}`);
}

export async function getProjectAssemblies(projectId: string | number, params?: ListParams) {
  return await optionalRequest<Assembly[] | { items?: Assembly[] }>([
    withQuery(`/projects/${projectId}/assemblies`, params),
    withQuery('/assemblies', { ...(params || {}), project_id: String(projectId) }),
  ]) || { items: [] };
}

export async function getProjectWelds(projectId: string | number, params?: ListParams) {
  return await optionalRequest<Weld[] | { items?: Weld[] }>([
    withQuery(`/projects/${projectId}/welds`, params),
    withQuery('/welds', { ...(params || {}), project_id: String(projectId) }),
  ]) || { items: [] };
}

export async function getProjectInspections(projectId: string | number, params?: ListParams) {
  return await optionalRequest<Inspection[] | { items?: Inspection[] }>([
    withQuery(`/projects/${projectId}/inspections`, params),
    withQuery('/inspections', { ...(params || {}), project_id: String(projectId) }),
  ]) || { items: [] };
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

export function getProjectSelectedMaterials(projectId: string | number) {
  return optionalRequest<ProjectSelectionItem[]>([
    `/projects/${projectId}/materials`,
    `/projects/${projectId}/selected/materials`,
  ]);
}

export function getProjectSelectedWps(projectId: string | number) {
  return optionalRequest<ProjectSelectionItem[]>([
    `/projects/${projectId}/wps`,
    `/projects/${projectId}/selected/wps`,
  ]);
}

export function getProjectSelectedWelders(projectId: string | number) {
  return optionalRequest<ProjectSelectionItem[]>([
    `/projects/${projectId}/welders`,
    `/projects/${projectId}/selected/welders`,
  ]);
}

export function approveAllProject(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/projects/${projectId}/approve-all`,
    `/projects/${projectId}/conform-all`,
    `/projects/${projectId}/lascontrole/approve_all`,
  ], { method: 'POST', body: JSON.stringify({ mode: 'open_only' }) });
}

export function applyProjectInspectionTemplate(projectId: string | number, templateId?: string | null) {
  if (!templateId) return Promise.resolve({ ok: true, skipped: true } as Record<string, unknown>);
  return optionalRequest<Record<string, unknown>>([
    `/projects/${projectId}/inspection-template/apply`,
    `/projects/${projectId}/apply-inspection-template`,
  ], { method: 'POST', body: JSON.stringify({ template_id: templateId, mode: 'merge' }) });
}

export function addProjectMaterials(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/projects/${projectId}/materials/add-all`,
    `/projects/${projectId}/add-all-materials`,
  ], { method: 'POST' });
}

export function addProjectWps(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/projects/${projectId}/wps/add-all`,
    `/projects/${projectId}/add-all-wps`,
  ], { method: 'POST' });
}

export function addProjectWelders(projectId: string | number) {
  return optionalRequest<Record<string, unknown>>([
    `/projects/${projectId}/welders/add-all`,
    `/projects/${projectId}/add-all-welders`,
  ], { method: 'POST' });
}

export async function createProject(payload: ProjectFormValues) {
  const response = await apiRequest<Record<string, unknown>>('/projects', {
    method: 'POST',
    body: JSON.stringify({
      code: payload.projectnummer,
      name: payload.name,
      client_name: payload.client_name,
      execution_class: payload.execution_class,
      status: payload.status,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
    }),
  });
  if (response.id) return normalizeProjectRecord(response);
  if (response.ok && response.id) return normalizeProjectRecord(response);
  if (response.ok && response.project_id) return normalizeProjectRecord(response);
  throw new Error('Project aangemaakt, maar backend gaf geen geldig project-object terug.');
}

export function updateProject(id: string | number, payload: ProjectFormValues) {
  return apiRequest<Project>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      code: payload.projectnummer,
      name: payload.name,
      client_name: payload.client_name,
      execution_class: payload.execution_class,
      status: payload.status,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
    }),
  });
}

export function deleteProject(id: string | number) {
  return apiRequest<void>(`/projects/${id}`, { method: 'DELETE' });
}

export function createProjectAssembly(projectId: string | number, payload: ProjectAssemblyDraft) {
  return apiRequest<Assembly>(`/projects/${projectId}/assemblies`, {
    method: 'POST',
    body: JSON.stringify({
      code: payload.code,
      name: payload.name,
      drawing_no: payload.drawing_no || null,
      revision: payload.revision || null,
      status: payload.status || 'open',
      notes: payload.notes || null,
    }),
  });
}

export function addProjectMaterialLink(projectId: string | number, materialId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/materials`, {
    method: 'POST',
    body: JSON.stringify({ ref_id: materialId }),
  });
}

export function removeProjectMaterialLink(projectId: string | number, materialId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/materials/${materialId}`, {
    method: 'DELETE',
  });
}

export function addProjectWpsLink(projectId: string | number, wpsId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/wps`, {
    method: 'POST',
    body: JSON.stringify({ ref_id: wpsId }),
  });
}

export function removeProjectWpsLink(projectId: string | number, wpsId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/wps/${wpsId}`, {
    method: 'DELETE',
  });
}

export function addProjectWelderLink(projectId: string | number, welderId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/welders`, {
    method: 'POST',
    body: JSON.stringify({ ref_id: welderId }),
  });
}

export function removeProjectWelderLink(projectId: string | number, welderId: string | number) {
  return apiRequest<Record<string, unknown>>(`/projects/${projectId}/welders/${welderId}`, {
    method: 'DELETE',
  });
}
