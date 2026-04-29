import { useEffect, useState } from 'react';
import { createTenantBillingCheckout } from '@/api/billing';
import { trackEvent, getPricingExperiment, getTrialStatus } from '@/api/analytics';

function euro(cents: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default function BillingPage() {
  const [experiment, setExperiment] = useState<any>(null);
  const [trial, setTrial] = useState<any>(null);
  const [seats, setSeats] = useState(3);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');

  useEffect(() => {
    trackEvent('page_view');
    getPricingExperiment().then(setExperiment);
    getTrialStatus().then(setTrial);
  }, []);

  const checkout = async () => {
    trackEvent('start_checkout', { variant: experiment?.variant });
    const r = await createTenantBillingCheckout({ seats, billing_cycle: cycle });
    if ((r as any).checkout_url) window.location.href = String((r as any).checkout_url);
  };

  const cfg = experiment?.config || {};

  return (
    <div style={{ padding: 24 }}>
      <h1>{cfg.headline || 'Upgrade your plan'}</h1>
      <p>{cfg.subline}</p>

      {trial && trial.prompt_level !== 'none' && (
        <div style={{ background: '#fff3cd', padding: 12, marginBottom: 20 }}>
          {trial.messages?.[trial.prompt_level]}
        </div>
      )}

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ border: '1px solid #ccc', padding: 20 }}>
          <h3>Professional</h3>
          <div>{euro(cfg.monthly_cents || 4900)} / maand</div>
          <div>{euro(cfg.yearly_cents || 49000)} / jaar</div>
          <button onClick={checkout} style={{ marginTop: 10 }}>
            {cfg.cta || 'Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}
