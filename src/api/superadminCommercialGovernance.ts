import { apiRequest, listRequest } from '@/api/client';

type R = Record<string, unknown>;
function s(v: unknown, fb = '') { return v == null ? fb : String(v); }
function n(v: unknown, fb = 0) { const x = Number(v); return Number.isFinite(x) ? x : fb; }

// ── Types ──

export type PlanDefinition = { code: string; name: string; description: string; is_active: boolean; price_monthly_cents: number; price_yearly_cents: number; currency: string; limits_json: R; features_json: R; sort_order: number };
export type TenantSubscription = { tenant_id: string; plan_code: string; plan_name: string; status: string; billing_provider: string; provider_customer_id: string; provider_subscription_id: string; trial_started_at: string | null; trial_ends_at: string | null; current_period_start: string | null; current_period_end: string | null; cancelled_at: string | null; suspended_at: string | null; grace_until: string | null; currency: string; amount_cents: number; interval: string; notes: string; created_at: string; updated_at: string };
export type TenantLimitRow = { key: string; label: string; limit: number; used: number; unlimited: boolean; source: 'plan' | 'tenant_override'; status: 'ok' | 'warning' | 'exceeded' };
export type TenantLimitSummary = { tenant_id: string; plan_code: string; limits: TenantLimitRow[] };
export type FeatureFlag = { key: string; name: string; description: string; default_enabled: boolean; category: string; is_active: boolean };
export type TenantFeatureFlag = { feature_key: string; enabled: boolean; source: 'default' | 'plan' | 'tenant_override'; name: string; category: string };
export type ImpersonationSession = { id: string; actor_user_id: string; actor_email: string; target_user_id: string; target_email: string; tenant_id: string; tenant_name: string; reason: string; started_at: string; expires_at: string; stopped_at: string | null; status: string };
export type GovernanceAuditEvent = { id: string; tenant_id: string; actor_email: string; actor_role: string; action: string; entity_type: string; entity_id: string; reason: string; before_json: R | null; after_json: R | null; request_id: string; created_at: string };
export type CommercialOverview = { active_tenants: number; trial_tenants: number; suspended_tenants: number; past_due_tenants: number; mrr_cents: number; exceeded_limits: number; active_impersonations: number; feature_overrides: number };

// ── Commercial overview ──

export async function getCommercialOverview(): Promise<CommercialOverview> {
  try { return await apiRequest<CommercialOverview>('/superadmin/commercial/overview'); } catch { /* fall through */ }
  const tenants = await listRequest<R[]>('/platform/tenants', { limit: 500 }).catch(() => []);
  const rows = Array.isArray(tenants) ? tenants : ((tenants as R).items as R[] || []);
  return {
    active_tenants: rows.filter((t) => s(t.status) === 'active').length,
    trial_tenants: rows.filter((t) => s(t.status) === 'trial' || s(t.status) === 'trialing').length,
    suspended_tenants: rows.filter((t) => s(t.status) === 'suspended').length,
    past_due_tenants: rows.filter((t) => s(t.status) === 'past_due').length,
    mrr_cents: 0, exceeded_limits: 0, active_impersonations: 0, feature_overrides: 0,
  };
}

// ── Plans ──

export async function getPlans(): Promise<PlanDefinition[]> {
  try {
    const r = await apiRequest<{ items?: PlanDefinition[] } | PlanDefinition[]>('/superadmin/commercial/plans');
    if (Array.isArray(r)) return r;
    if ((r as R).items) return (r as { items: PlanDefinition[] }).items;
  } catch { /* fall through */ }
  try {
    const r = await apiRequest<{ items?: PlanDefinition[] } | PlanDefinition[]>('/platform/billing/plans');
    if (Array.isArray(r)) return r;
    if ((r as R).items) return (r as { items: PlanDefinition[] }).items;
  } catch { /* fall through */ }
  return [
    { code: 'trial', name: 'Trial', description: '14 dagen gratis', is_active: true, price_monthly_cents: 0, price_yearly_cents: 0, currency: 'EUR', limits_json: {}, features_json: {}, sort_order: 1 },
    { code: 'professional', name: 'Professional', description: 'Volledige toegang', is_active: true, price_monthly_cents: 5900, price_yearly_cents: 59290, currency: 'EUR', limits_json: {}, features_json: {}, sort_order: 2 },
    { code: 'enterprise', name: 'Enterprise', description: 'Op maat', is_active: true, price_monthly_cents: 0, price_yearly_cents: 0, currency: 'EUR', limits_json: {}, features_json: {}, sort_order: 3 },
  ];
}

