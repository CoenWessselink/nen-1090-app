import { ApiError, apiRequest, firstSuccessfulListRequest, listRequest } from '@/api/client';
import { getNormRuntime, normRuntimeTemplatesAsList } from '@/api/normRuntime';
import { runtimeTrace } from '@/utils/runtimeTracing';
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
      counts?: Record<string, number>;
      runtime_mode?: string;
      degraded?: boolean;
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
  if (record.data && typeof record.data === 'object') return record.data as MasterDataItem;
  if (record.item && typeof record.item === 'object') return record.item as MasterDataItem;
  return record;
}

async function mutationRequest(path: string, method: 'POST' | 'PATCH' | 'PUT', payload?: Record<string, unknown>) {
  const body = payload === undefined ? undefined : JSON.stringify(payload);
  try {
    const response = await apiRequest<unknown>(path, { method, body });
    return normalizeMutationResponse(response);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 405) throw error;
    if (method === 'POST') throw error;
    const alternate: 'PATCH' | 'PUT' = method === 'PATCH' ? 'PUT' : 'PATCH';
    const fallback = await apiRequest<unknown>(path, { method: alternate, body });
    return normalizeMutationResponse(fallback);
  }
}

export function getTenants() {
  return listRequest<TenantListResponse>('/platform/tenants');
}

export async function getSettings() {
  const [wpsR, materialsR, weldersR, inspectionTemplatesR] = await Promise.allSettled([
    listRequest<MasterDataListResponse>('/settings/wps'),
    getMaterials(),
    listRequest<MasterDataListResponse>('/settings/welders'),
    getInspectionTemplates(),
  ]);

  const take = (result: PromiseSettledResult<MasterDataListResponse>, key: string): MasterDataListResponse => {
    if (result.status === 'fulfilled') return result.value;
    runtimeTrace('SETTINGS_SECTION_FAILED', {
      key,
      message: result.reason instanceof Error ? result.reason.message : 'unknown',
      status: result.reason instanceof ApiError ? result.reason.status : undefined,
    });
    return [];
  };

  return {
    wps: normalizeItems(take(wpsR, 'wps')),
    materials: normalizeItems(take(materialsR, 'materials')),
    welders: normalizeItems(take(weldersR, 'welders')),
    inspection_templates: normalizeItems(take(inspectionTemplatesR, 'inspection-templates')),
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
  return apiRequest<void>(`/settings/wps/${wpsId}`, { method: 'DELETE' });
}

const defaultListParams = { page: 1, limit: 200 } as const;

export async function getClients() {
  const payload = await firstSuccessfulListRequest<MasterDataListResponse>(['/settings/clients', '/clients', '/customers'], defaultListParams);
  return payload ?? { items: [], total: 0, page: 1, limit: 25 };
}

export function getProcesses() {
  return listRequest<MasterDataListResponse>('/settings/processes');
}

export async function getMaterials() {
  try {
    const payload = await firstSuccessfulListRequest<MasterDataListResponse>(['/settings/materials', '/materials'], defaultListParams);
    return payload ?? [];
  } catch (error) {
    runtimeTrace('SETTINGS_MATERIALS_UNAVAILABLE', {
      message: error instanceof Error ? error.message : 'unknown',
      status: error instanceof ApiError ? error.status : undefined,
    });
    return [];
  }
}

export function createMaterial(payload: Record<string, unknown>) {
  return mutationRequest('/settings/materials', 'POST', payload);
}

export function updateMaterial(materialId: string | number, payload: Record<string, unknown>) {
  return mutationRequest(`/settings/materials/${materialId}`, 'PATCH', payload);
}

export function deleteMaterial(materialId: string | number) {
  return apiRequest<void>(`/settings/materials/${materialId}`, { method: 'DELETE' });
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
  return apiRequest<void>(`/settings/welders/${welderId}`, { method: 'DELETE' });
}

export async function getInspectionTemplates() {
  const runtime = await getNormRuntime();
  const runtimeList = normRuntimeTemplatesAsList(runtime);
  if (runtimeList.items.length || runtime.success) return runtimeList;

  const response = await firstSuccessfulListRequest<MasterDataListResponse>(
    ['/settings/inspection-templates', '/norms/templates'],
    { active: true },
    { skipStatuses: [404, 405, 500, 501, 503] },
  );
  return response ?? { items: [], total: 0, page: 1, limit: 25 };
}

export function createInspectionTemplate(payload: Record<string, unknown>) {
  return mutationRequest('/settings/inspection-templates', 'POST', payload);
}

export function updateInspectionTemplate(templateId: string | number, payload: Record<string, unknown>) {
  return mutationRequest(`/settings/inspection-templates/${templateId}`, 'PATCH', payload);
}

export function deleteInspectionTemplate(templateId: string | number) {
  return apiRequest<void>(`/settings/inspection-templates/${templateId}`, { method: 'DELETE' });
}

export function duplicateInspectionTemplate(templateId: string | number) {
  return apiRequest(`/settings/inspection-templates/${templateId}/duplicate`, { method: 'POST' });
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
  return apiRequest<void>(`/settings/weld-coordinators/${coordinatorId}`, { method: 'DELETE' });
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
  return apiRequest<MasterDataItem>('/settings/company/logo', { method: 'POST', body: formData });
}
