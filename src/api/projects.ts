import { ApiError, apiRequest, listRequest } from '@/api/client';
import { runtimeTrace } from '@/utils/runtimeTracing';
import type { ListParams } from '@/types/api';
import type { Assembly, CeDocument, ComplianceOverview, ExportJob, Inspection, Project, Weld } from '@/types/domain';
import type { ProjectAssemblyDraft, ProjectFormValues } from '@/types/forms';

type PagedResponse<T> = T[] | { items?: T[]; total?: number; page?: number; limit?: number; data?: T[] };

function traceProjectRuntime(event: string, details?: Record<string, unknown>) {
  runtimeTrace(event, { domain: 'projects', ...(details || {}) });
}

function sanitizeListParams(params?: ListParams): ListParams | undefined {
  if (!params) return params;
  return { ...params, page: typeof params.page === 'number' && params.page > 0 ? params.page : 1, limit: typeof params.limit === 'number' ? Math.min(Math.max(params.limit, 1), 100) : params.limit };
}

function normalizeProjectRecord(payload: Record<string, unknown>): Project {
  const templateId = String(payload.runtime_template_id || payload.template_id || payload.inspection_template_id || payload.default_template_id || '');
  return {
    ...payload,
    id: String(payload.id || payload.project_id || ''),
    projectnummer: String(payload.projectnummer || payload.code || payload.project_number || ''),
    name: String(payload.name || payload.omschrijving || ''),
    client_name: String(payload.client_name || payload.client || payload.opdrachtgever || ''),
    execution_class: String(payload.execution_class || payload.default_execution_class || payload.exc_class || payload.exc || payload.executieklasse || ''),
    default_template_id: templateId,
    inspection_template_id: templateId,
    template_id: templateId,
    runtime_template_id: String(payload.runtime_template_id || ''),
    coordinator_id: String(payload.coordinator_id || payload.welding_coordinator_id || payload.weld_coordinator_id || ''),
    welding_coordinator_id: String(payload.welding_coordinator_id || payload.coordinator_id || payload.weld_coordinator_id || ''),
    weld_coordinator_id: String(payload.weld_coordinator_id || payload.coordinator_id || payload.welding_coordinator_id || ''),
    coordinator_name: String(payload.coordinator_name || payload.welding_coordinator_name || ''),
    default_wps_id: String(payload.default_wps_id || payload.wps_id || ''),
    wps_id: String(payload.wps_id || payload.default_wps_id || ''),
    default_material_id: String(payload.default_material_id || payload.material_id || ''),
    material_id: String(payload.material_id || payload.default_material_id || ''),
    default_welder_id: String(payload.default_welder_id || payload.welder_id || ''),
    welder_id: String(payload.welder_id || payload.default_welder_id || ''),
    status: String(payload.status || 'concept'),
    start_date: String(payload.start_date || ''),
    end_date: String(payload.end_date || ''),
  } as Project;
}

function profileCodeForExc(exc?: string | null) {
  const value = String(exc || '').toUpperCase();
  if (value === 'EXC1') return 'EU_EXC1_BASIC';
  if (value === 'EXC3') return 'EU_EXC3_ADVANCED';
  if (value === 'EXC4') return 'EU_EXC4_CRITICAL';
  return 'EU_EXC2_STANDARD';
}

async function applyProjectNormSelection(projectId: string | number, executionClass?: string | null, normProfileId?: unknown) {
  const exc = String(executionClass || 'EXC2').toUpperCase();
  const profile = String(normProfileId || profileCodeForExc(exc));
  try {
    await apiRequest<Record<string, unknown>>(`/projects/${projectId}/norm-selection`, { method: 'POST', body: JSON.stringify({ profile_code: profile, norm_profile_id: profile, exc_class: exc }) });
    traceProjectRuntime('PROJECT_NORM_SELECTION_APPLIED', { projectId, exc, profile });
  } catch (error) {
    runtimeTrace('PROJECT_NORM_SELECTION_FAILED', { domain: 'projects', projectId, exc, profile, message: error instanceof Error ? error.message : 'unknown', status: error instanceof ApiError ? error.status : undefined });
  }
}

function scheduleProjectNormSelection(projectId: string | number, executionClass?: string | null, normProfileId?: unknown) {
  void applyProjectNormSelection(projectId, executionClass, normProfileId);
}

