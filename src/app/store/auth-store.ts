import { create } from 'zustand';
import type { SessionUser } from '@/types/domain';

type ImpersonationState = {
  active: boolean;
  tenantId?: string | number;
  tenantName?: string;
  originalUser?: SessionUser | null;
};

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  impersonation: ImpersonationState | null;
  setSession: (token: string, user: SessionUser, refreshToken?: string | null) => void;
  updateToken: (token: string) => void;
  startImpersonation: (token: string, user: SessionUser, originalUser: SessionUser) => void;
  stopImpersonation: () => void;
  clearSession: () => void;
};

const storageKey = 'nen1090.session';
const cookieSessionMarker = '__cookie_session__';

const legacySessionKeys = {
  accessTokens: ['auth_token', 'access_token', 'token'],
  refreshTokens: ['refresh_token'],
  userKeys: ['auth_user', 'user', 'session_user'],
  tenantKeys: ['tenant', 'tenant_slug', 'active_tenant'],
  roleKeys: ['role', 'auth_role'],
};

function isValidSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Record<string, unknown>;
  return typeof user.email === 'string' && typeof user.tenant === 'string';
}

function isSupportedToken(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    return isValidSessionUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const found = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));
  if (!found) return null;
  return decodeURIComponent(found.slice(prefix.length));
}

function removeCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

const cookieNames = {
  token: 'nen1090_access_token',
  refreshToken: 'nen1090_refresh_token',
  tenant: 'nen1090_tenant',
  role: 'nen1090_role',
  user: 'nen1090_user',
};

function loadCanonicalStateFromStorage(storage: Storage) {
  const raw = storage.getItem(storageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'>;
    if (!isSupportedToken(parsed.token) || !isValidSessionUser(parsed.user)) {
      return null;
    }

    return {
      token: parsed.token,
      refreshToken:
        typeof parsed.refreshToken === 'string' && parsed.refreshToken.trim().length > 0
          ? parsed.refreshToken
          : null,
      user: parsed.user,
      impersonation: parsed.impersonation || null,
    };
  } catch {
    return null;
  }
}

function loadFromWebStorage(storage: Storage) {
  const token =
    legacySessionKeys.accessTokens
      .map((key) => storage.getItem(key))
      .find((value) => typeof value === 'string' && value.trim().length > 0) || null;

  const refreshToken =
    legacySessionKeys.refreshTokens
      .map((key) => storage.getItem(key))
      .find((value) => typeof value === 'string' && value.trim().length > 0) || null;

  const user =
    legacySessionKeys.userKeys
      .map((key) => parseUser(storage.getItem(key)))
      .find((value) => value !== null) || null;

  const tenant =
    legacySessionKeys.tenantKeys
      .map((key) => storage.getItem(key))
      .find((value) => typeof value === 'string' && value.trim().length > 0) || '';

  const role =
    legacySessionKeys.roleKeys
      .map((key) => storage.getItem(key))
      .find((value) => typeof value === 'string' && value.trim().length > 0) || '';

  if (user && token) {
    return {
      token,
      refreshToken,
      user: {
        ...user,
        tenant: user.tenant || tenant,
        role: user.role || role,
      },
    };
  }

  return null;
}

function loadFromCookies() {
  if (typeof document === 'undefined') return null;

  const token = getCookie(cookieNames.token);
  const refreshToken = getCookie(cookieNames.refreshToken);
  const user = parseUser(getCookie(cookieNames.user));
  const tenant = getCookie(cookieNames.tenant) || '';
  const role = getCookie(cookieNames.role) || '';

  if (!token || !user) return null;

  return {
    token,
    refreshToken,
    user: {
      ...user,
      tenant: user.tenant || tenant,
      role: user.role || role,
    },
    impersonation: null,
  };
}

function readLegacyState(): Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'> | null {
  if (typeof window === 'undefined') return null;

  const canonicalLocal = loadCanonicalStateFromStorage(window.localStorage);
  if (canonicalLocal?.token && canonicalLocal.user) return canonicalLocal;

  const canonicalSession = loadCanonicalStateFromStorage(window.sessionStorage);
  if (canonicalSession?.token && canonicalSession.user) return canonicalSession;

  const fromLocal = loadFromWebStorage(window.localStorage);
  if (fromLocal?.token && fromLocal.user) return { ...fromLocal, impersonation: null };

  const fromSession = loadFromWebStorage(window.sessionStorage);
  if (fromSession?.token && fromSession.user) return { ...fromSession, impersonation: null };

  const fromCookies = loadFromCookies();
  if (fromCookies?.token && fromCookies.user) return fromCookies;

  return null;
}

