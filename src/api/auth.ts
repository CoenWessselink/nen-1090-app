import { apiRequest } from '@/api/client';
import { env } from '@/lib/env';
import type { AuthRefreshResponse, ChangePasswordPayload, LoginPayload, LoginResponse, LogoutPayload } from '@/types/api';
import type { SessionUser } from '@/types/domain';

export function login(payload: LoginPayload) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMe() {
  return apiRequest<SessionUser>('/auth/me');
}

export function refreshSession(refreshToken: string) {
  return apiRequest<AuthRefreshResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export function requestPasswordReset(email: string, tenant?: string) {
  return apiRequest<{ ok?: boolean; message?: string }>('/auth/reset-password/request', {
    method: 'POST',
    body: JSON.stringify({ email, tenant }),
  });
}

export function confirmPasswordReset(payload: { token: string; password: string }) {
  return apiRequest<{ ok?: boolean; message?: string }>('/auth/reset-password/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload: ChangePasswordPayload) {
  return apiRequest<{ ok?: boolean; message?: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout(payload?: LogoutPayload) {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

export async function refreshCentralSession() {
  const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('CENTRAL_REFRESH_FAILED');
  }

  return (await response.json()) as AuthRefreshResponse;
}
