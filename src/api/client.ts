import { runtimeTrace } from '@/utils/runtimeTracing';
import { env } from '@/lib/env';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  requestId?: string | null;

  constructor(message: string, status = 500, details?: unknown, requestId?: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

type Primitive = string | number | boolean;
type QueryValue = Primitive | null | undefined;
export type QueryParams = Record<string, QueryValue>;

const OPTIONAL_REQUEST_HARD_LIMIT = 2;
const API_REQUEST_TIMEOUT = 12_000;

function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function apiRoot(): string {
  return env.apiBaseUrl.replace(/\/+$/, '');
}

function buildBasePath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const root = apiRoot();

  if (path.startsWith('/api/v1')) {
    const rest = path.length > 8 ? path.slice(8) : '';
    const clean = rest.startsWith('/') ? rest.slice(1) : rest;
    return clean ? `${root}/${clean}` : `${root}/`;
  }

  if (path.startsWith('/api/')) {
    return path;
  }

  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  return trimmed ? `${root}/${trimmed}` : `${root}/`;
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers || {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (!headers.has('X-Request-Id')) {
    headers.set('X-Request-Id', newRequestId());
  }

  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

let refreshPromise: Promise<boolean> | null = null;

function classifyCompatPattern(path: string): void {
  const segments = path.split('/').map((s) => s.toLowerCase());
  const legacySegments = new Set(['legacy', 'compat', 'fallback']);
  const matchedSegment = segments.find((s) => legacySegments.has(s));

  if (!matchedSegment) {
    runtimeTrace('COMPAT_CLASS_A_CANONICAL', { path });
    return;
  }

  runtimeTrace('COMPAT_CLASS_B_LOW_TRAFFIC', {
    path,
    matchedPattern: matchedSegment,
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

    const requestId =
      response.headers.get('x-request-id') ||
      response.headers.get('X-Request-Id') ||
      response.headers.get('x-correlation-id') ||
      null;

    throw new ApiError(response.statusText || 'API request failed', response.status, details, requestId);
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
    refreshPromise = fetch(buildBasePath('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: (() => {
        const h = new Headers();
        h.set('X-Request-Id', newRequestId());
        return h;
      })(),
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, API_REQUEST_TIMEOUT);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
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
    fetchWithTimeout(buildBasePath(path), {
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
  const response = await fetchWithTimeout(env.healthUrl, {
    credentials: 'include',
    headers: buildHeaders(),
  });
  return parseResponse<T>(response);
}

export function buildListPath(path: string, params?: QueryParams): string {
  const resolved = buildBasePath(path);
  const url =
    resolved.startsWith('http://') || resolved.startsWith('https://')
      ? new URL(resolved)
      : new URL(resolved, window.location.origin);

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

/**
 * Try list endpoints in order. On ApiError with a status in skipStatuses, continue to the next path.
 * Returns null if every candidate failed with a skippable status (typical for optional compat routes).
 */
export async function firstSuccessfulListRequest<T = unknown>(
  paths: readonly string[],
  params?: QueryParams,
  options?: { skipStatuses?: readonly number[] },
): Promise<T | null> {
  const skip = new Set(options?.skipStatuses ?? [404, 405, 500, 501]);
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await listRequest<T>(path, params);
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && skip.has(error.status)) {
        continue;
      }
      throw error;
    }
  }

  if (lastError instanceof Error) {
    runtimeTrace('LIST_FALLBACK_ALL_SKIPPED', {
      paths: [...paths],
      message: lastError.message,
    });
  }

  return null;
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

export async function downloadUrlAsBlob(
  path: string,
  init?: RequestInit,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetchWithTimeout(buildBasePath(path), {
    credentials: 'include',
    ...init,
    headers: buildHeaders(init),
  });

  if (!response.ok) {
    const requestId =
      response.headers.get('x-request-id') ||
      response.headers.get('X-Request-Id') ||
      response.headers.get('x-correlation-id') ||
      null;
    throw new ApiError('Download failed', response.status, undefined, requestId);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);

  return {
    blob,
    filename: match?.[1] || 'download',
  };
}

export async function downloadUrlAsObjectUrl(
  path: string,
  init?: RequestInit,
): Promise<{ url: string; filename: string; contentType: string }> {
  const { blob, filename } = await downloadUrlAsBlob(path, init);

  return {
    url: URL.createObjectURL(blob),
    filename,
    contentType: blob.type || 'application/octet-stream',
  };
}

export async function openProtectedFile(
  path: string,
  fallbackName = 'download.pdf',
  init?: RequestInit,
): Promise<void> {
  const { url, filename } = await downloadUrlAsObjectUrl(path, init);
  const popup = window.open(url, '_blank', 'noopener,noreferrer');

  if (!popup) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
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