function normalizePagedList<T>(response: PagedResponse<T>, fallbackLimit = 25) {
  if (Array.isArray(response)) return { items: response, total: response.length, page: 1, limit: fallbackLimit || response.length || 25 };
  const items = Array.isArray(response?.items) ? response.items : Array.isArray(response?.data) ? response.data : [];
  return { items, total: Number(response?.total || items.length || 0), page: Number(response?.page || 1), limit: Number(response?.limit || fallbackLimit || 25) };
}

function mapProjectPayload(payload: ProjectFormValues & Record<string, unknown>) {
  const templateId = payload.inspection_template_id || payload.template_id || null;
  const coordinatorId = payload.coordinator_id || null;
  const defaultWpsId = payload.default_wps_id || payload.wps_id || null;
  const defaultMaterialId = payload.default_material_id || payload.material_id || null;
  const defaultWelderId = payload.default_welder_id || payload.welder_id || null;
  return {
    code: payload.projectnummer,
    projectnummer: payload.projectnummer,
    name: payload.name,
    client_name: payload.client_name,
    execution_class: payload.execution_class,
    exc_class: payload.execution_class,
    default_execution_class: payload.execution_class,
    template_id: templateId,
    default_template_id: templateId,
    inspection_template_id: templateId,
    norm_system_id: payload.norm_system_id || null,
    norm_profile_id: payload.norm_profile_id || profileCodeForExc(payload.execution_class),
    iso3834_level: payload.iso3834_level || null,
    iso5817_level: payload.iso5817_level || null,
    coordinator_id: coordinatorId,
    welding_coordinator_id: coordinatorId,
    weld_coordinator_id: coordinatorId,
    coordinator_name: payload.coordinator_name || null,
    default_wps_id: defaultWpsId,
    wps_id: defaultWpsId,
    default_material_id: defaultMaterialId,
    material_id: defaultMaterialId,
    default_welder_id: defaultWelderId,
    welder_id: defaultWelderId,
    status: payload.status,
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
  };
}

function mapProjectPatch(payload: Partial<ProjectFormValues> & Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => { if (value === undefined) return; body[key] = value === '' ? null : value; };
  if (payload.projectnummer !== undefined) set('code', payload.projectnummer);
  if (payload.projectnummer !== undefined) set('projectnummer', payload.projectnummer);
  if (payload.name !== undefined) set('name', payload.name);
  if (payload.client_name !== undefined) set('client_name', payload.client_name);
  if (payload.execution_class !== undefined && payload.execution_class !== '') { body.execution_class = payload.execution_class; body.exc_class = payload.execution_class; body.default_execution_class = payload.execution_class; body.norm_profile_id = payload.norm_profile_id || profileCodeForExc(String(payload.execution_class)); }
  if (payload.inspection_template_id !== undefined || payload.template_id !== undefined) {
    const templateId = payload.inspection_template_id || payload.template_id || null;
    set('template_id', templateId);
    set('default_template_id', templateId);
    set('inspection_template_id', templateId);
  }
  if (payload.norm_system_id !== undefined) set('norm_system_id', payload.norm_system_id || null);
  if (payload.norm_profile_id !== undefined) set('norm_profile_id', payload.norm_profile_id || null);
  if (payload.iso3834_level !== undefined) set('iso3834_level', payload.iso3834_level || null);
  if (payload.iso5817_level !== undefined) set('iso5817_level', payload.iso5817_level || null);
  if (payload.status !== undefined) set('status', payload.status);
  if (payload.start_date !== undefined) set('start_date', payload.start_date || null);
  if (payload.end_date !== undefined) set('end_date', payload.end_date || null);
  if (payload.coordinator_id !== undefined) { set('coordinator_id', payload.coordinator_id || null); set('welding_coordinator_id', payload.coordinator_id || null); set('weld_coordinator_id', payload.coordinator_id || null); }
  if (payload.coordinator_name !== undefined) set('coordinator_name', payload.coordinator_name || null);
  if (payload.default_wps_id !== undefined || payload.wps_id !== undefined) { const id = payload.default_wps_id || payload.wps_id || null; set('default_wps_id', id); set('wps_id', id); }
  if (payload.default_material_id !== undefined || payload.material_id !== undefined) { const id = payload.default_material_id || payload.material_id || null; set('default_material_id', id); set('material_id', id); }
  if (payload.default_welder_id !== undefined || payload.welder_id !== undefined) { const id = payload.default_welder_id || payload.welder_id || null; set('default_welder_id', id); set('welder_id', id); }
  if (payload.notes !== undefined) body.notes = payload.notes === '' || payload.notes === null ? null : payload.notes;
  return body;
}

