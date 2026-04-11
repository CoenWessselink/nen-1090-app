import client from '@/api/client';

export type LoginRequest = {
  tenant: string;
  email: string;
  password: string;
};

export type LoginUser = {
  email: string;
  tenant: string;
  tenant_id: string;
  role: string;
  name: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string | null;
  user: LoginUser;
};

function normalizeUser(input: any, fallbackTenant = ''): LoginUser {
  return {
    email: String(input?.email || input?.username || ''),
    tenant: String(input?.tenant || input?.tenant_name || fallbackTenant || ''),
    tenant_id: String(input?.tenant_id || input?.tenantId || ''),
    role: String(input?.role || input?.user_role || ''),
    name: String(input?.name || input?.full_name || input?.display_name || ''),
  };
}

export function normalizeLoginResponse(raw: any, fallbackTenant = ''): LoginResponse {
  const accessToken =
    raw?.access_token ||
    raw?.token ||
    raw?.accessToken ||
    raw?.data?.access_token ||
    raw?.data?.token ||
    '';

  const refreshToken =
    raw?.refresh_token ??
    raw?.refreshToken ??
    raw?.data?.refresh_token ??
    raw?.data?.refreshToken ??
    null;

  const userSource =
    raw?.user ||
    raw?.data?.user ||
    raw?.profile ||
    raw?.me ||
    raw;

  const user = normalizeUser(userSource, fallbackTenant);

  if (!accessToken) {
    throw new Error('Loginresponse bevat geen access token.');
  }

  if (!user.email) {
    throw new Error('Loginresponse bevat geen geldige gebruiker.');
  }

  return {
    access_token: String(accessToken),
    refresh_token: refreshToken ? String(refreshToken) : null,
    user,
  };
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const raw = await client.post<any>('/auth/login', payload);
  return normalizeLoginResponse(raw, payload.tenant);
}

export async function getMe() {
  return client.get<any>('/auth/me');
}

export async function refreshSession(refreshToken: string) {
  const raw = await client.post<any>('/auth/refresh', { refresh_token: refreshToken });
  return normalizeLoginResponse(raw);
}

export async function refreshCentralSession() {
  const raw = await client.post<any>('/auth/refresh', {});
  return normalizeLoginResponse(raw);
}
