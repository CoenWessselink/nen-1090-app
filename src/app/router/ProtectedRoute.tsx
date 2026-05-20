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

  // HttpOnly cookie auth cannot be inspected synchronously by JavaScript. Keep
  // rendering the requested route while /auth/me validates the cookie so direct
  // deep links such as CE report do not get stuck behind a blocking splash.
  if (session.isBootstrapping) {
    return <>{children}</>;
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
