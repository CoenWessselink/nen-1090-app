import { useEffect, useState } from 'react';
import { createTenantBillingCheckout, getTeamUsers, getTenantBillingStatus, inviteTeamUser } from '@/api/billing';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function euro(cents: unknown) { const n = Number(cents || 0); return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n / 100); }

export default function BillingPage() {
  const [status, setStatus] = useState<Record<string, any> | null>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [seats, setSeats] = useState(1);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => { const s = await getTenantBillingStatus(); setStatus(s); setSeats(Number(s.seats || 1)); try { const t = await getTeamUsers(); setTeam(Array.isArray(t.users) ? t.users : []); } catch { setTeam([]); } };
  useEffect(() => { load().catch(e => setMessage(e.message || String(e))); }, []);
  const startCheckout = async () => { setMessage(''); const r = await createTenantBillingCheckout({ seats, billing_cycle: cycle }); if (r.checkout_url) window.location.href = String(r.checkout_url); else setMessage('Geen checkout URL ontvangen.'); };
  const invite = async () => { setMessage(''); await inviteTeamUser({ email, role: 'tenant_user' }); setEmail(''); await load(); setMessage('Uitnodiging aangemaakt.'); };
  const invoices = Array.isArray(status?.invoices) ? status!.invoices : [];
  return <div className="page-stack"><h1>Billing & Team</h1>{message && <div className="alert">{message}</div>}<Card><h2>Abonnement</h2><p>Status: <strong>{String(status?.subscription?.status || status?.tenant_status || 'laden...')}</strong></p><p>Seats: <strong>{String(status?.seats || seats)}</strong></p><label>Aantal seats <input type="number" min={1} value={seats} onChange={e => setSeats(Number(e.target.value || 1))} /></label><label>Periode <select value={cycle} onChange={e => setCycle(e.target.value as any)}><option value="monthly">Maandelijks</option><option value="yearly">Jaarlijks</option></select></label><Button onClick={startCheckout}>Abonnement activeren / aanpassen</Button></Card><Card><h2>Facturen</h2>{invoices.length ? <table><tbody>{invoices.map((i:any)=><tr key={i.id}><td>{i.number}</td><td>{i.status}</td><td>{euro(i.total_cents)}</td></tr>)}</tbody></table> : <p>Geen facturen gevonden.</p>}</Card><Card><h2>Team</h2><p>{team.length} gebruiker(s) van {String(status?.seats || seats)} seats gebruikt.</p><div style={{display:'flex',gap:8}}><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="nieuwe gebruiker@bedrijf.nl" /><Button onClick={invite}>Uitnodigen</Button></div><ul>{team.map(u=><li key={u.user_id}>{u.email} — {u.role} — {u.status}</li>)}</ul></Card></div>;
}
