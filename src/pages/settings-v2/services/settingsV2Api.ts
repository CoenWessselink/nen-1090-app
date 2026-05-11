export interface SettingsV2Meta {
  aggregate_version: number;
  invalidate_keys: string[];
}

export interface SettingsV2Response<T> {
  data: T;
  meta: SettingsV2Meta;
}

export async function fetchCompanySettings(): Promise<SettingsV2Response<any>> {
  const response = await fetch('/api/v1/settings-v2/company', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Settings V2 company runtime');
  }

  return response.json();
}
