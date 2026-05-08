import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/app/store/auth-store';

export function AppShell({ children }: { children: React.ReactNode }) {
  const clearSession = useAuthStore((s) => s.clearSession);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // best-effort
    }

    clearSession();
    navigate('/login');
  };

  return (
    <div
      className="app-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        background: 'var(--color-background-primary)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <header
        className="app-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--color-background-primary)',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          minHeight: '56px',
          flexShrink: 0,
          overflowX: 'hidden',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Link
          to="/dashboard"
          style={{
            fontWeight: 600,
            fontSize: '15px',
            color: 'var(--color-text-primary)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          WeldInspect Pro
        </Link>

        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            flex: '1 1 320px',
            minWidth: 0,
            paddingBottom: '0.125rem',
          }}
        >
          <NavLink to="/projecten" label="Projecten" current={location.pathname} />
          <NavLink to="/planning" label="Planning" current={location.pathname} />
          <NavLink to="/rapportage" label="Rapportage" current={location.pathname} />
          <NavLink to="/instellingen" label="Instellingen" current={location.pathname} />
          {user?.is_platform_admin && (
            <NavLink to="/superadmin" label="Platform" current={location.pathname} />
          )}
        </nav>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            flexWrap: 'wrap',
            maxWidth: '100%',
          }}
        >
          {user?.email && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '180px',
              }}
            >
              {user.email}
            </span>
          )}

          <button
            onClick={handleLogout}
            style={{
              fontSize: '13px',
              padding: '6px 12px',
              border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Uitloggen
          </button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          overflowX: 'hidden',
          overflowY: 'auto',
          width: '100%',
          maxWidth: '100vw',
        }}
      >
        {children}
      </main>
    </div>
  );
}

function NavLink({ to, label, current }: { to: string; label: string; current: string }) {
  const isActive = current.startsWith(to);

  return (
    <Link
      to={to}
      style={{
        fontSize: '13px',
        padding: '7px 10px',
        borderRadius: 'var(--border-radius-md)',
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        fontWeight: isActive ? 600 : 400,
        background: isActive ? 'var(--color-background-secondary)' : 'transparent',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </Link>
  );
}

export default AppShell;
