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

  const mayAccess = session.isAuthenticated || hasPersistedSession;

  // Never render null while bootstrapping: without a session gate we redirect to login
  // immediately so URL and DOM match (e2e + avoids blank flash on /dashboard).
  if (!mayAccess) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to="/login"
        replace
        state={{ from, reason: 'Log in om verder te werken in het platform.' }}
      />
    );
  }

  // Session or persisted credentials present: allow shell while bootstrap validates / refreshes.
  return <>{children}</>;
}
