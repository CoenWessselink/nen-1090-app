import { PropsWithChildren, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileTabbar } from '@/components/layout/MobileTabbar';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { ToastViewport } from '@/components/notifications/ToastViewport';
import { useUiStore } from '@/app/store/ui-store';

function findTenantIdFromSuperadminRow(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) return null;
  if (!window.location.pathname.startsWith('/superadmin')) return null;

  const row = target.closest('tr, [role="row"]');
  if (!row) return null;

  const idText = row.querySelector('.superadmin-cell-stack span')?.textContent?.trim() || '';
  if (!idText) return null;

  // Tenant ids are UUIDs in production. Keep this strict so unrelated rows are
  // never intercepted by the shell-level navigation guard.
  const uuidMatch = idText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return uuidMatch?.[0] || null;
}

export function AppShell({ children }: PropsWithChildren) {
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
      if (window.innerWidth < 1024) setSidebarOpen(false);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setSidebarOpen]);

  useEffect(() => {
    const openTenant360 = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;

      const tenantId = findTenantIdFromSuperadminRow(target);
      if (!tenantId) return;

      const clickedButton = target.closest('button');
      const buttonText = clickedButton?.textContent?.trim().toLowerCase() || '';
      const isPrimaryOpenAction = Boolean(clickedButton && (buttonText === 'open' || buttonText.includes('tenant 360')));
      const isRowDoubleClick = event.type === 'dblclick' && !clickedButton;

      if (!isPrimaryOpenAction && !isRowDoubleClick) return;

      event.preventDefault();
      event.stopPropagation();
      navigate(`/superadmin/tenant/${tenantId}/profile`);
    };

    document.addEventListener('click', openTenant360, true);
    document.addEventListener('dblclick', openTenant360, true);
    return () => {
      document.removeEventListener('click', openTenant360, true);
      document.removeEventListener('dblclick', openTenant360, true);
    };
  }, [navigate]);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={sidebarOpen} />
      <div className="shell-main">
        <Topbar />
        <main className="page-canvas">
          {children ?? <Outlet />}
        </main>
        <MobileTabbar />
      </div>
      <NotificationCenter />
      <ToastViewport />
    </div>
  );
}
