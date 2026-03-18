import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useBillingStatus } from '@/hooks/useBilling';
import { useAccess } from '@/hooks/useAccess';
import { buildAppReturnTo, buildMarketingUrl } from '@/features/auth/marketing-auth';
import { formatDatetime, toneFromStatus } from '@/utils/format';

export function BillingPage() {
  const canManageBilling = useAccess('billing.manage');
  const billingStatus = useBillingStatus();
  const status = billingStatus.data || {};
  const marketingSubscriptionUrl = buildMarketingUrl('subscription', {
    next: buildAppReturnTo('/billing'),
    query: {
      source: 'nen1090-app',
      returnTo: buildAppReturnTo('/billing'),
    },
  });

  const summaryRows = [
    { label: 'Status', value: String(status.status || 'Onbekend') },
    { label: 'Seats', value: String(status.seats_purchased || '—') },
    { label: 'Gebruikers actief', value: String(status.users_count || '—') },
    { label: 'Volgende factuurdatum', value: formatDatetime(String(status.mollie_next_payment_date || status.valid_until || '')) || 'Niet beschikbaar' },
  ];

  return (
    <div className="page-stack">
      <PageHeader title="Billing" description="Billingbeheer loopt vanaf fase 2 centraal via de marketing- en klantbeheershell. De productapp toont alleen de tenantstatus en leidt door naar het centrale abonnementsscherm." />
      {!canManageBilling ? <InlineMessage tone="neutral">Je kunt hier de tenantstatus bekijken. Wijzigingen aan abonnement en checkout verlopen centraal via de marketing-shell.</InlineMessage> : null}

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
            <h3><CreditCard size={18} /> Centraal abonnement</h3>
            <Badge tone={toneFromStatus(String(status.status || 'neutral'))}>{String(status.status || 'Onbekend')}</Badge>
          </div>
          <p>Vanaf deze fase is er nog maar één leidende UX voor abonnement, seats, checkout en facturen: <strong>/app/subscription.html</strong> in de marketing/klantbeheer-shell.</p>
          <div className="detail-grid" style={{ marginTop: 12 }}>
            {summaryRows.map((row) => (
              <div key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>
            ))}
          </div>
          <div className="stack-actions" style={{ marginTop: 16 }}>
            <a href={marketingSubscriptionUrl} target="_self" rel="noreferrer"><Button><ExternalLink size={16} /> Open centraal abonnement</Button></a>
            <Button variant="secondary" onClick={() => billingStatus.refetch()}>Verversen</Button>
          </div>
        </Card>

        <Card>
          <div className="section-title-row">
            <h3><ShieldCheck size={18} /> Ownership fase 2</h3>
            <Badge tone="success">Samengevoegd</Badge>
          </div>
          <div className="list-stack compact-list">
            <div className="list-row"><div><strong>Marketing-shell</strong><div className="list-subtle">Pricing, checkout, success/cancel, onboarding en abonnement self-service</div></div><Badge tone="success">Leidend</Badge></div>
            <div className="list-row"><div><strong>API</strong><div className="list-subtle">Tenant billing contract, status, seat-updates en payment-confirm adapters</div></div><Badge tone="success">Waarheid</Badge></div>
            <div className="list-row"><div><strong>React app</strong><div className="list-subtle">Alleen protected productomgeving; billing-beheer gaat via centrale shell</div></div><Badge tone="success">Read-only handoff</Badge></div>
          </div>
          <InlineMessage tone="neutral">Hiermee verdwijnt de dubbele billing-UX uit de app zonder de tenantstatus voor de gebruiker te verliezen.</InlineMessage>
        </Card>
      </div>

      {billingStatus.isLoading ? <LoadingState label="Billingstatus laden..." /> : null}
      {billingStatus.isError ? <ErrorState title="Billingstatus niet geladen" description="Controleer of /tenant/billing/status bereikbaar is." /> : null}
    </div>
  );
}
