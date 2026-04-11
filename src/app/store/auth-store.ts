import { create } from "zustand";

interface User {
  email: string;
  tenant?: string;
  tenantId?: string;
  role?: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setSession: (token: string, user: User, refreshToken?: string | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,

  setSession: (token, user, refreshToken) =>
    set({
      token,
      user,
      refreshToken: refreshToken || null,
    }),

  clearSession: () =>
    set({
      token: null,
      user: null,
      refreshToken: null,
    }),
}));
