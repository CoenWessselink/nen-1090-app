import { ApiError, apiRequest, listRequest, optionalRequest } from '@/api/client';

export type NormSystem = { id: string; code: string; name: string; region?: string; description?: string; is_active?: boolean };
export type NormStandard = { id: string; code: string; title: string; version?: string; norm_system_id?: string; scope?: string; is_active?: boolean };
export type NormProfile = { id: string; code: string; name: string; region?: string; exc_class?: string; iso3834_level?: string; iso5817_level?: string; description?: string; is_active?: boolean; standards?: NormStandard[]; templates?: InspectionTemplate[] };
export type InspectionTemplateItem = { id?: string; code: string; label: string; title?: string; help_text?: string; norm_code?: string; norm_reference?: string; category?: string; input_type?: string; result_type?: string; required?: boolean; allow_na?: boolean; requires_photo?: boolean; requires_document?: boolean; requires_comment_on_fail?: boolean; options_json?: unknown; severity_on_fail?: string; result?: string; measured_value?: string; comment?: string; section_code?: string; group?: string; blocks_release?: boolean };
export type InspectionTemplateSection = { id?: string; code: string; name: string; phase?: string; sort_order?: number; items?: InspectionTemplateItem[] };
export type InspectionTemplate = { id: string; code: string; name: string; description?: string; template_type?: string; version?: number; sections?: InspectionTemplateSection[]; items?: InspectionTemplateItem[]; items_json?: InspectionTemplateItem[]; item_count?: number; profile_code?: string; exc_class?: string; norm?: string; is_default?: boolean; is_locked?: boolean };
export type ProjectNormSelection = { id?: string; project_id?: string; norm_system_id?: string; norm_profile_id?: string; norm_profile?: NormProfile; profile?: NormProfile; exc_class?: string; iso3834_level?: string; iso5817_level?: string; snapshots?: Array<Record<string, unknown>> };
export type WeldInspectionRun = { id?: string; project_id?: string; weld_id?: string; template_id?: string; template_name?: string; template_code?: string; template_version?: string | number; norm_name?: string; status?: string; overall_result?: string; notes?: string; sections?: InspectionTemplateSection[]; results?: InspectionTemplateItem[]; history?: Array<Record<string, unknown>>; attachments?: Array<Record<string, unknown>> };
export type CeNormCheck = { id: string; code: string; label: string; norm_code?: string; norm_reference?: string; required?: boolean; status?: string; comment?: string; document_id?: string; ok?: boolean; completed?: boolean };
export type QualityDashboard = { success?: boolean; project_id?: string; norm_profile?: { code?: string; name?: string }; welds?: { total?: number; inspected?: number; conform?: number; in_control?: number; rejected?: number }; percentages?: { conform?: number; in_control?: number; rejected?: number }; nonconformities?: { open?: number; closed?: number; critical?: number }; ndt?: { required?: number; completed?: number; pending?: number }; ce_readiness?: { required_checks?: number; completed_checks?: number; percentage?: number } };

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const record = payload as { items?: T[]; data?: T[]; results?: T[]; checklist?: T[]; validation?: { templates?: T[] } } | null;
  return record?.items || record?.data || record?.results || record?.checklist || record?.validation?.templates || [];
}

function currentProjectId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.location.pathname.match(/\/projecten\/([^/]+)/)?.[1];
}

function normalizeResult(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (!raw || raw === 'not_checked' || raw === 'open' || raw === 'pending') return 'conform';
  if (raw === 'non_conform' || raw === 'noncompliant' || raw === 'defect' || raw === 'rejected' || raw === 'niet_conform') return 'not_conform';
  if (raw === 'compliant' || raw === 'ok' || raw === 'approved' || raw === 'goed') return 'conform';
  if (raw === 'in_control' || raw === 'gerepareerd' || raw === 'repaired') return 'in_control';
  return raw;
}

function normalizeVersion(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value;
  return undefined;
}

function statusFromRows(rows: unknown): string {
  const items = asArray<Record<string, unknown>>(rows);
  if (!items.length) return 'conform';
  if (items.some((row) => ['not_conform', 'non_conform', 'repair_required', 'defect', 'rejected'].includes(normalizeResult(row.result || row.status)))) return 'defect';
  if (items.every((row) => ['conform', 'not_applicable'].includes(normalizeResult(row.result || row.status)))) return 'conform';
  return 'in_control';
}

function emptyRun(weldId: string, projectId?: string): WeldInspectionRun {
  return { id: `draft-${weldId}`, project_id: projectId, weld_id: weldId, status: 'draft', overall_result: 'conform', notes: '', sections: [], results: [], history: [], attachments: [] };
}

