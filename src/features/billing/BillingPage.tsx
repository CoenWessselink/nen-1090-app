import { useEffect, useState } from 'react';
import { createTenantBillingCheckout } from '@/api/billing';
import { trackEvent, getPricingExperiment, getTrialStatus } from '@/api/analytics';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';

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

  const promptLevel = typeof trial?.prompt_level === 'string' ? trial.prompt_level : undefined;
  const rawMessages = trial?.messages;
  let trialMessage: string | null = null;
  if (
    promptLevel &&
    promptLevel !== 'none' &&
    rawMessages &&
    typeof rawMessages === 'object' &&
    !Array.isArray(rawMessages)
  ) {
    const entry = (rawMessages as Record<string, unknown>)[promptLevel];
    trialMessage = typeof entry === 'string' ? entry : null;
  }

  return (
    <MobilePageScaffold title="Facturatie" subtitle={headline}>
      <div className="billing-page" data-page="billing">
        {subline ? <div className="mobile-list-card-meta">{subline}</div> : null}

        {trialMessage ? <InlineMessage tone="warning">{trialMessage}</InlineMessage> : null}

        <div className="mobile-kpi-grid">
          <div className="mobile-kpi-card mobile-kpi-card-primary">
            <div className="mobile-kpi-top">
              <span>Maandprijs</span>
            </div>
            <strong>{euro(monthlyCents)}</strong>
            <small style={{ color: 'rgba(255,255,255,0.82)' }}>per maand (indicatief)</small>
          </div>
          <div className="mobile-kpi-card mobile-kpi-card-success">
            <div className="mobile-kpi-top">
              <span>Jaarprijs</span>
            </div>
            <strong>{euro(yearlyCents)}</strong>
            <small style={{ color: 'rgba(255,255,255,0.82)' }}>per jaar (indicatief)</small>
          </div>
          <div className="mobile-kpi-card mobile-kpi-card-warning">
            <div className="mobile-kpi-top">
              <span>Zitplaatsen</span>
            </div>
            <strong>{seats}</strong>
            <small style={{ color: 'rgba(255,255,255,0.82)' }}>Aantal seats voor checkout</small>
          </div>
          <div className="mobile-kpi-card mobile-kpi-card-secondary">
            <div className="mobile-kpi-top">
              <span>Facturatiecyclus</span>
            </div>
            <strong style={{ fontSize: 22 }}>{cycle === 'yearly' ? 'Jaar' : 'Maand'}</strong>
            <small style={{ color: 'rgba(255,255,255,0.82)' }}>Kies vóór checkout</small>
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
    </MobilePageScaffold>
  );
}
