import { ApiError, apiRequest, listRequest, optionalRequest } from '@/api/client';
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
    status: payload.status,
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
  };
}

function mapProjectPatch(payload: Partial<ProjectFormValues>) {
  const body: Record<string, unknown> = {};
  if (payload.projectnummer !== undefined) body.code = payload.projectnummer;
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.client_name !== undefined) body.client_name = payload.client_name;
  if (payload.execution_class !== undefined) {
    body.execution_class = payload.execution_class;
    body.default_execution_class = payload.execution_class;
  }
  if (payload.inspection_template_id !== undefined) {
    body.default_template_id = payload.inspection_template_id || null;
    body.inspection_template_id = payload.inspection_template_id || null;
  }
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.start_date !== undefined) body.start_date = payload.start_date || null;
  if (payload.end_date !== undefined) body.end_date = payload.end_date || null;
  return body;
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
  const direct = await optionalRequest<Record<string, unknown>>([`/projects/${projectId}`]);
  if (direct) return normalizeProjectRecord(direct);

  const rows = await getProjects();
  const match = rows.items.find((item) => String(item.id) === String(projectId));
  if (!match) throw new Error('Project niet gevonden.');
  return match;
}

export async function getProjectAssemblies(projectId: string | number, params?: ListParams) {
  const response = await listRequest<PagedResponse<Assembly>>(`/projects/${projectId}/assemblies`, sanitizeListParams(params));
  return normalizePagedList<Assembly>(response, params?.limit || 25);
}

export async function getProjectWelds(projectId: string | number, params?: ListParams) {
  const response = await listRequest<PagedResponse<Weld>>(`/projects/${projectId}/welds`, sanitizeListParams(params));
  return normalizePagedList<Weld>(response, params?.limit || 25);
}

// Belangrijk: singular /inspection niet meer als primaire route gebruiken.
// Eerst multi-inspections of centrale inspections-query gebruiken om 404-spam te voorkomen.
export async function getProjectInspections(projectId: string | number, params?: ListParams) {
  const safeParams = sanitizeListParams(params);
  const query = new URLSearchParams();
  Object.entries(safeParams || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const response =
    (await optionalRequest<PagedResponse<Inspection>>([
      `/projects/${projectId}/inspections${query.toString() ? `?${query.toString()}` : ''}`,
      `/inspections?project_id=${projectId}${query.toString() ? `&${query.toString()}` : ''}`,
    ])) || { items: [], total: 0, page: 1, limit: safeParams?.limit || 25 };
  return normalizePagedList<Inspection>(response, safeParams?.limit || 25);
}

export async function getProjectDocuments(projectId: string | number, params?: ListParams) {
  const safeParams = sanitizeListParams(params);
  const response =
    (await optionalRequest<PagedResponse<CeDocument>>([`/projects/${projectId}/documents`])) ||
    (await listRequest<PagedResponse<CeDocument>>('/photos', {
      ...(safeParams || {}),
      project_id: String(projectId),
    }));

  return normalizePagedList<CeDocument>(response, safeParams?.limit || 25);
}

export async function getProjectCompliance(projectId: string | number) {
  const response =
    (await optionalRequest<ComplianceOverview>([`/projects/${projectId}/compliance`])) ||
    (await optionalRequest<ComplianceOverview>([`/ce_export/${projectId}`]));

  if (!response) {
    return {
      score: 0,
      status: 'onbekend',
      summary: {},
      checklist: [],
      missing_items: [],
    } as ComplianceOverview;
  }

  return response;
}

export async function getProjectExports(projectId: string | number, params?: ListParams) {
  const response = await listRequest<PagedResponse<ExportJob>>(`/projects/${projectId}/exports`, sanitizeListParams(params));
  return normalizePagedList<ExportJob>(response, params?.limit || 25);
}

export async function getProjectSelectedMaterials(projectId: string | number) {
  return (await optionalRequest<Record<string, unknown>[]>([`/projects/${projectId}/selected/materials`])) || [];
}

export async function getProjectSelectedWps(projectId: string | number) {
  return (await optionalRequest<Record<string, unknown>[]>([`/projects/${projectId}/selected/wps`])) || [];
}

export async function getProjectSelectedWelders(projectId: string | number) {
  return (await optionalRequest<Record<string, unknown>[]>([`/projects/${projectId}/selected/welders`])) || [];
}

export async function approveAllProject(projectId: string | number) {
  const project = await getProject(projectId);
  const welds = await getProjectWelds(projectId);
  const weldIds = (welds.items || []).map((row) => row.id).filter(Boolean);

  const inspectionResult = await optionalRequest<Record<string, unknown>>(
    [`/projects/${projectId}/approve-all`, `/projects/${projectId}/lascontrole/approve_all`],
    { method: 'POST', body: JSON.stringify({ mode: 'open_only' }) },
  );

  let approvedWelds = Number(inspectionResult?.approved_welds || inspectionResult?.approved || 0);
  if (!approvedWelds && weldIds.length) {
    const bulkResult = await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/welds/bulk-approve`], {
      method: 'POST',
      body: JSON.stringify({ weld_ids: weldIds }),
    });
    approvedWelds = Number(bulkResult?.approved || bulkResult?.count || 0);
  }

  let statusUpdated = false;
  if (needsProjectReadyStatus(project.status)) {
    await updateProjectRecord(projectId, { status: 'gereed' });
    statusUpdated = true;
  }

  return {
    ok: true,
    projectId,
    approved_welds: approvedWelds,
    inspections: Number(inspectionResult?.inspections || 0),
    inspections_set_ok: Number(inspectionResult?.inspections_set_ok || 0),
    project_status_updated: statusUpdated,
  };
}

export async function applyProjectInspectionTemplate(projectId: string | number, templateId?: string | null) {
  if (!templateId) return { ok: true, skipped: true, projectId };
  return (
    (await optionalRequest<Record<string, unknown>>([
      `/projects/${projectId}/inspection-template/apply`,
      `/projects/${projectId}/apply-inspection-template`,
    ], {
      method: 'POST',
      body: JSON.stringify({ template_id: templateId, mode: 'merge' }),
    })) || { ok: true, skipped: true, projectId, templateId }
  );
}

export async function addProjectMaterials(projectId: string | number) {
  return ((await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/materials/add-all`], { method: 'POST' })) || {
    ok: true,
    projectId,
  });
}

