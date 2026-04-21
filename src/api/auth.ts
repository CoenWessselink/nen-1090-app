import client from '@/api/client';
import type { AuthRefreshResponse, ChangePasswordPayload, LoginPayload, LoginResponse } from '@/types/api';

function normalizeUser(input: any, fallbackTenant = '') {
  return {
    email: String(input?.email || input?.username || ''),
    role: String(input?.canonical_role || input?.role || input?.user_role || ''),
    tenant: String(input?.tenant || input?.tenant_name || fallbackTenant || ''),
    tenant_id: input?.tenant_id ?? input?.tenantId ?? '',
    name: String(input?.name || input?.full_name || input?.display_name || ''),
  };
}

function normalizeLoginResponse(raw: any, fallbackTenant = ''): LoginResponse {
  const access_token =
    raw?.access_token ||
    raw?.token ||
    raw?.accessToken ||
    raw?.data?.access_token ||
    raw?.data?.token ||
    '';

  const refresh_token =
    raw?.refresh_token ??
    raw?.refreshToken ??
    raw?.data?.refresh_token ??
    raw?.data?.refreshToken ??
    undefined;

  const userSource = raw?.user || raw?.data?.user || raw?.profile || raw?.me || raw;
  const user = normalizeUser(userSource, fallbackTenant);

  return {
    access_token: access_token ? String(access_token) : undefined,
    refresh_token: refresh_token ? String(refresh_token) : undefined,
    token: access_token ? String(access_token) : undefined,
    user,
  };
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const raw = await client.post<any>('/auth/login', payload);
  return normalizeLoginResponse(raw, payload.tenant);
}

export async function getMe() {
  return client.get<any>('/auth/me');
}

export async function refreshSession(refreshToken: string): Promise<AuthRefreshResponse> {
  const raw = await client.post<any>('/auth/refresh', { refresh_token: refreshToken });
  return normalizeLoginResponse(raw) as AuthRefreshResponse;
}

export async function refreshCentralSession(): Promise<AuthRefreshResponse> {
  const raw = await client.post<any>('/auth/refresh', {});
  return normalizeLoginResponse(raw) as AuthRefreshResponse;
}

export async function requestPasswordReset(payload: { email: string; tenant: string }) {
  return client.post<any>('/auth/reset-password/request', payload);
}

export async function confirmPasswordReset(payload: { token: string; password: string }) {
  return client.post<any>('/auth/reset-password/confirm', { token: payload.token, new_password: payload.password });
}

export async function changePassword(payload: ChangePasswordPayload) {
  return client.post<any>('/auth/change-password', payload);
}


export async function activateAccount(payload: { token: string; password: string }) {
  return client.post<any>('/auth/set-password', { token: payload.token, new_password: payload.password });
}
