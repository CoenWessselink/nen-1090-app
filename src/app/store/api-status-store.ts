import { create } from 'zustand';

type ApiStatusState = {
  degraded: boolean;
  lastMessage: string | null;
  lastStatus: number | null;
  lastUpdatedAt: string | null;
  sessionExpired: boolean;
  markSuccess: () => void;
  markError: (message: string, status?: number | null) => void;
  markSessionExpired: (message?: string) => void;
  clearSessionExpired: () => void;
};

export const useApiStatusStore = create<ApiStatusState>((set) => ({
  degraded: false,
  lastMessage: null,
  lastStatus: null,
  lastUpdatedAt: null,
  sessionExpired: false,
  markSuccess: () => set((state) => ({
    degraded: false,
    lastStatus: state.lastStatus,
    lastMessage: state.lastMessage,
    lastUpdatedAt: new Date().toISOString(),
  })),
  markError: (message, status = null) => set({
    degraded: true,
    lastMessage: message,
    lastStatus: status,
    lastUpdatedAt: new Date().toISOString(),
  }),
  markSessionExpired: (message = 'Je sessie is verlopen. Log opnieuw in om verder te gaan.') => set({
    degraded: true,
    sessionExpired: true,
    lastMessage: message,
    lastStatus: 401,
    lastUpdatedAt: new Date().toISOString(),
  }),
  clearSessionExpired: () => set({ sessionExpired: false }),
}));
