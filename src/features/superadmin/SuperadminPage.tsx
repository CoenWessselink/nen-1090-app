import { useState, useMemo } from 'react';
import {
  Building2, Users, CreditCard, Activity, ShieldAlert,
  Plus, RefreshCw, Download, ToggleLeft, ToggleRight, Mail,
  Key, Trash2, Edit2,
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
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { StatCard } from '@/components/ui/StatCard';
import { useSession } from '@/app/session/SessionContext';
import {
  usePlatformSummary,
  useTenantActions,
  useTenants,
  useTenantDetail,
  useTenantUsers,
  useTenantUserActions,
} from '@/hooks/usePlatform';
import { formatDatetime } from '@/utils/format';

type TenantTab = 'algemeen' | 'gebruikers' | 'billing' | 'audit' | 'access';

function TenantStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'success', trialing: 'info', past_due: 'warning',
    suspended: 'danger', cancelled: 'secondary',
  };
  const labels: Record<string, string> = {
    active: 'Actief', trialing: 'Proefperiode', past_due: 'Achterstallig',
    suspended: 'Geblokkeerd', cancelled: 'Opgezegd',
  };
  return (
    <Badge tone={(map[status] ?? 'secondary') as any}>
      {labels[status] ?? status}
    </Badge>
  );
}

