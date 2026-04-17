import { CreditCard, Download, ExternalLink, FileText, RefreshCcw, ShieldCheck } from 'lucide-react';
import ModuleHero from '@/components/layout/ModuleHero';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useBillingInvoices, useBillingStatus, useBillingStatusPlus, useInvoicePdfActions } from '@/hooks/useBilling';
import { useAccess } from '@/hooks/useAccess';
import { buildAppReturnTo, buildMarketingUrl } from '@/features/auth/marketing-auth';
import { formatDatetime, toneFromStatus } from '@/utils/format';

function cents(value: unknown): string {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount / 100);
}

export function BillingPage() {
  const canManageBilling = useAccess('billing.manage');
  const billingStatus = useBillingStatus();
  const billingStatusPlus = useBillingStatusPlus();
  const invoices = useBillingInvoices();
  const pdfActions = useInvoicePdfActions();
  const status = billingStatus.data || {};
  const statusPlus = billingStatusPlus.data || {};
  const invoiceRows = Array.isArray(invoices.data?.items) ? invoices.data?.items : [];
  const subscription = (statusPlus as any)?.subscription || {};
  const accessSnapshot = (statusPlus as any)?.access_snapshot || {};
  const foundationReady = Boolean((statusPlus as any)?.foundation_ready ?? (invoices.data as any)?.foundation_ready ?? true);
  const missingTables = Array.isArray((statusPlus as any)?.missing_tables)
    ? (statusPlus as any)?.missing_tables
    : Array.isArray((invoices.data as any)?.missing_tables)
      ? (invoices.data as any)?.missing_tables
      : [];
  const marketingSubscriptionUrl = buildMarketingUrl('subscription', {
    next: buildAppReturnTo('/billing'),
    query: {
      source: 'nen1090-app',
      returnTo: buildAppReturnTo('/billing'),
    },
  });
  const foundationMessage = !foundationReady
    ? `Billingfundering is in deze omgeving nog niet volledig gemigreerd. De pagina blijft bruikbaar zonder 500-fouten, maar facturen en access snapshots blijven beperkt totdat de ontbrekende tabellen live zijn: ${missingTables.join(', ') || 'onbekend'}.`
    : '';

  const summaryRows = [
    { label: 'Status', value: String(status.status || subscription.status || 'Onbekend') },
    { label: 'Access mode', value: String(subscription.access_mode || accessSnapshot.access_mode || '—') },
    { label: 'Seats', value: String(status.seats_purchased || subscription.seats || '—') },
    { label: 'Gebruikers actief', value: String(status.users_count || '—') },
    { label: 'Volgende factuurdatum', value: formatDatetime(String(status.mollie_next_payment_date || status.valid_until || subscription.current_period_end || '')) || 'Niet beschikbaar' },
    { label: 'Prijs / jaar', value: cents(status.price_per_seat_year_cents) },
  ];

  return (
    <div className="page-stack">
      <ModuleHero
        title="Billing"
        description="Facturatie, tenantstatus en factuurdocumenten zijn nu ook in de app zichtbaar, terwijl checkout en plan-self-service centraal blijven lopen."
        kicker="Facturatiebasis fase 3"
        actions={
          <>
            <a href={marketingSubscriptionUrl} target="_self" rel="noreferrer"><Button>Open centraal abonnement</Button></a>
            <Button variant="secondary" onClick={() => { billingStatus.refetch(); billingStatusPlus.refetch(); invoices.refetch(); }}><RefreshCcw size={16} /> Verversen</Button>
          </>
        }
        tiles={[
          { label: 'Status', value: String(status.status || subscription.status || 'Onbekend'), meta: 'Huidige tenantstatus', icon: CreditCard, tone: 'primary' },
          { label: 'Access', value: String(subscription.access_mode || accessSnapshot.access_mode || '—'), meta: 'Doorwerking vanuit billing/access rules', icon: ShieldCheck, tone: 'success' },
          { label: 'Open facturen', value: String(invoiceRows.filter((row: any) => Number(row.balance_due_cents || 0) > 0).length), meta: 'Direct zichtbaar in tenantomgeving', icon: FileText, tone: 'warning' },
          { label: 'Self-service', value: canManageBilling ? 'Beheer actief' : 'Alleen lezen', meta: 'Planwijziging en checkout blijven centraal', icon: ExternalLink, onClick: () => { window.location.href = marketingSubscriptionUrl; }, tone: 'neutral' },
        ]}
      />

      {!canManageBilling ? <InlineMessage tone="neutral">Je kunt hier billingstatus en facturen bekijken. Checkout, betaalprovider en planwissels lopen via de centrale abonnementsshell.</InlineMessage> : null}
      {!foundationReady ? <InlineMessage tone="danger">{foundationMessage}</InlineMessage> : null}

      <div className="kpi-strip">
        {summaryRows.map((row) => (
          <div key={row.label} className="kpi-card">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>

      <div className="content-grid-2">
        <Card>
          <div className="section-title-row">
            <h3><CreditCard size={18} /> Abonnement en toegang</h3>
            <Badge tone={toneFromStatus(String(status.status || subscription.status || 'neutral'))}>{String(status.status || subscription.status || 'Onbekend')}</Badge>
          </div>
          <div className="detail-grid" style={{ marginTop: 12 }}>
            {summaryRows.map((row) => (
              <div key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>
            ))}
          </div>
          <div className="stack-actions" style={{ marginTop: 16 }}>
            <a href={marketingSubscriptionUrl} target="_self" rel="noreferrer"><Button><ExternalLink size={16} /> Open centraal abonnement</Button></a>
          </div>
        </Card>

        <Card>
          <div className="section-title-row">
            <h3><FileText size={18} /> Facturen</h3>
            <Badge tone="neutral">{String(invoiceRows.length)} documenten</Badge>
          </div>
          {invoices.isLoading ? <LoadingState label="Facturen laden..." /> : null}
          {invoices.isError && foundationReady ? <ErrorState title="Facturen niet geladen" description="Controleer of /tenant/billing/invoices bereikbaar is." /> : null}
          {!invoices.isLoading && !invoiceRows.length ? <InlineMessage tone="neutral">Er zijn nog geen facturen beschikbaar voor deze tenant.</InlineMessage> : null}
          <div className="list-stack compact-list">
            {invoiceRows.map((row: any) => (
              <div key={String(row.id)} className="list-row">
                <div>
                  <strong>{String(row.number || row.id || 'Factuur')}</strong>
                  <div className="list-subtle">{cents(row.total_cents || row.balance_due_cents)} · vervalt {formatDatetime(String(row.due_date || row.created_at || '')) || 'onbekend'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge tone={toneFromStatus(String(row.status || 'neutral'))}>{String(row.status || 'Onbekend')}</Badge>
                  <Button variant="secondary" onClick={() => pdfActions.openInvoicePdf.mutate(String(row.id))}><Download size={16} /> Open</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {billingStatus.isLoading || billingStatusPlus.isLoading ? <LoadingState label="Billingstatus laden..." /> : null}
      {billingStatus.isError && foundationReady ? <ErrorState title="Billingstatus niet geladen" description="Controleer of /tenant/billing/status bereikbaar is." /> : null}
    </div>
  );
}
