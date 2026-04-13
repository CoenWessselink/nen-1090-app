import { useAuthStore } from '@/app/store/auth-store';

const APP_LOGIN_PATH = '/login';

function buildLoginRedirect() {
  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const url = new URL(APP_LOGIN_PATH, window.location.origin);

  if (next && next !== '/login') {
    url.searchParams.set('next', next);
    url.searchParams.set('message', 'Log in om verder te werken in het platform.');
  }

  return url.toString();
}

function getBearerHeaders() {
  const state = useAuthStore.getState();
  const headers = {
    Accept: 'application/json',
  } as Record<string, string>;

  if (state.token && state.token !== '__cookie_session__') {
    headers.Authorization = `Bearer ${state.token}`;
  }

  return headers;
}

export async function checkAuth() {
  try {
    const apiBase =
      (import.meta?.env?.VITE_API_BASE_URL || 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net/api/v1')
        .replace(/\/+$/, '');

    const res = await fetch(`${apiBase}/auth/me`, {
      credentials: 'include',
      headers: getBearerHeaders(),
    });

    if (!res.ok) {
      window.location.href = buildLoginRedirect();
      return;
    }

    const data = await res.json();
    if (!data?.email) {
      window.location.href = buildLoginRedirect();
    }
  } catch {
    window.location.href = buildLoginRedirect();
  }
}
