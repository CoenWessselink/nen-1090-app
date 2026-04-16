import { useMemo, useState } from 'react';
import { CreditCard, ExternalLink, FileText, RefreshCcw, ShieldCheck, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Drawer } from '@/components/drawer/Drawer';
import { DataTable } from '@/components/datatable/DataTable';
import { useBillingStatus, useTenantBillingInvoices, useTenantBillingInvoiceDetail, useTenantBillingMutations } from '@/hooks/useBilling';
import { useAccess } from '@/hooks/useAccess';
import { buildAppReturnTo, buildMarketingUrl } from '@/features/auth/marketing-auth';
import { formatDatetime, toneFromStatus } from '@/utils/format';

function formatCents(value: unknown): string {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount / 100);
}

export function BillingPage() {
  const canManageBilling = useAccess('billing.manage');
  const billingStatus = useBillingStatus();
  const invoices = useTenantBillingInvoices();
  const mutations = useTenantBillingMutations();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const invoiceDetail = useTenantBillingInvoiceDetail(selectedInvoiceId || undefined);
  const status = (billingStatus.data || {}) as Record<string, any>;
  const marketingSubscriptionUrl = buildMarketingUrl('subscription', {
    next: buildAppReturnTo('/billing'),
    query: { source: 'nen1090-app', returnTo: buildAppReturnTo('/billing') },
  });

  const rows = Array.isArray(invoices.data?.items) ? invoices.data.items : [];
  const summaryRows = useMemo(() => ([
    { label: 'Tenantstatus', value: String(status.tenant_status || status.status || 'Onbekend'), meta: 'Status van tenant / abonnement' },
    { label: 'Access mode', value: String(status.access_snapshot?.access_mode || status.subscription?.access_mode || '—'), meta: 'Toegang volgens billing-engine' },
    { label: 'Seats', value: String(status.subscription?.seats || status.seats_purchased || '—'), meta: `${String(status.users_count || '—')} gebruikers actief` },
    { label: 'Periode einde', value: formatDatetime(String(status.subscription?.current_period_end || '')) || '—', meta: 'Huidige abonnementsperiode' },
  ]), [status]);

  return (
    <div className="page-stack billing-page">
      <section className="section-banner">
        <div className="section-banner-copy">
          <span className="section-banner-kicker">Abonnement en facturatie</span>
          <h1>Billing</h1>
          <p>Tenantstatus, seats, facturen en self-service in één overzicht.</p>
        </div>
        <div className="section-banner-actions">
          <Button variant="secondary" onClick={() => { billingStatus.refetch(); invoices.refetch(); }}><RefreshCcw size={16} /> Verversen</Button>
          <a href={marketingSubscriptionUrl} target="_self" rel="noreferrer"><Button><ExternalLink size={16} /> Open centraal abonnement</Button></a>
        </div>
      </section>

      {!canManageBilling ? <InlineMessage tone="neutral">Je kunt hier tenantstatus en facturen bekijken. Wijzigingen lopen centraal via de abonnementsshell.</InlineMessage> : null}

      <div className="section-nav-grid">
        {summaryRows.map((row) => (
          <div key={row.label} className="section-nav-tile is-active">
            <div className="section-nav-tile-top"><CreditCard size={18} /><span>{row.label}</span></div>
            <div className="section-nav-tile-value">{row.value}</div>
            <strong>{row.label}</strong>
            <small>{row.meta}</small>
          </div>
        ))}
      </div>

      <div className="content-grid-2">
        <Card>
          <div className="section-title-row">
            <h3><ShieldCheck size={18} /> Status</h3>
            <Badge tone={toneFromStatus(String(status.tenant_status || status.status || 'neutral'))}>{String(status.tenant_status || status.status || 'Onbekend')}</Badge>
          </div>
          <div className="detail-grid">
            <div><span>Subscription</span><strong>{String(status.subscription?.status || '—')}</strong></div>
            <div><span>Access mode</span><strong>{String(status.subscription?.access_mode || status.access_snapshot?.access_mode || '—')}</strong></div>
            <div><span>Prijs / seat / jaar</span><strong>{formatCents(status.price_per_seat_year_cents)}</strong></div>
            <div><span>Provider</span><strong>{String(status.billing_provider || 'manual')}</strong></div>
          </div>
          <div className="stack-actions" style={{ marginTop: 16 }}>
            <a href={marketingSubscriptionUrl} target="_self" rel="noreferrer"><Button><ExternalLink size={16} /> Abonnement openen</Button></a>
            {canManageBilling ? <Button variant="secondary" onClick={() => mutations.changePlan.mutate({ plan: 'professional', seats: Number(status.subscription?.seats || status.seats_purchased || 1) })}>Plan opnieuw synchroniseren</Button> : null}
          </div>
        </Card>
        <Card>
          <div className="section-title-row">
            <h3><Wallet size={18} /> Facturen</h3>
            <Badge tone="neutral">{rows.length}</Badge>
          </div>
          {invoices.isLoading ? <LoadingState label="Facturen laden..." /> : null}
          {invoices.isError ? <ErrorState title="Facturen niet geladen" description="Controleer /tenant/billing/invoices." /> : null}
          {!invoices.isLoading && !invoices.isError && rows.length === 0 ? <InlineMessage tone="neutral">Nog geen facturen beschikbaar voor deze tenant.</InlineMessage> : null}
          {!invoices.isLoading && !invoices.isError && rows.length > 0 ? (
            <DataTable
              columns={[
                { key: 'number', header: 'Factuur', cell: (row: Record<string, unknown>) => String(row.number || row.id || '—') },
                { key: 'status', header: 'Status', cell: (row: Record<string, unknown>) => <Badge tone={toneFromStatus(String(row.status || 'neutral'))}>{String(row.status || 'onbekend')}</Badge> },
                { key: 'total', header: 'Totaal', cell: (row: Record<string, unknown>) => formatCents(row.total_cents) },
                { key: 'due', header: 'Vervalt', cell: (row: Record<string, unknown>) => formatDatetime(String(row.due_date || '')) || '—' },
                { key: 'actions', header: 'Acties', cell: (row: Record<string, unknown>) => <Button variant="secondary" onClick={() => setSelectedInvoiceId(String(row.id))}><FileText size={14} /> Detail</Button> },
              ]}
              rows={rows}
              rowKey={(row: Record<string, unknown>) => String(row.id)}
            />
          ) : null}
        </Card>
      </div>

      <Drawer open={Boolean(selectedInvoiceId)} title="Factuurdetail" onClose={() => setSelectedInvoiceId(null)}>
        {invoiceDetail.isLoading ? <LoadingState label="Factuurdetail laden..." /> : null}
        {invoiceDetail.isError ? <ErrorState title="Factuurdetail niet geladen" description="Controleer /tenant/billing/invoices/{id}." /> : null}
        {invoiceDetail.data ? (
          <div className="page-stack">
            <div className="detail-grid">
              <div><span>Factuur</span><strong>{String(invoiceDetail.data.number || invoiceDetail.data.id || '—')}</strong></div>
              <div><span>Status</span><strong>{String(invoiceDetail.data.status || '—')}</strong></div>
              <div><span>Totaal</span><strong>{formatCents(invoiceDetail.data.total_cents)}</strong></div>
              <div><span>Openstaand</span><strong>{formatCents(invoiceDetail.data.balance_due_cents)}</strong></div>
            </div>
            <DataTable
              columns={[
                { key: 'description', header: 'Omschrijving', cell: (row: Record<string, unknown>) => String(row.description || '—') },
                { key: 'quantity', header: 'Aantal', cell: (row: Record<string, unknown>) => String(row.quantity || '—') },
                { key: 'unit_amount_cents', header: 'Prijs', cell: (row: Record<string, unknown>) => formatCents(row.unit_amount_cents) },
                { key: 'line_total_cents', header: 'Regel', cell: (row: Record<string, unknown>) => formatCents(row.line_total_cents) },
              ]}
              rows={Array.isArray(invoiceDetail.data.lines) ? invoiceDetail.data.lines as Record<string, unknown>[] : []}
              rowKey={(row: Record<string, unknown>) => String(row.id || row.description || Math.random())}
            />
            <div className="stack-actions">
              {invoiceDetail.data.pdf_url ? <a href={String(invoiceDetail.data.pdf_url)} target="_blank" rel="noreferrer"><Button><FileText size={16} /> Open PDF</Button></a> : null}
              <Button variant="secondary" onClick={() => setSelectedInvoiceId(null)}>Sluiten</Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
