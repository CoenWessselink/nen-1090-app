import { PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '@/app/session/SessionContext';
import { buildAppReturnTo, redirectToMarketing } from '@/features/auth/marketing-auth';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation();
  const session = useSession();

  if (session.isBootstrapping) {
    return null;
  }

  if (!session.isAuthenticated) {
    const from = buildAppReturnTo(`${location.pathname}${location.search}${location.hash}`);
    redirectToMarketing('login', { next: from, reason: 'Log in om verder te werken in het platform.' });
    return null;
  }

  return <>{children}</>;
}
