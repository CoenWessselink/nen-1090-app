import { useState } from 'react';
import { extendTrial, suspendTenant, reactivateTenant, cancelTenant, type TenantSubscription } from '@/api/superadminCommercialGovernance';

function dateLabel(v: string | null | undefined) { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('nl-NL'); }
function statusTone(s: string) { if (s === 'active') return 'success'; if (s.includes('suspend') || s.includes('cancel') || s === 'past_due' || s === 'expired') return 'danger'; if (s === 'trial' || s === 'trialing') return 'warning'; return 'neutral'; }

export function TenantSubscriptionPanel({ tenantId, subscription, onRefresh }: { tenantId: string; subscription: TenantSubscription | null; onRefresh: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function action(label: string, fn: () => Promise<void>) {
    const reason = window.prompt(`Reden voor ${label}:`);
    if (!reason) return;
    setBusy(true); setMsg(null); setErr(null);
    try { await fn(); setMsg(`${label} uitgevoerd.`); onRefresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Actie mislukt.'); }
    finally { setBusy(false); }
  }

  if (!subscription) return <div className="cg-state">Geen abonnementsdata beschikbaar.</div>;

  const rows: Array<[string, string]> = [
    ['Plan', `${subscription.plan_name} (${subscription.plan_code})`],
    ['Status', subscription.status],
    ['Provider', subscription.billing_provider],
    ['Provider klant-ID', subscription.provider_customer_id || '—'],
    ['Provider abonnement-ID', subscription.provider_subscription_id || '—'],
    ['Trial start', dateLabel(subscription.trial_started_at)],
    ['Trial einde', dateLabel(subscription.trial_ends_at)],
    ['Periode start', dateLabel(subscription.current_period_start)],
    ['Periode einde', dateLabel(subscription.current_period_end)],
    ['Grace tot', dateLabel(subscription.grace_until)],
    ['Geannuleerd', dateLabel(subscription.cancelled_at)],
    ['Geschorst', dateLabel(subscription.suspended_at)],
    ['Bedrag', `€${(subscription.amount_cents / 100).toFixed(2)} / ${subscription.interval}`],
    ['Valuta', subscription.currency],
    ['Notities', subscription.notes || '—'],
    ['Aangemaakt', dateLabel(subscription.created_at)],
  ];

  return (
    <div className="cg-section">
      {msg ? <div className="cg-alert cg-alert-success">{msg}</div> : null}
      {err ? <div className="cg-alert cg-alert-danger">{err}</div> : null}

      <div className="cg-detail-header">
        <h3>Abonnement</h3>
        <span className={`cg-badge cg-badge-${statusTone(subscription.status)}`}>{subscription.status}</span>
      </div>

      <table className="cg-table cg-table-kv">
        <tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td><strong>{v}</strong></td></tr>)}</tbody>
      </table>

      <div className="cg-actions">
        <button type="button" className="cg-btn" disabled={busy} onClick={() => { const days = window.prompt('Aantal dagen verlengen:', '14'); if (days) action('Trial verlengen', () => extendTrial(tenantId, Number(days), 'Handmatige verlenging')); }}>Trial verlengen</button>
        <button type="button" className="cg-btn cg-btn-warn" disabled={busy} onClick={() => action('Schorsen', () => suspendTenant(tenantId, ''))}>Schorsen</button>
        <button type="button" className="cg-btn cg-btn-success" disabled={busy} onClick={() => action('Heractiveren', () => reactivateTenant(tenantId, ''))}>Heractiveren</button>
        <button type="button" className="cg-btn cg-btn-danger" disabled={busy} onClick={() => action('Annuleren', () => cancelTenant(tenantId, ''))}>Annuleren</button>
      </div>
    </div>
  );
}
