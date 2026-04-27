import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession, type AccessPermission } from '@/app/session/SessionContext';
import type { Role } from '@/types/domain';

function isLocalPreviewBypassEnabled() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === '127.0.0.1' || host === 'localhost';
}

export function RoleGuard({
  allow,
  permission,
  children,
  fallbackPath = '/dashboard',
}: PropsWithChildren<{ allow?: Array<Role | string>; permission?: AccessPermission; fallbackPath?: string }>) {
  const session = useSession();

  if (isLocalPreviewBypassEnabled()) {
    return <>{children}</>;
  }

  const roleAllowed = !allow || allow.length === 0 || session.hasRole(allow);
  const permissionAllowed = !permission || session.hasPermission(permission);

  if (!roleAllowed || !permissionAllowed) return <Navigate to={fallbackPath} replace />;
  return <>{children}</>;
}