function sectionNameFromCheck(check: Record<string, unknown>, fallback: string) {
  return String(check.section_name || check.group || check.group_key || check.category || fallback || 'Inspection').trim();
}

function sectionCodeFromCheck(check: Record<string, unknown>, fallback: string) {
  return String(check.section_code || check.group_key || check.category || fallback || 'inspection').trim().replace(/\s+/g, '_').toUpperCase();
}

function normalizeInspectionItem(check: Record<string, unknown>, index: number): InspectionTemplateItem {
  const code = String(check.item_code || check.code || check.template_item_code || check.criterion_key || `CHECK_${index + 1}`).trim();
  const label = String(check.label || check.title || check.criterion_key || code || `Inspection item ${index + 1}`).trim();
  return {
    id: String(check.id || code || index + 1),
    code,
    label,
    title: label,
    group: String(check.group || check.section_name || check.group_key || check.category || 'Inspection'),
    section_code: String(check.section_code || check.group_key || ''),
    norm_code: String(check.norm_code || ''),
    norm_reference: String(check.norm_reference || check.norm || ''),
    required: Boolean(check.required ?? true),
    allow_na: Boolean(check.allow_na ?? true),
    requires_photo: Boolean(check.requires_photo ?? false),
    requires_document: Boolean(check.requires_document ?? false),
    result: normalizeResult(check.result || check.status || check.default_status || 'conform'),
    measured_value: String(check.measured_value || ''),
    comment: String(check.comment || check.remark || ''),
  };
}

function sectionsFromChecks(checks: Array<Record<string, unknown>>, templateName?: string): InspectionTemplateSection[] {
  const grouped = new Map<string, InspectionTemplateSection>();
  checks.forEach((check, index) => {
    const code = sectionCodeFromCheck(check, templateName || 'inspection');
    const name = sectionNameFromCheck(check, templateName || 'Inspection');
    const item = normalizeInspectionItem(check, index);
    if (!grouped.has(code)) grouped.set(code, { id: code, code, name, phase: 'Inspection', sort_order: grouped.size + 1, items: [] });
    grouped.get(code)!.items!.push(item);
  });
  return Array.from(grouped.values());
}

