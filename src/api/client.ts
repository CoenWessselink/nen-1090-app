import { runtimeTrace } from '@/utils/runtimeTracing';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type Primitive = string | number | boolean;
type QueryValue = Primitive | null | undefined;
export type QueryParams = Record<string, QueryValue>;

const LEGACY_COMPAT_PATTERNS = ['/legacy', '/compat', '/fallback', '/v1'];
const OPTIONAL_REQUEST_HARD_LIMIT = 2;

let refreshPromise: Promise<boolean> | null = null;

function buildBasePath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (path.startsWith('/api/')) {
    return path;
  }

  if (path.startsWith('/')) {
    return `/api/v1${path}`;
  }

  return `/api/v1/${path}`;
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers || {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

function classifyCompatPattern(path: string): void {
  const matchedPattern = LEGACY_COMPAT_PATTERNS.find((pattern) => path.includes(pattern));

  if (!matchedPattern) {
    runtimeTrace('COMPAT_CLASS_A_CANONICAL', {
      path,
    });

    return;
  }

  if (matchedPattern === '/legacy' || matchedPattern === '/fallback') {
    runtimeTrace('COMPAT_CLASS_C_RETIREMENT_CANDIDATE', {
      path,
      matchedPattern,
    });

    return;
  }

  runtimeTrace('COMPAT_CLASS_B_LOW_TRAFFIC', {
    path,
    matchedPattern,
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let details: unknown = null;

    try {
      details = await response.clone().json();
    } catch {
      try {
        details = await response.text();
      } catch {
        details = null;
      }
    }

    throw new ApiError(response.statusText || 'API request failed', response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

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

async function refreshAuth(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest<T = unknown>(
  path: string,
  init?: RequestInit,
  ...legacyArgs: unknown[]
): Promise<T> {
  classifyCompatPattern(path);

  if (legacyArgs.length > 0) {
    runtimeTrace('DEPRECATED_VARIADIC_APIREQUEST_SIGNATURE_USED', {
      path,
      legacyArgumentCount: legacyArgs.length,
      replacement: 'apiRequest(path, init)',
    });
  }

  const executeRequest = () =>
    fetch(buildBasePath(path), {
      credentials: 'include',
      ...init,
      headers: buildHeaders(init),
    });

  let response = await executeRequest();

  if (response.status === 401 && !path.includes('/auth/')) {
    runtimeTrace('AUTH_REFRESH_RETRY_TRIGGERED', {
      path,
    });

    const refreshed = await refreshAuth();

    if (refreshed) {
      response = await executeRequest();
    }
  }

  return parseResponse<T>(response);
}

export async function healthRequest<T = unknown>(): Promise<T> {
  return apiRequest<T>('/health');
}

export function buildListPath(path: string, params?: QueryParams): string {
  const url = new URL(buildBasePath(path), window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return `${url.pathname}${url.search}`;
}

export async function listRequest<T = unknown>(path: string, params?: QueryParams): Promise<T> {
  return apiRequest<T>(buildListPath(path, params));
}

export async function optionalRequest<T = unknown>(paths: string[], init?: RequestInit): Promise<T> {
  runtimeTrace('OPTIONAL_REQUEST_STARTED', {
    candidateCount: paths.length,
    canonicalPath: paths[0] || null,
  });

  const normalizedPaths =
    paths.length > OPTIONAL_REQUEST_HARD_LIMIT
      ? paths.slice(0, OPTIONAL_REQUEST_HARD_LIMIT)
      : paths;

  if (paths.length > OPTIONAL_REQUEST_HARD_LIMIT) {
    runtimeTrace('OPTIONAL_REQUEST_HARD_LIMIT_TRUNCATED', {
      originalCandidateCount: paths.length,
      truncatedCandidateCount: normalizedPaths.length,
      originalCandidatePaths: paths,
      effectiveCandidatePaths: normalizedPaths,
      enforcedMaximum: OPTIONAL_REQUEST_HARD_LIMIT,
    });
  }

  if (normalizedPaths.length === 1) {
    runtimeTrace('OPTIONAL_REQUEST_RETIREMENT_READY', {
      canonicalPath: normalizedPaths[0],
      fallbackCount: 0,
    });
  }

  let lastError: unknown = null;

  for (const [index, path] of normalizedPaths.entries()) {
    try {
      const result = await apiRequest<T>(path, init);

      runtimeTrace(index === 0 ? 'OPTIONAL_REQUEST_CANONICAL_SUCCESS' : 'OPTIONAL_REQUEST_FALLBACK_SUCCESS', {
        path,
        index,
      });

      return result;
    } catch (error) {
      lastError = error;

      runtimeTrace('OPTIONAL_REQUEST_FALLBACK_TRIGGERED', {
        path,
        index,
      });
    }
  }

  throw lastError instanceof Error ? lastError : new ApiError('No optional request succeeded');
}

export async function downloadRequest(path: string, init?: RequestInit): Promise<Blob> {
  return apiRequest<Blob>(path, init);
}

const client = {
  get: <T = unknown>(path: string, init?: RequestInit) => apiRequest<T>(path, { ...init, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, {
      ...init,
      method: 'POST',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  put: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, {
      ...init,
      method: 'PUT',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  patch: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, {
      ...init,
      method: 'PATCH',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = unknown>(path: string, init?: RequestInit) =>
    apiRequest<T>(path, { ...init, method: 'DELETE' }),
};

export default client;
