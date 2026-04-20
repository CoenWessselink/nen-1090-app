import { useState } from 'react';
import {
  CreditCard, Download, ExternalLink,
  RefreshCcw, Users, AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Modal } from '@/components/overlays/Modal';
import {
  useBillingInvoices,
  useBillingStatus,
  useBillingStatusPlus,
  useInvoicePdfActions,
} from '@/hooks/useBilling';
import { useAccess } from '@/hooks/useAccess';
import { formatDatetime } from '@/utils/format';

// Badge accepteert: 'neutral' | 'success' | 'warning' | 'danger'
// InlineMessage accepteert: 'neutral' | 'success' | 'danger' — geen 'warning'
// Button heeft geen 'size' prop — verwijderd
// Button heeft geen 'danger' variant in de huidige codebase — gebruik style override

function cents(value: unknown): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency', currency: 'EUR',
  }).format(amount / 100);
}

function SubscriptionStatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
    active:     'success',
    trialing:   'neutral',
    past_due:   'warning',
    suspended:  'danger',
    cancelled:  'neutral',
    betaald:    'success',
    openstaand: 'warning',
    vervallen:  'danger',
  };
  const labelMap: Record<string, string> = {
    active:     'Actief',
    trialing:   'Proefperiode',
    past_due:   'Betaling achterstallig',
    suspended:  'Geblokkeerd',
    cancelled:  'Opgezegd',
    betaald:    'Betaald',
    openstaand: 'Openstaand',
    vervallen:  'Vervallen',
  };
  const key = (status ?? '').toLowerCase();
  return (
    <Badge tone={toneMap[key] ?? 'neutral'}>
      {labelMap[key] ?? status ?? '—'}
    </Badge>
  );
}

