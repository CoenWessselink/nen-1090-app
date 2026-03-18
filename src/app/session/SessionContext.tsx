import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
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

export function SessionProvider({ children }: PropsWithChildren) {
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);
  const impersonation = useAuthStore((state) => state.impersonation);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setSession = useAuthStore((state) => state.setSession);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(typeof window !== 'undefined' && !user));

  useEffect(() => {
    let cancelled = false;

    async function bootstrapFromCentralAuth() {
      if (user) {
        if (!cancelled) setIsBootstrapping(false);
        return;
      }

      try {
        const response = await fetch('/api/v1/auth/me', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const me = await response.json();
        if (cancelled || !me?.email) return;
        setSession('__cookie_session__', {
          email: String(me.email),
          tenant: typeof me.tenant === 'string' ? me.tenant : undefined,
          tenantId: me.tenant_id ?? me.tenantId,
          role: typeof me.role === 'string' ? me.role : undefined,
          name: typeof me.name === 'string' ? me.name : undefined,
        }, null);
      } catch {
        // no active central session available
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    void bootstrapFromCentralAuth();
    return () => {
      cancelled = true;
    };
  }, [setSession, token, user]);

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