export function SuperadminPage() {
  const { user } = useSession();
  const [search, setSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantTab, setTenantTab] = useState<TenantTab>('algemeen');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userEditOpen, setUserEditOpen] = useState(false);

  const summary = usePlatformSummary();
  const tenants = useTenants();
  const tenantDetail = useTenantDetail(selectedTenantId ?? '');
  const tenantUsers = useTenantUsers(selectedTenantId ?? '');
  const tenantActions = useTenantActions();
  const userActions = useTenantUserActions(selectedTenantId ?? '');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (tenants.data ?? []).filter(
      (t: any) =>
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.display_name?.toLowerCase().includes(q)
    );
  }, [tenants.data, search]);

  const tenantColumns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Naam',
      cell: (row) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{row.display_name ?? row.name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{row.name}</div>
        </div>
      ),
    },
    { key: 'plan', header: 'Plan', cell: (row) => row.plan ?? '—' },
    { key: 'seats', header: 'Seats', cell: (row) => row.seats ?? '—' },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <TenantStatusBadge status={row.mollie_subscription_status ?? 'active'} />,
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
          {formatDatetime(row.created_at)}
        </span>
      ),
    },
  ];

  const openTenant = (id: string) => {
    setSelectedTenantId(id);
    setTenantTab('algemeen');
  };

  if (!user?.is_platform_admin) {
    return <ErrorState message="Geen toegang. Platform admin rechten vereist." />;
  }

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
            <Download size={13} style={{ marginRight: 4 }} /> CSV exporteren
          </Button>
        </div>
      </div>

      {/* Stats */}
      {summary.data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Tenants" value={summary.data.tenant_count ?? 0} />
          <StatCard label="Actief" value={summary.data.active_count ?? 0} />
          <StatCard label="Proefperiode" value={summary.data.trial_count ?? 0} />
          <StatCard label="Exports (actief)" value={summary.data.exports_running ?? 0} />
        </div>
      )}

      {/* Zoeken */}
      <div style={{ marginBottom: 12 }}>
        <Input
          placeholder="Zoek op tenantnaam…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 340 }}
        />
      </div>

      {/* Tenantlijst — dubbelklik opent detail */}
      {tenants.isLoading ? (
        <LoadingState />
      ) : tenants.isError ? (
        <ErrorState message="Tenants laden mislukt." />
      ) : (
        <DataTable
          columns={tenantColumns}
          data={filtered}
          onRowDoubleClick={(row) => openTenant(row.id)}
          onRowClick={(row) => openTenant(row.id)}
          emptyState={<EmptyState title="Geen tenants gevonden." />}
        />
      )}

      {/* Tenant detail drawer */}
      <Drawer
        open={!!selectedTenantId}
        onClose={() => setSelectedTenantId(null)}
        title={tenantDetail.data?.display_name ?? tenantDetail.data?.name ?? 'Tenant'}
        size="large"
      >
        {tenantDetail.isLoading ? (
          <LoadingState />
        ) : tenantDetail.isError ? (
          <ErrorState message="Tenant-details laden mislukt." />
        ) : tenantDetail.data ? (
          <div>
            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 4,
                borderBottom: '0.5px solid var(--color-border-tertiary)',
                marginBottom: 16,
                paddingBottom: 0,
              }}
            >
              {([
                ['algemeen', 'Algemeen'],
                ['gebruikers', 'Gebruikers'],
                ['billing', 'Billing'],
                ['audit', 'Audit'],
                ['access', 'Toegang'],
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

            {/* Tab: Algemeen */}
            {tenantTab === 'algemeen' && (
              <TenantAlgemeenTab
                tenant={tenantDetail.data}
                onToggleDemo={async () => {
                  await tenantActions.patch(tenantDetail.data.id, {
                    is_demo: !tenantDetail.data.is_demo,
                  });
                  tenantDetail.refetch();
                }}
              />
            )}

            {/* Tab: Gebruikers */}
            {tenantTab === 'gebruikers' && (
              <TenantUsersTab
                tenantId={selectedTenantId!}
                users={tenantUsers.data ?? []}
                loading={tenantUsers.isLoading}
                onResendInvite={async (userId) => {
                  await userActions.resendInvite(userId);
                }}
                onResetPassword={async (userId) => {
                  await userActions.resetPassword(userId);
                }}
                onDoubleClick={(user) => {
                  setSelectedUserId(user.id);
                  setUserEditOpen(true);
                }}
              />
            )}

            {/* Tab: Billing */}
            {tenantTab === 'billing' && (
              <TenantBillingTab tenantId={selectedTenantId!} tenant={tenantDetail.data} />
            )}

            {/* Tab: Audit */}
            {tenantTab === 'audit' && (
              <TenantAuditTab tenantId={selectedTenantId!} />
            )}

            {/* Tab: Toegang */}
            {tenantTab === 'access' && (
              <TenantAccessTab
                tenant={tenantDetail.data}
                onOverride={async (mode: string, reason: string) => {
                  await tenantActions.patch(tenantDetail.data.id, {
                    access_mode: mode,
                    access_override_reason: reason,
                  });
                  tenantDetail.refetch();
                }}
              />
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}


function TenantAlgemeenTab({ tenant, onToggleDemo }: { tenant: any; onToggleDemo: () => void }) {
  const fields = [
    ['Naam', tenant.name],
    ['Weergavenaam', tenant.display_name],
    ['Plan', tenant.plan ?? '—'],
    ['Seats', tenant.seats ?? '—'],
    ['Status', tenant.mollie_subscription_status ?? 'active'],
    ['ISO-5817', tenant.iso5817_level ?? 'C'],
    ['Aangemaakt', formatDatetime(tenant.created_at)],
  ];
  return (
    <div>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          {fields.map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <td style={{ padding: '8px 0', color: 'var(--color-text-secondary)', width: '35%' }}>
                {label}
              </td>
              <td style={{ padding: '8px 0', fontWeight: 500 }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Demo-mode toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px',
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--border-radius-md)',
          marginTop: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Demo-modus</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Demo-tenants krijgen een badge en kunnen worden voorzien van seed-data.
          </div>
        </div>
        <button
          onClick={onToggleDemo}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          {tenant.is_demo ? (
            <ToggleRight size={28} style={{ color: 'var(--color-text-warning)' }} />
          ) : (
            <ToggleLeft size={28} style={{ color: 'var(--color-text-secondary)' }} />
          )}
        </button>
      </div>
    </div>
  );
}


function TenantUsersTab({
  tenantId, users, loading, onResendInvite, onResetPassword, onDoubleClick,
}: {
  tenantId: string;
  users: any[];
  loading: boolean;
  onResendInvite: (id: string) => void;
  onResetPassword: (id: string) => void;
  onDoubleClick: (user: any) => void;
}) {
  const roleBadge: Record<string, string> = {
    platform_admin: 'danger', tenant_admin: 'warning',
    planner: 'info', qc: 'info', inspector: 'secondary', tenant_user: 'secondary',
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      {users.length === 0 ? (
        <EmptyState title="Geen gebruikers." />
      ) : (
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              {['Naam / E-mail', 'Rol', 'Acties'].map((h) => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left',
                                     fontWeight: 500, color: 'var(--color-text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr
                key={u.id}
                style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', cursor: 'pointer' }}
                onDoubleClick={() => onDoubleClick(u)}
                title="Dubbelklik om te bewerken"
              >
                <td style={{ padding: '8px' }}>
                  <div style={{ fontWeight: 500 }}>{u.name ?? u.email}</div>
                  {u.name && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{u.email}</div>}
                </td>
                <td style={{ padding: '8px' }}>
                  <Badge tone={(roleBadge[u.role] ?? 'secondary') as any}>{u.role ?? '—'}</Badge>
                </td>
                <td style={{ padding: '8px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      title="Uitnodiging opnieuw sturen"
                      onClick={() => onResendInvite(u.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3,
                               color: 'var(--color-text-secondary)' }}
                    >
                      <Mail size={13} />
                    </button>
                    <button
                      title="Wachtwoord resetten"
                      onClick={() => onResetPassword(u.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3,
                               color: 'var(--color-text-secondary)' }}
                    >
                      <Key size={13} />
                    </button>
                    <button
                      title="Bewerken (dubbelklik)"
                      onClick={() => onDoubleClick(u)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3,
                               color: 'var(--color-text-secondary)' }}
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


function TenantBillingTab({ tenantId, tenant }: { tenantId: string; tenant: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <StatCard label="Plan" value={tenant.plan ?? '—'} />
        <StatCard label="Seats" value={tenant.seats ?? 0} />
      </div>
      <Card>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Mollie klant-ID: <strong>{tenant.mollie_customer_id ?? 'Niet gekoppeld'}</strong>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Abonnement-ID: <strong>{tenant.mollie_subscription_id ?? '—'}</strong>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Status: <TenantStatusBadge status={tenant.mollie_subscription_status ?? 'active'} />
        </div>
      </Card>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
        Gedetailleerd betalingsbeheer is beschikbaar via het Mollie-dashboard.
      </div>
    </div>
  );
}


function TenantAuditTab({ tenantId }: { tenantId: string }) {
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/platform/tenants/${tenantId}/audit?limit=50`);
      const data = await res.json();
      setAudit(Array.isArray(data) ? data : data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useState(() => { load(); });

  return loading ? <LoadingState /> : (
    <div>
      <Button variant="secondary" size="sm" onClick={load} style={{ marginBottom: 10 }}>
        <RefreshCw size={12} style={{ marginRight: 4 }} /> Vernieuwen
      </Button>
      {audit.length === 0 ? (
        <EmptyState title="Geen audit-logs beschikbaar." />
      ) : (
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              {['Tijdstip', 'Actie', 'Gebruiker', 'IP'].map((h) => (
                <th key={h} style={{ padding: '5px 8px', textAlign: 'left',
                                     color: 'var(--color-text-secondary)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {audit.slice(0, 50).map((log: any) => (
              <tr key={log.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>
                  {formatDatetime(log.created_at)}
                </td>
                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{log.action}</td>
                <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>
                  {log.user_id?.substring(0, 8) ?? '—'}
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>
                  {log.ip ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


function TenantAccessTab({ tenant, onOverride }: {
  tenant: any;
  onOverride: (mode: string, reason: string) => void;
}) {
  const [mode, setMode] = useState(tenant.access_mode ?? 'full_access');
  const [reason, setReason] = useState('');

  const modes = [
    { value: 'full_access', label: 'Volledige toegang' },
    { value: 'read_only', label: 'Alleen lezen' },
    { value: 'blocked', label: 'Geblokkeerd' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Huidige toegangsmodus</div>
        <Badge tone={mode === 'full_access' ? 'success' : mode === 'blocked' ? 'danger' : 'warning'}>
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
            {modes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
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

// Helper voor TenantStatusBadge in de tab
function TenantStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'success', trialing: 'info', past_due: 'warning',
    suspended: 'danger', cancelled: 'secondary',
  };
  return <Badge tone={(map[status] ?? 'secondary') as any}>{status}</Badge>;
}

export default SuperadminPage;
