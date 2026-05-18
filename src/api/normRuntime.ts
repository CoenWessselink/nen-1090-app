import { ApiError, apiRequest } from '@/api/client';
import { runtimeTrace } from '@/utils/runtimeTracing';

export type NormRuntimeRecord = Record<string, unknown>;

export type NormRuntimeCounts = {
  systems: number;
  standards: number;
  profiles: number;
  templates: number;
  template_items: number;
  ce_blockers: number;
};

export type NormRuntimeResponse = {
  success: boolean;
  systems: NormRuntimeRecord[];
  standards: NormRuntimeRecord[];
  profiles: NormRuntimeRecord[];
  templates: NormRuntimeRecord[];
  counts: NormRuntimeCounts;
  runtime_mode: string;
  degraded?: boolean;
  source?: string;
};

const emptyCounts: NormRuntimeCounts = {
  systems: 0,
  standards: 0,
  profiles: 0,
  templates: 0,
  template_items: 0,
  ce_blockers: 0,
};

function asRecord(payload: unknown): NormRuntimeRecord {
  return payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as NormRuntimeRecord) : {};
}

function asArray(payload: unknown): NormRuntimeRecord[] {
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === 'object') as NormRuntimeRecord[];
  const record = asRecord(payload);
  if (Array.isArray(record.items)) return asArray(record.items);
  if (Array.isArray(record.data)) return asArray(record.data);
  if (Array.isArray(record.results)) return asArray(record.results);
  return [];
}

function bool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  return Boolean(value);
}

function normalizeTemplateItem(item: unknown, index: number, section?: NormRuntimeRecord): NormRuntimeRecord {
  const record = asRecord(item);
  const sectionCode = String(record.section_code || section?.code || section?.section_code || 'general');
  const sectionName = String(record.section_name || section?.name || section?.section_name || record.group || 'Algemeen');
  const acceptanceRule = asRecord(record.acceptance_rule_json);

  return {
    ...record,
    temp_id: String(record.temp_id || record.id || record.code || `${sectionCode}-${index + 1}`),
    id: String(record.id || record.temp_id || record.code || `${sectionCode}-${index + 1}`),
    code: String(record.code || record.item_code || record.criterion_key || `CHECK_${index + 1}`),
    title: String(record.title || record.label || record.name || record.code || `Controlepunt ${index + 1}`),
    label: String(record.label || record.title || record.name || record.code || `Controlepunt ${index + 1}`),
    group: String(record.group || record.category || sectionName),
    section_code: sectionCode,
    section_name: sectionName,
    norm_reference: String(record.norm_reference || record.norm || record.norm_code || 'EN 1090 / ISO 3834 / ISO 5817'),
    category: String(record.category || record.group || sectionName),
    input_type: String(record.input_type || 'status'),
    result_type: String(record.result_type || 'conformity'),
    required: bool(record.required, true),
    allow_na: bool(record.allow_na, true),
    requires_photo: bool(record.requires_photo ?? acceptanceRule.requires_photo, false),
    requires_document: bool(record.requires_document ?? acceptanceRule.requires_document, false),
    blocks_release: bool(record.blocks_release ?? acceptanceRule.blocks_ce_release, true),
    default_status: String(record.default_status || record.default_value || record.result || record.status || 'conform'),
    severity_on_fail: String(record.severity_on_fail || record.severity || 'major'),
    description: String(record.description || record.help_text || record.comment || ''),
    sort_order: Number(record.sort_order || index + 1),
  };
}

function flattenTemplateItems(template: NormRuntimeRecord): NormRuntimeRecord[] {
  const directItems = asArray(template.items_json).length ? asArray(template.items_json) : asArray(template.items);
  if (directItems.length) return directItems.map((item, index) => normalizeTemplateItem(item, index));
  return asArray(template.sections).flatMap((section) => asArray(section.items).map((item, index) => normalizeTemplateItem(item, index, section)));
}

function normalizeSections(template: NormRuntimeRecord, items: NormRuntimeRecord[]): NormRuntimeRecord[] {
  const sections = asArray(template.sections);
  if (sections.length) {
    return sections.map((section) => {
      const code = String(section.code || section.section_code || 'general');
      const sectionItems = asArray(section.items).map((item, index) => normalizeTemplateItem(item, index, section));
      return {
        ...section,
        code,
        name: String(section.name || section.section_name || code),
        items: sectionItems.length ? sectionItems : items.filter((item) => String(item.section_code || 'general') === code),
      };
    });
  }

  const grouped = new Map<string, NormRuntimeRecord[]>();
  items.forEach((item) => {
    const code = String(item.section_code || 'general');
    grouped.set(code, [...(grouped.get(code) || []), item]);
  });

  return Array.from(grouped.entries()).map(([code, rows], index) => ({
    code,
    name: String(rows[0]?.section_name || rows[0]?.group || code),
    sort_order: index + 1,
    items: rows,
  }));
}

function excFromTemplate(template: NormRuntimeRecord): string {
  const raw = String(template.exc_class || template.execution_class || template.profile_code || template.code || '').toUpperCase();
  return raw.match(/EXC[1-4]/)?.[0] || 'EXC2';
}

