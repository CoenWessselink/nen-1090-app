import { ApiError, apiRequest, listRequest, optionalRequest } from '@/api/client';

export type NormSystem = { id: string; code: string; name: string; region?: string; description?: string; is_active?: boolean };
export type NormStandard = { id: string; code: string; title: string; version?: string; norm_system_id?: string; scope?: string; is_active?: boolean };
export type NormProfile = { id: string; code: string; name: string; region?: string; exc_class?: string; iso3834_level?: string; iso5817_level?: string; description?: string; is_active?: boolean; standards?: NormStandard[]; templates?: InspectionTemplate[] };
export type InspectionTemplateItem = { id?: string; code: string; label: string; help_text?: string; norm_code?: string; norm_reference?: string; category?: string; input_type?: string; result_type?: string; required?: boolean; allow_na?: boolean; requires_photo?: boolean; requires_document?: boolean; requires_comment_on_fail?: boolean; options_json?: unknown; severity_on_fail?: string; result?: string; measured_value?: string; comment?: string; section_code?: string };
export type InspectionTemplateSection = { id?: string; code: string; name: string; phase?: string; sort_order?: number; items?: InspectionTemplateItem[] };
export type InspectionTemplate = { id: string; code: string; name: string; description?: string; template_type?: string; version?: number; sections?: InspectionTemplateSection[] };
export type ProjectNormSelection = { id?: string; project_id?: string; norm_system_id?: string; norm_profile_id?: string; norm_profile?: NormProfile; profile?: NormProfile; exc_class?: string; iso3834_level?: string; iso5817_level?: string; snapshots?: Array<Record<string, unknown>> };
export type WeldInspectionRun = { id?: string; project_id?: string; weld_id?: string; status?: string; overall_result?: string; notes?: string; sections?: InspectionTemplateSection[]; results?: InspectionTemplateItem[]; history?: Array<Record<string, unknown>>; attachments?: Array<Record<string, unknown>> };
export type CeNormCheck = { id: string; code: string; label: string; norm_code?: string; norm_reference?: string; required?: boolean; status?: string; comment?: string; document_id?: string };
export type QualityDashboard = { success?: boolean; project_id?: string; norm_profile?: { code?: string; name?: string }; welds?: { total?: number; inspected?: number; conform?: number; in_control?: number; rejected?: number }; percentages?: { conform?: number; in_control?: number; rejected?: number }; nonconformities?: { open?: number; closed?: number; critical?: number }; ndt?: { required?: number; completed?: number; pending?: number }; ce_readiness?: { required_checks?: number; completed_checks?: number; percentage?: number } };

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const record = payload as { items?: T[]; data?: T[]; results?: T[] } | null;
  return record?.items || record?.data || record?.results || [];
}

function currentProjectId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.location.pathname.match(/\/projecten\/([^/]+)/)?.[1];
}

function normalizeResult(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase().replace('-', '_');
  if (!raw || raw === 'not_checked' || raw === 'open' || raw === 'pending') return 'conform';
  if (raw === 'non_conform' || raw === 'noncompliant' || raw === 'defect' || raw === 'rejected') return 'not_conform';
  if (raw === 'compliant' || raw === 'ok' || raw === 'approved') return 'conform';
  return raw;
}

function statusFromRows(rows: unknown): string {
  const items = asArray<Record<string, unknown>>(rows);
  if (!items.length) return 'conform';
  if (items.some((r) => ['not_conform', 'non_conform', 'repair_required', 'defect', 'rejected'].includes(normalizeResult(r.result || r.status)))) return 'defect';
  if (items.every((r) => ['conform', 'not_applicable'].includes(normalizeResult(r.result || r.status)))) return 'conform';
  return 'in_control';
}

function emptyRun(weldId: string, projectId?: string): WeldInspectionRun {
  return {
    id: `draft-${weldId}`,
    project_id: projectId,
    weld_id: weldId,
    status: 'draft',
    overall_result: 'conform',
    notes: '',
    sections: [{
      id: 'visual',
      code: 'VISUAL',
      name: 'Visual inspection',
      phase: 'Inspection',
      sort_order: 1,
      items: [
        { code: 'WPS', label: 'Correct WPS applied', norm_code: 'ISO 3834', norm_reference: 'ISO 3834 / ISO 15609', required: true, result: 'conform', comment: '' },
        { code: 'VT', label: 'Visual inspection completed', norm_code: 'ISO 17637', norm_reference: 'ISO 17637 / ISO 5817', required: true, result: 'conform', comment: '' },
        { code: 'TRACE', label: 'Traceability verified', norm_code: 'EN 1090-2', norm_reference: 'EN 1090-2', required: true, result: 'conform', comment: '' },
      ],
    }],
    results: [],
    history: [],
    attachments: [],
  };
}

