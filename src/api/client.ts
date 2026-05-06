import { readAnyPersistedSession, useAuthStore } from '@/app/store/auth-store';
import { runtimeTrace } from '@/utils/runtimeTracing';

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

const COOKIE_SESSION_MARKER = '__cookie_session__';
const OPTIONAL_REQUEST_FALLBACK_WARNING_THRESHOLD = 2;

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
  if (key === 'limit' && typeof value === 'number') return Math.min(Math.max(value, 1), 100);
  if (key === 'page' && typeof value === 'number') return Math.max(value, 1);
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

function filenameFromResponse(response: Response, fallback = 'download'): string {
  const disposition = response.headers.get('content-disposition') || '';
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const asciiMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (asciiMatch?.[1]) return asciiMatch[1];
  return fallback;
}

function errorMessageFromDetails(details: unknown, fallback: string): string {
  if (!details) return fallback;
  if (typeof details === 'string') return details;
  if (Array.isArray(details)) {
    const first = details.map((item) => errorMessageFromDetails(item, '')).find(Boolean);
    return first || fallback;
  }
  if (typeof details === 'object') {
    const record = details as Record<string, unknown>;
    const direct = record.message || record.error_description || record.title;
    if (typeof direct === 'string' && direct.trim()) return direct;

    const detail = record.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (detail && typeof detail === 'object') {
      const nested = errorMessageFromDetails(detail, '');
      if (nested) return nested;
    }

    const error = record.error;
    if (typeof error === 'string' && error.trim()) return error;
    if (error && typeof error === 'object') {
      const nested = errorMessageFromDetails(error, '');
      if (nested) return nested;
    }

    try {
      const compact = JSON.stringify(record);
      if (compact && compact !== '{}') return compact;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function getAuthSnapshot() {
  const state = useAuthStore.getState();
  if (state?.token || state?.refreshToken || state?.user) return state;

  const persisted = readAnyPersistedSession();
  return {
    ...state,
    token: persisted.token,
    refreshToken: persisted.refreshToken,
    user: persisted.user,
  };
}

function buildAuthHeaders(headers: Headers): void {
  const { token, user } = getAuthSnapshot();

  if (token && token !== COOKIE_SESSION_MARKER && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (user?.tenant && !headers.has('X-Tenant')) headers.set('X-Tenant', String(user.tenant));
  if (user?.tenantId && !headers.has('X-Tenant-Id')) headers.set('X-Tenant-Id', String(user.tenantId));
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
}

function normalizeInit(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers || {});
  buildAuthHeaders(headers);

  if (init?.body && !isFormData(init.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    ...init,
    credentials: init?.credentials || 'include',
    headers,
  };
}

async function parseResponse<T>(response: Response, raw = false): Promise<T> {
  if (!response.ok) {
    let details: unknown = null;
    try {
      const contentType = response.headers.get('content-type') || '';
      details = contentType.includes('application/json') ? await response.json() : await response.text();
    } catch {
      details = null;
    }
    throw new ApiError(errorMessageFromDetails(details, response.statusText || 'API request failed'), response.status, details);
  }

  if (raw) return response as unknown as T;
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return (await response.json()) as T;
  if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream') || contentType.includes('application/zip')) {
    return (await response.blob()) as T;
  }
  return (await response.text()) as T;
}

async function tryRefreshSession(): Promise<boolean> {
  const store = getAuthSnapshot();
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (store.user?.tenant) headers['X-Tenant'] = String(store.user.tenant);
  if (store.user?.tenantId) headers['X-Tenant-Id'] = String(store.user.tenantId);

  const attempts: RequestInit[] = [];
  if (store.refreshToken && store.refreshToken !== COOKIE_SESSION_MARKER) {
    attempts.push({ method: 'POST', credentials: 'include', headers, body: JSON.stringify({ refresh_token: store.refreshToken }) });
  }
  attempts.push({ method: 'POST', credentials: 'include', headers, body: JSON.stringify({}) });

  let response: Response | null = null;
  for (const attempt of attempts) {
    response = await fetch(buildBasePath('/auth/refresh'), attempt);
    if (response.ok) break;
  }
  if (!response?.ok) return false;

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string | null;
    user?: { email?: string; tenant?: string; tenant_id?: string; role?: string; name?: string };
  };
  if (!payload.access_token || !payload.user?.email) return false;

  useAuthStore.getState().setSession(
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
}

export async function apiRequest<T = unknown>(path: string, init?: RequestInit, retries = 0, raw = false): Promise<T> {
  const response = await fetch(buildBasePath(path), normalizeInit(init));
  if (response.status === 401 && retries < 1 && !isAuthPath(path)) {
    const refreshed = await tryRefreshSession().catch(() => false);
    if (refreshed) return apiRequest<T>(path, init, retries + 1, raw);
  }
  return parseResponse<T>(response, raw);
}

export async function listRequest<T = unknown>(path: string, params?: QueryParams): Promise<T> {
  return apiRequest<T>(buildUrl(path, params));
}

export async function optionalRequest<T = unknown>(paths: string[], init?: RequestInit): Promise<T> {
  let lastError: unknown = null;

  runtimeTrace('OPTIONAL_REQUEST_STARTED', {
    candidateCount: paths.length,
    candidatePaths: paths,
    canonicalPath: paths[0] || null,
  });

  if (paths.length > OPTIONAL_REQUEST_FALLBACK_WARNING_THRESHOLD) {
    runtimeTrace('OPTIONAL_REQUEST_BREADTH_WARNING', {
      candidateCount: paths.length,
      threshold: OPTIONAL_REQUEST_FALLBACK_WARNING_THRESHOLD,
      candidatePaths: paths,
    });
  }

  for (const [index, path] of paths.entries()) {
    if (!path || path.includes('/undefined') || path.includes('=undefined')) {
      runtimeTrace('OPTIONAL_REQUEST_SKIPPED_INVALID_PATH', {
        index,
        path,
      });

      continue;
    }

    try {
      const response = await apiRequest<T>(path, init);

      runtimeTrace(index === 0 ? 'OPTIONAL_REQUEST_CANONICAL_SUCCESS' : 'OPTIONAL_REQUEST_FALLBACK_SUCCESS', {
        index,
        path,
        classification: index === 0 ? 'canonical' : 'compat_fallback',
      });

      return response;
    } catch (error) {
      lastError = error;

      if (error instanceof ApiError && [404, 405, 422].includes(error.status)) {
        runtimeTrace('OPTIONAL_REQUEST_FALLBACK_TRIGGERED', {
          index,
          path,
          status: error.status,
          classification: index === 0 ? 'canonical_failure' : 'compat_fallback_failure',
        });

        continue;
      }

      runtimeTrace('OPTIONAL_REQUEST_ABORTED', {
        index,
        path,
        reason: error instanceof ApiError ? error.status : 'unknown_error',
      });

      throw error;
    }
  }

  if (lastError) {
    runtimeTrace('OPTIONAL_REQUEST_EXHAUSTED', {
      candidateCount: paths.length,
      candidatePaths: paths,
    });

    throw lastError;
  }

  throw new ApiError('No matching endpoint path succeeded', 500);
}

export async function downloadRequest(path: string, init?: RequestInit): Promise<Blob> {
  return apiRequest<Blob>(path, init);
}

export function buildListPath(path: string, params?: QueryParams): string {
  return buildUrl(path, params);
}

export function healthRequest<T = unknown>(): Promise<T> {
  return apiRequest<T>('/health');
}

export async function downloadUrlAsBlob(path: string, init?: RequestInit, retries = 0): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(buildBasePath(path), normalizeInit(init));
  if (response.status === 401 && retries < 1 && !isAuthPath(path)) {
    const refreshed = await tryRefreshSession().catch(() => false);
    if (refreshed) return downloadUrlAsBlob(path, init, retries + 1);
  }
  if (!response.ok) return parseResponse<never>(response);
  return { blob: await response.blob(), filename: filenameFromResponse(response) };
}

export async function openProtectedFile(path: string, fallbackName = 'download.pdf', init?: RequestInit): Promise<void> {
  const { blob, filename } = await downloadUrlAsBlob(path, init);
  const file = new File([blob], filename || fallbackName, { type: blob.type || 'application/octet-stream' });
  const url = URL.createObjectURL(file);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadUrlAsObjectUrl(
  path: string,
  init?: RequestInit,
  retries = 0,
): Promise<{ url: string; filename: string; contentType: string }> {
  const response = await fetch(buildBasePath(path), normalizeInit(init));
  if (response.status === 401 && retries < 1 && !isAuthPath(path)) {
    const refreshed = await tryRefreshSession().catch(() => false);
    if (refreshed) return downloadUrlAsObjectUrl(path, init, retries + 1);
  }
  if (!response.ok) return parseResponse<never>(response);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
    throw new ApiError('Geen PDF ontvangen', response.status, await response.text().catch(() => null));
  }
  const blob = await response.blob();
  return { url: URL.createObjectURL(blob), filename: filenameFromResponse(response, 'download.pdf'), contentType };
}

const client = {
  get: <T = unknown>(path: string, init?: RequestInit) => apiRequest<T>(path, { ...(init || {}), method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, { ...(init || {}), method: 'POST', body: isFormData(body) ? body : body === undefined ? undefined : JSON.stringify(body) }),
  put: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, { ...(init || {}), method: 'PUT', body: isFormData(body) ? body : body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, { ...(init || {}), method: 'PATCH', body: isFormData(body) ? body : body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T = unknown>(path: string, init?: RequestInit) => apiRequest<T>(path, { ...(init || {}), method: 'DELETE' }),
};

export default client;
