import { useState } from 'react';
import {
  CreditCard, Download, ExternalLink, FileText,
  RefreshCcw, ShieldCheck, Users, AlertTriangle, X,
} from 'lucide-react';
import { ModuleHero } from '@/components/layout/ModuleHero';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Modal } from '@/components/overlays/Modal';
import {
  useBillingInvoices, useBillingStatus, useBillingStatusPlus,
  useInvoicePdfActions,
} from '@/hooks/useBilling';
import { useAccess } from '@/hooks/useAccess';
import { buildMarketingUrl } from '@/features/auth/marketing-auth';
import { formatDatetime, toneFromStatus } from '@/utils/format';

function cents(value: unknown): string {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency', currency: 'EUR',
  }).format(amount / 100);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    active:    { label: 'Actief',           tone: 'success' },
    trialing:  { label: 'Proefperiode',     tone: 'info' },
    past_due:  { label: 'Betaling achterstaand', tone: 'warning' },
    suspended: { label: 'Geblokkeerd',      tone: 'danger' },
    cancelled: { label: 'Opgezegd',         tone: 'secondary' },
    concept:   { label: 'Concept',          tone: 'secondary' },
    betaald:   { label: 'Betaald',          tone: 'success' },
    openstaand:{ label: 'Openstaand',       tone: 'warning' },
    vervallen: { label: 'Vervallen',        tone: 'danger' },
  };
  const info = map[status?.toLowerCase()] ?? { label: status || '—', tone: 'secondary' };
  return <Badge tone={info.tone as any}>{info.label}</Badge>;
}

export function BillingPage() {
  const canManageBilling = useAccess('billing.manage');
  const billingStatus = useBillingStatus();
  const billingStatusPlus = useBillingStatusPlus();
  const invoices = useBillingInvoices();
  const pdfActions = useInvoicePdfActions();

  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  if (billingStatus.isLoading) return <LoadingState />;
  if (billingStatus.isError) return <ErrorState message="Billing-informatie kon niet worden geladen." />;

  const status = billingStatus.data ?? {};
  const statusPlus = billingStatusPlus.data ?? {};
  const invoiceRows = Array.isArray(invoices.data?.items) ? invoices.data.items : [];
  const subscription = (statusPlus as any)?.subscription ?? {};
  const accessSnapshot = (statusPlus as any)?.access_snapshot ?? {};

  const seatsUsed = Number((statusPlus as any)?.seats_used ?? 0);
  const seatsMax  = Number((statusPlus as any)?.seats_max ?? subscription?.seats ?? 0);

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch('/api/v1/billing/cancel-subscription', { method: 'POST' });
      if (!res.ok) throw new Error('Opzeggen mislukt.');
      billingStatus.refetch();
      billingStatusPlus.refetch?.();
      setShowCancel(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Opzeggen mislukt.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="page-container">
      <ModuleHero
        icon={CreditCard}
        title="Billing"
        subtitle="Abonnement, facturen en betalingen"
      />

      <div style={{ display: 'grid', gap: '16px', maxWidth: 800 }}>

        {/* Abonnement status */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Abonnement</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <StatusBadge status={subscription.status ?? status.subscription_status ?? 'concept'} />
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {subscription.plan_name ?? status.plan ?? 'Proefperiode'}
                </span>
              </div>
            </div>
            {canManageBilling && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowChangePlan(true)}
                >
                  Plan wijzigen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCancel(true)}
                  style={{ color: 'var(--color-text-danger)' }}
                >
                  Opzeggen
                </Button>
              </div>
            )}
          </div>

          {/* Seats */}
          {seatsMax > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                background: 'var(--color-background-secondary)',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: 12,
              }}
            >
              <Users size={16} style={{ color: 'var(--color-text-secondary)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {seatsUsed} / {seatsMax} gebruikers
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'var(--color-border-tertiary)',
                    borderRadius: 2,
                    marginTop: 6,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (seatsUsed / seatsMax) * 100)}%`,
                      background: seatsUsed >= seatsMax
                        ? 'var(--color-border-danger)'
                        : 'var(--color-border-info)',
                      borderRadius: 2,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
              {seatsUsed >= seatsMax && (
                <AlertTriangle size={14} style={{ color: 'var(--color-text-warning)', flexShrink: 0 }} />
              )}
            </div>
          )}

          {/* Periode */}
          {subscription.current_period_end && (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Huidige periode tot:{' '}
              <strong>{formatDatetime(subscription.current_period_end)}</strong>
            </div>
          )}
        </Card>

        {/* Openstaande facturen CTA */}
        {invoiceRows.some((inv: any) => inv.status === 'openstaand') && (
          <InlineMessage tone="warning" icon={AlertTriangle}>
            Er zijn openstaande facturen.{' '}
            <a
              href={buildMarketingUrl('/betalen')}
              style={{ color: 'var(--color-text-warning)', fontWeight: 500 }}
            >
              Betaal nu
            </a>
          </InlineMessage>
        )}

        {/* Facturen */}
        <Card>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>Facturen</div>

          {invoices.isLoading ? (
            <LoadingState compact />
          ) : invoiceRows.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '16px 0' }}>
              Geen facturen beschikbaar.
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  {['Factuurnummer', 'Datum', 'Bedrag', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '6px 8px',
                        fontWeight: 500,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((inv: any) => (
                  <tr
                    key={inv.id}
                    style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}
                  >
                    <td style={{ padding: '8px' }}>{inv.nummer ?? inv.id?.substring(0, 8)}</td>
                    <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>
                      {inv.created_at ? formatDatetime(inv.created_at) : '—'}
                    </td>
                    <td style={{ padding: '8px', fontVariantNumeric: 'tabular-nums' }}>
                      {cents(inv.totaal_cents ?? inv.amount_cents)}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button
                        onClick={() => pdfActions.download(inv.id)}
                        title="PDF downloaden"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Modal: Plan wijzigen */}
      <Modal
        open={showChangePlan}
        onClose={() => setShowChangePlan(false)}
        title="Plan wijzigen"
        size="medium"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Neem contact op met ons supportteam om van plan te wisselen, of beheer je abonnement
            via de Mollie-omgeving.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="primary"
              onClick={() => window.open(buildMarketingUrl('/contact'), '_blank')}
            >
              Contact opnemen <ExternalLink size={13} style={{ marginLeft: 4 }} />
            </Button>
            <Button variant="secondary" onClick={() => setShowChangePlan(false)}>
              Sluiten
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Abonnement opzeggen */}
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Abonnement opzeggen"
        size="small"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: 14, marginBottom: 16 }}>
            Weet je zeker dat je het abonnement wilt opzeggen? Je houdt toegang tot het einde
            van de huidige betaalperiode.
          </p>
          {cancelError && (
            <InlineMessage tone="danger" style={{ marginBottom: 12 }}>
              {cancelError}
            </InlineMessage>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowCancel(false)} disabled={cancelLoading}>
              Annuleren
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
            >
              {cancelLoading ? 'Bezig…' : 'Ja, opzeggen'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