function normalizeTemplate(template: unknown, index: number): NormRuntimeRecord {
  const record = asRecord(template);
  const items = flattenTemplateItems(record);
  const code = String(record.code || record.template_code || record.profile_code || `TEMPLATE_${index + 1}`);
  const locked = bool(record.is_locked, bool(record.is_default, true));

  return {
    ...record,
    id: String(record.id || code),
    code,
    name: String(record.name || record.title || `${excFromTemplate(record)} inspectietemplate`),
    profile_code: String(record.profile_code || record.profile || code),
    exc_class: excFromTemplate(record),
    norm: String(record.norm || record.norm_reference || record.profile_code || 'EN 1090 / ISO 3834 / ISO 5817'),
    template_type: String(record.template_type || 'weld'),
    version: Number(record.version || 1),
    is_active: bool(record.is_active, true),
    is_default: bool(record.is_default, true),
    is_locked: locked,
    is_tenant_template: bool(record.is_tenant_template, !locked),
    tenant_id: record.tenant_id ?? null,
    item_count: Number(record.item_count || items.length),
    items,
    items_json: items,
    sections: normalizeSections(record, items),
    sort_order: Number(record.sort_order || index + 1),
  };
}

function validationFallbackTemplates(payload: unknown): NormRuntimeRecord[] {
  const record = asRecord(payload);
  const validation = asRecord(record.validation && typeof record.validation === 'object' ? record.validation : record);
  const templates = asArray(validation.templates);

  return templates.map((template, index) => {
    const source = asRecord(template);
    const profileCode = String(source.profile_code || source.profile || source.code || `EU_EXC${index + 1}_STANDARD`);
    const code = String(source.code || `${profileCode}_WELD_V1`);
    const itemCount = Number(source.item_count || source.items || source.checks || 0);
    return normalizeTemplate({
      ...source,
      id: String(source.id || code),
      code,
      name: String(source.name || `${profileCode} inspectietemplate`),
      profile_code: profileCode,
      is_default: true,
      is_locked: true,
      items_json: Array.from({ length: itemCount }, (_, itemIndex) => ({
        temp_id: `${code}-fallback-${itemIndex + 1}`,
        code: `CHECK_${itemIndex + 1}`,
        title: `Controlepunt ${itemIndex + 1}`,
        group: 'Backend validatie',
        section_code: 'validation',
        section_name: 'Backend validatie',
        norm_reference: 'EN 1090 / ISO 3834 / ISO 5817',
        required: true,
        allow_na: true,
        blocks_release: true,
      })),
    }, index);
  });
}

function countsFromPayload(payload: unknown, systems: NormRuntimeRecord[], standards: NormRuntimeRecord[], profiles: NormRuntimeRecord[], templates: NormRuntimeRecord[]): NormRuntimeCounts {
  const source = asRecord(asRecord(payload).counts);
  const templateItems = templates.reduce((sum, template) => sum + asArray(template.items_json || template.items).length, 0);
  const ceBlockers = templates.reduce((sum, template) => sum + asArray(template.items_json || template.items).filter((item) => bool(item.blocks_release, false)).length, 0);

  return {
    systems: Number(source.systems || systems.length),
    standards: Number(source.standards || standards.length),
    profiles: Number(source.profiles || profiles.length),
    templates: Number(source.templates || templates.length),
    template_items: Number(source.template_items || source.items || templateItems),
    ce_blockers: Number(source.ce_blockers || source.blockers || ceBlockers),
  };
}

export function normalizeNormRuntime(payload: unknown, source = 'runtime'): NormRuntimeResponse {
  const record = asRecord(payload);
  const systems = asArray(record.systems);
  const standards = asArray(record.standards);
  const profiles = asArray(record.profiles);
  const templates = asArray(record.templates).map(normalizeTemplate);

  return {
    success: record.success !== false,
    systems,
    standards,
    profiles,
    templates,
    counts: countsFromPayload(record, systems, standards, profiles, templates),
    runtime_mode: String(record.runtime_mode || source),
    degraded: bool(record.degraded, false),
    source,
  };
}

export async function getNormRuntime(): Promise<NormRuntimeResponse> {
  try {
    const runtime = await apiRequest<unknown>('/norms/runtime');
    const normalized = normalizeNormRuntime(runtime, 'runtime');
    if (normalized.templates.length || normalized.systems.length || normalized.standards.length || normalized.profiles.length) return normalized;
  } catch (error) {
    runtimeTrace('NORM_RUNTIME_UNAVAILABLE', { message: error instanceof Error ? error.message : 'unknown', status: error instanceof ApiError ? error.status : undefined });
  }

  try {
    const validation = await apiRequest<unknown>('/norms/templates/validation');
    const templates = validationFallbackTemplates(validation);
    runtimeTrace('NORM_RUNTIME_VALIDATION_DEGRADED_FALLBACK_USED', { count: templates.length });
    return {
      success: templates.length > 0,
      systems: [],
      standards: [],
      profiles: [],
      templates,
      counts: countsFromPayload({}, [], [], [], templates),
      runtime_mode: 'degraded_validation_fallback',
      degraded: true,
      source: 'validation',
    };
  } catch (error) {
    runtimeTrace('NORM_RUNTIME_VALIDATION_FALLBACK_FAILED', { message: error instanceof Error ? error.message : 'unknown', status: error instanceof ApiError ? error.status : undefined });
  }

  return { success: false, systems: [], standards: [], profiles: [], templates: [], counts: emptyCounts, runtime_mode: 'unavailable', degraded: true, source: 'unavailable' };
}

export function normRuntimeTemplatesAsList(runtime: NormRuntimeResponse) {
  return { items: runtime.templates, total: runtime.counts.templates || runtime.templates.length, page: 1, limit: runtime.templates.length || 25, counts: runtime.counts, runtime_mode: runtime.runtime_mode, degraded: runtime.degraded };
}
