import { NavLink } from 'react-router-dom';
import { appRouteMeta } from '@/app/router/routes';
import { env } from '@/lib/env';
import { cn } from '@/utils/cn';
import { useSession } from '@/app/session/SessionContext';
import { useUiStore } from '@/app/store/ui-store';

export function Sidebar({ mobileOpen }: { mobileOpen: boolean }) {
  const session = useSession();
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const visibleItems = appRouteMeta.filter((item) => item.showInSidebar && (!item.roles || session.hasRole(item.roles)));

  return (
    <>
      <div className={cn('sidebar-backdrop', mobileOpen && 'sidebar-backdrop-open')} onClick={() => setSidebarOpen(false)} aria-hidden={!mobileOpen} />
      <aside className={cn('sidebar', mobileOpen && 'sidebar-mobile-open')}>
        <div className="sidebar-brand">
          <div className="brand-mark">CWS</div>
          <div>
            <div className="brand-title">{env.appName}</div>
            <div className="brand-subtitle">Enterprise frontend</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn('sidebar-link', isActive && 'sidebar-link-active')}
                onClick={() => {
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
              >
                {Icon ? <Icon size={18} /> : null}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