export function BillingPage() {
  const canManageBilling = useAccess('billing.manage');
  const billingStatus    = useBillingStatus();
  const billingStatusPlus = useBillingStatusPlus();
  const invoices         = useBillingInvoices();
  const pdfActions       = useInvoicePdfActions();

  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showCancel,     setShowCancel]     = useState(false);
  const [cancelLoading,  setCancelLoading]  = useState(false);
  const [cancelError,    setCancelError]    = useState<string | null>(null);

  if (billingStatus.isLoading) return <LoadingState />;
  if (billingStatus.isError)   return <ErrorState message="Billing-informatie kon niet worden geladen." />;

  const status       = (billingStatus.data    ?? {}) as Record<string, unknown>;
  const statusPlus   = (billingStatusPlus.data ?? {}) as Record<string, unknown>;
  const invoiceRows  = Array.isArray((invoices.data as any)?.items)
    ? (invoices.data as any).items
    : [];
  const subscription = (statusPlus.subscription ?? {}) as Record<string, unknown>;

  const seatsUsed = Number((statusPlus.seats_used ?? 0) as number);
  const seatsMax  = Number((statusPlus.seats_max ?? (subscription.seats ?? 0)) as number);

  const hasOverdueInvoice = invoiceRows.some(
    (inv: Record<string, unknown>) => inv.status === 'openstaand'
  );

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch('/api/v1/billing/cancel-subscription', { method: 'POST' });
      if (!res.ok) throw new Error('Opzeggen mislukt.');
      billingStatus.refetch();
      setShowCancel(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Opzeggen mislukt.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <CreditCard size={20} style={{ color: 'var(--color-text-secondary)' }} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Billing</h1>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Abonnement, facturen en betalingen
        </p>
      </div>

      <div style={{ display: 'grid', gap: '16px', maxWidth: 800 }}>

        {/* Abonnement */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Abonnement</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <SubscriptionStatusBadge
                  status={String(subscription.status ?? status.subscription_status ?? 'trialing')}
                />
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {String(subscription.plan_name ?? status.plan ?? 'Proefperiode')}
                </span>
              </div>
            </div>

            {canManageBilling && (
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Button heeft geen 'size' prop — plain variant */}
                <Button variant="secondary" onClick={() => setShowChangePlan(true)}>
                  Plan wijzigen
                </Button>
                <button
                  onClick={() => setShowCancel(true)}
                  style={{
                    fontSize: 13,
                    padding: '6px 12px',
                    border: '0.5px solid var(--color-border-danger)',
                    borderRadius: 'var(--border-radius-md)',
                    background: 'transparent',
                    color: 'var(--color-text-danger)',
                    cursor: 'pointer',
                  }}
                >
                  Opzeggen
                </button>
              </div>
            )}
          </div>

          {/* Seats balk */}
          {seatsMax > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--color-background-secondary)',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: 12,
              }}
            >
              <Users size={15} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
                  {seatsUsed} / {seatsMax} gebruikers
                </div>
                <div style={{ height: 4, background: 'var(--color-border-tertiary)',
                              borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, seatsMax > 0 ? (seatsUsed / seatsMax) * 100 : 0)}%`,
                    background: seatsUsed >= seatsMax
                      ? 'var(--color-border-danger)'
                      : 'var(--color-border-info)',
                    borderRadius: 2,
                  }} />
                </div>
              </div>
              {seatsUsed >= seatsMax && (
                <AlertTriangle size={14} style={{ color: 'var(--color-text-warning)', flexShrink: 0 }} />
              )}
            </div>
          )}

          {subscription.current_period_end && (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Huidige periode tot:{' '}
              <strong>{formatDatetime(String(subscription.current_period_end))}</strong>
            </div>
          )}
        </Card>

        {/* Openstaande facturen — InlineMessage accepteert alleen string children */}
        {hasOverdueInvoice && (
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--color-background-warning)',
              border: '0.5px solid var(--color-border-warning)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 13,
              color: 'var(--color-text-warning)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            Er zijn openstaande facturen. Betaal zo snel mogelijk om onderbreking te voorkomen.
          </div>
        )}

        {/* Facturen */}
        <Card>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Facturen</div>

          {invoices.isLoading ? (
            <LoadingState />
          ) : invoiceRows.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '12px 0' }}>
              Geen facturen beschikbaar.
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  {['Factuurnummer', 'Datum', 'Bedrag', 'Status', ''].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px',
                                         fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((inv: Record<string, unknown>) => (
                  <tr key={String(inv.id)} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                    <td style={{ padding: '8px' }}>
                      {String(inv.nummer ?? (String(inv.id ?? '').substring(0, 8)))}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>
                      {inv.created_at ? formatDatetime(String(inv.created_at)) : '—'}
                    </td>
                    <td style={{ padding: '8px', fontVariantNumeric: 'tabular-nums' }}>
                      {cents(inv.totaal_cents ?? inv.amount_cents)}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <SubscriptionStatusBadge status={String(inv.status ?? '')} />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button
                        onClick={() => pdfActions.downloadInvoicePdf.mutate(String(inv.id))}
                        title="PDF downloaden"
                        style={{ background: 'none', border: 'none', cursor: 'pointer',
                                 padding: 4, color: 'var(--color-text-secondary)' }}
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
            Neem contact op met ons supportteam om van plan te wisselen.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" onClick={() => window.open('/contact', '_blank')}>
              Contact opnemen
            </Button>
            <Button variant="secondary" onClick={() => setShowChangePlan(false)}>
              Sluiten
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Opzeggen */}
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
            <div style={{ fontSize: 13, padding: '8px 12px', marginBottom: 12,
                          background: 'var(--color-background-danger)',
                          color: 'var(--color-text-danger)',
                          borderRadius: 'var(--border-radius-md)' }}>
              {cancelError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowCancel(false)} disabled={cancelLoading}>
              Annuleren
            </Button>
            <button
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              style={{
                padding: '8px 16px',
                background: 'var(--color-background-danger)',
                color: 'var(--color-text-danger)',
                border: '0.5px solid var(--color-border-danger)',
                borderRadius: 'var(--border-radius-md)',
                cursor: cancelLoading ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
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
