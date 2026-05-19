import { apiRequest, listRequest } from '@/api/client';
import { getTenant, getTenantUsers, getTenantProfile, getPlatformMailStatus } from '@/api/platform';
import type { Tenant, TenantProfile, TenantUser } from '@/types/domain';
import type { PlatformMailStatus } from '@/api/enterpriseTypes';

type R = Record<string, unknown>;

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(v: unknown, fallback = ''): string {
  return v === null || v === undefined ? fallback : String(v);
}

// ── Types ──

export type PlatformHealth = {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  api: { status: string; version: string; environment: string; current_time: string };
  database: { status: string; latency_ms: number | null };
  auth: { status: string; access_ttl_min: number; refresh_ttl_days: number };
  mail: { status: string; provider: string };
  storage: { status: string; uploads_available: boolean };
  counts: { tenants: number; users: number; projects: number; welds: number; inspections: number; attachments: number };
  recent: { errors_24h: number; activations_pending: number; failed_logins_24h: number };
};

export type SuperadminTenantSummary = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  plan: string;
  created_at: string;
  users_count: number;
  active_users_count: number;
  projects_count: number;
  welds_count: number;
  inspections_count: number;
  attachments_count: number;
  last_login_at: string | null;
  activation_pending_count: number;
  errors_24h: number;
};

export type Tenant360 = {
  tenant: { id: string; name: string; status: string; created_at: string; plan: string; trial_ends_at: string | null };
  company: { company_name: string; email: string; phone: string; website: string; logo_url: string };
  users: TenantUser[];
  projects: Array<R>;
  counts: { users: number; projects: number; welds: number; inspections: number; materials: number; wps: number; welders: number; attachments: number };
  onboarding: { pending_activations: number; activated_users: number; last_activation_sent_at: string | null };
  errors: { last_24h: number; last_error_at: string | null; top_errors: Array<R> };
};

export type SuperadminErrorRow = {
  id: string;
  created_at: string;
  tenant_id: string;
  tenant_name: string;
  user_email: string;
  method: string;
  path: string;
  status_code: number;
  message: string;
  resolved: boolean;
};

export type OnboardingRow = {
  tenant_id: string;
  tenant_name: string;
  user_id: string;
  email: string;
  name: string;
  status: 'pending_activation' | 'activated' | 'expired' | 'blocked' | 'unknown';
  created_at: string;
  activation_sent_at: string | null;
  activated_at: string | null;
};

// ── API functions ──

export async function getSuperadminHealth(): Promise<PlatformHealth> {
  try {
    const dedicated = await apiRequest<PlatformHealth>('/superadmin/control-center/health');
    if (dedicated && dedicated.status) return dedicated;
  } catch { /* fall through */ }

  const health = await apiRequest<R>('/health').catch(() => ({} as R));
  const tenants = await listRequest<Tenant[]>('/platform/tenants', { limit: 500 }).catch(() => []);
  const tenantList = Array.isArray(tenants) ? tenants : (tenants as R).items ? ((tenants as R).items as Tenant[]) : [];
  let mail: PlatformMailStatus | null = null;
  try { mail = await getPlatformMailStatus(); } catch { /* */ }

  const totalUsers = tenantList.reduce((sum, t) => sum + safeNumber((t as R).users_count ?? (t as R).user_count), 0);
  const totalProjects = tenantList.reduce((sum, t) => sum + safeNumber((t as R).projects_count ?? (t as R).project_count), 0);
  const totalWelds = tenantList.reduce((sum, t) => sum + safeNumber((t as R).welds_count ?? (t as R).weld_count), 0);
  const pendingUsers = tenantList.reduce((sum, t) => {
    const users = (t as R).users as Array<R> | undefined;
    if (!Array.isArray(users)) return sum;
    return sum + users.filter((u) => !u.is_active && !u.activated_at).length;
  }, 0);

  return {
    status: safeString(health.status || health.ok ? 'healthy' : 'unknown') as PlatformHealth['status'],
    api: { status: health.ok ? 'healthy' : safeString(health.status, 'unknown'), version: safeString(health.version), environment: safeString(health.environment, 'production'), current_time: new Date().toISOString() },
    database: { status: safeString(health.database || (health.ok ? 'healthy' : 'unknown')), latency_ms: null },
    auth: { status: 'healthy', access_ttl_min: 60, refresh_ttl_days: 30 },
    mail: { status: safeString(mail?.status || mail?.configured ? 'configured' : 'unknown'), provider: safeString(mail?.provider || 'unknown') },
    storage: { status: 'healthy', uploads_available: true },
    counts: { tenants: tenantList.length, users: totalUsers, projects: totalProjects, welds: totalWelds, inspections: 0, attachments: 0 },
    recent: { errors_24h: 0, activations_pending: pendingUsers, failed_logins_24h: 0 },
  };
}

