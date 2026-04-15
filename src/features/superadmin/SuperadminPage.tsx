import { useMemo, useState } from 'react';
import { Activity, BadgeCheck, Building2, CreditCard, LogIn, LogOut, Search, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { Drawer } from '@/components/drawer/Drawer';
import { DataTable, type ColumnDef } from '@/components/datatable/DataTable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Select } from '@/components/ui/Select';
import { ConfirmActionDialog } from '@/components/dialogs/ConfirmActionDialog';
import { useSession } from '@/app/session/SessionContext';
import { useAuthStore } from '@/app/store/auth-store';
import { useUiStore } from '@/app/store/ui-store';
import { useExitImpersonation, useImpersonateTenant, useTenants } from '@/hooks/useTenants';
import { useTenantAudit, useTenantBillingPanel, useTenantDetail, useTenantUsers } from '@/hooks/useTenantAdmin';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useTenantBillingActions, useTenantBillingDetail, useTenantPayments } from '@/hooks/usePlatformBilling';
import type { AuditSummary, BillingPayment, PlatformSummary, Tenant, TenantUser } from '@/types/domain';
import { formatDatetime, toneFromStatus } from '@/utils/format';

const detailTabs = [
  { value: 'samenvatting', label: 'Samenvatting' },
  { value: 'gebruikers', label: 'Gebruikers' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'status', label: 'Statusbeheer' },
];

function numberOrZero(value: unknown) {
  return typeof value === 'number' ? value : Number(value || 0);
}

function text(value: unknown, fallback = '—') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

