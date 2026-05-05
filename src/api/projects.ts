import { ApiError, apiRequest, listRequest } from '@/api/client';
import type { ListParams } from '@/types/api';
import type { Assembly, CeDocument, ComplianceOverview, ExportJob, Inspection, Project, Weld } from '@/types/domain';
import type { ProjectAssemblyDraft, ProjectFormValues } from '@/types/forms';

type PagedResponse<T> = T[] | { items?: T[]; total?: number; page?: number; limit?: number; data?: T[] };

function sanitizeListParams(params?: ListParams): ListParams | undefined {
  if (!params) return params;
  return {
    ...params,
    page: typeof params.page === 'number' && params.page > 0 ? params.page : 1,
    limit: typeof params.limit === 'number' ? Math.min(Math.max(params.limit, 1), 100) : params.limit,
  };
}

function normalizeProjectRecord(payload: Record<string, unknown>): Project {
  return {
    ...payload,
    id: String(payload.id || payload.project_id || ''),
    projectnummer: String(payload.projectnummer || payload.code || payload.project_number || ''),
    name: String(payload.name || payload.omschrijving || ''),
    client_name: String(payload.client_name || payload.client || payload.opdrachtgever || ''),
    execution_class: String(payload.execution_class || payload.default_execution_class || payload.exc || payload.executieklasse || ''),
    default_template_id: String(payload.default_template_id || payload.inspection_template_id || payload.template_id || ''),
    status: String(payload.status || 'concept'),
    start_date: String(payload.start_date || ''),
    end_date: String(payload.end_date || ''),
  } as Project;
}

function normalizePagedList<T>(response: PagedResponse<T>, fallbackLimit = 25) {
  if (Array.isArray(response)) {
    return {
      items: response,
      total: response.length,
      page: 1,
      limit: fallbackLimit || response.length || 25,
    };
  }

  const items = Array.isArray(response?.items)
    ? response.items
    : Array.isArray(response?.data)
      ? response.data
      : [];

  return {
    items,
    total: Number(response?.total || items.length || 0),
    page: Number(response?.page || 1),
    limit: Number(response?.limit || fallbackLimit || 25),
  };
}

function mapProjectPayload(
  payload: Pick<ProjectFormValues, 'projectnummer' | 'name' | 'client_name' | 'execution_class' | 'status' | 'start_date' | 'end_date' | 'inspection_template_id'>,
) {
  return {
    code: payload.projectnummer,
    name: payload.name,
    client_name: payload.client_name,
    execution_class: payload.execution_class,
    default_execution_class: payload.execution_class,
    default_template_id: payload.inspection_template_id || null,
    inspection_template_id: payload.inspection_template_id || null,
    norm_system_id: (payload as any).norm_system_id || null,
    norm_profile_id: (payload as any).norm_profile_id || null,
    iso3834_level: (payload as any).iso3834_level || null,
    iso5817_level: (payload as any).iso5817_level || null,
    status: payload.status,
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
  };
}

function mapProjectPatch(payload: Partial<ProjectFormValues> & Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value === undefined || value === '') return;
    body[key] = value;
  };
  if (payload.projectnummer !== undefined) set('code', payload.projectnummer);
  if (payload.name !== undefined) set('name', payload.name);
  if (payload.client_name !== undefined) set('client_name', payload.client_name);
  if (payload.execution_class !== undefined && payload.execution_class !== '') {
    body.execution_class = payload.execution_class;
    body.default_execution_class = payload.execution_class;
  }
  if (payload.inspection_template_id !== undefined) {
    set('default_template_id', payload.inspection_template_id || null);
    set('inspection_template_id', payload.inspection_template_id || null);
  }
  if ((payload as any).norm_system_id !== undefined) set('norm_system_id', (payload as any).norm_system_id || null);
  if ((payload as any).norm_profile_id !== undefined) set('norm_profile_id', (payload as any).norm_profile_id || null);
  if ((payload as any).iso3834_level !== undefined) set('iso3834_level', (payload as any).iso3834_level || null);
  if ((payload as any).iso5817_level !== undefined) set('iso5817_level', (payload as any).iso5817_level || null);
  if (payload.status !== undefined) set('status', payload.status);
  if (payload.start_date !== undefined) set('start_date', payload.start_date || null);
  if (payload.end_date !== undefined) set('end_date', payload.end_date || null);
  if (payload.coordinator_id !== undefined) set('coordinator_id', payload.coordinator_id || null);
  if (payload.coordinator_name !== undefined) set('coordinator_name', payload.coordinator_name || null);
  return body;
}

