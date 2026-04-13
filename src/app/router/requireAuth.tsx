import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/app/session/SessionContext';

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const session = useSession();
  const location = useLocation();

  if (session.isBootstrapping) {
    return <div data-testid="auth-loading">Loading...</div>;
  }

  if (!session.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
