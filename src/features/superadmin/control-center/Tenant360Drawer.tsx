import { useState } from 'react';
import { Building2, Users, FolderKanban, AlertTriangle, Activity } from 'lucide-react';
import { Drawer } from '@/components/overlays/Drawer';
import type { Tenant360 } from '@/api/superadminControlCenter';

type Tab = 'overview' | 'users' | 'projects' | 'onboarding' | 'errors';

function dateLabel(v: string | null | undefined) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('nl-NL');
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  const tone = s === 'active' || s === 'activated' ? 'success' : s.includes('pending') ? 'warning' : s.includes('block') || s.includes('suspend') ? 'danger' : 'neutral';
  return <span className={`sacc-badge sacc-badge-${tone}`}>{status}</span>;
}

export function Tenant360Drawer({ open, data, loading, onClose }: { open: boolean; data: Tenant360 | null; loading: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <Drawer open={open} onClose={onClose} title={data?.tenant.name || 'Tenant 360°'}>
      {loading ? <div className="sacc-state">Laden…</div> : !data ? <div className="sacc-state">Geen data beschikbaar.</div> : (
        <div className="sacc-360">
          <div className="sacc-tabs">
            {(['overview', 'users', 'projects', 'onboarding', 'errors'] as Tab[]).map((t) => (
              <button key={t} type="button" className={`sacc-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
                {t === 'overview' && <Building2 size={14} />}
                {t === 'users' && <Users size={14} />}
                {t === 'projects' && <FolderKanban size={14} />}
                {t === 'onboarding' && <Activity size={14} />}
                {t === 'errors' && <AlertTriangle size={14} />}
                {t === 'overview' ? 'Overzicht' : t === 'users' ? `Users (${data.counts.users})` : t === 'projects' ? `Projects (${data.counts.projects})` : t === 'onboarding' ? 'Onboarding' : 'Errors'}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="sacc-360-section">
              <div className="sacc-detail-grid">
                <div><span>Tenant</span><strong>{data.tenant.name}</strong></div>
                <div><span>Status</span>{statusBadge(data.tenant.status)}</div>
                <div><span>Plan</span><strong>{data.tenant.plan}</strong></div>
                <div><span>Aangemaakt</span><strong>{dateLabel(data.tenant.created_at)}</strong></div>
              </div>
              <h4>Bedrijfsgegevens</h4>
              <div className="sacc-detail-grid">
                <div><span>Bedrijfsnaam</span><strong>{data.company.company_name || '—'}</strong></div>
                <div><span>E-mail</span><strong>{data.company.email || '—'}</strong></div>
                <div><span>Telefoon</span><strong>{data.company.phone || '—'}</strong></div>
                <div><span>Website</span><strong>{data.company.website || '—'}</strong></div>
              </div>
              <h4>Tellingen</h4>
              <div className="sacc-counts-row">
                <div><span>Users</span><strong>{data.counts.users}</strong></div>
                <div><span>Projects</span><strong>{data.counts.projects}</strong></div>
                <div><span>Welds</span><strong>{data.counts.welds}</strong></div>
                <div><span>Inspections</span><strong>{data.counts.inspections}</strong></div>
                <div><span>Attachments</span><strong>{data.counts.attachments}</strong></div>
              </div>
              <h4>Onboarding</h4>
              <div className="sacc-detail-grid">
                <div><span>Geactiveerd</span><strong>{data.onboarding.activated_users}</strong></div>
                <div><span>Pending</span><strong>{data.onboarding.pending_activations}</strong></div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="sacc-360-section">
              <table className="sacc-table sacc-table-sm">
                <thead><tr><th>E-mail</th><th>Naam</th><th>Rol</th><th>Status</th><th>Laatste login</th></tr></thead>
                <tbody>
                  {data.users.map((u) => {
                    const r = u as Record<string, unknown>;
                    return (
                      <tr key={String(r.id)}>
                        <td>{String(r.email || '—')}</td>
                        <td>{String(r.name || '—')}</td>
                        <td>{String(r.role || '—')}</td>
                        <td>{statusBadge(r.is_active ? 'active' : r.activated_at ? 'active' : 'pending')}</td>
                        <td>{dateLabel(String(r.last_login_at || ''))}</td>
                      </tr>
                    );
                  })}
                  {!data.users.length && <tr><td colSpan={5} className="sacc-empty">Geen gebruikers.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'projects' && (
            <div className="sacc-360-section">
              {data.projects.length ? (
                <table className="sacc-table sacc-table-sm">
                  <thead><tr><th>Project</th><th>Client</th><th>EXC</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.projects.map((p, i) => (
                      <tr key={String(p.id || i)}>
                        <td><strong>{String(p.name || p.code || p.projectnummer || '—')}</strong></td>
                        <td>{String(p.client_name || '—')}</td>
                        <td>{String(p.execution_class || '—')}</td>
                        <td>{statusBadge(String(p.status || 'unknown'))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="sacc-empty">Projecten niet beschikbaar in deze weergave. Open de tenant voor details.</div>}
            </div>
          )}

          {tab === 'onboarding' && (
            <div className="sacc-360-section">
              <div className="sacc-detail-grid">
                <div><span>Geactiveerde users</span><strong>{data.onboarding.activated_users}</strong></div>
                <div><span>Pending activaties</span><strong>{data.onboarding.pending_activations}</strong></div>
              </div>
              <h4>Users met pending status</h4>
              <table className="sacc-table sacc-table-sm">
                <thead><tr><th>E-mail</th><th>Naam</th><th>Status</th><th>Aangemaakt</th></tr></thead>
                <tbody>
                  {data.users.filter((u) => !(u as Record<string, unknown>).is_active && !(u as Record<string, unknown>).activated_at).map((u) => {
                    const r = u as Record<string, unknown>;
                    return (
                      <tr key={String(r.id)}>
                        <td>{String(r.email || '—')}</td>
                        <td>{String(r.name || '—')}</td>
                        <td>{statusBadge('pending')}</td>
                        <td>{dateLabel(String(r.created_at || ''))}</td>
                      </tr>
                    );
                  })}
                  {data.users.filter((u) => !(u as Record<string, unknown>).is_active && !(u as Record<string, unknown>).activated_at).length === 0 && <tr><td colSpan={4} className="sacc-empty">Geen pending activaties.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'errors' && (
            <div className="sacc-360-section">
              <div className="sacc-detail-grid">
                <div><span>Errors 24h</span><strong>{data.errors.last_24h}</strong></div>
                <div><span>Laatste error</span><strong>{dateLabel(data.errors.last_error_at)}</strong></div>
              </div>
              {data.errors.top_errors.length ? (
                <table className="sacc-table sacc-table-sm">
                  <thead><tr><th>Fout</th><th>Tijd</th></tr></thead>
                  <tbody>{data.errors.top_errors.map((e, i) => <tr key={i}><td>{String(e.message || e.path || '—')}</td><td>{dateLabel(String(e.created_at || ''))}</td></tr>)}</tbody>
                </table>
              ) : <div className="sacc-empty">Geen recente errors voor deze tenant.</div>}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
