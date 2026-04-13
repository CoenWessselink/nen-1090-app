import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, refreshCentralSession, refreshSession } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useAuthStore } from '@/app/store/auth-store';
import type { Role, SessionUser } from '@/types/domain';

export type AccessPermission =
  | 'dashboard.read'
  | 'projects.read'
  | 'projects.write'
  | 'welds.read'
  | 'welds.write'
  | 'documents.read'
  | 'documents.write'
  | 'settings.read'
  | 'settings.write'
  | 'billing.read'
  | 'billing.manage'
  | 'tenants.read'
  | 'tenants.impersonate';

type SessionContextValue = {
  token: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  tenant: string | undefined;
  role: Role | string | undefined;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  isBootstrapping: boolean;
  impersonationTenantName?: string;
  hasRole: (roles: Array<Role | string>) => boolean;
  hasPermission: (permission: AccessPermission) => boolean;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const cookieSessionMarker = '__cookie_session__';

const permissionMap: Record<string, AccessPermission[]> = {
  SUPERADMIN: ['dashboard.read', 'projects.read', 'projects.write', 'welds.read', 'welds.write', 'documents.read', 'documents.write', 'settings.read', 'settings.write', 'billing.read', 'billing.manage', 'tenants.read', 'tenants.impersonate'],
  SUPER_ADMIN: ['dashboard.read', 'projects.read', 'projects.write', 'welds.read', 'welds.write', 'documents.read', 'documents.write', 'settings.read', 'settings.write', 'billing.read', 'billing.manage', 'tenants.read', 'tenants.impersonate'],
  ADMIN: ['dashboard.read', 'projects.read', 'projects.write', 'welds.read', 'welds.write', 'documents.read', 'documents.write', 'settings.read', 'settings.write', 'billing.read', 'tenants.read'],
  TENANTADMIN: ['dashboard.read', 'projects.read', 'projects.write', 'welds.read', 'welds.write', 'documents.read', 'documents.write', 'settings.read', 'settings.write', 'billing.read'],
  TENANTUSER: ['dashboard.read', 'projects.read', 'welds.read', 'documents.read', 'settings.read'],
  PLANNER: ['dashboard.read', 'projects.read', 'projects.write', 'welds.read', 'welds.write', 'documents.read'],
  INSPECTOR: ['dashboard.read', 'projects.read', 'welds.read', 'welds.write', 'documents.read', 'documents.write'],
  USER: ['dashboard.read', 'projects.read', 'welds.read', 'documents.read'],
  VIEWER: ['dashboard.read', 'projects.read', 'welds.read', 'documents.read'],
};

function normalizeRole(role?: string | null): string {
  return String(role || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
}

function isAuthPage(pathname: string) {
  return [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/logout',
    '/change-password',
    '/app/login',
    '/app/login.html',
    '/app/forgot-password',
    '/app/forgot-password.html',
    '/app/reset-password',
    '/app/reset-password.html',
    '/app/logout',
    '/app/logout.html',
    '/app/change-password',
    '/app/change-password.html',
  ].includes(pathname);
}

function buildSessionUser(input: Partial<SessionUser> | undefined, fallback?: SessionUser | null): SessionUser {
  return {
    email: input?.email || fallback?.email || '',
    tenant: input?.tenant || fallback?.tenant || '',
    tenantId: input?.tenantId || fallback?.tenantId || '',
    role: input?.role || fallback?.role || '',
    name: input?.name || fallback?.name || '',
  };
}

function buildApiUser(input: any, fallback?: SessionUser | null): SessionUser {
  return {
    email: String(input?.email || fallback?.email || ''),
    tenant: String(input?.tenant || fallback?.tenant || ''),
    tenantId: String(input?.tenantId || input?.tenant_id || fallback?.tenantId || ''),
    role: String(input?.role || fallback?.role || ''),
    name: String(input?.name || fallback?.name || ''),
  };
}

async function readCurrentUser(): Promise<SessionUser> {
  const me = await getMe();
  return buildApiUser(me);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);
  const impersonation = useAuthStore((state) => state.impersonation);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setSession = useAuthStore((state) => state.setSession);
  const updateToken = useAuthStore((state) => state.updateToken);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const pathname = window.location.pathname;
      const onAuthPage = isAuthPage(pathname);

      if (!token && !refreshToken) {
        if (!cancelled) setIsBootstrapping(false);
        return;
      }

      if (onAuthPage && token && token !== cookieSessionMarker && !refreshToken) {
        clearSession();
        if (!cancelled) setIsBootstrapping(false);
        return;
      }

      try {
        let activeToken = token;
        let activeRefreshToken = refreshToken;
        let activeUser = user;

        if (!activeToken && activeRefreshToken && activeRefreshToken !== cookieSessionMarker) {
          const refreshed = await refreshSession(activeRefreshToken);
          activeToken = refreshed.access_token || null;
          activeRefreshToken = refreshed.refresh_token || activeRefreshToken;
          activeUser = buildApiUser(refreshed.user, activeUser);

          if (!cancelled && activeToken) {
            setSession(activeToken, activeUser, activeRefreshToken);
          }
        }

        if (!activeToken && activeRefreshToken === cookieSessionMarker) {
          const refreshed = await refreshCentralSession();
          activeToken = cookieSessionMarker;
          activeRefreshToken = null;
          activeUser = buildApiUser(refreshed.user, activeUser);

          if (!cancelled) {
            setSession(cookieSessionMarker, activeUser, null);
          }
        }

        if (onAuthPage && !activeRefreshToken && activeToken && activeToken !== cookieSessionMarker) {
          clearSession();
          if (!cancelled) setIsBootstrapping(false);
          return;
        }

        if (!activeToken && !activeRefreshToken) {
          if (!cancelled) setIsBootstrapping(false);
          return;
        }

        try {
          const meUser = await readCurrentUser();
          if (!cancelled) {
            setSession(activeToken || token || cookieSessionMarker, buildSessionUser(meUser, activeUser), activeRefreshToken || null);
          }
        } catch (error) {
          const unauthorized = error instanceof ApiError && (error.status === 401 || error.status === 403);

          if (unauthorized && activeRefreshToken && activeRefreshToken !== cookieSessionMarker) {
            const refreshed = await refreshSession(activeRefreshToken);
            const nextToken = refreshed.access_token || activeToken;
            const nextRefreshToken = refreshed.refresh_token || activeRefreshToken;
            const refreshedUser = buildApiUser(refreshed.user, activeUser);
            const verifiedUser = await readCurrentUser().catch(() => refreshedUser);

            if (!cancelled && nextToken) {
              setSession(nextToken, buildSessionUser(verifiedUser, refreshedUser), nextRefreshToken);
              updateToken(nextToken);
            }
          } else if (unauthorized) {
            if (!cancelled) {
              clearSession();
            }
          } else if (!cancelled && activeToken && activeUser) {
            setSession(activeToken, activeUser, activeRefreshToken || null);
          }
        }
      } catch (error) {
        const unauthorized = error instanceof ApiError && (error.status === 401 || error.status === 403);
        if (!cancelled && unauthorized) {
          clearSession();
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearSession, refreshToken, setSession, token, updateToken, user]);

  useEffect(() => {
    if (!user) return;

    const hasBearerRefreshToken = Boolean(refreshToken && refreshToken !== cookieSessionMarker);
    const hasCookieSession = token === cookieSessionMarker;

    if (!hasBearerRefreshToken && !hasCookieSession) return;

    let cancelled = false;

    async function refreshExistingSession() {
      try {
        const payload = hasBearerRefreshToken
          ? await refreshSession(refreshToken as string)
          : await refreshCentralSession();

        if (cancelled) return;

        const refreshedUser: SessionUser = {
          email: payload.user?.email || user.email,
          tenant: payload.user?.tenant || user.tenant,
          tenantId: payload.user?.tenant_id || user.tenantId,
          role: payload.user?.role || user.role,
          name: payload.user?.name || user.name,
        };

        if (hasBearerRefreshToken) {
          if (!payload.access_token) return;
          const nextRefreshToken = payload.refresh_token || refreshToken || null;
          setSession(payload.access_token, refreshedUser, nextRefreshToken);
          updateToken(payload.access_token);
          return;
        }

        setSession(cookieSessionMarker, refreshedUser, null);
      } catch {
        // houd bestaande UI-sessie intact om login/projectroutes niet te laten loopen.
      }
    }

    const interval = window.setInterval(refreshExistingSession, 10 * 60 * 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshExistingSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshToken, setSession, token, updateToken, user]);

  const normalizedRole = normalizeRole(user?.role);
  const permissions = permissionMap[normalizedRole] || [];

  const value = useMemo<SessionContextValue>(() => ({
    token,
    refreshToken,
    user,
    tenant: user?.tenant,
    role: user?.role,
    isAuthenticated: Boolean(user && (token || refreshToken)),
    isImpersonating: Boolean(impersonation?.active),
    isBootstrapping,
    impersonationTenantName: impersonation?.tenantName,
    hasRole: (roles) => roles.length === 0 || roles.some((role) => normalizeRole(String(role)) === normalizedRole),
    hasPermission: (permission) => permissions.includes(permission),
    clearSession,
  }), [clearSession, impersonation, isBootstrapping, normalizedRole, permissions, refreshToken, token, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession moet binnen SessionProvider gebruikt worden.');
  return context;
}
