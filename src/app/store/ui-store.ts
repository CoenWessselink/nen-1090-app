import { create } from 'zustand';

export type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read?: boolean;
};

type UiState = {
  sidebarOpen: boolean;
  globalSearch: string;
  commandPaletteOpen: boolean;
  notificationCenterOpen: boolean;
  notifications: NotificationItem[];
  toasts: NotificationItem[];
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setGlobalSearch: (value: string) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleNotificationCenter: () => void;
  closeNotificationCenter: () => void;
  pushNotification: (item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void;
  dismissToast: (id: string) => void;
  markNotificationRead: (id: string) => void;
};

const seed = () => new Date().toISOString();

const initialNotifications: NotificationItem[] = [
  {
    id: 'seed-1',
    title: 'Backend koppeling actief',
    description: 'Frontend gebruikt de bestaande API-configuratie en health-checks.',
    tone: 'success',
    createdAt: seed(),
    read: false,
  },
  {
    id: 'seed-2',
    title: 'Mobiele shell beschikbaar',
    description: 'Sidebar, topbar en bottom navigation zijn afgestemd op tablet en mobiel.',
    tone: 'info',
    createdAt: seed(),
    read: false,
  },
];

function createNotification(item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): NotificationItem {
  return {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    read: false,
  };
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  globalSearch: '',
  commandPaletteOpen: false,
  notificationCenterOpen: false,
  notifications: initialNotifications,
  toasts: [],
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setGlobalSearch: (value) => set({ globalSearch: value }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleNotificationCenter: () => set((state) => ({ notificationCenterOpen: !state.notificationCenterOpen })),
  closeNotificationCenter: () => set({ notificationCenterOpen: false }),
  pushNotification: (item) => set((state) => {
    const notification = createNotification(item);
    return {
      notifications: [notification, ...state.notifications],
      toasts: [notification, ...state.toasts].slice(0, 5),
    };
  }),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map((item) => item.id === id ? { ...item, read: true } : item),
    toasts: state.toasts.filter((item) => item.id !== id),
  })),
}));