export async function addProjectWps(projectId: string | number) {
  return ((await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/wps/add-all`], { method: 'POST' })) || {
    ok: true,
    projectId,
  });
}

export async function addProjectWelders(projectId: string | number) {
  return ((await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/welders/add-all`], { method: 'POST' })) || {
    ok: true,
    projectId,
  });
}

export async function createProject(payload: ProjectFormValues) {
  const response = await apiRequest<Record<string, unknown>>('/projects', {
    method: 'POST',
    body: JSON.stringify(mapProjectPayload(payload)),
  });
  const createdId = response?.id || response?.project_id;
  if (!createdId) throw new Error('Project aangemaakt, maar backend gaf geen geldig project-object terug.');
  return normalizeProjectRecord({ id: createdId, ...mapProjectPayload(payload) });
}

export async function updateProjectRecord(id: string | number, payload: Partial<ProjectFormValues>) {
  const response =
    (await optionalRequest<Record<string, unknown>>([`/projects/${id}`], {
      method: 'PATCH',
      body: JSON.stringify(mapProjectPatch(payload)),
    })) ||
    (await optionalRequest<Record<string, unknown>>([`/projects/${id}`], {
      method: 'PUT',
      body: JSON.stringify(mapProjectPatch(payload)),
    }));

  if (!response) {
    throw new Error('Project bijwerken wordt niet ondersteund door de huidige backend.');
  }

  return normalizeProjectRecord(response);
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
  return (
    (await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/selected/materials`], {
      method: 'POST',
      body: JSON.stringify({ material_id: materialId }),
    })) || { ok: true, projectId, materialId }
  );
}

export async function removeProjectMaterialLink(projectId: string | number, materialId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/selected/materials/${materialId}`], {
      method: 'DELETE',
    })) || { ok: true, projectId, materialId }
  );
}

export async function addProjectWpsLink(projectId: string | number, wpsId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/selected/wps`], {
      method: 'POST',
      body: JSON.stringify({ wps_id: wpsId }),
    })) || { ok: true, projectId, wpsId }
  );
}

export async function removeProjectWpsLink(projectId: string | number, wpsId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/selected/wps/${wpsId}`], {
      method: 'DELETE',
    })) || { ok: true, projectId, wpsId }
  );
}

export async function addProjectWelderLink(projectId: string | number, welderId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/selected/welders`], {
      method: 'POST',
      body: JSON.stringify({ welder_id: welderId }),
    })) || { ok: true, projectId, welderId }
  );
}

export async function removeProjectWelderLink(projectId: string | number, welderId: string | number) {
  return (
    (await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/selected/welders/${welderId}`], {
      method: 'DELETE',
    })) || { ok: true, projectId, welderId }
  );
}
