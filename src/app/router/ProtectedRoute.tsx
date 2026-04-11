import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/app/session/SessionContext';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation();
  const session = useSession();

  if (session.isBootstrapping) {
    return null;
  }

  if (!session.isAuthenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from, reason: 'Log in om verder te werken in het platform.' }} />;
  }

  return <>{children}</>;
}