// ── Tenant subscription ──

export async function getTenantSubscription(tenantId: string): Promise<TenantSubscription> {
  try { return await apiRequest<TenantSubscription>(`/superadmin/commercial/tenants/${tenantId}/subscription`); } catch { /* fall through */ }
  const t = await apiRequest<R>(`/platform/tenants/${tenantId}`);
  return {
    tenant_id: s(t.id), plan_code: s(t.plan || t.subscription_plan || 'trial'), plan_name: s(t.plan || 'Trial'),
    status: s(t.status || t.mollie_subscription_status || 'active'), billing_provider: s(t.billing_provider || 'none'),
    provider_customer_id: s(t.mollie_customer_id), provider_subscription_id: s(t.mollie_subscription_id),
    trial_started_at: s(t.trial_started_at) || null, trial_ends_at: s(t.trial_until || t.trial_ends_at) || null,
    current_period_start: null, current_period_end: null,
    cancelled_at: null, suspended_at: null, grace_until: s(t.valid_until) || null,
    currency: 'EUR', amount_cents: n(t.price_per_seat_year_cents), interval: 'yearly',
    notes: '', created_at: s(t.created_at), updated_at: s(t.updated_at || t.created_at),
  };
}

export async function updateTenantSubscription(tenantId: string, payload: Partial<TenantSubscription>): Promise<TenantSubscription> {
  try { return await apiRequest<TenantSubscription>(`/superadmin/commercial/tenants/${tenantId}/subscription`, { method: 'PATCH', body: JSON.stringify(payload) }); }
  catch { return getTenantSubscription(tenantId); }
}

export async function extendTrial(tenantId: string, days: number, reason: string): Promise<void> {
  await apiRequest(`/superadmin/commercial/tenants/${tenantId}/extend-trial`, { method: 'POST', body: JSON.stringify({ days, reason }) });
}

export async function suspendTenant(tenantId: string, reason: string): Promise<void> {
  try { await apiRequest(`/superadmin/commercial/tenants/${tenantId}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }); }
  catch { await apiRequest(`/superadmin/tenants/${tenantId}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }); }
}

export async function reactivateTenant(tenantId: string, reason: string): Promise<void> {
  try { await apiRequest(`/superadmin/commercial/tenants/${tenantId}/reactivate`, { method: 'POST', body: JSON.stringify({ reason }) }); }
  catch { await apiRequest(`/superadmin/tenants/${tenantId}/activate`, { method: 'POST', body: JSON.stringify({ reason }) }); }
}

