import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/app/store/auth-store';

export function AppShell({ children }: { children: React.ReactNode }) {
  // Fix: auth-store heeft clearSession, niet logout
  const clearSession = useAuthStore((s) => s.clearSession);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
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
        // Safe-area fix: voorkomt dat header achter iPhone statusbalk valt
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
          alignItems: 'center',
          padding: '0 1.25rem',
          height: '56px',
          flexShrink: 0,
        }}
      >
        <Link
          to="/dashboard"
          style={{
            fontWeight: 500,
            fontSize: '15px',
            color: 'var(--color-text-primary)',
            textDecoration: 'none',
            marginRight: 'auto',
          }}
        >
          NEN-1090
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <NavLink to="/projecten"    label="Projecten"    current={location.pathname} />
          <NavLink to="/planning"     label="Planning"     current={location.pathname} />
          <NavLink to="/rapportage"   label="Rapportage"   current={location.pathname} />
          <NavLink to="/instellingen" label="Instellingen" current={location.pathname} />
          {user?.is_platform_admin && (
            <NavLink to="/superadmin" label="Platform" current={location.pathname} />
          )}
        </nav>

        <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user?.email && (
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {user.email}
            </span>
          )}
          <button
            onClick={handleLogout}
            style={{
              fontSize: '13px',
              padding: '4px 10px',
              border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            Uitloggen
          </button>
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'auto' }}>
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
        fontSize: '14px',
        padding: '6px 10px',
        borderRadius: 'var(--border-radius-md)',
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        fontWeight: isActive ? 500 : 400,
        background: isActive ? 'var(--color-background-secondary)' : 'transparent',
        textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  );
}

export default AppShell;
