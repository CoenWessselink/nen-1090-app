import { apiRequest } from '@/api/client';
import { getNormTemplate, getNormTemplates, saveWeldInspection as saveCanonicalWeldInspection, type InspectionTemplate, type InspectionTemplateItem, type InspectionTemplateSection, type WeldInspectionRun } from '@/api/norms';

type RuntimeRecord = Record<string, unknown>;

function asRecord(payload: unknown): RuntimeRecord {
  return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as RuntimeRecord : {};
}

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const record = asRecord(payload);
  if (Array.isArray(record.items)) return record.items as T[];
  if (Array.isArray(record.results)) return record.results as T[];
  if (Array.isArray(record.checks)) return record.checks as T[];
  return [];
}

function normalizeExc(value: unknown): string {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  return raw.match(/EXC[1-4]/)?.[0] || 'EXC2';
}

function normalizeResult(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['conform', 'compliant', 'ok', 'approved'].includes(raw)) return 'conform';
  if (['not_conform', 'non_conform', 'defect', 'rejected', 'repair_required'].includes(raw)) return 'not_conform';
  if (['not_applicable', 'na', 'n_a'].includes(raw)) return 'not_applicable';
  return 'in_control';
}

function normalizeItem(raw: RuntimeRecord, index: number): InspectionTemplateItem {
  const code = String(raw.code || raw.item_code || raw.template_item_code || raw.criterion_key || `CHECK_${index + 1}`);
  const label = String(raw.label || raw.title || raw.criterion_key || code);
  return {
    id: String(raw.id || code),
    code,
    label,
    title: label,
    group: String(raw.group || raw.section_name || raw.group_key || raw.category || 'Inspectie'),
    section_code: String(raw.section_code || raw.group_key || raw.category || 'inspectie'),
    norm_reference: String(raw.norm_reference || raw.norm || raw.norm_code || 'EN 1090 / ISO 3834 / ISO 5817'),
    required: Boolean(raw.required ?? true),
    allow_na: Boolean(raw.allow_na ?? true),
    requires_photo: Boolean(raw.requires_photo ?? false),
    requires_document: Boolean(raw.requires_document ?? false),
    blocks_release: Boolean(raw.blocks_release ?? false),
    result: normalizeResult(raw.result || raw.status || raw.default_status || raw.default_value || 'conform'),
    comment: String(raw.comment || raw.remark || ''),
  };
}

function sectionsFromItems(items: InspectionTemplateItem[], fallbackName = 'Inspectie'): InspectionTemplateSection[] {
  const grouped = new Map<string, InspectionTemplateSection>();
  items.forEach((item) => {
    const code = String(item.section_code || item.group || fallbackName).replace(/\s+/g, '_').toUpperCase();
    if (!grouped.has(code)) grouped.set(code, { id: code, code, name: String(item.group || fallbackName), phase: 'Inspection', items: [] });
    grouped.get(code)!.items!.push(item);
  });
  return Array.from(grouped.values());
}

function normalizeInspectionPayload(payload: unknown, projectId: string | undefined, weldId: string): WeldInspectionRun {
  const record = Array.isArray(payload) ? asRecord(payload[0]) : asRecord(payload);
  if (!Object.keys(record).length) return emptyRun(projectId, weldId);
  const checks = asArray<RuntimeRecord>(record.sections).length ? [] : asArray<RuntimeRecord>(record.checks || record.results || record.items);
  const sections = Array.isArray(record.sections) && record.sections.length
    ? (record.sections as InspectionTemplateSection[]).map((section) => ({ ...section, items: (section.items || []).map((item, index) => ({ ...item, result: normalizeResult(item.result || 'conform'), id: item.id || `${section.code}-${index}` })) }))
    : sectionsFromItems(checks.map(normalizeItem), String(record.template_name || record.norm_template || 'Inspectie'));
  const results = sections.flatMap((section) => section.items || []);
  return {
    id: String(record.id || `draft-${weldId}`),
    project_id: String(record.project_id || projectId || ''),
    weld_id: String(record.weld_id || weldId),
    template_id: String(record.template_id || record.inspection_template_id || ''),
    template_name: String(record.template_name || record.norm_template || record.norm_name || ''),
    template_code: String(record.template_code || ''),
    template_version: typeof record.template_version === 'string' || typeof record.template_version === 'number' ? record.template_version : undefined,
    norm_name: String(record.norm_name || record.template_name || record.norm_template || ''),
    status: normalizeResult(record.status || record.overall_status || 'in_control'),
    overall_result: normalizeResult(record.overall_result || record.overall_status || record.status || 'in_control'),
    notes: String(record.notes || record.remarks || ''),
    sections,
    results,
    history: [],
    attachments: [],
  };
}

