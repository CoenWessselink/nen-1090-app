import { apiRequest, listRequest, optionalRequest } from '@/api/client';
import type { Tenant } from '@/types/domain';

type MasterDataItem = Record<string, unknown>;
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
    optionalRequest<MasterDataListResponse>(['/settings/inspection-templates']),
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
      settings_inspection_templates: Boolean(inspectionTemplates),
    },
  } satisfies Record<string, unknown>;
}

export function getWps() {
  return listRequest<MasterDataListResponse>('/settings/wps');
}

export function createWps(payload: Record<string, unknown>) {
  return apiRequest<MasterDataItem>('/settings/wps', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateWps(wpsId: string | number, payload: Record<string, unknown>) {
  return apiRequest<MasterDataItem>(`/settings/wps/${wpsId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteWps(wpsId: string | number) {
  return apiRequest<void>(`/settings/wps/${wpsId}`, {
    method: 'DELETE',
  });
}

export function getMaterials() {
  return listRequest<MasterDataListResponse>('/settings/materials');
}

export function createMaterial(payload: Record<string, unknown>) {
  return apiRequest<MasterDataItem>('/settings/materials', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMaterial(materialId: string | number, payload: Record<string, unknown>) {
  return apiRequest<MasterDataItem>(`/settings/materials/${materialId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteMaterial(materialId: string | number) {
  return apiRequest<void>(`/settings/materials/${materialId}`, {
    method: 'DELETE',
  });
}

export function getWelders() {
  return listRequest<MasterDataListResponse>('/settings/welders');
}

export function createWelder(payload: Record<string, unknown>) {
  return apiRequest<MasterDataItem>('/settings/welders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateWelder(welderId: string | number, payload: Record<string, unknown>) {
  return apiRequest<MasterDataItem>(`/settings/welders/${welderId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteWelder(welderId: string | number) {
  return apiRequest<void>(`/settings/welders/${welderId}`, {
    method: 'DELETE',
  });
}

export function getInspectionTemplates() {
  return listRequest<MasterDataListResponse>('/settings/inspection-templates');
}

export function createInspectionTemplate(payload: Record<string, unknown>) {
  return apiRequest<MasterDataItem>('/settings/inspection-templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateInspectionTemplate(templateId: string | number, payload: Record<string, unknown>) {
  return apiRequest<MasterDataItem>(`/settings/inspection-templates/${templateId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteInspectionTemplate(templateId: string | number) {
  return apiRequest<void>(`/settings/inspection-templates/${templateId}`, {
    method: 'DELETE',
  });
}


export function duplicateInspectionTemplate(templateId: string | number) {
  return apiRequest<MasterDataItem>(`/settings/inspection-templates/${templateId}/duplicate`, {
    method: "POST",
  });
}