function emptyComplianceOverview(): ComplianceOverview {
  return {
    score: 0,
    status: 'onbekend',
    summary: {},
    checklist: [],
    missing_items: [],
  } as ComplianceOverview;
}

function needsProjectReadyStatus(status: string | null | undefined) {
  const normalized = String(status || '').trim().toLowerCase().replace(/_/g, '-');
  return ['concept', 'in-controle', 'in controle', 'in-uitvoering', 'in uitvoering', 'open', 'in-behandeling', 'in behandeling'].includes(normalized);
}

export async function getProjects(params?: ListParams) {
  const safeParams = sanitizeListParams(params);
  try {
    const response = await listRequest<Project[] | { items?: Project[]; total?: number; page?: number; limit?: number }>(
      '/projects',
      safeParams,
    );
    const paged = normalizePagedList<Project>(response, safeParams?.limit || 25);
    return {
      ...paged,
      items: paged.items.map((row) => normalizeProjectRecord(row as unknown as Record<string, unknown>)),
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 422 && safeParams?.limit) {
      const retry = await listRequest<Project[] | { items?: Project[]; total?: number; page?: number; limit?: number }>(
        '/projects',
        { ...safeParams, limit: 25 },
      );
      const paged = normalizePagedList<Project>(retry, 25);
      return {
        ...paged,
        items: paged.items.map((row) => normalizeProjectRecord(row as unknown as Record<string, unknown>)),
      };
    }
    throw error;
  }
}

export async function getProject(projectId: string | number) {
  const direct = await apiRequest<Record<string, unknown>>(`/projects/${projectId}`);
  return normalizeProjectRecord(direct);
}

export async function getProjectAssemblies(projectId: string | number, params?: ListParams) {
  const response = await listRequest<PagedResponse<Assembly>>(`/projects/${projectId}/assemblies`, sanitizeListParams(params));
  return normalizePagedList<Assembly>(response, params?.limit || 25);
}

export async function getProjectWelds(projectId: string | number, params?: ListParams) {
  const response = await listRequest<PagedResponse<Weld>>(`/projects/${projectId}/welds`, sanitizeListParams(params));
  return normalizePagedList<Weld>(response, params?.limit || 25);
}

export async function getProjectInspections(projectId: string | number, params?: ListParams) {
  const response = await listRequest<PagedResponse<Inspection>>(`/projects/${projectId}/inspections`, sanitizeListParams(params));
  return normalizePagedList<Inspection>(response, params?.limit || 25);
}

export async function getProjectDocuments(projectId: string | number, params?: ListParams) {
  const response = await listRequest<PagedResponse<CeDocument>>(`/projects/${projectId}/documents`, sanitizeListParams(params));
  return normalizePagedList<CeDocument>(response, params?.limit || 25);
}

export async function getProjectCompliance(projectId: string | number) {
  try {
    return await apiRequest<ComplianceOverview>(`/projects/${projectId}/ce-dossier/preview`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return emptyComplianceOverview();
    }
    throw error;
  }
}

export async function getProjectExports(projectId: string | number, params?: ListParams) {
  const response = await listRequest<PagedResponse<ExportJob>>(`/projects/${projectId}/exports`, sanitizeListParams(params));
  return normalizePagedList<ExportJob>(response, params?.limit || 25);
}

export async function getProjectSelectedMaterials(projectId: string | number) {
  return await apiRequest<Record<string, unknown>[]>(`/projects/${projectId}/selected/materials`);
}

export async function getProjectSelectedWps(projectId: string | number) {
  return await apiRequest<Record<string, unknown>[]>(`/projects/${projectId}/selected/wps`);
}

export async function getProjectSelectedWelders(projectId: string | number) {
  return await apiRequest<Record<string, unknown>[]>(`/projects/${projectId}/selected/welders`);
}

