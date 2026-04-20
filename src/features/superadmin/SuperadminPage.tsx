/**
 * SuperadminPage — fixes:
 * - Importeert van @/hooks/useTenants (was @/hooks/usePlatform, bestaat niet)
 * - StatCard gebruikt 'title' prop (was 'label')
 * - DataTable gebruikt 'rows' en 'rowKey' (was 'data')
 * - EmptyState heeft 'description' prop nodig
 * - Drawer 'size' prop bestaat niet
 * - Button heeft geen 'size' prop
 * - Geen dubbele function implementatie van TenantStatusBadge
 * - InlineMessage children moet string zijn
 */
import { useState, useMemo } from 'react';
import {
  RefreshCw, Download, ToggleLeft, ToggleRight,
  Mail, Key, Edit2, ShieldAlert,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTable, type ColumnDef } from '@/components/datatable/DataTable';
import { Drawer } from '@/components/drawer/Drawer';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { StatCard } from '@/components/ui/StatCard';
import { useAuthStore } from '@/app/store/auth-store';
// Fix: usePlatform bestaat niet — de functies zitten in useTenants
import {
  useTenants,
  usePlatformSummary,
  useTenantActions,
} from '@/hooks/useTenants';
import { formatDatetime } from '@/utils/format';

type TenantTab = 'algemeen' | 'gebruikers' | 'billing' | 'audit' | 'access';

function TenantStatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
    active:    'success',
    trialing:  'neutral',
    past_due:  'warning',
    suspended: 'danger',
    cancelled: 'neutral',
  };
  const labelMap: Record<string, string> = {
    active:    'Actief',
    trialing:  'Proefperiode',
    past_due:  'Achterstallig',
    suspended: 'Geblokkeerd',
    cancelled: 'Opgezegd',
  };
  const key = (status ?? '').toLowerCase();
  return (
    <Badge tone={toneMap[key] ?? 'neutral'}>
      {labelMap[key] ?? status ?? '—'}
    </Badge>
  );
}

