import { readAnyPersistedSession } from '@/app/store/auth-store';

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

export async function checkAuth() {
  const persisted = readAnyPersistedSession();
  if (!persisted.token || !persisted.user) {
    window.location.href = buildLoginRedirect();
  }
}
