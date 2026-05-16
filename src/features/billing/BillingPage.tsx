import { useEffect, useState } from 'react';
import { createTenantBillingCheckout } from '@/api/billing';
import { trackEvent, getPricingExperiment, getTrialStatus } from '@/api/analytics';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { PaymentLogos } from '@/features/billing/PaymentLogos';
import './billing-pricing.css';

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
  const monthlyCents = Number(cfg.monthly_cents || 5900);
  const yearlyCents = Number(cfg.yearly_cents || 5929_0);
  const cta = String(cfg.cta || 'Naar checkout →');

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
    <MobilePageScaffold title="Facturatie" subtitle="Kies je pakket">
      <div className="billing-page" data-page="billing">
        <div className="pricing-page-content">

          {/* Feature badges */}
          <div className="pricing-badges">
            <span className="pricing-badge"><span className="pricing-badge-icon">▣</span> Maandelijks opzegbaar</span>
            <span className="pricing-badge"><span className="pricing-badge-icon">●</span> Veilig betalen via Mollie</span>
            <span className="pricing-badge"><span className="pricing-badge-icon">ϟ</span> Direct starten na betaling</span>
            <span className="pricing-badge"><span className="pricing-badge-icon">✓</span> EN 1090 &amp; ISO workflows</span>
          </div>

          {trialMessage ? <InlineMessage tone="warning">{trialMessage}</InlineMessage> : null}

          {/* Plan cards */}
          <div className="billing-plan-grid">
            {/* Monthly */}
            <div
              className={`billing-plan-option pricing-plan-option-monthly${cycle === 'monthly' ? ' is-selected' : ''}`}
              onClick={() => setCycle('monthly')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setCycle('monthly')}
            >
              <div className="pricing-plan-header">
                <span className="billing-pill">Flexibel</span>
                <h2>Maandelijks</h2>
              </div>
              <div className="billing-price">
                <strong>{euro(monthlyCents)}</strong>
                <span>/ gebruiker / maand</span>
              </div>
              <div className="pricing-plan-details">
                <p>Inclusief 21% btw. Maandelijks opzegbaar.</p>
                <p>Ideaal om laagdrempelig te starten of tijdelijk op te schalen.</p>
              </div>
              <button type="button" className="pricing-plan-btn" onClick={() => setCycle('monthly')}>
                Selecteer maandelijks
              </button>
            </div>

            {/* Yearly — most chosen */}
            <div
              className={`billing-plan-option pricing-plan-option-yearly${cycle === 'yearly' ? ' is-selected' : ''}`}
              onClick={() => setCycle('yearly')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setCycle('yearly')}
            >
              <span className="billing-popular">☆ MEEST GEKOZEN</span>
              <div className="pricing-plan-header">
                <h2>Jaarlijks</h2>
              </div>
              <div className="billing-price">
                <strong>{euro(yearlyCents)}</strong>
                <span>/ gebruiker / jaar</span>
              </div>
              <div className="pricing-plan-details">
                <p>Inclusief 21% btw. Jaarlijks gefactureerd.</p>
                <p>Voordeliger dan 12 maanden los betalen.</p>
              </div>
              <button type="button" className="pricing-plan-btn" onClick={() => setCycle('yearly')}>
                Selecteer jaarlijks
              </button>
            </div>
          </div>

          {/* Payment methods */}
          <section className="billing-marketing-card pricing-payment-section">
            <div className="billing-eyebrow">▣ Mollie</div>
            <h3>Betaal veilig via Mollie</h3>
            <p>
              De beschikbare betaalmethoden kunnen per apparaat, land en Mollie-profiel
              verschillen. In de checkout zie je automatisch de juiste opties.
            </p>
            <PaymentLogos />
            <p className="pricing-payment-note">
              ▣ Ook bankoverschrijving kan via Mollie beschikbaar zijn. Apple Pay verschijnt
              alleen wanneer het apparaat, de browser en het Mollie-profiel dit ondersteunen.
            </p>
          </section>

          {/* Checkout configuration */}
          <section className="billing-marketing-card pricing-checkout-section">
            <h3>Checkout</h3>
            <p>Rond je keuze af en ga door naar de betaalpagina.</p>

            <div className="pricing-checkout-form">
              <label className="pricing-checkout-field">
                <span>Aantal seats</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value) || 1)}
                  aria-label="Aantal seats"
                />
              </label>
              <label className="pricing-checkout-field">
                <span>Facturatieperiode</span>
                <select
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value as 'monthly' | 'yearly')}
                  aria-label="Facturatieperiode"
                >
                  <option value="yearly">Jaarlijks</option>
                  <option value="monthly">Maandelijks</option>
                </select>
              </label>
            </div>

            <button type="button" className="pricing-checkout-btn" onClick={checkout}>
              {cta}
            </button>
          </section>

        </div>
      </div>
    </MobilePageScaffold>
  );
}
