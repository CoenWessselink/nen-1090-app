import { useCallback, useEffect, useState } from 'react';
import { CreditCard, FileText, Flag, Gauge, Key, RefreshCcw, Shield, Sliders } from 'lucide-react';
import { apiRequest } from '@/api/client';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import {
  getTenantSubscription, getTenantLimits, getTenantFeatureFlags, getGovernanceAuditLog,
  type TenantSubscription, type TenantLimitSummary, type TenantFeatureFlag, type GovernanceAuditEvent,
} from '@/api/superadminCommercialGovernance';
import { TenantSubscriptionPanel } from './TenantSubscriptionPanel';
import { TenantLimitsPanel } from './TenantLimitsPanel';
import { TenantFeatureFlagsPanel } from './TenantFeatureFlagsPanel';
import { GovernanceAuditLog } from './GovernanceAuditLog';
import './commercial-governance.css';

type Tab = 'overview' | 'subscription' | 'limits' | 'features' | 'audit';
type TenantRow = { id: string; name: string; display_name: string; status: string; plan: string; seats: number; is_active: boolean; created_at: string };

function statusTone(s: string) { if (s === 'active') return 'success'; if (s.includes('suspend') || s.includes('cancel') || s === 'past_due' || s === 'deleted') return 'danger'; if (s === 'trial' || s === 'trialing') return 'warning'; return 'neutral'; }

export function SuperadminCommercialGovernancePage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
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

  const loadTenants = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiRequest<{ tenants?: TenantRow[]; items?: TenantRow[] }>('/superadmin/tenants?limit=250');
      const rows = (data.tenants || data.items || []) as TenantRow[];
      setTenants(rows);
    } catch (err) { setError(err instanceof Error ? err.message : 'Laden mislukt.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadTenants(); }, [loadTenants]);

  async function selectTenant(tenantId: string) {
    if (!tenantId) return;
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

  const filteredTenants = tenants.filter((t) => {
    const q = search.trim().toLowerCase();
    return !q || `${t.display_name} ${t.name} ${t.id} ${t.status} ${t.plan}`.toLowerCase().includes(q);
  });

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const activeTenants = tenants.filter((t) => t.status === 'active' || (t.is_active && t.status !== 'trial')).length;
  const trialTenants = tenants.filter((t) => t.status === 'trial' || t.status === 'trialing').length;
  const suspendedTenants = tenants.filter((t) => t.status === 'suspended' || t.status === 'deleted').length;

  const tabs: Array<{ key: Tab; label: string; icon: typeof CreditCard }> = [
    { key: 'overview', label: 'Overzicht', icon: Shield },
    { key: 'subscription', label: 'Subscription', icon: CreditCard },
    { key: 'limits', label: 'Limieten', icon: Sliders },
    { key: 'features', label: 'Features', icon: Flag },
    { key: 'audit', label: 'Audit Log', icon: Key },
  ];

  return (
    <MobilePageScaffold title="Commercial & Governance" subtitle="Billing, limieten, features en support" rightSlot={<button type="button" className="mobile-icon-button" onClick={loadTenants} disabled={loading}><RefreshCcw size={18} /></button>}>
      <div className="cg-page">
        <div className="cg-superadmin-nav" aria-label="Superadmin modules">
          <a className="mobile-secondary-button" href="/superadmin"><Gauge size={16} /> Control Center</a>
          <a className="mobile-primary-button" href="/superadmin/commercial-governance"><Shield size={16} /> Commercial en Governance</a>
          <a className="mobile-secondary-button" href="/superadmin/invoices"><FileText size={16} /> Billing</a>
        </div>

        <div className="cg-kpi-grid">
          <div className="cg-kpi"><span>Active</span><strong>{activeTenants}</strong></div>
          <div className="cg-kpi"><span>Trial</span><strong>{trialTenants}</strong></div>
          <div className="cg-kpi"><span>Suspended</span><strong>{suspendedTenants}</strong></div>
          <div className="cg-kpi"><span>Totaal</span><strong>{tenants.length}</strong></div>
        </div>

        {error ? <div className="cg-alert cg-alert-danger">{error}</div> : null}

        <div className="cg-tenant-selector">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek tenant…" className="cg-search" />
          <div className="cg-tenant-list">
            {loading ? <div className="cg-empty">Tenants laden…</div> : null}
            {filteredTenants.map((t) => (
              <button key={t.id} type="button" className={`cg-tenant-row${selectedTenantId === t.id ? ' is-active' : ''}`} onClick={() => selectTenant(t.id)}>
                <strong>{t.display_name || t.name}</strong>
                <span className={`cg-badge cg-badge-${statusTone(t.status)}`}>{t.status}</span>
                <small>{t.plan || '—'} · {t.seats || 1} seats</small>
              </button>
            ))}
            {!loading && !filteredTenants.length && <div className="cg-empty">Geen tenants gevonden.</div>}
          </div>
        </div>

        {selectedTenantId && selectedTenant && (
          <>
            <div className="cg-detail-header">
              <strong>{selectedTenant.display_name || selectedTenant.name}</strong>
              <span className={`cg-badge cg-badge-${statusTone(selectedTenant.status)}`}>{selectedTenant.status}</span>
            </div>
            <div className="cg-tabs">
              {tabs.map((t) => { const Icon = t.icon; return (
                <button key={t.key} type="button" className={`cg-tab${tab === t.key ? ' is-active' : ''}`} onClick={() => setTab(t.key)}><Icon size={14} /> {t.label}</button>
              ); })}
            </div>

            {detailLoading ? <div className="cg-state">Laden…</div> : (
              <>
                {tab === 'overview' && (
                  <div className="cg-section">
                    <h3>Tenant overzicht</h3>
                    <table className="cg-table cg-table-kv">
                      <tbody>
                        <tr><td>Naam</td><td><strong>{selectedTenant.display_name || selectedTenant.name}</strong></td></tr>
                        <tr><td>ID</td><td><strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{selectedTenant.id}</strong></td></tr>
                        <tr><td>Status</td><td><strong>{selectedTenant.status}</strong></td></tr>
                        <tr><td>Plan</td><td><strong>{selectedTenant.plan || '—'}</strong></td></tr>
                        <tr><td>Seats</td><td><strong>{selectedTenant.seats || 1}</strong></td></tr>
                        <tr><td>Aangemaakt</td><td><strong>{selectedTenant.created_at ? new Date(selectedTenant.created_at).toLocaleDateString('nl-NL') : '—'}</strong></td></tr>
                      </tbody>
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

        {!selectedTenantId && !loading && <div className="cg-state">Selecteer een tenant om details te bekijken.</div>}
      </div>
    </MobilePageScaffold>
  );
}

export default SuperadminCommercialGovernancePage;
