import { env } from '@/lib/env';
import { refreshCentralSession, refreshSession } from '@/api/auth';
import { useAuthStore } from '@/app/store/auth-store';
import { useApiStatusStore } from '@/app/store/api-status-store';
import { useUiStore } from '@/app/store/ui-store';
import type { ApiErrorPayload, ListParams } from '@/types/api';
import { buildQueryString, extractApiMessage } from '@/utils/api';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  code?: string;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.status = payload.status;
    this.details = payload.details;
    this.code = payload.code;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let details: unknown;
  try {
    details = await response.json();
  } catch {
    details = await response.text();
  }

  const detailMessage = extractApiMessage(details) || undefined;
  return new ApiError({
    message: detailMessage || `API fout (${response.status})`,
    status: response.status,
    details,
    code:
      typeof details === 'object' && details && 'code' in details
        ? String((details as { code?: unknown }).code)
        : undefined,
  });
}

let refreshInFlight: Promise<boolean> | null = null;

function isTenantSessionMismatch(error: ApiError): boolean {
  return (
    error.status === 403 &&
    /tenant header komt niet overeen met de sessie|tenant membership not found/i.test(error.message || '')
  );
}

function expireSession(message?: string) {
  const apiStatus = useApiStatusStore.getState();
  const alreadyExpired = apiStatus.sessionExpired;
  useAuthStore.getState().clearSession();
  apiStatus.markSessionExpired(message);
  if (!alreadyExpired) {
    useUiStore.getState().pushNotification({
      title: 'Sessie verlopen',
      description: message || 'Log opnieuw in om verder te werken in de frontend.',
      tone: 'warning',
    });
  }
}

async function tryRefreshToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const { refreshToken, user, setSession, clearSession } = useAuthStore.getState();

    try {
      const payload =
        refreshToken && refreshToken !== '__cookie_session__'
          ? await refreshSession(refreshToken)
          : await refreshCentralSession();
      if (!payload.access_token || !user) {
        clearSession();
        useApiStatusStore.getState().markSessionExpired(
          'Je sessie kon niet worden vernieuwd via de bestaande authflow.',
        );
        return false;
      }

      const refreshedUser = {
        email: payload.user?.email || user.email,
        tenant: payload.user?.tenant || user.tenant,
        tenantId: payload.user?.tenant_id || user.tenantId,
        role: payload.user?.role || user.role,
        name: payload.user?.name || user.name,
      };

      const nextToken =
        refreshToken && refreshToken !== '__cookie_session__' ? payload.access_token : '__cookie_session__';
      const nextRefreshToken =
        refreshToken && refreshToken !== '__cookie_session__' ? payload.refresh_token || refreshToken : null;
      setSession(nextToken, refreshedUser, nextRefreshToken);
      return true;
    } catch {
      clearSession();
      useApiStatusStore.getState().markSessionExpired(
        'Je sessie kon niet worden vernieuwd via de bestaande authflow.',
      );
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function buildHeaders(init?: RequestInit) {
  const token = useAuthStore.getState().token;
  const user = useAuthStore.getState().user;
  const headers = new Headers(init?.headers || {});
  headers.set('Accept', 'application/json');
  if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && token !== '__cookie_session__') headers.set('Authorization', `Bearer ${token}`);
  if (user?.tenantId) headers.set('X-Tenant-Id', String(user.tenantId));
  if (user?.tenant) headers.set('X-Tenant', String(user.tenant));
  return headers;
}

export function buildListPath(path: string, params?: ListParams): string {
  return `${path}${buildQueryString(params)}`;
}

export function resolveProjectScopedPath(
  projectId: string | number | null | undefined,
  scopedPath: string,
  fallbackPath: string,
): string {
  return projectId !== undefined && projectId !== null && projectId !== '' ? scopedPath : fallbackPath;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  retryCount = 0,
  suppressHandledStatus = false,
): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: buildHeaders(init),
  });

  const isAuthRefreshCall = path.endsWith('/auth/refresh');
  const isAuthTerminalCall = path.endsWith('/auth/logout') || path.endsWith('/auth/change-password');

  if (response.status === 401 && retryCount === 0 && !isAuthRefreshCall && !isAuthTerminalCall) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return apiRequest<T>(path, init, 1, suppressHandledStatus);
  }

  if ([502, 503, 504].includes(response.status) && retryCount < 2) {
    await new Promise((resolve) => setTimeout(resolve, 300 * (retryCount + 1)));
    return apiRequest<T>(path, init, retryCount + 1, suppressHandledStatus);
  }

  if (!response.ok) {
    const error = await parseError(response);
    const isSilencedFallbackStatus = suppressHandledStatus && [404, 405].includes(response.status);

    if (response.status === 401 && !isAuthTerminalCall) {
      expireSession();
    } else if (isTenantSessionMismatch(error)) {
      expireSession('Je sessie hoort niet meer bij de actieve tenant. Log opnieuw in.');
    } else if (!isSilencedFallbackStatus) {
      useApiStatusStore.getState().markError(error.message, error.status);
    }

    throw error;
  }

  useApiStatusStore.getState().markSuccess();
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return (await response.json()) as T;
  return (await response.text()) as T;
}

export async function listRequest<T>(path: string, params?: ListParams): Promise<T> {
  return apiRequest<T>(buildListPath(path, params));
}

export async function optionalRequest<T>(paths: string[], init?: RequestInit): Promise<T | null> {
  for (const path of paths) {
    try {
      return await apiRequest<T>(path, init, 0, true);
    } catch (error) {
      if (error instanceof ApiError && [404, 405].includes(error.status)) continue;
      throw error;
    }
  }
  return null;
}

export async function healthRequest<T>(): Promise<T> {
  const response = await fetch(env.healthUrl, { credentials: 'include' });
  if (!response.ok) {
    const error = await parseError(response);
    useApiStatusStore.getState().markError(error.message, error.status);
    throw error;
  }
  return (await response.json()) as T;
}

export async function uploadRequest<T>(path: string, payload: FormData): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body: payload });
}

export async function downloadRequest(path: string): Promise<Blob> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    credentials: 'include',
    headers: buildHeaders(),
  });
  if (!response.ok) throw await parseError(response);
  return await response.blob();
}
