import { useState } from 'react';
import { CreditCard, Download, ExternalLink, FileText, RefreshCcw, ShieldCheck, Users, AlertTriangle } from 'lucide-react';
import ModuleHero from '@/components/layout/ModuleHero';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Modal } from '@/components/overlays/Modal';
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

  const [showCancel, setShowCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const status = billingStatus.data || {};
  const statusPlus = billingStatusPlus.data || {};
  const invoiceRows = Array.isArray((invoices.data as any)?.items) ? (invoices.data as any).items : [];
  const subscription = (statusPlus as any)?.subscription || {};
  const accessSnapshot = (statusPlus as any)?.access_snapshot || {};
  const foundationReady = (statusPlus as any)?.foundation_ready !== false;
  const missingTables: string[] = Array.isArray((statusPlus as any)?.missing_tables)
    ? (statusPlus as any).missing_tables
    : [];

  const seatsUsed = Number((statusPlus as any)?.seats_used ?? 0);
  const seatsMax = Number((statusPlus as any)?.seats_max ?? subscription?.seats ?? 0);

  const marketingSubscriptionUrl = buildMarketingUrl('subscription', {
    next: buildAppReturnTo('/billing'),
    query: { source: 'nen1090-app', returnTo: buildAppReturnTo('/billing') },
  });

  const summaryRows = [
    { label: 'Status', value: String((status as any).status || subscription.status || 'Onbekend') },
    { label: 'Access mode', value: String(subscription.access_mode || accessSnapshot.access_mode || '—') },
    { label: 'Seats', value: String((status as any).seats_purchased || subscription.seats || '—') },
    { label: 'Gebruikers actief', value: String((status as any).users_count || '—') },
    {
      label: 'Volgende factuurdatum',
      value: formatDatetime(String((status as any).mollie_next_payment_date || (status as any).valid_until || subscription.current_period_end || '')) || 'Niet beschikbaar',
    },
    { label: 'Prijs / jaar', value: cents((status as any).price_per_seat_year_cents) },
  ];

  const hasOverdueInvoice = invoiceRows.some(
    (row: any) => Number(row.balance_due_cents || 0) > 0
  );

  const handleCancel = async () => {
    setCancelLoading(true);
    setCancelError('');
    try {
      const res = await fetch('/api/v1/billing/cancel-subscription', { method: 'POST' });
      if (!res.ok) throw new Error('Opzeggen mislukt.');
      billingStatus.refetch();
      billingStatusPlus.refetch();
      setShowCancel(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Opzeggen mislukt.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <ModuleHero
        title="Billing"
        description="Facturatie, tenantstatus en factuurdocumenten. Checkout en plan-self-service lopen via de centrale abonnementsshell."
        kicker="Facturatiebasis fase 3"
        actions={
          <>
            <a href={marketingSubscriptionUrl} target="_self" rel="noreferrer">
              <Button>Open centraal abonnement</Button>
            </a>
            <Button variant="secondary" onClick={() => {
              billingStatus.refetch();
              billingStatusPlus.refetch();
              invoices.refetch();
            }}>
              <RefreshCcw size={16} /> Verversen
            </Button>
            {canManageBilling && (
              <Button variant="secondary" onClick={() => setShowCancel(true)}>
                Abonnement opzeggen
              </Button>
            )}
          </>
        }
        tiles={[
          { label: 'Status', value: String((status as any).status || subscription.status || 'Onbekend'), meta: 'Huidige tenantstatus', icon: CreditCard, tone: 'primary' },
          { label: 'Access', value: String(subscription.access_mode || accessSnapshot.access_mode || '—'), meta: 'Toegangsniveau vanuit billing', icon: ShieldCheck, tone: 'success' },
          { label: 'Seats', value: seatsMax > 0 ? `${seatsUsed}/${seatsMax}` : String((status as any).seats_purchased || '—'), meta: 'Gebruikers in gebruik', icon: Users, tone: seatsUsed >= seatsMax && seatsMax > 0 ? 'warning' : 'neutral' },
          { label: 'Open facturen', value: String(invoiceRows.filter((r: any) => Number(r.balance_due_cents || 0) > 0).length), meta: 'Openstaand saldo', icon: FileText, tone: 'warning' },
        ]}
      />

      {/* InlineMessage accepteert alleen string children — geen JSX */}
      {!canManageBilling
        ? <InlineMessage tone="neutral">Je kunt hier billingstatus en facturen bekijken. Planwissels lopen via de centrale abonnementsshell.</InlineMessage>
        : null}
      {!foundationReady
        ? <InlineMessage tone="danger">{`Billing fundering niet volledig live. Ontbrekend: ${missingTables.join(', ') || 'status-plus'}.`}</InlineMessage>
        : null}
      {hasOverdueInvoice
        ? <InlineMessage tone="danger">Er zijn openstaande facturen. Betaal zo snel mogelijk om onderbreking te voorkomen.</InlineMessage>
        : null}

      {/* Seats voortgangsbalk */}
      {seatsMax > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-md)',
        }}>
          <Users size={15} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              {seatsUsed} / {seatsMax} gebruikers
            </div>
            <div style={{ height: 4, background: 'var(--color-border-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, seatsMax > 0 ? (seatsUsed / seatsMax) * 100 : 0)}%`,
                background: seatsUsed >= seatsMax ? 'var(--color-border-danger)' : 'var(--color-border-info)',
                borderRadius: 2,
              }} />
            </div>
          </div>
          {seatsUsed >= seatsMax && (
            <AlertTriangle size={14} style={{ color: 'var(--color-text-warning)', flexShrink: 0 }} />
          )}
        </div>
      )}

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
            <Badge tone={toneFromStatus(String((status as any).status || subscription.status || 'neutral'))}>
              {String((status as any).status || subscription.status || 'Onbekend')}
            </Badge>
          </div>
          <div className="detail-grid" style={{ marginTop: 12 }}>
            {summaryRows.map((row) => (
              <div key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>
            ))}
          </div>
          <div className="stack-actions" style={{ marginTop: 16 }}>
            <a href={marketingSubscriptionUrl} target="_self" rel="noreferrer">
              <Button><ExternalLink size={16} /> Open centraal abonnement</Button>
            </a>
          </div>
        </Card>

        <Card>
          <div className="section-title-row">
            <h3><FileText size={18} /> Facturen</h3>
            <Badge tone="neutral">{String(invoiceRows.length)} documenten</Badge>
          </div>
          {invoices.isLoading ? <LoadingState label="Facturen laden..." /> : null}
          {invoices.isError ? <ErrorState title="Facturen niet geladen" description="Controleer of /tenant/billing/invoices bereikbaar is." /> : null}
          {!invoices.isLoading && !invoiceRows.length
            ? <InlineMessage tone="neutral">Er zijn nog geen facturen beschikbaar voor deze tenant.</InlineMessage>
            : null}
          <div className="list-stack compact-list">
            {invoiceRows.map((row: any) => (
              <div key={String(row.id)} className="list-row">
                <div>
                  <strong>{String(row.number || row.nummer || row.id || 'Factuur')}</strong>
                  <div className="list-subtle">
                    {cents(row.total_cents || row.totaal_cents || row.balance_due_cents)} · {formatDatetime(String(row.due_date || row.vervaldatum || row.created_at || '')) || 'onbekend'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge tone={toneFromStatus(String(row.status || 'neutral'))}>{String(row.status || 'Onbekend')}</Badge>
                  <Button variant="secondary" onClick={() => pdfActions.openInvoicePdf.mutate(String(row.id))}>
                    <Download size={16} /> Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {billingStatus.isLoading || billingStatusPlus.isLoading ? <LoadingState label="Billingstatus laden..." /> : null}
      {billingStatus.isError ? <ErrorState title="Billingstatus niet geladen" description="Controleer of /tenant/billing/status bereikbaar is." /> : null}

      {/* Modal: abonnement opzeggen */}
      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Abonnement opzeggen" size="small">
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: 14, marginBottom: 16 }}>
            Weet je zeker dat je het abonnement wilt opzeggen? Je houdt toegang tot het einde van de huidige betaalperiode.
          </p>
          {cancelError
            ? <InlineMessage tone="danger">{cancelError}</InlineMessage>
            : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setShowCancel(false)} disabled={cancelLoading}>
              Annuleren
            </Button>
            <button
              onClick={handleCancel}
              disabled={cancelLoading}
              style={{
                padding: '8px 16px',
                background: 'var(--color-background-danger)',
                color: 'var(--color-text-danger)',
                border: '0.5px solid var(--color-border-danger)',
                borderRadius: 'var(--border-radius-md)',
                cursor: cancelLoading ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 500,
              }}
            >
              {cancelLoading ? 'Bezig…' : 'Ja, opzeggen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
