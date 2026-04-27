import { apiRequest, listRequest, optionalRequest } from '@/api/client';
import type { Tenant } from '@/types/domain';

export type MasterDataItem = Record<string, unknown>;
type MasterDataListResponse =
  | MasterDataItem[]
  | {
      items?: MasterDataItem[];
      data?: MasterDataItem[];
      results?: MasterDataItem[];
      total?: number;
      page?: number;
      limit?: number;
    };

type TenantListResponse =
  | Tenant[]
  | {
      items?: Tenant[];
      data?: Tenant[];
      results?: Tenant[];
      total?: number;
      page?: number;
      limit?: number;
    };

const defaultInspectionTemplates: MasterDataItem[] = [
  {
    id: 'default-exc1',
    name: 'EXC1 standaard inspectietemplate',
    code: 'EXC1-STANDAARD',
    exc_class: 'EXC1',
    norm: 'NEN-EN 1090-2 / ISO 3834 / ISO 5817',
    version: 1,
    is_default: true,
    items_json: [
      { code: 'EXC1_VISUAL', title: 'Visuele controle lasnaad', group: 'Visueel', norm_reference: 'NEN-EN 1090-2', required: true, default_status: 'conform', sort_order: 1, description: 'Controle op zichtbare onvolkomenheden.' },
      { code: 'EXC1_DIM', title: 'Maatvoering en positie controleren', group: 'Maatvoering', norm_reference: 'Werktekening', required: true, default_status: 'conform', sort_order: 2, description: 'Controleer ligging, maatvoering en aansluiting.' },
    ],
  },
  {
    id: 'default-exc2',
    name: 'EXC2 standaard inspectietemplate',
    code: 'EXC2-STANDAARD',
    exc_class: 'EXC2',
    norm: 'NEN-EN 1090-2 / ISO 3834 / ISO 5817',
    version: 1,
    is_default: true,
    items_json: [
      { code: 'EXC2_WPS', title: 'Juiste WPS toegepast', group: 'Documenten', norm_reference: 'ISO 3834 / ISO 15609', required: true, default_status: 'conform', sort_order: 1, description: 'WPS moet aantoonbaar gekoppeld zijn.' },
      { code: 'EXC2_VISUAL', title: 'Visuele inspectie uitgevoerd', group: 'Visueel', norm_reference: 'ISO 17637 / ISO 5817', required: true, default_status: 'conform', sort_order: 2, description: 'Visuele vrijgave volgens gekozen acceptatieniveau.' },
      { code: 'EXC2_TRACE', title: 'Materiaal- en lassertraceerbaarheid', group: 'Traceability', norm_reference: 'NEN-EN 1090-2', required: true, default_status: 'conform', sort_order: 3, description: 'Koppeling met materiaal, WPS en lasser aanwezig.' },
    ],
  },
  {
    id: 'default-exc3',
    name: 'EXC3 uitgebreid inspectietemplate',
    code: 'EXC3-UITGEBREID',
    exc_class: 'EXC3',
    norm: 'NEN-EN 1090-2 / ISO 3834 / ISO 5817 / ISO 17635',
    version: 1,
    is_default: true,
    items_json: [
      { code: 'EXC3_DOC', title: 'Volledige documentcontrole', group: 'Documenten', norm_reference: 'ISO 3834', required: true, default_status: 'conform', sort_order: 1, description: 'Controle op WPS, WPQR en kwalificaties.' },
      { code: 'EXC3_NDT', title: 'Aanvullende NDO/NDT-controle', group: 'NDT', norm_reference: 'Projectspecifiek / ISO 17635', required: true, default_status: 'conform', sort_order: 2, description: 'Aanvullende onderzoeksmethode volgens projecteis.' },
      { code: 'EXC3_ACCEPT', title: 'Acceptatie volgens ISO 5817', group: 'Acceptatie', norm_reference: 'ISO 5817', required: true, default_status: 'conform', sort_order: 3, description: 'Vrijgave op basis van acceptatieniveau.' },
    ],
  },
  {
    id: 'default-exc4',
    name: 'EXC4 kritisch inspectietemplate',
    code: 'EXC4-KRITISCH',
    exc_class: 'EXC4',
    norm: 'NEN-EN 1090-2 / ISO 3834 / ISO 5817 / ISO 17635',
    version: 1,
    is_default: true,
    items_json: [
      { code: 'EXC4_CRITICAL', title: 'Kritische visuele vrijgave', group: 'Visueel', norm_reference: 'NEN-EN 1090-2', required: true, default_status: 'conform', sort_order: 1, description: 'Verzwaarde eindcontrole en vrijgave.' },
      { code: 'EXC4_DOC_REVIEW', title: 'Volledige documentreview', group: 'Documenten', norm_reference: 'ISO 3834', required: true, default_status: 'conform', sort_order: 2, description: 'Verifieer complete documentdekking.' },
      { code: 'EXC4_NDT', title: 'Verplichte aanvullende NDT', group: 'NDT', norm_reference: 'Projectspecifiek / ISO 17635', required: true, default_status: 'conform', sort_order: 3, description: 'Aanvullende NDT-verificatie en vastlegging.' },
    ],
  },
];

