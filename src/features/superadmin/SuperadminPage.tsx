import { FormEvent, useEffect, useMemo, useState } from 'react';
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
import type { AuditSummary, BillingPayment, PlatformSummary, Tenant, TenantCreateInput, TenantPatchInput, TenantUser, TenantUserCreateInput, TenantUserPatchInput } from '@/types/domain';
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
  const [editTenantOpen, setEditTenantOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
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
  const [tenantEditForm, setTenantEditForm] = useState<TenantPatchInput>({
    name: '',
    status: 'trial',
    is_active: true,
    seats_purchased: 1,
    price_per_seat_year_cents: 0,
    billing_provider: 'none',
  });
  const [tenantUserEditForm, setTenantUserEditForm] = useState<TenantUserPatchInput & { email?: string }>({
    email: '',
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
  useEffect(() => {
    if (!detailTenant) return;
    setTenantEditForm({
      name: String(detailTenant.name || ''),
      status: parseStatus(detailTenant),
      is_active: detailTenant.is_active !== false,
      seats_purchased: Number(detailTenant.seats_purchased || 1),
      price_per_seat_year_cents: Number(detailTenant.price_per_seat_year_cents || 0),
      billing_provider: String(detailTenant.billing_provider || 'none'),
    });
  }, [detailTenant]);

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
      const response = await tenantActions.createTenant.mutateAsync(tenantForm) as Record<string, unknown>;
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
      refreshMessage(String(response?.reset_url ? `Tenant aangemaakt. Activatielink: ${response.reset_url}` : response?.delivery_outbox_path ? `Tenant aangemaakt. Previewmail: ${response.delivery_outbox_path}` : 'Tenant aangemaakt.'));
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
      refreshMessage(String(response?.reset_url ? `Gebruiker aangemaakt. Activatielink: ${response.reset_url}` : response?.delivery_outbox_path ? `Gebruiker aangemaakt. Previewmail: ${response.delivery_outbox_path}` : `Gebruiker toegevoegd aan ${selectedTenant.name || selectedTenant.id}.`));
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

  const openUserEditor = (row: TenantUser) => {
    setEditingUser(row);
    setTenantUserEditForm({
      email: row.email,
      role: row.role,
      is_active: row.is_active,
    });
  };

  const openTenantDetail = (tenant: Tenant, tab: string = 'samenvatting') => {
    setSelectedTenant(tenant);
    setDetailTab(tab);
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
            <Button variant="secondary" onClick={() => openTenantDetail(tenant, 'samenvatting')}>Open</Button>
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

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

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
          <div className="toolbar-right">
            <Button type="button" variant="ghost" onClick={() => setCreateTenantOpen(false)}>Annuleren</Button>
            <Button type="submit" disabled={tenantActions.createTenant.isPending}>Tenant aanmaken</Button>
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
