import { useMemo, useState } from 'react';
import { Activity, BadgeCheck, Building2, Download, LogIn, LogOut, ShieldCheck, Users } from 'lucide-react';
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
import { useExitImpersonation, useImpersonateTenant, usePlatformSummary, useTenantStatusActions, useTenants } from '@/hooks/useTenants';
import { useTenantAudit, useTenantAuditSummary, useTenantBillingPanel, useTenantDetail, useTenantUserActions, useTenantUsers } from '@/hooks/useTenantAdmin';
import type { AuditEntry, Tenant, TenantUser } from '@/types/domain';
import { formatDatetime, toneFromStatus } from '@/utils/format';

const detailTabs = [
  { value: 'samenvatting', label: 'Samenvatting' },
  { value: 'gebruikers', label: 'Gebruikers' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'status', label: 'Statusbeheer' },
];

const roleOptions = ['tenant_admin', 'tenant_user', 'qc', 'auditor', 'viewer'];

function toTenantStatus(tenant: Tenant) {
  return String(tenant.status || tenant.subscription_status || 'onbekend');
}

function toTenantUsersCount(tenant: Tenant) {
  return Number(tenant.users_count ?? tenant.user_count ?? 0);
}

function parseAuditMeta(meta: unknown) {
  if (!meta) return '';
  if (typeof meta === 'string') {
    try {
      return JSON.stringify(JSON.parse(meta), null, 2);
    } catch {
      return meta;
    }
  }
  try {
    return JSON.stringify(meta, null, 2);
  } catch {
    return String(meta);
  }
}

