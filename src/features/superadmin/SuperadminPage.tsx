import { FormEvent, useMemo, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  Building2,
  CreditCard,
  Download,
  FileText,
  LogIn,
  LogOut,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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
import { useTenantBillingActions, useTenantBillingDetail, useTenantInvoiceDetail, useTenantInvoices, useTenantPayments } from '@/hooks/usePlatformBilling';
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
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [manualPaymentOpen, setManualPaymentOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [accessOverrideOpen, setAccessOverrideOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [creditInvoiceId, setCreditInvoiceId] = useState<string | null>(null);
  const [cancelSubscriptionOpen, setCancelSubscriptionOpen] = useState(false);
  const [lastBillingFeedback, setLastBillingFeedback] = useState<Record<string, unknown> | null>(null);
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

  const [invoiceForm, setInvoiceForm] = useState({
    description: 'Jaarabonnement WeldInspect',
    seats: 1,
    unit_amount_cents: 0,
    due_in_days: 14,
  });
  const [manualPaymentForm, setManualPaymentForm] = useState({
    amount_cents: 0,
    type: 'subscription',
    invoice_id: '',
    provider: 'manual',
    status: 'paid',
  });
  const [planForm, setPlanForm] = useState({
    plan_code: 'professional',
    seats: 1,
    status: 'active',
  });
  const [accessOverrideForm, setAccessOverrideForm] = useState({
    access_mode: 'read_only',
    status: 'active',
    reason: 'superadmin override',
  });
  const [creditReason, setCreditReason] = useState('Creditnota door superadmin');

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
  const tenantInvoices = useTenantInvoices(selectedTenant?.id);
  const tenantBillingActions = useTenantBillingActions(selectedTenant?.id);
  const selectedInvoiceDetail = useTenantInvoiceDetail(selectedTenant?.id, selectedInvoiceId || undefined);
  const tenantUserActions = useTenantUserActions(selectedTenant?.id);

  const detailTenant = (tenantDetail.data || selectedTenant) as Tenant | null;
  const userRows = tenantUsers.data?.items || [];
  const auditRows = tenantAudit.data?.items || [];
  const billingPayload = { ...(tenantBilling.data || {}), ...(tenantBillingDetail.data || {}) } as Record<string, unknown>;
  const paymentRows = tenantPayments.data?.items || [];
  const invoiceRows = tenantInvoices.data?.items || [];

  const applyBillingFeedback = (response: Record<string, unknown> | null | undefined, fallback: string) => {
    setLastBillingFeedback(response ? response as Record<string, unknown> : null);
    refreshMessage(String(response?.message || response?.number || fallback));
  };

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
      const response = await tenantUserActions.createUser.mutateAsync(tenantUserForm) as Record<string, unknown>;
      setCreateUserOpen(false);
      setTenantUserForm({ email: '', password: '', role: 'viewer', is_active: true });
      refreshMessage(String(response?.reset_url ? `Gebruiker aangemaakt. Activatielink: ${response.reset_url}` : `Gebruiker toegevoegd aan ${selectedTenant.name || selectedTenant.id}.`));
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
      <section className="section-banner">
        <div className="section-banner-copy">
          <span className="section-banner-kicker">Platformcontrole</span>
          <h1>Superadmin</h1>
          <p>Tenantbeheer, tenant 360, gebruikersbeheer, billingcontrole en platformstatus met dezelfde header- en tegeltaal als Project 360.</p>
        </div>
        <div className="section-banner-actions">
          <Button variant="secondary" onClick={handleExportCsv} disabled={tenantActions.exportCsv.isPending}><Download size={16} /> Export CSV</Button>
          <Button onClick={() => setCreateTenantOpen(true)}><Plus size={16} /> Nieuwe tenant</Button>
        </div>
      </section>

      <div className="section-nav-grid">
        <div className="section-nav-tile is-active"><div className="section-nav-tile-top"><Building2 size={18} /><span>Tenants</span></div><div className="section-nav-tile-value">{String(summary.total_tenants || 0)}</div><strong>Alle tenants in platform</strong><small>Overzicht van alle omgevingen en tenants.</small></div>
        <div className="section-nav-tile is-active"><div className="section-nav-tile-top"><BadgeCheck size={18} /><span>Actief</span></div><div className="section-nav-tile-value">{String(summary.active_tenants || 0)}</div><strong>Direct inzetbaar</strong><small>Tenants met actieve status.</small></div>
        <div className="section-nav-tile is-active"><div className="section-nav-tile-top"><Users size={18} /><span>Gebruikers</span></div><div className="section-nav-tile-value">{String(summary.total_users || 0)}</div><strong>Gekoppelde tenant-users</strong><small>Gebruikers verspreid over alle tenants.</small></div>
        <div className="section-nav-tile is-active"><div className="section-nav-tile-top"><Activity size={18} /><span>Platform</span></div><div className="section-nav-tile-value">{health.isError ? 'Check' : 'Online'}</div><strong>Health en contracten</strong><small>Health-check en billingcontracten.</small></div>
      </div>

      <div className="section-nav-grid cols-5">
        {detailTabs.map((tabItem) => {
          const icon = tabItem.value === 'samenvatting' ? Building2 : tabItem.value === 'gebruikers' ? Users : tabItem.value === 'audit' ? Activity : tabItem.value === 'billing' ? CreditCard : ShieldCheck;
          const Icon = icon;
          const active = detailTab === tabItem.value;
          return (
            <button key={tabItem.value} type="button" className={`section-nav-tile ${active ? 'is-active' : ''}`} onClick={() => setDetailTab(tabItem.value)}>
              <div className="section-nav-tile-top"><Icon size={18} /><span>{tabItem.label}</span></div>
              <div className="section-nav-tile-value">{tabItem.value === 'samenvatting' ? filteredRows.length : tabItem.value === 'gebruikers' ? userRows.length : tabItem.value === 'audit' ? auditRows.length : tabItem.value === 'billing' ? '€' : selectedTenant ? 'Beheer' : 'Kies'}</div>
              <strong>{tabItem.label}</strong>
              <small>{tabItem.value === 'samenvatting' ? 'Zoek, filter en open tenants vanuit één overzicht.' : tabItem.value === 'gebruikers' ? 'Gebruikers per tenant beheren.' : tabItem.value === 'audit' ? 'Auditregels en gebeurtenissen bekijken.' : tabItem.value === 'billing' ? 'Seats, betalingen en abonnement per tenant.' : 'Activeren, suspenden en tenantstatus beheren.'}</small>
            </button>
          );
        })}
      </div>

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
            onRowDoubleClick={(tenant) => { setSelectedTenant(tenant); setDetailTab('samenvatting'); }}
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
                      <Button variant="ghost" onClick={async () => { const response = await tenantUserActions.resendInvite.mutateAsync(row.user_id) as Record<string, unknown>; refreshMessage(String(response?.reset_url || response?.message || 'Uitnodiging verstuurd.')); }}>Uitnodigen</Button>
                      <Button variant="ghost" onClick={async () => { const response = await tenantUserActions.resetPassword.mutateAsync(row.user_id) as Record<string, unknown>; refreshMessage(String(response?.reset_url || response?.message || 'Resetlink aangemaakt.')); }}>Reset</Button>
                      <Button variant="ghost" onClick={async () => { await tenantUserActions.deleteUser.mutateAsync(row.user_id); refreshMessage(`Gebruiker ${row.email} verwijderd.`); }}>Verwijder</Button>
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
                <div className="toolbar-cluster" style={{ marginTop: 12, marginBottom: 12 }}>
                  <Button variant="secondary" onClick={() => {
                    setInvoiceForm((current) => ({
                      ...current,
                      seats: Number(detailTenant?.seats_purchased || 1),
                      unit_amount_cents: Number(detailTenant?.price_per_seat_year_cents || 0),
                    }));
                    setCreateInvoiceOpen(true);
                  }}>Factuur maken</Button>
                  <Button variant="secondary" onClick={() => {
                    setManualPaymentForm((current) => ({
                      ...current,
                      amount_cents: Number(billingPayload.price_per_seat_year_cents || detailTenant?.price_per_seat_year_cents || 0),
                    }));
                    setManualPaymentOpen(true);
                  }}>Handmatige betaling</Button>
                  <Button variant="secondary" onClick={() => {
                    setPlanForm({
                      plan_code: String((billingPayload.plan_code || billingPayload.plan || 'professional')),
                      seats: Number(detailTenant?.seats_purchased || 1),
                      status: String(billingPayload.status || 'active'),
                    });
                    setChangePlanOpen(true);
                  }}>Plan wijzigen</Button>
                  <Button variant="secondary" onClick={() => setAccessOverrideOpen(true)}>Access override</Button>
                  <Button variant="ghost" onClick={() => setCancelSubscriptionOpen(true)}>Annuleer abonnement</Button>
                </div>
                {lastBillingFeedback ? (
                  <InlineMessage tone="neutral">{`${String(lastBillingFeedback.message || lastBillingFeedback.number || 'Actie verwerkt.')}${lastBillingFeedback.email_preview_subject ? ` · Mail: ${String(lastBillingFeedback.email_preview_subject)}` : ''}${lastBillingFeedback.delivery_mode ? ` · Delivery: ${String(lastBillingFeedback.delivery_mode)}` : ''}${lastBillingFeedback.delivery_outbox_path ? ` · Outbox: ${String(lastBillingFeedback.delivery_outbox_path)}` : ''}${lastBillingFeedback.pdf_url ? ` · PDF: ${String(lastBillingFeedback.pdf_url)}` : ''}`}</InlineMessage>
                ) : null}
                <div className="divider" />
                {tenantInvoices.isLoading ? <LoadingState label="Facturen laden..." /> : null}
                {tenantInvoices.isError ? <ErrorState title="Facturen niet geladen" description="Controleer of /platform/tenants/{id}/invoices bereikbaar is." /> : null}
                {!tenantInvoices.isLoading && !tenantInvoices.isError && invoiceRows.length === 0 ? <EmptyState title="Geen facturen" description="Maak de eerste factuur direct vanuit deze tenant." /> : null}
                {!tenantInvoices.isLoading && !tenantInvoices.isError && invoiceRows.length > 0 ? (
                  <DataTable
                    columns={[
                      { key: 'number', header: 'Factuur', cell: (row: Record<string, unknown>) => text(row.number) },
                      { key: 'status', header: 'Status', cell: (row: Record<string, unknown>) => <Badge tone={toneFromStatus(text(row.status, 'neutral'))}>{text(row.status)}</Badge> },
                      { key: 'total', header: 'Totaal', cell: (row: Record<string, unknown>) => formatCents(row.total_cents) },
                      { key: 'balance', header: 'Openstaand', cell: (row: Record<string, unknown>) => formatCents(row.balance_due_cents) },
                      { key: 'actions', header: 'Acties', cell: (row: Record<string, unknown>) => <Button variant="secondary" onClick={() => setSelectedInvoiceId(String(row.id))}><FileText size={14} /> Detail</Button> },
                    ]}
                    rows={invoiceRows}
                    rowKey={(row: Record<string, unknown>) => String(row.id)}
                  />
                ) : null}
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

      <Drawer open={createInvoiceOpen} title="Factuur aanmaken" onClose={() => setCreateInvoiceOpen(false)}>
        <form className="page-stack" onSubmit={async (event) => {
          event.preventDefault();
          if (!selectedTenant) return;
          const response = await tenantBillingActions.createInvoice.mutateAsync(invoiceForm as unknown as Record<string, unknown>);
          applyBillingFeedback(response, 'Factuur aangemaakt.');
          setCreateInvoiceOpen(false);
        }}>
          <label><span>Omschrijving</span><Input value={invoiceForm.description} onChange={(event) => setInvoiceForm((current) => ({ ...current, description: event.target.value }))} required /></label>
          <label><span>Seats</span><Input type="number" value={invoiceForm.seats} onChange={(event) => setInvoiceForm((current) => ({ ...current, seats: Number(event.target.value || 1) }))} min={1} required /></label>
          <label><span>Bedrag per seat (cent)</span><Input type="number" value={invoiceForm.unit_amount_cents} onChange={(event) => setInvoiceForm((current) => ({ ...current, unit_amount_cents: Number(event.target.value || 0) }))} min={0} required /></label>
          <label><span>Vervaldagen</span><Input type="number" value={invoiceForm.due_in_days} onChange={(event) => setInvoiceForm((current) => ({ ...current, due_in_days: Number(event.target.value || 14) }))} min={1} required /></label>
          <div className="form-actions"><Button type="submit">Aanmaken</Button></div>
        </form>
      </Drawer>

      <Drawer open={manualPaymentOpen} title="Handmatige betaling" onClose={() => setManualPaymentOpen(false)}>
        <form className="page-stack" onSubmit={async (event) => {
          event.preventDefault();
          if (!selectedTenant) return;
          const payload: Record<string, unknown> = {
            amount_cents: manualPaymentForm.amount_cents,
            type: manualPaymentForm.type,
            provider: manualPaymentForm.provider,
            status: manualPaymentForm.status,
          };
          if (manualPaymentForm.invoice_id) payload.invoice_id = manualPaymentForm.invoice_id;
          const response = await tenantBillingActions.manualPayment.mutateAsync(payload);
          applyBillingFeedback(response, 'Handmatige betaling geregistreerd.');
          setManualPaymentOpen(false);
        }}>
          <label><span>Bedrag (cent)</span><Input type="number" value={manualPaymentForm.amount_cents} onChange={(event) => setManualPaymentForm((current) => ({ ...current, amount_cents: Number(event.target.value || 0) }))} min={1} required /></label>
          <label><span>Type</span><Select value={manualPaymentForm.type} onChange={(event) => setManualPaymentForm((current) => ({ ...current, type: event.target.value }))}><option value="subscription">subscription</option><option value="invoice">invoice</option><option value="manual">manual</option></Select></label>
          <label><span>Provider</span><Select value={manualPaymentForm.provider} onChange={(event) => setManualPaymentForm((current) => ({ ...current, provider: event.target.value }))}><option value="manual">manual</option><option value="mollie">mollie</option></Select></label>
          <label><span>Status</span><Select value={manualPaymentForm.status} onChange={(event) => setManualPaymentForm((current) => ({ ...current, status: event.target.value }))}><option value="paid">paid</option><option value="pending">pending</option></Select></label>
          <label><span>Factuur ID (optioneel)</span><Input value={manualPaymentForm.invoice_id} onChange={(event) => setManualPaymentForm((current) => ({ ...current, invoice_id: event.target.value }))} /></label>
          <div className="form-actions"><Button type="submit">Registreren</Button></div>
        </form>
      </Drawer>

      <Drawer open={changePlanOpen} title="Abonnement wijzigen" onClose={() => setChangePlanOpen(false)}>
        <form className="page-stack" onSubmit={async (event) => {
          event.preventDefault();
          if (!selectedTenant) return;
          const response = await tenantBillingActions.changePlan.mutateAsync(planForm as unknown as Record<string, unknown>);
          applyBillingFeedback(response, 'Abonnement bijgewerkt.');
          setChangePlanOpen(false);
        }}>
          <label><span>Plan code</span><Input value={planForm.plan_code} onChange={(event) => setPlanForm((current) => ({ ...current, plan_code: event.target.value }))} required /></label>
          <label><span>Seats</span><Input type="number" value={planForm.seats} onChange={(event) => setPlanForm((current) => ({ ...current, seats: Number(event.target.value || 1) }))} min={1} required /></label>
          <label><span>Status</span><Select value={planForm.status} onChange={(event) => setPlanForm((current) => ({ ...current, status: event.target.value }))}><option value="active">active</option><option value="trialing">trialing</option><option value="past_due">past_due</option><option value="suspended">suspended</option><option value="cancelled">cancelled</option><option value="expired">expired</option></Select></label>
          <div className="form-actions"><Button type="submit">Opslaan</Button></div>
        </form>
      </Drawer>

      <Drawer open={accessOverrideOpen} title="Access mode override" onClose={() => setAccessOverrideOpen(false)}>
        <form className="page-stack" onSubmit={async (event) => {
          event.preventDefault();
          if (!selectedTenant) return;
          const response = await tenantBillingActions.overrideAccessMode.mutateAsync(accessOverrideForm as unknown as Record<string, unknown>);
          applyBillingFeedback(response, 'Access mode bijgewerkt.');
          setAccessOverrideOpen(false);
        }}>
          <label><span>Access mode</span><Select value={accessOverrideForm.access_mode} onChange={(event) => setAccessOverrideForm((current) => ({ ...current, access_mode: event.target.value }))}><option value="full_access">full_access</option><option value="grace_period">grace_period</option><option value="read_only">read_only</option><option value="blocked">blocked</option></Select></label>
          <label><span>Status</span><Select value={accessOverrideForm.status} onChange={(event) => setAccessOverrideForm((current) => ({ ...current, status: event.target.value }))}><option value="active">active</option><option value="trialing">trialing</option><option value="past_due">past_due</option><option value="suspended">suspended</option><option value="cancelled">cancelled</option><option value="expired">expired</option></Select></label>
          <label><span>Reden</span><Input value={accessOverrideForm.reason} onChange={(event) => setAccessOverrideForm((current) => ({ ...current, reason: event.target.value }))} required /></label>
          <div className="form-actions"><Button type="submit">Toepassen</Button></div>
        </form>
      </Drawer>

      <Drawer open={Boolean(selectedInvoiceId)} title="Factuurdetail en acties" onClose={() => setSelectedInvoiceId(null)}>
        {selectedInvoiceDetail.isLoading ? <LoadingState label="Factuurdetail laden..." /> : null}
        {selectedInvoiceDetail.isError ? <ErrorState title="Factuurdetail niet geladen" description="Controleer /platform/tenants/{id}/invoices/{invoice_id}." /> : null}
        {selectedInvoiceDetail.data ? (
          <div className="page-stack">
            <div className="detail-grid">
              <div><span>Factuur</span><strong>{text(selectedInvoiceDetail.data.number || selectedInvoiceDetail.data.id)}</strong></div>
              <div><span>Status</span><strong>{text(selectedInvoiceDetail.data.status)}</strong></div>
              <div><span>Totaal</span><strong>{formatCents(selectedInvoiceDetail.data.total_cents)}</strong></div>
              <div><span>Openstaand</span><strong>{formatCents(selectedInvoiceDetail.data.balance_due_cents)}</strong></div>
            </div>
            <DataTable
              columns={[
                { key: 'description', header: 'Omschrijving', cell: (row: Record<string, unknown>) => text(row.description) },
                { key: 'quantity', header: 'Aantal', cell: (row: Record<string, unknown>) => text(row.quantity) },
                { key: 'unit_amount_cents', header: 'Prijs', cell: (row: Record<string, unknown>) => formatCents(row.unit_amount_cents) },
                { key: 'line_total_cents', header: 'Regel', cell: (row: Record<string, unknown>) => formatCents(row.line_total_cents) },
              ]}
              rows={Array.isArray(selectedInvoiceDetail.data.lines) ? selectedInvoiceDetail.data.lines as Record<string, unknown>[] : []}
              rowKey={(row: Record<string, unknown>) => String(row.id || row.description || '')}
            />
            <div className="toolbar-cluster">
              <Button variant="secondary" onClick={async () => {
                if (!selectedInvoiceId) return;
                const response = await tenantBillingActions.sendInvoice.mutateAsync(selectedInvoiceId);
                applyBillingFeedback(response, 'Factuur verzonden.');
              }}><Mail size={14} /> Verzenden</Button>
              <Button variant="secondary" onClick={() => setCreditInvoiceId(selectedInvoiceId)}><CreditCard size={14} /> Crediteren</Button>
              {selectedInvoiceDetail.data.pdf_url ? <a href={String(selectedInvoiceDetail.data.pdf_url)} target="_blank" rel="noreferrer"><Button><Download size={14} /> PDF</Button></a> : null}
            </div>
            {lastBillingFeedback?.email_preview_text ? <InlineMessage tone="neutral">{String(lastBillingFeedback.email_preview_text)}</InlineMessage> : null}
          </div>
        ) : null}
      </Drawer>

      <Drawer open={Boolean(creditInvoiceId)} title="Creditfactuur verwerken" onClose={() => setCreditInvoiceId(null)}>
        <form className="page-stack" onSubmit={async (event) => {
          event.preventDefault();
          if (!creditInvoiceId) return;
          const response = await tenantBillingActions.creditInvoice.mutateAsync({ invoiceId: creditInvoiceId, payload: { reason: creditReason } });
          applyBillingFeedback(response, 'Credit verwerkt.');
          setCreditInvoiceId(null);
          setSelectedInvoiceId(null);
        }}>
          <label><span>Reden</span><Input value={creditReason} onChange={(event) => setCreditReason(event.target.value)} required /></label>
          <div className="form-actions"><Button type="submit">Crediteren</Button></div>
        </form>
      </Drawer>

      <Drawer open={createUserOpen} title="Nieuwe tenant-user" onClose={() => setCreateUserOpen(false)}>
        <form className="page-stack" onSubmit={handleCreateUser}>
          <label>
            <span>E-mail</span>
            <Input type="email" value={tenantUserForm.email} onChange={(event) => setTenantUserForm((current) => ({ ...current, email: event.target.value }))} required />
          </label>
          <label>
            <span>Tijdelijk wachtwoord (optioneel)</span>
            <Input type="password" value={tenantUserForm.password} onChange={(event) => setTenantUserForm((current) => ({ ...current, password: event.target.value }))} placeholder="Leeg laten voor activatielink" />
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
            <Button type="submit" disabled={tenantUserActions.createUser.isPending}>{tenantUserForm.password ? "Gebruiker toevoegen" : "Uitnodigen en activatielink maken"}</Button>
          </div>
        </form>
      </Drawer>

      <ConfirmActionDialog
        open={cancelSubscriptionOpen}
        title="Abonnement annuleren"
        description="De tenant gaat naar cancelled of expired afhankelijk van de keuze in de backend."
        confirmLabel="Annuleer abonnement"
        onConfirm={async () => {
          const response = await tenantBillingActions.cancelSubscription.mutateAsync({});
          applyBillingFeedback(response, 'Abonnement geannuleerd.');
          setCancelSubscriptionOpen(false);
        }}
        onClose={() => setCancelSubscriptionOpen(false)}
      />

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
