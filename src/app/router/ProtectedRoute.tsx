import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/app/session/SessionContext';

function isLocalPreviewBypassEnabled() {
  if (typeof window === 'undefined') return false;
  // Playwright (and local strict runs) use 127.0.0.1 / localhost as baseURL; bypass would skip
  // login redirect and break auth-routing-smoke. Opt in to bypass only when this is unset.
  if (import.meta.env.VITE_STRICT_AUTH_LOCAL === 'true') return false;
  const host = window.location.hostname;
  return host === '127.0.0.1' || host === 'localhost';
}

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation();
  const session = useSession();

  if (isLocalPreviewBypassEnabled()) {
    return <>{children}</>;
  }

  if (session.isBootstrapping) {
    return (
      <div className="route-fallback" role="status" aria-live="polite" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        Sessie controleren…
      </div>
    );
  }

  if (!session.isAuthenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to="/login"
        replace
        state={{ from, reason: 'Log in om verder te werken in het platform.' }}
      />
    );
  }

  return <>{children}</>;
}
