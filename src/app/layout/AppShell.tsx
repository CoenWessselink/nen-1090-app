import { PropsWithChildren, Suspense, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SiteNavbar } from '@/components/layout/SiteNavbar';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { ToastViewport } from '@/components/notifications/ToastViewport';

function findTenantIdFromSuperadminRow(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) return null;
  if (!window.location.pathname.startsWith('/superadmin')) return null;

  const row = target.closest('tr, [role="row"]');
  if (!row) return null;

  const idText = row.querySelector('.superadmin-cell-stack span')?.textContent?.trim() || '';
  if (!idText) return null;

  const uuidMatch = idText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return uuidMatch?.[0] || null;
}

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();

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
    <div className="app-shell app-shell-navbar">
      <SiteNavbar variant="app" />
      <div className="page-canvas" data-testid="app-main">
        {children ?? (
          <Suspense
            fallback={
              <div className="route-fallback" role="status" aria-live="polite" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                Laden…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        )}
      </div>
      <NotificationCenter />
      <ToastViewport />
    </div>
  );
}