function normalizeInspection(payload: unknown, projectId?: string, weldId?: string): WeldInspectionRun {
  const record = (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown> | null;
  if (!record) return emptyRun(weldId || 'new', projectId);

  if (Array.isArray(record.sections)) {
    const normalized = record as WeldInspectionRun;
    normalized.overall_result = normalizeResult(normalized.overall_result || normalized.status || 'conform');
    normalized.sections = (normalized.sections || []).map((section) => ({
      ...section,
      name: section.name || section.code,
      items: (section.items || []).map((item) => ({ ...item, result: normalizeResult(item.result || 'conform') })),
    }));
    normalized.results = (normalized.results || []).map((item) => ({ ...item, result: normalizeResult(item.result || 'conform') }));
    return normalized;
  }

  const checks = asArray<Record<string, unknown>>(record.checks || record.results || record.items || []);
  if (!checks.length) return emptyRun(weldId || String(record.weld_id || 'new'), projectId);

  const items = checks.map((check, index) => ({
    id: String(check.id || check.item_code || index + 1),
    code: String(check.item_code || check.criterion_key || check.code || `CHECK-${index + 1}`),
    label: String(check.label || check.title || check.item_code || `Inspection item ${index + 1}`),
    norm_code: String(check.norm_code || ''),
    norm_reference: String(check.norm_reference || ''),
    required: true,
    result: normalizeResult(check.result || check.status || 'conform'),
    measured_value: String(check.measured_value || ''),
    comment: String(check.comment || check.remark || ''),
  }));

  return {
    id: String(record.id || `inspection-${weldId || 'new'}`),
    project_id: String(record.project_id || projectId || ''),
    weld_id: String(record.weld_id || weldId || ''),
    status: normalizeResult(record.status || record.overall_status || 'conform'),
    overall_result: normalizeResult(record.overall_status || record.status || record.result || 'conform'),
    notes: String(record.notes || record.remarks || ''),
    sections: [{ id: 'visual', code: 'VISUAL', name: 'Visual inspection', phase: 'Inspection', sort_order: 1, items }],
    results: items,
    history: [],
    attachments: [],
  };
}

export async function getNormSystems() { return asArray<NormSystem>(await listRequest('/norms/systems')); }
export async function getNormStandards(params?: Record<string, string | boolean | undefined>) { return asArray<NormStandard>(await listRequest('/norms/standards', params)); }
export async function getNormProfiles(params?: Record<string, string | boolean | undefined>) { return asArray<NormProfile>(await listRequest('/norms/profiles', params)); }
export async function getNormProfile(profileId: string) { return await apiRequest<NormProfile>(`/norms/profiles/${profileId}`); }
export async function getNormTemplates(params?: Record<string, string | boolean | undefined>) { return asArray<InspectionTemplate>(await listRequest('/norms/templates', params)); }
export async function getNormTemplate(templateId: string) { return await apiRequest<InspectionTemplate>(`/norms/templates/${templateId}`); }

export async function getProjectNormSelection(projectId: string) {
  try { return await apiRequest<ProjectNormSelection>(`/projects/${projectId}/norm-selection`); }
  catch (error) { if (error instanceof ApiError && [404, 501].includes(error.status)) return null; throw error; }
}

export async function setProjectNormSelection(projectId: string, payload: Record<string, unknown>) {
  return await apiRequest<ProjectNormSelection>(`/projects/${projectId}/norm-selection`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function getWeldInspection(projectIdOrWeldId: string, maybeWeldId?: string) {
  const projectId = maybeWeldId ? projectIdOrWeldId : currentProjectId();
  const weldId = maybeWeldId || projectIdOrWeldId;
  const paths = projectId ? [`/projects/${projectId}/welds/${weldId}/inspection`, `/projects/${projectId}/welds/${weldId}/inspections`, `/welds/${weldId}/inspection`] : [`/welds/${weldId}/inspection`];
  try { return normalizeInspection(await optionalRequest<unknown>(paths), projectId, weldId); }
  catch (error) { if (error instanceof ApiError && [404, 405, 422, 501].includes(error.status)) return emptyRun(weldId, projectId); throw error; }
}

export async function saveWeldInspection(projectIdOrWeldId: string, weldIdOrPayload: string | Record<string, unknown>, maybePayload?: Record<string, unknown>) {
  const projectId = typeof weldIdOrPayload === 'string' ? projectIdOrWeldId : currentProjectId();
  const weldId = typeof weldIdOrPayload === 'string' ? weldIdOrPayload : projectIdOrWeldId;
  const payload = (typeof weldIdOrPayload === 'string' ? maybePayload : weldIdOrPayload) || {};
  const overall = statusFromRows(payload.results || payload.checks || payload.items);
  const body = { ...payload, weld_id: weldId, status: overall, overall_status: overall, result: overall };
  const paths = projectId ? [`/projects/${projectId}/welds/${weldId}/inspections`, `/projects/${projectId}/welds/${weldId}/inspection`, `/welds/${weldId}/inspection`] : [`/welds/${weldId}/inspection`];
  const saved = await optionalRequest<unknown>(paths, { method: 'POST', body: JSON.stringify(body) });
  if (projectId) await apiRequest(`/projects/${projectId}/welds/${weldId}`, { method: 'PATCH', body: JSON.stringify({ status: overall, result: overall }) }).catch(() => undefined);
  if (projectId && typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem('weldinspect:last-save-toast', JSON.stringify({ type: 'success', title: 'Inspection saved', message: 'The weld list has been updated.', projectId, weldId, at: Date.now() }));
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('nen1090:data-refresh', { detail: { scope: 'welds', projectId, weldId, reason: 'inspection-saved' } }));
  }
  return normalizeInspection(saved, projectId, weldId);
}

export async function uploadWeldInspectionAttachment(projectIdOrWeldId: string, weldIdOrFormData: string | FormData, maybeFormData?: FormData) {
  const projectId = typeof weldIdOrFormData === 'string' ? projectIdOrWeldId : currentProjectId();
  const weldId = typeof weldIdOrFormData === 'string' ? weldIdOrFormData : projectIdOrWeldId;
  const formData = (typeof weldIdOrFormData === 'string' ? maybeFormData : weldIdOrFormData) || new FormData();
  if (!formData.has('scope_type')) formData.set('scope_type', 'weld');
  if (!formData.has('scope_id')) formData.set('scope_id', weldId);
  if (!formData.has('kind')) formData.set('kind', 'photo');
  if (projectId && !formData.has('project_id')) formData.set('project_id', projectId);
  return await optionalRequest<Record<string, unknown>>([...(projectId ? [`/projects/${projectId}/welds/${weldId}/photos`, `/projects/${projectId}/welds/${weldId}/attachments`] : []), `/welds/${weldId}/inspection/attachments`, '/attachments/upload'], { method: 'POST', body: formData });
}

export async function createWeldNonconformity(projectIdOrWeldId: string, weldIdOrPayload: string | Record<string, unknown>, maybePayload?: Record<string, unknown>) {
  const projectId = typeof weldIdOrPayload === 'string' ? projectIdOrWeldId : currentProjectId();
  const weldId = typeof weldIdOrPayload === 'string' ? weldIdOrPayload : projectIdOrWeldId;
  const payload = (typeof weldIdOrPayload === 'string' ? maybePayload : weldIdOrPayload) || {};
  return await optionalRequest<Record<string, unknown>>([...(projectId ? [`/projects/${projectId}/welds/${weldId}/nonconformities`] : []), `/welds/${weldId}/nonconformities`], { method: 'POST', body: JSON.stringify(payload) });
}

export async function getCeDossierChecks(projectId: string) { return asArray<CeNormCheck>(await listRequest(`/projects/${projectId}/ce-dossier/checks`)); }
export async function updateCeDossierCheck(projectId: string, checkId: string, payload: Record<string, unknown>) { return await apiRequest<CeNormCheck>(`/projects/${projectId}/ce-dossier/checks/${checkId}`, { method: 'PATCH', body: JSON.stringify(payload) }); }
export async function getProjectQualityDashboard(projectId: string) { try { return await apiRequest<QualityDashboard>(`/projects/${projectId}/quality-dashboard`); } catch (error) { if (error instanceof ApiError && [404, 501].includes(error.status)) return { project_id: projectId, norm_profile: { code: 'EU_EXC2_STANDARD', name: 'EU EXC2 Standard' }, welds: {}, percentages: {}, nonconformities: {}, ndt: {}, ce_readiness: {} } as QualityDashboard; throw error; } }
