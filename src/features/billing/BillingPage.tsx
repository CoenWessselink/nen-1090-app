import { CreditCard, ExternalLink, RefreshCcw, ShieldCheck, Wallet } from 'lucide-react';
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
    { label: 'Status', value: String(status.status || 'Onbekend'), meta: 'Huidige tenantstatus', icon: CreditCard },
    { label: 'Seats', value: String(status.seats_purchased || '—'), meta: `${String(status.users_count || '—')} gebruikers actief`, icon: ShieldCheck },
    { label: 'Factuur', value: formatDatetime(String(status.mollie_next_payment_date || status.valid_until || '')) || 'Niet beschikbaar', meta: 'Volgende betaaldatum of validiteit', icon: Wallet },
    { label: 'Self-service', value: canManageBilling ? 'Beheer actief' : 'Alleen lezen', meta: 'Centrale abonnementsshell', icon: ExternalLink },
  ];

  return (
    <div className="page-stack billing-page">
      <section className="section-banner">
        <div className="section-banner-copy">
          <span className="section-banner-kicker">Abonnement en tenantstatus</span>
          <h1>Billing</h1>
          <p>Gebruik dezelfde header- en tegeltaal als de rest van het programma en werk vanuit duidelijke billing-tegels.</p>
        </div>
        <div className="section-banner-actions">
          <Button variant="secondary" onClick={() => billingStatus.refetch()}><RefreshCcw size={16} /> Verversen</Button>
          <a href={marketingSubscriptionUrl} target="_self" rel="noreferrer"><Button><ExternalLink size={16} /> Open centraal abonnement</Button></a>
        </div>
      </section>

      {!canManageBilling ? <InlineMessage tone="neutral">Je kunt hier de tenantstatus bekijken. Wijzigingen aan abonnement en checkout verlopen centraal via de marketing-shell.</InlineMessage> : null}

      <div className="section-nav-grid">
        {summaryRows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="section-nav-tile is-active">
              <div className="section-nav-tile-top"><Icon size={18} /><span>{row.label}</span></div>
              <div className="section-nav-tile-value">{row.value}</div>
              <strong>{row.label === 'Self-service' ? 'Centraal abonnement' : row.meta}</strong>
              <small>{row.meta}</small>
            </div>
          );
        })}
      </div>

      <div className="section-nav-grid cols-3">
        <button type="button" className="section-nav-tile" onClick={() => billingStatus.refetch()}>
          <div className="section-nav-tile-top"><RefreshCcw size={18} /><span>Status verversen</span></div>
          <div className="section-nav-tile-value">Live</div>
          <strong>Billing status</strong>
          <small>Werk seats, tenantstatus en geldigheid direct bij.</small>
        </button>
        <button type="button" className="section-nav-tile" onClick={() => { window.location.href = marketingSubscriptionUrl; }}>
          <div className="section-nav-tile-top"><ExternalLink size={18} /><span>Self-service</span></div>
          <div className="section-nav-tile-value">Open</div>
          <strong>Centraal abonnement</strong>
          <small>Ga direct naar checkout, abonnement en facturatie.</small>
        </button>
        <div className="section-nav-tile">
          <div className="section-nav-tile-top"><ShieldCheck size={18} /><span>Ownership</span></div>
          <div className="section-nav-tile-value">1 UX</div>
          <strong>Billing via centrale shell</strong>
          <small>Geen dubbele billing-UX meer binnen de app.</small>
        </div>
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
            <Button variant="secondary" onClick={() => billingStatus.refetch()}><RefreshCcw size={16} /> Verversen</Button>
          </div>
        </Card>

        <Card>
          <div className="section-title-row">
            <h3><ShieldCheck size={18} /> Ownership</h3>
            <Badge tone="success">Samengevoegd</Badge>
          </div>
          <div className="list-stack compact-list">
            <div className="list-row"><div><strong>Marketing-shell</strong><div className="list-subtle">Pricing, checkout, success/cancel, onboarding en abonnement self-service</div></div><Badge tone="success">Leidend</Badge></div>
            <div className="list-row"><div><strong>API</strong><div className="list-subtle">Tenant billing contract, status, seat-updates en payment-confirm adapters</div></div><Badge tone="success">Waarheid</Badge></div>
            <div className="list-row"><div><strong>React app</strong><div className="list-subtle">Protected productomgeving; billing-beheer gaat via centrale shell</div></div><Badge tone="success">Read-only handoff</Badge></div>
          </div>
          <InlineMessage tone="neutral">Hiermee verdwijnt de dubbele billing-UX uit de app zonder de tenantstatus voor de gebruiker te verliezen.</InlineMessage>
        </Card>
      </div>

      {billingStatus.isLoading ? <LoadingState label="Billingstatus laden..." /> : null}
      {billingStatus.isError ? <ErrorState title="Billingstatus niet geladen" description="Controleer of /tenant/billing/status bereikbaar is." /> : null}
    </div>
  );
}
