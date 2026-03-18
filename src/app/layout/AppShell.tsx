import { PropsWithChildren, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileTabbar } from '@/components/layout/MobileTabbar';
import { CommandPalette } from '@/components/search/CommandPalette';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { ToastViewport } from '@/components/notifications/ToastViewport';
import { useUiStore } from '@/app/store/ui-store';
import { SystemBanners } from '@/components/layout/SystemBanners';

export function AppShell({ children }: PropsWithChildren) {
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
      if (window.innerWidth < 1024) setSidebarOpen(false);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setSidebarOpen]);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={sidebarOpen} />
      <div className="shell-main">
        <Topbar />
        <main className="page-canvas">
          <SystemBanners />
          {children ?? <Outlet />}
        </main>
        <MobileTabbar />
      </div>
      <CommandPalette />
      <NotificationCenter />
      <ToastViewport />
    </div>
  );
}
