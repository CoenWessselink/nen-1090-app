import { useEffect, useState } from 'react';
import { createTenantBillingCheckout } from '@/api/billing';
import { trackEvent, getPricingExperiment, getTrialStatus } from '@/api/analytics';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InlineMessage } from '@/components/feedback/InlineMessage';

function euro(cents: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default function BillingPage() {
  const [experiment, setExperiment] = useState<Record<string, unknown> | null>(null);
  const [trial, setTrial] = useState<Record<string, unknown> | null>(null);
  const [seats, setSeats] = useState(3);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');

  useEffect(() => {
    trackEvent('page_view');
    getPricingExperiment().then(setExperiment as (v: unknown) => void);
    getTrialStatus().then(setTrial as (v: unknown) => void);
  }, []);

  const checkout = async () => {
    trackEvent('start_checkout', { variant: (experiment as { variant?: string } | null)?.variant });
    const r = await createTenantBillingCheckout({ seats, billing_cycle: cycle });
    const url = (r as { checkout_url?: string })?.checkout_url;
    if (url) window.location.href = String(url);
  };

  const cfg = (experiment?.config as Record<string, unknown>) || {};
  const headline = String(cfg.headline || 'Abonnement upgraden');
  const subline = String(cfg.subline || 'Kies je pakket en rond de betaling af via onze betaalpartner.');
  const monthlyCents = Number(cfg.monthly_cents || 4900);
  const yearlyCents = Number(cfg.yearly_cents || 49000);
  const cta = String(cfg.cta || 'Upgrade');

  const promptLevel = trial?.prompt_level as string | undefined;
  const trialMessage =
    promptLevel && promptLevel !== 'none' && Array.isArray(trial?.messages)
      ? (trial!.messages as Record<string, string>)[promptLevel]
      : null;

  return (
    <div className="page-stack billing-page">
      <PageHeader title={headline} description={subline} />

      {trialMessage ? <InlineMessage tone="warning">{trialMessage}</InlineMessage> : null}

      <div className="dashboard-kpi-grid">
        <div className="card stat-card">
          <div className="stat-label">Maandprijs</div>
          <div className="stat-value">{euro(monthlyCents)}</div>
          <div className="stat-meta">per maand (indicatief)</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Jaarprijs</div>
          <div className="stat-value">{euro(yearlyCents)}</div>
          <div className="stat-meta">per jaar (indicatief)</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Zitplaatsen</div>
          <div className="stat-value">{seats}</div>
          <div className="stat-meta">Aantal seats voor checkout</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Facturatiecyclus</div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            {cycle === 'yearly' ? 'Jaar' : 'Maand'}
          </div>
          <div className="stat-meta">Kies vóór checkout</div>
        </div>
      </div>

      <Card>
        <div className="section-title-row">
          <h3>Professional</h3>
        </div>
        <div className="detail-grid">
          <div>
            <span>Seats</span>
            <input
              type="number"
              min={1}
              max={500}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value) || 1)}
              className="input"
              aria-label="Aantal seats"
            />
          </div>
          <div>
            <span>Periode</span>
            <select
              value={cycle}
              onChange={(e) => setCycle(e.target.value as 'monthly' | 'yearly')}
              className="input"
              aria-label="Facturatieperiode"
            >
              <option value="yearly">Jaarlijks</option>
              <option value="monthly">Maandelijks</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="dashboard-action-bar">
        <div className="dashboard-action-bar-copy">
          <strong>Checkout</strong>
          <div className="list-subtle">Je wordt doorgestuurd naar de betaalpagina zodra je bevestigt.</div>
        </div>
        <div className="dashboard-action-bar-actions">
          <Button type="button" onClick={checkout}>
            {cta}
          </Button>
        </div>
      </Card>
    </div>
  );
}
