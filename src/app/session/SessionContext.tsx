import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/api/client';
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

const STORAGE_KEY = 'nen1090.session';
const COOKIE_SESSION_MARKER = '__cookie_session__';

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

function readPersistedSession(): { token: string | null; refreshToken: string | null; user: SessionUser | null } {
  if (typeof window === 'undefined') {
    return { token: null, refreshToken: null, user: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, refreshToken: null, user: null };
    const parsed = JSON.parse(raw) as {
      token?: string | null;
      refreshToken?: string | null;
      user?: SessionUser | null;
    };

    return {
      token: typeof parsed?.token === 'string' && parsed.token.trim() ? parsed.token : null,
      refreshToken: typeof parsed?.refreshToken === 'string' && parsed.refreshToken.trim() ? parsed.refreshToken : null,
      user: parsed?.user && typeof parsed.user === 'object' ? parsed.user : null,
    };
  } catch {
    return { token: null, refreshToken: null, user: null };
  }
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function normalizeMeUser(input: any): SessionUser {
  return {
    email: String(input?.email || ''),
    tenant: String(input?.tenant || input?.tenant_name || ''),
    tenantId: input?.tenantId ?? input?.tenant_id ?? '',
    role: String(input?.role || ''),
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
    let cancelled = false;

    const persisted = readPersistedSession();
    const effectiveToken = token || persisted.token;
    const effectiveRefreshToken = refreshToken || persisted.refreshToken;
    const effectiveUser = user || persisted.user;
    const onAuthPage = isAuthPage(window.location.pathname);
    const hasStoredSession = Boolean(effectiveUser && (effectiveToken || effectiveRefreshToken));

    if (hasStoredSession) {
      setIsBootstrapping(false);
    }

    async function bootstrap() {
      if (!hasStoredSession) {
        if (!cancelled) setIsBootstrapping(false);
        return;
      }

      try {
        let activeToken = effectiveToken;
        let activeRefreshToken = effectiveRefreshToken;
        let activeUser = effectiveUser;

        if ((!activeToken || activeToken === COOKIE_SESSION_MARKER) && activeRefreshToken && activeRefreshToken !== COOKIE_SESSION_MARKER) {
          const refreshed = await refreshSession(activeRefreshToken);
          if (refreshed.access_token && refreshed.user?.email) {
            activeToken = refreshed.access_token;
            activeRefreshToken = refreshed.refresh_token || activeRefreshToken;
            activeUser = {
              email: refreshed.user.email,
              tenant: refreshed.user.tenant || '',
              tenantId: refreshed.user.tenant_id || '',
              role: refreshed.user.role || '',
              name: refreshed.user.name || '',
            };
            if (!cancelled) {
              setSession(activeToken, activeUser, activeRefreshToken);
            }
          }
        }

        if ((!activeToken || activeToken === COOKIE_SESSION_MARKER) && !activeRefreshToken) {
          const refreshed = await refreshCentralSession();
          if (refreshed.user?.email) {
            activeToken = COOKIE_SESSION_MARKER;
            activeUser = {
              email: refreshed.user.email,
              tenant: refreshed.user.tenant || '',
              tenantId: refreshed.user.tenant_id || '',
              role: refreshed.user.role || '',
              name: refreshed.user.name || '',
            };
            if (!cancelled) {
              setSession(COOKIE_SESSION_MARKER, activeUser, null);
            }
          }
        }

        const me = await getMe();
        if (!cancelled) {
          setSession(
            activeToken || effectiveToken || COOKIE_SESSION_MARKER,
            normalizeMeUser(me),
            activeRefreshToken || null,
          );
        }
      } catch (error) {
        if (!cancelled) {
          if (isUnauthorized(error) && effectiveRefreshToken && effectiveRefreshToken !== COOKIE_SESSION_MARKER) {
            try {
              const refreshed = await refreshSession(effectiveRefreshToken);
              if (refreshed.access_token && refreshed.user?.email) {
                const refreshedUser: SessionUser = {
                  email: refreshed.user.email,
                  tenant: refreshed.user.tenant || '',
                  tenantId: refreshed.user.tenant_id || '',
                  role: refreshed.user.role || '',
                  name: refreshed.user.name || '',
                };
                setSession(
                  refreshed.access_token,
                  refreshedUser,
                  refreshed.refresh_token || effectiveRefreshToken,
                );
              }
            } catch {
              if (onAuthPage) clearSession();
            }
          } else if (onAuthPage) {
            clearSession();
          }
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearSession, refreshToken, setSession, token, user]);

  useEffect(() => {
    if (!user) return;

    const hasBearerRefreshToken = Boolean(refreshToken && refreshToken !== COOKIE_SESSION_MARKER);
    const hasCookieSession = token === COOKIE_SESSION_MARKER;

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

        setSession(COOKIE_SESSION_MARKER, refreshedUser, null);
      } catch {
        // optimistic session intact houden; protected routes mogen niet terugvallen naar login
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

  const value = useMemo<SessionContextValue>(
    () => ({
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
    }),
    [clearSession, impersonation, isBootstrapping, normalizedRole, permissions, refreshToken, token, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession moet binnen SessionProvider gebruikt worden.');
  return context;
}
