import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { readAnyPersistedSession } from '@/app/store/auth-store';
import { useSession } from '@/app/session/SessionContext';

function isLocalPreviewBypassEnabled() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === '127.0.0.1' || host === 'localhost';
}

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation();
  const session = useSession();
  const persisted = readAnyPersistedSession();
  const hasPersistedSession = Boolean(persisted.token && persisted.user);

  if (isLocalPreviewBypassEnabled()) {
    return <>{children}</>;
  }

  if (session.isBootstrapping) {
    return hasPersistedSession || session.isAuthenticated ? <>{children}</> : null;
  }

  if (!session.isAuthenticated && !hasPersistedSession) {
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
