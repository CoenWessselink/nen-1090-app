import { useEffect, useMemo, useState } from 'react';
import {
  createTenantBillingCheckout,
  changeTenantSeats,
  retryTenantPayment,
  cancelTenantSubscriptionSelfService,
  getTenantBillingStatus,
  getTenantBillingPayments,
  getTeamUsers,
  inviteTeamUser,
} from '@/api/billing';
import { trackEvent } from '@/api/analytics';

function euro(cents: unknown) {
  const n = Number(cents || 0);
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n / 100);
}

export default function BillingPage() {
  const [status, setStatus] = useState<any>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [teamData, setTeamData] = useState<any>({});
  const [seats, setSeats] = useState(1);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    trackEvent('pricing_view');
  }, []);

  const checkout = async () => {
    trackEvent('checkout_start');
    const r = await createTenantBillingCheckout({ seats, billing_cycle: cycle });
    if ((r as any).checkout_url) window.location.href = String((r as any).checkout_url);
  };

  return <div />;
}
