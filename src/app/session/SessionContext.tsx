import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/api/client';
import { getMe, refreshSession } from '@/api/auth';
import { readAnyPersistedSession, useAuthStore } from '@/app/store/auth-store';
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
  PLATFORMADMIN: ['dashboard.read', 'projects.read', 'projects.write', 'welds.read', 'welds.write', 'documents.read', 'documents.write', 'settings.read', 'settings.write', 'billing.read', 'billing.manage', 'tenants.read', 'tenants.impersonate'],
  PLATFORM_ADMIN: ['dashboard.read', 'projects.read', 'projects.write', 'welds.read', 'welds.write', 'documents.read', 'documents.write', 'settings.read', 'settings.write', 'billing.read', 'billing.manage', 'tenants.read', 'tenants.impersonate'],
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

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function normalizeMeUser(input: any): SessionUser {
  return {
    email: String(input?.email || ''),
    tenant: String(input?.tenant || input?.tenant_name || ''),
    tenantId: input?.tenantId ?? input?.tenant_id ?? '',
    role: String(input?.canonical_role || input?.role || ''),
    name: String(input?.name || ''),
  };
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
    const persisted = readAnyPersistedSession();
    if (!token && persisted.token && persisted.user) {
      useAuthStore.setState({
        token: persisted.token,
        refreshToken: persisted.refreshToken,
        user: persisted.user,
        impersonation: null,
      });
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const persisted = readAnyPersistedSession();
      const effectiveToken = token || persisted.token;
      const effectiveRefreshToken = refreshToken || persisted.refreshToken;
      const effectiveUser = user || persisted.user;

      if (!effectiveToken || !effectiveUser) {
        if (!cancelled) setIsBootstrapping(false);
        return;
      }

      if (!token && effectiveToken && effectiveUser) {
        setSession(effectiveToken, effectiveUser, effectiveRefreshToken || null);
      }

      try {
        const me = await getMe();
        if (!cancelled) {
          setSession(effectiveToken, normalizeMeUser(me), effectiveRefreshToken || null);
        }
      } catch (error) {
        if (isUnauthorized(error) && effectiveRefreshToken) {
          try {
            const refreshed = await refreshSession(effectiveRefreshToken);
            if (!cancelled && refreshed.access_token && refreshed.user?.email) {
              const refreshedUser: SessionUser = {
                email: refreshed.user.email,
                tenant: refreshed.user.tenant || '',
                tenantId: refreshed.user.tenant_id || '',
                role: refreshed.user.canonical_role || refreshed.user.role || '',
                name: refreshed.user.name || '',
              };
              setSession(
                refreshed.access_token,
                refreshedUser,
                refreshed.refresh_token || effectiveRefreshToken,
              );
              updateToken(refreshed.access_token);
            }
          } catch {
            // keep persisted session intact during hydration
          }
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [refreshToken, setSession, token, updateToken, user]);

  const persisted = readAnyPersistedSession();
  const effectiveToken = token || persisted.token;
  const effectiveRefreshToken = refreshToken || persisted.refreshToken;
  const effectiveUser = user || persisted.user;
  const normalizedRole = normalizeRole(effectiveUser?.role);
  const permissions = permissionMap[normalizedRole] || [];

  const value = useMemo<SessionContextValue>(
    () => ({
      token: effectiveToken,
      refreshToken: effectiveRefreshToken,
      user: effectiveUser,
      tenant: effectiveUser?.tenant,
      role: effectiveUser?.role,
      isAuthenticated: Boolean(effectiveUser && effectiveToken),
      isImpersonating: Boolean(impersonation?.active),
      isBootstrapping,
      impersonationTenantName: impersonation?.tenantName,
      hasRole: (roles) => roles.length === 0 || roles.some((role) => normalizeRole(String(role)) === normalizedRole),
      hasPermission: (permission) => permissions.includes(permission),
      clearSession,
    }),
    [clearSession, effectiveRefreshToken, effectiveToken, effectiveUser, impersonation, isBootstrapping, normalizedRole, permissions],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession moet binnen SessionProvider gebruikt worden.');
  return context;
}
