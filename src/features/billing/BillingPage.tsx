import { useEffect, useState } from 'react';
import {
  createTenantBillingCheckout,
  changeTenantSeats,
  retryTenantPayment,
  cancelTenantSubscriptionSelfService,
  getTenantBillingStatus,
  getTenantBillingPayments,
  getTeamUsers,
  inviteTeamUser
} from '@/api/billing';

function euro(cents: unknown) {
  const n = Number(cents || 0);
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n / 100);
}

type BillingPageState = {
  subscription?: {
    seats?: number;
    status?: string;
  };
};

export default function BillingPage() {
  const [status, setStatus] = useState<BillingPageState>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [seats, setSeats] = useState(1);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [email, setEmail] = useState('');

  const load = async () => {
    const s = (await getTenantBillingStatus()) as BillingPageState;
    setStatus(s || {});
    setSeats(Number(s?.subscription?.seats || 1));
    try {
      const p = await getTenantBillingPayments();
      setPayments(Array.isArray((p as any)?.payments) ? (p as any).payments : []);
    } catch {}
    try {
      const t = await getTeamUsers();
      setTeam(Array.isArray((t as any)?.users) ? (t as any).users : []);
    } catch {}
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const checkout = async () => {
    const r = await createTenantBillingCheckout({ seats, billing_cycle: cycle });
    if ((r as any).checkout_url) window.location.href = String((r as any).checkout_url);
  };

  const changeSeatCount = async () => {
    const r = await changeTenantSeats({ seats, billing_cycle: cycle });
    if ((r as any).checkout_url) window.location.href = String((r as any).checkout_url);
  };

  const retry = async () => {
    const r = await retryTenantPayment();
    if ((r as any).checkout_url) window.location.href = String((r as any).checkout_url);
  };

  const cancel = async () => {
    await cancelTenantSubscriptionSelfService();
    await load();
  };

  const invite = async () => {
    await inviteTeamUser({ email, role: 'tenant_user' });
    setEmail('');
    await load();
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Billing</h1>
      <div>
        <p>Status: {status.subscription?.status || '-'}</p>
        <p>Seats: {status.subscription?.seats || seats}</p>
        <input type="number" value={seats} min={1} onChange={e => setSeats(Number(e.target.value || 1))} />
        <select value={cycle} onChange={e => setCycle(e.target.value as 'monthly' | 'yearly')}>
          <option value="monthly">Maandelijks</option>
          <option value="yearly">Jaarlijks</option>
        </select>
        <button onClick={checkout}>Start betaling</button>
        <button onClick={changeSeatCount}>Seats aanpassen</button>
        <button onClick={retry}>Retry betaling</button>
        <button onClick={cancel}>Opzeggen</button>
      </div>
      <h2>Betalingen</h2>
      <ul>{payments.map(p => <li key={p.id}>{p.status} - {euro(p.amount_cents)}</li>)}</ul>
      <h2>Team</h2>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
      <button onClick={invite}>Invite</button>
      <ul>{team.map(u => <li key={u.user_id}>{u.email}</li>)}</ul>
    </div>
  );
}