function runFromTemplate(template: InspectionTemplate, projectId: string | undefined, weldId: string): WeldInspectionRun {
  const rawItems = Array.isArray(template.sections) && template.sections.length
    ? template.sections.flatMap((section) => (section.items || []).map((item) => ({ ...item, group: section.name, section_code: section.code })))
    : asArray<RuntimeRecord>(template.items_json || template.items);
  const items = rawItems.map((item, index) => normalizeItem(asRecord(item), index));
  const sections = sectionsFromItems(items, template.name || 'Inspectie');
  return {
    id: `draft-${weldId}`,
    project_id: projectId,
    weld_id: weldId,
    template_id: template.id,
    template_name: template.name,
    template_code: template.code,
    template_version: template.version,
    norm_name: template.name,
    status: 'draft',
    overall_result: 'conform',
    notes: '',
    sections,
    results: items,
    history: [],
    attachments: [],
  };
}

function emptyRun(projectId: string | undefined, weldId: string): WeldInspectionRun {
  return { id: `draft-${weldId}`, project_id: projectId, weld_id: weldId, status: 'draft', overall_result: 'in_control', notes: '', sections: [], results: [], history: [], attachments: [] };
}

async function fallbackFromTemplate(projectId: string | undefined, weldId: string): Promise<WeldInspectionRun> {
  if (!projectId) return emptyRun(projectId, weldId);
  try {
    const weld: RuntimeRecord = await apiRequest<RuntimeRecord>(`/projects/${projectId}/welds/${weldId}`).catch((): RuntimeRecord => ({}));
    const project: RuntimeRecord = await apiRequest<RuntimeRecord>(`/projects/${projectId}`).catch((): RuntimeRecord => ({}));
    const templateId = String(weld.template_id || weld.inspection_template_id || weld.default_template_id || project.template_id || project.inspection_template_id || project.default_template_id || '').trim();
    if (templateId) {
      const template = await getNormTemplate(templateId).catch(() => null);
      if (template) return runFromTemplate(template, projectId, weldId);
    }
    const exc = normalizeExc(weld.execution_class || weld.exc_class || project.execution_class || project.exc_class || project.default_execution_class);
    const templates = await getNormTemplates({}).catch((): InspectionTemplate[] => []);
    const template = templates.find((item) => normalizeExc(item.exc_class || item.profile_code || item.code || item.name) === exc)
      || templates.find((item) => String(item.code || item.name || '').toUpperCase().includes(exc))
      || templates[0];
    return template ? runFromTemplate(template, projectId, weldId) : emptyRun(projectId, weldId);
  } catch {
    return emptyRun(projectId, weldId);
  }
}

export async function getSafeWeldInspection(projectIdOrWeldId: string, maybeWeldId?: string): Promise<WeldInspectionRun> {
  const projectId = maybeWeldId ? projectIdOrWeldId : undefined;
  const weldId = maybeWeldId || projectIdOrWeldId;
  const path = projectId ? `/projects/${projectId}/welds/${weldId}/inspection` : `/welds/${weldId}/inspection`;
  try {
    const normalized = normalizeInspectionPayload(await apiRequest<unknown>(path), projectId, weldId);
    if ((normalized.sections || []).length) return normalized;
    return await fallbackFromTemplate(projectId, weldId);
  } catch {
    return await fallbackFromTemplate(projectId, weldId);
  }
}

export async function saveSafeWeldInspection(projectIdOrWeldId: string, weldIdOrPayload: string | Record<string, unknown>, maybePayload?: Record<string, unknown>) {
  return saveCanonicalWeldInspection(projectIdOrWeldId, weldIdOrPayload, maybePayload);
}
