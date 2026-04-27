type Primitive = string | number | boolean;
type QueryValue = Primitive | null | undefined;

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

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/api/')) return path;
  if (path.startsWith('/')) return `/api/v1${path}`;
  return `/api/v1/${path}`;
}

function authHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers || {});
  const token =
    window.localStorage.getItem('auth_token') ||
    window.localStorage.getItem('access_token') ||
    window.localStorage.getItem('token');

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let details: unknown = null;
    try {
      const contentType = response.headers.get('content-type') || '';
      details = contentType.includes('application/json') ? await response.json() : await response.text();
    } catch {
      details = null;
    }
    throw new ApiError(response.statusText || 'API request failed', response.status, details);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

export async function apiRequest<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: authHeaders(init),
    credentials: 'include',
  });

  if (response.status === 401) {
    window.localStorage.removeItem('auth_token');
  }

  return parseResponse<T>(response);
}

const apiClient = {
  get: <T = unknown>(path: string, init?: RequestInit) =>
    apiRequest<T>(path, { ...(init || {}), method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, {
      ...(init || {}),
      method: 'POST',
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, {
      ...(init || {}),
      method: 'PUT',
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiRequest<T>(path, {
      ...(init || {}),
      method: 'PATCH',
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T = unknown>(path: string, init?: RequestInit) =>
    apiRequest<T>(path, { ...(init || {}), method: 'DELETE' }),
};

export default apiClient;
