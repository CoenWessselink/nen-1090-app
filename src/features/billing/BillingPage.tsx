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

function euro(cents: unknown) {
  const n = Number(cents || 0);
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n / 100);
}

type BillingPageState = {
  subscription?: {
    seats?: number;
    status?: string;
    billing_cycle?: string;
  };
  tenant_status?: string;
  access_mode?: string;
};

type TeamResponse = {
  users?: any[];
  invites?: any[];
  seat_usage?: {
    seats?: number;
    active_users?: number;
    pending_invites?: number;
    used_seats?: number;
    available_seats?: number;
  };
};

function statusClass(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['active', 'paid', 'betaald', 'conform'].includes(value)) return 'is-success';
  if (['past_due', 'pending', 'pending_payment', 'trial', 'open'].includes(value)) return 'is-warning';
  if (['cancelled', 'canceled', 'failed', 'suspended'].includes(value)) return 'is-danger';
  return '';
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingPageState>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [teamData, setTeamData] = useState<TeamResponse>({});
  const [seats, setSeats] = useState(1);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const users = Array.isArray(teamData.users) ? teamData.users : [];
  const invites = Array.isArray(teamData.invites) ? teamData.invites : [];
  const seatUsage = teamData.seat_usage || {};
  const activeStatus = status.subscription?.status || status.tenant_status || '-';
  const currentSeats = Number(status.subscription?.seats || seatUsage.seats || seats || 1);

  const pricePerSeat = cycle === 'monthly' ? 4900 : 49000;
  const total = useMemo(() => Math.max(Number(seats || 1), 1) * pricePerSeat, [seats, pricePerSeat]);
  const saving = Math.max(4900 * 12 * Math.max(Number(seats || 1), 1) - total, 0);

  const load = async () => {
    const s = (await getTenantBillingStatus()) as BillingPageState;
    setStatus(s || {});
    setSeats(Number(s?.subscription?.seats || 1));
    if (s?.subscription?.billing_cycle === 'monthly' || s?.subscription?.billing_cycle === 'yearly') {
      setCycle(s.subscription.billing_cycle);
    }
    try {
      const p = await getTenantBillingPayments();
      setPayments(Array.isArray((p as any)?.payments) ? (p as any).payments : []);
    } catch {}
    try {
      const t = (await getTeamUsers()) as TeamResponse;
      setTeamData(t || {});
    } catch {}
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const runAction = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    setNotice(null);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  const checkout = async () => {
    await runAction('checkout', async () => {
      const r = await createTenantBillingCheckout({ seats, billing_cycle: cycle });
      if ((r as any).checkout_url) window.location.href = String((r as any).checkout_url);
      else setNotice('Checkout is aangemaakt, maar Mollie gaf geen redirect terug. Controleer de billing status.');
    });
  };

  const changeSeatCount = async () => {
    await runAction('seats', async () => {
      const r = await changeTenantSeats({ seats, billing_cycle: cycle });
      if ((r as any).checkout_url) window.location.href = String((r as any).checkout_url);
      else {
        setNotice('Seat-aanpassing opgeslagen.');
        await load();
      }
    });
  };

  const retry = async () => {
    await runAction('retry', async () => {
      const r = await retryTenantPayment();
      if ((r as any).checkout_url) window.location.href = String((r as any).checkout_url);
      else setNotice('Nieuwe betaalpoging voorbereid.');
    });
  };

  const cancel = async () => {
    await runAction('cancel', async () => {
      await cancelTenantSubscriptionSelfService();
      setNotice('Opzegverzoek verwerkt.');
      await load();
    });
  };

  const invite = async () => {
    if (!email.trim()) return;
    await runAction('invite', async () => {
      await inviteTeamUser({ email: email.trim(), role: 'tenant_user' });
      setEmail('');
      setNotice('Uitnodiging verstuurd of klaargezet.');
      await load();
    });
  };

  return (
    <div className="billing-marketing-page" data-page="billing">
      <section className="billing-marketing-hero">
        <div>
          <div className="billing-eyebrow">Billing · Mollie · Seats</div>
          <h1>Manage your subscription. <span className="billing-marketing-blue">Keep access in control.</span></h1>
          <p className="billing-marketing-lead">
            Upgrade seats, start Mollie checkout, retry payments and invite team members from one controlled billing workflow.
          </p>
          <div className="billing-action-row">
            <button onClick={checkout} disabled={busy !== null}>{busy === 'checkout' ? 'Opening Mollie...' : 'Start betaling'}</button>
            <button className="billing-secondary-button" onClick={retry} disabled={busy !== null}>{busy === 'retry' ? 'Voorbereiden...' : 'Retry betaling'}</button>
          </div>
        </div>
        <aside className="billing-hero-proof">
          <div><strong>{activeStatus}</strong><span className={`billing-pill ${statusClass(activeStatus)}`}>Subscription status</span></div>
          <div><strong>{currentSeats}</strong><span>Seats purchased</span></div>
          <div><strong>{status.access_mode || 'full_access'}</strong><span>Access mode</span></div>
        </aside>
      </section>

      {notice ? <div className="billing-marketing-card"><span className="billing-pill is-success">{notice}</span></div> : null}

      <section className="billing-marketing-grid">
        <div className="billing-marketing-card">
          <div className="billing-eyebrow">Plan</div>
          <h2>Choose billing cycle</h2>
          <p>Annual billing gives the best price while monthly billing keeps flexibility.</p>

          <div className="billing-plan-grid">
            <button type="button" className={`billing-plan-option ${cycle === 'monthly' ? 'is-selected' : ''}`} onClick={() => setCycle('monthly')}>
              <h3>Monthly</h3>
              <p>Flexible monthly billing</p>
              <div className="billing-price"><strong>€49</strong><span>/ user / month</span></div>
              <span className="billing-pill">Cancel anytime</span>
            </button>

            <button type="button" className={`billing-plan-option ${cycle === 'yearly' ? 'is-selected' : ''}`} onClick={() => setCycle('yearly')}>
              <span className="billing-popular">Best value</span>
              <h3>Yearly</h3>
              <p>Best for production teams</p>
              <div className="billing-price"><strong>€490</strong><span>/ user / year</span></div>
              <span className="billing-pill is-success">Save {euro(saving)}</span>
            </button>
          </div>

          <div className="billing-form-row">
            <label>
              <span className="billing-marketing-label">Seats</span>
              <input type="number" value={seats} min={1} onChange={e => setSeats(Number(e.target.value || 1))} />
            </label>
            <label>
              <span className="billing-marketing-label">Billing cycle</span>
              <select value={cycle} onChange={e => setCycle(e.target.value as 'monthly' | 'yearly')}>
                <option value="monthly">Maandelijks</option>
                <option value="yearly">Jaarlijks</option>
              </select>
            </label>
          </div>

          <div className="billing-stat-grid" style={{ marginTop: 18 }}>
            <div className="billing-marketing-stat"><strong>{euro(total)}</strong><span>Estimated total</span></div>
            <div className="billing-marketing-stat"><strong>{cycle === 'yearly' ? '12 months' : '1 month'}</strong><span>Billing interval</span></div>
            <div className="billing-marketing-stat"><strong>{seats}</strong><span>Target seats</span></div>
          </div>

          <div className="billing-action-row">
            <button onClick={checkout} disabled={busy !== null}>{busy === 'checkout' ? 'Opening Mollie...' : 'Start checkout'}</button>
            <button className="billing-secondary-button" onClick={changeSeatCount} disabled={busy !== null}>{busy === 'seats' ? 'Verwerken...' : 'Seats aanpassen'}</button>
            <button className="billing-secondary-button" onClick={cancel} disabled={busy !== null}>{busy === 'cancel' ? 'Opzeggen...' : 'Opzeggen'}</button>
          </div>
        </div>

        <div className="billing-marketing-card">
          <div className="billing-eyebrow">Team</div>
          <h2>Seats & invites</h2>
          <div className="billing-stat-grid">
            <div className="billing-marketing-stat"><strong>{seatUsage.used_seats ?? users.length}</strong><span>Used seats</span></div>
            <div className="billing-marketing-stat"><strong>{seatUsage.pending_invites ?? invites.length}</strong><span>Pending invites</span></div>
            <div className="billing-marketing-stat"><strong>{seatUsage.available_seats ?? Math.max(currentSeats - users.length, 0)}</strong><span>Available seats</span></div>
          </div>
          <div className="billing-form-row">
            <label>
              <span className="billing-marketing-label">Invite email</span>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
            </label>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button onClick={invite} disabled={busy !== null || !email.trim()}>{busy === 'invite' ? 'Versturen...' : 'Invite user'}</button>
            </div>
          </div>
          <div className="billing-table-list">
            {users.slice(0, 6).map(u => (
              <div className="billing-table-row" key={u.user_id || u.email}>
                <div><strong>{u.email}</strong><p>{u.role || 'tenant_user'} · {u.status || 'active'}</p></div>
                <span className="billing-pill is-success">Active</span>
              </div>
            ))}
            {invites.slice(0, 4).map(i => (
              <div className="billing-table-row" key={i.id || i.email}>
                <div><strong>{i.email}</strong><p>{i.role || 'tenant_user'} · pending invite</p></div>
                <span className="billing-pill is-warning">Invited</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="billing-marketing-card">
        <div className="billing-eyebrow">Payments</div>
        <h2>Payment history</h2>
        <div className="billing-table-list">
          {payments.length ? payments.map(p => (
            <div className="billing-table-row" key={p.id || p.provider_payment_id}>
              <div><strong>{p.provider_payment_id || p.id}</strong><p>{p.created_at || 'Payment'} · {p.currency || 'EUR'}</p></div>
              <span className={`billing-pill ${statusClass(p.status)}`}>{p.status || 'unknown'} · {euro(p.amount_cents)}</span>
            </div>
          )) : <p className="billing-marketing-muted">Nog geen betalingen gevonden.</p>}
        </div>
      </section>
    </div>
  );
}
