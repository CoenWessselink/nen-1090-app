import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/api/client';
import { getMe, refreshCentralSession } from '@/api/auth';
import { cookieSessionMarker, useAuthStore } from '@/app/store/auth-store';
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

function normalizeRefreshUser(input: unknown): SessionUser | null {
  const record = input && typeof input === 'object' ? input as Record<string, unknown> : null;
  const rawUser = record?.user && typeof record.user === 'object' ? record.user as Record<string, unknown> : null;
  if (!rawUser?.email) return null;
  return {
    email: String(rawUser.email || ''),
    tenant: String(rawUser.tenant || ''),
    tenantId: rawUser.tenant_id as string | number | undefined ?? rawUser.tenantId as string | number | undefined ?? '',
    role: String(rawUser.role || rawUser.canonical_role || ''),
    name: String(rawUser.name || ''),
  };
}

export function SessionProvider({ children }: PropsWithChildren) {
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);
  const impersonation = useAuthStore((state) => state.impersonation);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setSession = useAuthStore((state) => state.setSession);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const lastValidationRef = useRef<{ token: string; timestamp: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const lastValidation = lastValidationRef.current;
        const now = Date.now();

        if (token && user && lastValidation?.token === token && now - lastValidation.timestamp < AUTH_VALIDATE_TTL_MS) {
          if (!cancelled) setIsBootstrapping(false);
          return;
        }

        try {
          const me = await getMe();
          if (!cancelled) {
            const normalizedUser = normalizeMeUser(me as Record<string, unknown>);
            lastValidationRef.current = { token: cookieSessionMarker, timestamp: Date.now() };
            setSession(cookieSessionMarker, normalizedUser, null);
          }
          return;
        } catch (error) {
          if (!isUnauthorized(error)) {
            console.error('Session bootstrap failed', error);
            return;
          }
        }

        try {
          const refreshed = await refreshCentralSession();
          const refreshedUser = normalizeRefreshUser(refreshed);
          if (!cancelled && refreshedUser) {
            lastValidationRef.current = { token: cookieSessionMarker, timestamp: Date.now() };
            setSession(cookieSessionMarker, refreshedUser, null);
            return;
          }
          if (!cancelled) clearSession();
        } catch (refreshError) {
          if (!cancelled) {
            console.error('Session refresh failed', refreshError);
            clearSession();
          }
        }
      } catch (bootstrapError) {
        console.error('Critical bootstrap failure', bootstrapError);
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearSession, setSession, token, user]);

  const effectiveToken = token || null;
  const effectiveRefreshToken = refreshToken || null;
  const effectiveUser = user || null;
  const normalizedRole = normalizeRole(effectiveUser?.role);
  const permissions = useMemo(() => permissionMap[normalizedRole] || [], [normalizedRole]);

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

  if (!context) {
    throw new Error('useSession must be used within SessionProvider.');
  }

  return context;
}
