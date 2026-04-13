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

function clearLegacySession() {
  if (typeof window === 'undefined') return;

  for (const key of legacySessionKeys.accessTokens) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
  for (const key of legacySessionKeys.refreshTokens) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
  for (const key of legacySessionKeys.userKeys) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
  for (const key of legacySessionKeys.tenantKeys) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
  for (const key of legacySessionKeys.roleKeys) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
}

function persistLegacySession(token: string | null, user: SessionUser | null, refreshToken: string | null) {
  if (typeof window === 'undefined') return;

  if (!token || !user) {
    clearLegacySession();
    return;
  }

  const safeToken = token === cookieSessionMarker ? '' : token;

  for (const key of legacySessionKeys.accessTokens) {
    if (safeToken) {
      window.localStorage.setItem(key, safeToken);
      window.sessionStorage.setItem(key, safeToken);
    } else {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
  }

  for (const key of legacySessionKeys.refreshTokens) {
    if (refreshToken) {
      window.localStorage.setItem(key, refreshToken);
      window.sessionStorage.setItem(key, refreshToken);
    } else {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
  }

  const userPayload = JSON.stringify(user);
  for (const key of legacySessionKeys.userKeys) {
    window.localStorage.setItem(key, userPayload);
    window.sessionStorage.setItem(key, userPayload);
  }

  for (const key of legacySessionKeys.tenantKeys) {
    window.localStorage.setItem(key, user.tenant || '');
    window.sessionStorage.setItem(key, user.tenant || '');
  }

  for (const key of legacySessionKeys.roleKeys) {
    window.localStorage.setItem(key, user.role || '');
    window.sessionStorage.setItem(key, user.role || '');
  }
}

function loadLegacyState(): Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'> | null {
  if (typeof window === 'undefined') return null;

  const legacyToken =
    legacySessionKeys.accessTokens
      .map((key) => window.localStorage.getItem(key) || window.sessionStorage.getItem(key))
      .find((value) => typeof value === 'string' && value.trim().length > 0) || null;

  const legacyRefreshToken =
    legacySessionKeys.refreshTokens
      .map((key) => window.localStorage.getItem(key) || window.sessionStorage.getItem(key))
      .find((value) => typeof value === 'string' && value.trim().length > 0) || null;

  const rawUser =
    legacySessionKeys.userKeys
      .map((key) => window.localStorage.getItem(key) || window.sessionStorage.getItem(key))
      .find((value) => typeof value === 'string' && value.trim().length > 0) || null;

  if (!legacyToken || !rawUser) return null;

  try {
    const parsedUser = JSON.parse(rawUser) as SessionUser;
    if (!isValidSessionUser(parsedUser)) return null;
    return {
      token: legacyToken,
      refreshToken: legacyRefreshToken,
      user: parsedUser,
      impersonation: null,
    };
  } catch {
    return null;
  }
}

function loadInitialState(): Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'> {
  if (typeof window === 'undefined') {
    return { token: null, refreshToken: null, user: null, impersonation: null };
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return loadLegacyState() || { token: null, refreshToken: null, user: null, impersonation: null };
  }

  try {
    const parsed = JSON.parse(raw) as Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'>;

    if (!isSupportedToken(parsed.token) || !isValidSessionUser(parsed.user)) {
      window.localStorage.removeItem(storageKey);
      return loadLegacyState() || { token: null, refreshToken: null, user: null, impersonation: null };
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
    window.localStorage.removeItem(storageKey);
    return loadLegacyState() || { token: null, refreshToken: null, user: null, impersonation: null };
  }
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
