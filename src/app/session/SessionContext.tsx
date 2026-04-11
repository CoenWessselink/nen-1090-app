import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, refreshCentralSession, refreshSession } from '@/api/auth';
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

const COOKIE_SESSION_MARKER = '__cookie_session__';

function hasUsableBearerToken(token: string | null) {
  return Boolean(token && token !== COOKIE_SESSION_MARKER);
}

function hasUsableRefreshToken(refreshToken: string | null) {
  return Boolean(refreshToken && refreshToken !== COOKIE_SESSION_MARKER);
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
      const bearerToken = hasUsableBearerToken(token);
      const bearerRefresh = hasUsableRefreshToken(refreshToken);
      const cookieSession = token === COOKIE_SESSION_MARKER || refreshToken === COOKIE_SESSION_MARKER;

      if (!bearerToken && !bearerRefresh && !cookieSession) {
        clearSession();
        if (!cancelled) setIsBootstrapping(false);
        return;
      }

      if (onAuthPage && bearerToken && !bearerRefresh) {
        clearSession();
        if (!cancelled) setIsBootstrapping(false);
        return;
      }

      try {
        let activeToken = bearerToken ? token : null;
        let nextRefreshToken = bearerRefresh ? refreshToken : null;

        if (!activeToken && bearerRefresh && refreshToken) {
          const refreshed = await refreshSession(refreshToken);
          activeToken = refreshed.access_token;
          nextRefreshToken = refreshed.refresh_token || refreshToken;
          if (!activeToken) throw new Error('NO_ACCESS_TOKEN_AFTER_REFRESH');
        }

        if (!activeToken && cookieSession && !onAuthPage) {
          const refreshed = await refreshCentralSession();
          activeToken = COOKIE_SESSION_MARKER;
          if (!cancelled) {
            setSession(
              COOKIE_SESSION_MARKER,
              {
                email: refreshed.user?.email || '',
                tenant: refreshed.user?.tenant || '',
                tenantId: refreshed.user?.tenant_id || '',
                role: refreshed.user?.role || '',
                name: refreshed.user?.name || '',
              },
              null,
            );
          }
        }

        if (!activeToken && !cookieSession) {
          throw new Error('NO_ACTIVE_SESSION');
        }

        if (!onAuthPage) {
          const me = await getMe();
          if (!cancelled) {
            setSession(
              activeToken || COOKIE_SESSION_MARKER,
              {
                email: me.email,
                tenant: me.tenant,
                tenantId: me.tenantId,
                role: me.role,
                name: me.name,
              },
              nextRefreshToken,
            );
          }
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true
    };
  }, [clearSession, refreshToken, setSession, token]);

  useEffect(() => {
    if (!user) return;

    const bearerRefresh = hasUsableRefreshToken(refreshToken);
    const cookieSession = token === COOKIE_SESSION_MARKER;

    if (!bearerRefresh && !cookieSession) return;

    let cancelled = false;

    async function refreshExistingSession() {
      try {
        const payload = bearerRefresh && refreshToken
          ? await refreshSession(refreshToken)
          : await refreshCentralSession();

        if (cancelled) return;

        const refreshedUser: SessionUser = {
          email: payload.user?.email || user.email,
          tenant: payload.user?.tenant || user.tenant,
          tenantId: payload.user?.tenant_id || user.tenantId,
          role: payload.user?.role || user.role,
          name: payload.user?.name || user.name,
        };

        if (bearerRefresh) {
          if (!payload.access_token) throw new Error('NO_REFRESHED_TOKEN');
          const nextRefreshToken = payload.refresh_token || refreshToken || null;
          setSession(payload.access_token, refreshedUser, nextRefreshToken);
          updateToken(payload.access_token);
          return;
        }

        setSession(COOKIE_SESSION_MARKER, refreshedUser, null);
      } catch {
        if (!cancelled) clearSession();
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
  }, [clearSession, refreshToken, setSession, token, updateToken, user]);

  const normalizedRole = normalizeRole(user?.role);
  const permissions = permissionMap[normalizedRole] || [];
  const isAuthenticated = Boolean(
    user &&
      (
        hasUsableBearerToken(token) ||
        hasUsableRefreshToken(refreshToken) ||
        token === COOKIE_SESSION_MARKER
      )
  );

  const value = useMemo<SessionContextValue>(() => ({
    token,
    refreshToken,
    user,
    tenant: user?.tenant,
    role: user?.role,
    isAuthenticated,
    isImpersonating: Boolean(impersonation?.active),
    isBootstrapping,
    impersonationTenantName: impersonation?.tenantName,
    hasRole: (roles) => roles.length === 0 || roles.some((role) => normalizeRole(String(role)) === normalizedRole),
    hasPermission: (permission) => permissions.includes(permission),
    clearSession,
  }), [clearSession, impersonation, isAuthenticated, isBootstrapping, normalizedRole, permissions, refreshToken, token, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession moet binnen SessionProvider gebruikt worden.');
  return context;
}
