import { useMemo, useState } from 'react';
import { Activity, Link2, Mail, Search, UserCheck } from 'lucide-react';
import { resendActivation, generateActivationLink, markActivated, type OnboardingRow } from '@/api/superadminControlCenter';

function dateLabel(v: string | null | undefined) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('nl-NL');
}

function statusTone(status: string) {
  if (status === 'activated') return 'success';
  if (status === 'pending_activation') return 'warning';
  if (status === 'expired' || status === 'blocked') return 'danger';
  return 'neutral';
}

function statusLabel(status: string) {
  if (status === 'pending_activation') return 'Pending';
  if (status === 'activated') return 'Actief';
  if (status === 'expired') return 'Verlopen';
  if (status === 'blocked') return 'Geblokkeerd';
  return status;
}

export function SuperadminOnboardingCenter({ rows, onRefresh }: { rows: OnboardingRow[]; onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return `${r.tenant_name} ${r.email} ${r.name}`.toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  async function handleResend(userId: string) {
    setBusyId(userId); setActionMsg(null); setActionErr(null);
    try { await resendActivation(userId); setActionMsg('Activatie-email opnieuw verstuurd.'); onRefresh(); }
    catch (err) { setActionErr(err instanceof Error ? err.message : 'Actie mislukt.'); }
    finally { setBusyId(null); }
  }

  async function handleGenerateLink(userId: string) {
    setBusyId(userId); setActionMsg(null); setActionErr(null);
    try {
      const result = await generateActivationLink(userId);
      setActionMsg(`Activatielink: ${result.link}`);
    } catch (err) { setActionErr(err instanceof Error ? err.message : 'Actie mislukt.'); }
    finally { setBusyId(null); }
  }

  async function handleMarkActivated(userId: string) {
    setBusyId(userId); setActionMsg(null); setActionErr(null);
    try { await markActivated(userId); setActionMsg('Gebruiker geactiveerd.'); onRefresh(); }
    catch (err) { setActionErr(err instanceof Error ? err.message : 'Actie mislukt.'); }
    finally { setBusyId(null); }
  }

  const pendingCount = rows.filter((r) => r.status === 'pending_activation').length;
  const activatedCount = rows.filter((r) => r.status === 'activated').length;

  return (
    <div className="sacc-section">
      <div className="sacc-section-header">
        <h3><Activity size={18} /> Onboarding Center ({rows.length} users, {pendingCount} pending)</h3>
        <div className="sacc-filters">
          <label className="sacc-search"><Search size={14} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek op tenant, email…" /></label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Alle statussen</option>
            <option value="pending_activation">Pending</option>
            <option value="activated">Actief</option>
            <option value="expired">Verlopen</option>
            <option value="blocked">Geblokkeerd</option>
          </select>
        </div>
      </div>

      {actionMsg ? <div className="sacc-alert sacc-alert-success">{actionMsg}</div> : null}
      {actionErr ? <div className="sacc-alert sacc-alert-danger">{actionErr}</div> : null}

      <div className="sacc-kpi-row">
        <div className="sacc-kpi"><span>Totaal</span><strong>{rows.length}</strong></div>
        <div className="sacc-kpi"><span>Pending</span><strong>{pendingCount}</strong></div>
        <div className="sacc-kpi"><span>Actief</span><strong>{activatedCount}</strong></div>
      </div>

      <div className="sacc-table-wrap">
        <table className="sacc-table">
          <thead><tr><th>Tenant</th><th>E-mail</th><th>Naam</th><th>Status</th><th>Aangemaakt</th><th>Geactiveerd</th><th>Acties</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.tenant_id}-${r.user_id}`}>
                <td>{r.tenant_name || '—'}</td>
                <td>{r.email}</td>
                <td>{r.name || '—'}</td>
                <td><span className={`sacc-badge sacc-badge-${statusTone(r.status)}`}>{statusLabel(r.status)}</span></td>
                <td>{dateLabel(r.created_at)}</td>
                <td>{dateLabel(r.activated_at)}</td>
                <td className="sacc-actions">
                  {r.status === 'pending_activation' && (
                    <>
                      <button type="button" className="sacc-action-btn" onClick={() => handleResend(r.user_id)} disabled={busyId === r.user_id} title="Activatie-email opnieuw versturen"><Mail size={14} /></button>
                      <button type="button" className="sacc-action-btn" onClick={() => handleGenerateLink(r.user_id)} disabled={busyId === r.user_id} title="Activatielink genereren"><Link2 size={14} /></button>
                      <button type="button" className="sacc-action-btn" onClick={() => handleMarkActivated(r.user_id)} disabled={busyId === r.user_id} title="Handmatig activeren"><UserCheck size={14} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="sacc-empty">Geen onboarding records gevonden.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
