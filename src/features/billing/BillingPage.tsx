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

export default function BillingPage() {
  const [status, setStatus] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [seats, setSeats] = useState(1);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const s = await getTenantBillingStatus();
    setStatus(s);
    setSeats(Number(s?.subscription?.seats || 1));
    try {
      const p = await getTenantBillingPayments();
      setPayments(Array.isArray(p?.payments) ? p.payments : []);
    } catch {}
    try {
      const t = await getTeamUsers();
      setTeam(Array.isArray(t?.users) ? t.users : []);
    } catch {}
  };

  useEffect(() => {
    load().catch(e => setMessage(e.message || String(e)));
  }, []);

  const checkout = async () => {
    const r = await createTenantBillingCheckout({ seats, billing_cycle: cycle });
    if (r.checkout_url) window.location.href = String(r.checkout_url);
  };

  const changeSeats = async () => {
    const r = await changeTenantSeats({ seats, billing_cycle: cycle });
    if (r.checkout_url) window.location.href = String(r.checkout_url);
  };

  const retry = async () => {
    const r = await retryTenantPayment();
    if (r.checkout_url) window.location.href = String(r.checkout_url);
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
        <p>Status: {status?.subscription?.status}</p>
        <p>Seats: {status?.subscription?.seats}</p>

        <input type="number" value={seats} onChange={e => setSeats(Number(e.target.value))} />
        <select value={cycle} onChange={e => setCycle(e.target.value as any)}>
          <option value="monthly">Maandelijks</option>
          <option value="yearly">Jaarlijks</option>
        </select>

        <button onClick={checkout}>Start betaling</button>
        <button onClick={changeSeats}>Seats aanpassen</button>
        <button onClick={retry}>Retry betaling</button>
        <button onClick={cancel}>Opzeggen</button>
      </div>

      <h2>Betalingen</h2>
      <ul>
        {payments.map(p => (
          <li key={p.id}>{p.status} - {euro(p.amount_cents)}</li>
        ))}
      </ul>

      <h2>Team</h2>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
      <button onClick={invite}>Invite</button>
      <ul>
        {team.map(u => <li key={u.user_id}>{u.email}</li>)}
      </ul>
    </div>
  );
}
