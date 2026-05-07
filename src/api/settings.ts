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

function normalizeItems(payload: MasterDataListResponse | null | undefined): MasterDataItem[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

function normalizeMutationResponse(payload: unknown): MasterDataItem {
  if (!payload || typeof payload !== 'object') return {};

  const record = payload as Record<string, unknown>;

  if (record.data && typeof record.data === 'object') {
    return record.data as MasterDataItem;
  }

  if (record.item && typeof record.item === 'object') {
    return record.item as MasterDataItem;
  }

  return record;
}

async function mutationRequest(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT',
  payload?: Record<string, unknown>,
) {
  const body = payload === undefined ? undefined : JSON.stringify(payload);

  try {
    const response = await apiRequest<unknown>(path, {
      method,
      body,
    });

    return normalizeMutationResponse(response);
  } catch (error) {
    if (method === 'PATCH') {
      const fallback = await apiRequest<unknown>(path, {
        method: 'PUT',
        body,
      });

      return normalizeMutationResponse(fallback);
    }

    if (method === 'PUT') {
      const fallback = await apiRequest<unknown>(path, {
        method: 'PATCH',
        body,
      });

      return normalizeMutationResponse(fallback);
    }

    throw error;
  }
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
  } satisfies Record<string, unknown>;
}

export function getWps() {
  return listRequest<MasterDataListResponse>('/settings/wps');
}

export function createWps(payload: Record<string, unknown>) {
  return mutationRequest('/settings/wps', 'POST', payload);
}

export function updateWps(wpsId: string | number, payload: Record<string, unknown>) {
  return mutationRequest(`/settings/wps/${wpsId}`, 'PATCH', payload);
}

export function deleteWps(wpsId: string | number) {
  return apiRequest<void>(`/settings/wps/${wpsId}`, {
    method: 'DELETE',
  });
}

export async function getClients() {
  const payload = await optionalRequest<MasterDataListResponse>([
    '/settings/clients',
    '/clients',
    '/customers',
  ]);

  if (payload) {
    return payload;
  }

  return {
    items: [],
    total: 0,
    page: 1,
    limit: 25,
  };
}

export function getProcesses() {
  return listRequest<MasterDataListResponse>('/settings/processes');
}

export function getMaterials() {
  return listRequest<MasterDataListResponse>('/settings/materials');
}

export function createMaterial(payload: Record<string, unknown>) {
  return mutationRequest('/settings/materials', 'POST', payload);
}

export function updateMaterial(materialId: string | number, payload: Record<string, unknown>) {
  return mutationRequest(`/settings/materials/${materialId}`, 'PATCH', payload);
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
  return mutationRequest('/settings/welders', 'POST', payload);
}

export function updateWelder(welderId: string | number, payload: Record<string, unknown>) {
  return mutationRequest(`/settings/welders/${welderId}`, 'PATCH', payload);
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
  return mutationRequest('/settings/inspection-templates', 'POST', payload);
}

export function updateInspectionTemplate(templateId: string | number, payload: Record<string, unknown>) {
  return mutationRequest(`/settings/inspection-templates/${templateId}`, 'PATCH', payload);
}

export function deleteInspectionTemplate(templateId: string | number) {
  return apiRequest<void>(`/settings/inspection-templates/${templateId}`, {
    method: 'DELETE',
  });
}

export function duplicateInspectionTemplate(templateId: string | number) {
  return apiRequest(`/settings/inspection-templates/${templateId}/duplicate`, {
    method: 'POST',
  });
}

export function getWeldCoordinators() {
  return listRequest<MasterDataListResponse>('/settings/weld-coordinators');
}

export function createWeldCoordinator(payload: Record<string, unknown>) {
  return mutationRequest('/settings/weld-coordinators', 'POST', payload);
}

export function updateWeldCoordinator(coordinatorId: string | number, payload: Record<string, unknown>) {
  return mutationRequest(`/settings/weld-coordinators/${coordinatorId}`, 'PATCH', payload);
}

export function deleteWeldCoordinator(coordinatorId: string | number) {
  return apiRequest<void>(`/settings/weld-coordinators/${coordinatorId}`, {
    method: 'DELETE',
  });
}

export function getCompanySettings() {
  return apiRequest<MasterDataItem>('/settings/company');
}

export function updateCompanySettings(payload: Record<string, unknown>) {
  return mutationRequest('/settings/company', 'PUT', payload);
}

export function uploadCompanyLogo(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest<MasterDataItem>('/settings/company/logo', {
    method: 'POST',
    body: formData,
  });
}
