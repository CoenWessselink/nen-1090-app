import { create } from 'zustand';

export type SessionUser = {
  email: string;
  tenant: string;
  tenantId: string;
  role: string;
  name: string;
};

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  impersonation: {
    active: boolean;
    tenantId?: string;
    tenantName?: string;
  } | null;
  setSession: (token: string, user: SessionUser, refreshToken?: string | null) => void;
  updateToken: (token: string) => void;
  clearSession: () => void;
};

const STORAGE_KEY = 'nen1090.auth';

function loadPersistedState(): Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { token: null, refreshToken: null, user: null, impersonation: null };
    }
    const parsed = JSON.parse(raw);
    return {
      token: parsed?.token || null,
      refreshToken: parsed?.refreshToken || null,
      user: parsed?.user || null,
      impersonation: parsed?.impersonation || null,
    };
  } catch {
    return { token: null, refreshToken: null, user: null, impersonation: null };
  }
}

function persistState(state: Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'impersonation'>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage write failures
  }
}

const initial = typeof window !== 'undefined'
  ? loadPersistedState()
  : { token: null, refreshToken: null, user: null, impersonation: null };

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initial.token,
  refreshToken: initial.refreshToken,
  user: initial.user,
  impersonation: initial.impersonation,

  setSession: (token, user, refreshToken = null) => {
    const next = {
      token,
      refreshToken,
      user,
      impersonation: null,
    };
    persistState(next);
    set(next);
  },

  updateToken: (token) => {
    const current = get();
    const next = {
      token,
      refreshToken: current.refreshToken,
      user: current.user,
      impersonation: current.impersonation,
    };
    persistState(next);
    set({ token });
  },

  clearSession: () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    set({
      token: null,
      refreshToken: null,
      user: null,
      impersonation: null,
    });
  },
}));
