import { apiRequest } from '@/api/client';

export interface SettingsV2Meta {
  aggregate_version: number;
  invalidate_keys: string[];
}

export interface SettingsV2Response<T> {
  data: T;
  meta: SettingsV2Meta;
}

export async function fetchCompanySettings(): Promise<SettingsV2Response<Record<string, unknown>>> {
  return apiRequest<SettingsV2Response<Record<string, unknown>>>('/settings-v2/company');
}
