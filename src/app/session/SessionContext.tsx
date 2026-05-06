import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/api/client';
import { getMe, refreshCentralSession, refreshSession } from '@/api/auth';
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
const AUTH_VALIDATE_TTL_MS = 5 * 60 * 1000;

const superadminPermissions: AccessPermission[] = [
  'dashboard.read', 'projects.read', 'projects.write', 'welds.read', 'welds.write', 'documents.read', 'documents.write',
  'settings.read', 'settings.write', 'billing.read', 'billing.manage', 'tenants.read', 'tenants.impersonate',
];

const tenantOwnerPermissions: AccessPermission[] = [
  'dashboard.read', 'projects.read', 'projects.write', 'welds.read', 'welds.write', 'documents.read', 'documents.write',
  'settings.read', 'settings.write', 'billing.read', 'billing.manage',
];

const tenantAdminPermissions: AccessPermission[] = [
  'dashboard.read', 'projects.read', 'projects.write', 'welds.read', 'welds.write', 'documents.read', 'documents.write',
  'settings.read', 'settings.write', 'billing.read',
];

const permissionMap: Record<string, AccessPermission[]> = {
  SUPERADMIN: superadminPermissions,
  SUPER_ADMIN: superadminPermissions,
  PLATFORMADMIN: superadminPermissions,
  PLATFORM_ADMIN: superadminPermissions,
  OWNER: tenantOwnerPermissions,
  TENANTOWNER: tenantOwnerPermissions,
  TENANT_OWNER: tenantOwnerPermissions,
  ADMIN: tenantAdminPermissions,
  TENANTADMIN: tenantAdminPermissions,
  TENANT_ADMIN: tenantAdminPermissions,
  TENANTUSER: ['dashboard.read', 'projects.read', 'welds.read', 'documents.read', 'settings.read'],
  TENANT_USER: ['dashboard.read', 'projects.read', 'welds.read', 'documents.read', 'settings.read'],
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

function normalizeMeUser(input: Record<string, unknown>): SessionUser {
  return {
    email: String(input?.email || ''),
    tenant: String(input?.tenant || input?.tenant_name || ''),
    tenantId: (input?.tenantId as string | number | undefined) ?? (input?.tenant_id as string | number | undefined) ?? '',
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
  const lastValidationRef = useRef<{ token: string; timestamp: number } | null>(null);

  useEffect(() => {
    const persisted = readAnyPersistedSession();
    if (!token && persisted.token && persisted.user) {
      useAuthStore.setState({ token: persisted.token, refreshToken: persisted.refreshToken, user: persisted.user, impersonation: null });
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

      const lastValidation = lastValidationRef.current;
      const now = Date.now();
      if (lastValidation?.token === effectiveToken && now - lastValidation.timestamp < AUTH_VALIDATE_TTL_MS) {
        if (!cancelled) setIsBootstrapping(false);
        return;
      }
      lastValidationRef.current = { token: effectiveToken, timestamp: now };

      try {
        const me = await getMe();
        if (!cancelled) {
          setSession(effectiveToken, normalizeMeUser(me as Record<string, unknown>), effectiveRefreshToken || null);
        }
      } catch (error) {
        if (isUnauthorized(error)) {
          try {
            const refreshed = effectiveRefreshToken ? await refreshSession(effectiveRefreshToken) : await refreshCentralSession();
            if (!cancelled && refreshed.access_token && refreshed.user?.email) {
              const refreshedUser: SessionUser = { email: refreshed.user.email, tenant: refreshed.user.tenant || '', tenantId: refreshed.user.tenant_id || '', role: refreshed.user.role || '', name: refreshed.user.name || '' };
              lastValidationRef.current = { token: refreshed.access_token, timestamp: Date.now() };
              setSession(refreshed.access_token, refreshedUser, refreshed.refresh_token || effectiveRefreshToken || null);
              updateToken(refreshed.access_token);
              return;
            }
            if (!cancelled) clearSession();
          } catch {
            if (!cancelled) clearSession();
          }
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }
    void bootstrap();
    return () => { cancelled = true; };
  }, [refreshToken, setSession, token, updateToken, user]);

  const persisted = readAnyPersistedSession();
  const effectiveToken = token || persisted.token;
  const effectiveRefreshToken = refreshToken || persisted.refreshToken;
  const effectiveUser = user || persisted.user;
  const normalizedRole = normalizeRole(effectiveUser?.role);
  const permissions = permissionMap[normalizedRole] || [];

  const value = useMemo<SessionContextValue>(() => ({
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
  }), [clearSession, effectiveRefreshToken, effectiveToken, effectiveUser, impersonation, isBootstrapping, normalizedRole, permissions]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider.');
  return context;
}
