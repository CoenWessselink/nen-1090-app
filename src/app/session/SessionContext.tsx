import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { refreshCentralSession, refreshSession } from '@/api/auth';
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

function consumeMarketingHandoff() {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const accessToken = url.searchParams.get('access_token') || '';
  const email = url.searchParams.get('email') || '';
  if (!accessToken || !email) return null;

  const user: SessionUser = {
    email,
    tenant: url.searchParams.get('tenant') || 'demo',
    tenantId: url.searchParams.get('tenant_id') || undefined,
    role: url.searchParams.get('role') || undefined,
    name: url.searchParams.get('name') || undefined,
  };

  const refreshToken = url.searchParams.get('refresh_token') || null;
  ['access_token', 'refresh_token', 'email', 'tenant', 'tenant_id', 'role', 'name', 'auth_source'].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  return { token: accessToken, refreshToken, user };
}

export function SessionProvider({ children }: PropsWithChildren) {
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);
  const impersonation = useAuthStore((state) => state.impersonation);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setSession = useAuthStore((state) => state.setSession);
  const updateToken = useAuthStore((state) => state.updateToken);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(typeof window !== 'undefined' && !user));

  useEffect(() => {
    let cancelled = false;

    function bootstrapFromHandoff() {
      if (user) {
        if (!cancelled) setIsBootstrapping(false);
        return;
      }

      const handoff = consumeMarketingHandoff();
      if (handoff) {
        setSession(handoff.token, handoff.user, handoff.refreshToken);
      }
      if (!cancelled) setIsBootstrapping(false);
    }

    bootstrapFromHandoff();
    return () => {
      cancelled = true;
    };
  }, [setSession, user]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function refreshExistingSession() {
      try {
        const payload = refreshToken && refreshToken !== '__cookie_session__'
          ? await refreshSession(refreshToken)
          : await refreshCentralSession();

        if (cancelled || !payload.access_token) return;

        const refreshedUser: SessionUser = {
          email: payload.user?.email || user.email,
          tenant: payload.user?.tenant || user.tenant,
          tenantId: payload.user?.tenant_id || user.tenantId,
          role: payload.user?.role || user.role,
          name: payload.user?.name || user.name,
        };

        const nextToken = refreshToken && refreshToken !== '__cookie_session__' ? payload.access_token : '__cookie_session__';
        const nextRefreshToken = refreshToken && refreshToken !== '__cookie_session__' ? payload.refresh_token || refreshToken : null;
        setSession(nextToken, refreshedUser, nextRefreshToken);
        if (nextToken !== '__cookie_session__') updateToken(nextToken);
      } catch {
        // Laat de bestaande sessie staan; de API-client handelt een echte 401 af.
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
  }, [refreshToken, setSession, updateToken, user]);

  const normalizedRole = normalizeRole(user?.role);
  const permissions = permissionMap[normalizedRole] || [];

  const value = useMemo<SessionContextValue>(() => ({
    token,
    refreshToken,
    user,
    tenant: user?.tenant,
    role: user?.role,
    isAuthenticated: Boolean(user && token),
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
