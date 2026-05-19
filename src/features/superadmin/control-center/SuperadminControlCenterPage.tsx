import { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, Shield } from 'lucide-react';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { getSuperadminHealth, getSuperadminTenants, getTenant360, getSuperadminErrors, getSuperadminOnboarding, type PlatformHealth, type SuperadminTenantSummary, type Tenant360, type SuperadminErrorRow, type OnboardingRow } from '@/api/superadminControlCenter';
import { SuperadminHealthCards } from './SuperadminHealthCards';
import { SuperadminTenantTable } from './SuperadminTenantTable';
import { Tenant360Drawer } from './Tenant360Drawer';
import { SuperadminErrorCenter } from './SuperadminErrorCenter';
import { SuperadminOnboardingCenter } from './SuperadminOnboardingCenter';
import './superadmin-control-center.css';

type Tab = 'health' | 'tenants' | 'errors' | 'onboarding';

export function SuperadminControlCenterPage() {
  const [activeTab, setActiveTab] = useState<Tab>('health');
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [tenants, setTenants] = useState<SuperadminTenantSummary[]>([]);
  const [errors, setErrors] = useState<SuperadminErrorRow[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingRow[]>([]);
  const [tenant360, setTenant360] = useState<Tenant360 | null>(null);
  const [tenant360Open, setTenant360Open] = useState(false);
  const [tenant360Loading, setTenant360Loading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [h, t, e, o] = await Promise.all([
        getSuperadminHealth().catch(() => null),
        getSuperadminTenants().catch(() => []),
        getSuperadminErrors().catch(() => []),
        getSuperadminOnboarding().catch(() => []),
      ]);
      setHealth(h);
      setTenants(t);
      setErrors(e);
      setOnboarding(o);
      setLastUpdated(new Date().toLocaleTimeString('nl-NL'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Control Center kon niet worden geladen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  async function openTenant360(tenantId: string) {
    setTenant360Open(true);
    setTenant360Loading(true);
    setTenant360(null);
    try {
      const data = await getTenant360(tenantId);
      setTenant360(data);
    } catch { setTenant360(null); }
    finally { setTenant360Loading(false); }
  }

  const tabs: Array<{ key: Tab; label: string; count?: number }> = [
    { key: 'health', label: 'Platform Health' },
    { key: 'tenants', label: 'Tenants', count: tenants.length },
    { key: 'errors', label: 'Errors', count: errors.length },
    { key: 'onboarding', label: 'Onboarding', count: onboarding.filter((r) => r.status === 'pending_activation').length },
  ];

  return (
    <MobilePageScaffold
      title="Control Center"
      subtitle="Platform health, tenants, errors en onboarding"
      rightSlot={
        <button type="button" className="mobile-icon-button" onClick={loadAll} disabled={loading} aria-label="Vernieuwen">
          <RefreshCcw size={18} />
        </button>
      }
    >
      <div className="sacc-page">
        <div className="sacc-header-bar">
          <div className="sacc-header-title">
            <Shield size={20} />
            <div>
              <strong>Superadmin Control Center</strong>
              {lastUpdated ? <small>Laatst bijgewerkt: {lastUpdated}</small> : null}
            </div>
          </div>
        </div>

        {error ? <div className="sacc-alert sacc-alert-danger">{error}</div> : null}

        <div className="sacc-nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`sacc-nav-tab${activeTab === tab.key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.count !== undefined ? <span className="sacc-tab-count">{tab.count}</span> : null}
            </button>
          ))}
        </div>

        {loading && !health ? <div className="sacc-state">Control Center laden…</div> : null}

        {activeTab === 'health' && <SuperadminHealthCards health={health} />}
        {activeTab === 'tenants' && <SuperadminTenantTable tenants={tenants} onOpen360={openTenant360} />}
        {activeTab === 'errors' && <SuperadminErrorCenter errors={errors} />}
        {activeTab === 'onboarding' && <SuperadminOnboardingCenter rows={onboarding} onRefresh={loadAll} />}

        <Tenant360Drawer open={tenant360Open} data={tenant360} loading={tenant360Loading} onClose={() => setTenant360Open(false)} />
      </div>
    </MobilePageScaffold>
  );
}

export default SuperadminControlCenterPage;
