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
  BarChart3,
  PlugZap,
  LineChart,
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
import { usePlatformGrowthOverview, usePlatformIntegrationsCatalog, usePlatformReportingInsights, usePlatformSecurityOverview, useTenantAccessHistory, useTenantAudit, useTenantBillingEvents, useTenantBillingPanel, useTenantDetail, useTenantPermissionsSummary, useTenantSecurityOverview, useTenantUserActions, useTenantUsers } from '@/hooks/useTenantAdmin';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { usePlatformBillingPlans, useTenantBillingActions, useTenantBillingDetail, useTenantInvoiceDetail, useTenantInvoices, useTenantPayments } from '@/hooks/usePlatformBilling';
import type { AuditSummary, BillingPayment, PlatformSummary, Tenant, TenantCreateInput, TenantPatchInput, TenantUser, TenantUserCreateInput, TenantUserPatchInput } from '@/types/domain';
import { formatDatetime, toneFromStatus } from '@/utils/format';

const detailTabs = [
  { value: 'samenvatting', label: 'Samenvatting' },
  { value: 'gebruikers', label: 'Gebruikers' },
  { value: 'rechten', label: 'Rechten' },
  { value: 'security', label: 'Security' },
  { value: 'groei', label: 'Groei' },
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
  const tenantAccessHistory = useTenantAccessHistory(selectedTenant?.id, Boolean(selectedTenant));
  const tenantBillingEvents = useTenantBillingEvents(selectedTenant?.id, Boolean(selectedTenant));
  const tenantBilling = useTenantBillingPanel(selectedTenant?.id, Boolean(selectedTenant));
  const tenantPermissionsSummary = useTenantPermissionsSummary(selectedTenant?.id, Boolean(selectedTenant));
  const tenantSecurityOverview = useTenantSecurityOverview(selectedTenant?.id, Boolean(selectedTenant));
  const platformSecurityOverview = usePlatformSecurityOverview(true);
  const platformGrowthOverview = usePlatformGrowthOverview(true);
  const platformIntegrationsCatalog = usePlatformIntegrationsCatalog(true);
  const platformReportingInsights = usePlatformReportingInsights(true);
  const billingPlans = usePlatformBillingPlans(Boolean(selectedTenant));
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
  const accessHistoryRows = tenantAccessHistory.data?.items || [];
  const billingEventRows = tenantBillingEvents.data?.items || [];
  const billingPayload = { ...(tenantBilling.data || {}), ...(tenantBillingDetail.data || {}) } as Record<string, unknown>;
  const permissionSummary = (tenantPermissionsSummary.data || {}) as Record<string, unknown>;
  const securitySummary = (tenantSecurityOverview.data || {}) as Record<string, unknown>;
  const globalSecuritySummary = (platformSecurityOverview.data || {}) as Record<string, unknown>;
  const growthSummary = (platformGrowthOverview.data || {}) as Record<string, unknown>;
  const reportingInsights = (platformReportingInsights.data || {}) as Record<string, unknown>;
  const integrationsCatalog = Array.isArray((platformIntegrationsCatalog.data as any)?.items) ? ((platformIntegrationsCatalog.data as any)?.items as Record<string, unknown>[]) : [];
  const platformPlans = Array.isArray((billingPlans.data as any)?.items) ? (billingPlans.data as any).items : Array.isArray(billingPlans.data) ? billingPlans.data : [];
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
            <Button variant="ghost" onClick={async () => { const response = await tenantActions.toggleDemoMode.mutateAsync({ tenantId: tenant.id, isDemo: !(tenant as any).is_demo }); refreshMessage(String((response as any)?.message || `Demo mode ${!(tenant as any).is_demo ? 'ingeschakeld' : 'uitgeschakeld'}.`)); }}>Demo</Button>
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
          const icon = tabItem.value === 'samenvatting' ? Building2 : tabItem.value === 'gebruikers' ? Users : tabItem.value === 'rechten' ? ShieldCheck : tabItem.value === 'security' ? ShieldCheck : tabItem.value === 'groei' ? LineChart : tabItem.value === 'audit' ? Activity : tabItem.value === 'billing' ? CreditCard : ShieldCheck;
          const Icon = icon;
          const active = detailTab === tabItem.value;
          return (
            <button key={tabItem.value} type="button" className={`section-nav-tile ${active ? 'is-active' : ''}`} onClick={() => setDetailTab(tabItem.value)}>
              <div className="section-nav-tile-top"><Icon size={18} /><span>{tabItem.label}</span></div>
              <div className="section-nav-tile-value">{tabItem.value === 'samenvatting' ? filteredRows.length : tabItem.value === 'gebruikers' ? userRows.length : tabItem.value === 'rechten' ? Number((permissionSummary.role_counts as Record<string, number> | undefined)?.tenant_admin || 0) : tabItem.value === 'security' ? '🔒' : tabItem.value === 'groei' ? String(growthSummary.active_tenant_count || 0) : tabItem.value === 'audit' ? auditRows.length : tabItem.value === 'billing' ? '€' : selectedTenant ? 'Beheer' : 'Kies'}</div>
              <strong>{tabItem.label}</strong>
              <small>{tabItem.value === 'samenvatting' ? 'Zoek, filter en open tenants vanuit één overzicht.' : tabItem.value === 'gebruikers' ? 'Gebruikers per tenant beheren.' : tabItem.value === 'rechten' ? 'RBAC, rolverdeling en toegangsmodi per tenant.' : tabItem.value === 'security' ? 'Tenant write-locks, access runtime en platform-security samenvatting.' : tabItem.value === 'groei' ? 'Analytics, integraties en reporting-insights voor groei.' : tabItem.value === 'audit' ? 'Auditregels en gebeurtenissen bekijken.' : tabItem.value === 'billing' ? 'Seats, betalingen en abonnement per tenant.' : 'Activeren, suspenden en tenantstatus beheren.'}</small>
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
            <Badge tone={health.isError ? 'danger' : 'success'}>{health.isError ? 'Health-check fout' : 'Platform online'}</Badge>
            <Badge tone={session.hasPermission('tenants.impersonate') ? 'success' : 'danger'}>{session.hasPermission('tenants.impersonate') ? 'Impersonatie actief' : 'Alleen lezen'}</Badge>
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
                  <div key={row.user_id} className="list-row superadmin-user-row" onDoubleClick={() => openUserEditor(row)}>
                    <div>
                      <strong>{row.email}</strong>
                      <div className="list-subtle">{row.role} · {row.is_active ? 'Actief' : 'Inactief'}</div>
                    </div>
                    <div className="toolbar-cluster">
                      <Button variant="ghost" onClick={() => openUserEditor(row)}>Bewerk</Button>
                      <Button variant="ghost" onClick={() => tenantUserActions.patchUser.mutate({ userId: row.user_id, payload: { role: row.role === 'tenant_admin' ? 'viewer' : 'tenant_admin' } })}>Rol wisselen</Button>
                      <Button variant="ghost" onClick={async () => { const response = row.is_active ? await tenantUserActions.deactivateUser.mutateAsync(row.user_id) : await tenantUserActions.reactivateUser.mutateAsync(row.user_id); refreshMessage(String((response as any)?.message || (row.is_active ? 'Gebruiker gedeactiveerd.' : 'Gebruiker geactiveerd.'))); }}>{row.is_active ? 'Deactiveer' : 'Activeer'}</Button>
                      <Button variant="ghost" onClick={async () => { const response = await tenantUserActions.resendInvite.mutateAsync(row.user_id) as Record<string, unknown>; refreshMessage(String(response?.reset_url || response?.delivery_outbox_path || response?.message || 'Uitnodiging verstuurd.')); }}>Uitnodigen</Button>
                      <Button variant="ghost" onClick={async () => { const response = await tenantUserActions.resetPassword.mutateAsync(row.user_id) as Record<string, unknown>; refreshMessage(String(response?.reset_url || response?.delivery_outbox_path || response?.message || 'Resetlink aangemaakt.')); }}>Reset</Button>
                      <Button variant="ghost" onClick={async () => { await tenantUserActions.deleteUser.mutateAsync(row.user_id); refreshMessage(`Gebruiker ${row.email} verwijderd.`); }}>Verwijder</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}


        {detailTab === 'rechten' ? (
          <Card>
            <div className="section-title-row"><h3><ShieldCheck size={18} /> Rechten en toegang</h3></div>
            {tenantPermissionsSummary.isLoading ? <LoadingState label="Rechten laden..." /> : null}
            {tenantPermissionsSummary.isError ? <ErrorState title="Rechten niet geladen" description="Controleer of /platform/tenants/{id}/permissions-summary bereikbaar is." /> : null}
            {!tenantPermissionsSummary.isLoading && !tenantPermissionsSummary.isError ? (
              <>
                <div className="dashboard-kpi-grid superadmin-detail-kpis">
                  <StatCard title="Access mode" value={text(permissionSummary.access_mode, 'full_access')} meta="Actuele toegang" />
                  <StatCard title="Actieve users" value={Number(permissionSummary.active_user_count || 0)} meta="Gebruikers met toegang" />
                  <StatCard title="Tenant admins" value={Number((permissionSummary.role_counts as Record<string, number> | undefined)?.tenant_admin || 0)} meta="Beheerrollen" />
                  <StatCard title="Viewers" value={Number((permissionSummary.role_counts as Record<string, number> | undefined)?.viewer || 0)} meta="Alleen lezen" />
                </div>
                <div className="content-grid-2" style={{ marginTop: 16 }}>
                  <Card>
                    <div className="section-title-row"><h3>Rolverdeling</h3></div>
                    <div className="list-stack compact-list">
                      {Object.entries((permissionSummary.role_counts as Record<string, number> | undefined) || {}).map(([role, count]) => (
                        <div className="list-row" key={role}><div><strong>{role}</strong></div><Badge tone="neutral">{count}</Badge></div>
                      ))}
                    </div>
                  </Card>
                  <Card>
                    <div className="section-title-row"><h3>RBAC matrix</h3></div>
                    <div className="list-stack compact-list">
                      {Object.entries((permissionSummary.permissions_by_role as Record<string, string[]> | undefined) || {}).map(([role, perms]) => (
                        <div className="list-row" key={role}><div><strong>{role}</strong><div className="list-subtle">{(perms || []).join(' · ') || 'Geen expliciete rechten'}</div></div><Badge tone="neutral">{(perms || []).length}</Badge></div>
                      ))}
                    </div>
                  </Card>
                </div>
                <div style={{ marginTop: 16 }}><Card>
                  <div className="section-title-row"><h3>Recente access history</h3></div>
                  <div className="timeline-list">
                    {((permissionSummary.recent_access as Array<Record<string, unknown>> | undefined) || []).map((entry, index) => (
                      <div className="timeline-item" key={String(entry.id || index)}>
                        <div className="timeline-dot" />
                        <div>
                          <strong>{text(entry.access_mode, 'onbekend')}</strong>
                          <div className="list-subtle">{formatDatetime(text(entry.created_at, '')) || '—'} · {text(entry.reason, 'Geen reden')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card></div>
              </>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'groei' ? (
          <Card>
            <div className="section-title-row"><h3><LineChart size={18} /> Groei, analytics en integraties</h3></div>
            {(platformGrowthOverview.isLoading || platformIntegrationsCatalog.isLoading || platformReportingInsights.isLoading) ? <LoadingState label="Growth insights laden..." /> : null}
            {(platformGrowthOverview.isError || platformIntegrationsCatalog.isError || platformReportingInsights.isError) ? <ErrorState title="Growth-insights niet geladen" description="Controleer of de growth-, integrations- en reporting-endpoints bereikbaar zijn." /> : null}
            {!platformGrowthOverview.isLoading && !platformIntegrationsCatalog.isLoading && !platformReportingInsights.isLoading && !platformGrowthOverview.isError && !platformIntegrationsCatalog.isError && !platformReportingInsights.isError ? (
              <>
                <div className="dashboard-kpi-grid superadmin-detail-kpis">
                  <StatCard title="Actieve tenants" value={String(growthSummary.active_tenant_count || 0)} meta={`Totaal ${String(growthSummary.tenant_count || 0)}`} />
                  <StatCard title="Nieuwe users 30d" value={String(growthSummary.new_users_last_30_days || 0)} meta="Recente groei" />
                  <StatCard title="Exports 30d" value={String(reportingInsights.exports_last_30_days || 0)} meta="Reporting-activiteit" />
                  <StatCard title="ARR indicatie" value={formatCents(growthSummary.annual_run_rate_cents)} meta="Actieve seats x prijs" />
                </div>
                <div className="content-grid-2" style={{ marginTop: 12 }}>
                  <Card>
                    <div className="section-title-row"><h3><BarChart3 size={18} /> Growth signals</h3></div>
                    <div className="list-grid">
                      {Array.isArray(growthSummary.top_growth_signals) && growthSummary.top_growth_signals.length ? (growthSummary.top_growth_signals as Record<string, unknown>[]).map((item, index) => (
                        <div className="list-row" key={`${String(item.label)}-${index}`}>
                          <div><strong>{text(item.label)}</strong><div className="list-subtle">Platformsignaal voor acquisitie of retentie</div></div>
                          <Badge tone={String(item.tone || 'neutral') as any}>{text(item.value)}</Badge>
                        </div>
                      )) : <EmptyState title="Geen growth-signals" description="Nog geen analytics beschikbaar." />}
                    </div>
                  </Card>
                  <Card>
                    <div className="section-title-row"><h3><PlugZap size={18} /> Integraties</h3></div>
                    <div className="list-grid">
                      {integrationsCatalog.length ? integrationsCatalog.map((item, index) => (
                        <div className="list-row" key={`${String(item.key)}-${index}`}>
                          <div><strong>{text(item.label)}</strong><div className="list-subtle">{text(item.category, 'platform')}</div></div>
                          <Badge tone={String(item.status) === 'configured' ? 'success' : 'neutral'}>{text(item.status)}</Badge>
                        </div>
                      )) : <EmptyState title="Geen integraties" description="Er zijn nog geen integraties geregistreerd." />}
                    </div>
                  </Card>
                </div>
                <div className="content-grid-2" style={{ marginTop: 12 }}>
                  <Card>
                    <div className="section-title-row"><h3><FileText size={18} /> Advanced reporting</h3></div>
                    <div className="detail-grid">
                      <div><span>Total exports</span><strong>{String(reportingInsights.export_count || 0)}</strong></div>
                      <div><span>PDF exports</span><strong>{String(reportingInsights.pdf_export_count || 0)}</strong></div>
                      <div><span>ZIP exports</span><strong>{String(reportingInsights.zip_export_count || 0)}</strong></div>
                      <div><span>Failed exports</span><strong>{String(reportingInsights.failed_export_count || 0)}</strong></div>
                    </div>
                    {reportingInsights.advanced_reporting_ready ? <InlineMessage tone="success">Reporting-insights endpoint actief en klaar voor verdere differentiatie.</InlineMessage> : <InlineMessage tone="neutral">Reporting-insights nog niet compleet.</InlineMessage>}
                  </Card>
                  <Card>
                    <div className="section-title-row"><h3><Activity size={18} /> Aanbevolen volgende growth-stappen</h3></div>
                    <div className="checklist-grid">
                      <div className="checklist-item"><strong>Analytics dashboard</strong><span>Gebruik deze metrics voor een dedicated platform growth dashboard.</span></div>
                      <div className="checklist-item"><strong>CRM / lead integrations</strong><span>Voeg webhook- of CRM-koppelingen toe op trial en billing events.</span></div>
                      <div className="checklist-item"><strong>Advanced reporting packs</strong><span>Bied PDF/ZIP/manifest exports als commerciële differentiator aan.</span></div>
                      <div className="checklist-item"><strong>Retention signalen</strong><span>Combineer overdue, usage en export-activiteit voor churn-preventie.</span></div>
                    </div>
                  </Card>
                </div>
              </>
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

        {detailTab === 'security' ? (
          <Card>
            <div className="section-title-row"><h3><ShieldCheck size={18} /> Security en SaaS hardening</h3></div>
            {tenantSecurityOverview.isLoading || platformSecurityOverview.isLoading ? <LoadingState label="Security laden..." /> : null}
            {tenantSecurityOverview.isError ? <ErrorState title="Security niet geladen" description="Controleer of /platform/tenants/{id}/security-overview bereikbaar is." /> : null}
            {!tenantSecurityOverview.isLoading && !tenantSecurityOverview.isError ? (
              <>
                <div className="dashboard-kpi-grid superadmin-detail-kpis">
                  <StatCard title="Access mode" value={text(securitySummary.access_mode)} meta="Runtime tenanttoegang" />
                  <StatCard title="Write lock" value={securitySummary.write_blocked ? 'Actief' : 'Uit'} meta={Array.isArray(securitySummary.write_block_reasons) && securitySummary.write_block_reasons.length ? `${securitySummary.write_block_reasons.length} reden(en)` : 'Geen blokkades'} />
                  <StatCard title="Users actief" value={String(securitySummary.active_user_count || 0)} meta={`Totaal ${String(securitySummary.total_user_count || 0)}`} />
                  <StatCard title="Platform snapshots" value={String((globalSecuritySummary.snapshot_count_last_30_days as number) || 0)} meta="Laatste 30 dagen" />
                </div>
                {Array.isArray(securitySummary.write_block_reasons) && securitySummary.write_block_reasons.length ? <InlineMessage tone="danger">{`Write lock redenen: ${securitySummary.write_block_reasons.join(', ')}`}</InlineMessage> : <InlineMessage tone="success">Geen actieve write lock voor deze tenant.</InlineMessage>}
                <div className="detail-grid" style={{ marginTop: 12 }}>
                  <div><span>Tenantstatus</span><strong>{text(securitySummary.tenant_status)}</strong></div>
                  <div><span>Billing self-service</span><strong>{securitySummary.self_service_billing_allowed === false ? 'Beperkt' : 'Actief'}</strong></div>
                  <div><span>Access totals platform</span><strong>{metaToString(globalSecuritySummary.access_mode_totals)}</strong></div>
                  <div><span>Provider totals</span><strong>{metaToString(globalSecuritySummary.billing_provider_totals)}</strong></div>
                </div>
                {securitySummary.latest_access_snapshot ? <InlineMessage tone="neutral">{`Laatste snapshot: ${text((securitySummary.latest_access_snapshot as Record<string, unknown>).access_mode)} · ${formatDatetime(text((securitySummary.latest_access_snapshot as Record<string, unknown>).created_at, '')) || '—'}`}</InlineMessage> : null}
              </>
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
                {billingEventRows.length ? <InlineMessage tone="neutral">{`Laatste billing event: ${text((billingEventRows[0] as any).event_type)} · ${formatDatetime(text((billingEventRows[0] as any).created_at, '')) || '—'}`}</InlineMessage> : null}
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
            <div className="section-title-row"><h3>Statusbeheer en tenant bewerken</h3></div>
            <div className="toolbar-cluster superadmin-status-actions">
              <Button variant="secondary" onClick={() => selectedTenant && setPendingAction({ type: 'activate', tenant: selectedTenant })}>Activeer</Button>
              <Button variant="secondary" onClick={() => selectedTenant && setPendingAction({ type: 'deactivate', tenant: selectedTenant })}>Deactiveer</Button>
              <Button variant="secondary" onClick={() => selectedTenant && setPendingAction({ type: 'suspend', tenant: selectedTenant })}>Suspend</Button>
              <Button variant="secondary" onClick={() => selectedTenant && setPendingAction({ type: 'trial', tenant: selectedTenant })}>Start trial</Button>
              <Button variant="secondary" onClick={async () => { if (!selectedTenant) return; const response = await tenantActions.toggleDemoMode.mutateAsync({ tenantId: selectedTenant.id, isDemo: !Boolean((detailTenant as any)?.is_demo) }); refreshMessage(String((response as any)?.message || `Demo mode ${!Boolean((detailTenant as any)?.is_demo) ? 'ingeschakeld' : 'uitgeschakeld'}.`)); }}>Demo mode</Button>
              <Button variant="ghost" onClick={() => setEditTenantOpen(true)}>Tenant bewerken</Button>
            </div>
            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div><span>Demo mode</span><strong>{Boolean((detailTenant as any)?.is_demo) ? 'Aan' : 'Uit'}</strong></div>
              <div><span>Access history</span><strong>{String(accessHistoryRows.length)}</strong><small>{accessHistoryRows[0] ? text((accessHistoryRows[0] as any).access_mode) : 'Geen snapshots'}</small></div>
            </div>
            <div className="checklist-grid" style={{ marginTop: 16 }}>
              <div className="checklist-item"><strong>Statusmapping</strong><span>Trial, actief, inactief en gesuspendeerd worden expliciet getoond.</span></div>
              <div className="checklist-item"><strong>Force logout</strong><span>Alle refresh tokens van de tenant kunnen worden ingetrokken.</span></div>
              <div className="checklist-item"><strong>Tenant-view</strong><span>Meekijken wordt zichtbaar geactiveerd en ook expliciet beëindigd.</span></div>
              <div className="checklist-item"><strong>RBAC</strong><span>Alleen platform_admin / superadmin ziet deze module en acties.</span></div>
            </div>
            {detailTenant ? (
              <form className="page-stack" style={{ marginTop: 16 }} onSubmit={async (event) => {
                event.preventDefault();
                if (!selectedTenant) return;
                await tenantActions.patchTenant.mutateAsync({ tenantId: selectedTenant.id, payload: tenantEditForm });
                refreshMessage(`Tenant ${tenantEditForm.name || selectedTenant.id} bijgewerkt.`);
                setEditTenantOpen(false);
              }}>
                <div className="content-grid-2">
                  <label><span>Tenantnaam</span><Input value={String(tenantEditForm.name || '')} onChange={(event) => setTenantEditForm((current) => ({ ...current, name: event.target.value }))} required /></label>
                  <label><span>Status</span><Select value={String(tenantEditForm.status || 'trial')} onChange={(event) => setTenantEditForm((current) => ({ ...current, status: event.target.value }))}><option value="trial">Trial</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option></Select></label>
                  <label><span>Seats</span><Input type="number" min={1} value={Number(tenantEditForm.seats_purchased || 1)} onChange={(event) => setTenantEditForm((current) => ({ ...current, seats_purchased: Number(event.target.value || 1) }))} /></label>
                  <label><span>Prijs per seat / jaar (cent)</span><Input type="number" min={0} value={Number(tenantEditForm.price_per_seat_year_cents || 0)} onChange={(event) => setTenantEditForm((current) => ({ ...current, price_per_seat_year_cents: Number(event.target.value || 0) }))} /></label>
                  <label><span>Billing provider</span><Select value={String(tenantEditForm.billing_provider || 'none')} onChange={(event) => setTenantEditForm((current) => ({ ...current, billing_provider: event.target.value }))}><option value="none">none</option><option value="manual">manual</option><option value="mollie">mollie</option></Select></label>
                  <label><span>Actief</span><Select value={tenantEditForm.is_active === false ? 'false' : 'true'} onChange={(event) => setTenantEditForm((current) => ({ ...current, is_active: event.target.value === 'true' }))}><option value="true">Ja</option><option value="false">Nee</option></Select></label>
                </div>
                {editTenantOpen ? <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setEditTenantOpen(false)}>Annuleren</Button><Button type="submit" disabled={tenantActions.patchTenant.isPending}>Tenant opslaan</Button></div> : null}
              </form>
            ) : null}
          </Card>
        ) : null}
      </Drawer>

      <Drawer open={Boolean(editingUser)} title={editingUser ? `Gebruiker bewerken · ${editingUser.email}` : 'Gebruiker bewerken'} onClose={() => setEditingUser(null)}>
        <form className="page-stack" onSubmit={async (event) => {
          event.preventDefault();
          if (!editingUser) return;
          await tenantUserActions.patchUser.mutateAsync({ userId: editingUser.user_id, payload: tenantUserEditForm });
          refreshMessage(`Gebruiker ${tenantUserEditForm.email || editingUser.email} bijgewerkt.`);
          setEditingUser(null);
        }}>
          <label><span>E-mail</span><Input type="email" value={String(tenantUserEditForm.email || '')} onChange={(event) => setTenantUserEditForm((current) => ({ ...current, email: event.target.value }))} required /></label>
          <label><span>Rol</span><Select value={String(tenantUserEditForm.role || 'viewer')} onChange={(event) => setTenantUserEditForm((current) => ({ ...current, role: event.target.value }))}><option value="viewer">viewer</option><option value="tenant_user">tenant_user</option><option value="tenant_admin">tenant_admin</option></Select></label>
          <label><span>Actief</span><Select value={tenantUserEditForm.is_active === false ? 'false' : 'true'} onChange={(event) => setTenantUserEditForm((current) => ({ ...current, is_active: event.target.value === 'true' }))}><option value="true">Ja</option><option value="false">Nee</option></Select></label>
          <div className="toolbar-cluster">
            <Button type="button" variant="secondary" onClick={async () => { if (!editingUser) return; const response = await tenantUserActions.resendInvite.mutateAsync(editingUser.user_id) as Record<string, unknown>; refreshMessage(String(response?.reset_url || response?.delivery_outbox_path || response?.message || 'Uitnodiging verstuurd.')); }}>Uitnodiging opnieuw sturen</Button>
            <Button type="button" variant="secondary" onClick={async () => { if (!editingUser) return; const response = await tenantUserActions.resetPassword.mutateAsync(editingUser.user_id) as Record<string, unknown>; refreshMessage(String(response?.reset_url || response?.delivery_outbox_path || response?.message || 'Resetlink aangemaakt.')); }}>Reset wachtwoord</Button>
            <Button type="button" variant="secondary" onClick={async () => { if (!editingUser) return; const response = editingUser.is_active ? await tenantUserActions.deactivateUser.mutateAsync(editingUser.user_id) : await tenantUserActions.reactivateUser.mutateAsync(editingUser.user_id); refreshMessage(String((response as any)?.message || (editingUser.is_active ? 'Gebruiker gedeactiveerd.' : 'Gebruiker geactiveerd.'))); setEditingUser((current) => current ? { ...current, is_active: !current.is_active } : current); }}>
              {editingUser?.is_active ? 'Deactiveer gebruiker' : 'Heractiveer gebruiker'}
            </Button>
            <Button type="button" variant="ghost" onClick={async () => { if (!editingUser) return; await tenantUserActions.deleteUser.mutateAsync(editingUser.user_id); refreshMessage(`Gebruiker ${editingUser.email} verwijderd.`); setEditingUser(null); }}>Verwijder</Button>
          </div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>Annuleren</Button><Button type="submit" disabled={tenantUserActions.patchUser.isPending}>Gebruiker opslaan</Button></div>
        </form>
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
          <label><span>Plan code</span><Select value={planForm.plan_code} onChange={(event) => setPlanForm((current) => ({ ...current, plan_code: event.target.value }))}>{platformPlans.length ? platformPlans.map((plan: any) => <option key={String(plan.code)} value={String(plan.code)}>{String(plan.name || plan.code)} · {formatCents(plan.price_cents || plan.price_per_seat_cents)}</option>) : <option value="professional">professional</option>}</Select></label>
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

export default SuperadminPage;