export function SuperadminPage() {
  const session = useSession();
  const tenants = useTenants(true, { page: 1, limit: 50 });
  const health = useSystemHealth();
  const impersonate = useImpersonateTenant();
  const exitImpersonation = useExitImpersonation();
  const startImpersonation = useAuthStore((state) => state.startImpersonation);
  const currentUser = useAuthStore((state) => state.user);
  const pushNotification = useUiStore((state) => state.pushNotification);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [detailTab, setDetailTab] = useState('samenvatting');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'alles' | 'actief' | 'overig'>('alles');
  const [tenantPage, setTenantPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('enterprise');
  const [pendingBillingAction, setPendingBillingAction] = useState<'change-plan' | 'manual-payment' | 'cancel-subscription' | null>(null);

  const tenantRows: Tenant[] = tenants.data?.items || [];
  const tenantDetail = useTenantDetail(selectedTenant?.id, Boolean(selectedTenant));
  const tenantUsers = useTenantUsers(selectedTenant?.id, Boolean(selectedTenant));
  const tenantAudit = useTenantAudit(selectedTenant?.id, Boolean(selectedTenant));
  const tenantBilling = useTenantBillingPanel(selectedTenant?.id, Boolean(selectedTenant));
  const tenantBillingDetail = useTenantBillingDetail(selectedTenant?.id);
  const tenantPayments = useTenantPayments(selectedTenant?.id, { page: paymentsPage, limit: 10, sort: 'created_at', direction: 'desc' });
  const tenantBillingActions = useTenantBillingActions(selectedTenant?.id);

  const filteredRows = useMemo(() => {
    return tenantRows.filter((tenant) => {
      const haystack = `${tenant.name || ''} ${tenant.id || ''} ${tenant.subscription_status || ''}`.toLowerCase();
      const queryMatch = haystack.includes(search.toLowerCase());
      const active = String(tenant.subscription_status || '').toLowerCase().includes('act');
      const statusMatch = statusFilter === 'alles' ? true : statusFilter === 'actief' ? active : !active;
      return queryMatch && statusMatch;
    });
  }, [search, statusFilter, tenantRows]);

  const pagedTenantRows = useMemo(() => filteredRows.slice((tenantPage - 1) * 10, tenantPage * 10), [filteredRows, tenantPage]);

  const stats = useMemo(() => {
    const active = tenantRows.filter((tenant) => String(tenant.subscription_status || '').toLowerCase().includes('act')).length;
    const users = tenantRows.reduce((total, tenant) => total + numberOrZero(tenant.user_count), 0);
    const flagged = tenantRows.filter((tenant) => !tenant.subscription_status || numberOrZero(tenant.user_count) === 0).length;
    return {
      totalTenants: tenantRows.length,
      activeTenants: active,
      totalUsers: users,
      flaggedTenants: flagged,
    };
  }, [tenantRows]);

  const columns: ColumnDef<Tenant>[] = [
    { key: 'name', header: 'Tenant', sortable: true, cell: (row) => <strong>{text(row.name, text(row.id))}</strong> },
    {
      key: 'subscription_status',
      header: 'Status',
      sortable: true,
      cell: (row) => (
        <Badge tone={toneFromStatus(text(row.subscription_status, 'neutral'))}>
          {text(row.subscription_status, 'Onbekend')}
        </Badge>
      ),
    },
    { key: 'user_count', header: 'Gebruikers', sortable: true, cell: (row) => text(row.user_count) },
    { key: 'created_at', header: 'Aangemaakt', cell: (row) => text(row.created_at) },
    {
      key: 'actions',
      header: 'Acties',
      cell: (row) => (
        <div className="row-actions">
          <Button variant="secondary" onClick={() => { setSelectedTenant(row); setDetailTab('samenvatting'); }}>Details</Button>
          <Button
            variant="secondary"
            disabled={!session.hasPermission('tenants.impersonate') || impersonate.isPending}
            onClick={async () => {
              try {
                const response = await impersonate.mutateAsync(row.id);
                const token = response.access_token || response.token;
                if (token && currentUser) {
                  startImpersonation(token, {
                    email: response.user?.email || currentUser.email,
                    role: response.user?.role || 'TenantAdmin',
                    tenant: response.user?.tenant || row.name || String(row.id),
                    tenantId: response.user?.tenant_id || row.id,
                    name: response.user?.name || currentUser.name,
                  }, currentUser);
                  setMessage(`Tenant-view gestart voor ${row.name || row.id}.`);
                  pushNotification({ title: 'Tenant-view actief', description: `Je kijkt nu mee in ${row.name || row.id}.`, tone: 'info' });
                }
              } catch (error) {
                const description = error instanceof Error ? error.message : 'Onbekende fout';
                setMessage(description);
                pushNotification({ title: 'Tenant-view mislukt', description, tone: 'error' });
              }
            }}
          >
            <LogIn size={16} /> Meekijken
          </Button>
        </div>
      ),
    },
  ];

  const userRows: TenantUser[] = tenantUsers.data?.items || [];
  const auditRows: AuditSummary[] = tenantAudit.data?.items || [];
  const billingPayload: PlatformSummary = {
    ...(tenantBilling.data || {}),
    ...((tenantBillingDetail.data || {}) as Record<string, unknown>),
  };
  const paymentRows: BillingPayment[] = tenantPayments.data?.items || [];
  const detailPayload: Tenant = {
    ...(selectedTenant || { id: '' }),
    ...(tenantDetail.data || {}),
  };

  return (
    <div className="page-stack">
      <PageHeader title="Superadmin" description="Tenantbeheer, tenant-view en platformcontrole op bestaande platform-, audit- en billing-endpoints." />
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {session.isImpersonating ? (
        <div className="stack-actions">
          <InlineMessage tone="danger">{`Je kijkt nu mee in tenant ${session.impersonationTenantName || session.tenant || 'onbekend'}.`}</InlineMessage>
          <Button variant="secondary" onClick={async () => {
            try {
              await exitImpersonation.mutateAsync();
              setMessage('Tenant-view beëindigd.');
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Tenant-view beëindigen mislukt.');
            }
          }}>
            <LogOut size={16} /> Verlaat tenant-view
          </Button>
        </div>
      ) : null}

      <div className="kpi-strip">
        <div className="kpi-card"><span>Tenants</span><strong>{stats.totalTenants}</strong></div>
        <div className="kpi-card"><span>Actieve tenants</span><strong>{stats.activeTenants}</strong></div>
        <div className="kpi-card"><span>Gebruikers</span><strong>{stats.totalUsers}</strong></div>
        <div className="kpi-card"><span>Opvolgen</span><strong>{stats.flaggedTenants}</strong></div>
      </div>

      <div className="content-grid-2">
        <Card>
          <div className="section-title-row">
            <h3><Building2 size={18} /> Tenantlijst</h3>
            <div className="inline-end-cluster">
              <Badge tone={health.isError ? 'warning' : 'success'}>{health.isError ? 'Health-check fout' : 'Platform online'}</Badge>
              <Badge tone={session.hasPermission('tenants.impersonate') ? 'success' : 'warning'}>{session.hasPermission('tenants.impersonate') ? 'Impersonatie actief' : 'Alleen lezen'}</Badge>
            </div>
          </div>
          <div className="toolbar-shell">
            <div className="toolbar-inline-group">
              <div className="search-shell inline-search-shell">
                <Search size={16} />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek tenant, id of status" />
              </div>
              <div className="segmented-control">
                <button type="button" className={statusFilter === 'alles' ? 'is-active' : ''} onClick={() => setStatusFilter('alles')}>Alles</button>
                <button type="button" className={statusFilter === 'actief' ? 'is-active' : ''} onClick={() => setStatusFilter('actief')}>Actief</button>
                <button type="button" className={statusFilter === 'overig' ? 'is-active' : ''} onClick={() => setStatusFilter('overig')}>Overig</button>
              </div>
            </div>
          </div>
          {tenants.isLoading ? <LoadingState label="Tenants laden..." /> : null}
          {tenants.isError ? <ErrorState title="Tenantlijst niet geladen" description="Controleer of /platform/tenants bereikbaar is." /> : null}
          {!tenants.isLoading && !tenants.isError && filteredRows.length === 0 ? <EmptyState title="Geen tenants" description="Pas je zoekterm of statusfilter aan." /> : null}
          {!tenants.isLoading && !tenants.isError && filteredRows.length > 0 ? <DataTable columns={columns} rows={pagedTenantRows} rowKey={(row) => String(row.id)} page={tenantPage} total={filteredRows.length} pageSize={10} onPageChange={setTenantPage} /> : null}
        </Card>

        <Card>
          <div className="section-title-row">
            <h3><ShieldCheck size={18} /> Platformstatus</h3>
          </div>
          {health.isLoading ? <LoadingState label="Health controleren..." /> : null}
          {health.isError ? <ErrorState title="Health niet bereikbaar" description="De backend-healthcheck reageert niet via de ingestelde URL." /> : null}
          {health.data ? <pre className="code-block">{JSON.stringify(health.data, null, 2)}</pre> : null}
        </Card>
      </div>

      <Drawer open={Boolean(selectedTenant)} title={selectedTenant?.name || 'Tenant details'} onClose={() => setSelectedTenant(null)}>
        <Tabs tabs={detailTabs} value={detailTab} onChange={setDetailTab} />

        {detailTab === 'samenvatting' ? (
          <Card>
            <div className="section-title-row"><h3><BadgeCheck size={18} /> Tenant detail</h3></div>
            {tenantDetail.isLoading ? <LoadingState label="Tenant detail laden..." /> : null}
            {tenantDetail.isError ? <ErrorState title="Tenantdetail niet geladen" description="Controleer of /platform/tenants/{id} bereikbaar is." /> : null}
            {!tenantDetail.isLoading && !tenantDetail.isError ? (
              <>
                <div className="kpi-strip">
                  <div className="kpi-card"><span>Naam</span><strong>{text(detailPayload.name)}</strong></div>
                  <div className="kpi-card"><span>Status</span><strong>{text(detailPayload.subscription_status)}</strong></div>
                  <div className="kpi-card"><span>Gebruikers</span><strong>{text(detailPayload.user_count)}</strong></div>
                  <div className="kpi-card"><span>Tenant key</span><strong>{text(detailPayload.tenant_key || detailPayload.slug)}</strong></div>
                </div>
                <div className="detail-grid">
                  <div><span>Naam</span><strong>{text(detailPayload.name)}</strong></div>
                  <div><span>ID</span><strong>{text(detailPayload.id)}</strong></div>
                  <div><span>Status</span><strong>{text(detailPayload.subscription_status)}</strong></div>
                  <div><span>Aangemaakt</span><strong>{formatDatetime(text(detailPayload.created_at, '')) || '—'}</strong></div>
                  <div><span>Gebruikers</span><strong>{text(detailPayload.user_count)}</strong></div>
                  <div><span>Tenant key</span><strong>{text(detailPayload.tenant_key || detailPayload.slug)}</strong></div>
                </div>
              </>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'gebruikers' ? (
          <Card>
            <div className="section-title-row"><h3><Users size={18} /> Tenant users</h3></div>
            {tenantUsers.isLoading ? <LoadingState label="Gebruikers laden..." /> : null}
            {tenantUsers.isError ? <ErrorState title="Gebruikers niet geladen" description="Controleer of /platform/tenants/{id}/users bereikbaar is." /> : null}
            {!tenantUsers.isLoading && !tenantUsers.isError && userRows.length === 0 ? <EmptyState title="Geen gebruikers" description="Geen users terug uit de tenant-users API." /> : null}
            {!tenantUsers.isLoading && !tenantUsers.isError && userRows.length > 0 ? (
              <div className="list-stack compact-list">
                {userRows.map((row, index) => (
                  <div className="list-row" key={String(row.id || index)}>
                    <div>
                      <strong>{text(row.email || row.name, `Gebruiker ${index + 1}`)}</strong>
                      <div className="list-subtle">{text(row.name || row.display_name, '')}</div>
                    </div>
                    <Badge tone={toneFromStatus(text(row.role, 'neutral'))}>{text(row.role, 'Onbekend')}</Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'audit' ? (
          <Card>
            <div className="section-title-row"><h3><Activity size={18} /> Tenant audit</h3></div>
            {tenantAudit.isLoading ? <LoadingState label="Auditregels laden..." /> : null}
            {tenantAudit.isError ? <ErrorState title="Audit niet geladen" description="Controleer of /platform/tenants/{id}/audit bereikbaar is." /> : null}
            {!tenantAudit.isLoading && !tenantAudit.isError && auditRows.length === 0 ? <EmptyState title="Geen auditregels" description="De audit-endpoint gaf nog geen regels terug." /> : null}
            {!tenantAudit.isLoading && !tenantAudit.isError && auditRows.length > 0 ? (
              <div className="timeline-list">
                {auditRows.map((row, index) => (
                  <div className="timeline-item" key={String(row.id || index)}>
                    <div className="timeline-dot" />
                    <div>
                      <strong>{text(row.action || row.title, `Auditregel ${index + 1}`)}</strong>
                      <div className="list-subtle">{text(row.actor || row.user, '')} · {formatDatetime(text(row.created_at || row.timestamp, ''))}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'billing' ? (
          <Card>
            <div className="section-title-row"><h3><CreditCard size={18} /> Tenant billing</h3><Badge tone="neutral">Payments + acties</Badge></div>
            {(tenantBilling.isLoading || tenantBillingDetail.isLoading) ? <LoadingState label="Billingpanel laden..." /> : null}
            {(tenantBilling.isError || tenantBillingDetail.isError) ? <ErrorState title="Billing niet geladen" description="Controleer of /platform/tenants/{id}/billing bereikbaar is." /> : null}
            {!tenantBilling.isLoading && !tenantBillingDetail.isLoading && !tenantBilling.isError && !tenantBillingDetail.isError ? (
              <>
                <div className="detail-grid">
                  <div><span>Plan</span><strong>{text(billingPayload.plan || billingPayload.subscription_plan)}</strong></div>
                  <div><span>Status</span><strong>{text(billingPayload.status || billingPayload.subscription_status)}</strong></div>
                  <div><span>Volgende factuur</span><strong>{formatDatetime(text(billingPayload.next_billing_date || billingPayload.renewal_date, '')) || '—'}</strong></div>
                  <div><span>Openstaand</span><strong>{text(billingPayload.balance_due || billingPayload.amount_due)}</strong></div>
                </div>
                <div className="toolbar-cluster" style={{ marginTop: 16 }}>
                  <Select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)}>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="enterprise">Enterprise</option>
                  </Select>
                  <Button variant="secondary" onClick={() => setPendingBillingAction('change-plan')}>Plan wijzigen</Button>
                  <Button variant="secondary" onClick={() => setPendingBillingAction('manual-payment')}>Manual payment</Button>
                  <Button variant="secondary" onClick={() => setPendingBillingAction('cancel-subscription')}>Abonnement stopzetten</Button>
                </div>
                <div style={{ marginTop: 16 }}>
                  <strong>Billing payload</strong>
                  <pre className="code-block">{JSON.stringify(billingPayload, null, 2)}</pre>
                </div>
                <div className="section-title-row" style={{ marginTop: 16 }}><h3>Payments</h3></div>
                {tenantPayments.isLoading ? <LoadingState label="Payments laden..." /> : null}
                {tenantPayments.isError ? <ErrorState title="Payments niet geladen" description="Controleer of /platform/tenants/{id}/payments bereikbaar is." /> : null}
                {!tenantPayments.isLoading && !tenantPayments.isError && paymentRows.length === 0 ? <EmptyState title="Geen payments" description="Er zijn nog geen payments beschikbaar voor deze tenant." /> : null}
                {!tenantPayments.isLoading && !tenantPayments.isError && paymentRows.length > 0 ? (
                  <DataTable
                    columns={[
                      { key: 'id', header: 'Payment', cell: (row: BillingPayment) => <strong>{text(row.id || row.reference)}</strong> },
                      { key: 'amount', header: 'Bedrag', cell: (row: BillingPayment) => text(row.amount || row.total) },
                      { key: 'currency', header: 'Valuta', cell: (row: BillingPayment) => text(row.currency, 'EUR') },
                      { key: 'status', header: 'Status', cell: (row: BillingPayment) => <Badge tone={toneFromStatus(text(row.status, 'neutral'))}>{text(row.status, 'Onbekend')}</Badge> },
                      { key: 'provider', header: 'Provider', cell: (row: BillingPayment) => text(row.provider || row.method) },
                      { key: 'created_at', header: 'Aangemaakt', cell: (row: BillingPayment) => formatDatetime(text(row.created_at || row.date, '')) || '—' },
                    ]}
                    rows={paymentRows}
                    rowKey={(row) => String(row.id || row.reference || '')}
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
            <div className="section-title-row"><h3>Statusbeheer</h3><Badge tone="neutral">Frontend guardrails</Badge></div>
            <div className="checklist-grid">
              <div className="checklist-item"><strong>Tenantstatus zichtbaar</strong><span>Status wordt uit bestaande payload gelezen.</span></div>
              <div className="checklist-item"><strong>Tenant-view expliciet</strong><span>Meekijken vereist een zichtbare knop en banner.</span></div>
              <div className="checklist-item"><strong>RBAC afgedwongen</strong><span>SUPERADMIN, SUPER_ADMIN, ADMIN en PLATFORM_ADMIN kunnen dit scherm openen.</span></div>
              <div className="checklist-item"><strong>Geen stille impersonatie</strong><span>Exit loopt via banner en expliciete actie.</span></div>
            </div>
          </Card>
        ) : null}

        <ConfirmActionDialog
          open={pendingBillingAction === 'change-plan'}
          title="Tenantplan wijzigen"
          description={`Wijzig het tenantplan naar ${selectedPlan} voor ${selectedTenant?.name || selectedTenant?.id || 'de tenant'}.`}
          confirmLabel="Plan wijzigen"
          onClose={() => setPendingBillingAction(null)}
          onConfirm={async () => {
            await tenantBillingActions.changePlan.mutateAsync({ plan: selectedPlan });
            setMessage(`Tenantplan gewijzigd naar ${selectedPlan}.`);
            setPendingBillingAction(null);
          }}
        />
        <ConfirmActionDialog
          open={pendingBillingAction === 'manual-payment'}
          title="Manual payment registreren"
          description="Registreer een handmatige betaling voor de geselecteerde tenant via het platform-endpoint."
          confirmLabel="Manual payment"
          onClose={() => setPendingBillingAction(null)}
          onConfirm={async () => {
            await tenantBillingActions.manualPayment.mutateAsync({ amount: billingPayload.amount_due || 0, currency: billingPayload.currency || 'EUR' });
            setMessage('Manual payment verstuurd.');
            setPendingBillingAction(null);
          }}
        />
        <ConfirmActionDialog
          open={pendingBillingAction === 'cancel-subscription'}
          title="Abonnement stopzetten"
          description="Stop het tenantabonnement via het platform-endpoint."
          confirmLabel="Stopzetten"
          onClose={() => setPendingBillingAction(null)}
          onConfirm={async () => {
            await tenantBillingActions.cancelSubscription.mutateAsync({ reason: 'Cancelled from superadmin frontend' });
            setMessage('Tenantabonnement stopgezet.');
            setPendingBillingAction(null);
          }}
        />
      </Drawer>
    </div>
  );
}
