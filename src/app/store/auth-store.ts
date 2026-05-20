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
  setSession: (token: string | null, user: SessionUser, refreshToken?: string | null) => void;
  updateToken: (token: string | null) => void;
  startImpersonation: (token: string | null, user: SessionUser, originalUser: SessionUser) => void;
  stopImpersonation: () => void;
  clearSession: () => void;
};

export const cookieSessionMarker = '__cookie_session__';

const storageKey = 'nen1090.session';

const clientReadableCookieNames = [
  'nen1090_access_token',
  'nen1090_refresh_token',
  'nen1090_tenant',
  'nen1090_role',
  'nen1090_user',
];

const legacySessionKeys = {
  accessTokens: ['auth_token', 'access_token', 'token', 'nen1090_access_token'],
  refreshTokens: ['refresh_token', 'nen1090_refresh_token'],
  userKeys: ['auth_user', 'user', 'session_user'],
  tenantKeys: ['tenant', 'tenant_slug', 'active_tenant'],
  roleKeys: ['role', 'auth_role'],
};

function removeCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function clearPersistedSession() {
  if (typeof window === 'undefined') return;
  const storages: Storage[] = [window.localStorage, window.sessionStorage];
  for (const storage of storages) {
    storage.removeItem(storageKey);
    Object.values(legacySessionKeys).flat().forEach((key) => storage.removeItem(key));
  }
  clientReadableCookieNames.forEach(removeCookie);
}

function sanitizeSessionToken(token: string | null | undefined): string {
  return token ? cookieSessionMarker : cookieSessionMarker;
}

function persistSessionCleanupOnly() {
  // Security hardening: never persist access/refresh tokens or user profile data
  // in localStorage, sessionStorage or JavaScript-readable cookies. The backend
  // AuthCookieBridgeMiddleware sets HttpOnly cookies on login/refresh responses;
  // this store only keeps an in-memory marker so existing UI state can continue
  // to treat the user as authenticated until /auth/me validates the cookie.
  clearPersistedSession();
}

function loadInitialState(): Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'> {
  if (typeof window !== 'undefined') {
    clearPersistedSession();
  }
  return { token: null, refreshToken: null, user: null, impersonation: null };
}

export function readAnyPersistedSession(): {
  token: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
} {
  if (typeof window !== 'undefined') {
    clearPersistedSession();
  }
  return { token: null, refreshToken: null, user: null };
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitialState(),
  setSession: (token, user) => {
    persistSessionCleanupOnly();
    set({ token: sanitizeSessionToken(token), user, refreshToken: null, impersonation: null });
  },
  updateToken: (token) =>
    set(() => {
      persistSessionCleanupOnly();
      return { token: sanitizeSessionToken(token), refreshToken: null };
    }),
  startImpersonation: (token, user, originalUser) =>
    set(() => {
      const impersonation: ImpersonationState = {
        active: true,
        tenantId: user.tenantId,
        tenantName: user.tenant,
        originalUser,
      };
      persistSessionCleanupOnly();
      return { token: sanitizeSessionToken(token), user, refreshToken: null, impersonation };
    }),
  stopImpersonation: () =>
    set((state) => {
      const originalUser = state.impersonation?.originalUser || null;
      persistSessionCleanupOnly();
      return {
        token: originalUser ? cookieSessionMarker : null,
        user: originalUser,
        refreshToken: null,
        impersonation: null,
      };
    }),
  clearSession: () => {
    clearPersistedSession();
    set({ token: null, refreshToken: null, user: null, impersonation: null });
  },
}));