export function SuperadminPage() {
  const session = useSession();
  const pushNotification = useUiStore((state) => state.pushNotification);
  const startImpersonation = useAuthStore((state) => state.startImpersonation);
  const currentUser = useAuthStore((state) => state.user);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [detailTab, setDetailTab] = useState('samenvatting');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tenantPage, setTenantPage] = useState(1);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<TenantUser | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('viewer');

  const tenants = useTenants(true, { q: search || undefined, status: statusFilter || undefined, limit: 100 });
  const summary = usePlatformSummary(true);
  const impersonate = useImpersonateTenant();
  const exitImpersonation = useExitImpersonation();
  const statusActions = useTenantStatusActions();

  const tenantDetail = useTenantDetail(selectedTenant?.id, Boolean(selectedTenant));
  const tenantUsers = useTenantUsers(selectedTenant?.id, Boolean(selectedTenant));
  const tenantAudit = useTenantAudit(selectedTenant?.id, Boolean(selectedTenant));
  const tenantAuditSummary = useTenantAuditSummary(selectedTenant?.id, Boolean(selectedTenant));
  const tenantBilling = useTenantBillingPanel(selectedTenant?.id, Boolean(selectedTenant));
  const tenantUserActions = useTenantUserActions(selectedTenant?.id);

  const tenantRows = useMemo(() => tenants.data?.items || [], [tenants.data]);
  const pagedTenantRows = useMemo(() => tenantRows.slice((tenantPage - 1) * 10, tenantPage * 10), [tenantRows, tenantPage]);
  const users = useMemo(() => (tenantUsers.data || []) as TenantUser[], [tenantUsers.data]);
  const auditRows = useMemo(() => (tenantAudit.data || []) as AuditEntry[], [tenantAudit.data]);
  const detailTenant = (tenantDetail.data || selectedTenant) as Tenant | null;

  const columns: ColumnDef<Tenant>[] = [
    { key: 'name', header: 'Tenant', sortable: true, cell: (row) => <strong>{row.name || row.id}</strong> },
    { key: 'status', header: 'Status', sortable: true, cell: (row) => <Badge tone={toneFromStatus(toTenantStatus(row))}>{toTenantStatus(row)}</Badge> },
    { key: 'users_count', header: 'Gebruikers', cell: (row) => toTenantUsersCount(row) || '—' },
    { key: 'billing_provider', header: 'Billing', cell: (row) => String(row.billing_provider || 'none') },
    { key: 'created_at', header: 'Aangemaakt', cell: (row) => formatDatetime(String(row.created_at || '')) || '—' },
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
                }
              } catch (error) {
                const detail = error instanceof Error ? error.message : 'Impersonatie mislukt.';
                setMessage(detail);
              }
            }}
          >
            <LogIn size={16} /> Bekijk tenant
          </Button>
        </div>
      ),
    },
  ];

  async function handleCreateUser() {
    if (!selectedTenant?.id || !newUserEmail || !newUserPassword) return;
    try {
      await tenantUserActions.create.mutateAsync({
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        is_active: true,
      });
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('viewer');
      setMessage('Tenantgebruiker toegevoegd.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gebruiker toevoegen mislukt.');
    }
  }

  async function handleExportAudit() {
    if (!selectedTenant?.id) return;
    try {
      const blob = await tenantUserActions.exportCsv.mutateAsync();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tenant-audit-${selectedTenant.id}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Audit-export mislukt.');
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Superadmin"
        description="Tenantbeheer, audit en hardening voor platformbeheer."
      >
        {session.isImpersonating ? (
          <Button
            variant="danger"
            onClick={async () => {
              await exitImpersonation.mutateAsync();
              pushNotification({ title: 'Tenant-view beëindigd', description: 'Je bent terug in superadmin.', tone: 'info' });
            }}
          >
            <LogOut size={16} /> Verlaat tenant-view
          </Button>
        ) : null}
      </PageHeader>

      {message ? <InlineMessage tone="neutral">{message}</InlineMessage> : null}

      <div className="kpi-strip">
        <div className="kpi-card"><span>Tenants</span><strong>{summary.data?.total_tenants ?? tenantRows.length}</strong></div>
        <div className="kpi-card"><span>Actief</span><strong>{summary.data?.active_tenants ?? 0}</strong></div>
        <div className="kpi-card"><span>Gebruikers</span><strong>{summary.data?.total_users ?? 0}</strong></div>
        <div className="kpi-card"><span>Seats</span><strong>{summary.data?.total_seats ?? 0}</strong></div>
      </div>

      <div className="content-grid-2">
        <Card>
          <div className="section-title-row">
            <h3><Building2 size={18} /> Tenantlijst</h3>
            <Badge tone="neutral">Fase 3 audit/hardening</Badge>
          </div>
          <div className="toolbar-shell">
            <div className="toolbar-inline-group">
              <Input value={search} onChange={(event) => { setSearch(event.target.value); setTenantPage(1); }} placeholder="Zoek tenant of id" />
              <Select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setTenantPage(1); }}>
                <option value="">Alle statussen</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>
          {tenants.isLoading ? <LoadingState label="Tenants laden..." /> : null}
          {tenants.isError ? <ErrorState title="Tenantlijst niet geladen" description="Controleer /platform/tenants." /> : null}
          {!tenants.isLoading && !tenants.isError && tenantRows.length === 0 ? <EmptyState title="Geen tenants" description="Geen resultaten voor deze filters." /> : null}
          {!tenants.isLoading && !tenants.isError && tenantRows.length > 0 ? (
            <DataTable columns={columns} rows={pagedTenantRows} rowKey={(row) => String(row.id)} page={tenantPage} total={tenantRows.length} pageSize={10} onPageChange={setTenantPage} />
          ) : null}
        </Card>

        <Card>
          <div className="section-title-row">
            <h3><ShieldCheck size={18} /> Hardening-overzicht</h3>
          </div>
          {summary.isLoading ? <LoadingState label="Overzicht laden..." /> : null}
          {!summary.isLoading && summary.data ? (
            <div className="detail-grid">
              <div><span>Trial tenants</span><strong>{summary.data.trial_tenants ?? 0}</strong></div>
              <div><span>Suspended</span><strong>{summary.data.suspended_tenants ?? 0}</strong></div>
              <div><span>Inactive</span><strong>{summary.data.inactive_tenants ?? 0}</strong></div>
              <div><span>Actieve users</span><strong>{summary.data.active_users ?? 0}</strong></div>
            </div>
          ) : null}
          <div className="list-stack compact-list" style={{ marginTop: 12 }}>
            <div className="checklist-item"><strong>Laatste tenant_admin beschermd</strong><span>API voorkomt verwijderen/deactiveren van de laatste tenant_admin.</span></div>
            <div className="checklist-item"><strong>Statusvalidatie actief</strong><span>Alleen geldige tenantstatussen en rollen worden geaccepteerd.</span></div>
            <div className="checklist-item"><strong>Seat-guard actief</strong><span>Seats kunnen niet onder het aantal actieve gebruikers zakken.</span></div>
            <div className="checklist-item"><strong>Audit-export beschikbaar</strong><span>CSV-export per tenant voor controle en bewijs.</span></div>
          </div>
        </Card>
      </div>

      <Drawer open={Boolean(selectedTenant)} title={detailTenant?.name || 'Tenant details'} onClose={() => setSelectedTenant(null)}>
        <Tabs tabs={detailTabs} value={detailTab} onChange={setDetailTab} />

        {detailTab === 'samenvatting' ? (
          <Card>
            <div className="section-title-row"><h3><BadgeCheck size={18} /> Tenant detail</h3></div>
            {tenantDetail.isLoading ? <LoadingState label="Tenant detail laden..." /> : null}
            {tenantDetail.isError ? <ErrorState title="Tenantdetail niet geladen" description="Controleer /platform/tenants/{id}." /> : null}
            {!tenantDetail.isLoading && detailTenant ? (
              <div className="detail-grid">
                <div><span>Naam</span><strong>{String(detailTenant.name || '—')}</strong></div>
                <div><span>Status</span><strong>{toTenantStatus(detailTenant)}</strong></div>
                <div><span>Actief</span><strong>{detailTenant.is_active ? 'Ja' : 'Nee'}</strong></div>
                <div><span>Gebruikers</span><strong>{toTenantUsersCount(detailTenant)}</strong></div>
                <div><span>Billing</span><strong>{String(detailTenant.billing_provider || 'none')}</strong></div>
                <div><span>Seats</span><strong>{String(detailTenant.seats_purchased || 0)}</strong></div>
                <div><span>Trial tot</span><strong>{formatDatetime(String(detailTenant.trial_until || '')) || '—'}</strong></div>
                <div><span>Geldig tot</span><strong>{formatDatetime(String(detailTenant.valid_until || '')) || '—'}</strong></div>
              </div>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'gebruikers' ? (
          <Card>
            <div className="section-title-row"><h3><Users size={18} /> Tenantgebruikers</h3></div>
            <div className="detail-grid" style={{ marginBottom: 12 }}>
              <div>
                <span>E-mail</span>
                <Input value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} placeholder="nieuw@tenant.nl" />
              </div>
              <div>
                <span>Wachtwoord</span>
                <Input type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} placeholder="Tijdelijk wachtwoord" />
              </div>
              <div>
                <span>Rol</span>
                <Select value={newUserRole} onChange={(event) => setNewUserRole(event.target.value)}>{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</Select>
              </div>
              <div style={{ alignSelf: 'end' }}>
                <Button onClick={() => void handleCreateUser()} disabled={tenantUserActions.create.isPending}>Gebruiker toevoegen</Button>
              </div>
            </div>
            <div className="section-title-row" style={{ marginBottom: 12 }}>
              <div />
              <Button variant="secondary" onClick={() => void tenantUserActions.forceLogout.mutateAsync()} disabled={tenantUserActions.forceLogout.isPending}>Force logout tenant</Button>
            </div>
            {tenantUsers.isLoading ? <LoadingState label="Gebruikers laden..." /> : null}
            {!tenantUsers.isLoading && users.length === 0 ? <EmptyState title="Geen gebruikers" description="Nog geen gekoppelde tenantgebruikers." /> : null}
            {!tenantUsers.isLoading && users.length > 0 ? (
              <div className="list-stack compact-list">
                {users.map((user) => (
                  <div className="list-row" key={String(user.user_id)}>
                    <div>
                      <strong>{user.email}</strong>
                      <div className="list-subtle">{user.is_active ? 'Actief' : 'Inactief'}</div>
                    </div>
                    <div className="inline-end-cluster">
                      <Select value={user.role} onChange={(event) => void tenantUserActions.patch.mutateAsync({ userId: user.user_id, payload: { role: event.target.value } })}>
                        {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                      </Select>
                      <Button variant="secondary" onClick={() => void tenantUserActions.patch.mutateAsync({ userId: user.user_id, payload: { is_active: !user.is_active } })}>{user.is_active ? 'Deactiveer' : 'Activeer'}</Button>
                      <Button variant="danger" onClick={() => setPendingDeleteUser(user)}>Verwijder</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'audit' ? (
          <Card>
            <div className="section-title-row">
              <h3><Activity size={18} /> Tenant audit</h3>
              <Button variant="secondary" onClick={() => void handleExportAudit()} disabled={tenantUserActions.exportCsv.isPending}><Download size={16} /> Export CSV</Button>
            </div>
            {tenantAuditSummary.data ? (
              <div className="kpi-strip">
                <div className="kpi-card"><span>Events</span><strong>{tenantAuditSummary.data.total_events ?? 0}</strong></div>
                <div className="kpi-card"><span>Laatste event</span><strong>{formatDatetime(String(tenantAuditSummary.data.last_event_at || '')) || '—'}</strong></div>
                <div className="kpi-card"><span>Actietypes</span><strong>{Object.keys(tenantAuditSummary.data.actions || {}).length}</strong></div>
                <div className="kpi-card"><span>Actors</span><strong>{Object.keys(tenantAuditSummary.data.actors || {}).length}</strong></div>
              </div>
            ) : null}
            {tenantAudit.isLoading ? <LoadingState label="Audit laden..." /> : null}
            {!tenantAudit.isLoading && auditRows.length === 0 ? <EmptyState title="Geen auditregels" description="Nog geen audit-events voor deze tenant." /> : null}
            {!tenantAudit.isLoading && auditRows.length > 0 ? (
              <div className="list-stack compact-list">
                {auditRows.slice(0, 30).map((entry) => (
                  <div className="list-row" key={String(entry.id)}>
                    <div>
                      <strong>{String(entry.action || 'event')}</strong>
                      <div className="list-subtle">{formatDatetime(String(entry.created_at || '')) || '—'} · {String(entry.user_id || 'system')}</div>
                      <pre className="code-block" style={{ marginTop: 8 }}>{parseAuditMeta(entry.meta)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'billing' ? (
          <Card>
            <div className="section-title-row"><h3><ShieldCheck size={18} /> Billing samenvatting</h3></div>
            {tenantBilling.isLoading ? <LoadingState label="Billing laden..." /> : null}
            {!tenantBilling.isLoading && tenantBilling.data ? (
              <div className="detail-grid">
                <div><span>Status</span><strong>{String(tenantBilling.data.status || '—')}</strong></div>
                <div><span>Provider</span><strong>{String(tenantBilling.data.billing_provider || '—')}</strong></div>
                <div><span>Seats</span><strong>{String(tenantBilling.data.seats_purchased || 0)}</strong></div>
                <div><span>Prijs p/j</span><strong>{String(tenantBilling.data.price_per_seat_year_cents || 0)}</strong></div>
                <div><span>Payments totaal</span><strong>{String(tenantBilling.data.payments_total || 0)}</strong></div>
                <div><span>Betaald totaal</span><strong>{String(tenantBilling.data.paid_total_cents || 0)}</strong></div>
              </div>
            ) : null}
          </Card>
        ) : null}

        {detailTab === 'status' ? (
          <Card>
            <div className="section-title-row"><h3><ShieldCheck size={18} /> Statusacties</h3></div>
            <div className="inline-end-cluster">
              <Button variant="secondary" onClick={() => selectedTenant?.id && void statusActions.activate.mutateAsync(selectedTenant.id)}>Activate</Button>
              <Button variant="secondary" onClick={() => selectedTenant?.id && void statusActions.deactivate.mutateAsync(selectedTenant.id)}>Deactivate</Button>
              <Button variant="danger" onClick={() => selectedTenant?.id && void statusActions.suspend.mutateAsync(selectedTenant.id)}>Suspend</Button>
              <Button onClick={() => selectedTenant?.id && void statusActions.reactivate.mutateAsync(selectedTenant.id)}>Reactivate</Button>
            </div>
            <div className="list-stack compact-list" style={{ marginTop: 12 }}>
              <div className="checklist-item"><strong>Role guard</strong><span>Laatste tenant_admin kan niet worden verwijderd of gedeactiveerd.</span></div>
              <div className="checklist-item"><strong>Force logout</strong><span>Alle refresh tokens van de tenant kunnen centraal worden ingetrokken.</span></div>
              <div className="checklist-item"><strong>Statusguard</strong><span>Alleen geldige statusovergangen worden via platform-endpoints verwerkt.</span></div>
            </div>
          </Card>
        ) : null}
      </Drawer>

      <ConfirmActionDialog
        open={Boolean(pendingDeleteUser)}
        title="Tenantgebruiker verwijderen"
        description={`Weet je zeker dat je ${pendingDeleteUser?.email || 'deze gebruiker'} wilt verwijderen uit deze tenant?`}
        confirmLabel="Verwijder gebruiker"
        onConfirm={async () => {
          if (!pendingDeleteUser) return;
          await tenantUserActions.remove.mutateAsync(pendingDeleteUser.user_id);
          setPendingDeleteUser(null);
        }}
        onClose={() => setPendingDeleteUser(null)}
      />
    </div>
  );
}