function needsProjectReadyStatus(status: string | null | undefined) {
  const normalized = String(status || '').trim().toLowerCase().replace(/_/g, '-');
  return ['concept', 'in-controle', 'in controle', 'in-uitvoering', 'in uitvoering', 'open', 'in-behandeling', 'in behandeling'].includes(normalized);
}

export async function getProjects(params?: ListParams) {
  const safeParams = sanitizeListParams(params);
  try {
    const response = await listRequest<Project[] | { items?: Project[]; total?: number; page?: number; limit?: number }>('/projects', safeParams);
    const paged = normalizePagedList<Project>(response, safeParams?.limit || 25);
    return { ...paged, items: paged.items.map((row) => normalizeProjectRecord(row as unknown as Record<string, unknown>)) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 422 && safeParams?.limit) {
      const retry = await listRequest<Project[] | { items?: Project[]; total?: number; page?: number; limit?: number }>('/projects', { ...safeParams, limit: 25 });
      const paged = normalizePagedList<Project>(retry, 25);
      return { ...paged, items: paged.items.map((row) => normalizeProjectRecord(row as unknown as Record<string, unknown>)) };
    }
    throw error;
  }
}

export async function getProject(projectId: string | number) { return normalizeProjectRecord(await apiRequest<Record<string, unknown>>(`/projects/${projectId}`)); }
export async function getProjectAssemblies(projectId: string | number, params?: ListParams) { return normalizePagedList<Assembly>(await listRequest<PagedResponse<Assembly>>(`/projects/${projectId}/assemblies`, sanitizeListParams(params)), params?.limit || 25); }
export async function getProjectWelds(projectId: string | number, params?: ListParams) { return normalizePagedList<Weld>(await listRequest<PagedResponse<Weld>>(`/projects/${projectId}/welds`, sanitizeListParams(params)), params?.limit || 25); }
export async function getProjectInspections(projectId: string | number, params?: ListParams) { return normalizePagedList<Inspection>(await listRequest<PagedResponse<Inspection>>(`/projects/${projectId}/inspections`, sanitizeListParams(params)), params?.limit || 25); }
export async function getProjectDocuments(projectId: string | number, params?: ListParams) { return normalizePagedList<CeDocument>(await listRequest<PagedResponse<CeDocument>>(`/projects/${projectId}/documents`, sanitizeListParams(params)), params?.limit || 25); }
export async function getProjectCompliance(projectId: string | number) { return await apiRequest<ComplianceOverview>(`/projects/${projectId}/ce-dossier/preview`); }
export async function getProjectExports(projectId: string | number, params?: ListParams) { return normalizePagedList<ExportJob>(await listRequest<PagedResponse<ExportJob>>(`/projects/${projectId}/exports`, sanitizeListParams(params)), params?.limit || 25); }
export async function getProjectSelectedMaterials(projectId: string | number) { return await apiRequest<Record<string, unknown>[]>(`/projects/${projectId}/selected/materials`); }
export async function getProjectSelectedWps(projectId: string | number) { return await apiRequest<Record<string, unknown>[]>(`/projects/${projectId}/selected/wps`); }
export async function getProjectSelectedWelders(projectId: string | number) { return await apiRequest<Record<string, unknown>[]>(`/projects/${projectId}/selected/welders`); }

export async function approveAllProject(projectId: string | number) {
  const project = await getProject(projectId);
  const inspectionResult = await apiRequest<Record<string, unknown>>(`/projects/${projectId}/approve-all`, { method: 'POST', body: JSON.stringify({ mode: 'open_only' }) });
  let statusUpdated = false;
  if (needsProjectReadyStatus(project.status)) { await updateProjectRecord(projectId, { status: 'gereed' }); statusUpdated = true; }
  return { ok: true, projectId, approved_welds: Number(inspectionResult?.approved_welds || inspectionResult?.approved || 0), inspections: Number(inspectionResult?.inspections || 0), inspections_set_ok: Number(inspectionResult?.inspections_set_ok || 0), project_status_updated: statusUpdated };
}

