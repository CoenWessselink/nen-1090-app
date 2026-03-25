import { apiRequest, listRequest } from '@/api/client';
import type { ListParams } from '@/types/api';
import type { Assembly, CeDocument, ComplianceOverview, ExportJob, Inspection, Project, Weld } from '@/types/domain';
import type { ProjectAssemblyDraft, ProjectFormValues } from '@/types/forms';

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
  } as Project;
}

export async function getProjects(params?: ListParams) {
  const response = await listRequest<Project[] | { items?: Project[]; total?: number; page?: number; limit?: number }>('/projects', params);
  if (Array.isArray(response)) return { items: response.map((row) => normalizeProjectRecord(row as unknown as Record<string, unknown>)), total: response.length, page: 1, limit: params?.limit || response.length || 25 };
  const items = Array.isArray(response?.items) ? response.items : [];
  return { items: items.map((row) => normalizeProjectRecord(row as unknown as Record<string, unknown>)), total: Number(response?.total || items.length || 0), page: Number(response?.page || 1), limit: Number(response?.limit || 25) };
}

export async function getProject(projectId: string | number) { const rows = await getProjects(); const match = rows.items.find((item) => String(item.id) === String(projectId)); if (!match) throw new Error('Project niet gevonden.'); return match; }
export async function getProjectAssemblies(projectId: string | number, params?: ListParams) { const rows = await listRequest<Assembly[] | { items?: Assembly[] }>('/assemblies', { ...(params || {}), project_id: String(projectId) }); const items = Array.isArray(rows) ? rows : Array.isArray(rows?.items) ? rows.items : []; return { items, total: items.length, page: 1, limit: params?.limit || 25 }; }
export async function getProjectWelds(projectId: string | number, params?: ListParams) { const rows = await listRequest<Weld[] | { items?: Weld[] }>('/welds', { ...(params || {}), project_id: String(projectId) }); const items = Array.isArray(rows) ? rows : Array.isArray(rows?.items) ? rows.items : []; return { items, total: items.length, page: 1, limit: params?.limit || 25 }; }
export async function getProjectInspections(projectId: string | number, _params?: ListParams) {
  const welds = await getProjectWelds(projectId);
  let items: Inspection[] = [];
  for (const weld of welds.items || []) {
    const rows = await listRequest<Inspection[] | { items?: Inspection[] }>('/inspections', { weld_id: String(weld.id) } as ListParams);
    const inspectionItems = Array.isArray(rows) ? rows : Array.isArray(rows?.items) ? rows.items : [];
    items = [...items, ...inspectionItems];
  }
  return { items, total: items.length, page: 1, limit: 25 };
}
export async function getProjectDocuments(projectId: string | number, _params?: ListParams) { const rows = await listRequest<CeDocument[] | { items?: CeDocument[] }>('/photos', { project_id: String(projectId) } as ListParams); const items = Array.isArray(rows) ? rows : Array.isArray(rows?.items) ? rows.items : []; return { items, total: items.length, page: 1, limit: 25 }; }
export async function getProjectCompliance(projectId: string | number) { return await apiRequest<ComplianceOverview>(`/ce_export/${projectId}`); }
export async function getProjectExports(_projectId: string | number, _params?: ListParams) { return { items: [] as ExportJob[], total: 0, page: 1, limit: 25 }; }
export async function getProjectSelectedMaterials(_projectId: string | number) { return []; }
export async function getProjectSelectedWps(_projectId: string | number) { return []; }
export async function getProjectSelectedWelders(_projectId: string | number) { return []; }
export async function approveAllProject(projectId: string | number) { return { ok: true, projectId }; }
export async function applyProjectInspectionTemplate(projectId: string | number, templateId?: string | null) { return { ok: true, projectId, templateId }; }
export async function addProjectMaterials(projectId: string | number) { return { ok: true, projectId }; }
export async function addProjectWps(projectId: string | number) { return { ok: true, projectId }; }
export async function addProjectWelders(projectId: string | number) { return { ok: true, projectId }; }

export async function createProject(payload: ProjectFormValues) {
  const response = await apiRequest<Record<string, unknown>>('/projects', { method: 'POST', body: JSON.stringify({ project_number: payload.projectnummer, name: payload.name, client: payload.client_name, exc: payload.execution_class, status: payload.status }) });
  const createdId = response?.id || response?.project_id;
  if (!createdId) throw new Error('Project aangemaakt, maar backend gaf geen geldig project-object terug.');
  return normalizeProjectRecord({ id: createdId, projectnummer: payload.projectnummer, name: payload.name, client_name: payload.client_name, execution_class: payload.execution_class, status: payload.status, start_date: payload.start_date || '', end_date: payload.end_date || '' });
}
export async function updateProject(id: string | number, payload: ProjectFormValues) { return await createProject({ ...payload, projectnummer: payload.projectnummer || String(id) } as ProjectFormValues); }
export async function deleteProject(_id: string | number) { return; }
export async function createProjectAssembly(projectId: string | number, payload: ProjectAssemblyDraft) { return await apiRequest<Assembly>('/assemblies', { method: 'POST', body: JSON.stringify({ project_id: String(projectId), code: payload.code, name: payload.name, drawing_no: payload.drawing_no || null, revision: payload.revision || null, status: payload.status || 'open' }) }); }
export async function addProjectMaterialLink(projectId: string | number, materialId: string | number) { return { ok: true, projectId, materialId }; }
export async function removeProjectMaterialLink(projectId: string | number, materialId: string | number) { return { ok: true, projectId, materialId }; }
export async function addProjectWpsLink(projectId: string | number, wpsId: string | number) { return { ok: true, projectId, wpsId }; }
export async function removeProjectWpsLink(projectId: string | number, wpsId: string | number) { return { ok: true, projectId, wpsId }; }
export async function addProjectWelderLink(projectId: string | number, welderId: string | number) { return { ok: true, projectId, welderId }; }
export async function removeProjectWelderLink(projectId: string | number, welderId: string | number) { return { ok: true, projectId, welderId }; }