export function SuperadminPage() {
  const user = useAuthStore((s) => s.user);
  const [search,           setSearch]           = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantTab,        setTenantTab]         = useState<TenantTab>('algemeen');

  const summary       = usePlatformSummary();
  const tenants       = useTenants();
  const tenantActions = useTenantActions();

  // Tenant detail via API (eenvoudige fetch, geen aparte hook nodig)
  const [tenantDetail, setTenantDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tenantUsers,  setTenantUsers]   = useState<unknown[]>([]);

  const loadTenantDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const [detailRes, usersRes] = await Promise.all([
        fetch(`/api/v1/platform/tenants/${id}`),
        fetch(`/api/v1/platform/tenants/${id}/users`),
      ]);
      const detail = await detailRes.json();
      const users  = await usersRes.json();
      setTenantDetail(detail);
      setTenantUsers(Array.isArray(users) ? users : users.items ?? []);
    } catch {
      setTenantDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openTenant = (id: string) => {
    setSelectedTenantId(id);
    setTenantTab('algemeen');
    loadTenantDetail(id);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = Array.isArray((tenants.data as any)?.items)
      ? (tenants.data as any).items
      : Array.isArray(tenants.data) ? tenants.data : [];
    return rows.filter((t: Record<string, unknown>) =>
      !q ||
      String(t.name ?? '').toLowerCase().includes(q) ||
      String(t.display_name ?? '').toLowerCase().includes(q)
    );
  }, [tenants.data, search]);

  // DataTable verwacht: columns, rows, rowKey
  const tenantColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Naam',
      cell: (row) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {String(row.display_name ?? row.name ?? '')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {String(row.name ?? '')}
          </div>
        </div>
      ),
    },
    { key: 'plan',  header: 'Plan',  cell: (row) => String(row.plan ?? '—') },
    { key: 'seats', header: 'Seats', cell: (row) => String(row.seats ?? '—') },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <TenantStatusBadge status={String(row.mollie_subscription_status ?? 'active')} />
      ),
    },
    {
      key: 'is_demo',
      header: 'Demo',
      cell: (row) =>
        row.is_demo ? <Badge tone="warning">Demo</Badge> : null,
    },
    {
      key: 'created_at',
      header: 'Aangemaakt',
      cell: (row) => (
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {row.created_at ? formatDatetime(String(row.created_at)) : '—'}
        </span>
      ),
    },
  ];

  if (!user?.is_platform_admin) {
    return <ErrorState message="Geen toegang. Platform admin rechten vereist." />;
  }

  const summaryData = (summary.data ?? {}) as Record<string, unknown>;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Platform beheer</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Tenants, gebruikers, billing en platform-instellingen
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => tenants.refetch()}>
            <RefreshCw size={13} style={{ marginRight: 4 }} /> Vernieuwen
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.open('/api/v1/platform/tenants.csv', '_blank')}
          >
            <Download size={13} style={{ marginRight: 4 }} /> CSV
          </Button>
        </div>
      </div>

      {/* Stats — StatCard gebruikt 'title' niet 'label' */}
      {summary.data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard title="Tenants"         value={Number(summaryData.tenant_count  ?? 0)} />
          <StatCard title="Actief"           value={Number(summaryData.active_count  ?? 0)} />
          <StatCard title="Proefperiode"     value={Number(summaryData.trial_count   ?? 0)} />
          <StatCard title="Exports (actief)" value={Number(summaryData.exports_running ?? 0)} />
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <Input
          placeholder="Zoek op tenantnaam…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 340 }}
        />
      </div>

      {/* DataTable: rows + rowKey (niet data) */}
      {tenants.isLoading ? (
        <LoadingState />
      ) : tenants.isError ? (
        <ErrorState message="Tenants laden mislukt." />
      ) : (
        <DataTable
          columns={tenantColumns}
          rows={filtered}
          rowKey={(row) => String(row.id ?? '')}
          onRowDoubleClick={(row) => openTenant(String(row.id))}
          onRowClick={(row) => openTenant(String(row.id))}
          empty={<EmptyState title="Geen tenants gevonden." description="Pas de zoekopdracht aan." />}
        />
      )}

      {/* Tenant drawer — Drawer heeft geen 'size' prop */}
      <Drawer
        open={Boolean(selectedTenantId)}
        onClose={() => setSelectedTenantId(null)}
        title={String(tenantDetail?.display_name ?? tenantDetail?.name ?? 'Tenant')}
      >
        {detailLoading ? (
          <LoadingState />
        ) : tenantDetail ? (
          <div>
            {/* Tabs */}
            <div style={{
              display: 'flex', gap: 4,
              borderBottom: '0.5px solid var(--color-border-tertiary)',
              marginBottom: 16,
            }}>
              {([
                ['algemeen',   'Algemeen'],
                ['gebruikers', 'Gebruikers'],
                ['billing',    'Billing'],
                ['audit',      'Audit'],
                ['access',     'Toegang'],
              ] as [TenantTab, string][]).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setTenantTab(tab)}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderBottom: tenantTab === tab
                      ? '2px solid var(--color-text-primary)'
                      : '2px solid transparent',
                    fontWeight: tenantTab === tab ? 500 : 400,
                    color: tenantTab === tab
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                    marginBottom: -1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {tenantTab === 'algemeen' && (
              <AlgemeenTab
                tenant={tenantDetail}
                onToggleDemo={async () => {
                  await fetch(`/api/v1/platform/tenants/${selectedTenantId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_demo: !tenantDetail.is_demo }),
                  });
                  loadTenantDetail(selectedTenantId!);
                }}
              />
            )}

            {tenantTab === 'gebruikers' && (
              <GebruikersTab
                tenantId={selectedTenantId!}
                users={tenantUsers}
                onRefresh={() => loadTenantDetail(selectedTenantId!)}
              />
            )}

            {tenantTab === 'billing' && (
              <BillingTab tenant={tenantDetail} />
            )}

            {tenantTab === 'audit' && (
              <AuditTab tenantId={selectedTenantId!} />
            )}

            {tenantTab === 'access' && (
              <AccessTab
                tenant={tenantDetail}
                onOverride={async (mode: string, reason: string) => {
                  await fetch(`/api/v1/platform/tenants/${selectedTenantId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ access_mode: mode }),
                  });
                  loadTenantDetail(selectedTenantId!);
                }}
              />
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}


function AlgemeenTab({ tenant, onToggleDemo }: {
  tenant: Record<string, unknown>;
  onToggleDemo: () => void;
}) {
  const rows = [
    ['Naam',          tenant.name],
    ['Weergavenaam',  tenant.display_name ?? '—'],
    ['Plan',          tenant.plan ?? '—'],
    ['Seats',         tenant.seats ?? '—'],
    ['Status',        tenant.mollie_subscription_status ?? 'active'],
    ['Aangemaakt',    tenant.created_at ? formatDatetime(String(tenant.created_at)) : '—'],
  ] as [string, unknown][];

  return (
    <div>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <td style={{ padding: '8px 0', color: 'var(--color-text-secondary)', width: '35%' }}>
                {label}
              </td>
              <td style={{ padding: '8px 0', fontWeight: 500 }}>{String(value ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Demo toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 12, background: 'var(--color-background-secondary)',
        borderRadius: 'var(--border-radius-md)',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Demo-modus</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Demo-tenants krijgen een badge en kunnen worden voorzien van testdata.
          </div>
        </div>
        <button onClick={onToggleDemo}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          {tenant.is_demo
            ? <ToggleRight size={28} style={{ color: 'var(--color-text-warning)' }} />
            : <ToggleLeft  size={28} style={{ color: 'var(--color-text-secondary)' }} />
          }
        </button>
      </div>
    </div>
  );
}


function GebruikersTab({ tenantId, users, onRefresh }: {
  tenantId: string;
  users: unknown[];
  onRefresh: () => void;
}) {
  const roleTone: Record<string, 'danger' | 'warning' | 'neutral'> = {
    platform_admin: 'danger',
    tenant_admin:   'warning',
  };

  const sendAction = async (userId: string, action: string) => {
    await fetch(`/api/v1/platform/tenants/${tenantId}/users/${userId}/${action}`, { method: 'POST' });
    onRefresh();
  };

  if (users.length === 0) {
    return <EmptyState title="Geen gebruikers." description="Er zijn nog geen gebruikers gekoppeld aan deze tenant." />;
  }

  return (
    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          {['Naam / E-mail', 'Rol', 'Acties'].map((h) => (
            <th key={h} style={{ padding: '6px 8px', textAlign: 'left',
                                  fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(users as Record<string, unknown>[]).map((u) => (
          <tr key={String(u.id)} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <td style={{ padding: '8px' }}>
              <div style={{ fontWeight: 500 }}>{String(u.name ?? u.email ?? '')}</div>
              {u.name && (
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  {String(u.email ?? '')}
                </div>
              )}
            </td>
            <td style={{ padding: '8px' }}>
              <Badge tone={roleTone[String(u.role ?? '')] ?? 'neutral'}>
                {String(u.role ?? '—')}
              </Badge>
            </td>
            <td style={{ padding: '8px' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button title="Uitnodiging opnieuw sturen"
                        onClick={() => sendAction(String(u.id), 'resend-invite')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                                 color: 'var(--color-text-secondary)' }}>
                  <Mail size={13} />
                </button>
                <button title="Wachtwoord resetten"
                        onClick={() => sendAction(String(u.id), 'reset-password')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                                 color: 'var(--color-text-secondary)' }}>
                  <Key size={13} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


function BillingTab({ tenant }: { tenant: Record<string, unknown> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <StatCard title="Plan"  value={String(tenant.plan ?? '—')} />
        <StatCard title="Seats" value={Number(tenant.seats ?? 0)} />
      </div>
      <Card>
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>Mollie klant-ID: <strong>{String(tenant.mollie_customer_id ?? 'Niet gekoppeld')}</strong></div>
          <div>Abonnement-ID: <strong>{String(tenant.mollie_subscription_id ?? '—')}</strong></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Status: <TenantStatusBadge status={String(tenant.mollie_subscription_status ?? 'active')} />
          </div>
        </div>
      </Card>
    </div>
  );
}


function AuditTab({ tenantId }: { tenantId: string }) {
  const [logs,    setLogs]    = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/platform/tenants/${tenantId}/audit?limit=50`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load op mount
  useState(() => { load(); });

  return loading ? <LoadingState /> : (
    <div>
      <Button variant="secondary" onClick={load} style={{ marginBottom: 10 }}>
        <RefreshCw size={12} style={{ marginRight: 4 }} /> Vernieuwen
      </Button>
      {logs.length === 0 ? (
        <EmptyState title="Geen audit-logs." description="Er zijn nog geen acties gelogd voor deze tenant." />
      ) : (
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              {['Tijdstip', 'Actie', 'Gebruiker', 'IP'].map((h) => (
                <th key={h} style={{ padding: '5px 8px', textAlign: 'left',
                                      color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(logs as Record<string, unknown>[]).map((log) => (
              <tr key={String(log.id)} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>
                  {log.created_at ? formatDatetime(String(log.created_at)) : '—'}
                </td>
                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{String(log.action ?? '')}</td>
                <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>
                  {String(log.user_id ?? '—').substring(0, 8)}
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>
                  {String(log.ip ?? '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


function AccessTab({ tenant, onOverride }: {
  tenant: Record<string, unknown>;
  onOverride: (mode: string, reason: string) => void;
}) {
  const [mode,   setMode]   = useState(String(tenant.access_mode ?? 'full_access'));
  const [reason, setReason] = useState('');

  const modes = [
    { value: 'full_access', label: 'Volledige toegang' },
    { value: 'read_only',   label: 'Alleen lezen' },
    { value: 'blocked',     label: 'Geblokkeerd' },
  ];

  const modeTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
    full_access: 'success',
    read_only:   'warning',
    blocked:     'danger',
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Huidige modus</div>
        <Badge tone={modeTone[mode] ?? 'neutral'}>
          {modes.find((m) => m.value === mode)?.label ?? mode}
        </Badge>
      </div>

      <Card>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
          Toegangsmodus overschrijven
        </div>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Nieuwe modus</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            {modes.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Reden (intern)</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="bijv. Betaling achterstallig, handmatig geblokkeerd"
          />
        </label>
        <Button
          variant="primary"
          onClick={() => onOverride(mode, reason)}
          disabled={!reason.trim()}
        >
          <ShieldAlert size={13} style={{ marginRight: 4 }} />
          Toegang instellen
        </Button>
      </Card>
    </div>
  );
}

export default SuperadminPage;