function normalizeInspection(payload: unknown, projectId?: string, weldId?: string): WeldInspectionRun {
  const record = (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown> | null;
  if (!record) return emptyRun(weldId || 'new', projectId);
  if (record.item && typeof record.item === 'object') return normalizeInspection(record.item, projectId, weldId);

  const templateRecord = record.template && typeof record.template === 'object' ? record.template as Record<string, unknown> : {};
  const templateName = String(record.template_name || record.norm_template || templateRecord.name || templateRecord.code || record.norm_name || '').trim();
  const templateCode = String(record.template_code || templateRecord.code || '').trim();
  const templateVersion = normalizeVersion(record.template_version || templateRecord.version);
  const templateId = String(record.template_id || record.inspection_template_id || templateRecord.id || '').trim();

  if (Array.isArray(record.sections) && record.sections.length) {
    const normalized = record as WeldInspectionRun;
    normalized.template_id = templateId || normalized.template_id;
    normalized.template_name = templateName || normalized.template_name;
    normalized.template_code = templateCode || normalized.template_code;
    normalized.template_version = templateVersion || normalized.template_version;
    normalized.norm_name = templateName || normalized.norm_name;
    normalized.overall_result = normalizeResult(normalized.overall_result || normalized.status || 'conform');
    normalized.sections = (normalized.sections || []).map((section) => ({ ...section, name: section.name || section.code || templateName || 'Inspection', items: (section.items || []).map((item) => ({ ...item, result: normalizeResult(item.result || 'conform') })) }));
    normalized.results = (normalized.results || []).map((item) => ({ ...item, result: normalizeResult(item.result || 'conform') }));
    return normalized;
  }

  const checks = asArray<Record<string, unknown>>(record.checks || record.results || record.items || []);
  if (!checks.length) return emptyRun(weldId || String(record.weld_id || 'new'), projectId);
  const sections = sectionsFromChecks(checks, templateName);
  const items = sections.flatMap((section) => section.items || []);
  return {
    id: String(record.id || `inspection-${weldId || 'new'}`),
    project_id: String(record.project_id || projectId || ''),
    weld_id: String(record.weld_id || weldId || ''),
    template_id: templateId,
    template_name: templateName || templateCode || undefined,
    template_code: templateCode || undefined,
    template_version: templateVersion,
    norm_name: templateName || templateCode || undefined,
    status: normalizeResult(record.status || record.overall_status || 'conform'),
    overall_result: normalizeResult(record.overall_status || record.status || record.result || 'conform'),
    notes: String(record.notes || record.remarks || ''),
    sections,
    results: items,
    history: [],
    attachments: [],
  };
}

function normalizeTemplateItem(item: Record<string, unknown>, index: number): InspectionTemplateItem {
  const rule = item.acceptance_rule_json && typeof item.acceptance_rule_json === 'object' ? item.acceptance_rule_json as Record<string, unknown> : {};
  return { ...item, id: String(item.id || item.code || index + 1), code: String(item.code || item.item_code || `CHECK_${index + 1}`), label: String(item.label || item.title || item.code || `Controlepunt ${index + 1}`), title: String(item.title || item.label || item.code || `Controlepunt ${index + 1}`), group: String(item.group || item.section_name || item.category || 'Algemeen'), norm_reference: String(item.norm_reference || item.norm || 'EN 1090 / ISO 3834 / ISO 5817'), required: Boolean(item.required ?? true), allow_na: Boolean(item.allow_na ?? true), requires_photo: Boolean(item.requires_photo ?? false), requires_document: Boolean(item.requires_document ?? false), blocks_release: Boolean(rule.blocks_ce_release ?? item.blocks_release ?? item.required ?? true), result: normalizeResult(item.result || item.default_status || item.default_value || 'conform') } as InspectionTemplateItem;
}

function normalizeTemplate(template: InspectionTemplate): InspectionTemplate {
  const directItems = Array.isArray(template.items_json) ? template.items_json : Array.isArray(template.items) ? template.items : [];
  const sectionItems = Array.isArray(template.sections) ? template.sections.flatMap((section) => (section.items || []).map((item) => ({ ...item, section_code: section.code, group: section.name }))) : [];
  const items = (directItems.length ? directItems : sectionItems).map((item, index) => normalizeTemplateItem(item as Record<string, unknown>, index));
  const sections = Array.isArray(template.sections) && template.sections.length ? template.sections : [{ id: `${template.code}-section`, code: 'checks', name: 'Controlepunten', phase: 'Inspection', sort_order: 1, items }];
  return { ...template, id: String(template.id || template.code), code: String(template.code || template.id), name: String(template.name || template.code || 'Inspectietemplate'), exc_class: template.exc_class || String(template.profile_code || template.code || '').match(/EXC[1-4]/)?.[0] || 'EXC2', norm: template.norm || 'EN 1090 / ISO 3834 / ISO 5817', items, items_json: items, item_count: Number(template.item_count || items.length || 0), sections };
}

function templatesFromValidation(payload: unknown): InspectionTemplate[] {
  const record = payload as Record<string, unknown> | null;
  const validation = record?.validation && typeof record.validation === 'object' ? record.validation as Record<string, unknown> : record;
  const templates = Array.isArray(validation?.templates) ? validation.templates as Record<string, unknown>[] : [];
  return templates.map((template, index) => {
    const profileCode = String(template.profile_code || template.profile || 'EU_EXC2_STANDARD');
    const code = String(template.code || `${profileCode}_WELD_V1`);
    const count = Number(template.item_count || template.minimum_required || 0);
    const items = Array.from({ length: count }, (_, itemIndex) => normalizeTemplateItem({ code: `CHECK_${itemIndex + 1}`, label: `Controlepunt ${itemIndex + 1}`, group: 'Backend validatie', required: true }, itemIndex));
    return normalizeTemplate({ id: String(template.id || code), code, name: String(template.name || `${profileCode} inspectietemplate`), profile_code: profileCode, exc_class: profileCode.match(/EXC[1-4]/)?.[0] || 'EXC2', norm: 'EN 1090 / ISO 3834 / ISO 5817', template_type: 'weld', version: Number(template.version || 1), item_count: count, is_default: true, is_locked: true, items, items_json: items, sections: [{ id: `${code}-validation`, code: 'validation', name: 'Backend validatie', phase: 'Inspection', sort_order: index + 1, items }] });
  });
}

export async function getNormSystems() { return asArray<NormSystem>(await listRequest('/norms/systems')); }
export async function getNormStandards(params?: Record<string, string | boolean | undefined>) { return asArray<NormStandard>(await listRequest('/norms/standards', params)); }
export async function getNormProfiles(params?: Record<string, string | boolean | undefined>) { return asArray<NormProfile>(await listRequest('/norms/profiles', params)); }
export async function getNormProfile(profileId: string) { return await apiRequest<NormProfile>(`/norms/profiles/${profileId}`); }
export async function getNormTemplates(params?: Record<string, string | boolean | undefined>) {
  const rows = asArray<InspectionTemplate>(await listRequest('/norms/templates', params)).map(normalizeTemplate);
  if (rows.length) return rows;
  return templatesFromValidation(await apiRequest('/norms/templates/validation'));
}
export async function getNormTemplate(templateId: string) { return normalizeTemplate(await apiRequest<InspectionTemplate>(`/norms/templates/${templateId}`)); }

export async function seedNormEngine() { return apiRequest('/norms/seed', { method: 'POST' }); }

export async function getProjectNormSelection(projectId: string) {
  try { return await apiRequest<ProjectNormSelection>(`/projects/${projectId}/norm-selection`); }
  catch (error) { if (error instanceof ApiError && [404, 501].includes(error.status)) return null; throw error; }
}

export async function setProjectNormSelection(projectId: string, payload: Record<string, unknown>) { return await apiRequest<ProjectNormSelection>(`/projects/${projectId}/norm-selection`, { method: 'POST', body: JSON.stringify(payload) }); }

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
  const status = String((payload as Record<string, unknown>).status || (payload as Record<string, unknown>).overall_status || statusFromRows((payload as Record<string, unknown>).results || (payload as Record<string, unknown>).checks || (payload as Record<string, unknown>).items) || 'conform');
  const body = { ...payload, weld_id: weldId, status, overall_status: status, result: status };
  const path = projectId ? `/projects/${projectId}/welds/${weldId}/inspections` : `/welds/${weldId}/inspections`;
  const saved = await apiRequest<unknown>(path, { method: 'PUT', body: JSON.stringify(body) });
  if (projectId) await apiRequest(`/projects/${projectId}/welds/${weldId}`, { method: 'PATCH', body: JSON.stringify({ status, result: status }) }).catch(() => undefined);
  if (projectId && typeof window !== 'undefined') {
    try { window.sessionStorage.setItem('weldinspect:last-save-toast', JSON.stringify({ type: 'success', title: 'Inspection saved', message: 'The weld list has been updated.', projectId, weldId, at: Date.now() })); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('nen1090:data-refresh', { detail: { scope: 'welds', projectId, weldId, reason: 'inspection-saved' } }));
  }
  return normalizeInspection(saved, projectId, weldId);
}