export async function cancelTenant(tenantId: string, reason: string): Promise<void> {
  await apiRequest(`/superadmin/commercial/tenants/${tenantId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
}

// ── Limits ──

export async function getTenantLimits(tenantId: string): Promise<TenantLimitSummary> {
  try { return await apiRequest<TenantLimitSummary>(`/superadmin/commercial/tenants/${tenantId}/limits`); } catch { /* fall through */ }
  const t = await apiRequest<R>(`/platform/tenants/${tenantId}`).catch(() => ({} as R));
  const limits: TenantLimitRow[] = [
    { key: 'max_users', label: 'Users', limit: n(t.seats_purchased, 10), used: n(t.users_count ?? t.user_count), unlimited: false, source: 'plan', status: 'ok' },
    { key: 'max_projects', label: 'Projects', limit: 50, used: n(t.projects_count ?? t.project_count), unlimited: false, source: 'plan', status: 'ok' },
    { key: 'max_welds', label: 'Welds', limit: 500, used: n(t.welds_count ?? t.weld_count), unlimited: false, source: 'plan', status: 'ok' },
    { key: 'max_storage_mb', label: 'Storage (MB)', limit: 5000, used: 0, unlimited: false, source: 'plan', status: 'ok' },
    { key: 'max_pdf_exports', label: 'PDF exports/maand', limit: 100, used: 0, unlimited: false, source: 'plan', status: 'ok' },
  ];
  limits.forEach((l) => { const pct = l.limit ? (l.used / l.limit) * 100 : 0; l.status = pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'ok'; });
  return { tenant_id: s(t.id || tenantId), plan_code: s(t.plan || 'trial'), limits };
}

export async function updateTenantLimit(tenantId: string, limitKey: string, payload: { limit?: number; unlimited?: boolean }): Promise<void> {
  await apiRequest(`/superadmin/commercial/tenants/${tenantId}/limits/${limitKey}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function resetTenantLimit(tenantId: string, limitKey: string): Promise<void> {
  await apiRequest(`/superadmin/commercial/tenants/${tenantId}/limits/${limitKey}`, { method: 'DELETE' });
}

// ── Feature flags ──

const DEFAULT_FLAGS: FeatureFlag[] = [
  { key: 'ce_dossier', name: 'CE Dossier', description: 'CE dossier management', default_enabled: true, category: 'Core', is_active: true },
  { key: 'pdf_export', name: 'PDF Export', description: 'CE rapport PDF generatie', default_enabled: true, category: 'Core', is_active: true },
  { key: 'weld_photo_uploads', name: 'Foto uploads', description: 'Foto evidence bij lassen', default_enabled: true, category: 'Core', is_active: true },
  { key: 'advanced_reports', name: 'Geavanceerde rapportages', description: 'Uitgebreide rapporten en analyses', default_enabled: false, category: 'Premium', is_active: true },
  { key: 'api_access', name: 'API Access', description: 'REST API integratie', default_enabled: false, category: 'Premium', is_active: true },
  { key: 'billing_portal', name: 'Billing Portal', description: 'Self-service facturatie', default_enabled: true, category: 'Billing', is_active: true },
  { key: 'mobile_inspection', name: 'Mobiele inspectie', description: 'Mobiel inspectieformulier', default_enabled: true, category: 'Core', is_active: true },
  { key: 'support_impersonation_allowed', name: 'Support impersonatie', description: 'Superadmin mag als deze tenant inloggen', default_enabled: true, category: 'Governance', is_active: true },
];

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  try { const r = await apiRequest<{ items?: FeatureFlag[] } | FeatureFlag[]>('/superadmin/governance/features'); return Array.isArray(r) ? r : (r as { items: FeatureFlag[] }).items || []; } catch { return DEFAULT_FLAGS; }
}

export async function getTenantFeatureFlags(tenantId: string): Promise<TenantFeatureFlag[]> {
  try { const r = await apiRequest<{ items?: TenantFeatureFlag[] } | TenantFeatureFlag[]>(`/superadmin/governance/tenants/${tenantId}/features`); return Array.isArray(r) ? r : (r as { items: TenantFeatureFlag[] }).items || []; }
  catch { return DEFAULT_FLAGS.map((f) => ({ feature_key: f.key, enabled: f.default_enabled, source: 'default' as const, name: f.name, category: f.category })); }
}

export async function updateTenantFeatureFlag(tenantId: string, featureKey: string, enabled: boolean): Promise<void> {
  await apiRequest(`/superadmin/governance/tenants/${tenantId}/features/${featureKey}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
}

export async function resetTenantFeatureFlag(tenantId: string, featureKey: string): Promise<void> {
  await apiRequest(`/superadmin/governance/tenants/${tenantId}/features/${featureKey}`, { method: 'DELETE' });
}

// ── Impersonation ──

export async function startImpersonation(tenantId: string, userId: string, reason: string): Promise<ImpersonationSession> {
  return apiRequest<ImpersonationSession>('/superadmin/impersonation/start', { method: 'POST', body: JSON.stringify({ tenant_id: tenantId, user_id: userId, reason }) });
}

export async function stopImpersonation(): Promise<void> {
  await apiRequest('/superadmin/impersonation/stop', { method: 'POST' });
}

export async function getImpersonationSessions(): Promise<ImpersonationSession[]> {
  try { const r = await apiRequest<{ items?: ImpersonationSession[] } | ImpersonationSession[]>('/superadmin/impersonation/sessions'); return Array.isArray(r) ? r : (r as { items: ImpersonationSession[] }).items || []; }
  catch { return []; }
}

// ── Governance audit ──

export async function getGovernanceAuditLog(params?: { tenant_id?: string; action?: string; limit?: number }): Promise<GovernanceAuditEvent[]> {
  const sp = new URLSearchParams();
  if (params?.tenant_id) sp.set('tenant_id', params.tenant_id);
  if (params?.action) sp.set('action', params.action);
  sp.set('limit', String(params?.limit || 100));
  try { const r = await apiRequest<{ items?: GovernanceAuditEvent[] } | GovernanceAuditEvent[]>(`/superadmin/governance/audit-log?${sp}`); return Array.isArray(r) ? r : (r as { items: GovernanceAuditEvent[] }).items || []; }
  catch { return []; }
}
