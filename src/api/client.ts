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

const STORAGE_KEY = 'nen1090.session';
const COOKIE_SESSION_MARKER = '__cookie_session__';

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\/\/?/i.test(path);
}

function buildBasePath(path: string): string {
  if (isAbsoluteUrl(path)) return path;
  if (path.startsWith('/api/')) return path;
  if (path.startsWith('/')) return `/api/v1${path}`;
  return `/api/v1/${path}`;
}

function buildUrl(path: string, params?: QueryParams): string {
  const raw = buildBasePath(path);
  if (!params || isAbsoluteUrl(raw)) return raw;

  const url = new URL(raw, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function readStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: unknown };
    if (typeof parsed.token !== 'string' || !parsed.token.trim()) return null;
    if (parsed.token === COOKIE_SESSION_MARKER) return null;
    return parsed.token;
  } catch {
    return null;
  }
}

function normalizeInit(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers || {});
  const next: RequestInit = {
    ...init,
    credentials: init?.credentials || 'include',
    headers,
  };

  const accessToken = readStoredAccessToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (init?.body && !isFormData(init.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
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

export async function apiRequest<T = unknown>(
  path: string,
  init?: RequestInit,
  _retries = 0,
  raw = false,
): Promise<T> {
  const response = await fetch(buildBasePath(path), normalizeInit(init));
  return parseResponse<T>(response, raw);
}

export async function listRequest<T = unknown>(
  path: string,
  params?: QueryParams,
): Promise<T> {
  return apiRequest<T>(buildUrl(path, params));
}

export async function optionalRequest<T = unknown>(
  paths: string[],
  init?: RequestInit,
): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await apiRequest<T>(path, init);
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && [404, 405].includes(error.status)) {
        continue;
      }
      throw error;
    }
  }

  if (lastError) throw lastError;
  throw new ApiError('No matching endpoint path succeeded', 500);
}

export async function downloadRequest(
  path: string,
  init?: RequestInit,
): Promise<Blob> {
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
  get: <T = unknown>(path: string, init?: RequestInit) =>
    apiRequest<T>(path, { ...(init || {}), method: 'GET' }),
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
  delete: <T = unknown>(path: string, init?: RequestInit) =>
    apiRequest<T>(path, { ...(init || {}), method: 'DELETE' }),
};

export default client;