export async function applyProjectInspectionTemplate(projectId: string | number, templateId?: string | null) { if (!templateId) return { ok: true, skipped: true, projectId }; return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/inspection-template/apply`, { method: 'POST', body: JSON.stringify({ template_id: templateId, mode: 'merge' }) }); }
export async function addProjectMaterials(projectId: string | number) { return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/materials/add-all`, { method: 'POST' }); }
export async function addProjectWps(projectId: string | number) { return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/wps/add-all`, { method: 'POST' }); }
export async function addProjectWelders(projectId: string | number) { return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/welders/add-all`, { method: 'POST' }); }

export async function createProject(payload: ProjectFormValues) {
  const response = await apiRequest<Record<string, unknown>>('/projects', { method: 'POST', body: JSON.stringify(mapProjectPayload(payload as ProjectFormValues & Record<string, unknown>)) });
  const createdId = response?.id || response?.project_id;
  if (!createdId) throw new Error('Project aangemaakt, maar backend gaf geen geldig project-object terug.');
  scheduleProjectNormSelection(createdId as string | number, payload.execution_class, (payload as any).norm_profile_id);
  return normalizeProjectRecord(response);
}

export async function updateProjectRecord(id: string | number, payload: Partial<ProjectFormValues>) {
  const body = mapProjectPatch(payload as Partial<ProjectFormValues> & Record<string, unknown>);
  try {
    const response = await apiRequest<Record<string, unknown>>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    if (payload.execution_class !== undefined || (payload as any).norm_profile_id !== undefined) scheduleProjectNormSelection(id, payload.execution_class || response.execution_class as string, (payload as any).norm_profile_id || body.norm_profile_id);
    return normalizeProjectRecord(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      const fallback: Record<string, unknown> = {};
      if (body.status) fallback.status = body.status;
      if (body.name) fallback.name = body.name;
      if (!Object.keys(fallback).length) fallback.status = 'gereed';
      return normalizeProjectRecord(await apiRequest<Record<string, unknown>>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(fallback) }));
    }
    if (!(error instanceof ApiError) || error.status !== 405) throw error;
    const response = await apiRequest<Record<string, unknown>>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    if (payload.execution_class !== undefined || (payload as any).norm_profile_id !== undefined) scheduleProjectNormSelection(id, payload.execution_class || response.execution_class as string, (payload as any).norm_profile_id || body.norm_profile_id);
    return normalizeProjectRecord(response);
  }
}

export const updateProject = updateProjectRecord;
export async function deleteProject(id: string | number) { return await apiRequest<void>(`/projects/${id}`, { method: 'DELETE' }); }
export async function createProjectAssembly(projectId: string | number, payload: ProjectAssemblyDraft) { return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/assemblies`, { method: 'POST', body: JSON.stringify({ code: payload.code, name: payload.name, drawing_no: payload.drawing_no || null, revision: payload.revision || null, status: payload.status || 'open', notes: payload.notes || null }) }); }
export async function addProjectMaterialLink(projectId: string | number, materialId: string | number) { return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/materials`, { method: 'POST', body: JSON.stringify({ material_id: materialId }) }); }
export async function removeProjectMaterialLink(projectId: string | number, materialId: string | number) { return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/materials/${materialId}`, { method: 'DELETE' }); }
export async function addProjectWpsLink(projectId: string | number, wpsId: string | number) { return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/wps`, { method: 'POST', body: JSON.stringify({ wps_id: wpsId }) }); }
export async function removeProjectWpsLink(projectId: string | number, wpsId: string | number) { return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/wps/${wpsId}`, { method: 'DELETE' }); }
export async function addProjectWelderLink(projectId: string | number, welderId: string | number) { return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/welders`, { method: 'POST', body: JSON.stringify({ welder_id: welderId }) }); }
export async function removeProjectWelderLink(projectId: string | number, welderId: string | number) { return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/welders/${welderId}`, { method: 'DELETE' }); }