function persistLegacySession(token: string | null, user: SessionUser | null, refreshToken: string | null) {
  if (typeof window === 'undefined') return;

  const safeToken = token === cookieSessionMarker ? '' : token || '';
  const storages: Storage[] = [window.localStorage, window.sessionStorage];

  for (const storage of storages) {
    for (const key of legacySessionKeys.accessTokens) {
      if (safeToken) storage.setItem(key, safeToken);
      else storage.removeItem(key);
    }

    for (const key of legacySessionKeys.refreshTokens) {
      if (refreshToken) storage.setItem(key, refreshToken);
      else storage.removeItem(key);
    }

    for (const key of legacySessionKeys.userKeys) {
      if (user) storage.setItem(key, JSON.stringify(user));
      else storage.removeItem(key);
    }

    for (const key of legacySessionKeys.tenantKeys) {
      if (user?.tenant) storage.setItem(key, user.tenant);
      else storage.removeItem(key);
    }

    for (const key of legacySessionKeys.roleKeys) {
      if (user?.role) storage.setItem(key, user.role);
      else storage.removeItem(key);
    }
  }

  if (safeToken) setCookie(cookieNames.token, safeToken);
  else removeCookie(cookieNames.token);

  if (refreshToken) setCookie(cookieNames.refreshToken, refreshToken);
  else removeCookie(cookieNames.refreshToken);

  if (user) {
    setCookie(cookieNames.user, JSON.stringify(user));
    setCookie(cookieNames.tenant, user.tenant || '');
    setCookie(cookieNames.role, user.role || '');
  } else {
    removeCookie(cookieNames.user);
    removeCookie(cookieNames.tenant);
    removeCookie(cookieNames.role);
  }
}

function clearLegacySession() {
  if (typeof window === 'undefined') return;
  const storages: Storage[] = [window.localStorage, window.sessionStorage];
  for (const storage of storages) {
    storage.removeItem(storageKey);
    Object.values(legacySessionKeys).flat().forEach((key) => storage.removeItem(key));
  }

  removeCookie(cookieNames.token);
  removeCookie(cookieNames.refreshToken);
  removeCookie(cookieNames.user);
  removeCookie(cookieNames.tenant);
  removeCookie(cookieNames.role);
}

function loadInitialState(): Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'> {
  if (typeof window === 'undefined') {
    return { token: null, refreshToken: null, user: null, impersonation: null };
  }

  return readLegacyState() || { token: null, refreshToken: null, user: null, impersonation: null };
}

function persistSession(
  token: string | null,
  user: SessionUser | null,
  refreshToken: string | null,
  impersonation: ImpersonationState | null,
) {
  if (typeof window === 'undefined') return;

  if (!token || !user) {
    clearLegacySession();
    return;
  }

  const payload = JSON.stringify({
    token: token === cookieSessionMarker ? cookieSessionMarker : token,
    refreshToken,
    user,
    impersonation,
  });

  window.localStorage.setItem(storageKey, payload);
  window.sessionStorage.setItem(storageKey, payload);
  persistLegacySession(token, user, refreshToken);
}

export function readAnyPersistedSession(): {
  token: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
} {
  const state = loadInitialState();
  return {
    token: state.token,
    refreshToken: state.refreshToken,
    user: state.user,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitialState(),
  setSession: (token, user, refreshToken = null) => {
    persistSession(token, user, refreshToken, null);
    set({ token, user, refreshToken, impersonation: null });
  },
  updateToken: (token) =>
    set((state) => {
      persistSession(token, state.user, state.refreshToken, state.impersonation);
      return { token };
    }),
  startImpersonation: (token, user, originalUser) =>
    set((state) => {
      const impersonation: ImpersonationState = {
        active: true,
        tenantId: user.tenantId,
        tenantName: user.tenant,
        originalUser,
      };
      persistSession(token, user, state.refreshToken, impersonation);
      return { token, user, impersonation };
    }),
  stopImpersonation: () =>
    set((state) => {
      const originalUser = state.impersonation?.originalUser || null;
      persistSession(state.token, originalUser, state.refreshToken, null);
      return { user: originalUser, impersonation: null };
    }),
  clearSession: () => {
    clearLegacySession();
    set({ token: null, refreshToken: null, user: null, impersonation: null });
  },
}));