export async function getSuperadminTenants(): Promise<SuperadminTenantSummary[]> {
  try {
    const dedicated = await apiRequest<{ items: SuperadminTenantSummary[] }>('/superadmin/control-center/tenants');
    if (dedicated?.items?.length) return dedicated.items;
  } catch { /* fall through */ }

  const payload = await listRequest<Tenant[]>('/platform/tenants', { limit: 500 });
  const rows = Array.isArray(payload) ? payload : (payload as R).items ? ((payload as R).items as Tenant[]) : [];
  return rows.map((t) => {
    const r = t as R;
    return {
      tenant_id: safeString(r.id),
      tenant_name: safeString(r.name || r.display_name),
      status: safeString(r.status || (r.is_active ? 'active' : 'inactive')),
      plan: safeString(r.plan || r.subscription_plan || 'free'),
      created_at: safeString(r.created_at),
      users_count: safeNumber(r.users_count ?? r.user_count),
      active_users_count: safeNumber(r.active_users_count),
      projects_count: safeNumber(r.projects_count ?? r.project_count),
      welds_count: safeNumber(r.welds_count ?? r.weld_count),
      inspections_count: safeNumber(r.inspections_count ?? r.inspection_count),
      attachments_count: safeNumber(r.attachments_count ?? r.attachment_count),
      last_login_at: safeString(r.last_login_at) || null,
      activation_pending_count: safeNumber(r.activation_pending_count),
      errors_24h: safeNumber(r.errors_24h),
    };
  });
}

export async function getTenant360(tenantId: string): Promise<Tenant360> {
  try {
    const dedicated = await apiRequest<Tenant360>(`/superadmin/control-center/tenants/${tenantId}`);
    if (dedicated?.tenant) return dedicated;
  } catch { /* fall through */ }

  const [tenant, users, profile] = await Promise.all([
    getTenant(tenantId).catch(() => ({} as Tenant)),
    getTenantUsers(tenantId).catch(() => ({ items: [] as TenantUser[] })),
    getTenantProfile(tenantId).catch(() => ({} as TenantProfile)),
  ]);

  const r = tenant as R;
  const userList = Array.isArray(users) ? users : (users as R).items ? ((users as R).items as TenantUser[]) : [];
  const activeUsers = userList.filter((u) => (u as R).is_active || (u as R).activated_at);
  const pendingUsers = userList.filter((u) => !(u as R).is_active && !(u as R).activated_at);

  return {
    tenant: { id: safeString(r.id), name: safeString(r.name || r.display_name), status: safeString(r.status), created_at: safeString(r.created_at), plan: safeString(r.plan || 'free'), trial_ends_at: safeString(r.trial_ends_at) || null },
    company: { company_name: safeString(profile.company_name || r.name || r.display_name), email: safeString(profile.company_email || r.billing_email), phone: safeString(profile.phone), website: safeString(profile.website), logo_url: '' },
    users: userList,
    projects: [],
    counts: { users: userList.length, projects: safeNumber(r.projects_count ?? r.project_count), welds: safeNumber(r.welds_count ?? r.weld_count), inspections: safeNumber(r.inspections_count), materials: 0, wps: 0, welders: 0, attachments: safeNumber(r.attachments_count) },
    onboarding: { pending_activations: pendingUsers.length, activated_users: activeUsers.length, last_activation_sent_at: null },
    errors: { last_24h: 0, last_error_at: null, top_errors: [] },
  };
}

export async function getSuperadminErrors(): Promise<SuperadminErrorRow[]> {
  try {
    const dedicated = await apiRequest<{ items: SuperadminErrorRow[] }>('/superadmin/control-center/errors');
    if (dedicated?.items) return dedicated.items;
  } catch { /* fall through */ }
  return [];
}

export async function getSuperadminOnboarding(): Promise<OnboardingRow[]> {
  try {
    const dedicated = await apiRequest<{ items: OnboardingRow[] }>('/superadmin/control-center/onboarding');
    if (dedicated?.items) return dedicated.items;
  } catch { /* fall through */ }

  const payload = await listRequest<Tenant[]>('/platform/tenants', { limit: 500 }).catch(() => []);
  const tenants = Array.isArray(payload) ? payload : (payload as R).items ? ((payload as R).items as Tenant[]) : [];
  const rows: OnboardingRow[] = [];
  for (const t of tenants.slice(0, 20)) {
    try {
      const users = await getTenantUsers(safeString((t as R).id));
      const userList = Array.isArray(users) ? users : (users as R).items ? ((users as R).items as TenantUser[]) : [];
      for (const u of userList) {
        const ur = u as R;
        rows.push({
          tenant_id: safeString((t as R).id),
          tenant_name: safeString((t as R).name || (t as R).display_name),
          user_id: safeString(ur.id),
          email: safeString(ur.email),
          name: safeString(ur.name),
          status: ur.is_active || ur.activated_at ? 'activated' : 'pending_activation',
          created_at: safeString(ur.created_at),
          activation_sent_at: safeString(ur.activation_sent_at) || null,
          activated_at: safeString(ur.activated_at) || null,
        });
      }
    } catch { /* skip tenant */ }
  }
  return rows;
}

export async function resendActivation(userId: string): Promise<void> {
  await apiRequest(`/superadmin/control-center/onboarding/${userId}/resend-activation`, { method: 'POST' });
}

export async function generateActivationLink(userId: string): Promise<{ link: string }> {
  return apiRequest<{ link: string }>(`/superadmin/control-center/onboarding/${userId}/generate-activation-link`, { method: 'POST' });
}

export async function markActivated(userId: string): Promise<void> {
  await apiRequest(`/superadmin/control-center/onboarding/${userId}/mark-activated`, { method: 'POST' });
}