export async function approveAllProject(projectId: string | number) {
  const project = await getProject(projectId);
  const inspectionResult = await apiRequest<Record<string, unknown>>(`/projects/${projectId}/approve-all`, {
    method: 'POST',
    body: JSON.stringify({ mode: 'open_only' }),
  });

  let statusUpdated = false;
  if (needsProjectReadyStatus(project.status)) {
    await updateProjectRecord(projectId, { status: 'gereed' });
    statusUpdated = true;
  }

  return {
    ok: true,
    projectId,
    approved_welds: Number(inspectionResult?.approved_welds || inspectionResult?.approved || 0),
    inspections: Number(inspectionResult?.inspections || 0),
    inspections_set_ok: Number(inspectionResult?.inspections_set_ok || 0),
    project_status_updated: statusUpdated,
  };
}

export async function applyProjectInspectionTemplate(projectId: string | number, templateId?: string | null) {
  if (!templateId) return { ok: true, skipped: true, projectId };
  return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/inspection-template/apply`, {
    method: 'POST',
    body: JSON.stringify({ template_id: templateId, mode: 'merge' }),
  });
}

export async function addProjectMaterials(projectId: string | number) {
  return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/materials/add-all`, { method: 'POST' });
}

export async function addProjectWps(projectId: string | number) {
  return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/wps/add-all`, { method: 'POST' });
}

export async function addProjectWelders(projectId: string | number) {
  return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/welders/add-all`, { method: 'POST' });
}

export async function createProject(payload: ProjectFormValues) {
  const response = await apiRequest<Record<string, unknown>>('/projects', {
    method: 'POST',
    body: JSON.stringify(mapProjectPayload(payload)),
  });
  const createdId = response?.id || response?.project_id;
  if (!createdId) throw new Error('Project aangemaakt, maar backend gaf geen geldig project-object terug.');
  return normalizeProjectRecord(response);
}

export async function updateProjectRecord(id: string | number, payload: Partial<ProjectFormValues>) {
  const body = mapProjectPatch(payload as Partial<ProjectFormValues> & Record<string, unknown>);
  try {
    const response = await apiRequest<Record<string, unknown>>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return normalizeProjectRecord(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      const fallback: Record<string, unknown> = {};
      if (body.status) fallback.status = body.status;
      if (body.name) fallback.name = body.name;
      if (!Object.keys(fallback).length) fallback.status = 'gereed';
      const response = await apiRequest<Record<string, unknown>>(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(fallback),
      });
      return normalizeProjectRecord(response);
    }

    if (!(error instanceof ApiError) || error.status !== 405) throw error;
    const response = await apiRequest<Record<string, unknown>>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return normalizeProjectRecord(response);
  }
}

export const updateProject = updateProjectRecord;

export async function deleteProject(id: string | number) {
  return await apiRequest<void>(`/projects/${id}`, {
    method: 'DELETE',
  });
}

export async function createProjectAssembly(projectId: string | number, payload: ProjectAssemblyDraft) {
  return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/assemblies`, {
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

export async function addProjectMaterialLink(projectId: string | number, materialId: string | number) {
  return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/materials`, {
    method: 'POST',
    body: JSON.stringify({ material_id: materialId }),
  });
}

export async function removeProjectMaterialLink(projectId: string | number, materialId: string | number) {
  return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/materials/${materialId}`, {
    method: 'DELETE',
  });
}

export async function addProjectWpsLink(projectId: string | number, wpsId: string | number) {
  return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/wps`, {
    method: 'POST',
    body: JSON.stringify({ wps_id: wpsId }),
  });
}

export async function removeProjectWpsLink(projectId: string | number, wpsId: string | number) {
  return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/wps/${wpsId}`, {
    method: 'DELETE',
  });
}

export async function addProjectWelderLink(projectId: string | number, welderId: string | number) {
  return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/welders`, {
    method: 'POST',
    body: JSON.stringify({ welder_id: welderId }),
  });
}

export async function removeProjectWelderLink(projectId: string | number, welderId: string | number) {
  return await apiRequest<Record<string, unknown>>(`/projects/${projectId}/selected/welders/${welderId}`, {
    method: 'DELETE',
  });
}
