import { FormEvent, useMemo, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  Building2,
  CreditCard,
  Download,
  LogIn,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Drawer } from '@/components/drawer/Drawer';
import { DataTable, type ColumnDef } from '@/components/datatable/DataTable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { ConfirmActionDialog } from '@/components/dialogs/ConfirmActionDialog';
import { StatCard } from '@/components/ui/StatCard';
import { useSession } from '@/app/session/SessionContext';
import { useAuthStore } from '@/app/store/auth-store';
import { useUiStore } from '@/app/store/ui-store';
import { useExitImpersonation, useImpersonateTenant, usePlatformSummary, useTenantActions, useTenants } from '@/hooks/useTenants';
import { useTenantAudit, useTenantBillingPanel, useTenantDetail, useTenantUserActions, useTenantUsers } from '@/hooks/useTenantAdmin';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useTenantBillingDetail, useTenantPayments } from '@/hooks/usePlatformBilling';
import type { AuditSummary, BillingPayment, PlatformSummary, Tenant, TenantCreateInput, TenantUser, TenantUserCreateInput } from '@/types/domain';
import { formatDatetime, toneFromStatus } from '@/utils/format';

const detailTabs = [
  { value: 'samenvatting', label: 'Samenvatting' },
  { value: 'gebruikers', label: 'Gebruikers' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'status', label: 'Statusbeheer' },
];

function parseStatus(tenant: Tenant): 'active' | 'inactive' | 'suspended' | 'trial' {
  const source = String(tenant.status || tenant.subscription_status || '').toLowerCase();
  if (source.includes('suspend')) return 'suspended';
  if (source.includes('trial')) return 'trial';
  if (source.includes('inactive') || source.includes('disabled') || tenant.is_active === false) return 'inactive';
  if (source.includes('active') || tenant.is_active === true) return 'active';
  return tenant.is_active === false ? 'inactive' : 'trial';
}

function statusLabel(status: ReturnType<typeof parseStatus>): string {
  if (status === 'active') return 'Actief';
  if (status === 'inactive') return 'Inactief';
  if (status === 'suspended') return 'Gesuspendeerd';
  return 'Trial';
}

function displayUsers(tenant: Tenant): number {
  return Number(tenant.users_count ?? tenant.user_count ?? 0);
}

function formatCents(value: unknown): string {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount / 100);
}

