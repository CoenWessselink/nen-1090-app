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

function traceCompatPathUsage(path: string): void {
  const matchedPattern = LEGACY_COMPAT_PATTERNS.find((pattern) => path.includes(pattern));

  if (!matchedPattern) {
    runtimeTrace('CANONICAL_RUNTIME_PATH_USED', {
      path,
    });

    return;
  }

  runtimeTrace('LEGACY_COMPAT_PATH_DETECTED', {
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

export async function apiRequest<T = unknown>(
  path: string,
  init?: RequestInit,
  ...legacyArgs: unknown[]
): Promise<T> {
  traceCompatPathUsage(path);

  if (legacyArgs.length > 0) {
    runtimeTrace('LEGACY_APIREQUEST_SIGNATURE_USED', {
      path,
      legacyArgumentCount: legacyArgs.length,
    });
  }

  const response = await fetch(buildBasePath(path), {
    credentials: 'include',
    ...init,
    headers: buildHeaders(init),
  });

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

  if (paths.length === 1) {
    runtimeTrace('OPTIONAL_REQUEST_RETIREMENT_READY', {
      canonicalPath: paths[0],
      fallbackCount: 0,
    });
  }

  if (paths.length > 2) {
    runtimeTrace('OPTIONAL_REQUEST_HIGH_COMPAT_CHAIN', {
      candidateCount: paths.length,
      candidatePaths: paths,
    });
  }

  let lastError: unknown = null;

  for (const [index, path] of paths.entries()) {
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
  runtimeTrace('DOWNLOAD_ALIAS_RETIREMENT_CANDIDATE_CHECK', {
    alias: 'downloadUrlAsBlobUrl',
    path,
  });

  const response = await fetch(buildBasePath(path), {
    credentials: 'include',
    ...init,
    headers: buildHeaders(init),
  });

  if (!response.ok) {
    throw new ApiError('Download failed', response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);

  runtimeTrace('DOWNLOAD_BLOB_RUNTIME_USED', {
    path,
  });

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

  runtimeTrace('OBJECT_URL_RUNTIME_CREATED', {
    path,
  });

  return {
    url: URL.createObjectURL(blob),
    filename,
    contentType: blob.type || 'application/octet-stream',
  };
}

export const downloadUrlAsBlobUrl = downloadUrlAsObjectUrl;

export async function openProtectedFile(
  path: string,
  fallbackName = 'download.pdf',
  init?: RequestInit,
): Promise<void> {
  const { url, filename } = await downloadUrlAsObjectUrl(path, init);
  const popup = window.open(url, '_blank', 'noopener,noreferrer');

  if (!popup) {
    runtimeTrace('PROTECTED_FILE_POPUP_FALLBACK_USED', {
      path,
    });

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