function fallbackTemplateResponse(): MasterDataListResponse {
  return { items: defaultInspectionTemplates, total: defaultInspectionTemplates.length, page: 1, limit: defaultInspectionTemplates.length };
}

function normalizeItems(payload: MasterDataListResponse | null | undefined): MasterDataItem[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

export function getTenants() {
  return listRequest<TenantListResponse>('/platform/tenants');
}

export async function getSettings() {
  const [wps, materials, welders, inspectionTemplates] = await Promise.all([
    optionalRequest<MasterDataListResponse>(['/settings/wps']),
    optionalRequest<MasterDataListResponse>(['/settings/materials']),
    optionalRequest<MasterDataListResponse>(['/settings/welders']),
    getInspectionTemplates().catch(() => fallbackTemplateResponse()),
  ]);

  return {
    wps: normalizeItems(wps),
    materials: normalizeItems(materials),
    welders: normalizeItems(welders),
    inspection_templates: normalizeItems(inspectionTemplates),
    contracts: {
      settings_root: false,
      settings_wps: Boolean(wps),
      settings_materials: Boolean(materials),
      settings_welders: Boolean(welders),
      settings_inspection_templates: true,
    },
  } satisfies Record<string, unknown>;
}

export function getWps() {
  return listRequest<MasterDataListResponse>('/settings/wps');
}

export function createWps(payload: Record<string, unknown>) {
  return apiRequest<MasterDataItem>('/settings/wps', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateWps(wpsId: string | number, payload: Record<string, unknown>) {
  return apiRequest<MasterDataItem>(`/settings/wps/${wpsId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteWps(wpsId: string | number) {
  return apiRequest<void>(`/settings/wps/${wpsId}`, { method: 'DELETE' });
}

export async function getClients() {
  const payload = await optionalRequest<MasterDataListResponse>(['/settings/clients', '/clients', '/customers']);
  if (payload) return payload;

  const projects = await optionalRequest<MasterDataListResponse>(['/projects']);
  const items = normalizeItems(projects).map((item) => {
    const row = item as Record<string, unknown>;
    return { id: row.client_id || row.client_name || row.opdrachtgever || row.client || row.id, name: row.client_name || row.opdrachtgever || row.client || row.name || row.title || row.code || row.id } satisfies MasterDataItem;
  }).filter((item) => String(item.name || '').trim());

  const unique = Array.from(new Map(items.map((item) => [String(item.name), item])).values());
  return { items: unique, total: unique.length, page: 1, limit: unique.length || 25 };
}

export function getProcesses() { return listRequest<MasterDataListResponse>('/settings/processes'); }
export function getMaterials() { return listRequest<MasterDataListResponse>('/settings/materials'); }
export function createMaterial(payload: Record<string, unknown>) { return apiRequest<MasterDataItem>('/settings/materials', { method: 'POST', body: JSON.stringify(payload) }); }
export function updateMaterial(materialId: string | number, payload: Record<string, unknown>) { return apiRequest<MasterDataItem>(`/settings/materials/${materialId}`, { method: 'PATCH', body: JSON.stringify(payload) }); }
export function deleteMaterial(materialId: string | number) { return apiRequest<void>(`/settings/materials/${materialId}`, { method: 'DELETE' }); }
export function getWelders() { return listRequest<MasterDataListResponse>('/settings/welders'); }
export function createWelder(payload: Record<string, unknown>) { return apiRequest<MasterDataItem>('/settings/welders', { method: 'POST', body: JSON.stringify(payload) }); }
export function updateWelder(welderId: string | number, payload: Record<string, unknown>) { return apiRequest<MasterDataItem>(`/settings/welders/${welderId}`, { method: 'PATCH', body: JSON.stringify(payload) }); }
export function deleteWelder(welderId: string | number) { return apiRequest<void>(`/settings/welders/${welderId}`, { method: 'DELETE' }); }

export async function getInspectionTemplates() {
  try {
    const payload = await listRequest<MasterDataListResponse>('/settings/inspection-templates');
    const items = normalizeItems(payload);
    return items.length ? payload : fallbackTemplateResponse();
  } catch {
    return fallbackTemplateResponse();
  }
}

export function createInspectionTemplate(payload: Record<string, unknown>) { return apiRequest<MasterDataItem>('/settings/inspection-templates', { method: 'POST', body: JSON.stringify(payload) }); }
export async function updateInspectionTemplate(templateId: string | number, payload: Record<string, unknown>) {
  return ((await optionalRequest<MasterDataItem>([`/settings/inspection-templates/${templateId}`], { method: 'PATCH', body: JSON.stringify(payload) })) || (await apiRequest<MasterDataItem>(`/settings/inspection-templates/${templateId}`, { method: 'PUT', body: JSON.stringify(payload) })));
}
export function deleteInspectionTemplate(templateId: string | number) { return apiRequest<void>(`/settings/inspection-templates/${templateId}`, { method: 'DELETE' }); }
export async function duplicateInspectionTemplate(templateId: string | number) {
  const direct = await optionalRequest<MasterDataItem>([`/settings/inspection-templates/${templateId}/duplicate`], { method: 'POST' });
  if (direct) return direct;
  const current = await optionalRequest<MasterDataItem>([`/settings/inspection-templates/${templateId}`]);
  if (!current) throw new Error('Template dupliceren wordt niet ondersteund door de huidige backend.');
  const clone: Record<string, unknown> = { ...current, name: `${String(current.name || current.code || 'Template')} kopie`, code: `${String(current.code || current.id || 'TPL')}-KOPIE`, version: Number(current.version || 1) };
  delete clone.id; delete clone.created_at; delete clone.updated_at;
  return createInspectionTemplate(clone);
}

export function getWeldCoordinators() { return listRequest<MasterDataListResponse>('/settings/weld-coordinators'); }
export function createWeldCoordinator(payload: Record<string, unknown>) { return apiRequest<MasterDataItem>('/settings/weld-coordinators', { method: 'POST', body: JSON.stringify(payload) }); }
export function updateWeldCoordinator(coordinatorId: string | number, payload: Record<string, unknown>) { return apiRequest<MasterDataItem>(`/settings/weld-coordinators/${coordinatorId}`, { method: 'PATCH', body: JSON.stringify(payload) }); }
export function deleteWeldCoordinator(coordinatorId: string | number) { return apiRequest<void>(`/settings/weld-coordinators/${coordinatorId}`, { method: 'DELETE' }); }
export function getCompanySettings() { return apiRequest<MasterDataItem>('/settings/company'); }
export function updateCompanySettings(payload: Record<string, unknown>) { return apiRequest<MasterDataItem>('/settings/company', { method: 'PUT', body: JSON.stringify(payload) }); }
export function uploadCompanyLogo(file: File) { const formData = new FormData(); formData.append('file', file); return apiRequest<MasterDataItem>('/settings/company/logo', { method: 'POST', body: formData }); }
