import { useAuthStore } from '@/app/store/auth-store';

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status = 500, details: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type Primitive = string | number | boolean;
type QueryValue = Primitive | null | undefined;
type QueryParams = Record<string, QueryValue> | undefined;

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function isAuthPath(path: string): boolean {
  return path.includes('/auth/login') || path.includes('/auth/refresh') || path.includes('/auth/me');
}

function buildBasePath(path: string): string {
  if (isAbsoluteUrl(path)) return path;
  if (path.startsWith('/api/')) return path;
  if (path.startsWith('/')) return `/api/v1${path}`;
  return `/api/v1/${path}`;
}

function sanitizeQueryValue(key: string, value: QueryValue): QueryValue {
  if (key === 'limit' && typeof value === 'number') {
    if (value < 1) return 25;
    if (value > 100) return 100;
  }
  if (key === 'page' && typeof value === 'number' && value < 1) {
    return 1;
  }
  return value;
}

function buildUrl(path: string, params?: QueryParams): string {
  const raw = buildBasePath(path);
  if (!params || isAbsoluteUrl(raw)) return raw;

  const url = new URL(raw, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    const next = sanitizeQueryValue(key, value);
    if (next === undefined || next === null || next === '') return;
    url.searchParams.set(key, String(next));
  });
  return `${url.pathname}${url.search}`;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function getAuthSnapshot() {
  return useAuthStore.getState();
}

function buildAuthHeaders(headers: Headers) {
  const { token, user } = getAuthSnapshot();

  if (token && token !== '__cookie_session__' && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (user?.tenant && !headers.has('X-Tenant')) {
    headers.set('X-Tenant', String(user.tenant));
  }

  if (user?.tenantId && !headers.has('X-Tenant-Id')) {
    headers.set('X-Tenant-Id', String(user.tenantId));
  }
}

function normalizeInit(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers || {});
  buildAuthHeaders(headers);

  const next: RequestInit = {
    ...init,
    credentials: init?.credentials || 'include',
    headers,
  };

  if (init?.body && !isFormData(init.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return next;
}

async function parseResponse<T>(response: Response, raw = false): Promise<T> {
  if (!response.ok) {
    let details: unknown = null;
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        details = await response.json();
      } else {
        details = await response.text();
      }
    } catch {
      details = null;
    }
    throw new ApiError(response.statusText || 'API request failed', response.status, details);
  }

  if (raw) return response as unknown as T;
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  if (
    contentType.includes('application/pdf') ||
    contentType.includes('application/octet-stream') ||
    contentType.includes('application/zip')
  ) {
    return (await response.blob()) as T;
  }
  return (await response.text()) as T;
}

async function tryRefreshSession(): Promise<boolean> {
  const store = getAuthSnapshot();
  if (!store.refreshToken || store.refreshToken === '__cookie_session__') return false;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (store.user?.tenant) headers['X-Tenant'] = String(store.user.tenant);
  if (store.user?.tenantId) headers['X-Tenant-Id'] = String(store.user.tenantId);

  try {
    const response = await fetch(buildBasePath('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ refresh_token: store.refreshToken }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404 || response.status === 405) {
        store.clearSession();
      }
      return false;
    }

    const payload = (await response.json()) as {
      access_token?: string;
      refresh_token?: string | null;
      user?: { email?: string; tenant?: string; tenant_id?: string; role?: string; name?: string };
    };

    if (!payload.access_token || !payload.user?.email) {
      store.clearSession();
      return false;
    }

    store.setSession(
      payload.access_token,
      {
        email: payload.user.email,
        tenant: payload.user.tenant || '',
        tenantId: payload.user.tenant_id || '',
        role: payload.user.role || '',
        name: payload.user.name || '',
      },
      payload.refresh_token || store.refreshToken,
    );
    return true;
  } catch {
    store.clearSession();
    return false;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  init?: RequestInit,
  retries = 0,
  raw = false,
): Promise<T> {
  const response = await fetch(buildBasePath(path), normalizeInit(init));

  if (response.status === 401 && retries < 1 && !isAuthPath(path)) {
    const refreshed = await tryRefreshSession().catch(() => false);
    if (refreshed) {
      return apiRequest<T>(path, init, retries + 1, raw);
    }
  }

  return parseResponse<T>(response, raw);
}

export async function listRequest<T = unknown>(path: string, params?: QueryParams): Promise<T> {
  return apiRequest<T>(buildUrl(path, params));
}

export async function optionalRequest<T = unknown>(paths: string[], init?: RequestInit): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    if (!path || path.includes('/undefined') || path.includes('=undefined')) {
      continue;
    }
    try {
      return await apiRequest<T>(path, init);
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && [401, 404, 405, 422].includes(error.status)) {
        continue;
      }
      throw error;
    }
  }

  if (lastError) throw lastError;
  throw new ApiError('No matching endpoint path succeeded', 500);
}

export async function downloadRequest(path: string, init?: RequestInit): Promise<Blob> {
  const response = await fetch(buildBasePath(path), normalizeInit(init));
  if (!response.ok) {
    let details: unknown = null;
    try {
      details = await response.text();
    } catch {
      details = null;
    }
    throw new ApiError(response.statusText || 'Download failed', response.status, details);
  }
  return response.blob();
}

export function buildListPath(path: string, params?: QueryParams): string {
  return buildUrl(path, params);
}

export function healthRequest<T = unknown>(_arg?: unknown): Promise<T> {
  return apiRequest<T>('/health');
}

const client = {
  get: <T = unknown>(path: string, init?: RequestInit) => apiRequest<T>(path, { ...(init || {}), method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, {
      ...(init || {}),
      method: 'POST',
      body: isFormData(body) ? body : body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, {
      ...(init || {}),
      method: 'PUT',
      body: isFormData(body) ? body : body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, {
      ...(init || {}),
      method: 'PATCH',
      body: isFormData(body) ? body : body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T = unknown>(path: string, init?: RequestInit) => apiRequest<T>(path, { ...(init || {}), method: 'DELETE' }),
};

export default client;
