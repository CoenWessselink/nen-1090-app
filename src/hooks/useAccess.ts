import { useSession, type AccessPermission } from '@/app/session/SessionContext';

export function useAccess(permission: AccessPermission, fallback = false) {
  const session = useSession();
  return session.isAuthenticated ? session.hasPermission(permission) : fallback;
}
