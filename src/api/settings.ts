import { apiRequest, listRequest } from '@/api/client';
import type { Tenant } from '@/types/domain';

export type MasterDataItem = Record<string, unknown>;

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

export function getTenants() {
  return listRequest<TenantListResponse>('/platform/tenants');
}

export function getSettings() {
  return apiRequest<Record<string, unknown>>('/settings');
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
    method: 'PUT',
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
    method: 'PUT',
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
    method: 'PUT',
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
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteInspectionTemplate(templateId: string | number) {
  return apiRequest<void>(`/settings/inspection-templates/${templateId}`, {
    method: 'DELETE',
  });
}
