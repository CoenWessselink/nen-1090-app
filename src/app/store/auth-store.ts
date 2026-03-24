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

function isValidSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Record<string, unknown>;
  return typeof user.email === 'string' && typeof user.tenant === 'string';
}

function isSupportedToken(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function loadInitialState(): Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'> {
  if (typeof window === 'undefined') return { token: null, refreshToken: null, user: null, impersonation: null };

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return { token: null, refreshToken: null, user: null, impersonation: null };

  try {
    const parsed = JSON.parse(raw) as Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'>;

    if (!isSupportedToken(parsed.token) || !isValidSessionUser(parsed.user)) {
      window.localStorage.removeItem(storageKey);
      return { token: null, refreshToken: null, user: null, impersonation: null };
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
    return { token: null, refreshToken: null, user: null, impersonation: null };
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
