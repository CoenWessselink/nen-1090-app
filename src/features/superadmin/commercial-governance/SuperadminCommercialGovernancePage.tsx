import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Flag, Key, RefreshCcw, Shield, Sliders } from 'lucide-react';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import {
  getCommercialOverview, getPlans, getTenantSubscription, getTenantLimits, getTenantFeatureFlags, getGovernanceAuditLog,
  type CommercialOverview, type PlanDefinition, type TenantSubscription, type TenantLimitSummary, type TenantFeatureFlag, type GovernanceAuditEvent,
} from '@/api/superadminCommercialGovernance';
import { getSuperadminTenants as getTenantsFromCC } from '@/api/superadminControlCenter';
import { TenantSubscriptionPanel } from './TenantSubscriptionPanel';
import { TenantLimitsPanel } from './TenantLimitsPanel';
import { TenantFeatureFlagsPanel } from './TenantFeatureFlagsPanel';
import { GovernanceAuditLog } from './GovernanceAuditLog';
import './commercial-governance.css';

type Tab = 'overview' | 'subscription' | 'limits' | 'features' | 'audit';
type SuperadminTenantSummary2 = { tenant_id: string; tenant_name: string; status: string; plan: string };

function statusTone(s: string) { if (s === 'active') return 'success'; if (s.includes('suspend') || s.includes('cancel') || s === 'past_due') return 'danger'; if (s === 'trial' || s === 'trialing') return 'warning'; return 'neutral'; }

export function SuperadminCommercialGovernancePage() {
  const [overview, setOverview] = useState<CommercialOverview | null>(null);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [tenants, setTenants] = useState<SuperadminTenantSummary2[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [limits, setLimits] = useState<TenantLimitSummary | null>(null);
  const [features, setFeatures] = useState<TenantFeatureFlag[]>([]);
  const [audit, setAudit] = useState<GovernanceAuditEvent[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ov, pl, te] = await Promise.all([
        getCommercialOverview().catch(() => null),
        getPlans().catch(() => []),
        getTenantsFromCC().catch(() => []),
      ]);
      setOverview(ov);
      setPlans(pl);
      setTenants(te.map((t) => ({ tenant_id: t.tenant_id, tenant_name: t.tenant_name, status: t.status, plan: t.plan })));
    } catch (err) { setError(err instanceof Error ? err.message : 'Laden mislukt.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  async function selectTenant(tenantId: string) {
    setSelectedTenantId(tenantId); setDetailLoading(true); setTab('subscription');
    try {
      const [sub, lim, feat, au] = await Promise.all([
        getTenantSubscription(tenantId).catch(() => null),
        getTenantLimits(tenantId).catch(() => null),
        getTenantFeatureFlags(tenantId).catch(() => []),
        getGovernanceAuditLog({ tenant_id: tenantId, limit: 50 }).catch(() => []),
      ]);
      setSubscription(sub); setLimits(lim); setFeatures(feat); setAudit(au);
    } catch { /* */ }
    finally { setDetailLoading(false); }
  }

  const filteredTenants = tenants.filter((t) => { const q = search.trim().toLowerCase(); return !q || `${t.tenant_name} ${t.tenant_id} ${t.status} ${t.plan}`.toLowerCase().includes(q); });
  const selectedTenantName = tenants.find((t) => t.tenant_id === selectedTenantId)?.tenant_name || '';

  const tabs: Array<{ key: Tab; label: string; icon: typeof CreditCard }> = [
    { key: 'overview', label: 'Overzicht', icon: Shield },
    { key: 'subscription', label: 'Abonnement', icon: CreditCard },
    { key: 'limits', label: 'Limieten', icon: Sliders },
    { key: 'features', label: 'Features', icon: Flag },
    { key: 'audit', label: 'Audit Log', icon: Key },
  ];

  return (
    <MobilePageScaffold title="Commercial & Governance" subtitle="Billing, limieten, features en support" rightSlot={<button type="button" className="mobile-icon-button" onClick={loadAll} disabled={loading}><RefreshCcw size={18} /></button>}>
      <div className="cg-page">
        {error ? <div className="cg-alert cg-alert-danger">{error}</div> : null}

        {/* Overview cards */}
        {overview && (
          <div className="cg-kpi-grid">
            <div className="cg-kpi"><span>Active</span><strong>{overview.active_tenants}</strong></div>
            <div className="cg-kpi"><span>Trial</span><strong>{overview.trial_tenants}</strong></div>
            <div className="cg-kpi"><span>Suspended</span><strong>{overview.suspended_tenants}</strong></div>
            <div className="cg-kpi"><span>Past due</span><strong>{overview.past_due_tenants}</strong></div>
          </div>
        )}

        {/* Tenant selector */}
        <div className="cg-tenant-selector">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek tenant…" className="cg-search" />
          <div className="cg-tenant-list">
            {filteredTenants.map((t) => (
              <button key={t.tenant_id} type="button" className={`cg-tenant-row${selectedTenantId === t.tenant_id ? ' is-active' : ''}`} onClick={() => selectTenant(t.tenant_id)}>
                <strong>{t.tenant_name || t.tenant_id}</strong>
                <span className={`cg-badge cg-badge-${statusTone(t.status)}`}>{t.status}</span>
                <small>{t.plan}</small>
              </button>
            ))}
            {!filteredTenants.length && <div className="cg-empty">Geen tenants gevonden.</div>}
          </div>
        </div>

        {/* Detail tabs */}
        {selectedTenantId && (
          <>
            <div className="cg-detail-header">
              <strong>{selectedTenantName || selectedTenantId}</strong>
            </div>
            <div className="cg-tabs">
              {tabs.map((t) => { const Icon = t.icon; return (
                <button key={t.key} type="button" className={`cg-tab${tab === t.key ? ' is-active' : ''}`} onClick={() => setTab(t.key)}><Icon size={14} /> {t.label}</button>
              ); })}
            </div>

            {detailLoading ? <div className="cg-state">Laden…</div> : (
              <>
                {tab === 'overview' && overview && (
                  <div className="cg-section">
                    <h3>Plan definities</h3>
                    <table className="cg-table">
                      <thead><tr><th>Plan</th><th>Maand</th><th>Jaar</th><th>Status</th></tr></thead>
                      <tbody>{plans.map((p) => (
                        <tr key={p.code}><td><strong>{p.name}</strong><small>{p.code}</small></td><td>€{(p.price_monthly_cents / 100).toFixed(2)}</td><td>€{(p.price_yearly_cents / 100).toFixed(2)}</td><td><span className={`cg-badge cg-badge-${p.is_active ? 'success' : 'neutral'}`}>{p.is_active ? 'Actief' : 'Inactief'}</span></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
                {tab === 'subscription' && <TenantSubscriptionPanel tenantId={selectedTenantId} subscription={subscription} onRefresh={() => selectTenant(selectedTenantId)} />}
                {tab === 'limits' && <TenantLimitsPanel tenantId={selectedTenantId} limits={limits} onRefresh={() => selectTenant(selectedTenantId)} />}
                {tab === 'features' && <TenantFeatureFlagsPanel tenantId={selectedTenantId} features={features} onRefresh={() => selectTenant(selectedTenantId)} />}
                {tab === 'audit' && <GovernanceAuditLog events={audit} />}
              </>
            )}
          </>
        )}
      </div>
    </MobilePageScaffold>
  );
}

export default SuperadminCommercialGovernancePage;