export async function uploadWeldInspectionAttachment(projectIdOrWeldId: string, weldIdOrFormData: string | FormData, maybeFormData?: FormData) {
  const projectId = typeof weldIdOrFormData === 'string' ? projectIdOrWeldId : currentProjectId();
  const weldId = typeof weldIdOrFormData === 'string' ? weldIdOrFormData : projectIdOrWeldId;
  const formData = (typeof weldIdOrFormData === 'string' ? maybeFormData : weldIdOrFormData) || new FormData();
  if (!formData.has('kind')) formData.set('kind', 'photo');
  if (projectId && !formData.has('project_id')) formData.set('project_id', projectId);
  if (!formData.has('weld_id')) formData.set('weld_id', weldId);
  const path = projectId ? `/projects/${projectId}/welds/${weldId}/photos` : `/welds/${weldId}/photos`;
  return await apiRequest<Record<string, unknown>>(path, { method: 'POST', body: formData });
}

export async function createWeldNonconformity(projectIdOrWeldId: string, weldIdOrPayload: string | Record<string, unknown>, maybePayload?: Record<string, unknown>) {
  const projectId = typeof weldIdOrPayload === 'string' ? projectIdOrWeldId : currentProjectId();
  const weldId = typeof weldIdOrPayload === 'string' ? weldIdOrPayload : projectIdOrWeldId;
  const payload = (typeof weldIdOrPayload === 'string' ? maybePayload : weldIdOrPayload) || {};
  return await optionalRequest<Record<string, unknown>>([...(projectId ? [`/projects/${projectId}/welds/${weldId}/nonconformities`] : []), `/welds/${weldId}/nonconformities`], { method: 'POST', body: JSON.stringify(payload) });
}

export const createWeldNonConformity = createWeldNonconformity;

export async function getCeDossierChecks(projectId: string) { return asArray<CeNormCheck>(await listRequest(`/projects/${projectId}/ce-dossier/checks`)); }
export async function updateCeDossierCheck(projectId: string, checkId: string, payload: Record<string, unknown>) { return await apiRequest<CeNormCheck>(`/projects/${projectId}/ce-dossier/checks/${checkId}`, { method: 'PATCH', body: JSON.stringify(payload) }); }
export async function getProjectQualityDashboard(projectId: string) { try { return await apiRequest<QualityDashboard>(`/projects/${projectId}/quality-dashboard`); } catch (error) { if (error instanceof ApiError && [404, 501].includes(error.status)) return { project_id: projectId, norm_profile: { code: 'EU_EXC2_STANDARD', name: 'EU EXC2 Standard' }, welds: {}, percentages: {}, nonconformities: {}, ndt: {}, ce_readiness: {} } as QualityDashboard; throw error; } }