function text(value: unknown, fallback = '—'): string {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function metaToString(meta: unknown): string {
  if (!meta) return '—';
  if (typeof meta === 'string') return meta;
  try {
    return JSON.stringify(meta);
  } catch {
    return '—';
  }
}

export function SuperadminPage() {
  const session = useSession();
  const health = useSystemHealth();
  const tenants = useTenants(true, { page: 1, limit: 200 });
  const platformSummary = usePlatformSummary(true);
  const tenantActions = useTenantActions();
  const impersonate = useImpersonateTenant();
  const exitImpersonation = useExitImpersonation();
  const startImpersonation = useAuthStore((state) => state.startImpersonation);
  const currentUser = useAuthStore((state) => state.user);
  const pushNotification = useUiStore((state) => state.pushNotification);

  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended' | 'trial'>('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [detailTab, setDetailTab] = useState('samenvatting');
  const [tenantPage, setTenantPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [createTenantOpen, setCreateTenantOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'activate' | 'deactivate' | 'suspend' | 'reactivate' | 'trial' | 'force-logout'; tenant: Tenant } | null>(null);

  const [tenantForm, setTenantForm] = useState<TenantCreateInput>({
    name: '',
    status: 'trial',
    is_active: true,
    seats_purchased: 5,
    price_per_seat_year_cents: 0,
    billing_provider: 'none',
    trial_days: 14,
    create_admin: {
      email: '',
      password: '',
      role: 'tenant_admin',
      is_active: true,
    },
  });

  const [tenantUserForm, setTenantUserForm] = useState<TenantUserCreateInput>({
    email: '',
    password: '',
    role: 'viewer',
    is_active: true,
  });

  const tenantRows = tenants.data?.items || [];
  const filteredRows = useMemo(() => {
    return tenantRows.filter((tenant) => {
      const status = parseStatus(tenant);
      const haystack = `${tenant.name || ''} ${tenant.id || ''} ${tenant.status || ''} ${tenant.subscription_status || ''}`.toLowerCase();
      const queryMatch = haystack.includes(search.trim().toLowerCase());
      const filterMatch = statusFilter === 'all' ? true : status === statusFilter;
      return queryMatch && filterMatch;
    });
  }, [search, statusFilter, tenantRows]);

  const pagedTenantRows = useMemo(
    () => filteredRows.slice((tenantPage - 1) * 10, tenantPage * 10),
    [filteredRows, tenantPage],
  );

  const summary = platformSummary.data || {
    total_tenants: tenantRows.length,
    active_tenants: tenantRows.filter((tenant) => parseStatus(tenant) === 'active').length,
    inactive_tenants: tenantRows.filter((tenant) => parseStatus(tenant) === 'inactive').length,
    suspended_tenants: tenantRows.filter((tenant) => parseStatus(tenant) === 'suspended').length,
    total_users: tenantRows.reduce((sum, tenant) => sum + displayUsers(tenant), 0),
    total_seats: tenantRows.reduce((sum, tenant) => sum + Number(tenant.seats_purchased || 0), 0),
  } as PlatformSummary;

  const tenantDetail = useTenantDetail(selectedTenant?.id, Boolean(selectedTenant));
  const tenantUsers = useTenantUsers(selectedTenant?.id, Boolean(selectedTenant));
  const tenantAudit = useTenantAudit(selectedTenant?.id, Boolean(selectedTenant));
  const tenantBilling = useTenantBillingPanel(selectedTenant?.id, Boolean(selectedTenant));
  const tenantBillingDetail = useTenantBillingDetail(selectedTenant?.id);
  const tenantPayments = useTenantPayments(selectedTenant?.id, { page: paymentsPage, limit: 10 });
  const tenantUserActions = useTenantUserActions(selectedTenant?.id);

  const detailTenant = (tenantDetail.data || selectedTenant) as Tenant | null;
  const userRows = tenantUsers.data?.items || [];
  const auditRows = tenantAudit.data?.items || [];
  const billingPayload = { ...(tenantBilling.data || {}), ...(tenantBillingDetail.data || {}) } as Record<string, unknown>;
  const paymentRows = tenantPayments.data?.items || [];

  const refreshMessage = (next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage(null), 4000);
  };

  const handleExportCsv = async () => {
    try {
      const result = await tenantActions.exportCsv.mutateAsync();
      const anchor = document.createElement('a');
      anchor.href = result.url;
      anchor.download = result.filename || 'tenants.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(result.url), 30_000);
      refreshMessage('Tenant-export gestart.');
    } catch (error) {
      refreshMessage(error instanceof Error ? error.message : 'CSV export mislukt.');
    }
  };

  const handleCreateTenant = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await tenantActions.createTenant.mutateAsync(tenantForm);
      setCreateTenantOpen(false);
      setTenantForm({
        name: '',
        status: 'trial',
        is_active: true,
        seats_purchased: 5,
        price_per_seat_year_cents: 0,
        billing_provider: 'none',
        trial_days: 14,
        create_admin: { email: '', password: '', role: 'tenant_admin', is_active: true },
      });
      refreshMessage('Tenant aangemaakt.');
    } catch (error) {
      refreshMessage(error instanceof Error ? error.message : 'Tenant aanmaken mislukt.');
    }
  };

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTenant) return;
    try {
      await tenantUserActions.createUser.mutateAsync(tenantUserForm);
      setCreateUserOpen(false);
      setTenantUserForm({ email: '', password: '', role: 'viewer', is_active: true });
      refreshMessage(`Gebruiker toegevoegd aan ${selectedTenant.name || selectedTenant.id}.`);
    } catch (error) {
      refreshMessage(error instanceof Error ? error.message : 'Gebruiker toevoegen mislukt.');
    }
  };

  const handleTenantAction = async () => {
    if (!pendingAction) return;
    try {
      if (pendingAction.type === 'activate') await tenantActions.activateTenant.mutateAsync(pendingAction.tenant.id);
      if (pendingAction.type === 'deactivate') await tenantActions.deactivateTenant.mutateAsync(pendingAction.tenant.id);
      if (pendingAction.type === 'suspend') await tenantActions.suspendTenant.mutateAsync(pendingAction.tenant.id);
      if (pendingAction.type === 'reactivate') await tenantActions.reactivateTenant.mutateAsync(pendingAction.tenant.id);
      if (pendingAction.type === 'trial') await tenantActions.startTrial.mutateAsync(pendingAction.tenant.id);
      if (pendingAction.type === 'force-logout') await tenantUserActions.forceLogout.mutateAsync();
      refreshMessage(`Actie ${pendingAction.type} uitgevoerd voor ${pendingAction.tenant.name || pendingAction.tenant.id}.`);
      setPendingAction(null);
    } catch (error) {
      refreshMessage(error instanceof Error ? error.message : 'Tenantactie mislukt.');
      setPendingAction(null);
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    try {
      const response = await impersonate.mutateAsync(tenant.id);
      const token = response.access_token || response.token;
      if (token && currentUser) {
        startImpersonation(
          token,
          {
            email: response.user?.email || currentUser.email,
            role: response.user?.role || 'TenantAdmin',
            tenant: response.user?.tenant || tenant.name || String(tenant.id),
            tenantId: response.user?.tenant_id || tenant.id,
            name: response.user?.name || currentUser.name,
          },
          currentUser,
        );
        refreshMessage(`Tenant-view gestart voor ${tenant.name || tenant.id}.`);
        pushNotification({ title: 'Tenant-view actief', description: `Je kijkt nu mee in ${tenant.name || tenant.id}.`, tone: 'info' });
      }
    } catch (error) {
      refreshMessage(error instanceof Error ? error.message : 'Tenant-view starten mislukt.');
      pushNotification({ title: 'Tenant-view mislukt', description: error instanceof Error ? error.message : 'Onbekende fout', tone: 'error' });
    }
  };

  const columns: ColumnDef<Tenant>[] = [
    {
      key: 'tenant',
      header: 'Tenant',
      sortable: true,
      cell: (tenant) => (
        <div className="superadmin-cell-stack">
          <strong>{text(tenant.name, text(tenant.id))}</strong>
          <span>{text(tenant.id)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (tenant) => {
        const status = parseStatus(tenant);
        return <Badge tone={toneFromStatus(status)}>{statusLabel(status)}</Badge>;
      },
    },
    {
      key: 'users_count',
      header: 'Gebruikers',
      sortable: true,
      cell: (tenant) => displayUsers(tenant),
    },
    {
      key: 'seats',
      header: 'Seats',
      cell: (tenant) => text(tenant.seats_purchased, '—'),
    },
    {
      key: 'billing_provider',
      header: 'Billing',
      cell: (tenant) => text(tenant.billing_provider, 'none'),
    },
    {
      key: 'created_at',
      header: 'Aangemaakt',
      cell: (tenant) => formatDatetime(text(tenant.created_at, '')) || '—',
    },
    {
      key: 'actions',
      header: 'Acties',
      className: 'superadmin-actions-column',
      cell: (tenant) => {
        const status = parseStatus(tenant);
        return (
          <div className="superadmin-row-actions">
            <Button variant="secondary" onClick={() => { setSelectedTenant(tenant); setDetailTab('samenvatting'); }}>Open</Button>
            <Button variant="secondary" disabled={!session.hasPermission('tenants.impersonate') || impersonate.isPending} onClick={() => handleImpersonate(tenant)}>
              <LogIn size={14} /> Meekijken
            </Button>
            {status === 'active' ? <Button variant="ghost" onClick={() => setPendingAction({ type: 'suspend', tenant })}>Suspend</Button> : null}
            {status === 'inactive' ? <Button variant="ghost" onClick={() => setPendingAction({ type: 'activate', tenant })}>Activeer</Button> : null}
            {status === 'suspended' ? <Button variant="ghost" onClick={() => setPendingAction({ type: 'reactivate', tenant })}>Heractiveer</Button> : null}
            {status === 'trial' ? <Button variant="ghost" onClick={() => setPendingAction({ type: 'activate', tenant })}>Activeer</Button> : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="page-stack superadmin-page">
      <PageHeader
        title="Superadmin"
        description="Tenantbeheer, tenant 360, gebruikersbeheer en platformcontrole in één beheerlaag."
      >
        <div className="toolbar-cluster">
          <Button variant="secondary" onClick={handleExportCsv} disabled={tenantActions.exportCsv.isPending}><Download size={16} /> Export CSV</Button>
          <Button onClick={() => setCreateTenantOpen(true)}><Plus size={16} /> Nieuwe tenant</Button>
        </div>
      </PageHeader>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

      {session.isImpersonating ? (
        <div className="stack-actions">
          <InlineMessage tone="danger">{`Je kijkt nu mee in tenant ${session.impersonationTenantName || session.tenant || 'onbekend'}.`}</InlineMessage>
          <Button variant="secondary" onClick={async () => {
            try {
              await exitImpersonation.mutateAsync();
              refreshMessage('Tenant-view beëindigd.');
            } catch (error) {
              refreshMessage(error instanceof Error ? error.message : 'Tenant-view beëindigen mislukt.');
            }
          }}>
            <LogOut size={16} /> Verlaat tenant-view
          </Button>
        </div>
      ) : null}

      <div className="dashboard-kpi-grid superadmin-kpi-grid">
        <StatCard title="Tenants" value={summary.total_tenants} meta="Alle tenants in platform" />
        <StatCard title="Actieve tenants" value={summary.active_tenants} meta="Direct inzetbaar" />
        <StatCard title="Gebruikers" value={summary.total_users} meta="Gekoppelde tenant-users" />
        <StatCard title="Seats" value={summary.total_seats} meta="Ingekochte capaciteit" />
      </div>

      <Card className="superadmin-main-card">
        <div className="section-title-row">
          <h3><Building2 size={18} /> Tenantbeheer</h3>
          <div className="inline-end-cluster">
            <Badge tone={health.isError ? 'warning' : 'success'}>{health.isError ? 'Health-check fout' : 'Platform online'}</Badge>
            <Badge tone={session.hasPermission('tenants.impersonate') ? 'success' : 'warning'}>{session.hasPermission('tenants.impersonate') ? 'Impersonatie actief' : 'Alleen lezen'}</Badge>
          </div>
        </div>

        <div className="toolbar-shell superadmin-toolbar-shell">
          <div className="toolbar-inline-group superadmin-toolbar-inline-group">
            <div className="search-shell inline-search-shell">
              <Search size={16} />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek tenant, id, billing of status" />
            </div>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="superadmin-filter-select">
              <option value="all">Alle statussen</option>
              <option value="active">Actief</option>
              <option value="inactive">Inactief</option>
              <option value="suspended">Gesuspendeerd</option>
              <option value="trial">Trial</option>
            </Select>
          </div>
        </div>

        {tenants.isLoading ? <LoadingState label="Tenants laden..." /> : null}
        {tenants.isError ? <ErrorState title="Tenantlijst niet geladen" description="Controleer of /platform/tenants bereikbaar is." /> : null}
        {!tenants.isLoading && !tenants.isError && filteredRows.length === 0 ? <EmptyState title="Geen tenants" description="Pas je filters aan of maak een nieuwe tenant aan." /> : null}
        {!tenants.isLoading && !tenants.isError && filteredRows.length > 0 ? (
          <DataTable
            columns={columns}
            rows={pagedTenantRows}
            rowKey={(row) => String(row.id)}
            page={tenantPage}
            total={filteredRows.length}
            pageSize={10}
            onPageChange={setTenantPage}
          />
        ) : null}
      </Card>

      <div className="content-grid-2 superadmin-secondary-grid">
        <Card>
          <div className="section-title-row"><h3><ShieldCheck size={18} /> Platformstatus</h3></div>
          {health.isLoading ? <LoadingState label="Health controleren..." /> : null}
          {health.isError ? <ErrorState title="Health niet bereikbaar" description="De backend-healthcheck reageert niet via de ingestelde URL." /> : null}
          {!health.isLoading && !health.isError && health.data ? (
            <div className="detail-grid">
              <div><span>Omgeving</span><strong>{text((health.data as Record<string, unknown>).env)}</strong></div>
              <div><span>App URL</span><strong>{text((health.data as Record<string, unknown>).app_url)}</strong></div>
              <div><span>Marketing URL</span><strong>{text((health.data as Record<string, unknown>).marketing_url)}</strong></div>
              <div><span>CORS credentials</span><strong>{String((health.data as Record<string, unknown>).cors_allow_credentials)}</strong></div>
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="section-title-row"><h3><Activity size={18} /> Quick status</h3></div>
          <div className="checklist-grid">
            <div className="checklist-item"><strong>Tenantgegevens</strong><span>Lijst, filtering, statusmapping en exports werken op platform-endpoints.</span></div>
            <div className="checklist-item"><strong>Tenant 360</strong><span>Detaildrawer bevat samenvatting, users, audit, billing en statusbeheer.</span></div>
            <div className="checklist-item"><strong>Gebruikersbeheer</strong><span>Nieuwe users toevoegen en rollen/activiteit beheren per tenant.</span></div>
            <div className="checklist-item"><strong>Veilig beheer</strong><span>Tenant-view, force logout en statusacties zijn expliciet zichtbaar.</span></div>
          </div>
        </Card>
      </div>

      <Drawer open={createTenantOpen} title="Nieuwe tenant" onClose={() => setCreateTenantOpen(false)}>
        <form className="page-stack" onSubmit={handleCreateTenant}>
          <div className="content-grid-2">
            <label>
              <span>Tenantnaam</span>
              <Input value={tenantForm.name} onChange={(event) => setTenantForm((current) => ({ ...current, name: event.target.value }))} required />
            </label>
            <label>
              <span>Status</span>
              <Select value={tenantForm.status} onChange={(event) => setTenantForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </label>
            <label>
              <span>Seats</span>
              <Input type="number" min={1} value={tenantForm.seats_purchased} onChange={(event) => setTenantForm((current) => ({ ...current, seats_purchased: Number(event.target.value) || 1 }))} />
            </label>
            <label>
              <span>Billing provider</span>
              <Select value={tenantForm.billing_provider} onChange={(event) => setTenantForm((current) => ({ ...current, billing_provider: event.target.value }))}>
                <option value="none">none</option>
                <option value="mollie">mollie</option>
                <option value="manual">manual</option>
              </Select>
            </label>
          </div>
          <Card>
            <div className="section-title-row"><h3>Tenant admin</h3></div>
            <div className="content-grid-2">
              <label>
                <span>E-mail</span>
                <Input value={tenantForm.create_admin?.email || ''} onChange={(event) => setTenantForm((current) => ({ ...current, create_admin: { ...(current.create_admin || {}), email: event.target.value, password: current.create_admin?.password || '', role: current.create_admin?.role || 'tenant_admin', is_active: true } }))} />
              </label>
              <label>
                <span>Wachtwoord</span>
                <Input type="password" value={tenantForm.create_admin?.password || ''} onChange={(event) => setTenantForm((current) => ({ ...current, create_admin: { ...(current.create_admin || {}), email: current.create_admin?.email || '', password: event.target.value, role: current.create_admin?.role || 'tenant_admin', is_active: true } }))} />
              </label>
            </div>
          </Card>
          <div className="toolbar-right">
            <Button type="button" variant="ghost" onClick={() => setCreateTenantOpen(false)}>Annuleren</Button>
            <Button type="submit" disabled={tenantActions.createTenant.isPending}>Tenant aanmaken</Button>
          </div>
        </form>
      </Drawer>

      <Drawer open={Boolean(selectedTenant)} title={selectedTenant?.name || 'Tenantdetails'} onClose={() => setSelectedTenant(null)}>
        <Tabs tabs={detailTabs} value={detailTab} onChange={setDetailTab} />

        {detailTab === 'samenvatting' ? (
          <Card>
            <div className="section-title-row"><h3><BadgeCheck size={18} /> Tenant 360</h3></div>
            {tenantDetail.isLoading ? <LoadingState label="Tenant detail laden..." /> : null}
            {tenantDetail.isError ? <ErrorState title="Tenantdetail niet geladen" description="Controleer of /platform/tenants/{id} bereikbaar is." /> : null}
            {!tenantDetail.isLoading && !tenantDetail.isError && detailTenant ? (
              <>
                <div className="dashboard-kpi-grid superadmin-detail-kpis">
                  <StatCard title="Status" value={statusLabel(parseStatus(detailTenant))} meta="Tenantstatus" />
                  <StatCard title="Gebruikers" value={displayUsers(detailTenant)} meta="Gekoppelde users" />
                  <StatCard title="Seats" value={Number(detailTenant.seats_purchased || 0)} meta="Ingekocht" />
                  <StatCard title="Billing" value={text(detailTenant.billing_provider, 'none')} meta="Provider" />
                </div>
                <div className="detail-grid">
                  <div><span>Naam</span><strong>{text(detailTenant.name)}</strong></div>
                  <div><span>ID</span><strong>{text(detailTenant.id)}</strong></div>
                  <div><span>Trial tot</span><strong>{formatDatetime(text(detailTenant.trial_until, '')) || '—'}</strong></div>
                  <div><span>Valid tot</span><strong>{formatDatetime(text(detailTenant.valid_until, '')) || '—'}</strong></div>
                  <div><span>Mollie klant</span><strong>{text(detailTenant.mollie_customer_id)}</strong></div>
                  <div><span>Subscription</span><strong>{text(detailTenant.mollie_subscription_status || detailTenant.mollie_subscription_id)}</strong></div>
                </div>
              </>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'gebruikers' ? (
          <Card>
            <div className="section-title-row">
              <h3><Users size={18} /> Gebruikersbeheer</h3>
              <div className="toolbar-cluster">
                <Button variant="secondary" onClick={() => setCreateUserOpen(true)}><Plus size={16} /> Nieuwe user</Button>
                <Button variant="ghost" onClick={() => setPendingAction(selectedTenant ? { type: 'force-logout', tenant: selectedTenant } : null)}>Force logout</Button>
              </div>
            </div>
            {tenantUsers.isLoading ? <LoadingState label="Gebruikers laden..." /> : null}
            {tenantUsers.isError ? <ErrorState title="Gebruikers niet geladen" description="Controleer of /platform/tenants/{id}/users bereikbaar is." /> : null}
            {!tenantUsers.isLoading && !tenantUsers.isError && userRows.length === 0 ? <EmptyState title="Geen gebruikers" description="Voeg de eerste tenant-user toe." /> : null}
            {!tenantUsers.isLoading && !tenantUsers.isError && userRows.length > 0 ? (
              <div className="list-stack compact-list">
                {userRows.map((row: TenantUser) => (
                  <div key={row.user_id} className="list-row superadmin-user-row">
                    <div>
                      <strong>{row.email}</strong>
                      <div className="list-subtle">{row.role} · {row.is_active ? 'Actief' : 'Inactief'}</div>
                    </div>
                    <div className="toolbar-cluster">
                      <Button variant="ghost" onClick={() => tenantUserActions.patchUser.mutate({ userId: row.user_id, payload: { role: row.role === 'tenant_admin' ? 'viewer' : 'tenant_admin' } })}>Rol wisselen</Button>
                      <Button variant="ghost" onClick={() => tenantUserActions.patchUser.mutate({ userId: row.user_id, payload: { is_active: !row.is_active } })}>{row.is_active ? 'Deactiveer' : 'Activeer'}</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'audit' ? (
          <Card>
            <div className="section-title-row"><h3><Activity size={18} /> Audit trail</h3></div>
            {tenantAudit.isLoading ? <LoadingState label="Audit laden..." /> : null}
            {tenantAudit.isError ? <ErrorState title="Audit niet geladen" description="Controleer of /platform/tenants/{id}/audit bereikbaar is." /> : null}
            {!tenantAudit.isLoading && !tenantAudit.isError && auditRows.length === 0 ? <EmptyState title="Geen auditregels" description="Er zijn nog geen auditregels voor deze tenant." /> : null}
            {!tenantAudit.isLoading && !tenantAudit.isError && auditRows.length > 0 ? (
              <div className="timeline-list">
                {auditRows.map((row: AuditSummary) => (
                  <div className="timeline-item" key={String(row.id)}>
                    <div className="timeline-dot" />
                    <div>
                      <strong>{text(row.action)}</strong>
                      <div className="list-subtle">{formatDatetime(text(row.created_at, '')) || '—'} · {text(row.entity, 'platform')}</div>
                      <div className="list-subtle">{metaToString(row.meta)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'billing' ? (
          <Card>
            <div className="section-title-row"><h3><CreditCard size={18} /> Billing</h3></div>
            {(tenantBilling.isLoading || tenantBillingDetail.isLoading) ? <LoadingState label="Billing laden..." /> : null}
            {(tenantBilling.isError || tenantBillingDetail.isError) ? <ErrorState title="Billing niet geladen" description="Controleer of /platform/tenants/{id}/billing bereikbaar is." /> : null}
            {!tenantBilling.isLoading && !tenantBillingDetail.isLoading && !tenantBilling.isError && !tenantBillingDetail.isError ? (
              <>
                <div className="detail-grid">
                  <div><span>Status</span><strong>{text(billingPayload.status || billingPayload.mollie_subscription_status)}</strong></div>
                  <div><span>Provider</span><strong>{text(billingPayload.billing_provider || detailTenant?.billing_provider)}</strong></div>
                  <div><span>Seats</span><strong>{text(billingPayload.seats_purchased || detailTenant?.seats_purchased)}</strong></div>
                  <div><span>Prijs / seat / jaar</span><strong>{formatCents(billingPayload.price_per_seat_year_cents || detailTenant?.price_per_seat_year_cents)}</strong></div>
                  <div><span>Volgende betaling</span><strong>{formatDatetime(text(billingPayload.mollie_next_payment_date, '')) || '—'}</strong></div>
                  <div><span>Klant ID</span><strong>{text(billingPayload.mollie_customer_id)}</strong></div>
                </div>
                <div className="divider" />
                {tenantPayments.isLoading ? <LoadingState label="Payments laden..." /> : null}
                {tenantPayments.isError ? <ErrorState title="Payments niet geladen" description="Controleer of /platform/tenants/{id}/payments bereikbaar is." /> : null}
                {!tenantPayments.isLoading && !tenantPayments.isError && paymentRows.length === 0 ? <EmptyState title="Geen payments" description="Nog geen betalingen voor deze tenant." /> : null}
                {!tenantPayments.isLoading && !tenantPayments.isError && paymentRows.length > 0 ? (
                  <DataTable
                    columns={[
                      { key: 'created_at', header: 'Datum', cell: (row: BillingPayment) => formatDatetime(text(row.created_at, '')) || '—' },
                      { key: 'provider', header: 'Provider', cell: (row: BillingPayment) => text(row.provider) },
                      { key: 'status', header: 'Status', cell: (row: BillingPayment) => <Badge tone={toneFromStatus(text(row.status, 'neutral'))}>{text(row.status)}</Badge> },
                      { key: 'amount', header: 'Bedrag', cell: (row: BillingPayment) => formatCents(row.amount_cents) },
                    ]}
                    rows={paymentRows}
                    rowKey={(row: BillingPayment) => String(row.id)}
                    page={paymentsPage}
                    total={tenantPayments.data?.total || paymentRows.length}
                    pageSize={10}
                    onPageChange={setPaymentsPage}
                  />
                ) : null}
              </>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'status' ? (
          <Card>
            <div className="section-title-row"><h3>Statusbeheer</h3></div>
            <div className="toolbar-cluster superadmin-status-actions">
              <Button variant="secondary" onClick={() => selectedTenant && setPendingAction({ type: 'activate', tenant: selectedTenant })}>Activeer</Button>
              <Button variant="secondary" onClick={() => selectedTenant && setPendingAction({ type: 'deactivate', tenant: selectedTenant })}>Deactiveer</Button>
              <Button variant="secondary" onClick={() => selectedTenant && setPendingAction({ type: 'suspend', tenant: selectedTenant })}>Suspend</Button>
              <Button variant="secondary" onClick={() => selectedTenant && setPendingAction({ type: 'trial', tenant: selectedTenant })}>Start trial</Button>
            </div>
            <div className="checklist-grid" style={{ marginTop: 16 }}>
              <div className="checklist-item"><strong>Statusmapping</strong><span>Trial, actief, inactief en gesuspendeerd worden expliciet getoond.</span></div>
              <div className="checklist-item"><strong>Force logout</strong><span>Alle refresh tokens van de tenant kunnen worden ingetrokken.</span></div>
              <div className="checklist-item"><strong>Tenant-view</strong><span>Meekijken wordt zichtbaar geactiveerd en ook expliciet beëindigd.</span></div>
              <div className="checklist-item"><strong>RBAC</strong><span>Alleen platform_admin / superadmin ziet deze module en acties.</span></div>
            </div>
          </Card>
        ) : null}
      </Drawer>

      <Drawer open={createUserOpen} title="Nieuwe tenant-user" onClose={() => setCreateUserOpen(false)}>
        <form className="page-stack" onSubmit={handleCreateUser}>
          <label>
            <span>E-mail</span>
            <Input type="email" value={tenantUserForm.email} onChange={(event) => setTenantUserForm((current) => ({ ...current, email: event.target.value }))} required />
          </label>
          <label>
            <span>Wachtwoord</span>
            <Input type="password" value={tenantUserForm.password} onChange={(event) => setTenantUserForm((current) => ({ ...current, password: event.target.value }))} required />
          </label>
          <label>
            <span>Rol</span>
            <Select value={tenantUserForm.role} onChange={(event) => setTenantUserForm((current) => ({ ...current, role: event.target.value }))}>
              <option value="viewer">viewer</option>
              <option value="tenant_user">tenant_user</option>
              <option value="tenant_admin">tenant_admin</option>
            </Select>
          </label>
          <div className="toolbar-right">
            <Button type="button" variant="ghost" onClick={() => setCreateUserOpen(false)}>Annuleren</Button>
            <Button type="submit" disabled={tenantUserActions.createUser.isPending}>Gebruiker toevoegen</Button>
          </div>
        </form>
      </Drawer>

      <ConfirmActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction ? `Bevestig ${pendingAction.type}` : 'Bevestig actie'}
        description={pendingAction ? `Voer ${pendingAction.type} uit voor ${pendingAction.tenant.name || pendingAction.tenant.id}.` : 'Voer tenantactie uit.'}
        confirmLabel="Uitvoeren"
        onClose={() => setPendingAction(null)}
        onConfirm={handleTenantAction}
      />
    </div>
  );
}
