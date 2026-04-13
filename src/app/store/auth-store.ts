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

  if (user) {
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

function readLegacyState(): Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'> | null {
  if (typeof window === 'undefined') return null;

  const fromLocal = loadFromWebStorage(window.localStorage);
  if (fromLocal?.token && fromLocal.user) {
    return { ...fromLocal, impersonation: null };
  }

  const fromSession = loadFromWebStorage(window.sessionStorage);
  if (fromSession?.token && fromSession.user) {
    return { ...fromSession, impersonation: null };
  }

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
}

function clearLegacySession() {
  if (typeof window === 'undefined') return;
  const storages: Storage[] = [window.localStorage, window.sessionStorage];
  for (const storage of storages) {
    Object.values(legacySessionKeys).flat().forEach((key) => storage.removeItem(key));
  }
}

function loadInitialState(): Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'> {
  if (typeof window === 'undefined') {
    return { token: null, refreshToken: null, user: null, impersonation: null };
  }

  const raw = window.localStorage.getItem(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'>;
      if (isSupportedToken(parsed.token) && isValidSessionUser(parsed.user)) {
        return {
          token: parsed.token,
          refreshToken:
            typeof parsed.refreshToken === 'string' && parsed.refreshToken.trim().length > 0
              ? parsed.refreshToken
              : null,
          user: parsed.user,
          impersonation: parsed.impersonation || null,
        };
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
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
    window.localStorage.removeItem(storageKey);
    clearLegacySession();
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      token: token === cookieSessionMarker ? cookieSessionMarker : token,
      refreshToken,
      user,
      impersonation,
    }),
  );

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
    persistSession(null, null, null, null);
    set({ token: null, refreshToken: null, user: null, impersonation: null });
  },
}));
